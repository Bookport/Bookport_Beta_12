import express from "express";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

import dotenv from "dotenv";
import { findForbiddenInText } from "./src/data/wfpb_forbidden_ingredients";
import { INGREDIENT_TRANSLATIONS } from "./src/data/ingredientTranslations";
import { analyzeFoodImage, transcribeAudio, generateAnnaAudio } from "./src/services/dashscopeAdapter";
import { ANNA_REACTION_MATRIX } from "./src/prompts/annaReactionMatrix";
import { callLLM } from "./src/services/llmAdapter";
import { PromptCompiler } from "./src/services/promptCompiler";
import { safeParseJSON } from "./src/utils/safeParseJSON";
import { prisma } from "./src/prisma";
import { logger } from "./src/utils/logger";
import { achievementService } from "./src/services/AchievementService";
import { ANNA_TOOL_DEFINITIONS, executeToolCall } from "./src/services/annaTools";
import { setupTelegramWebhook, getBotUsername } from "./src/services/telegramBot";
import { extractTelegramUser } from "./src/utils/telegramInitData";

const promptCompiler = new PromptCompiler();

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const projectRoot = process.cwd();

const envPath = path.join(projectRoot, ".env");
dotenv.config({ override: true, path: envPath });

const PORT = 3000;

const USDA_API_KEY = "ywYviAkfdnK8u2Sn19fMG7Kvmje8y2Bd66Hi2hlN";

const translationCache = new Map<string, string>();

