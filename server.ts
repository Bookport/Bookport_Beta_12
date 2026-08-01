import express from "express";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";
import { Type } from "@google/genai";
import dotenv from "dotenv";
import { findForbiddenInText } from "./src/data/wfpb_forbidden_ingredients";
import { normalize, candidateKeys, resolveAgainstIndex } from "./src/utils/ingredientMappingCore";
import { analyzeFoodImage, transcribeAudio, generateAnnaAudio } from "./src/services/dashscopeAdapter";
import { ANNA_REACTION_MATRIX } from "./src/prompts/annaReactionMatrix";
import { callLLM } from "./src/services/llmAdapter";
import { PromptCompiler } from "./src/services/promptCompiler";
import { safeParseJSON } from "./src/utils/safeParseJSON";
import { prisma } from "./src/prisma";
import { logger } from "./src/utils/logger";
import { achievementService } from "./src/services/AchievementService";
import { ANNA_TOOL_DEFINITIONS, executeToolCall } from "./src/services/annaTools";
import { setupTelegramWebhook, getBotUsername, getBot } from "./src/services/telegramBot";
import { extractTelegramUser } from "./src/utils/telegramInitData";

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
dotenv.config({ override: true, path: envPath });

const PORT = parseInt(process.env.PORT || "3001", 10);

const USDA_API_KEY = "ywYviAkfdnK8u2Sn19fMG7Kvmje8y2Bd66Hi2hlN";

