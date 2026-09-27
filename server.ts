import express from "express";
import path from "path";
import fs from "fs/promises";
import { readFileSync } from "fs";
import crypto from "crypto";
import { Type } from "@google/genai";
import dotenv from "dotenv";
import compression from "compression";

import { findForbiddenInText } from "./src/data/wfpb_forbidden_ingredients";
import { normalize, candidateKeys, resolveAgainstIndex, ALIASES } from "./src/utils/ingredientMappingCore";
import { getIngredientAlias } from "./src/utils/ingredientAliasMapper";

import { analyzeFoodImage, transcribeAudio, generateAnnaAudio } from "./src/services/dashscopeAdapter";
import { callLLM } from "./src/services/llmAdapter";
import { PromptCompiler } from "./src/services/promptCompiler";
import { routeAnnaContext } from "./src/services/annaContextRouter";
import { lookupAnnaBookRecipe } from "./src/services/annaRecipeLookup";
import { buildAnnaRecipePromptBlock } from "./src/services/annaRecipePrompt";
import { achievementService } from "./src/services/AchievementService";
import { ANNA_TOOL_DEFINITIONS, executeToolCall } from "./src/services/annaTools";
import { buildAnnaContextSnapshot } from "./src/services/annaContextSnapshot";
import { setupTelegramWebhook, getBotUsername, getBot } from "./src/services/telegramBot";

import { ANNA_REACTION_MATRIX } from "./src/prompts/annaReactionMatrix";
import { DISH_PHILOSOPHY } from "./src/data/dishPhilosophy";

import { safeParseJSON } from "./src/utils/safeParseJSON";
import { parseAnnaEmotionReply } from "./src/utils/annaEmotionPrefix";
import { getPlural } from "./src/utils/pluralize";
import { getWaterContext } from "./src/utils/waterCoaching";
import { logger } from "./src/utils/logger";
import { resolveBookRecipeNutrients, BOOK_MACRO_FIELDS } from "./src/utils/bookRecipeNutrients";
import { extractTelegramUser } from "./src/utils/telegramInitData";

import { Prisma } from "@prisma/client";
import { prisma } from "./src/prisma";
import { MOVEMENT_DAILY_TARGET_MIN } from "./src/constants/movement";
import {
  DEFAULT_TIMEZONE,
  addDays,
  toDateOnly,
  todayLocalDate,
  validateIanaTimeZone,
} from "./src/shared/dates";

const promptCompiler = new PromptCompiler();

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      telegramId?: string;
      accessExpiresAt?: Date;
    }
  }
}

const projectRoot = process.cwd();

const envPath = path.join(projectRoot, ".env");
// NODE_ENV внутри процесса — не свидетель: @prisma/client при импорте выставляет
// NODE_ENV="development", если переменная не задана (замер m-19: и с .env в каталоге, и без него).
// Явное значение он не перебивает, но полагаться на «а нам его точно передали» нельзя.
// В ESM это не перехватить даже баннером сборщика — импорты исполняются до любой строки модуля.
// Поэтому режим берём из /proc/self/environ: это окружение, с которым процесс запустили,
// и ни один dotenv-подобный загрузчик его не меняет.
function bootNodeEnv(): { known: boolean; value?: string } {
  try {
    const raw = readFileSync("/proc/self/environ", "latin1");
    const hit = raw.split("\0").find((entry) => entry.startsWith("NODE_ENV="));
    return { known: true, value: hit ? hit.slice("NODE_ENV=".length).trim() : undefined };
  } catch {
    return { known: false, value: process.env.NODE_ENV };
  }
}

const BOOT_ENV = bootNodeEnv();
const IS_PRODUCTION = BOOT_ENV.known
  ? BOOT_ENV.value === undefined || BOOT_ENV.value === "production"
  : (BOOT_ENV.value || "production") === "production";

// .env читаем только вне production: файл в каталоге не должен иметь власти над боевым режимом.
if (!IS_PRODUCTION) {
  dotenv.config({ path: envPath });
}

const PORT = parseInt(process.env.PORT || "3001", 10);

// Ответ 500 наружу не должен нести текст внутренней ошибки (имена полей,
// стеки, строки Prisma) — только короткий текст и код обращения для разговора
// с поддержкой; подробности уходят в лог под этим же кодом.
function fail500(req: any, res: any, err: any, extra?: Record<string, unknown>) {
  const correlationId = crypto.randomUUID().slice(0, 8);
  const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
  logger.error(`[500] cid=${correlationId} ${req?.method ?? "-"} ${req?.originalUrl ?? "-"}: ${detail}`);
  return res.status(500).json({
    error: `Внутренняя ошибка сервера (код обращения: ${correlationId})`,
    correlationId,
    ...extra,
  });
}

// Отладочный вывод списков ингредиентов (данные человека) — только вне прод-контура.
// Режим берём из IS_PRODUCTION (/proc/self/environ), а не из process.env.NODE_ENV:
// последнее @prisma/client может выставить сам.
function debugInput(...args: any[]) {
  if (!IS_PRODUCTION) console.log(...args);
}

// Сравнение секретов: привели обе стороны к sha256 (одинаковая длина обязательна для
// timingSafeEqual), сравниваем без раннего выхода.
function secretEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// Robust wrapper with automatic model cascade fallback.
// models можно переопределить точечным вызовом (напр., photo recognition),
// дефолтный каскад других endpoint'ов не меняется.
async function generateContentWithFallback(payload: any, models: string[] = ["qwen-plus", "qwen-turbo"]) {
  let lastError: any = null;

  for (const modelName of models) {
    try {
      console.log(`[AI-Cascade] Attempting model: ${modelName}`);
      const result = await callLLM({
        ...payload,
        model: modelName,
      });
      console.log(`[AI-Cascade] Success with model: ${modelName}`);
      return result;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      console.log(`[AI-Cascade] Model ${modelName} failed: ${errMsg.slice(0, 200)}`);
    }
  }

  throw lastError || new Error("All cascade models failed in AI generation");
}

function pickAnnaTools(message: string, screenContext?: string, dayIndex?: number) {
  const msg = (message || "").toLowerCase();
  const selected = new Set<string>();

  const foodQuery = /блюд|приготов|готов|сохр|мои блюда|фото|собери сам|книга|рецепт|кбжу|калор|белк|жир|клетчат|полез|энерг/i.test(msg) ||
    screenContext === "dish-analysis" ||
    screenContext === "book-recipes-screen" ||
    screenContext === "my-dishes";

  if (foodQuery) {
    selected.add("get_dishes");
    selected.add("get_book_recipe_details");
    selected.add("get_recipe_progress");
    selected.add("get_daily_kbju_summary");
    if (msg.includes("книга") || msg.includes("рецепт") || screenContext === "book-recipes-screen") {
      selected.add("get_book_table_of_contents");
    }
  }

  if (/дневник|заметк|запис/i.test(msg)) {
    selected.add("get_diary_entries");
  }

  if (/ачивк|достижен|наград/i.test(msg)) {
    selected.add("get_user_achievements");
  }

  if (/вода|сон|давлен|пульс|метрик|активн|движени|трениров|устал|сил|энерги|замер|самочувств/i.test(msg)) {
    selected.add("get_daily_metrics");
    selected.add("get_user_profile");
  }

  if (/что ты знаешь обо мне|кто я|профил|о мне|здоров|цель/i.test(msg)) {
    selected.add("get_user_profile");
  }

  if (selected.size === 0) {
    return [];
  }

  return ANNA_TOOL_DEFINITIONS.filter((tool) => selected.has(tool.function.name));
}

function buildAnnaToolGuidance(message: string): string {
  const msg = (message || "").toLowerCase();
  const foodQuery = /блюд|приготов|готов|сохр|мои блюда|фото|собери сам|книга|рецепт|кбжу|калор|белк|жир|клетчат|полез|энерг/i.test(msg);
  if (!foodQuery) return "";

  return [
    "[ПРАВИЛО БД]: если пользователь спрашивает о своих блюдах, уже приготовленных блюдах, 'Мои блюда', фото, 'собери сам' или блюдах из книги, сначала используй tools и проверь базу данных.",
    "Для таких вопросов используй `get_dishes` как основной tool. Если нужен конкретный рецепт из книги — `get_book_recipe_details`.",
    "Если пользователь спрашивает про калории, КБЖУ, белки, жиры, клетчатку за день — используй `get_daily_kbju_summary` с указанием dayIndex.",
    "Не отвечай 'я не знаю' до проверки БД.",
  ].join("\n");
}

  // ── Local FoodItem Database Nutrient Computation ──

const NUTRIENT_FIELDS = [
  'calories', 'protein', 'fat', 'carbohydrates', 'water',
  'fiber', 'sugarTotal', 'sucrose', 'glucose', 'fructose', 'lactose', 'maltose',
  'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 'transFat', 'cholesterol',
  'omega3', 'omega6', 'omega9',
  'calcium', 'iron', 'magnesium', 'phosphorus', 'potassium', 'sodium',
  'zinc', 'copper', 'manganese', 'iodine', 'selenium',
  'vitaminC', 'thiamin', 'riboflavin', 'niacin', 'pantothenicAcid', 'vitaminB6',
  'biotin', 'folate', 'vitaminB12', 'vitaminA', 'retinol', 'betaCarotene',
  'vitaminD', 'vitaminD2', 'vitaminD3', 'vitaminE', 'vitaminK',
  'lysine', 'methionine', 'tryptophan', 'threonine', 'isoleucine', 'leucine',
  'cystine', 'phenylalanine', 'tyrosine', 'valine', 'arginine', 'histidine',
  'alanine', 'asparticAcid', 'glutamicAcid', 'glycine', 'proline', 'serine',
] as const;

const NUTRIENT_UNITS: Record<string, string> = {
  calories: "ккал",
  protein: "г", fat: "г", carbohydrates: "г", water: "г",
  fiber: "г", sugarTotal: "г", sucrose: "г", glucose: "г", fructose: "г", lactose: "г", maltose: "г",
  saturatedFat: "г", monounsaturatedFat: "г", polyunsaturatedFat: "г", transFat: "г", cholesterol: "мг",
  omega3: "г", omega6: "г", omega9: "г",
  calcium: "мг", iron: "мг", magnesium: "мг", phosphorus: "мг", potassium: "мг", sodium: "мг",
  zinc: "мг", copper: "мг", manganese: "мг", iodine: "мкг", selenium: "мкг",
  vitaminC: "мг", thiamin: "мг", riboflavin: "мг", niacin: "мг", pantothenicAcid: "мг",
  vitaminB6: "мг", biotin: "мкг", folate: "мкг", vitaminB12: "мкг", vitaminA: "мкг",
  retinol: "мкг", betaCarotene: "мкг",
  vitaminD: "мкг", vitaminD2: "мкг", vitaminD3: "мкг", vitaminE: "мг", vitaminK: "мкг",
  lysine: "г", methionine: "г", tryptophan: "г", threonine: "г", isoleucine: "г",
  leucine: "г", cystine: "г", phenylalanine: "г", tyrosine: "г", valine: "г",
  arginine: "г", histidine: "г", alanine: "г", asparticAcid: "г", glutamicAcid: "г",
  glycine: "г", proline: "г", serine: "г",
};

function calcOmega6To3Ratio(omega6: number, omega3: number): string {
  if (!omega3 || omega3 < 0.05) return "—";
  const ratio = omega6 / omega3;
  return `${ratio.toFixed(1)}:1`;
}

function isEmptyNutrientObj(obj: Record<string, number>): boolean {
  return NUTRIENT_FIELDS.every(f => !obj[f]);
}

// Все перестановки порядка слов в нормализованном виде. Применяются для
// 2–4 слов («масло подсолнечное» ↔ «подсолнечное масло»); для 1 слова и
// длиннее 4 слов перестановки не генерируются (≤ 24 вариантов).
function generateWordPermutations(name: string): string[] {
  const words = normalize(name).split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return [];
  const results: string[] = [];
  const seen = new Set<string>();
  const permute = (prefix: string[], rest: string[]) => {
    if (rest.length === 0) {
      const joined = prefix.join(" ");
      if (!seen.has(joined)) {
        seen.add(joined);
        results.push(joined);
      }
      return;
    }
    for (let i = 0; i < rest.length; i++) {
      permute([...prefix, rest[i]], [...rest.slice(0, i), ...rest.slice(i + 1)]);
    }
  };
  permute([], words);
  return results;
}

async function computeNutrientsFromDB(
  ingredients: { fullName?: string; shortName?: string; weight?: number; dbKey?: string; fdcId?: number; foodItemId?: string }[]
): Promise<{ totals: Record<string, number>; unresolved: { input: string; weight?: number }[] }> {
  const total: Record<string, number> = {};
  NUTRIENT_FIELDS.forEach(f => (total[f] = 0));
  const unresolved: { input: string; weight?: number }[] = [];

  const payloadToLog = ingredients.map(i => ({
    fullName: i.fullName,
    shortName: i.shortName,
    weight: i.weight,
    dbKey: i.dbKey,
    foodItemId: i.foodItemId
  }));
  debugInput("[DEBUG INPUT] Received from frontend:", payloadToLog);

  const items = await prisma.foodItem.findMany();

  const itemsById = new Map<string, (typeof items)[number]>();
  const canonicalByKey = new Map<string, (typeof items)[number]>();
  const fuzzyByKey = new Map<string, (typeof items)[number]>();
  const fuzzyKeys = new Set<string>();
  const fdcById = new Map<number, (typeof items)[number]>();

  // 1) Канонические ключи (nameRu/nameEn) и стабильный id — приоритет identity.
  for (const item of items) {
    itemsById.set(item.id, item);
    const canonical = normalize(item.nameRu);
    if (canonical) {
      canonicalByKey.set(canonical, item);
      if (!fuzzyKeys.has(canonical)) {
        fuzzyKeys.add(canonical);
        fuzzyByKey.set(canonical, item);
      }
    }
    if (item.nameEn) {
      const en = normalize(item.nameEn);
      if (en && !fuzzyKeys.has(en)) {
        fuzzyKeys.add(en);
        fuzzyByKey.set(en, item);
      }
    }
    if (item.fdcId != null) fdcById.set(item.fdcId, item);
  }

  // 2) Кандидатные формы (без модификаторов/усечение), только если ключ свободен.
  // Сортируем по длине имени (короткие первыми), чтобы у базовых ингредиентов
  // был приоритет на захват кандидатных ключей (напр. "хлеб" захватит "хлеб" раньше, чем "хлеб с отрубями").
  const sortedItems = [...items].sort((a, b) => a.nameRu.length - b.nameRu.length);
  for (const item of sortedItems) {
    for (const c of candidateKeys(item.nameRu)) {
      if (c && !fuzzyKeys.has(c)) {
        fuzzyKeys.add(c);
        fuzzyByKey.set(c, item);
      }
    }
  }

  const hasCompleteNutrition = (item: (typeof items)[number]) =>
    item.calories > 0 || item.protein > 0 || item.fat > 0 || item.carbohydrates > 0;

  // Приоритет: foodItemId → exact normalized name (nameRu/nameEn) → перестановки
  // порядка слов → fdcId → legacy fuzzy. Совпадение с неполным nutrition не
  // завершает поиск финально: запоминается как fallback, приоритет у полной записи.
  const resolveItem = (rawName: string, dbKey?: string, fdcId?: number, foodItemId?: string) => {
    let incompleteFallback: (typeof items)[number] | null = null;
    // Возвращает true, если найдена полная запись (финальный ответ).
    // Неполная запоминается однократно как fallback последней надежды.
    const consider = (item: (typeof items)[number] | null | undefined) => {
      if (!item) return false;
      if (hasCompleteNutrition(item)) return true;
      if (!incompleteFallback) incompleteFallback = item;
      return false;
    };
    if (foodItemId) {
      // Identity указана явно: найдена в базе → используем напрямую.
      const byId = itemsById.get(foodItemId);
      if (byId) return byId;
      // Не найдена в базе (stale/chuzhoy id) → НЕ fail-closed: пробуем
      // строгий exact-normalized lookup по имени, прежде чем сдаться.
    }
    // Exact normalized lookup по canonical ключам (nameRu и nameEn).
    // Точное совпадение FoodItem всегда обходит legacy-эвристики.
    if (dbKey) {
      // Ищем СТРОГО в канонических ключах
      const exact = canonicalByKey.get(normalize(dbKey));
      if (consider(exact)) return exact!;
    }
    const exactByName = canonicalByKey.get(normalize(rawName));
    if (consider(exactByName)) return exactByName;
    // Перестановки порядка слов («масло подсолнечное» ↔ «подсолнечное масло»):
    // сначала exact по каноническим ключам, затем по индексу кандидатных форм
    // (покрывает записи с модификаторами: «Подсолнечное масло пром.»).
    // Только после их промаха — fdcId и legacy fuzzy.
    const permutations = generateWordPermutations(rawName);
    for (const perm of permutations) {
      const byPerm = canonicalByKey.get(perm);
      if (consider(byPerm)) return byPerm!;
    }
    for (const perm of permutations) {
      const byFuzzyPerm = fuzzyByKey.get(perm);
      if (consider(byFuzzyPerm)) return byFuzzyPerm!;
    }
    if (fdcId != null) {
      const byFdc = fdcById.get(fdcId);
      if (byFdc) return byFdc;
    }
    // Legacy fuzzy fallback — только после промаха всех точных шагов.
    const key = resolveAgainstIndex(rawName, fuzzyKeys);
    if (!key) return null;
    const cand = fuzzyByKey.get(key);
    if (!cand) return null;

    // Сильные совпадения: точный ключ, явный ALIASES-таргет или alias-mapper —
    // принимаются как есть (это намеренные соответствия, не угадывание).
    const n = normalize(rawName);
    const strongMatch =
      key === n ||
      candidateKeys(n).some(c => {
        const t = ALIASES[c];
        return !!t && normalize(t) === key;
      }) ||
      (() => {
        const ga = getIngredientAlias(rawName);
        return !!ga && normalize(ga) === key;
      })();
    if (strongMatch) return cand;

    // Слабые совпадения (усечение/базовые слова) для многословного ввода:
    // принимаем только если ВСЕ слова ввода присутствуют в кандидате
    // (nameRu|nameEn). Иначе это нерелевантный продукт → unresolved.
    const inputWords = n.split(/\s+/).filter(Boolean);
    if (inputWords.length >= 2) {
      const candWords = `${normalize(cand.nameRu)} ${normalize(cand.nameEn || "")}`
        .split(/\s+/).filter(Boolean);
      if (!inputWords.every(w => candWords.includes(w))) {
        // Нерелевантный fuzzy-кандидат: неполная exact-запись всё же лучше
        // нерелевантной — отдаём её как fallback (loop отклонит по nutrition).
        return incompleteFallback;
      }
    }
    return consider(cand) ? cand : incompleteFallback;
  };

  for (const ing of ingredients) {
    const rawShort = (ing.shortName || "").trim();
    const rawFull = (ing.fullName || "").trim();
    if (!rawShort && !rawFull) continue;

    const parsedWeight = parseFloat(String(ing.weight).replace(/[^\d.,]/g, '').replace(',', '.'));
    const weight = isNaN(parsedWeight) ? 100 : parsedWeight;
    const factor = weight / 100;

    let foodItem = null;
    if (rawShort) foodItem = resolveItem(rawShort, ing.dbKey, ing.fdcId, ing.foodItemId);
    if (!foodItem && rawFull) foodItem = resolveItem(rawFull, ing.dbKey, ing.fdcId, ing.foodItemId);

    // Никакого silent-continue: нераспознанные и неполные позиции собираются.
    if (!foodItem || !hasCompleteNutrition(foodItem)) {
      debugInput(`[PIPELINE TRACE 2.1] Nutrition lookup UNRESOLVED "${rawShort || rawFull}"${ing.dbKey ? ` (dbKey="${ing.dbKey}")` : ""}${ing.foodItemId ? ` (foodItemId="${ing.foodItemId}")` : ""}${ing.fdcId != null ? ` (fdcId=${ing.fdcId})` : ""}`);
      unresolved.push({ input: rawShort || rawFull, weight });
      continue;
    }
    debugInput(`[PIPELINE TRACE 2.1] Nutrition lookup HIT "${rawShort || rawFull}"${ing.dbKey ? ` (dbKey="${ing.dbKey}")` : ""}${ing.foodItemId ? ` (foodItemId="${ing.foodItemId}")` : ""}${ing.fdcId != null ? ` (fdcId=${ing.fdcId})` : ""} -> "${foodItem.nameRu}" (fdcId=${foodItem.fdcId}) weight=${weight}g`);

    for (const field of NUTRIENT_FIELDS) {
      const val = (foodItem as any)[field];
      if (typeof val === "number" && val > 0) {
        total[field] += val * factor;
      }
    }
  }

  return { totals: total, unresolved };
}