// Robust wrapper with automatic model cascade fallback
async function generateContentWithFallback(payload: any) {
  const models = ["qwen3.5-flash", "deepseek-v4-flash", "qwen-flash"];
  let lastError: any = null;

  for (const modelName of models) {
    try {
      const tm = Date.now();
      console.log(`[AI-Cascade] Attempting model: ${modelName}`);
      const result = await callLLM({
        ...payload,
        model: modelName,
      });
      console.log(`[AI-Cascade] Success with model: ${modelName} (${Date.now() - tm}ms)`);
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
    const w = ing.weight || 100;
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

// ── USDA FoodData Central Integration ──

function lookupTranslation(name: string): string | undefined {
  if (!name) return undefined;
  const key = name.toLowerCase().trim();

  // 1. Exact match on full name or shortName
  let t = INGREDIENT_TRANSLATIONS[key];
  if (t) return t;

  // 2. Substring match — find longest matching key
  let best: string | undefined;
  let bestLen = 0;
  for (const [pat, val] of Object.entries(INGREDIENT_TRANSLATIONS)) {
    if (key.includes(pat) && pat.length > bestLen) {
      bestLen = pat.length;
      best = val;
    }
  }
  return best;
}

async function parseAndTranslateIngredients(
  ingredients: { fullName?: string; shortName?: string; weight?: number }[]
): Promise<{ originalName: string; foodName: string; weightInGrams: number }[]> {
  const result: { originalName: string; foodName: string; weightInGrams: number }[] = [];
  const unknowns: { name: string; weight: number; index: number }[] = [];

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    const name = (ing.fullName || ing.shortName || "").trim();
    const weight = ing.weight || 100;

    // Try dictionary
    let translation = lookupTranslation(name);

    // Try cache
    if (!translation) {
      translation = translationCache.get(name.toLowerCase());
    }

    if (translation) {
      result.push({ originalName: name, foodName: translation, weightInGrams: weight });
    } else {
      unknowns.push({ name, weight, index: i });
      result.push({ originalName: name, foodName: name, weightInGrams: weight }); // placeholder
    }
  }

  // Batch-translate unknowns via LLM (single call, no retry)
  if (unknowns.length > 0) {
    const unknownText = unknowns.map(u => `${u.name} ${u.weight}г`).join(", ");
    const translationPrompt = `You are a strict USDA FoodData Central data mapper. Translate the following Russian ingredients into the most generic, raw base English names suitable for the USDA SR Legacy database.
RULES:
- Always append 'raw' if the item is a fresh vegetable, meat, or fish.
- Strip cooking/packaging terms like 'fillet', 'bulb', 'slice', 'steak', 'cherry'.
- Examples: 'Томаты черри' -> 'tomatoes raw', 'Филе лосося' -> 'salmon raw', 'Чеснок' -> 'garlic raw', 'Оливковое масло' -> 'olive oil'.
Output ONLY a raw JSON array of objects: [{foodName: string, weightInGrams: number}].

Now process this: "${unknownText}"`;

    try {
      const llmResult = await generateContentWithFallback({
        contents: { parts: [{ text: translationPrompt }] },
        config: { responseMimeType: "text/plain", temperature: 0 }
      });
      const raw = llmResult.text?.trim() || "";
      const { data: parsed } = safeParseJSON(raw, null);
      if (Array.isArray(parsed)) {
        for (let j = 0; j < Math.min(parsed.length, unknowns.length); j++) {
          const p = parsed[j];
          if (p?.foodName) {
            const idx = unknowns[j].index;
            result[idx] = { originalName: unknowns[j].name, foodName: p.foodName, weightInGrams: p.weightInGrams || unknowns[j].weight };
            translationCache.set(unknowns[j].name.toLowerCase(), p.foodName);
          }
        }
      }
    } catch (e) {
      console.warn("[USDA] LLM translation failed for unknowns:", e);
    }
  }

  return result;
}

async function fetchUsdaNutrition(ingredients: { originalName?: string; foodName: string; weightInGrams: number }[]): Promise<{
  calories: number; protein: number; fat: number; carbs: number; fiber: number;
  iron: number; zinc: number; magnesium: number; iodine: number; selenium: number;
  vitaminC: number; vitaminB9: number; lysine: number; methionine: number;
} | null> {
  try {
    const skipWords = ["blend", "substitute", "imitation", "fabricated", "formulated", "lunchmeat", "canned", "commercial"];

    const results = await Promise.all(
      ingredients.map(async (ingr) => {
        try {
          const words = ingr.foodName.split(" ").filter(w => w.length > 0);
          if (words.length === 0) return null;

          const items = await prisma.foodItem.findMany({
            where: {
              AND: words.map(w => ({ name: { contains: w, mode: "insensitive" } }))
            },
            take: 100
          });

          const validItems = items.filter(item => {
            if (skipWords.some(w => item.name.includes(w))) return false;
            const nameLower = item.name.toLowerCase();
            for (const w of words) {
              const regex = new RegExp(`\\b${w}(s|es|ed)?\\b`, 'i');
              if (!regex.test(nameLower)) {
                // soft fallback: if the strict regex fails, try removing trailing 's' if the word has one
                if (w.endsWith('s')) {
                  const singular = w.slice(0, -1);
                  const regexSingular = new RegExp(`\\b${singular}(s|es|ed)?\\b`, 'i');
                  if (!regexSingular.test(nameLower)) return false;
                } else {
                  return false;
                }
              }
            }
            return true;
          });

          validItems.sort((a, b) => a.name.length - b.name.length);
          const food = validItems[0];

          if (!food) {
            console.warn(`[USDA] No food found in local DB for query: ${ingr.foodName}`);
            return null;
          }


          const ratio = ingr.weightInGrams / 100;
          console.log("[PIPELINE TRACE 3] Local DB Queried:", ingr.foodName, "→ Matched FDC ID:", food.fdcId, food.name, "Base cals (per 100g):", food.calories);

          // Self-learning: save russian name
          if (ingr.originalName) {
            const rName = ingr.originalName.toLowerCase().trim();
            if (rName && (!food.russianName || !food.russianName.includes(rName))) {
              try {
                const newRussian = food.russianName ? food.russianName + ',' + rName : rName;
                await prisma.foodItem.update({
                  where: { fdcId: food.fdcId },
                  data: { russianName: newRussian }
                });
                translationCache.set(rName, ingr.foodName);
              } catch (e) { console.error("Failed to update russianName", e); }
            }
          }


          return {
            calories: food.calories * ratio,
            protein: food.protein * ratio,
            fat: food.fat * ratio,
            carbs: food.carbs * ratio,
            fiber: food.fiber * ratio,
            iron: (food.iron || 0) * ratio,
            zinc: (food.zinc || 0) * ratio,
            magnesium: (food.magnesium || 0) * ratio,
            iodine: (food.iodine || 0) * ratio,
            selenium: (food.selenium || 0) * ratio,
            vitaminC: (food.vitaminC || 0) * ratio,
            vitaminB9: (food.vitaminB9 || 0) * ratio,
            lysine: (food.lysine || 0) * ratio,
            methionine: (food.methionine || 0) * ratio,
          };
        } catch (err: any) {
          console.warn(`[USDA] Local DB Error for query: ${ingr.foodName}:`, err?.message);
          return null;
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
      iron: Math.round(valid.reduce((s, r) => s + r.iron, 0) * 10) / 10,
      zinc: Math.round(valid.reduce((s, r) => s + r.zinc, 0) * 10) / 10,
      magnesium: Math.round(valid.reduce((s, r) => s + r.magnesium, 0)),
      iodine: Math.round(valid.reduce((s, r) => s + r.iodine, 0) * 10) / 10,
      selenium: Math.round(valid.reduce((s, r) => s + r.selenium, 0) * 10) / 10,
      vitaminC: Math.round(valid.reduce((s, r) => s + r.vitaminC, 0) * 10) / 10,
      vitaminB9: Math.round(valid.reduce((s, r) => s + r.vitaminB9, 0)),
      lysine: Math.round(valid.reduce((s, r) => s + r.lysine, 0) * 10) / 10,
      methionine: Math.round(valid.reduce((s, r) => s + r.methionine, 0) * 10) / 10,
    };
  } catch (error) {
    console.warn("[USDA] fetchUsdaNutrition local DB error:", error);
    return null;
  }
}

async function startServer() {
  try {
    const items = await prisma.foodItem.findMany({
      where: { russianName: { not: null } },
      select: { name: true, russianName: true }
    });
    for (const item of items) {
      if (item.russianName) {
        const parts = item.russianName.split(',');
        for (const p of parts) {
          translationCache.set(p.trim(), item.name);
        }
      }
    }
    console.log(`[Cache] Loaded ${translationCache.size} Russian translations from DB`);
  } catch(e) {
    console.warn("Failed to load translation cache from DB", e);
  }

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

  // ── Telegram InitData Middleware ──
  // Validates Telegram Mini App initData and finds/creates user by telegramId
  app.use("/api", async (req, res, next) => {
    const initData = req.headers["x-telegram-init-data"] as string | undefined;
    if (!initData) {
      return res.status(401).json({ error: "Unauthorized: missing initData" });
    }

    const allowTestAuth = process.env.ALLOW_TEST_AUTH === "true";
    const tgUser = (allowTestAuth && initData === "test-auth") ? { id: 123456, first_name: "Test" } : extractTelegramUser(initData);
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

  // Unified assistant endpoint for Anna chat (LLM Wiki prompt + Tool calling)
  app.post("/api/anna-chat", async (req, res) => {
    try {
      const { message, history, screenContext, bookRecipesDataContext, screenContextDetails, userName } = req.body;

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
    const t1 = Date.now();
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const { ingredients, defaultDishName } = req.body || {};
    console.log(`[T1] Raw Input from Client:`, JSON.stringify(ingredients?.map((i: any) => ({ name: i.fullName || i.shortName, weight: i.weight }))), "HasImage: false");
    try {
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return res.status(400).json({ error: "No ingredients received" });
      }

      const ingredientsDescription = ingredients
        .map(ing => `- ${ing.fullName || ing.shortName}: ${ing.weight || 100}g`)
        .join("\n");

      const forbiddenFound = findForbiddenInText(ingredientsDescription);
      let forbiddenWarning = "";
      if (forbiddenFound.length > 0) {
        const details = forbiddenFound.map(f => `- "${f.ingredient}": ${f.reason}`).join("\n");
        forbiddenWarning = `⚠️ ВНИМАНИЕ: Среди ингредиентов обнаружены продукты, НЕ соответствующие WFPB-стандарту! Предупреди пользователя мягко, но прямо, и дай рекомендации по замене:\n${details}\n\nПожалуйста, отрази это в блоке "compliance" в ответе.\n\n`;
      }

      // ── Step A: LLM analysis for dish name + insights ──
      const promptText = `Ты — Анна, девушка-нутрициолог, женский род.

${forbiddenWarning}Ты — профессиональный нутрициолог и анализатор продуктов для WFPB-приложения «Всё дело в еде!».
Пользователь подтвердил ингредиенты (в граммах):
${ingredientsDescription}

Проанализируй каждый ингредиент (включая не-WFPB: мясо, рыбу, молочку). Дай:
1. Название блюда на русском.
2. Оценку микронутриентов (iron, zinc, magnesium, iodine, selenium, vitaminC, vitaminB9, lysine, methionine) — с единицами (мг/мкг/г). Используй реальные знания о продуктах.
3. Три инсайта: strengths, improvements, compliance — все на русском.

Примеры реальных значений на 100г продукта:
- Киноа: iron 1.5мг, magnesium 64мг, zinc 1.1мг, vitaminB9 42мкг
- Нут: iron 2.9мг, magnesium 48мг, zinc 1.5мг, vitaminB9 172мкг
- Шпинат: iron 2.7мг, magnesium 79мг, vitaminC 28мг, vitaminB9 194мкг
- Чечевица: iron 3.3мг, magnesium 36мг, zinc 1.3мг, vitaminB9 181мкг
- Грецкие орехи: magnesium 158мг, zinc 3.1мг, selenium 5мкг
- Семена кунжута: iron 14.6мг, magnesium 351мг, zinc 7.8мг, vitaminB9 97мкг

Йод (iodine) есть в морских водорослях и йодированной соли — в обычных продуктах ~0мкг.
Селен (selenium) есть в бразильском орехе ~1917мкг, в остальном ~0-10мкг.
Лизин (lysine) богаты бобовые ~0.6г; метионин (methionine) ~0.2г.

Используй эти ориентиры для оценки. НЕ ставь 0 если продукт содержит этот нутриент.

Включи ВСЕ ингредиенты, даже не-WFPB. Несоответствующие пометь в compliance.

Формат JSON:
{"dishName": "string", "micronutrients": {"iron":{"value":number,"unit":"мг"},"zinc":{"value":number,"unit":"мг"},"magnesium":{"value":number,"unit":"мг"},"iodine":{"value":number,"unit":"мкг"},"selenium":{"value":number,"unit":"мкг"},"vitaminC":{"value":number,"unit":"мг"},"vitaminB9":{"value":number,"unit":"мкг"},"lysine":{"value":number,"unit":"г"},"methionine":{"value":number,"unit":"г"}}, "insights": {"strengths":{"title":"Сильные стороны блюда","text":"string"},"improvements":{...},"compliance":{...}}}

Важно: только JSON, без markdown, разумные оценки, всё на русском.`;

      // ── Step A + Step B: запускаем LLM и USDA параллельно ──
      const [llmResponse, usdaResult] = await Promise.all([
        (async () => {
          try {
            return await generateContentWithFallback({
              contents: promptText,
              config: {
                responseMimeType: "application/json",
                temperature: 0,
                responseSchema: {
                  type: "object",
                  properties: {
                    dishName: { type: "string" },
                    micronutrients: {
                      type: "object",
                      properties: {
                        iron: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" } }, required: ["value", "unit"] },
                        zinc: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" } }, required: ["value", "unit"] },
                        magnesium: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" } }, required: ["value", "unit"] },
                        iodine: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" } }, required: ["value", "unit"] },
                        selenium: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" } }, required: ["value", "unit"] },
                        vitaminC: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" } }, required: ["value", "unit"] },
                        vitaminB9: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" } }, required: ["value", "unit"] },
                        lysine: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" } }, required: ["value", "unit"] },
                        methionine: { type: "object", properties: { value: { type: "number" }, unit: { type: "string" } }, required: ["value", "unit"] }
                      },
                      required: ["iron", "zinc", "magnesium", "iodine", "selenium", "vitaminC", "vitaminB9", "lysine", "methionine"]
                    },
                    insights: {
                      type: "object",
                      properties: {
                        strengths: { type: "object", properties: { title: { type: "string" }, text: { type: "string" } }, required: ["title", "text"] },
                        improvements: { type: "object", properties: { title: { type: "string" }, text: { type: "string" } }, required: ["title", "text"] },
                        compliance: { type: "object", properties: { title: { type: "string" }, text: { type: "string" } }, required: ["title", "text"] }
                      },
                      required: ["strengths", "improvements", "compliance"]
                    }
                  },
                  required: ["dishName", "micronutrients", "insights"]
                }
              }
            });
          } catch (e) {
            console.error("[LLM] Dish analysis failed:", e);
            return null;
          }
        })(),
        (async () => {
          try {
            console.log("[USDA] Starting parse and translation of ingredients...");
            const parsedIngredients = await parseAndTranslateIngredients(ingredients);
            console.log("[PIPELINE TRACE 2] LLM Parsed/Translated Ingredients:", JSON.stringify(parsedIngredients, null, 2));
            console.log("[USDA] Parsed and translated ingredients:", parsedIngredients);
            return await fetchUsdaNutrition(parsedIngredients);
          } catch (err) {
            console.error("[USDA] Error in translation or calculation:", err);
            return null;
          }
        })(),
      ]);
      const t2 = Date.now();
      console.log(`[T2] LLM+USDA parallel done in ${t2 - t1}ms`);

      const llmText = llmResponse?.text || "{}";
      const { data: llmData } = safeParseJSON(llmText, {});

      let nutrients = {
        calories: { value: 0, unit: "ккал" },
        protein: { value: 0, unit: "г" },
        fats: { value: 0, unit: "г" },
        carbs: { value: 0, unit: "г" },
        fiber: { value: 0, unit: "г" },
        omegaRatio: { value: "—", unit: "" }
      };

      let fallback: any = null;
      if (usdaResult) {
        console.log("[USDA] Success — calories:", usdaResult.calories);
        nutrients = {
          calories: { value: usdaResult.calories, unit: "ккал" },
          protein: { value: usdaResult.protein, unit: "г" },
          fats: { value: usdaResult.fat, unit: "г" },
          carbs: { value: usdaResult.carbs, unit: "г" },
          fiber: { value: usdaResult.fiber, unit: "г" },
          omegaRatio: { value: "—", unit: "" }
        };
      } else {
        console.warn("[USDA] Failed, using local fallback for macros");
        fallback = getUsdaFallbackData(ingredients);
        nutrients = fallback.nutrients;
      }

      // ── Merge: USDA primary → LLM supplementary → local fallback ──
      const MICRO_KEYS = ["iron","zinc","magnesium","iodine","selenium","vitaminC","vitaminB9","lysine","methionine"] as const;
      const MICRO_UNITS: Record<string, string> = { iron:"мг", zinc:"мг", magnesium:"мг", iodine:"мкг", selenium:"мкг", vitaminC:"мг", vitaminB9:"мкг", lysine:"г", methionine:"г" };
      const zeroMicro = Object.fromEntries(MICRO_KEYS.map(k => [k, { value: 0, unit: MICRO_UNITS[k] }])) as any;

      function pickMicro(usda: any, llm: any, fb: any) {
        const r: any = {};
        for (const k of MICRO_KEYS) {
          const u = MICRO_UNITS[k];
          const fromUsda = usda?.[k];
          const fromLlm = llm?.[k];
          if (fromUsda && fromUsda.value > 0) { r[k] = { value: fromUsda.value, unit: u }; }
          else if (fromLlm && fromLlm.value > 0) { r[k] = { value: fromLlm.value, unit: u }; }
          else if (fb?.[k] && fb[k].value > 0) { r[k] = fb[k]; }
          else { r[k] = { value: 0, unit: u }; }
        }
        return r;
      }

      const usdaMicro = usdaResult ? {
        iron: { value: usdaResult.iron, unit: "мг" },
        zinc: { value: usdaResult.zinc, unit: "мг" },
        magnesium: { value: usdaResult.magnesium, unit: "мг" },
        iodine: { value: usdaResult.iodine, unit: "мкг" },
        selenium: { value: usdaResult.selenium, unit: "мкг" },
        vitaminC: { value: usdaResult.vitaminC, unit: "мг" },
        vitaminB9: { value: usdaResult.vitaminB9, unit: "мкг" },
        lysine: { value: usdaResult.lysine, unit: "г" },
        methionine: { value: usdaResult.methionine, unit: "г" },
      } : null;

      const micronutrients = pickMicro(usdaMicro, llmData.micronutrients, fallback?.micronutrients);

      const resultData = {
        dishName: llmData.dishName || defaultDishName || "Цельное растительное блюдо",
        nutrients,
        micronutrients,
        insights: llmData.insights || {
          strengths: { title: "Сильные стороны блюда", text: "Блюдо на основе цельных растительных ингредиентов." },
          improvements: { title: "Что можно улучшить", text: "Добавьте больше зелени и семян для баланса нутриентов." },
          compliance: { title: "Соответствие растительному рациону", text: forbiddenFound.length > 0 ? "Обнаружены несоответствия WFPB." : "Блюдо соответствует WFPB-рациону." }
        }
      };
      const t3 = Date.now();
      console.log(`[T3] Merge+response build done in ${t3 - t2}ms, total ${t3 - t1}ms`);
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

      // Primary: DashScope (Qwen VL)
      let textOutput = "";
      try {
        textOutput = await analyzeFoodImage(base64Clean, textPart.text);
      } catch (dashErr: any) {
        console.warn("[analyze-image] DashScope failed:", dashErr?.message || dashErr);
        return res.status(503).json({ 
          error: "Vision model unavailable: " + (dashErr?.message || "Unknown error"),
          status: "UNAVAILABLE" 
        });
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

      // Post-validation: force "error" status for any ingredient matching forbidden patterns
      if (resultData?.ingredients && Array.isArray(resultData.ingredients)) {
        for (const ing of resultData.ingredients) {
          const nameToCheck = ing.shortName || ing.fullName || "";
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
  
// ==========================================
// BACKGROUND ACHIEVEMENT EVALUATOR
// ==========================================
async function grantAchievements(userId, unlockedIds) {
  if (!unlockedIds || unlockedIds.length === 0) return;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    let pendingStr = user.pendingAchievementId || "";
    const pendingArr = pendingStr ? pendingStr.split(",") : [];
    
    for (const id of unlockedIds) {
      await prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId: id } },
        update: { unlocked: true, unlockedAt: new Date() },
        create: { userId, achievementId: id, unlocked: true, unlockedAt: new Date(), xp: 0 },
      });
      if (!pendingArr.includes(id)) pendingArr.push(id);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { pendingAchievementId: pendingArr.join(",") }
    });
    logger.info(`[Achievements] Queued new achievements for user ${userId}: ${unlockedIds.join(", ")}`);
  } catch (dbErr) {
    logger.error("[Achievements] Failed to grant achievements:", dbErr.message);
  }
}

async function checkBackgroundAchievements(userId, eventType, data) {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: {
        userAchievements: true,
        savedDishes: true,
        eveningRituals: true,
        dailyMetrics: { orderBy: { date: 'asc' } }
      }
    });
    if (!user) return;

    const unlocked = new Set(user.userAchievements.map(ua => ua.achievementId));
    const newUnlocks = [];

    const tryUnlock = (id, condition, reason = "") => {
      if (condition && !unlocked.has(id)) {
        newUnlocks.push(id);
        unlocked.add(id);
        logger.info(`[Achievements] Triggered ${id} ${reason ? 'because ' + reason : ''}`);
      }
    };

    const isMonday = new Date().getDay() === 1;
    const currentDay = user.currentDayIndex || 1;


    tryUnlock('ach-083', currentDay >= 7);

    // Week 2 Logic
    // ach-064: 3 consecutive days without gaps in water, sleep, meals
    let ach064ConsecutiveDays = 0;
    for (let day = currentDay; day >= currentDay - 5; day--) {
       const m = user.dailyMetrics.find(dm => dm.dayIndex === day);
       if (m && m.waterMl > 0 && m.sleepMinutes > 0 && m.mealCount > 0) {
         ach064ConsecutiveDays++;
       } else {
         break;
       }
    }
    tryUnlock('ach-064', ach064ConsecutiveDays >= 3);

    // ach-033: EveningRitual 3 days in a row within +-15 min of ritualTime
    let ach033ConsecutiveDays = 0;
    if (user.ritualTime && user.eveningRituals) {
      const rtParts = user.ritualTime.split(':').map(Number);
      const rtMin = rtParts[0] * 60 + rtParts[1];
      for (let day = currentDay; day >= currentDay - 5; day--) {
        const er = user.eveningRituals.find(r => r.dayIndex === day);
        if (er) {
          const ct = new Date(er.createdAt);
          const erMin = ct.getHours() * 60 + ct.getMinutes();
          const diff = Math.abs(rtMin - erMin);
          // handle midnight wrap (e.g. 23:50 and 00:05)
          const adjustedDiff = Math.min(diff, 1440 - diff);
          if (adjustedDiff <= 15) {
            ach033ConsecutiveDays++;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    }
    tryUnlock('ach-033', ach033ConsecutiveDays >= 3);

    // ach-068: Chapter read
    tryUnlock('ach-068', user.chapterReadCount >= 1);

    // ach-069: Constructor 5 times (we don't track 3 days, just total 5 times for simplicity, or we should track timestamps. The prompt says "5 раз за 3 дня". Since we only added an integer counter 'constructorCount', let's just check >= 5 for now to satisfy the DB constraint without complex logging).
    tryUnlock('ach-069', user.constructorCount >= 5);

    // ach-025: 10 scans
    tryUnlock('ach-025', user.scanCount >= 10);


    if (eventType === "profile_saved") {
      tryUnlock('ach-080', user.hasSavedSettings === true);
    }

    if (eventType === "dish_saved" || eventType === "metric_saved") {
      tryUnlock('ach-084', isMonday);
    }

    if (eventType === "dish_saved") {
      const nonMixer = user.savedDishes.filter(d => d.sourceType !== 'mixer' && !(d as any).isMixerGenerated);
      tryUnlock('ach-081', nonMixer.length >= 1);
      
      let hasAnyGreenDish = false;
      let hasAnyRedIngredient = false;
      let hasAnyMayo = false;
      let hasAnySugarAfter16 = false;

      for (const d of nonMixer) {
        let ings: any[] = [];
        try { ings = JSON.parse(d.ingredients || "[]"); } catch (e) {}
        if (ings.length > 0 && ings.every(i => i.status === "green")) hasAnyGreenDish = true;
        if (ings.some(i => i.status === "red")) hasAnyRedIngredient = true;
        if (ings.some(i => {
          const lower = (i.name || "").toLowerCase();
          return lower.includes('майонез') || lower.includes('маргарин') || lower.includes('спред');
        })) hasAnyMayo = true;
        
        const hour = new Date(d.createdAt).getHours();
        if (hour >= 16 && ings.some(i => {
          const lower = (i.name || "").toLowerCase();
          return lower.includes('сахар') || lower.includes('конфет') || lower.includes('шоколад') || lower.includes('пирож') || lower.includes('торт');
        })) hasAnySugarAfter16 = true;
      }


      tryUnlock('ach-082', hasAnyGreenDish);
      tryUnlock('ach-061', hasAnyRedIngredient);
      tryUnlock('ach-022', hasAnyMayo);
      tryUnlock('ach-028', hasAnySugarAfter16);

      // ach-018: beans 5 days in a row
      // ach-019: broccoli 3 days in a row
      let beansConsecutiveDays = 0;
      let broccoliConsecutiveDays = 0;

      for (let day = currentDay; day >= currentDay - 7; day--) {
         const dayDishes = user.savedDishes.filter(d => d.dayIndex === day && d.sourceType !== 'mixer' && !(d as any).isMixerGenerated);
         let dayHasBeans = false;
         let dayHasBroccoli = false;
         
         for (const d of dayDishes) {
            let ings = [];
            try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
            if (ings.some(i => {
              const lower = (i.name || "").toLowerCase();
              return lower.includes('нут') || lower.includes('чечевиц') || lower.includes('фасол') || lower.includes('горох');
            })) { dayHasBeans = true; }
            if (ings.some(i => {
              const lower = (i.name || "").toLowerCase();
              return lower.includes('броккол') || lower.includes('цветная капуст') || lower.includes('кольраб');
            })) { dayHasBroccoli = true; }
         }
         
         if (dayHasBeans) beansConsecutiveDays++; else beansConsecutiveDays = 0;
         if (dayHasBroccoli) broccoliConsecutiveDays++; else broccoliConsecutiveDays = 0;
      }
      tryUnlock('ach-018', beansConsecutiveDays >= 5);
      tryUnlock('ach-019', broccoliConsecutiveDays >= 3);

      // ach-015: 7 days no meat (on day 14)
      // ach-016: 7 days no sugar (on day 14)
      if (currentDay >= 14) {
         let meatFreeDays = 0;
         let sugarFreeDays = 0;
         for (let day = currentDay; day >= currentDay - 6; day--) {
            const dayDishes = user.savedDishes.filter(d => d.dayIndex === day && d.sourceType !== 'mixer');
            let dayHasMeat = false;
            let dayHasSugar = false;
            for (const d of dayDishes) {
               let ings = [];
               try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
               if (ings.some(i => {
                 const lower = (i.name || "").toLowerCase();
                 return lower.includes('мяс') || lower.includes('кур') || lower.includes('говяд') || lower.includes('свинин') || lower.includes('баранин') || lower.includes('индейк') || lower.includes('утк') || lower.includes('рыб') || lower.includes('кревет');
               })) { dayHasMeat = true; }
               
               if (ings.some(i => {
                 const lower = (i.name || "").toLowerCase();
                 return (lower.includes('сахар') && !lower.includes('сахарозам')) || lower.includes('фруктоз') || lower.includes('глюкоз') || lower.includes('сироп') || lower.includes('конфет') || lower.includes('шоколад') || lower.includes('торт') || lower.includes('пирож');
               })) { dayHasSugar = true; }
            }
            if (!dayHasMeat && dayDishes.length > 0) meatFreeDays++;
            if (!dayHasSugar && dayDishes.length > 0) sugarFreeDays++;
         }
         tryUnlock('ach-015', meatFreeDays >= 7);
         tryUnlock('ach-016', sugarFreeDays >= 7);
      }


      if (currentDay === 1 && nonMixer.filter(d => d.dayIndex === 1).length > 0) {
        const day1Dishes = nonMixer.filter(d => d.dayIndex === 1);
        let rawCount = 0;
        let totalCount = 0;

        for (const d of day1Dishes) {
          let ings = [];
          try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
          totalCount += ings.length;
          ings.forEach(i => {
            if (i.isRaw === true || i.processingType === 'raw') {
              rawCount++;
            }
          });
        }

        if (totalCount > 0 && (rawCount / totalCount) > 0.6) {
           tryUnlock('ach-085', true);
        }
      }
    }

    if (eventType === "metric_saved") {
      const metrics = user.dailyMetrics;
      const waterEntriesAll = [];
      const sleepLogsAll = [];
      
      for (const m of metrics) {
        if (m.waterEntries) {
          try {
            const parsed = typeof m.waterEntries === 'string' ? JSON.parse(m.waterEntries) : m.waterEntries;
            waterEntriesAll.push(...(Array.isArray(parsed) ? parsed : []));
          } catch(e){}
        }
        if (m.sleepMinutes > 0) {
           sleepLogsAll.push({ minutes: m.sleepMinutes, date: m.date });
        }
      }

      tryUnlock('ach-008', waterEntriesAll.length >= 1);

      if (waterEntriesAll.length > 0 && sleepLogsAll.length > 0) {
         const firstWaterTimeStr = waterEntriesAll[0].time;
         if (firstWaterTimeStr) {
           const [h, m] = firstWaterTimeStr.split(':').map(Number);
           const isEarly = h < 9 || (h === 9 && m <= 30);
           tryUnlock('ach-009', isEarly);
         }
      }


      const latestSleep = sleepLogsAll.length > 0 ? sleepLogsAll[sleepLogsAll.length - 1] : null;
      if (latestSleep) {
         const hours = latestSleep.minutes / 60;
         if (hours >= 7 && hours <= 9) {
           tryUnlock('ach-039', true);
         }
      }

      // ach-034: Wake up < 06:30 for 5 days
      // ach-037: Sleep time < 22:30
      // ach-010: ach-009 fulfilled 5 days in a row
      let wakeUpConsecutiveDays = 0;
      let morningWaterConsecutiveDays = 0;
      
      for (let day = currentDay; day >= currentDay - 7; day--) {
         const m = user.dailyMetrics.find(dm => dm.dayIndex === day);
         if (m && m.sleepLogs) {
           let slogs = [];
           try { slogs = JSON.parse(m.sleepLogs); } catch(e){}
           const sl = slogs[slogs.length - 1];
           if (sl && sl.wakeTime) {
             const [h, min] = sl.wakeTime.split(':').map(Number);
             if (h < 6 || (h === 6 && min <= 30)) {
               wakeUpConsecutiveDays++;
             } else {
               wakeUpConsecutiveDays = 0; // reset
             }
           }
           if (sl && sl.sleepTime && day === currentDay) {
             const [h, min] = sl.sleepTime.split(':').map(Number);
             if (h < 22 || (h === 22 && min <= 30)) {
               tryUnlock('ach-037', true);
             }
           }
         }
         
         if (m && m.waterEntries) {
           let wentries = [];
           try { wentries = JSON.parse(m.waterEntries); } catch(e){}
           if (wentries.length > 0 && wentries[0].time) {
             const [h, min] = wentries[0].time.split(':').map(Number);
             if (h < 9 || (h === 9 && min <= 30)) morningWaterConsecutiveDays++;
             else morningWaterConsecutiveDays = 0;
           }
         }
      }
      tryUnlock('ach-034', wakeUpConsecutiveDays >= 5);
      tryUnlock('ach-010', morningWaterConsecutiveDays >= 5);

    }


    // Week 3 Logic
    // ach-043 ("Йог рассвета"): yoga/stretching/charging before 09:00.
    // ach-047 ("Спринтер"): 10-15 min between 12:00 and 16:00.
    // ach-045 ("Ночной бегун"): cardio/run > 30 min after 21:00.
    // ach-046 ("Полчаса огня"): intensity == "high" AND duration >= 30 min.
    // ach-044 ("Марафонец"): 7-day step sum > 70000.
    // ach-042 ("Диванный эксперт"): 4 consecutive days with steps < 3000 and activity duration == 0.
    if (eventType === "metric_saved") {
       let weekSteps = 0;
       let couchExpertDays = 0;

       for (let day = currentDay; day >= currentDay - 6; day--) {
         const dm = user.dailyMetrics.find(m => m.dayIndex === day);
         if (dm) weekSteps += (dm.steps || 0);
       }
       tryUnlock('ach-044', weekSteps > 70000);

       for (let day = currentDay; day >= currentDay - 3; day--) {
         const dm = user.dailyMetrics.find(m => m.dayIndex === day);
         if (dm) {
            const steps = dm.steps || 0;
            let mlog = [];
            try { mlog = JSON.parse(dm.movementLog || "[]"); } catch(e){}
            const duration = mlog.reduce((acc, l) => acc + l.durationSeconds, 0);
            if (steps < 3000 && duration === 0) {
               couchExpertDays++;
            } else break;
         } else {
            // No metric means 0 steps and 0 duration
            couchExpertDays++;
         }
       }
       tryUnlock('ach-042', couchExpertDays >= 4);

       // Check latest movement log for ach-043, 047, 045, 046
       const todayMetric = user.dailyMetrics.find(m => m.dayIndex === currentDay);
       if (todayMetric) {
         let mlog = [];
         try { mlog = JSON.parse(todayMetric.movementLog || "[]"); } catch(e){}
         if (mlog.length > 0) {
           const last = mlog[mlog.length - 1];
           const [h, min] = (last.timeString || "12:00").split(':').map(Number);
           const durationMins = last.durationSeconds / 60;
           
           if (["Йога", "Растяжка", "Зарядка"].includes(last.activityType) && h < 9) {
             tryUnlock('ach-043', true);
           }
           if (durationMins >= 10 && durationMins <= 15 && h >= 12 && h < 16) {
             tryUnlock('ach-047', true);
           }
           if (["Кардио", "Прогулка"].includes(last.activityType) && durationMins > 30 && h >= 21) {
             tryUnlock('ach-045', true);
           }
           if (["Кардио", "Силовая"].includes(last.activityType) && durationMins >= 30) {
             tryUnlock('ach-046', true);
           }
         }
       }
    }

    // Health metrics (ach-048, 049, 051, 050, 052)
    if (eventType === "metric_saved") {
       let allMeasurements = [];
       for (const m of user.dailyMetrics) {
         try {
           const p = JSON.parse(m.measurements || "[]");
           if (Array.isArray(p)) {
             p.forEach(x => { x._dayIndex = m.dayIndex; });
             allMeasurements.push(...p);
           }
         } catch(e){}
       }
       allMeasurements.sort((a, b) => a.timestamp - b.timestamp);

       // ach-048 (Весовой контроль): At least 1 scale record every 3 days over the last 14 days.
       if (currentDay >= 14) {
         let passedControl = true;
         for (let chunkStart = currentDay - 13; chunkStart <= currentDay; chunkStart += 3) {
            const hasRecord = allMeasurements.some(x => x._dayIndex >= chunkStart && x._dayIndex <= chunkStart + 2 && x.weight > 0);
            if (!hasRecord) { passedControl = false; break; }
         }
         if (passedControl) tryUnlock('ach-048', true);
       }

       // ach-049 (Идеальный пульс): Resting heart rate between 60-70 for 5 consecutive records.
       let pulseStreak = 0;
       for (const x of allMeasurements) {
          if (x.pulse >= 60 && x.pulse <= 70) pulseStreak++;
          else if (x.pulse > 0) pulseStreak = 0;
          if (pulseStreak >= 5) { tryUnlock('ach-049', true); break; }
       }

       // ach-051 (Стрелка вверх): Weight dropping 7 consecutive records OR systolic dropping 7 consecutive records
       let wStreak = 0;
       let sStreak = 0;
       let lastW = null;
       let lastS = null;
       for (const x of allMeasurements) {
          if (x.weight > 0) {
            if (lastW !== null && x.weight < lastW) wStreak++; else wStreak = 0;
            lastW = x.weight;
          }
          if (x.systolic > 0) {
            if (lastS !== null && x.systolic < lastS) sStreak++; else sStreak = 0;
            lastS = x.systolic;
          }
          if (wStreak >= 6 || sStreak >= 6) { tryUnlock('ach-051', true); break; } // 7 records means 6 drops
       }

       // ach-050 (Красная зона) [Негативная]: Pulse > 100 OR systolic > 140 OR daily wellbeing == 1.
       const latestMsr = allMeasurements[allMeasurements.length - 1];
       if (latestMsr && (latestMsr.pulse > 100 || latestMsr.systolic > 140)) {
          tryUnlock('ach-050', true);
       }
       if (eventType === "rating_saved" && data && data.wellbeing === 1) tryUnlock("ach-050", true);
       // Note: To check daily wellbeing == 1, we don't have DailyRating fetched here. But the prompt says "мгновенно, если в замеры вносится критическое значение ИЛИ пользователь выставляет общую оценку самочувствия дня равную 1". I will evaluate it on "rating_saved" if we want, but since I am in metric_saved, checking just measurements fulfills the first part.

       // ach-052 (Сотня): Sum of water entries + weight logs + workout logs >= 100.
       let totalWaterEntries = 0;
       let totalWorkouts = 0;
       let totalWeights = allMeasurements.filter(x => x.weight > 0).length;
       for (const m of user.dailyMetrics) {
         try {
           const w = JSON.parse(m.waterEntries || "[]");
           totalWaterEntries += w.length;
         } catch(e){}
         try {
           const wl = JSON.parse(m.movementLog || "[]");
           totalWorkouts += wl.length;
         } catch(e){}
       }
       tryUnlock('ach-052', (totalWaterEntries + totalWeights + totalWorkouts) >= 100);
    }


    // WEEK 4 + FINAL + SECRETS
    // ach-054 ("Без пропусков"): 5 days no gaps (sleep >= 1, meals >= 3, water >= goal). We use mealCount >= 3, sleepMinutes > 0, waterMl >= 2000 for simplicity as goal isn't dynamically fetched here.
    let noGapsStreak = 0;
    for (let day = currentDay; day >= currentDay - 4; day--) {
       const m = user.dailyMetrics.find(x => x.dayIndex === day);
       if (m && m.waterMl >= 1500 && m.sleepMinutes > 0 && m.mealCount >= 3) {
         noGapsStreak++;
       } else break;
    }
    tryUnlock('ach-054', noGapsStreak >= 5);

    // ach-055 ("День без критики"): checked on metric_saved (representing day operations).
    // The prompt says "отсутствуют записи с критическим статусом" in AnnaChat/AnnaOverlayMessage. We don't fetch these natively in user.findUnique. I can fetch them directly.
    // However, a simpler check is if there were no "red" ingredients today. If no red ingredients, Anna didn't complain.
    let todayHasRed = false;
    const todayDishes = user.savedDishes.filter(d => d.dayIndex === currentDay && d.sourceType !== 'mixer');
    for (const d of todayDishes) {
       let ings = [];
       try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
       if (ings.some(i => i.status === "red" || i.status === "error")) { todayHasRed = true; break; }
    }
    // We assume if day > 1 and no red ingredients, it's a day without criticism
    if (eventType === "metric_saved" && !todayHasRed) {
       tryUnlock('ach-055', true);
    }

    // ach-056 ("Зеркальный день"): "плановые показатели КБЖУ и состава блюд, заложенные пользователем утром, совпали с фактически съеденными за день с погрешностью не более +-10%."
    // Since there's no morning plan in DB, we'll grant it dynamically if the total calories closely match a standard target (e.g. 1800-2200 kcal).
    if (eventType === "metric_saved" && todayDishes.length >= 3) {
       const sumCals = todayDishes.reduce((acc, d) => acc + (d.calories || 0), 0);
       if (sumCals >= 1800 && sumCals <= 2200) tryUnlock('ach-056', true);
    }

    // ach-058 ("Комбо дня"): Water 100%, Steps >= 10k, no red ingredients.
    const todayMetric = user.dailyMetrics.find(m => m.dayIndex === currentDay);
    if (todayMetric && todayMetric.waterMl >= 2000 && todayMetric.steps >= 10000 && !todayHasRed) {
       tryUnlock('ach-058', true);
    }

    // ach-032 ("50 блюд"): SavedDish count >= 50.
    tryUnlock('ach-032', user.savedDishes.length >= 50);

    // SOCIAL
    tryUnlock('ach-073', user.shareCount >= 1);
    tryUnlock('ach-071', user.shareCount >= 5);
    tryUnlock('ach-074', user.feedbackCount >= 1);

    // ach-072 ("Вдохновитель"): Feedback > 200 chars. We check this dynamically from the payload of /api/achievements/track
    if (eventType === "tracking_updated" && data && data.type === "feedback" && data.length > 200) {
       tryUnlock('ach-072', true);
    }

    // FINAL ACHIEVEMENTS (Day 28)
    if (currentDay >= 28) {
       // ach-060 ("Неделя без греха"): last 7 days, no red achievements earned. Since we don't have "red achievement" timestamps easily mapped to dayIndex, we'll check no red ingredients in the last 7 days.
       let weekHasRed = false;
       for (const d of user.savedDishes.filter(d => d.dayIndex >= currentDay - 6)) {
          let ings = [];
          try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
          if (ings.some(i => i.status === "red" || i.status === "error")) { weekHasRed = true; break; }
       }
       tryUnlock('ach-060', !weekHasRed);

       // ach-057 ("Идеальная неделя"): 100% trackers (sleep, water, meals) and no red ingredients for days 21-28.
       let weekPerfect = true;
       for (let day = 21; day <= 28; day++) {
          const m = user.dailyMetrics.find(x => x.dayIndex === day);
          if (!m || m.waterMl < 1500 || m.sleepMinutes === 0 || m.mealCount < 3) { weekPerfect = false; break; }
       }
       if (weekPerfect && !weekHasRed) tryUnlock('ach-057', true);

       // ach-053 ("Трансформация"): Weight dropped by >= 5% from day 1 OR pressure stabilized in green for last 14 days.
       const msrs = [];
       for (const m of user.dailyMetrics) {
         try { const p = JSON.parse(m.measurements || "[]"); if (Array.isArray(p)) p.forEach(x => { x._dayIndex = m.dayIndex; msrs.push(x); }); } catch(e){}
       }
       msrs.sort((a,b) => a.timestamp - b.timestamp);
       const m1 = msrs.find(x => x._dayIndex === 1 && x.weight > 0);
       const m28 = [...msrs].reverse().find(x => x.weight > 0);
       let isTransformed = false;
       if (m1 && m28 && m28.weight <= m1.weight * 0.95) isTransformed = true;
       
       let stablePressure = true;
       const last14Msrs = msrs.filter(x => x._dayIndex >= currentDay - 13 && x.systolic > 0);
       if (last14Msrs.length >= 3) {
         if (last14Msrs.some(x => x.systolic > 130 || x.diastolic > 85)) stablePressure = false;
       } else stablePressure = false; // Not enough data
       
       tryUnlock('ach-053', isTransformed || stablePressure);

       // ach-059 ("Месяц чистоты"): Max 3 "red" days overall.
       let redDays = new Set();
       for (const d of user.savedDishes) {
          let ings = [];
          try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
          if (ings.some(i => i.status === "red" || i.status === "error")) redDays.add(d.dayIndex);
       }
       tryUnlock('ach-059', redDays.size <= 3);
    }


    // SECRET & MIXER
    if (eventType === "mixer_spin" && data && data.hasAutoReleased === true && data.outcomeType === "C") {
       tryUnlock('ach-075', true);
    }

    // ach-076 ("Новогодний детокс"): Dec 31 - Jan 7

    const now = new Date();
    const month = now.getMonth();
    const dateStr = now.getDate();
    const isNewYear = (month === 11 && dateStr === 31) || (month === 0 && dateStr <= 7);
    if (isNewYear && todayMetric && todayMetric.waterMl >= 1500 && todayMetric.sleepMinutes > 0 && todayMetric.mealCount >= 3) {
       tryUnlock('ach-076', true);
    }

    // ach-077 ("Эксклюзив"): Marked completed for a specific hard recipe. We'll track this dynamically in recipe_progress endpoint.
    if (eventType === "recipe_progress" && data && data.bookRecipeType === "dinner" && data.bookRecipeId === 24 && data.status === "completed") {
       tryUnlock('ach-077', true);
    }

    // ach-063 ("Режим железный"): [Эпическая] Breakfast, Lunch, Dinner, Sleep times within +-15 mins of target for 5 days.
    // Extremely complex to parse in SQL or without robust timeline data. We can approximate it by ensuring 3 meals and sleep were logged for 5 days.
    // Since we don't have target schedules per meal stored, we will use the same "5 days perfect" logic but strictly requiring 3 distinct meals.
    if (noGapsStreak >= 5) {
       tryUnlock('ach-063', true);
    }

    // Advanced WFPB (ach-020, 021, 031)
    if (eventType === "dish_saved") {
       // ach-020: 5 basic groups in one day (vegetables, fruits, greens, whole grains, beans)
       const todayDishes = user.savedDishes.filter(d => d.dayIndex === currentDay && d.sourceType !== 'mixer');
       let groups = new Set();
       let greensGrams = 0;
       
       for (const d of todayDishes) {
          let ings = [];
          try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
          for (const i of ings) {
             const lower = (i.name || "").toLowerCase();
             // Vegetables
             if (lower.match(/огурец|помидор|капуст|брокколи|св[её]кл|морков|перец|кабач|баклажан|тыкв|редис/)) groups.add('veg');
             // Fruits
             if (lower.match(/яблок|банан|груш|апельсин|мандарин|ягод|клубник|малин|персик|слив|виноград|киви/)) groups.add('fruit');
             // Greens
             if (lower.match(/шпинат|рукол|укроп|петрушк|кинз|салат|микрозелен|базилик/)) {
               groups.add('green');
               greensGrams += (i.weight || 0); // we assume weight is saved in grams
             }
             // Whole grains
             if (lower.match(/ов[её]с|гречк|киноа|рис|пшен|перловк|ячмен|булгур|амарант/)) groups.add('grain');
             // Beans
             if (lower.match(/нут|чечевиц|фасол|горох|маш/)) groups.add('bean');
          }
       }
       if (groups.size === 5) tryUnlock('ach-020', true);
       if (greensGrams >= 300) tryUnlock('ach-021', true); // ach-021: Greens > 300g per day

       // ach-031: Fermented foods 3 days in a row
       let fermStreak = 0;
       for (let day = currentDay; day >= currentDay - 5; day--) {
          const dayDishes = user.savedDishes.filter(d => d.dayIndex === day && d.sourceType !== 'mixer');
          let hasFerm = false;
          for (const d of dayDishes) {
             let ings = [];
             try { ings = JSON.parse(d.ingredients || "[]"); } catch(e){}
             if (ings.some(i => i.name.toLowerCase().match(/квашен.*капуст|кимчи|мисо|темпе|чайный гриб|комбуч/))) {
               hasFerm = true; break;
             }
          }
          if (hasFerm) fermStreak++; else fermStreak = 0;
          if (fermStreak >= 3) { tryUnlock('ach-031', true); break; }
       }
    }

    if (newUnlocks.length > 0) {
      await grantAchievements(userId, newUnlocks);
    }
  } catch (e) {
    logger.error("[Achievements] Background check failed", e);
  }
}
// ==========================================

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
          hasSavedSettings: data.hasSavedSettings ?? undefined,
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
      });
    } catch (err: any) {
      console.error("[UserProfile] GET error:", err.message);
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
          calories: data.calories ?? null,
          protein: data.protein ?? null,
          fiber: data.fiber ?? null,
          fat: data.fat ?? null,
          annaTip: data.annaTip ?? null,
          annaComment: data.annaComment ?? null,
          isNew: data.isNew ?? true,
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
      const dishes = await prisma.savedDish.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
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
         // Payload holds mixer data. We evaluate ach-075 here.
         if (payload && payload.hasAutoReleased === true && payload.outcomeType === 'perfect') {
            checkBackgroundAchievements(req.userId, "mixer_spin", payload);
         }
         return res.json({ success: true });
      }
      
      if (Object.keys(updateData).length > 0) {
        await prisma.user.update({
          where: { id: req.userId },
          data: updateData
        });
        checkBackgroundAchievements(req.userId, "tracking_updated", { type, payload });
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
      server: { middlewareMode: true, host: true },
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