// Robust wrapper with automatic model cascade fallback
async function generateContentWithFallback(payload: any) {
  const models = ["qwen-plus", "qwen-turbo"];
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

  if (/вода|сон|давлен|пульс|метрик|активн|движени|замер|самочувств/i.test(msg)) {
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

// Programmatic real local USDA database fallback if API endpoints time out/fail
function getUsdaFallbackData(ingredients: any[]) {
  let totalCals = 0;
  let totalProt = 0;
  let totalFat = 0;
  let totalCarb = 0;
  let totalFiber = 0;
  
  let iron = 0;
  let zinc = 0;
  let magnesium = 0;
  let iodine = 0;
  let selenium = 0;
  let vitC = 0;
  let vitB9 = 0;
  let lysine = 0;
  let methionine = 0;

  let hasProhibited = false;

  ingredients.forEach(ing => {
    const parsedW = parseFloat(String(ing.weight).replace(/[^\d.,]/g, '').replace(',', '.'));
    const w = isNaN(parsedW) ? 100 : parsedW;
    const factor = w / 100;
    const nameLower = (ing.fullName || ing.shortName || "").toLowerCase();

    // Check if status is error or has non-WFPB flags (salt, animal products, butter, etc)
    const isBean = nameLower.includes("фасоль") || nameLower.includes("фасол");
    const violatesWfpb = ing.status === "error" ||
      (!isBean && nameLower.includes("соль")) ||
      (!isBean && nameLower.includes("мясо")) ||
      (!isBean && nameLower.includes("масло")) ||
      (!isBean && nameLower.includes("молоко")) ||
      (!isBean && nameLower.includes("рыб")) ||
      (!isBean && nameLower.includes("яйц"));

    if (violatesWfpb) {
      hasProhibited = true;
    }

    if (nameLower.includes("киноа")) {
      totalCals += 120 * factor;
      totalProt += 4.4 * factor;
      totalFat += 1.9 * factor;
      totalCarb += 21.3 * factor;
      totalFiber += 2.8 * factor;
      iron += 1.5 * factor;
      magnesium += 64 * factor;
      zinc += 1.1 * factor;
      vitB9 += 42 * factor;
      lysine += 0.25 * factor;
      methionine += 0.09 * factor;
    } else if (nameLower.includes("нут")) {
      totalCals += 164 * factor;
      totalProt += 8.9 * factor;
      totalFat += 2.6 * factor;
      totalCarb += 27.4 * factor;
      totalFiber += 7.6 * factor;
      iron += 2.9 * factor;
      magnesium += 48 * factor;
      zinc += 1.5 * factor;
      vitB9 += 172 * factor;
      lysine += 0.58 * factor;
      methionine += 0.13 * factor;
    } else if (nameLower.includes("кунжут")) {
      totalCals += 573 * factor;
      totalProt += 17.7 * factor;
      totalFat += 49.7 * factor;
      totalCarb += 23.4 * factor;
      totalFiber += 11.8 * factor;
      iron += 14.6 * factor;
      magnesium += 351 * factor;
      zinc += 7.8 * factor;
      vitB9 += 97 * factor;
      lysine += 0.56 * factor;
      methionine += 0.52 * factor;
    } else if (nameLower.includes("шпинат")) {
      totalCals += 23 * factor;
      totalProt += 2.9 * factor;
      totalFat += 0.4 * factor;
      totalCarb += 3.6 * factor;
      totalFiber += 2.2 * factor;
      iron += 2.7 * factor;
      magnesium += 79 * factor;
      zinc += 0.5 * factor;
      vitC += 28 * factor;
      vitB9 += 194 * factor;
      lysine += 0.17 * factor;
      methionine += 0.04 * factor;
    } else if (nameLower.includes("огур")) {
      totalCals += 15 * factor;
      totalProt += 0.7 * factor;
      totalFat += 0.1 * factor;
      totalCarb += 3.6 * factor;
      totalFiber += 0.5 * factor;
      iron += 0.3 * factor;
      magnesium += 13 * factor;
      vitC += 2.8 * factor;
      vitB9 += 7 * factor;
    } else {
      // General vegetable or bean
      totalCals += 95 * factor;
      totalProt += 3 * factor;
      totalFat += 0.5 * factor;
      totalCarb += 18 * factor;
      totalFiber += 3.2 * factor;
      iron += 1.2 * factor;
      magnesium += 32 * factor;
      zinc += 0.6 * factor;
      vitC += 6 * factor;
      vitB9 += 25 * factor;
    }
  });

  const mainShortNames = ingredients.map(i => i.shortName || i.fullName).slice(0, 2);
  const derivedDishName = mainShortNames.length > 0 
    ? `Тёплый боул с ${mainShortNames.map(s => s.toLowerCase()).join(" и ")}` 
    : "Тёплый боул с киноа и нутом";

  return {
    dishName: derivedDishName,
    nutrients: {
      calories: { value: Math.round(totalCals) || 436, unit: "ккал" },
      protein: { value: parseFloat(totalProt.toFixed(1)) || 17.2, unit: "г" },
      fats: { value: parseFloat(totalFat.toFixed(1)) || 13.6, unit: "г" },
      carbs: { value: parseFloat(totalCarb.toFixed(1)) || 56.3, unit: "г" },
      fiber: { value: parseFloat(totalFiber.toFixed(1)) || 11.4, unit: "г" },
      omegaRatio: { value: "4:1", unit: "" }
    },
    micronutrients: {
      iron: { value: parseFloat(iron.toFixed(1)) || 3.2, unit: "мг" },
      zinc: { value: parseFloat(zinc.toFixed(1)) || 1.1, unit: "мг" },
      magnesium: { value: Math.round(magnesium) || 98, unit: "мг" },
      iodine: { value: hasProhibited ? 0 : 4, unit: "мкг" },
      selenium: { value: hasProhibited ? 2 : 11, unit: "мкг" },
      vitaminC: { value: Math.round(vitC) || 28, unit: "мг" },
      vitaminB9: { value: Math.round(vitB9) || 75, unit: "мкг" },
      lysine: { value: parseFloat(lysine.toFixed(1)) || 0.6, unit: "г" },
      methionine: { value: parseFloat(methionine.toFixed(1)) || 0.2, unit: "г" }
    },
    insights: {
      strengths: {
        title: "Сильные стороны блюда",
        text: "Высокая концентрация растительной клетчатки, комплексных медленных углеводов, аминокислот лизина и цельного неденатурированного белка."
      },
      improvements: {
        title: "Что можно улучшить",
        text: "Вы можете обогатить блюдо семенами чиа или молотым льном, чтобы оптимизировать коэффициент незаменимых Омега жирных кислот."
      },
      compliance: {
        title: "Соответствие растительному рациону",
        text: hasProhibited 
          ? "Внимание! Вы подтвердили ингредиенты, нарушающие философию WFPB (продукты животного происхождения или добавленная соль). Рекомендуем исключить их для идеального здоровья."
          : "Идеально! Блюдо на 100% соответствует стандартам цельного растительного WFPB-рациона без капли рафинированных масел или соли."
      }
    }
  };
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
  if (!omega3 || omega3 <= 0) return "—";
  const ratio = omega6 / omega3;
  return `${ratio.toFixed(1)}:1`;
}

function isEmptyNutrientObj(obj: Record<string, number>): boolean {
  return NUTRIENT_FIELDS.every(f => !obj[f]);
}

async function computeNutrientsFromDB(
  ingredients: { fullName?: string; shortName?: string; weight?: number; dbKey?: string; fdcId?: number }[]
): Promise<Record<string, number>> {
  const total: Record<string, number> = {};
  NUTRIENT_FIELDS.forEach(f => (total[f] = 0));

  const items = await prisma.foodItem.findMany();

  // Кэш БД в нотации ingredientMappingCore (normalize/candidateKeys) — те же
  // правила нечёткого поиска, что и на фронтенде (картинки, статусы).
  const dbByKey = new Map<string, (typeof items)[number]>();
  const dbKeys = new Set<string>();
  const fdcById = new Map<number, (typeof items)[number]>();

  // 1) Канонические ключи (nameRu/nameEn) — приоритет точных имён.
  for (const item of items) {
    const canonical = normalize(item.nameRu);
    if (canonical && !dbKeys.has(canonical)) {
      dbKeys.add(canonical);
      dbByKey.set(canonical, item);
    }
    if (item.nameEn) {
      const en = normalize(item.nameEn);
      if (en && !dbKeys.has(en)) {
        dbKeys.add(en);
        dbByKey.set(en, item);
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
      if (c && !dbKeys.has(c)) {
        dbKeys.add(c);
        dbByKey.set(c, item);
      }
    }
  }

  // Приоритет: точный dbKey/fdcId от фронтенда → нечёткий маппер по строке Qwen.
  const resolveItem = (rawName: string, dbKey?: string, fdcId?: number) => {
    if (dbKey) {
      const exact = dbByKey.get(normalize(dbKey));
      if (exact) return exact;
    }
    if (fdcId != null) {
      const byFdc = fdcById.get(fdcId);
      if (byFdc) return byFdc;
    }
    const key = resolveAgainstIndex(rawName, dbKeys);
    return key ? dbByKey.get(key) || null : null;
  };

  for (const ing of ingredients) {
    const nameToLookup = (ing.fullName || ing.shortName || "").trim();
    if (!nameToLookup) continue;

    const parsedWeight = parseFloat(String(ing.weight).replace(/[^\d.,]/g, '').replace(',', '.'));
    const weight = isNaN(parsedWeight) ? 100 : parsedWeight;
    const factor = weight / 100;

    const foodItem = resolveItem(nameToLookup, ing.dbKey, ing.fdcId);

    if (!foodItem) {
      console.log(`[PIPELINE TRACE 2.1] Nutrition lookup MISS for "${nameToLookup}"${ing.dbKey ? ` (dbKey="${ing.dbKey}")` : ""}${ing.fdcId != null ? ` (fdcId=${ing.fdcId})` : ""}`);
      continue;
    }
    console.log(`[PIPELINE TRACE 2.1] Nutrition lookup HIT "${nameToLookup}"${ing.dbKey ? ` (dbKey="${ing.dbKey}")` : ""}${ing.fdcId != null ? ` (fdcId=${ing.fdcId})` : ""} -> "${foodItem.nameRu}" (fdcId=${foodItem.fdcId}) weight=${weight}g`);

    for (const field of NUTRIENT_FIELDS) {
      const val = (foodItem as any)[field];
      if (typeof val === "number" && val > 0) {
        total[field] += val * factor;
      }
    }
  }

  return total;
}

// ── USDA FoodData Central Integration ──

async function parseAndTranslateIngredients(
  ingredients: { fullName?: string; shortName?: string; weight?: number }[]
): Promise<{ foodName: string; weightInGrams: number }[]> {
  const russianText = ingredients
    .map(ing => `${ing.fullName || ing.shortName || "ингредиент"} ${ing.weight || 100}г`)
    .join(", ");

  const translationPrompt = `You are a strict USDA FoodData Central data mapper. Translate the Russian ingredients into the most generic, raw base English names suitable for the USDA SR Legacy database.
RULES:
- Always append 'raw' if the item is a fresh vegetable, meat, or fish.
- Strip cooking/packaging terms like 'fillet', 'bulb', 'slice', 'steak', 'cherry'.
- Examples: 'Томаты черри' -> 'tomatoes raw', 'Филе лосося' -> 'salmon raw', 'Чеснок' -> 'garlic raw', 'Оливковое масло' -> 'olive oil'.
Output ONLY a raw JSON array of objects: [{foodName: string, weightInGrams: number}].

Now process this: "${russianText}"`;

  try {
      const result = await generateContentWithFallback({
        contents: { parts: [{ text: translationPrompt }] },
        config: { responseMimeType: "text/plain", temperature: 0 }
      });
      const raw = result.text?.trim() || "";
      const { data: parsed, ok } = safeParseJSON(raw, null);
      if (ok && Array.isArray(parsed) && parsed.length > 0) return parsed;

      // Retry once with strict instruction
      if (!ok) {
        const strictPrompt = translationPrompt + "\n\nВНИМАНИЕ: твой предыдущий ответ был невалидным. Сгенерируй ответ заново. Верни СТРОГО валидный JSON без markdown, текста и комментариев. Только JSON.";
        const retryResult = await generateContentWithFallback({
          contents: { parts: [{ text: strictPrompt }] },
          config: { responseMimeType: "text/plain", temperature: 0 }
        });
        const retryRaw = retryResult.text?.trim() || "";
        const { data: retryParsed, ok: retryOk } = safeParseJSON(retryRaw, null);
        if (retryOk && Array.isArray(retryParsed) && retryParsed.length > 0) return retryParsed;
      }
    } catch (e) {
      console.warn("[USDA] Translation failed:", e);
    }

  return ingredients.map(ing => {
    const name = ing.shortName || ing.fullName || "ingredient";
    return {
      foodName: name,
      weightInGrams: ing.weight || 100
    };
  });
}

async function fetchUsdaNutrition(ingredients: { foodName: string; weightInGrams: number }[]): Promise<{
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
} | null> {
  try {
    const USDA_TIMEOUT_MS = 10000;
    const skipWords = ["blend", "substitute", "vegetarian", "imitation", "fabricated", "formulated", "frankfurter", "lunchmeat", "powder", "leaves", "flakes", "canned", "prepared"];

    const results = await Promise.all(
      ingredients.map(async (ingr) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), USDA_TIMEOUT_MS);
        try {
          const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${encodeURIComponent(ingr.foodName)}&pageSize=3&dataType=Foundation,SR%20Legacy&requireAllWords=true`;
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) {
            console.warn(`[USDA] API returned status ${response.status} for query: ${ingr.foodName}`);
            return null;
          }
          const data = await response.json();
          const foods = data.foods || [];
          const food = foods.find((f: any) =>
            f.foodNutrients &&
            !skipWords.some(w => f.description?.toLowerCase().includes(w))
          ) || foods[0];
          if (!food || !Array.isArray(food.foodNutrients)) {
            console.warn(`[USDA] No food or nutrients found for query: ${ingr.foodName}`);
            return null;
          }

          const nutrientsList = food.foodNutrients;
          const ratio = ingr.weightInGrams / 100;

          const findNutrientValue = (nameSubstring: string): number => {
            const nut = nutrientsList.find((n: any) =>
              n.nutrientName && n.nutrientName.toLowerCase().includes(nameSubstring.toLowerCase())
            );
            return nut ? (nut.value || 0) : 0;
          };

          const findEnergyInKcal = (): number => {
            const nut = nutrientsList.find((n: any) =>
              n.nutrientName && n.nutrientName.toLowerCase().includes("energy")
            );
            if (!nut) return 0;
            const unit = (nut.unitName || "").toLowerCase();
            const val = nut.value || 0;
            return unit === "kj" ? Math.round(val / 4.184) : val;
          };

          const baseCals = findEnergyInKcal();
          console.log("[PIPELINE TRACE 3] USDA Queried:", ingr.foodName, "→ Matched FDC ID:", food.fdcId, food.description, "Base cals (per 100g):", baseCals);

          return {
            calories: baseCals * ratio,
            protein: findNutrientValue("Protein") * ratio,
            fat: (findNutrientValue("Total lipid (fat)") || findNutrientValue("Total lipid")) * ratio,
            carbs: findNutrientValue("Carbohydrate") * ratio,
            fiber: findNutrientValue("Fiber") * ratio,
          };
        } catch (err: any) {
          if (err?.name === "AbortError") {
            console.warn(`[USDA] Timeout for query: ${ingr.foodName}`);
          } else {
            console.warn(`[USDA] Error for query: ${ingr.foodName}:`, err?.message);
          }
          return null;
        } finally {
          clearTimeout(timer);
        }
      })
    );

    const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
    if (valid.length === 0) return null;

    return {
      calories: Math.round(valid.reduce((s, r) => s + r.calories, 0)),
      protein: Math.round(valid.reduce((s, r) => s + r.protein, 0) * 10) / 10,
      fat: Math.round(valid.reduce((s, r) => s + r.fat, 0) * 10) / 10,
      carbs: Math.round(valid.reduce((s, r) => s + r.carbs, 0) * 10) / 10,
      fiber: Math.round(valid.reduce((s, r) => s + r.fiber, 0) * 10) / 10,
    };
  } catch (error) {
    console.warn("[USDA] fetchUsdaNutrition error:", error);
    return null;
  }
}

async function startServer() {
  process.on("uncaughtException", (err) => {
    console.error("[UNCAUGHT]", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[UNHANDLED]", reason);
  });

  const app = express();

  // Increase payload size limit to receive captured camera photo bytes
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ── Dev Auth Bypass ──
  if (process.env.NODE_ENV === 'development') {
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
        user = await prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            telegramId,
            telegramName: tgUser.first_name || null,
            telegramUsername: tgUser.username || null,
          },
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

  // ── Telegram Webhook ──
  setupTelegramWebhook(app);

  // ── Purchase Token API (для лендинга WordPress) ──
  app.post("/api/purchase/register", async (req, res) => {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.PURCHASE_API_KEY) {
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
      res.status(500).json({ error: err.message });
    }
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

      let systemPrompt = promptCompiler.compile({
        screenId: screenContextDetails?.screen_id || screenContext,
        userMessage: message,
        userName: userName || screenContextDetails?.userName,
        screenContextDetails,
        bookRecipesDataContext,
        isVoiceChat,
      }) + (annaToolGuidance ? `\n\n${annaToolGuidance}` : "");

      if (req.userId && dayIndex) {
        const shouldInjectRitual = /утро|вчера|ритуал|итог|проснул|спал|привет|добр|чувству|настро/i.test(message);
        if (shouldInjectRitual) {
          try {
            const ritual = await prisma.eveningRitual.findUnique({
              where: { userId_dayIndex: { userId: req.userId, dayIndex } }
            });
            if (ritual) {
              systemPrompt += `\n\n[Системные данные: Пользователь завершил вечерний ритуал (День ${dayIndex}). Его ответы.\nТело: ${ritual.answerBody}\nПсихология: ${ritual.answerPsycho}\nИнсайт: ${ritual.answerUnexpected}\nИспользуй эти данные для персонализации ответов].`;

            }
          } catch (e) {
            console.error("Error loading ritual for Anna:", e);
          }
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

      // ── Tool calling loop ──
      const MAX_TOOL_ROUNDS = 3;
      let finalReply = "";

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
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

        // Record assistant message with tool_calls
        messages.push({
          role: "assistant",
          content: result.text || "",
          tool_calls: toolCalls,
        });

        // Execute each tool and feed result back
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

      if (!finalReply) {
        finalReply = "Я сейчас не могу найти эту информацию. Попробуй спросить иначе!";
      }

      // Save chat to database
      if (req.userId && message) {
        prisma.annaChat.create({
          data: {
            userId: req.userId,
            message,
            reply: finalReply || null,
            screen: screenContext || null,
            dayIndex: dayIndex ?? null,
          },
        }).catch((err) => console.warn("[AnnaChat] save failed:", err.message));
      }

      if (finalReply) {
        annaCache.set(cacheKey, { reply: finalReply, ts: Date.now() });
      }

      return res.json({ reply: finalReply });
    } catch (err: any) {
      return res.json({ reply: "Привет! Всё отлично! Я всегда рядом, чтобы поддержать твой путь к здоровью и чистой энергии всей душой! 🌿" });
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
    const { ingredients, defaultDishName } = req.body || {};
    console.log("[PIPELINE TRACE 1] Raw Input from Client:", JSON.stringify(ingredients?.map((i: any) => ({ name: i.fullName || i.shortName, weight: i.weight }))), "HasImage: false");
    try {
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: "No ingredients received" });
      }

      // ── Step A: Compute nutrients from local FoodItem DB ──
      const nutrientsFlat = await computeNutrientsFromDB(ingredients);

      // ── Step B: LLM generates ONLY dish name + insights (no nutrient guessing) ──
      const ingredientsDescription = ingredients
        .map(ing => `- ${ing.fullName || ing.shortName}: ${ing.weight || 100}g`)
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

      let forbiddenWarning = "";
      if (forbiddenLines.length > 0) {
        forbiddenWarning = `⚠️ ВНИМАНИЕ: Среди ингредиентов обнаружены продукты, НЕ соответствующие WFPB-стандарту! Предупреди пользователя мягко, но прямо, и дай рекомендации по замене:\n${forbiddenLines.join("\n")}\n\nПожалуйста, отрази это в блоке "compliance" в ответе.\n\n`;
      }

      const promptText = `Ты — Анна, профессиональный нутрициолог для WFPB-приложения «Всё дело в еде!».

${forbiddenWarning}Пользователь подтвердил ингредиенты:
${ingredientsDescription}

Проанализируй блюдо и верни JSON.
Правила для блока insights:
1. КАЖДЫЙ текст (strengths, improvements, compliance) должен быть ОЧЕНЬ коротким: строго 1-2 предложения, максимум 20 слов на пункт. Пиши самую суть, без воды.
2. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО писать в тексте любые цифры (граммы, миллиграммы, проценты), касающиеся витаминов, минералов или нутриентов. Используй только качественные оценки (например, "богато витамином С", "высокое содержание белка").

Формат JSON:
{"dishName": "string", "insights": {"strengths":{"title":"...","text":"..."},"improvements":{"title":"...","text":"..."},"compliance":{"title":"...","text":"..."}}}

Важно: только JSON, без markdown, всё на русском.`;

      let llmData: any = { dishName: "", insights: null };
      try {
        const llmResponse = await generateContentWithFallback({
          contents: promptText,
          config: {
            responseMimeType: "application/json",
            temperature: 0,
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
        const { data: parsed } = safeParseJSON(llmText, {});
        llmData = parsed;
      } catch (e) {
        console.error("[LLM] Dish analysis failed:", e);
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

      const resultData = {
        dishName: llmData?.dishName || defaultDishName || "Цельное растительное блюдо",
        nutrients,
        micronutrients,
        nutrientsFlat: nutrientsFlatResponse,
        insights: llmData?.insights || {
          strengths: { title: "Сильные стороны блюда", text: "Блюдо на основе цельных растительных ингредиентов." },
          improvements: { title: "Что можно улучшить", text: "Добавьте больше зелени и семян для баланса нутриентов." },
          compliance: { title: "Соответствие растительному рациону", text: forbiddenLines.length > 0 ? "Обнаружены несоответствия WFPB." : "Блюдо соответствует WFPB-рациону." }
        },
      };

      console.log("[PIPELINE TRACE 4] Response:", JSON.stringify({ dishName: resultData.dishName, nutrientCount: Object.keys(nutrientsFlat).length, insightCount: resultData.insights ? Object.keys(resultData.insights).length : 0 }, null, 2));
      return res.json({ result: resultData });
    } catch (error: any) {
      console.log("Local program nutrition calculation fallback triggered:", error?.message || error);
      const fallbackResult = getUsdaFallbackData(ingredients);
      return res.json({ result: fallbackResult });
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
        text: `Analyze food photo. List EVERY visible ingredient — never skip, hide, or rename. Break dishes into raw components (e.g. 'салат' → 'помидор, огурец, лук'). Use singular lowercase Russian nouns.

WFPB status rules:
- animal products (meat, fish, dairy, eggs, honey, gelatin) → "error"
- added salt, soy sauce, bouillon → "error"
- extracted oils → "error"
- plant foods → "green"
- non-food objects → "blue" (keys, phone, glasses, etc.)

Scenarios:
1. Food only → list all ingredients with green/error
2. Mixed food + non-food → list food only, green/error
3. Non-food only → list all as "blue"

Return JSON: {"dishName":"string (Russian)","ingredients":[{"id":"snake_case_slug","fullName":"descriptive Russian","shortName":"short Russian","status":"green|error|blue","weight":number,"reason":"error reason or humorous comment or empty"}]}

Only valid JSON, no markdown.`,
      };

      // Primary: DashScope (Qwen VL), fallback: Yandex/Gemini
      let textOutput = "";
      try {
        textOutput = await analyzeFoodImage(base64Clean, textPart.text);
      } catch (dashErr) {
        console.warn("[analyze-image] DashScope failed, falling back:", (dashErr as any)?.message || dashErr);
        const fallbackResponse = await generateContentWithFallback({
          contents: { parts: [imagePart, textPart] },
          config: { responseMimeType: "application/json" }
        });
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

      // Post-validation: force "error" status for any ingredient matching forbidden patterns.
      // Авторитетный статус из БД (точное совпадение по nameRu/nameEn) безусловно
      // перебивает текстовые эвристики.
      if (resultData?.ingredients && Array.isArray(resultData.ingredients)) {
        for (const ing of resultData.ingredients) {
          const nameToCheck = (ing.shortName || ing.fullName || "").toLowerCase().trim();

          const dbItem = nameToCheck
            ? await prisma.foodItem.findFirst({
                where: {
                  OR: [
                    { nameRu: { equals: nameToCheck, mode: "insensitive" } },
                    { nameEn: { equals: nameToCheck, mode: "insensitive" } },
                  ],
                },
              })
            : null;

          if (dbItem) {
            if (dbItem.wfpbStatus === "forbidden") {
              ing.status = "error";
              ing.reason = "Ингредиент не соответствует WFPB (по базе продуктов).";
            }
            continue;
          }

          const forbiddenMatches = findForbiddenInText(nameToCheck);
          if (forbiddenMatches.length > 0) {
            ing.status = "error";
            ing.reason = forbiddenMatches.map(m => m.reason).join("; ");
          }
        }
      }
      
      return res.json({ result: resultData });
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
      const { dishName, ingredients } = req.body;
      const list = Array.isArray(ingredients) ? ingredients : [];
      const forcedList = list.filter((i: any) => i.manuallyAllowed && i.status === "red");
      const normalList = list.filter((i: any) => !(i.manuallyAllowed && i.status === "red"));

      const forcedStr = forcedList.length > 0
        ? `\n\nВредные ингредиенты, которые пользователь проигнорировал и принудительно добавил в разбор: ${forcedList.map((i: any) => `«${i.name}» (${i.weight})`).join(", ")}. Это сознательное нарушение правил WFPB, игнорирование предупреждений.`
        : "";

      const ingredientStr = normalList
        .map((i: any) => `- ${i.name || i.shortName || i.fullName || "?"} (${i.weight || "?"} г, статус: ${i.status || "?"})`)
        .join("\n");

      const prompt = `${ANNA_REACTION_MATRIX}

Analyze this dish:
Dish name: "${dishName || "блюдо"}"
Ingredients:
${ingredientStr || "—"}${forcedStr}

Generate a short, sarcastic Anna comment (1 paragraph, 2-4 sentences in Russian). Use the tone logic based on the number of violations (status: "red" = violation, "yellow" = caution, "green" = clean). Pay special attention to forced ingredients — they indicate the user knowingly ignored WFPB rules.`;

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
      return res.status(500).json({ error: err.message });
    }
  });

  // ── Init: GET /api/user/init ──
  // Auto-advances currentDayIndex based on calendar date, called once on app mount
  app.get("/api/user/init", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const user = await prisma.user.findUnique({ where: { id: req.userId } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let courseStartDate = user.courseStartDate;
      let currentDayIndex = user.currentDayIndex || 1;
      let lastActiveDate = user.lastActiveDate;

      if (!courseStartDate) {
        courseStartDate = today;
        currentDayIndex = 1;
        lastActiveDate = today;
      } else if (lastActiveDate) {
        const lastActive = new Date(lastActiveDate);
        lastActive.setHours(0, 0, 0, 0);
        if (today.getTime() > lastActive.getTime()) {
          currentDayIndex = Math.min((currentDayIndex || 1) + 1, 28);
          lastActiveDate = today;
        }
      }

      await prisma.user.update({
        where: { id: req.userId },
        data: { courseStartDate, currentDayIndex, lastActiveDate },
      });

      res.json({
        currentDayIndex,
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
      res.status(500).json({ error: err.message });
    }
  });

  // ── CRUD: User Profile ──
  


// POST /api/user/profile — save or update the user's profile data
  app.post("/api/user/profile", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const data = req.body;
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
          ritualTime: data.ritualTime ?? undefined,
          chronicConditions: data.chronicConditions ? JSON.stringify(data.chronicConditions) : undefined,
          healthGoals: data.healthGoals ? JSON.stringify(data.healthGoals) : undefined,
          clickCount: data.clickCount ?? undefined,
        },
      });
      res.json({ ok: true, userId: user.id });
    } catch (err: any) {
      console.error("[UserProfile] error:", err.message);
      res.status(500).json({ error: err.message });
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
        ritualTime: user.ritualTime,
        chronicConditions: user.chronicConditions ? JSON.parse(user.chronicConditions) : [],
        healthGoals: user.healthGoals ? JSON.parse(user.healthGoals) : [],
        clickCount: user.clickCount || 0,
        globalProgress: user.globalProgress || 0,
      });
    } catch (err: any) {
      console.error("[UserProfile] GET error:", err.message);
      res.status(500).json({ error: err.message });
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
      res.status(500).json({ error: err.message });
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
      res.status(500).json({ error: err.message });
    }
  });

  // ── All-in-one: GET /api/user/data ──
  // Returns profile, savedDishes, diary, recipeProgress in a single response
  app.get("/api/user/data", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const [user, dishes, diary, recipeProgress, userAchievements] = await Promise.all([
        prisma.user.findUnique({ where: { id: req.userId } }),
        prisma.savedDish.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.diaryEntry.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.recipeProgress.findMany({ where: { userId: req.userId } }),
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
      res.status(500).json({ error: err.message });
    }
  });

  // ── Aggregated: GET /api/user/state-now ──
  // Returns all data needed by StateNowScreen in one call
  app.get("/api/user/state-now", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const dayIndex = parseInt(req.query.dayIndex as string) || 1;

      const [user, dishes, diary, recipeProgress, dailyMetric, dailyRating] = await Promise.all([
        prisma.user.findUnique({ where: { id: req.userId } }),
        prisma.savedDish.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.diaryEntry.findMany({ where: { userId: req.userId, dayIndex }, orderBy: { createdAt: "desc" } }),
        prisma.recipeProgress.findMany({ where: { userId: req.userId } }),
        prisma.dailyMetric.findFirst({ where: { userId: req.userId, dayIndex }, orderBy: { date: "desc" } }),
        prisma.dailyRating.findFirst({ where: { userId: req.userId }, orderBy: { date: "desc" } }),
      ]);

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
      res.status(500).json({ error: err.message });
    }
  });

  // ── CRUD: Daily Metrics ──
  // POST /api/metrics/daily — upsert daily tracking data
  app.post("/api/metrics/daily", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { date, dayIndex, waterMl, sleepMinutes, mealCount, habitsDone, activityMinutes, steps, waterEntries, sleepLogs, digestionLog, movementLog, measurements, dayMood, dayBookmark } = req.body;
      
      // Fetch existing record
      const existing = await prisma.dailyMetric.findUnique({
        where: { userId_date: { userId: req.userId, date: new Date(date) } }
      });
      
      // Merge logic for logs
      const currentWaterEntries = existing?.waterEntries ? JSON.parse(existing.waterEntries) : [];
      const newWaterEntries = waterEntries ? [...currentWaterEntries, ...waterEntries] : currentWaterEntries;

      const currentSleepLogs = existing?.sleepLogs ? JSON.parse(existing.sleepLogs) : [];
      const newSleepLogs = sleepLogs ? [...currentSleepLogs, ...sleepLogs] : currentSleepLogs;
      
      const currentMovementLog = existing?.movementLog ? JSON.parse(existing.movementLog) : [];
      const newMovementLog = movementLog ? [...currentMovementLog, ...movementLog] : currentMovementLog;
      
      const currentDigestionLog = existing?.digestionLog ? JSON.parse(existing.digestionLog) : [];
      const newDigestionLog = digestionLog ? [...currentDigestionLog, ...digestionLog] : currentDigestionLog;
      
      const currentMeasurements = existing?.measurements ? JSON.parse(existing.measurements) : [];
      const newMeasurements = measurements ? [...currentMeasurements, ...measurements] : currentMeasurements;

      const record = await prisma.dailyMetric.upsert({
        where: { userId_date: { userId: req.userId, date: new Date(date) } },
        update: {
          dayIndex,
          waterMl: waterMl ?? undefined,
          sleepMinutes: sleepMinutes ?? undefined,
          mealCount: mealCount ?? undefined,
          habitsDone: habitsDone ?? undefined,
          activityMinutes: activityMinutes ?? undefined,
          steps: steps ?? undefined,
          waterEntries: JSON.stringify(newWaterEntries),
          sleepLogs: JSON.stringify(newSleepLogs),
          digestionLog: JSON.stringify(newDigestionLog),
          movementLog: JSON.stringify(newMovementLog),
          measurements: JSON.stringify(newMeasurements),
          dayMood: dayMood ?? undefined,
          dayBookmark: dayBookmark ?? undefined,
        },
        create: {
          userId: req.userId,
          date: new Date(date),
          dayIndex,
          waterMl: waterMl ?? 0,
          sleepMinutes: sleepMinutes ?? 0,
          mealCount: mealCount ?? 0,
          habitsDone: habitsDone ?? 0,
          activityMinutes: activityMinutes ?? 0,
          steps: steps ?? 0,
          waterEntries: JSON.stringify(newWaterEntries),
          sleepLogs: JSON.stringify(newSleepLogs),
          digestionLog: JSON.stringify(newDigestionLog),
          movementLog: JSON.stringify(newMovementLog),
          measurements: JSON.stringify(newMeasurements),
          dayMood: dayMood ?? null,
          dayBookmark: dayBookmark ?? null,
        },
      });
      res.json({ ok: true, id: record.id });
    } catch (err: any) {
      console.error("[DailyMetric] error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/metrics/daily — get daily metrics for a date range
  app.get("/api/metrics/daily", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const records = await prisma.dailyMetric.findMany({
        where: { userId: req.userId },
        orderBy: { date: "desc" },
        take: 30,
      });
      res.json(records.map(r => ({
        ...r,
        digestionLog: r.digestionLog ? JSON.parse(r.digestionLog) : null,
        movementLog: r.movementLog ? JSON.parse(r.movementLog) : null,
        measurements: r.measurements ? JSON.parse(r.measurements) : null,
      })));
    } catch (err: any) {
      console.error("[DailyMetric] GET error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── CRUD: Daily Ratings ──
  app.post("/api/metrics/ratings", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { date, wellbeing, energy, lightness, logEntry } = req.body;
      
      const existing = await prisma.dailyRating.findUnique({
        where: { userId_date: { userId: req.userId, date: new Date(date) } }
      });

      let wellbeingLog = existing?.wellbeingLog ? JSON.parse(existing.wellbeingLog) : [];
      let energyLog = existing?.energyLog ? JSON.parse(existing.energyLog) : [];
      let lightnessLog = existing?.lightnessLog ? JSON.parse(existing.lightnessLog) : [];

      if (logEntry) {
        if (logEntry.type === "zen") wellbeingLog.push({ time: logEntry.time, val: logEntry.value });
        if (logEntry.type === "energy") energyLog.push({ time: logEntry.time, val: logEntry.value });
        if (logEntry.type === "lightness") lightnessLog.push({ time: logEntry.time, val: logEntry.value });
      }

      const updateData = { 
        wellbeing, 
        energy, 
        lightness,
        wellbeingLog: JSON.stringify(wellbeingLog),
        energyLog: JSON.stringify(energyLog),
        lightnessLog: JSON.stringify(lightnessLog)
      };

      const record = await prisma.dailyRating.upsert({
        where: { userId_date: { userId: req.userId, date: new Date(date) } },
        update: updateData,
        create: { 
          userId: req.userId, 
          date: new Date(date), 
          ...updateData 
        },
      });
      res.json({ ok: true, id: record.id, record });
    } catch (err: any) {
      console.error("[DailyRating] error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── CRUD: Recipe Progress ──
  app.post("/api/recipe/progress", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { bookRecipeType, bookRecipeId, status, note, tags, dayIndex } = req.body;
      const record = await prisma.recipeProgress.upsert({
        where: {
          userId_bookRecipeType_bookRecipeId: {
            userId: req.userId,
            bookRecipeType,
            bookRecipeId,
          },
        },
        update: { status, note, tags: tags ? JSON.stringify(tags) : undefined, dayIndex },
        create: { userId: req.userId, bookRecipeType, bookRecipeId, status, note, tags: tags ? JSON.stringify(tags) : undefined, dayIndex },
      });
      res.json({ ok: true, id: record.id });
    } catch (err: any) {
      console.error("[RecipeProgress] error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/recipe/progress", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const records = await prisma.recipeProgress.findMany({ where: { userId: req.userId } });
      res.json(records.map(r => ({ ...r, tags: r.tags ? JSON.parse(r.tags) : [] })));
    } catch (err: any) {
      console.error("[RecipeProgress] GET error:", err.message);
      res.status(500).json({ error: err.message });
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

      const dish = await prisma.savedDish.create({
        data: {
          userId: req.userId,
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
      res.json({ ok: true, id: dish.id });
    } catch (err: any) {
      console.error("[SavedDish] error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/saved-dishes", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const take = Math.min(parseInt(req.query.take as string) || 50, 200);
      const skip = parseInt(req.query.skip as string) || 0;
      const dishes = await prisma.savedDish.findMany({
        where: { userId: req.userId },
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
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/saved-dishes/:id", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { id } = req.params;
      const data = req.body;
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
      res.status(500).json({ error: err.message });
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
      res.status(500).json({ error: err.message });
    }
  });

  // ── CRUD: Diary Entries ──
  app.post("/api/diary", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { dayIndex, note, mood, photo, tags, time } = req.body;
      const entry = await prisma.diaryEntry.create({
        data: {
          userId: req.userId,
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
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/diary", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const dayIndex = req.query.dayIndex ? parseInt(req.query.dayIndex as string) : undefined;
      const where: any = { userId: req.userId };
      if (dayIndex !== undefined) where.dayIndex = dayIndex;
      const entries = await prisma.diaryEntry.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      res.json(entries.map(e => ({ ...e, tags: e.tags ? JSON.parse(e.tags) : [] })));
    } catch (err: any) {
      console.error("[Diary] GET error:", err.message);
      res.status(500).json({ error: err.message });
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
      res.status(500).json({ error: err.message });
    }
  });

  // ── Evening Ritual ──
  // POST /api/evening-ritual — save ritual answers for a day
  app.post("/api/evening-ritual", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { dayIndex, answerBody, answerPsycho, answerUnexpected } = req.body;
      if (dayIndex == null) return res.status(400).json({ error: "dayIndex required" });
      const ritual = await prisma.eveningRitual.upsert({
        where: { userId_dayIndex: { userId: req.userId, dayIndex } },
        update: { answerBody, answerPsycho, answerUnexpected },
        create: { userId: req.userId, dayIndex, answerBody, answerPsycho, answerUnexpected },
      });
      res.json({ ok: true, id: ritual.id });
    } catch (err: any) {
      console.error("[EveningRitual] POST error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/evening-ritual?dayIndex=X — get ritual answers for a day
  app.get("/api/evening-ritual", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const dayIndex = parseInt(req.query.dayIndex as string);
      if (isNaN(dayIndex)) return res.json(null);
      const ritual = await prisma.eveningRitual.findUnique({
        where: { userId_dayIndex: { userId: req.userId, dayIndex } },
      });
      res.json(ritual ? {
        id: ritual.id,
        dayIndex: ritual.dayIndex,
        answerBody: ritual.answerBody,
        answerPsycho: ritual.answerPsycho,
        answerUnexpected: ritual.answerUnexpected,
        createdAt: ritual.createdAt.toISOString(),
      } : null);
    } catch (err: any) {
      console.error("[EveningRitual] GET error:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ── CRUD: Shopping List ──
  app.get("/api/shopping-list", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const items = await prisma.shoppingItem.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" } });
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
      res.status(500).json({ error: err.message });
    }
  });

  app.patch("/api/shopping-list/:id", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { id } = req.params;
      const { checked } = req.body;
      const item = await prisma.shoppingItem.update({ where: { id }, data: { checked } });
      res.json({ ok: true, id: item.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/shopping-list/:id", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      await prisma.shoppingItem.delete({ where: { id: req.params.id } });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete("/api/shopping-list", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      await prisma.shoppingItem.deleteMany({ where: { userId: req.userId } });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── CRUD: Anna Chat History ──
  app.post("/api/anna-chats", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { message, reply, screen, dayIndex } = req.body;
      const chat = await prisma.annaChat.create({
        data: { userId: req.userId, message, reply: reply ?? null, screen: screen ?? null, dayIndex: dayIndex ?? null },
      });
      res.json({ ok: true, id: chat.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
      res.status(500).json({ error: err.message });
    }
  });

  // ── Save Anna daily analysis snapshot ──
  app.post("/api/anna-analysis/save", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const { dayIndex, analysisText } = req.body;
      if (!dayIndex || !analysisText) return res.status(400).json({ error: "Missing dayIndex or analysisText" });
      await prisma.annaOverlayMessage.deleteMany({
        where: { userId: req.userId, dayIndex, sender: "anna_analysis" },
      });
      const msg = await prisma.annaOverlayMessage.create({
        data: { userId: req.userId, sender: "anna_analysis", text: analysisText, dayIndex, time: new Date().toISOString() },
      });
      res.json({ ok: true, id: msg.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Load Anna daily analysis snapshot ──
  app.get("/api/anna-analysis", async (req, res) => {
    if (!req.userId) return res.status(400).json({ error: "Missing device ID" });
    try {
      const dayIndex = parseInt(req.query.dayIndex as string);
      if (!dayIndex) return res.status(400).json({ error: "Missing dayIndex" });
      const msg = await prisma.annaOverlayMessage.findFirst({
        where: { userId: req.userId, dayIndex, sender: "anna_analysis" },
        orderBy: { createdAt: "desc" },
      });
      res.json({ text: msg?.text || null });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
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
      let dbEveningRituals: any[] = [];
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
        dbEveningRituals = await prisma.eveningRitual.findMany({
          where: { userId: req.userId, dayIndex: { gte: Math.max(1, maxDay - 30) } },
          orderBy: { dayIndex: 'asc' },
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
        _dbEveningRituals: dbEveningRituals,
        _dbRatings: dbRatings,
        
        _dbUserFull: user,
        _dbChats: dbChats,
      };

      const result = await achievementService.check({ action, payload: enrichedPayload });

      // Save newly unlocked achievements to DB silently
      if (result.unlocked.length > 0) {
        try {
          for (const id of result.unlocked) {
            await prisma.userAchievement.upsert({
              where: { userId_achievementId: { userId: req.userId, achievementId: id } },
              update: { unlocked: true, unlockedAt: new Date() },
              create: { userId: req.userId, achievementId: id, unlocked: true, unlockedAt: new Date(), xp: 0 },
            });
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
        } catch (dbErr: any) {
          logger.error("[Achievements] Failed to save to DB:", dbErr.message);
        }
      }

      // Return empty array to completely suppress instant overlays
      res.json({ unlocked: [] });
    } catch (err: any) {
      logger.error("[Achievements] Check error:", err.message);
      res.status(500).json({ error: err.message, unlocked: [] });
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
      res.status(500).json({ error: e.message });
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
  if (process.env.NODE_ENV !== "production") {
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
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[ERROR]", err.status || 500, err.message);
    res.status(err.status || 500).json({ error: err.message });
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
  startAccessExpiryWatcher();
}
export default app;