// ── B3c: deterministic journal merge + transaction helpers ──

function parseJsonArray<T = any>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function stableKeyOf(entry: any, keyFn: (e: any) => string | number): string {
  const raw = keyFn(entry);
  if (typeof raw === "string") return raw;
  if (typeof raw === "number" && Number.isFinite(raw)) return String(raw);
  return JSON.stringify(entry ?? null);
}

function isExternalRetryError(err: any): boolean {
  const code = err?.code;
  return code === "P2034" || code === "40001" || code === "40P01";
}

const waterKey = (e: any) => e?.id ?? e?.timestamp ?? "";
const movementKey = (e: any) => e?.id ?? e?.timestamp ?? "";
const measurementKey = (e: any) => e?.id ?? e?.timestamp ?? "";
const digestionKey = (e: any) => e?.id ?? `${e?.timestamp ?? ""}|${e?.timeString ?? ""}`;
const sleepKey = (e: any) => {
  if (e?.id) return `id:${e.id}`;
  const bed = e?.bedtime ?? e?.sleepTime ?? "";
  const wake = e?.wakeTime ?? "";
  const day = e?.dayIndex ?? "";
  return `d${day}|${bed}|${wake}`;
};

// Deterministic union: existing entries preserved, new (by stable key) appended,
// canonical sort by timestamp asc, then stable key asc (entries without a usable
// timestamp sort by stable key).
function dedupeUnion(existing: any[] | null | undefined, incoming: any[] | null | undefined, keyFn: (e: any) => string | number): any[] {
  const seen = new Set<string>();
  const merged: any[] = [];
  for (const e of existing ?? []) {
    const k = stableKeyOf(e, keyFn);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(e);
    }
  }
  for (const e of incoming ?? []) {
    const k = stableKeyOf(e, keyFn);
    if (!seen.has(k)) {
      seen.add(k);
      merged.push(e);
    }
  }
  merged.sort((a, b) => {
    const ta = typeof a?.timestamp === "number" && Number.isFinite(a.timestamp) ? a.timestamp : typeof a?.timestamp === "string" ? Date.parse(a.timestamp) : NaN;
    const tb = typeof b?.timestamp === "number" && Number.isFinite(b.timestamp) ? b.timestamp : typeof b?.timestamp === "string" ? Date.parse(b.timestamp) : NaN;
    const ka = stableKeyOf(a, keyFn);
    const kb = stableKeyOf(b, keyFn);
    if (Number.isFinite(ta) && Number.isFinite(tb)) {
      if (ta !== tb) return ta - tb;
    } else if (Number.isFinite(ta)) {
      return -1;
    } else if (Number.isFinite(tb)) {
      return 1;
    }
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
  return merged;
}

function isValidDayIndex(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 28;
}

async function startServer() {
  process.on("uncaughtException", (err) => {
    console.error("[UNCAUGHT]", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[UNHANDLED]", reason);
  });

  const app = express();

  // Первый экран тянет один JS-чанк: 4 853 079 Б против 1 041 157 Б в gzip (замер m-114 на прод-контейнере,
  // где до этой строки не было ни Content-Encoding, ни сжатия на входе).
  app.use(compression());

  // Increase payload size limit to receive captured camera photo bytes
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Health probes ──
  // Зарегистрированы до dev-обхода, auth- и log-middleware (все они на "/api") и до
  // catch-all ниже, поэтому доступные без initData и не отдают ни внутренностей, ни данных.
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: Math.round(process.uptime()) });
  });

  app.get("/readyz", async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ready" });
    } catch (err) {
      const correlationId = crypto.randomUUID().slice(0, 8);
      const detail = err instanceof Error ? err.message : String(err);
      logger.error(`[readyz] cid=${correlationId} ${detail}`);
      res.status(503).json({ status: "unavailable", correlationId });
    }
  });

  // ── Telegram Webhook ──
  // Монтаж ДО auth-middleware: Telegram приходит сюда без initData, и после
  // `app.use("/api", auth)` маршрут отвечал 401 — то есть в проде не доходило ни одно
  // обновление, включая активацию инвайтов.
  setupTelegramWebhook(app, IS_PRODUCTION);

  // ── Purchase Token API (для лендинга WordPress) ──
  // Тот же порядок: у лендинга нет initData, есть только X-API-Key.
  app.post("/api/purchase/register", async (req, res) => {
    const expected = process.env.PURCHASE_API_KEY;
    if (!expected) {
      logger.error("[Purchase] PURCHASE_API_KEY не задан — маршрут закрыт");
      return res.status(503).json({ error: "Purchase API is not configured" });
    }
    const apiKey = req.headers["x-api-key"];
    if (typeof apiKey !== "string" || !secretEqual(apiKey, expected)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email required" });
    try {
      const token = `purchase_${crypto.randomUUID()}`;
      await prisma.purchaseToken.create({
        data: {
          token,
          email,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      const botUsername = getBotUsername();
      const botLink = botUsername ? `https://t.me/${botUsername}?start=${token}` : null;
      res.json({ botLink, token });
    } catch (err: any) {
      logger.error("[Purchase] register error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── Dev Auth Bypass ──
  if (!IS_PRODUCTION) {
    app.use('/api', (req, res, next) => {
      req.userId = (req.headers['x-dev-user-id'] as string) || 'dev-user-00000000-0000-0000-0000-000000000000';
      req.telegramId = 'dev-telegram-id';
      req.accessExpiresAt = new Date('2099-01-01');
      next();
    });
  }

  // ── Telegram InitData Middleware ──
  // Validates Telegram Mini App initData and finds/creates user by telegramId
  app.use("/api", async (req, res, next) => {
    if (req.userId) return next();
    const initData = req.headers["x-telegram-init-data"] as string | undefined;
    if (!initData) {
      return res.status(401).json({ error: "Unauthorized: missing initData" });
    }

    const tgUser = extractTelegramUser(initData);
    if (!tgUser) {
      return res.status(401).json({ error: "Invalid initData" });
    }

    try {
      const telegramId = String(tgUser.id);
      let user = await prisma.user.findUnique({ where: { telegramId } });

      if (user) {
        // Update name/username in case they changed in Telegram
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            telegramName: tgUser.first_name ?? user.telegramName,
            telegramUsername: tgUser.username ?? user.telegramUsername,
          },
        });
      } else {
        // Строка пользователя появляется только от активации инвайта в боте (`src/services/telegramBot.ts`).
        // Пока здесь был `prisma.user.create`, любой аккаунт Telegram входил молча и получал пустой,
        // но живой аккаунт — то есть платный доступ можно было обойти без токена.
        logger.warn(`[auth] telegramId=${telegramId} без активированного инвайта — отказ`);
        return res.status(403).json({
          error: "Инвайт не найден. Оформите доступ на сайте и активируйте ссылку в боте.",
        });
      }

      req.userId = user.id;
    } catch (err) {
      logger.error("[Auth] DB error during initData auth", err);
      return res.status(500).json({ error: "Authentication failed" });
    }
    next();
  });

  // ── Request Logging Middleware ──
  // Logs every API request with method, URL, status, duration and device ID
  app.use("/api", (req, res, next) => {
    const start = Date.now();
    const originalEnd = res.end.bind(res);
    res.end = function (this: any, ...args: any[]) {
      const duration = Date.now() - start;
      const tgId = req.headers["x-telegram-init-data"]
        ? (req.userId?.slice(0, 8) ?? "unknown")
        : "none";
      logger.request(req.method, req.originalUrl, res.statusCode, duration, tgId);
      return originalEnd(...args);
    } as typeof res.end;
    next();
  });

  // Client error log receiver
  app.post("/api/logs/client", (req, res) => {
    try {
      const entry = req.body;
      if (entry?.level === "error") {
        logger.error(`[CLIENT] ${entry.message} | source=${entry.source} | url=${entry.url || "-"}`, entry.stack || "");
      } else if (entry?.level === "warn") {
        logger.warn(`[CLIENT] ${entry.message} | source=${entry.source}`);
      } else {
        logger.info(`[CLIENT] ${entry.message} | source=${entry.source}`);
      }
      res.json({ ok: true });
    } catch {
      res.json({ ok: false });
    }
  });

  // ── Anna response cache (TTL 10 min) ──
  const annaCache = new Map<string, { reply: string; ts: number }>();
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of annaCache) {
      if (now - entry.ts > 600000) annaCache.delete(key);
    }
  }, 300000);

  // Unified assistant endpoint for Anna chat (LLM Wiki prompt + Tool calling)
  app.post("/api/anna-chat", async (req, res) => {
    try {
      const { message, history, screenContext, bookRecipesDataContext, screenContextDetails, userName } = req.body;

      const cacheKey = `${req.userId}|${message}|${screenContext || ""}`;
      const cached = annaCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 600000) {
        return res.json({ reply: cached.reply });
      }

      const dayIndex: number | undefined =
        req.body.dayIndex ??
        screenContextDetails?.current_day ??
        bookRecipesDataContext?.active_day;

      const isVoiceChat =
        screenContext === "anna-screen" ||
        screenContextDetails?.screen_id === "anna-screen";

      const annaToolGuidance = buildAnnaToolGuidance(message);

	  const annaRouteDecision = routeAnnaContext(message || "");

      if (process.env.NODE_ENV !== "production") {
        console.log("[Anna Context Router]", {
          message: message || "",
          topics: annaRouteDecision.topics,
          needsMedicalSafety: annaRouteDecision.needsMedicalSafety,
          needsPreviousDayMeals: annaRouteDecision.needsPreviousDayMeals,
          needsProfile: annaRouteDecision.needsProfile,
          knowledgeFiles: annaRouteDecision.knowledgeFiles,
          moduleFiles: annaRouteDecision.moduleFiles,
        });
      }

      let systemPrompt = promptCompiler.compile({
          screenId: screenContextDetails?.screen_id || screenContext,
          userMessage: message,
          userName: userName || screenContextDetails?.userName,
          screenContextDetails,
          bookRecipesDataContext,
          moduleFiles: annaRouteDecision.moduleFiles,
          knowledgeFiles: annaRouteDecision.knowledgeFiles,
          isVoiceChat,
        }) + (annaToolGuidance ? `\n\n${annaToolGuidance}` : "");

        const recipeLookup = await lookupAnnaBookRecipe(message || "");
        const recipePromptBlock = buildAnnaRecipePromptBlock(
          message || "",
          recipeLookup,
        );

        if (recipePromptBlock) {
          systemPrompt += `\n\n${recipePromptBlock}`;
        }

      // Inject movement module data
      if (req.userId) {
        try {
          let dailyMetric;
          if (dayIndex) {
            dailyMetric = await prisma.dailyMetric.findFirst({
              where: { userId: req.userId, dayIndex },
              orderBy: { date: "desc" }
            });
          } else {
            const metrics = await prisma.dailyMetric.findMany({
              where: { userId: req.userId },
              orderBy: { date: "desc" },
              take: 1
            });
            dailyMetric = metrics[0];
          }

          if (dailyMetric) {
            const movementLogRaw = dailyMetric.movementLog ? JSON.parse(dailyMetric.movementLog) : [];
            const sessionsCount = movementLogRaw.length;
            const activityMinutes = dailyMetric.activityMinutes || 0;
            const normPercentage = Math.min(100, Math.round((activityMinutes / MOVEMENT_DAILY_TARGET_MIN) * 100));

            let sessionsListStr = "Нет сессий.";
            if (movementLogRaw.length > 0) {
              sessionsListStr = movementLogRaw.map((log: any) => {
                const mins = Math.max(1, Math.round((log.durationSeconds || log.duration) / 60));
                return `${log.timeString} — ${log.type} (${mins} мин)`;
              }).join("\n  ");
            }

            systemPrompt += `\n\n[Системные данные о Движении пользователя на сегодня:
- Суммарное время движения за день: ${activityMinutes} ${getPlural(activityMinutes, ['минута', 'минуты', 'минут'])}
- Выполнение дневной нормы: ${normPercentage}%
- Количество сессий активности: ${sessionsCount}
- Журнал сессий за сегодня:
  ${sessionsListStr}
Используй эти данные, если пользователь спрашивает об активности, тренировках, движении или конкретных сессиях за сегодня.]`;
          }
        } catch (e) {
          console.error("Error loading movement for Anna:", e);
        }
      }

// ── Anna Context Snapshot (unified daily context) ──
      if (req.userId) {
        try {
          // Load daily metric independently
          const snapshotMetric = dayIndex
            ? await prisma.dailyMetric.findFirst({
                where: { userId: req.userId, dayIndex },
                orderBy: { date: "desc" },
              })
            : await prisma.dailyMetric.findFirst({
                where: { userId: req.userId },
                orderBy: { date: "desc" },
              });

          if (!snapshotMetric) {
            // No metric available, skip snapshot
          } else {
            const user = await prisma.user.findUnique({ where: { id: req.userId } });
            const timeZone = user?.timeZone || "Europe/Moscow";

            const waterEntriesRaw = snapshotMetric.waterEntries
              ? safeParseJSON<any[]>(snapshotMetric.waterEntries, []).data || []
              : [];
            const sleepLogsRaw = snapshotMetric.sleepLogs
              ? safeParseJSON<any[]>(snapshotMetric.sleepLogs, []).data || []
              : [];
            const digestionLogRaw = snapshotMetric.digestionLog
              ? safeParseJSON<any[]>(snapshotMetric.digestionLog, []).data || []
              : [];
            const movementLogRaw = snapshotMetric.movementLog
              ? safeParseJSON<any[]>(snapshotMetric.movementLog, []).data || []
              : [];
            const measurementsRaw = snapshotMetric.measurements
              ? safeParseJSON<any[]>(snapshotMetric.measurements, []).data || []
              : [];

            const metricsForSnapshot = {
              date: snapshotMetric.date.toISOString().slice(0, 10),
              dayIndex: snapshotMetric.dayIndex,
              waterMl: snapshotMetric.waterMl,
              sleepMinutes: snapshotMetric.sleepMinutes,
              mealCount: snapshotMetric.mealCount,
              habitsDone: snapshotMetric.habitsDone,
              activityMinutes: snapshotMetric.activityMinutes,
              steps: snapshotMetric.steps,
              waterEntries: waterEntriesRaw,
              sleepLogs: sleepLogsRaw,
              digestionLog: digestionLogRaw,
              movementLog: movementLogRaw,
              measurements: measurementsRaw,
              pulse: snapshotMetric.pulse,
              weight: snapshotMetric.weight,
              systolic: snapshotMetric.systolic,
              diastolic: snapshotMetric.diastolic,
              tonus: snapshotMetric.tonus,
              dayMood: snapshotMetric.dayMood,
              dayBookmark: snapshotMetric.dayBookmark,
            };

           const snapshot = buildAnnaContextSnapshot(metricsForSnapshot, timeZone);

            // Add previous-day meals only when the router says that meal context is useful.
            const resolvedDayIndex = snapshotMetric.dayIndex ?? dayIndex ?? 1;
            const previousDayIndex = resolvedDayIndex - 1;

            if (
              annaRouteDecision.needsPreviousDayMeals &&
              previousDayIndex >= 1
            ) {
              const previousDishes = await prisma.savedDish.findMany({
                where: {
                  userId: req.userId,
                  dayIndex: previousDayIndex,
                },
                select: {
                  name: true,
                  ingredients: true,
                  createdAt: true,
                },
                orderBy: {
                  createdAt: "asc",
                },
                take: 12,
              });

              snapshot.previousDayMeals = {
                status: previousDishes.length > 0 ? "available" : "no_data",
                localDate: `day-index-${previousDayIndex}`,
                meals: previousDishes.map((dish) => ({
                  // createdAt is the record-save timestamp, not a claimed meal time.
                  time: dish.createdAt.toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone,
                  }),
                  name: dish.name,
                  ingredients: dish.ingredients ?? undefined,
                })),
              };
            }

            // Load diary entries when router indicates diary context is useful.
            if (annaRouteDecision.needsDiary) {
              const diaryEntries = await prisma.diaryEntry.findMany({
                where: {
                  userId: req.userId,
                  dayIndex: resolvedDayIndex,
                },
                select: {
                  note: true,
                  mood: true,
                  tags: true,
                  time: true,
                  createdAt: true,
                },
                orderBy: {
                  createdAt: "asc",
                },
                take: 10,
              });

              if (diaryEntries.length > 0) {
                if (!snapshot.reflection) snapshot.reflection = {};
                snapshot.reflection.diary = diaryEntries.map((entry) => ({
                  localDate: snapshotMetric.date.toISOString().slice(0, 10),
                  time: entry.time ?? entry.createdAt.toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone,
                  }),
                  mood: entry.mood ?? undefined,
                  note: entry.note ?? undefined,
                  tags: entry.tags ? JSON.parse(entry.tags) : undefined,
                }));
              }
            }

            const snapshotText = `\n\n[Anna Context Snapshot]:\n${JSON.stringify(snapshot, null, 2)}`;
            systemPrompt += snapshotText;
          }
        } catch (e) {
          console.error("Error building Anna context snapshot:", e);
        }
      }

      // ── Smart Middleware (Pre-fetch): Water Context JIT Injection ──
      const userMessage = message || "";
      const isWaterQuery = /вод[ауеы]|попи|выпил|жажд|норм[ау]/i.test(userMessage);
      if (req.userId && isWaterQuery) {
        try {
          const user = await prisma.user.findUnique({ where: { id: req.userId } });
          const weight = user?.weight ?? user?.initialWeight ?? 65;
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const metric = await prisma.dailyMetric.findFirst({
            where: { userId: req.userId, date: { gte: today } },
            orderBy: { date: "desc" },
          });
          const sessionMetric = metric ?? await prisma.dailyMetric.findFirst({
            where: { userId: req.userId, dayIndex: dayIndex ?? 1 },
            orderBy: { date: "desc" },
          });

          let waterEntries: Array<{ amount: number; time?: string; timestamp?: number }> = [];
          const rawWaterEntries = sessionMetric?.waterEntries;
          if (rawWaterEntries) {
            try {
              const parsed = safeParseJSON<Array<{ amount: number; time?: string; timestamp?: number }>>(rawWaterEntries, []);
              if (parsed.ok && Array.isArray(parsed.data)) {
                waterEntries = parsed.data;
              }
            } catch {
              // ignore parse errors
            }
          }

          const waterContext = getWaterContext({
            userName: user?.name || "друг",
            userGender: (user?.gender as "female" | "male") || "female",
            waterEntries,
            weight,
          });

          const waterInjectionText = `\n\n[Системные данные о Воде пользователя на сегодня:
- Выпито сегодня: ${waterContext.drank_today_ml} мл
- Дневная норма: ${waterContext.daily_goal_ml} мл
- Последний приём: ${waterContext.last_drink_time || "нет записей"}
ОБЯЗАТЕЛЬНОЕ ПРАВИЛО: Все цифры объема переводи в текст прописью (например, 'один литр двести миллилитров', а не '1200 мл'). Запрещено использовать числа для объема. Не упоминай пользователю, откуда взял эти данные.]`;

          systemPrompt += waterInjectionText;
          debugInput('[Water Pre-fetch JIT Triggered]:', {
            isWaterQuery,
            message: userMessage,
            injectedText: waterInjectionText,
            drank_today: waterContext.drank_today_ml
          });
        } catch (e) {
          console.error("Error loading water context for Anna:", e);
        }
      }

      systemPrompt += `\n\n[ПРАВИЛО КРАТКОСТИ]: Отвечай кратко и по существу. Для простых вопросов — 1-3 предложения. Развёрнутый ответ — только если пользователь явно просит подробностей или это необходимо для объяснения. Не повторяй очевидное.`;

      const availableTools = pickAnnaTools(message, screenContextDetails?.screen_id || screenContext, dayIndex);

      // Build messages in OpenAI format for tool calling
      const messages: any[] = [];

      // Preamble with screen context
      if (screenContextDetails || bookRecipesDataContext) {
        const preamble: any = {};
        if (screenContextDetails) preamble.screenContextDetails = screenContextDetails;
        if (bookRecipesDataContext) preamble.bookRecipesDataContext = bookRecipesDataContext;
        messages.push({
          role: "user",
          content: `[КОНТЕКСТ ПОЛЬЗОВАТЕЛЯ]:\n${JSON.stringify(preamble, null, 2)}`
        });
      }

      // Conversation history (last 10)
      if (history && Array.isArray(history)) {
        history.slice(-10).forEach((h: any) => {
          messages.push({
            role: h.sender === "user" ? "user" : "assistant",
            content: h.text,
          });
        });
      }

      // Current user message
      messages.push({ role: "user", content: message });

      // ── Tool calling loop (multi-turn round-trip) ──
      const MAX_TOOL_ROUNDS = 3;
      let finalReply = "";

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        if (process.env.NODE_ENV !== "production") {
          console.log("[Anna Prompt Debug]", {
            round: round + 1,
            promptChars: systemPrompt.length,
            promptSha256: crypto
              .createHash("sha256")
              .update(systemPrompt)
              .digest("hex"),
            topics: annaRouteDecision.topics,
            knowledgeFiles: annaRouteDecision.knowledgeFiles,
            moduleFiles: annaRouteDecision.moduleFiles,
            hasToolGuidance: Boolean(annaToolGuidance),
            hasSnapshot: systemPrompt.includes("[Anna Context Snapshot]:"),
            hasWaterInjection: systemPrompt.includes(
              "[Системные данные о Воде пользователя на сегодня:",
            ),
            toolCount: availableTools.length,
          });
        }

        const result = await generateContentWithFallback({
          messages,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.8,
            maxOutputTokens: 500,
          },
          tools: availableTools.length > 0 ? availableTools : undefined,
          tool_choice: "auto",
        });

        const toolCalls = result.tool_calls;

        if (!toolCalls || toolCalls.length === 0) {
          finalReply = result.text?.trim() || "";
          break;
        }

        // Record assistant message with tool_calls (content MUST be null in OpenAI format)
        messages.push({
          role: "assistant",
          content: null,
          tool_calls: toolCalls,
        });

        // Execute each tool and feed result back with role "tool"
        for (const tc of toolCalls) {
          const call = tc as any;
          const { id, name, arguments: argsJson } = call.function;
          let args: Record<string, any>;
          try {
            args = JSON.parse(argsJson);
          } catch {
            args = {};
          }
          const toolResult = await executeToolCall(name, args, req.userId || "anonymous");
          messages.push({
            role: "tool",
            tool_call_id: id,
            content: JSON.stringify(toolResult),
          });
        }

        console.log(`[AnnaTools] Round ${round + 1}: ${toolCalls.length} tool(s) called — ${toolCalls.map((t: any) => t.function.name).join(", ")}`);
      }

      // Guarantee a final text answer: if tool rounds exhausted without a text reply,
      // make one last plain LLM call so the model reads tool results and answers.
      if (!finalReply) {
        try {
          const finalResult = await generateContentWithFallback({
            messages,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.8,
              maxOutputTokens: 500,
            },
          });
          finalReply = finalResult.text?.trim() || "";
        } catch (err: any) {
          console.warn("[AnnaTools] Final fallback LLM call failed:", err?.message || err);
        }
      }

      if (!finalReply) {
        finalReply = "Я сейчас не могу найти эту информацию. Попробуй спросить иначе!";
      }

      // Parse a possible technical emotion prefix, such as:
      // "curiosity (2)\nТекст ответа".
      // Only the clean reply belongs in chat history and the database.
      const parsedReply = parseAnnaEmotionReply(finalReply);

      // Save chat to database
      if (req.userId && message) {
        prisma.annaChat.create({
          data: {
            userId: req.userId,
            message,
            reply: parsedReply.reply || null,
            screen: screenContext || null,
            dayIndex: dayIndex ?? null,
          },
        }).catch((err) => console.warn("[AnnaChat] save failed:", err.message));
      }

      if (parsedReply.reply) {
        annaCache.set(cacheKey, { reply: parsedReply.reply, ts: Date.now() });
      }

      // ── Send final answer exactly ONCE, at the very end after all tool rounds ──
      // Plain REST transport: the client awaits the full JSON body and never sees
      // intermediate tool-round text (it is suppressed above via content:null).
      // Guard against double-send so a single /api/anna-chat request produces one response.
      if (res.headersSent) {
        console.warn("[Anna Final Reply] Response already sent — skipping second send.");
      } else {
        console.log("[Anna Final Reply]:", parsedReply);
        return res.json(parsedReply);
      }
    } catch (err: any) {
      if (res.headersSent) {
        console.warn("[Anna Final Reply] Error after response sent:", err?.message || err);
        return;
      }
const fallbackReply = parseAnnaEmotionReply(
        "Привет! Всё отлично! Я всегда рядом, чтобы поддержать твой путь к здоровью и чистой энергии всей душой! 🌿",
      );

      console.log("[Anna Final Reply]:", {
        reply: fallbackReply.reply,
        avatarIntent: fallbackReply.avatarIntent,
        avatarIntensity: fallbackReply.avatarIntensity,
      });

      return res.json(fallbackReply);
    }
  });

  // Text-to-Speech — DashScope (clone voice of Anna)
  app.post("/api/anna-tts", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) return res.status(400).json({ error: "No text" });
      const cleanText = text.replace(/[🌱🍏🥗⚖️🌿✨🍲😴🦎🥬🥘🥑🍅🍇🍓🍒🍊🍋🍍🌽🥕🥜🥑🥛🧂🥣🍴🍷🥩🧁🍬🍟🍔🍕🥤❌♥️]/g, "").trim();
      if (!cleanText) return res.json({ audioBase64: "", audioUrl: "" });
      const ttsResult = await generateAnnaAudio(cleanText);
      return res.json(ttsResult);
    } catch (err: any) {
      console.error("[TTS-DashScope] Error:", err?.message || err);
      return res.json({ audioBase64: "", audioUrl: "" });
    }
  });

  // API endpoint for true nutrient analysis — Edamam API with RU→EN translation proxy
  app.post("/api/analyze-dish", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const { ingredients, defaultDishName, mealSource, dishCategory } = req.body || {};
    debugInput("[PIPELINE TRACE 1] Raw Input from Client:", JSON.stringify(ingredients?.map((i: any) => ({ name: i.fullName || i.shortName, weight: i.weight }))), "HasImage: false");
    try {
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: "No ingredients received" });
      }

      // ── Step A: Compute nutrients from local FoodItem DB ──
      const { totals: nutrientsFlat, unresolved } = await computeNutrientsFromDB(ingredients);

      // Барьер unresolved: нераспознанные/неполные ингредиенты запрещают анализ.
      // forbidden/error распознан и анализу НЕ препятствует.
      if (unresolved.length > 0) {
        console.error("[analyze-dish] Unresolved ingredients:", JSON.stringify(unresolved));
        return res.status(422).json({
          error: "Невозможно выполнить анализ: есть нераспознанные или неполные ингредиенты.",
          unresolved,
        });
      }

      // B1: если ни один ингредиент не сопоставлен с собственной БД — расчёт не дал
      // валидного результата. Не возвращаем пустые/нулевые КБЖУ как успешный ответ.
      if (isEmptyNutrientObj(nutrientsFlat)) {
        console.error("[analyze-dish] Empty nutrient result — no DB matches");
        return res.status(422).json({ error: "Не удалось рассчитать нутриенты блюда по базе. Повторите попытку." });
      }

      // ── Step B: LLM generates ONLY dish name + insights (no nutrient guessing) ──
      // Сортируем ингредиенты по реальному весу от большего к меньшему
      const sortedByWeight = [...ingredients].sort((a: any, b: any) => {
        const wA = parseFloat(String(a.weight || 0).replace(',', '.')) || 0;
        const wB = parseFloat(String(b.weight || 0).replace(',', '.')) || 0;
        return wB - wA;
      });

      const ingredientsDescription = sortedByWeight
        .map(ing => `- ${ing.fullName || ing.shortName}: ${ing.weight || 100}г${ing.manuallyAllowed || ing.status === 'error' || ing.status === 'red' ? ' (ВНИМАНИЕ: не-WFPB продукт)' : ''}`)
        .join("\n");

      // WFPB compliance: authoritatively from local FoodItem DB (exact nameRu/nameEn),
      // text heuristics only as a fallback for products absent from the base.
      const forbiddenLines: string[] = [];
      for (const ing of ingredients) {
        const name = (ing.fullName || ing.shortName || "").toLowerCase().trim();

        if (name) {
          const dbItem = await prisma.foodItem.findFirst({
            where: {
              OR: [
                { nameRu: { equals: name, mode: "insensitive" } },
                { nameEn: { equals: name, mode: "insensitive" } },
              ],
            },
          });
          if (dbItem) {
            if (dbItem.wfpbStatus === "forbidden") {
              forbiddenLines.push(`- "${ing.fullName || ing.shortName}": не соответствует WFPB-стандарту (по базе продуктов).`);
            }
            continue;
          }
        }

        const found = findForbiddenInText(name);
        if (found.length > 0) {
          forbiddenLines.push(...found.map(f => `- "${f.ingredient}": ${f.reason}`));
        }
      }

      // Проверяем принудительно разрешенные нарушители (status: error/red или manuallyAllowed)
      const forcedViolations = ingredients.filter(
        (i: any) => i.manuallyAllowed || i.status === "error" || i.status === "red"
      );

      let forbiddenWarning = "";
      if (forbiddenLines.length > 0 || forcedViolations.length > 0) {
        const forcedNames = forcedViolations
          .map((i: any) => `«${i.fullName || i.shortName || i.name}» (${i.weight || 100}г)`)
          .join(", ");

        forbiddenWarning = `\n⚠️ ГРУБОЕ НАРУШЕНИЕ СТАНДАРТОВ WFPB:
Пользователь сознательно проигнорировал запрет и принудительно добавил не-WFPB продукты: ${forcedNames || "запрещенные добавки"}.
${forbiddenLines.join("\n")}

ПРАВИЛО РЕАКЦИИ АННЫ:
Никаких восторгов и хвалебных од! Включи тонкую иронию и сарказм советницы WFPB.
В блоке "compliance" прямо и язвительно укажи на факт осознанного добавления запрещенки (сахар, мясо, масло, соль или продукты животного происхождения). Назови вещи своими именами.\n\n`;
      }

      const basePromptText = `Ты — Анна, умная, слегка ироничная девушка-нутрициолог приложения WFPB «Всё дело в еде!».
${ANNA_REACTION_MATRIX}

${forbiddenWarning}Пользователь подтвердил состав тарелки:
${ingredientsDescription}

Проанализируй блюдо и верни JSON.
Правила для блока insights:
1. КАЖДЫЙ текст (strengths, improvements, compliance) должен быть лаконичным: строго 1-2 предложения, максимум 20 слов на пункт. Пиши самую суть, без воды.
2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать в тексте любые цифры (граммы, миллиграммы, проценты), касающиеся витаминов, минералов или нутриентов. Используй только качественные оценки.
3. Если есть нарушения или принудительно разрешенный сахар/мясо/масло/соль — блок compliance ОБЯЗАН отражать сарказм и строгое замечание за нарушение канонов WFPB, а не хвалить блюдо.

Формат JSON:
{"dishName": "string", "insights": {"strengths":{"title":"...","text":"..."},"improvements":{"title":"...","text":"..."},"compliance":{"title":"...","text":"..."}}}

Важно: только JSON, без markdown, всё на русском.`;

      // Формируем мощное требование к названию с ПРИМЕРАМИ
      const categoryHint = dishCategory
        ? `\n\nКРИТИЧЕСКОЕ УСЛОВИЕ: Категория блюда — "${dishCategory}". Адаптируй форму названия под неё! Если "Закуски" и есть хлеб — это бутерброд/сэндвич/брускетта. Если "Первые блюда" — суп/похлебка. Если "Вторые блюда" — горячее блюдо.`
        : "";

      const enhancedPromptText = `${basePromptText}${categoryHint}

ПРАВИЛО ФОРМИРОВАНИЯ ПОЛЯ "dishName" (СТРОГО СОБЛЮДАТЬ):
1. Ингредиенты уже отсортированы по весу. Главный продукт ОБЯЗАН быть в начале названия.
2. СВЯЗНОСТЬ И ГРАММАТИКА: КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО выдавать просто список через запятую! Соединяй слова по правилам русского языка, используя предлоги (с, и, из, на, под) и правильные падежи.
3. ОЧИСТКА: Убирай технические слова ("сырой", "изделия", "пром.", "консервированный").
4. НАЗВАНИЕ: 2-8 слов, связная русская фраза. Включай максимум главный ингредиент и 1-2 значимых дополнения. Не включай зелень, специи и мелкие акценты, если они не определяют блюдо.
5. ПРИМЕРЫ ИДЕАЛЬНОГО РЕЗУЛЬТАТА:
   - курица, нут, белые грибы → "Курица с нутом и белыми грибами"
   - тофу, хлеб, огурец; Закуски → "Сэндвич с тофу и огурцом"
   - белые грибы, батат; Основные блюда → "Белые грибы с бататом"
6. ЗАПРЕЩЕНО писать ярлык категории в ответе (никаких "Закуски: ..."). Выдай только название.`;

      let llmData: any = { dishName: "", insights: null };
      try {
        const llmResponse = await generateContentWithFallback({
          contents: enhancedPromptText,
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                dishName: { type: Type.STRING },
                insights: {
                  type: Type.OBJECT,
                  properties: {
                    strengths: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["title", "text"] },
                    improvements: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["title", "text"] },
                    compliance: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, text: { type: Type.STRING } }, required: ["title", "text"] }
                  },
                  required: ["strengths", "improvements", "compliance"]
                }
              },
              required: ["dishName", "insights"]
            }
          }
        });
        const llmText = llmResponse?.text || "{}";
        const { data: parsed, ok } = safeParseJSON(llmText, {});

        if (ok && parsed) {
          llmData = parsed;
        }
      } catch (e) {
        console.error("[LLM] Dish analysis failed:", e);
      }

      // Если модель упала, собираем fallback без кривых предлогов, просто безопасным перечислением
      if (!llmData?.dishName || /цельное растительное блюдо/i.test(llmData.dishName)) {
        const top1 = sortedByWeight[0]?.shortName || sortedByWeight[0]?.fullName || "Блюдо";
        const top2 = sortedByWeight[1]?.shortName || sortedByWeight[1]?.fullName;
        const top3 = sortedByWeight[2]?.shortName || sortedByWeight[2]?.fullName;

        const parts = [top1];
        if (top2) parts.push(top2.toLowerCase());
        if (top3) parts.push(top3.toLowerCase());

        llmData.dishName = parts.join(", ");
      }

      // ── Step C: Assemble response ──
      const omegaVal = calcOmega6To3Ratio(nutrientsFlat.omega6, nutrientsFlat.omega3);

      const nutrients = {
        calories: { value: Math.round(nutrientsFlat.calories || 0), unit: "ккал" },
        protein: { value: parseFloat((nutrientsFlat.protein || 0).toFixed(1)), unit: "г" },
        fats: { value: parseFloat((nutrientsFlat.fat || 0).toFixed(1)), unit: "г" },
        carbs: { value: parseFloat((nutrientsFlat.carbohydrates || 0).toFixed(1)), unit: "г" },
        fiber: { value: parseFloat((nutrientsFlat.fiber || 0).toFixed(1)), unit: "г" },
        omegaRatio: { value: omegaVal, unit: "" },
      };

      const micronutrients: Record<string, { value: number; unit: string }> = {};
      for (const key of ["iron", "zinc", "magnesium", "iodine", "selenium", "vitaminC", "folate", "lysine", "methionine"]) {
        const val = nutrientsFlat[key] || 0;
        micronutrients[key] = {
          value: key === "folate" ? Math.round(val) : parseFloat(val.toFixed(key === "lysine" || key === "methionine" ? 2 : 1)),
          unit: NUTRIENT_UNITS[key] || "г",
        };
      }

      const nutrientsFlatResponse: Record<string, { value: number; unit: string }> = {};
      for (const key of NUTRIENT_FIELDS) {
        const val = nutrientsFlat[key] || 0;
        nutrientsFlatResponse[key] = {
          value: (key === "calories" || key === "folate" || key === "vitaminA" || key === "vitaminC" || key === "sodium" || key === "potassium" || key === "calcium" || key === "magnesium" || key === "phosphorus")
            ? Math.round(val)
            : parseFloat(val.toFixed(3)),
          unit: NUTRIENT_UNITS[key] || "г",
        };
      }

      // Force the first character of the generated dish name to uppercase
      const rawDishName = String(llmData?.dishName || defaultDishName || "Цельное растительное блюдо");
      const dishName = rawDishName.charAt(0).toUpperCase() + rawDishName.slice(1);

      // Формируем честный вердикт Анны в зависимости от нарушений
      let annaComment = "";
      if (forcedViolations.length > 0 || forbiddenLines.length > 0) {
        const badItems = forcedViolations.map((i: any) => i.fullName || i.shortName || i.name).join(", ");
        annaComment = `Ну что, полюбуемся на это творение? Вроде бы цельная растительная основа, но рука всё равно потянулась добавить ${badItems || "запрещенку"}! Организм, конечно, переварит, но каноны WFPB смотрят на эту тарелку с неприкрытой грустью. В следующий раз давай без компромиссов!`;
      } else {
        annaComment = `${dishName} — прекрасный, чистый выбор! Отличный баланс растительных компонентов без скрытых масел, соли и сахара. Твой микробиом аплодирует стоя! 🌿`;
      }

      const resultData = {
        dishName,
        nutrients,
        micronutrients,
        nutrientsFlat: nutrientsFlatResponse,
        annaComment,
        insights: llmData?.insights || {
          strengths: { title: "Сильные стороны блюда", text: "Блюдо на основе цельных растительных ингредиентов." },
          improvements: { title: "Что можно улучшить", text: "Добавьте больше зелени и семян для баланса нутриентов." },
          compliance: { title: "Соответствие растительному рациону", text: (forbiddenLines.length > 0 || forcedViolations.length > 0) ? "Обнаружены грубые несоответствия WFPB." : "Блюдо полностью соответствует WFPB-рациону." }
        },
      };

      console.log("[PIPELINE TRACE 4] Response:", JSON.stringify({ dishName: resultData.dishName, nutrientCount: Object.keys(nutrientsFlat).length, insightCount: resultData.insights ? Object.keys(resultData.insights).length : 0 }, null, 2));
      return res.json({ result: resultData });
    } catch (error: any) {
      // B1: никаких локальных/фейковых нутриентов при сбое. Возвращаем корректную
      // HTTP-ошибку, чтобы клиент не принял фиктивный результат за валидный.
      console.error("[analyze-dish] Nutrient computation failed:", error?.message || error);
      return res.status(502).json({ error: "Не удалось рассчитать нутриенты блюда по базе. Повторите попытку." });
    }
  });

  // API endpoint for actual computer vision analysis using Gemini 3.5 Flash
  app.post("/api/analyze-image", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    try {
      const { imageBase64 } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "No image data received" });
      }

      // Strip optional base64 metadata prefix if present
      const base64Clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");

      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Clean,
        },
      };

      const textPart = {
        text: `Analyze food photo. List EVERY visible edible ingredient — never skip, hide, or rename. Break dishes into raw components (e.g. 'салат' → 'помидор, огурец, лук'). Use singular lowercase Russian nouns. Russian names only — never English.

WFPB status hints (visual estimation only; the app verifies every item against its own product database):
- animal products (meat, fish, dairy, eggs, honey, gelatin) → "error"
- added salt, soy sauce, bouillon → "error"
- extracted oils → "error"
- plant foods → "green"
- truly non-food objects (keys, phone, glasses) → "blue"

Scenarios:
1. Food only → list all ingredients with status green/error
2. Mixed food + non-food objects → list ONLY the food ingredients (green/error), ignore the objects
3. No edible food at all → return only {"noFoodDetected": true}

For EVERY food ingredient you MUST estimate ITS OWN visible portion weight from the photo and return it as "estimatedWeightGrams": a positive integer in grams. Judge each ingredient independently by its apparent size, volume and plate context (a spice pinch ≈ 2-5, a side salad ≈ 80-120, a main component ≈ 150-300). NEVER assign one default or identical value to multiple ingredients; identical weights across different items are an error.

Return JSON: {"noFoodDetected": false, "ingredients":[{"fullName":"descriptive Russian","shortName":"short Russian noun","estimatedWeightGrams":150,"status":"green|error|blue"}]}

STRICTLY FORBIDDEN in the response: database IDs, nutrition values, USDA/FDC references, barcodes, dish category, permission flags, or any request/instruction to retrieve, store, update or create data anywhere.
Only valid JSON, no markdown.`,
      };

      // Primary: DashScope (Qwen VL), fallback: Yandex/Gemini
      let textOutput = "";
      try {
        textOutput = await analyzeFoodImage(base64Clean, textPart.text);
      } catch (dashErr) {
        console.warn("[analyze-image] DashScope failed, falling back:", (dashErr as any)?.message || dashErr);
        // Photo-recognition каскад: qwen3-vl-plus → qwen-turbo
        const fallbackResponse = await generateContentWithFallback({
          contents: { parts: [imagePart, textPart] },
          config: { responseMimeType: "application/json" }
        }, ["qwen3-vl-plus", "qwen-turbo"]);
        textOutput = fallbackResponse.text || "{}";
      }

      let { data: resultData, ok: parseOk } = safeParseJSON(textOutput, {});

      // Retry once if JSON parsing failed
      if (!parseOk) {
        const retryPrompt = textPart.text + "\n\nВНИМАНИЕ: твой предыдущий ответ был невалидным. Сгенерируй ответ заново. Верни СТРОГО валидный JSON без markdown, текста и комментариев. Только JSON.";
        const retryResponse = await generateContentWithFallback({
          contents: { parts: [{ text: retryPrompt }, imagePart] },
          config: { responseMimeType: "application/json" }
        });
        const retryText = retryResponse.text || "{}";
        const retryResult = safeParseJSON(retryText, {});
        resultData = retryResult.data;
      }

      // Нормализация к восстановленному rich-контракту распознавания:
      // русские имена, вес в граммах, визуальный WFPB-статус. Qwen НЕ поставляет
      // identity/нутриенты/изображения из БД. Эндпоинт read-only по отношению
      // к FoodItem: финальные identity/status/image/нутриенты назначают общий
      // FoodItem-pipeline на клиенте и /api/analyze-dish.
      const noFood = resultData?.noFoodDetected === true;
      if (noFood) {
        return res.json({ result: { noFoodDetected: true } });
      }

      const rawIngredients = Array.isArray(resultData?.ingredients) ? resultData.ingredients : [];

      // Weight pipeline: сохраняем реальную оценку Qwen по каждому ингредиенту.
      // Поддерживаемые поля: estimatedWeightGrams | weight | weightGrams,
      // числом или строкой с числом ("260", "260 г"). Нормализация:
      // parse → round до целых граммов → clamp к безопасному диапазону проекта
      // (WEIGHT_MAX = 1000 г, см. IngredientsScreen.tsx). Fallback 100 —
      // ТОЛЬКО индивидуально для позиции без валидного веса.
      const WEIGHT_FALLBACK = 100;
      const clampWeight = (v: number) => Math.min(1000, Math.max(1, v));
      const parseWeightField = (raw: unknown): { value: number; reason?: string } => {
        if (typeof raw === "number") {
          if (!Number.isFinite(raw) || raw <= 0) return { value: WEIGHT_FALLBACK, reason: `non-positive/NaN number: ${raw}` };
          return { value: clampWeight(Math.round(raw)) };
        }
        if (typeof raw === "string") {
          const match = raw.replace(",", ".").match(/-?\d+(?:\.\d+)?/);
          if (!match) return { value: WEIGHT_FALLBACK, reason: `string without number: "${raw}"` };
          const n = Number(match[0]);
          if (!Number.isFinite(n) || n <= 0) return { value: WEIGHT_FALLBACK, reason: `string number invalid: "${raw}"` };
          return { value: clampWeight(Math.round(n)) };
        }
        return { value: WEIGHT_FALLBACK, reason: raw == null ? "field missing" : `unsupported type: ${typeof raw}` };
      };

      const weightFallbackLog: { name: string; rawFields: unknown; reason?: string }[] = [];
      const parsedCandidates = rawIngredients
        .map((ing: any) => {
          const fullName = typeof ing?.fullName === "string" ? ing.fullName.trim() : "";
          const shortName = typeof ing?.shortName === "string" && ing.shortName.trim()
            ? ing.shortName.trim()
            : fullName;
          if (!fullName && !shortName) return null;
          const status = ing?.status === "error" || ing?.status === "blue" ? ing.status : "green";
          const rawWeight = ing?.estimatedWeightGrams ?? ing?.weight ?? ing?.weightGrams;
          const parsed = parseWeightField(rawWeight);
          if (parsed.reason) {
            weightFallbackLog.push({ name: shortName || fullName, rawFields: { estimatedWeightGrams: ing?.estimatedWeightGrams, weight: ing?.weight, weightGrams: ing?.weightGrams }, reason: parsed.reason });
          }
          return {
            fullName: fullName || shortName,
            shortName,
            estimatedWeightGrams: parsed.value,
            status,
          };
        })
        .filter(Boolean);

      // Схлопывание и суммирование одинаковых продуктов по базовому имени
      const mergedMap = new Map<string, { fullName: string; shortName: string; estimatedWeightGrams: number; status: string }>();

      for (const item of parsedCandidates) {
        if (!item) continue;
        const key = normalize(item.shortName || item.fullName);

        if (mergedMap.has(key)) {
          const existing = mergedMap.get(key)!;
          existing.estimatedWeightGrams = clampWeight(existing.estimatedWeightGrams + item.estimatedWeightGrams);
          if (item.status === "error" || existing.status === "error") {
            existing.status = "error";
          } else if (item.status === "blue" || existing.status === "blue") {
            existing.status = "blue";
          }
        } else {
          mergedMap.set(key, { ...item });
        }
      }

      const candidates = Array.from(mergedMap.values());

      // Dev-only диагностика: fallback 100 сработал для КАЖДОГО ингредиента —
      // вероятная ошибка схемы/парсинга ответа Qwen. Только console, без UI.
      if (candidates.length > 0 && weightFallbackLog.length === candidates.length) {
        console.warn("[analyze-image] ALL ingredient weights fell back to", WEIGHT_FALLBACK, {
          rawIngredientsCount: rawIngredients.length,
          details: weightFallbackLog,
        });
      }

      return res.json({ result: { noFoodDetected: false, ingredients: candidates } });
    } catch (error: any) {
      console.log("Real error returned to client to trigger Anna supporting behaviors:", error?.message || error);
      return res.status(503).json({
        error: error?.message || "Service Temporarily Unavailable",
        status: "UNAVAILABLE"
      });
    }
  });

  // API endpoint for dynamic supportive, caring responses from Anna during network retries/instability
  app.post("/api/anna-supports", async (req, res) => { // Updated handler for Anna’s support requests
    try {
      const { situation } = req.body;

      const prompt = `Ты — системный голос приложения WFPB. Пользователь загрузил фото блюда, идёт распознавание ингредиентов.
Контекст: ${situation || "временное ожидание повторного анализа блюда"}

Сгенерируй ОДНУ техническую фразу на русском (8-20 слов). Опиши действия Системы/Алгоритма/Нейросети (сопоставление текстур, сегментация, сверка со стандартами WFPB). Без первого лица, без фамильярности, без кавычек. Только суть.`;

      const result = await generateContentWithFallback({
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "text/plain"
        }
      });

      const textOutput = result.text?.trim().replace(/^["']|["']$/g, "") || "Система настраивает соединение и выполняет детальный молекулярный анализ тарелки... 🌱";
      return res.json({ message: textOutput });
    } catch (e) {
      // Fallback set of diverse tech-focused supporting lines without first person pronouns
      const defaults = [
        "Система производит детальный анализ ингредиентов кадра на соответствие стандартам цельного растительного рациона без соли. 🌱",
        "Алгоритм аккуратно сегментирует снимок и сопоставляет текстуры продуктов с базой данных WFPB. ✨",
        "Происходит оптимизация соединения с сервером для точной расшифровки состава блюда и калорийности.",
        "Выполняется глубокое сканирование структуры кадра, чтобы исключить скрытые животные добавки и жиры. 🍃",
        "Нейросеть финализирует обработку растительных волокон на изображении и формирует подробный отчёт."
      ];
      const randomDefault = defaults[Math.floor(Math.random() * defaults.length)];
      return res.json({ message: randomDefault });
    }
  });

  // API endpoint for dynamic sarcastic/humorous reply from Anna when non-food objects are detected
  app.post("/api/anna-sarcastic-reply", async (req, res) => {
    try {
      const { items } = req.body;
      const itemsList = Array.isArray(items) ? items : [];
      let itemsStr = itemsList.map((x: any) => typeof x === 'object' ? `«${x.shortName || x.fullName || x}»` : `«${x}»`).join(", ");
      if (!itemsStr) {
        itemsStr = "непищевые предметы";
      }

      const prompt = `Ты — Анна, девушка-нутрициолог, женский род. Пользователь сфотографировал несъедобные предметы: ${itemsStr}.

Напиши 2-4 предложения на русском (один абзац). Умный, тонкий юмор. Обыграй конкретно эти предметы (${itemsStr}). Отметь их абсолютную бессолевость и низкокалорийность :) Мягко призови сфотографировать настоящую WFPB-еду.

Без токсичности, без пошлости. Ты — обаятельная, чуть озорная советница. Глаголы в женском роде.`;

      const result = await generateContentWithFallback({
        contents: { parts: [{ text: prompt }] },
        config: {
          responseMimeType: "text/plain"
        }
      });

      const textOutput = result.text?.trim().replace(/^["']|["']$/g, "") || "";
      if (textOutput) {
        return res.json({ message: textOutput });
      }
      throw new Error("Empty AI response");
    } catch (e: any) {
      console.log("Error generating Anna's sarcastic reply:", e?.message || e);
      // Fallback response in case of any system/API issues
      const { items } = req.body;
      const itemsList = Array.isArray(items) ? items : [];
      let fallbackStr = itemsList.map((x: any) => typeof x === 'object' ? `«${x.shortName || x.fullName || x}»` : `«${x}»`).join(" и ");
      if (!fallbackStr) fallbackStr = "непищевые предметы";

      return res.json({
        message: `Ой, какая необычная тарелка! Система распознала здесь ${fallbackStr}. Конечно, в них рекордно мало калорий и полностью отсутствует соль, но боюсь, даже крепкая эмаль зубов и WFPB-философия не справятся со здоровым расщеплением таких инновационных продуктов! Кажется, ты хочешь позавтракать несъедобными предметами. Давай оставим их для украшения быта, а для пользы микробиома выберем чистую растительную пищу: злаки, бобовые, много зелени и фруктов. Пожалуйста, вернись назад и сфотографируй настоящее полезное блюдо! 💚`
      });
    }
  });

  // API endpoint for Anna's sarcastic dish comment using the reaction matrix
  app.post("/api/anna-comment", async (req, res) => {
    try {
      const { dishName, ingredients, mealSource, dishCategory } = req.body;
      const list = Array.isArray(ingredients) ? ingredients : [];

      // Ловим любые флаги нарушений: red, error, forbidden или принудительно разрешенные
      const isViolation = (i: any) =>
        i.manuallyAllowed ||
        i.status === "red" ||
        i.status === "error" ||
        i.wfpbStatus === "forbidden" ||
        i.isForbidden === true;

      const forcedList = list.filter(isViolation);
      const normalList = list.filter((i: any) => !isViolation(i));

      const forcedStr = forcedList.length > 0
        ? `\n\n⚠️ КРИТИЧЕСКИ ВАЖНО: В блюдо добавлены запрещенные ингредиенты, нарушающие стандарты WFPB: ${forcedList.map((i: any) => `«${i.name || i.shortName || i.fullName || "ингредиент"}» (${i.weight || "?"} г)`).join(", ")}. Пользователь сознательно разрешил или оставил эти продукты в тарелке. ОБЯЗАТЕЛЬНО отреагируй на это язвительно, с сарказмом и строгим упреком согласно матрице реакций!`
        : "";

      const ingredientStr = list
        .map((i: any) => `- ${i.name || i.shortName || i.fullName || "?"} (${i.weight || "?"} г, статус: ${i.status || "?"}${i.manuallyAllowed ? ", принудительно разрешен" : ""})`)
        .join("\n");

      // Module-specific hidden philosophy context (only for "Из того, что есть")
      const philosophyText = mealSource === "from-what-is" && dishCategory
        ? DISH_PHILOSOPHY[dishCategory] || ""
        : "";
      const philosophyInstruction = philosophyText
        ? `\n\nСкрытый контекст для Анны: Философия и скрытый смысл этого блюда (категория "${dishCategory}"): ${philosophyText} Используй этот контекст как глубинную призму при оценке ингредиентов и написании комментария.`
        : "";

      const prompt = `${ANNA_REACTION_MATRIX}

Analyze this dish:
Dish name: "${dishName || "блюдо"}"
Ingredients:
${ingredientStr || "—"}${forcedStr}

Generate a short, sarcastic Anna comment (1 paragraph, 2-4 sentences in Russian). Use the tone logic based on the number of violations (status: "red" = violation, "yellow" = caution, "green" = clean). Pay special attention to forced ingredients — they indicate the user knowingly ignored WFPB rules.${philosophyInstruction}`;

      const result = await generateContentWithFallback({
        contents: { parts: [{ text: prompt }] },
        config: { responseMimeType: "text/plain", temperature: 0.8 }
      });

      const textOutput = result.text?.trim().replace(/^["']|["']$/g, "") || "";
      if (textOutput) {
        return res.json({ comment: textOutput });
      }
      throw new Error("Empty AI response");
    } catch (e: any) {
      console.log("Error generating Anna dish comment:", e?.message || e);
      // Fallback static comments
      const fallbacks = [
        "Ну, как тебе сказать… В этом блюде есть и плюсы, и минусы. Но знаешь, даже если один ингредиент не идеален, это не повод расстраиваться — в следующий раз просто замени его на цельную растительную альтернативу!",
        "Честно? Я ожидала большего. Но давай посмотрим правде в глаза — ты же не обязан быть идеальным каждый день. Главное, что ты стараешься!",
        "Анализ показал: блюдо неоднозначное. Есть над чем работать! Но я в тебя верю — с каждым разом твои тарелки становятся всё лучше и лучше.",
        "Если честно, мои биологические рецепторы слегка насторожились. Но эй, прогресс — это не прямая линия. Один шаг назад, два шага вперёд!"
      ];
      const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      return res.json({ comment: fallback });
    }
  });

  // DashScope Speech-to-Text (Paraformer / SenseVoice)
  app.post("/api/transcribe-audio", async (req, res) => {
    try {
      const { audioBase64, format } = req.body;
      if (!audioBase64) return res.status(400).json({ error: "No audio data" });
      const text = await transcribeAudio(audioBase64, { format: format || "wav" });
      return res.json({ text });
    } catch (err: any) {
      return fail500(req, res, err);
    }
  });

  // ── Init: GET /api/user/init ──
  // Auto-advances currentDayIndex based on calendar date, called once on app mount
  app.get("/api/user/init", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      let user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Server-side canonical local day in the user's timezone (User.timeZone is the
      // single source; query tz / clientToday are never used as decision input).
      const tz = user.timeZone || DEFAULT_TIMEZONE;
      const todayStr = todayLocalDate(tz);
      const todayDate = toDateOnly(todayStr);

      if (!user.courseStartDate) {
        // New course: only the request that lands the CAS (courseStartDate === null)
        // seeds it; the loser re-reads instead of double-creating.
        const applied = await prisma.user.updateMany({
          where: { id: req.userId, courseStartDate: null },
          data: { courseStartDate: todayDate, currentDayIndex: 1, lastActiveDate: todayDate },
        });
        if (applied.count === 0) {
          user = (await prisma.user.findUnique({ where: { id: req.userId } }))!;
        } else {
          user = { ...user, courseStartDate: todayDate, currentDayIndex: 1, lastActiveDate: todayDate } as typeof user;
        }
      } else {
        // Rollover: advance +1 only on the first server-confirmed entry into a new
        // local day (no catch-up of skipped days). Clamp at 29 (graduation).
        const currentIdx = user.currentDayIndex || 1;
        if (currentIdx >= 29) {
          const applied = await prisma.user.updateMany({
            where: { id: req.userId, OR: [{ lastActiveDate: null }, { lastActiveDate: { lt: todayDate } }] },
            data: { lastActiveDate: todayDate },
          });
          if (applied.count === 0) {
            user = (await prisma.user.findUnique({ where: { id: req.userId } }))!;
          } else {
            user = { ...user, lastActiveDate: todayDate } as typeof user;
          }
        } else {
          const desired = Math.min(currentIdx + 1, 29);
          const applied = await prisma.user.updateMany({
            where: { id: req.userId, OR: [{ lastActiveDate: null }, { lastActiveDate: { lt: todayDate } }] },
            data: { currentDayIndex: desired, lastActiveDate: todayDate },
          });
          if (applied.count === 0) {
            // Same local day or a concurrent init already advanced the day — re-read
            // the authoritative stored values, never increment twice.
            user = (await prisma.user.findUnique({ where: { id: req.userId } }))!;
          } else {
            user = { ...user, currentDayIndex: desired, lastActiveDate: todayDate } as typeof user;
          }
        }
      }

      const courseStartDate = user.courseStartDate;
      const currentDayIndex = user.currentDayIndex || 1;
      const isCourseCompleted = currentDayIndex >= 29;
      const lastActiveDate = user.lastActiveDate;

      res.json({
        currentDayIndex,
        isCourseCompleted,
        graduationReady: isCourseCompleted,
        courseCycle: (user as any).cycleNumber || 1,
        courseStartDate: courseStartDate?.toISOString() || null,
        lastActiveDate: lastActiveDate?.toISOString() || null,
        profile: {
          name: user.name,
          gender: user.gender,
          weight: user.weight,
          systolic: user.systolic,
          diastolic: user.diastolic,
          initialWeight: user.initialWeight,
          initialSystolic: user.initialSystolic,
          initialDiastolic: user.initialDiastolic,
          chronicConditions: user.chronicConditions ? JSON.parse(user.chronicConditions) : [],
          healthGoals: user.healthGoals ? JSON.parse(user.healthGoals) : [],
        },
      });
    } catch (err: any) {
      console.error("[Init] error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── Graduation: GET /api/user/graduation ──
  app.get("/api/user/graduation", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const rawCycle = req.query.cycleNumber as string | undefined;
      const parsedCycle = rawCycle ? parseInt(rawCycle, 10) : NaN;
      const courseCycle = Number.isFinite(parsedCycle) && parsedCycle > 0 ? parsedCycle : ((user as any).cycleNumber || 1);

      const [dailyMetrics, recipeProgress, savedDishes] = await Promise.all([
        prisma.dailyMetric.findMany({ where: { userId: req.userId, cycleNumber: courseCycle } }),
        prisma.recipeProgress.findMany({ where: { userId: req.userId, cycleNumber: courseCycle, status: "cooked" } }),
        prisma.savedDish.findMany({ where: { userId: req.userId, cycleNumber: courseCycle } }),
      ]);

      const totalWaterLiters = dailyMetrics.reduce((sum, m) => sum + (m.waterMl || 0), 0) / 1000;

      const cookedOutOf166 = recipeProgress.length;

      const totalFiberKg =
        savedDishes.reduce((sum, d: any) => {
          const raw = d.fiber;
          if (raw == null || raw === "") return sum;
          const val = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
          return sum + (Number.isFinite(val) ? val : 0);
        }, 0) / 1000;

      const sortedAsc = [...dailyMetrics].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const sortedDesc = [...sortedAsc].reverse();

      const lastWeight = sortedDesc.find((m) => typeof m.weight === "number" && m.weight != null)?.weight ?? (user.weight as number | null) ?? null;
      const firstWeight = (user.initialWeight as number | null) ?? sortedAsc.find((m) => typeof m.weight === "number" && m.weight != null)?.weight ?? null;
      const weightDelta = lastWeight != null && firstWeight != null ? lastWeight - firstWeight : null;

      const lastSystolic = sortedDesc.find((m) => typeof m.systolic === "number" && m.systolic != null)?.systolic ?? (user.systolic as number | null) ?? null;
      const firstSystolic = (user.initialSystolic as number | null) ?? sortedAsc.find((m) => typeof m.systolic === "number" && m.systolic != null)?.systolic ?? null;
      const systolicDelta = lastSystolic != null && firstSystolic != null ? lastSystolic - firstSystolic : null;

      res.json({
        courseCycle,
        totalWaterLiters,
        cookedOutOf166,
        totalFiberKg,
        weightDelta,
        systolicDelta,
      });
    } catch (err: any) {
      console.error("[Graduation] error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── Restart Course: POST /api/user/restart-course ──
  app.post("/api/user/restart-course", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      // withAI is optional, currently no AI side-effects, kept for forward compatibility
      const { withAI } = req.body || {};

      let user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const tz = user.timeZone || DEFAULT_TIMEZONE;
      const todayStr = todayLocalDate(tz);
      const todayDate = toDateOnly(todayStr);

      const updated = await prisma.$transaction(async (tx) => {
        const currentCycle = ((user as any).cycleNumber || 1) as number;
        const newCycle = currentCycle + 1;
        return tx.user.update({
          where: { id: req.userId! },
          data: {
            cycleNumber: newCycle,
            currentDayIndex: 1,
            courseStartDate: todayDate,
            lastActiveDate: todayDate,
          },
        });
      });

      // withAI flag currently does not trigger extra logic; keep deterministic response
      void withAI;

      res.json({
        success: true,
        currentDayIndex: 1,
        courseCycle: (updated as any).cycleNumber,
        courseStartDate: todayDate.toISOString(),
      });
    } catch (err: any) {
      console.error("[RestartCourse] error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── CRUD: User Profile ──



// POST /api/user/profile — save or update the user's profile data
  app.post("/api/user/profile", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const data = req.body;
      let timeZone: string | undefined;
      if (data.timeZone !== undefined && data.timeZone !== null) {
        if (typeof data.timeZone !== "string" || data.timeZone.trim() === "") {
          return res.status(400).json({ error: "Invalid time zone" });
        }
        try {
          validateIanaTimeZone(data.timeZone);
          timeZone = data.timeZone;
        } catch {
          return res.status(400).json({ error: `Invalid IANA time zone: "${data.timeZone}"` });
        }
      }
      const user = await prisma.user.update({
        where: { id: req.userId },
        data: {
          name: data.name ?? undefined,
          gender: data.gender ?? undefined,
          age: data.age ?? undefined,
          height: data.height ?? undefined,
          weight: data.weight ?? undefined,
          systolic: data.systolic ?? undefined,
          diastolic: data.diastolic ?? undefined,
          initialAge: data.initialAge ?? undefined,
          initialHeight: data.initialHeight ?? undefined,
          initialWeight: data.initialWeight ?? undefined,
          initialSystolic: data.initialSystolic ?? undefined,
          initialDiastolic: data.initialDiastolic ?? undefined,
          hasSavedSettings: data.hasSavedSettings === true && data.chronicConditions && data.healthGoals ? true : undefined,
          timeZone,
          chronicConditions: data.chronicConditions ? JSON.stringify(data.chronicConditions) : undefined,
          healthGoals: data.healthGoals ? JSON.stringify(data.healthGoals) : undefined,
          clickCount: data.clickCount ?? undefined,
        },
      });
      res.json({ ok: true, userId: user.id });
    } catch (err: any) {
      console.error("[UserProfile] error:", err.message);
      fail500(req, res, err);
    }
  });

  // GET /api/user/profile — fetch the user's profile
  app.get("/api/user/profile", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.json({});
      res.json({
        name: user.name,
        gender: user.gender,
        age: user.age,
        height: user.height,
        weight: user.weight,
        systolic: user.systolic,
        diastolic: user.diastolic,
        initialAge: user.initialAge,
        initialHeight: user.initialHeight,
        initialWeight: user.initialWeight,
        initialSystolic: user.initialSystolic,
        initialDiastolic: user.initialDiastolic,
        hasSavedSettings: user.hasSavedSettings,
        timeZone: user.timeZone || DEFAULT_TIMEZONE,
        chronicConditions: user.chronicConditions ? JSON.parse(user.chronicConditions) : [],
        healthGoals: user.healthGoals ? JSON.parse(user.healthGoals) : [],
        clickCount: user.clickCount || 0,
        globalProgress: user.globalProgress || 0,
      });
    } catch (err: any) {
      console.error("[UserProfile] GET error:", err.message);
      fail500(req, res, err);
    }
  });

  // GET /api/food — return all FoodItem records (essential fields)
  app.get("/api/food", async (_req, res) => {
    try {
      const items = await prisma.foodItem.findMany({
        select: {
          id: true,
          nameRu: true,
          nameEn: true,
          wfpbStatus: true,
          fdcId: true,
          calories: true,
          protein: true,
          fat: true,
          carbohydrates: true,
          fiber: true,
          water: true,
        },
        orderBy: { nameRu: "asc" },
      });
      res.json(items);
    } catch (err: any) {
      console.error("[Food] GET error:", err.message);
      fail500(_req, res, err);
    }
  });

  // POST /api/user/progress — batch-increment global progress counter
  app.post("/api/user/progress", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { increment } = req.body;
      if (typeof increment !== "number" || increment < 1) {
        return res.status(400).json({ error: "Invalid increment" });
      }
      const user = await prisma.user.update({
        where: { id: req.userId },
        data: { globalProgress: { increment } },
      });
      res.json({ globalProgress: user.globalProgress });
    } catch (err: any) {
      console.error("[UserProgress] error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── All-in-one: GET /api/user/data ──
  // Returns profile, savedDishes, diary, recipeProgress in a single response
  app.get("/api/user/data", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const [dishes, diary, recipeProgress, userAchievements] = await Promise.all([
        prisma.savedDish.findMany({ where: { userId: req.userId, cycleNumber: user!.cycleNumber }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.diaryEntry.findMany({ where: { userId: req.userId, cycleNumber: user!.cycleNumber }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.recipeProgress.findMany({ where: { userId: req.userId, cycleNumber: user!.cycleNumber } }),
        prisma.userAchievement.findMany({ where: { userId: req.userId, unlocked: true }, select: { achievementId: true } }),
      ]);

      res.json({
        profile: user ? {
          name: user.name,
          gender: user.gender,
          age: user.age,
          height: user.height,
          weight: user.weight,
          systolic: user.systolic,
          diastolic: user.diastolic,
          initialAge: user.initialAge,
          initialHeight: user.initialHeight,
          initialWeight: user.initialWeight,
          initialSystolic: user.initialSystolic,
          initialDiastolic: user.initialDiastolic,
          hasSavedSettings: user.hasSavedSettings,
          timeZone: user.timeZone || DEFAULT_TIMEZONE,
          chronicConditions: user.chronicConditions ? JSON.parse(user.chronicConditions) : [],
          healthGoals: user.healthGoals ? JSON.parse(user.healthGoals) : [],
          clickCount: user.clickCount || 0,
        } : {},
        savedDishes: (dishes || []).map(d => ({
          ...d,
          ingredients: d.ingredients ? JSON.parse(d.ingredients) : [],
        })),
        diary: (diary || []).map(e => ({
          ...e,
          tags: e.tags ? JSON.parse(e.tags) : [],
        })),
        recipeProgress: (recipeProgress || []).map(r => ({
          ...r,
          tags: r.tags ? JSON.parse(r.tags) : [],
        })),
        unlockedAchievementIds: (userAchievements || []).map(a => a.achievementId),
      });
    } catch (err: any) {
      console.error("[UserData] GET error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── Aggregated: GET /api/user/state-now ──
  // Returns all data needed by StateNowScreen in one call
  app.get("/api/user/state-now", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const dayIndex = parseInt(req.query.dayIndex as string) || 1;

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const [dishes, diary, recipeProgress, dailyMetric] = await Promise.all([
        prisma.savedDish.findMany({ where: { userId: req.userId, cycleNumber: user!.cycleNumber }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.diaryEntry.findMany({ where: { userId: req.userId, cycleNumber: user!.cycleNumber, dayIndex }, orderBy: { createdAt: "desc" } }),
        prisma.recipeProgress.findMany({ where: { userId: req.userId, cycleNumber: user!.cycleNumber } }),
        prisma.dailyMetric.findFirst({ where: { userId: req.userId, cycleNumber: user!.cycleNumber, dayIndex }, orderBy: { date: "desc" } }),
      ]);

      // Rating: exact (userId + dayIndex) lookup first, then legacy fallback for
      // rows with dayIndex IS NULL scoped to the correct local day range.
      const todayLocal = todayLocalDate(user?.timeZone || DEFAULT_TIMEZONE);
      let dailyRating = await prisma.dailyRating.findFirst({
        where: { userId: req.userId, cycleNumber: user!.cycleNumber, dayIndex },
        orderBy: { date: "desc" },
      });
      if (!dailyRating) {
        dailyRating = await prisma.dailyRating.findFirst({
          where: {
            userId: req.userId,
            cycleNumber: user!.cycleNumber,
            dayIndex: null,
            date: { gte: toDateOnly(todayLocal), lt: addDays(todayLocal, 1) },
          },
          orderBy: { date: "desc" },
        });
      }

      res.json({
        currentDayIndex: user?.currentDayIndex || 1,
        courseStartDate: user?.courseStartDate?.toISOString() || null,
        profile: user ? {
          name: user.name,
          gender: user.gender,
          weight: user.weight,
          chronicConditions: user.chronicConditions ? JSON.parse(user.chronicConditions) : [],
          healthGoals: user.healthGoals ? JSON.parse(user.healthGoals) : [],
        } : null,
        savedDishes: (dishes || []).map(d => ({
          ...d,
          ingredients: d.ingredients ? JSON.parse(d.ingredients) : [],
        })),
        diary: (diary || []).map(e => ({
          ...e,
          tags: e.tags ? JSON.parse(e.tags) : [],
        })),
        recipeProgress: (recipeProgress || []).map(r => ({
          ...r,
          tags: r.tags ? JSON.parse(r.tags) : [],
        })),
        dailyMetric: dailyMetric ? {
          waterMl: dailyMetric.waterMl,
          sleepMinutes: dailyMetric.sleepMinutes,
          sleepLogs: dailyMetric.sleepLogs ? JSON.parse(dailyMetric.sleepLogs) : [],
          mealCount: dailyMetric.mealCount,
          habitsDone: dailyMetric.habitsDone,
          activityMinutes: dailyMetric.activityMinutes,
          waterEntries: dailyMetric.waterEntries,
          movementLog: dailyMetric.movementLog,
          digestionLog: dailyMetric.digestionLog,
          measurements: dailyMetric.measurements,
          dayMood: dailyMetric.dayMood,
          dayBookmark: dailyMetric.dayBookmark,
        } : null,
        dailyRating: dailyRating ? {
          wellbeing: dailyRating.wellbeing,
          energy: dailyRating.energy,
          lightness: dailyRating.lightness,
          wellbeingLog: dailyRating.wellbeingLog ? JSON.parse(dailyRating.wellbeingLog) : [],
          energyLog: dailyRating.energyLog ? JSON.parse(dailyRating.energyLog) : [],
          lightnessLog: dailyRating.lightnessLog ? JSON.parse(dailyRating.lightnessLog) : [],
        } : null,
      });
    } catch (err: any) {
      console.error("[StateNow] GET error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── CRUD: Daily Metrics ──
  // POST /api/metrics/daily — upsert daily tracking data
  app.post("/api/metrics/daily", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { date, dayIndex, waterMl, sleepMinutes, mealCount, habitsDone, activityMinutes, steps, waterEntries, sleepLogs, digestionLog, movementLog, measurements, dayMood, dayBookmark } = req.body;

      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date: expected YYYY-MM-DD" });
      }
      const normDayIndex = dayIndex == null ? undefined : Number(dayIndex);
      if (normDayIndex !== undefined && !isValidDayIndex(normDayIndex)) {
        return res.status(400).json({ error: "Invalid dayIndex: expected integer 1..28" });
      }
      const dateValue = toDateOnly(date);
      const user = await prisma.user.findUnique({ where: { id: req.userId } });

      const runTransaction = async (): Promise<any> => {
        return prisma.$transaction(async (tx) => {
          const existing = await tx.dailyMetric.findUnique({
            where: { userId_cycleNumber_date: { userId: req.userId!, cycleNumber: user!.cycleNumber, date: dateValue } },
          });

          // Deterministic union + dedupe + canonical sort for every journal.
          const mergedWater = dedupeUnion(existing ? parseJsonArray(existing.waterEntries) : [], waterEntries, waterKey);
          const mergedSleep = dedupeUnion(existing ? parseJsonArray(existing.sleepLogs) : [], sleepLogs, sleepKey);
          const mergedMovement = dedupeUnion(existing ? parseJsonArray(existing.movementLog) : [], movementLog, movementKey);
          const mergedMeasurements = dedupeUnion(existing ? parseJsonArray(existing.measurements) : [], measurements, measurementKey);
          const mergedDigestion = dedupeUnion(existing ? parseJsonArray(existing.digestionLog) : [], digestionLog, digestionKey);

          // Scalars. waterMl/activityMinutes are recomputed from the merged journals
          // when non-empty (units confirmed: amount in ml, duration in seconds); when
          // the merged journal is empty an explicit valid payload value is preserved.
          let newWaterMl = existing?.waterMl ?? 0;
          if (mergedWater.length > 0) {
            newWaterMl = mergedWater.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
          } else if (typeof waterMl === "number" && Number.isFinite(waterMl) && waterMl >= 0) {
            newWaterMl = Math.round(waterMl);
          }

          let newActivityMinutes = existing?.activityMinutes ?? 0;
          if (mergedMovement.length > 0) {
            const totalSeconds = mergedMovement.reduce((sum, e) => sum + (Number(e?.duration ?? e?.durationSeconds) || 0), 0);
            newActivityMinutes = Math.round(totalSeconds / 60);
          } else if (typeof activityMinutes === "number" && Number.isFinite(activityMinutes) && activityMinutes >= 0) {
            newActivityMinutes = Math.round(activityMinutes);
          }

          let newSleepMinutes = existing?.sleepMinutes ?? 0;
          if (mergedSleep.length > 0) {
            // Canonical journal present: sleepMinutes is the sum of completed entries.
            const completedSleep = mergedSleep.filter((e: any) => e && e.status !== "draft");
            const perDaySleep = completedSleep.filter((e: any) => Number(e?.dayIndex) === normDayIndex);
            newSleepMinutes = perDaySleep.reduce((sum, e: any) => sum + (Number(e?.duration) || 0), 0);
          } else if (typeof sleepMinutes === "number" && Number.isFinite(sleepMinutes) && sleepMinutes >= 0) {
            // Empty journal with an explicit scalar (legacy protection).
            newSleepMinutes = Math.round(sleepMinutes);
          }
          const newMealCount = typeof mealCount === "number" && Number.isFinite(mealCount) ? Math.round(mealCount) : existing?.mealCount ?? 0;
          const newHabitsDone = typeof habitsDone === "number" && Number.isFinite(habitsDone) ? Math.round(habitsDone) : existing?.habitsDone ?? 0;
          const newSteps = typeof steps === "number" && Number.isFinite(steps) ? Math.round(steps) : existing?.steps ?? 0;
          const newDayMood = typeof dayMood === "string" && dayMood ? dayMood : existing?.dayMood ?? undefined;
          const newDayBookmark = typeof dayBookmark === "string" && dayBookmark ? dayBookmark : existing?.dayBookmark ?? undefined;

          // Latest valid biometric from the MERGED measurements (by timestamp, then stable id),
          // written into DailyMetric columns and the User profile within the same transaction.
          const latestMeasurement = mergedMeasurements.length > 0 ? mergedMeasurements[mergedMeasurements.length - 1] : null;
          const metricColumns: { pulse?: number; weight?: number; systolic?: number; diastolic?: number; tonus?: string } = {};
          if (latestMeasurement) {
            if (typeof latestMeasurement.pulse === "number" && latestMeasurement.pulse > 0) metricColumns.pulse = latestMeasurement.pulse;
            if (typeof latestMeasurement.weight === "number" && latestMeasurement.weight > 0) metricColumns.weight = latestMeasurement.weight;
            if (typeof latestMeasurement.systolic === "number" && latestMeasurement.systolic > 0) metricColumns.systolic = latestMeasurement.systolic;
            if (typeof latestMeasurement.diastolic === "number" && latestMeasurement.diastolic > 0) metricColumns.diastolic = latestMeasurement.diastolic;
            if (typeof latestMeasurement.tonus === "string" && latestMeasurement.tonus) metricColumns.tonus = latestMeasurement.tonus;
          }

          if (latestMeasurement) {
            const profileUpdate: Record<string, number> = {};
            if (typeof latestMeasurement.weight === "number" && latestMeasurement.weight > 0) profileUpdate.weight = latestMeasurement.weight;
            if (typeof latestMeasurement.systolic === "number" && latestMeasurement.systolic > 0) profileUpdate.systolic = latestMeasurement.systolic;
            if (typeof latestMeasurement.diastolic === "number" && latestMeasurement.diastolic > 0) profileUpdate.diastolic = latestMeasurement.diastolic;
            if (Object.keys(profileUpdate).length > 0) {
              await tx.user.update({ where: { id: req.userId! }, data: profileUpdate });
            }
          }

          const record = await tx.dailyMetric.upsert({
            where: { userId_cycleNumber_date: { userId: req.userId!, cycleNumber: user!.cycleNumber, date: dateValue } },
            update: {
              dayIndex: normDayIndex ?? existing?.dayIndex,
              waterMl: newWaterMl,
              sleepMinutes: newSleepMinutes,
              mealCount: newMealCount,
              habitsDone: newHabitsDone,
              activityMinutes: newActivityMinutes,
              steps: newSteps,
              waterEntries: JSON.stringify(mergedWater),
              sleepLogs: JSON.stringify(mergedSleep),
              digestionLog: JSON.stringify(mergedDigestion),
              movementLog: JSON.stringify(mergedMovement),
              measurements: JSON.stringify(mergedMeasurements),
              ...metricColumns,
              dayMood: newDayMood,
              dayBookmark: newDayBookmark,
            },
            create: {
              userId: req.userId!,
              cycleNumber: user!.cycleNumber,
              date: dateValue,
              dayIndex: normDayIndex ?? 1,
              waterMl: newWaterMl,
              sleepMinutes: newSleepMinutes,
              mealCount: newMealCount,
              habitsDone: newHabitsDone,
              activityMinutes: newActivityMinutes,
              steps: newSteps,
              waterEntries: JSON.stringify(mergedWater),
              sleepLogs: JSON.stringify(mergedSleep),
              digestionLog: JSON.stringify(mergedDigestion),
              movementLog: JSON.stringify(mergedMovement),
              measurements: JSON.stringify(mergedMeasurements),
              pulse: metricColumns.pulse ?? null,
              weight: metricColumns.weight ?? null,
              systolic: metricColumns.systolic ?? null,
              diastolic: metricColumns.diastolic ?? null,
              tonus: metricColumns.tonus ?? null,
              dayMood: typeof newDayMood === "string" ? newDayMood : null,
              dayBookmark: typeof newDayBookmark === "string" ? newDayBookmark : null,
            },
          });

          // Native DigestionLog rows only for digestion entries not already present
          // in the STORED journal (stable key dedupe against pre-merge JSON).
          const existingDigestionKeys = new Set(
            (existing ? parseJsonArray(existing.digestionLog) : []).map((e) => stableKeyOf(e, digestionKey))
          );
          const nativeRows = Array.isArray(digestionLog) && digestionLog.length > 0
            ? digestionLog
                .filter((entry: any) => !existingDigestionKeys.has(stableKeyOf(entry, digestionKey)))
                .map((entry: any) => ({
                  userId: req.userId!,
                  dailyMetricId: record.id,
                  date: dateValue,
                  dayIndex: typeof entry?.dayIndex === "number" ? entry.dayIndex : (normDayIndex ?? record.dayIndex),
                  timeInterval: entry?.timeInterval ?? null,
                  timeString: entry?.timeString ?? null,
                  bristolType: typeof entry?.bristolType === "number" ? entry.bristolType : 4,
                  comfort: entry?.comfort ?? "Нормально",
                  symptoms: Array.isArray(entry?.symptoms) ? entry.symptoms : [],
                  note: entry?.note ?? null,
                  linkedMeal: entry?.linkedMeal ?? null,
                  timestamp: typeof entry?.timestamp === "number" ? BigInt(entry.timestamp) : null,
                }))
            : [];
          if (nativeRows.length > 0) {
            await tx.digestionLog.createMany({ data: nativeRows });
          }

          return record;
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      };

      // Serializable retry: only external serialization failures (P2034 / 40001 / 40P01),
      // max 3 attempts; each retry runs on a fresh snapshot so it never clobbers newer data.
      let record: any = null;
      let lastError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          record = await runTransaction();
          lastError = null;
          break;
        } catch (err: any) {
          lastError = err;
          if (isExternalRetryError(err) && attempt < 2) {
            continue;
          }
          throw err;
        }
      }

      res.json({ ok: true, id: record.id });
    } catch (err: any) {
      console.error("[DailyMetric] error:", err.message);
      fail500(req, res, err);
    }
  });

  // GET /api/metrics/daily — get daily metrics for a date range
  app.get("/api/metrics/daily", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const records = await prisma.dailyMetric.findMany({
        where: { userId: req.userId, cycleNumber: user!.cycleNumber },
        orderBy: { date: "desc" },
        take: 30,
      });
      res.json(records.map(r => ({
        ...r,
        sleepLogs: r.sleepLogs ? JSON.parse(r.sleepLogs) : null,
        digestionLog: r.digestionLog ? JSON.parse(r.digestionLog) : null,
        movementLog: r.movementLog ? JSON.parse(r.movementLog) : null,
        measurements: r.measurements ? JSON.parse(r.measurements) : null,
      })));
    } catch (err: any) {
      console.error("[DailyMetric] GET error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── CRUD: Daily Ratings ──
  app.post("/api/metrics/ratings", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { date, dayIndex, wellbeing, energy, lightness, logEntry } = req.body;

      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: "Invalid date: expected YYYY-MM-DD" });
      }
      const normDayIndex = dayIndex == null ? undefined : Number(dayIndex);
      if (normDayIndex !== undefined && !isValidDayIndex(normDayIndex)) {
        return res.status(400).json({ error: "Invalid dayIndex: expected integer 1..28" });
      }
      const dateValue = toDateOnly(date);
      const user = await prisma.user.findUnique({ where: { id: req.userId } });

      // Atomic merge of rating log entries inside a transaction.
      const record = await prisma.$transaction(async (tx) => {
        const existing = await tx.dailyRating.findUnique({
          where: { userId_cycleNumber_date: { userId: req.userId!, cycleNumber: user!.cycleNumber, date: dateValue } },
        });

        const pushLogEntry = (log: any[], item: any): any[] => {
          const key = `${item?.time ?? ""}|${item?.val ?? ""}`;
          if (!log.some((x: any) => `${x?.time ?? ""}|${x?.val ?? ""}` === key)) {
            log.push(item);
          }
          log.sort((a: any, b: any) => {
            const ta = a?.time ?? "";
            const tb = b?.time ?? "";
            return ta < tb ? -1 : ta > tb ? 1 : 0;
          });
          return log;
        };

        let wellbeingLog = existing ? parseJsonArray(existing.wellbeingLog) : [];
        let energyLog = existing ? parseJsonArray(existing.energyLog) : [];
        let lightnessLog = existing ? parseJsonArray(existing.lightnessLog) : [];

        if (logEntry) {
          const item = { time: logEntry.time, val: logEntry.value };
          if (logEntry.type === "zen") wellbeingLog = pushLogEntry(wellbeingLog, item);
          if (logEntry.type === "energy") energyLog = pushLogEntry(energyLog, item);
          if (logEntry.type === "lightness") lightnessLog = pushLogEntry(lightnessLog, item);
        }

        const updateData = {
          wellbeing,
          energy,
          lightness,
          wellbeingLog: JSON.stringify(wellbeingLog),
          energyLog: JSON.stringify(energyLog),
          lightnessLog: JSON.stringify(lightnessLog),
        };

        return tx.dailyRating.upsert({
          where: { userId_cycleNumber_date: { userId: req.userId!, cycleNumber: user!.cycleNumber, date: dateValue } },
          update: { ...updateData, dayIndex: normDayIndex ?? undefined },
          create: {
            userId: req.userId!,
            cycleNumber: user!.cycleNumber,
            date: dateValue,
            dayIndex: normDayIndex ?? null,
            ...updateData,
          },
        });
      });

      res.json({ ok: true, id: record.id, record });
    } catch (err: any) {
      console.error("[DailyRating] error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── CRUD: Recipe Progress ──
  app.post("/api/recipe/progress", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { bookRecipeType, bookRecipeId, status, note, tags, dayIndex } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const record = await prisma.recipeProgress.upsert({
        where: {
          userId_cycleNumber_bookRecipeType_bookRecipeId: {
            userId: req.userId,
            cycleNumber: user!.cycleNumber,
            bookRecipeType,
            bookRecipeId,
          },
        },
        update: { status, note, tags: tags ? JSON.stringify(tags) : undefined, dayIndex, cycleNumber: user!.cycleNumber },
        create: { userId: req.userId, cycleNumber: user!.cycleNumber, bookRecipeType, bookRecipeId, status, note, tags: tags ? JSON.stringify(tags) : undefined, dayIndex },
      });
      res.json({ ok: true, id: record.id });
    } catch (err: any) {
      console.error("[RecipeProgress] error:", err.message);
      fail500(req, res, err);
    }
  });

  app.get("/api/recipe/progress", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const records = await prisma.recipeProgress.findMany({ where: { userId: req.userId, cycleNumber: user!.cycleNumber } });
      res.json(records.map(r => ({ ...r, tags: r.tags ? JSON.parse(r.tags) : [] })));
    } catch (err: any) {
      console.error("[RecipeProgress] GET error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── CRUD: Saved Dishes ──
  app.post("/api/saved-dishes", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const data = req.body;
      const nutrientData: Record<string, any> = {};
      for (const key of NUTRIENT_FIELDS) {
        if (data[key] !== undefined && data[key] !== null) {
          nutrientData[key] = data[key];
        }
      }

      // Единый расчёт полного нутриентного профиля для рецептов Книги.
      // КБЖУ/клетчатка/вода остаются авторитетными значениями из Книги —
      // resolver добавляет только extended nutrient fields (витамины, минералы,
      // аминокислоты, жирные кислоты и т.д.), и только для complete-рецептов.
      if (
        data.isBookRecipe === true &&
        data.bookRecipeType != null &&
        data.bookRecipeId != null
      ) {
        const book = await resolveBookRecipeNutrients(
          String(data.bookRecipeType),
          Number(data.bookRecipeId)
        );
        if (book.status === "complete") {
          const profileInput = book.ingredients
            .filter((i) => !i.excluded && i.grams != null && i.foodItemNameRu)
            .map((i) => ({
              shortName: i.normalizedName,
              dbKey: i.foodItemNameRu!,
              weight: i.grams!,
            }));
          if (profileInput.length > 0) {
            const { totals: computed, unresolved: bookUnresolved } = await computeNutrientsFromDB(profileInput);
            if (bookUnresolved.length > 0) {
              console.warn("[saved-dishes] Book recipe unresolved ingredients:", JSON.stringify(bookUnresolved));
            }
            for (const key of NUTRIENT_FIELDS) {
              if (BOOK_MACRO_FIELDS.has(key)) continue;
              const val = computed[key];
              if (typeof val === "number" && Number.isFinite(val) && val > 0) {
                nutrientData[key] = val;
              }
            }
          }
        }
      }

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const dish = await prisma.savedDish.create({
        data: {
          userId: req.userId,
          cycleNumber: user!.cycleNumber,
          name: data.name,
          image: data.image ?? null,
          category: data.category ?? "Основные блюда",
          tag: data.tag ?? null,
          isFavorite: data.isFavorite ?? false,
          dayIndex: data.dayIndex ?? null,
          isBookRecipe: data.isBookRecipe ?? false,
          bookRecipeType: data.bookRecipeType ?? null,
          bookRecipeId: data.bookRecipeId ?? null,
          sourceType: data.sourceType ?? null,
          ingredients: data.ingredients ? JSON.stringify(data.ingredients) : null,
          annaTip: data.annaTip ?? null,
          annaComment: data.annaComment ?? null,
          isNew: data.isNew ?? true,
          ...nutrientData,
        },
      });
      // F-sync: возвращаем полную созданную запись (включая extended
      // micronutrients) — клиент заменяет ею optimistic-копию.
      res.json({ ok: true, dish });
    } catch (err: any) {
      console.error("[SavedDish] error:", err.message);
      fail500(req, res, err);
    }
  });

  app.get("/api/saved-dishes", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const take = Math.min(parseInt(req.query.take as string) || 50, 200);
      const skip = parseInt(req.query.skip as string) || 0;
      const dishes = await prisma.savedDish.findMany({
        where: { userId: req.userId, cycleNumber: user!.cycleNumber },
        orderBy: { createdAt: "desc" },
        take,
        skip,
      });
      res.json(dishes.map(d => ({
        ...d,
        ingredients: d.ingredients ? JSON.parse(d.ingredients) : [],
      })));
    } catch (err: any) {
      console.error("[SavedDish] GET error:", err.message);
      fail500(req, res, err);
    }
  });

  app.patch("/api/saved-dishes/:id", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { id } = req.params;
      const data = req.body;
      // WHERE только по id — чужой id менялся бы без сверки владельца (IDOR).
      const existing = await prisma.savedDish.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ error: "Dish not found" });
      if (existing.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });
      const dish = await prisma.savedDish.update({
        where: { id },
        data: {
          category: data.category ?? undefined,
          isFavorite: data.isFavorite ?? undefined,
          isNew: data.isNew ?? undefined,
        },
      });
      res.json({ ok: true, id: dish.id });
    } catch (err: any) {
      console.error("[SavedDish] PATCH error:", err.message);
      fail500(req, res, err);
    }
  });

  app.delete("/api/saved-dishes/:id", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { id } = req.params;
      const dish = await prisma.savedDish.findUnique({ where: { id } });
      if (!dish) return res.status(404).json({ error: "Dish not found" });
      if (dish.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });
      await prisma.savedDish.delete({ where: { id } });
      res.json({ success: true });
    } catch (err: any) {
      console.error("[SavedDish] DELETE error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── CRUD: Diary Entries ──
  app.post("/api/diary", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { dayIndex, note, mood, photo, tags, time } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const entry = await prisma.diaryEntry.create({
        data: {
          userId: req.userId,
          cycleNumber: user!.cycleNumber,
          dayIndex,
          note: note ?? null,
          mood: mood ?? null,
          photo: photo ?? null,
          tags: tags ? JSON.stringify(tags) : null,
          time: time ?? null,
        },
      });
      res.json({ ok: true, id: entry.id });
    } catch (err: any) {
      console.error("[Diary] error:", err.message);
      fail500(req, res, err);
    }
  });

  app.get("/api/diary", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const dayIndex = req.query.dayIndex ? parseInt(req.query.dayIndex as string) : undefined;
      const where: any = { userId: req.userId, cycleNumber: user!.cycleNumber };
      if (dayIndex !== undefined) where.dayIndex = dayIndex;
      const entries = await prisma.diaryEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      res.json(entries.map(e => ({ ...e, tags: e.tags ? JSON.parse(e.tags) : [] })));
    } catch (err: any) {
      console.error("[Diary] GET error:", err.message);
      fail500(req, res, err);
    }
  });

  // DELETE /api/diary/:id — delete a diary entry
  app.delete("/api/diary/:id", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const entry = await prisma.diaryEntry.findUnique({ where: { id: req.params.id } });
      if (!entry || entry.userId !== req.userId) return res.status(404).json({ error: "Not found" });
      await prisma.diaryEntry.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (err: any) {
      console.error("[Diary] DELETE error:", err.message);
      fail500(req, res, err);
    }
  });

  // ── Diary Timeline hidden events ──
  app.get("/api/diary/hidden-events", async (req, res) => {
    if (!req.userId) {
      return res.status(400).json({ error: "Missing device ID" });
    }

    try {
      const hiddenEvents = await prisma.diaryHiddenTimelineEvent.findMany({
        where: { userId: req.userId },
        select: { eventId: true },
      });

      res.json({ eventIds: hiddenEvents.map((event) => event.eventId) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Diary hidden events] GET error:", message);
      fail500(req, res, err);
    }
  });

  app.post("/api/diary/hidden-events", async (req, res) => {
    if (!req.userId) {
      return res.status(400).json({ error: "Missing device ID" });
    }

    const { eventId } = req.body;
    if (typeof eventId !== "string" || !eventId.trim()) {
      return res.status(400).json({ error: "eventId required" });
    }

    try {
      await prisma.diaryHiddenTimelineEvent.upsert({
        where: {
          userId_eventId: {
            userId: req.userId,
            eventId,
          },
        },
        update: {},
        create: {
          userId: req.userId,
          eventId,
        },
      });

      res.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[Diary hidden events] POST error:", message);
      fail500(req, res, err);
    }
  });


  // ── CRUD: Shopping List ──
  app.get("/api/shopping-list", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const items = await prisma.shoppingItem.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
      res.json(items);
    } catch (err: any) {
      fail500(req, res, err);
    }
  });

  app.post("/api/shopping-list", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { barcode, name, brand, imageUrl, verdictStatus } = req.body;
      const item = await prisma.shoppingItem.create({
        data: { userId: req.userId, barcode: barcode ?? null, name, brand: brand ?? null, imageUrl: imageUrl ?? null, verdictStatus: verdictStatus ?? "green" },
      });
      res.json({ ok: true, id: item.id });
    } catch (err: any) {
      fail500(req, res, err);
    }
  });

  app.patch("/api/shopping-list/:id", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { id } = req.params;
      const { checked } = req.body;
      // updateMany с userId в where: чужой id не изменится, и P2025 не бросается.
      const r = await prisma.shoppingItem.updateMany({ where: { id, userId: req.userId }, data: { checked } });
      if (r.count === 0) return res.status(404).json({ error: "Item not found" });
      res.json({ ok: true, id });
    } catch (err: any) {
      fail500(req, res, err);
    }
  });

  app.delete("/api/shopping-list/:id", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const r = await prisma.shoppingItem.deleteMany({ where: { id: req.params.id, userId: req.userId } });
      if (r.count === 0) return res.status(404).json({ error: "Item not found" });
      res.json({ ok: true });
    } catch (err: any) {
      fail500(req, res, err);
    }
  });

  app.delete("/api/shopping-list", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      await prisma.shoppingItem.deleteMany({ where: { userId: req.userId } });
      res.json({ ok: true });
    } catch (err: any) {
      fail500(req, res, err);
    }
  });

  // ── CRUD: Anna Chat History ──
  app.post("/api/anna-chats", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { message, reply, screen, dayIndex } = req.body;
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      const chat = await prisma.annaChat.create({
        data: { userId: req.userId, cycleNumber: user!.cycleNumber, message, reply: reply ?? null, screen: screen ?? null, dayIndex: dayIndex ?? null },
      });
      res.json({ ok: true, id: chat.id });
    } catch (err: any) {
      fail500(req, res, err);
    }
  });

  app.get("/api/anna-chats", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const chats = await prisma.annaChat.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      res.json(chats);
    } catch (err: any) {
      fail500(req, res, err);
    }
  });

  // ── Save Anna daily analysis snapshot ──
  const ANNA_SENDERS = ["anna_analysis", "anna_movement"] as const;
  const normalizeAnnaSender = (raw: unknown): string | null => {
    const sender = typeof raw === "string" && raw.trim() !== "" ? raw : "anna_analysis";
    return (ANNA_SENDERS as readonly string[]).includes(sender) ? sender : null;
  };

  app.post("/api/anna-analysis/save", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { dayIndex, analysisText, sender } = req.body;
      const msgSender = normalizeAnnaSender(sender);
      if (!msgSender) return res.status(400).json({ error: "Invalid sender" });
      if (!dayIndex || !analysisText) return res.status(400).json({ error: "Missing dayIndex or analysisText" });
      const msg = await prisma.$transaction(async (tx) => {
        // Serialize concurrent snapshots for the same (user, dayIndex, sender) key so
        // delete+create behaves atomically and only one row survives.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`anna:${req.userId}:${dayIndex}:${msgSender}`}))`;
        await tx.annaOverlayMessage.deleteMany({
          where: { userId: req.userId!, dayIndex, sender: msgSender },
        });
        return tx.annaOverlayMessage.create({
          data: { userId: req.userId!, sender: msgSender, text: analysisText, dayIndex, time: new Date().toISOString() },
        });
      });
      res.json({ ok: true, id: msg.id });
    } catch (err: any) {
      fail500(req, res, err);
    }
  });

  // ── Load Anna daily analysis snapshot ──
  app.get("/api/anna-analysis", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const dayIndex = parseInt(req.query.dayIndex as string);
      if (!dayIndex) return res.status(400).json({ error: "Missing dayIndex" });
      const msgSender = normalizeAnnaSender(req.query.sender);
      if (!msgSender) return res.status(400).json({ error: "Invalid sender" });
      const msg = await prisma.annaOverlayMessage.findFirst({
        where: { userId: req.userId, dayIndex, sender: msgSender },
        orderBy: { createdAt: "desc" },
      });
      res.json({ text: msg?.text || null });
    } catch (err: any) {
      fail500(req, res, err);
    }
  });

  // ── Achievement Check Endpoint ──
  // Client sends events, server evaluates conditions silently.
  app.post("/api/achievements/check", async (req, res) => {
    try {
      const { action, payload } = req.body;
      if (!req.userId) {
        return res.json({ unlocked: [] });
      }

      // Load user and existing achievements from DB
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.json({ unlocked: [] });

      let existing = [];
      try {
        existing = await prisma.userAchievement.findMany({
          where: { userId: req.userId, unlocked: true },
        });
        achievementService.setUnlocked(existing.map((a: any) => a.achievementId));
      } catch (dbErr: any) {
        logger.warn("[Achievements] DB unavailable, using in-memory state:", dbErr.message);
      }

      // Fetch historical data for multi-day achievement checks (non-blocking)
      let dbMetrics: any[] = [];
      let dbDishes: any[] = [];
      try {
        const maxDay = Math.max(user.currentDayIndex || 1, 30);
        dbMetrics = await prisma.dailyMetric.findMany({
          where: { userId: req.userId, dayIndex: { gte: Math.max(1, maxDay - 30) } },
          orderBy: { dayIndex: 'asc' },
        });
        dbDishes = await prisma.savedDish.findMany({
          where: { userId: req.userId },
          orderBy: { createdAt: 'desc' },
          take: 500,
        });
      } catch (dbErr: any) {
        logger.warn("[Achievements] Failed to fetch historical data:", dbErr.message);
      }

      let dbRatings: any[] = [];
      let dbChats: any[] = [];
      try {
        dbRatings = await prisma.dailyRating.findMany({
          where: { userId: req.userId },
        });
        dbChats = await prisma.annaChat.findMany({
          where: { userId: req.userId, reply: { not: null } },
          orderBy: { createdAt: 'desc' },
          take: 20
        });
      } catch(e) {}

      const enrichedPayload = {
        ...(payload || {}),
        _dbUser: { weight: user.weight, initialWeight: user.initialWeight, currentDayIndex: user.currentDayIndex },
        _dbMetrics: dbMetrics,
        _dbDishes: dbDishes,
        _dbRatings: dbRatings,

        _dbUserFull: user,
        _dbChats: dbChats,
      };

      const result = await achievementService.check({ action, payload: enrichedPayload });

      // Save newly unlocked achievements to DB silently
      if (result.unlocked.length > 0) {
        for (const id of result.unlocked) {
          try {
            await prisma.userAchievement.upsert({
              where: { userId_achievementId: { userId: req.userId, achievementId: id } },
              update: { unlocked: true, unlockedAt: new Date() },
              create: { userId: req.userId, achievementId: id, unlocked: true, unlockedAt: new Date(), xp: 0 },
            });
          } catch (err) {
            logger.error(`[Achievements] Failed to upsert achievement ${id}:`, err);
          }
        }

        // Append new IDs to pendingAchievementId queue
          let pendingStr = user.pendingAchievementId || "";
          const pendingArr = pendingStr ? pendingStr.split(",") : [];
          for (const id of result.unlocked) {
            if (!pendingArr.includes(id)) pendingArr.push(id);
          }
          await prisma.user.update({
            where: { id: req.userId },
            data: { pendingAchievementId: pendingArr.join(",") }
          });

          logger.info(`[Achievements] Queued ${result.unlocked.length} new achievements for user ${req.userId}`);
      }

      // Return empty array to completely suppress instant overlays
      res.json({ unlocked: [] });
    } catch (err: any) {
      logger.error("[Achievements] Check error:", err.message);
      fail500(req, res, err, { unlocked: [] });
    }
  });

  app.post("/api/achievements/track", async (req, res) => {
    try {
      if (!req.userId) return res.json({ success: false });
      const { type, payload } = req.body;
      let updateData: any = {};

      if (type === "constructor") updateData.constructorCount = { increment: 1 };
      else if (type === "scan") updateData.scanCount = { increment: 1 };
      else if (type === "chapter_read") updateData.chapterReadCount = { increment: 1 };
      else if (type === "share") updateData.shareCount = { increment: 1 };
      else if (type === "feedback") updateData.feedbackCount = { increment: 1 };
      else if (type === "composition_view") {
        const u = await prisma.user.findUnique({ where: { id: req.userId }});
        if (u) {
           let views = [];
           try { views = JSON.parse(u.compositionViewLog || "[]"); } catch {}
           views.push(payload?.dayIndex || u.currentDayIndex);
           updateData.compositionViewLog = JSON.stringify(views);
        }
      }
      else if (type === "anna_dislike") updateData.annaDislikeCount = { increment: 1 };
      else if (type === "anna_chat") updateData.annaChatCount = { increment: 1 };
      else if (type === "time_capsule_saved") { /* handled via state updated later, or we can just track */ }
      else if (type === "mixer_spin") {
        await achievementService.check({ action: "mixer:spin", payload: payload || {} });
        return res.json({ success: true });
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: req.userId },
          data: updateData
        });
        const updatedUser = await prisma.user.findUnique({ where: { id: req.userId } });
        await achievementService.check({ action: "tracking:updated", payload: { type, payload, _dbUserFull: updatedUser } });
      }
      res.json({ success: true });
    } catch (e) {
      res.json({ success: false });
    }
  });


  // ── Achievements Debug API ──
  app.post("/api/achievements/debug-action", async (req, res) => {
    try {
      if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
      const { action, payload } = req.body;

      if (action === "reset_all") {
        await prisma.userAchievement.deleteMany({ where: { userId: req.userId } });
        await prisma.user.update({
          where: { id: req.userId },
          data: { lastAchievementUnlockedAt: null, pendingAchievementId: null }
        });
        logger.info(`[Debug] Reset all achievements for user ${req.userId}`);
        return res.json({ success: true });
      }

      if (action === "set_day") {
        const day = parseInt(payload.day, 10);
        if (isNaN(day)) return res.status(400).json({ error: "Invalid day" });
        await prisma.user.update({
          where: { id: req.userId },
          data: { currentDayIndex: day }
        });
        logger.info(`[Debug] Set currentDayIndex to ${day} for user ${req.userId}`);
        return res.json({ success: true });
      }

      if (action === "force_queue") {
        const { achievementId } = payload;
        const user = await prisma.user.findUnique({ where: { id: req.userId } });
        if (!user) return res.status(404).json({ error: "User not found" });

        let pendingStr = user.pendingAchievementId || "";
        const pendingArr = pendingStr ? pendingStr.split(",") : [];
        if (!pendingArr.includes(achievementId)) pendingArr.push(achievementId);

        await prisma.user.update({
          where: { id: req.userId },
          data: {
            pendingAchievementId: pendingArr.join(","),
            lastAchievementUnlockedAt: null
          }
        });
        logger.info(`[Debug] Force queued ${achievementId} for user ${req.userId}`);
        return res.json({ success: true });
      }

      res.status(400).json({ error: "Unknown action" });
    } catch (e: any) {
      logger.error("[Debug] Error:", e.message);
      fail500(req, res, e);
    }
  });

  // ── Achievement Check Pending Endpoint ──
  app.get("/api/achievements/check-pending", async (req, res) => {
    try {
      if (!req.userId) return res.json({ id: null });

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user || !user.pendingAchievementId) {
        return res.json({ id: null });
      }

      // 2-hour throttling rule
      if (user.lastAchievementUnlockedAt) {
        const diffMs = new Date().getTime() - user.lastAchievementUnlockedAt.getTime();
        const twoHoursMs = 2 * 60 * 60 * 1000;
        if (diffMs < twoHoursMs) {
          logger.info(`[Achievements] Throttled showing pending achievement for user ${req.userId}. (Time passed: ${Math.floor(diffMs/1000/60)} min / 120 min)`);
          return res.json({ id: null });
        }
      }

      // Pop the first achievement from the queue
      const pendingArr = user.pendingAchievementId.split(",");
      const idToShow = pendingArr[0];

      res.json({ id: idToShow });
    } catch (err: any) {
      logger.error("[Achievements] Check pending error:", err.message);
      res.status(500).json({ id: null });
    }
  });

  app.post("/api/achievements/mark-shown", async (req, res) => {
    try {
      if (!req.userId) return res.json({ success: false });
      const { id } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (user && user.pendingAchievementId) {
        const pendingArr = user.pendingAchievementId.split(",");
        const updatedArr = pendingArr.filter(pid => pid !== id);

        await prisma.user.update({
          where: { id: req.userId },
          data: {
            pendingAchievementId: updatedArr.length > 0 ? updatedArr.join(",") : null,
            lastAchievementUnlockedAt: new Date()
          }
        });
        return res.json({ success: true });
      }
      res.json({ success: false });
    } catch (err: any) {
      logger.error("[Achievements] Mark shown error:", err.message);
      res.status(500).json({ success: false });
    }
  });

  // ── Club: Telegram Token Management ──

  // POST /api/club/generate-token — stub (Club будет позже)
  app.post("/api/club/generate-token", async (_req, res) => {
    res.json({ deepLink: null, message: "Клуб скоро будет доступен" });
  });

  // GET /api/club/status — stub
  app.get("/api/club/status", async (_req, res) => {
    res.json({ linked: false, message: "Клуб скоро будет доступен" });
  });

  // POST /api/club/unlink — stub
  app.post("/api/club/unlink", async (_req, res) => {
    res.json({ ok: true, message: "Клуб скоро будет доступен" });
  });

  // Vite development middleware vs Static Production files
  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, host: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Fallback for React Router in development
    app.use("*", async (req, res, next) => {
      if (req.originalUrl.startsWith("/api")) return next();
      if (req.method !== "GET" || !req.headers.accept?.includes("text/html")) return next();

      try {
        const url = req.originalUrl;
        let template = await fs.readFile(path.join(projectRoot, "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(projectRoot, "dist");
    // Имена в /assets содержат хеш содержимого (замер m-114: 1466 файлов из 1466 с хешем), поэтому годится
    // immutable: релиз меняет имя, и устаревший кэш не мешает. Остальной статик отдаётся как раньше.
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), { maxAge: "365d", immutable: true })
    );
    app.use(
      express.static(distPath, {
        setHeaders: (res, filePath) => {
          // index.html — единственный файл без хеша в имени: его надо перечитывать каждый заход.
          if (path.basename(filePath) === "index.html") res.setHeader("Cache-Control", "no-cache");
        },
      })
    );
    app.get("*", (req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    const status = err.status || 500;
    if (status < 500) {
      // Сюда попадают только ошибки фреймворка (body-parser, stat из sendFile): маршруты
      // отдают свои 4xx напрямую через res.json({ error }). Их message — текст Node с
      // абсолютными путями контейнера, наружу его отдавать нельзя.
      const correlationId = crypto.randomUUID().slice(0, 8);
      const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
      logger.error(`[4xx] cid=${correlationId} ${status} ${req?.method ?? "-"} ${req?.originalUrl ?? "-"}: ${detail}`);
      return res.status(status).json({
        error: status === 404 ? "Не найдено" : "Запрос обработан некорректно",
        correlationId,
      });
    }
    fail500(req, res, err);
  });

  return app;
}

function startAccessExpiryWatcher() {
  const CHECK_INTERVAL_MS = 60 * 60 * 1000;
  const WARN_DAYS = 3;

  async function check() {
    try {
      const bot = getBot();
      if (!bot) return;

      const now = new Date();
      const warnThreshold = new Date(now.getTime() + WARN_DAYS * 24 * 60 * 60 * 1000);

      const expiringUsers = await prisma.user.findMany({
        where: {
          telegramId: { not: null },
          accessExpiresAt: { not: null, lte: warnThreshold },
        },
      });

      for (const user of expiringUsers) {
        if (!user.telegramId || !user.accessExpiresAt) continue;

        const daysLeft = Math.ceil((user.accessExpiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        let message: string;

        if (daysLeft <= 0) {
          message = "⏳ Срок доступа к приложению истёк. Для продления обратитесь в поддержку.";
        } else if (daysLeft === 1) {
          message = "⚠️ Завтра истекает срок доступа к приложению. Продлите заранее, чтобы не прерывать курс!";
        } else {
          message = `⏰ Через ${daysLeft} дн. истекает срок доступа к приложению. Продлите заранее, чтобы не прерывать курс!`;
        }

        await bot.telegram.sendMessage(user.telegramId, message).catch((err) => {
          logger.error(`[AccessExpiry] Failed to notify telegramId=${user.telegramId}`, err);
        });
      }
    } catch (err) {
      logger.error("[AccessExpiry] Check error", err);
    }
  }

  check();
  setInterval(check, CHECK_INTERVAL_MS);
  logger.info(`[AccessExpiry] Watcher started (interval=${CHECK_INTERVAL_MS}ms, warn=${WARN_DAYS} days)`);
}

const app = await startServer();
if (!process.env.VERCEL) {
  if (IS_PRODUCTION && (await fs.access(envPath).then(() => true).catch(() => false))) {
    logger.error("[BOOT] в production в рабочей директории лежит .env — режим работы нельзя отличить от дев-режима, сервер не поднимается.");
    process.exit(1);
  }

  if (IS_PRODUCTION && !process.env.TELEGRAM_BOT_TOKEN) {
    logger.error("[BOOT] TELEGRAM_BOT_TOKEN не задан — проверить подпись initData нечем, сервер не поднимается.");
    process.exit(1);
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  startAccessExpiryWatcher();

  // Контейнеру Kubernetes перед удалением пода приходит SIGTERM, и через 30 с
  // (terminationGracePeriodSeconds) — SIGKILL. Без обработчика соединения обрываются
  // на середине; закрываем listener и даём долететь текущим запросам, 8 с с запасом
  // внутрь grace-периода.
  for (const sig of ["SIGTERM", "SIGINT"] as const) {
    process.on(sig, () => {
      logger.info(`[shutdown] ${sig}: новых не принимаем, долеиваем до 8 с`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 8000).unref();
    });
  }
}
export default app;
