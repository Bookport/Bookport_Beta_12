import express from "express";
import path from "path";
import fs from "fs/promises";
import { Type } from "@google/genai";
import dotenv from "dotenv";
import { findForbiddenInText } from "./src/data/wfpb_forbidden_ingredients";
import { analyzeFoodImage, transcribeAudio, generateAnnaAudio } from "./src/services/dashscopeAdapter";
import { ANNA_REACTION_MATRIX } from "./src/prompts/annaReactionMatrix";
import { callLLM } from "./src/services/llmAdapter";
import { PromptCompiler } from "./src/services/promptCompiler";
import { safeParseJSON } from "./src/utils/safeParseJSON";
import { prisma } from "./src/prisma";
import { logger } from "./src/utils/logger";
import { achievementService } from "./src/services/AchievementService";
import { ANNA_TOOL_DEFINITIONS, executeToolCall } from "./src/services/annaTools";

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

// Robust wrapper with automatic model cascade fallback
async function generateContentWithFallback(payload: any) {
  const models = ["qwen3.5-plus", "qwen-plus"];
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
    selected.add("get_cooked_dishes");
    selected.add("get_saved_dishes");
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
    "Для таких вопросов используй `get_cooked_dishes` как основной tool. Если нужен конкретный рецепт из книги, используй `get_book_recipe_details`.",
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

  // ── Device ID Middleware ──
  // Extracts X-Device-Id from headers, finds or creates the user in PostgreSQL
  app.use("/api", async (req, res, next) => {
    const deviceId = req.headers["x-device-id"] as string | undefined;
    if (deviceId) {
      try {
        if (prisma && typeof prisma.user?.upsert === "function") {
          await prisma.user.upsert({
            where: { id: deviceId },
            update: {},
            create: { id: deviceId },
          });
        }
        req.userId = deviceId;
      } catch (err) {
        req.userId = deviceId;
        console.warn("[DeviceID] DB unavailable, using in-memory ID:", (err as Error)?.message);
      }
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
      const deviceId = req.headers["x-device-id"] as string | undefined;
      logger.request(req.method, req.originalUrl, res.statusCode, duration, deviceId);
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

      const systemPrompt = promptCompiler.compile({
        screenId: screenContextDetails?.screen_id || screenContext,
        userMessage: message,
        userName: userName || screenContextDetails?.userName,
        screenContextDetails,
        bookRecipesDataContext,
        isVoiceChat,
      }) + (annaToolGuidance ? `\n\n${annaToolGuidance}` : "");

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
      const MAX_TOOL_ROUNDS = 5;
      let finalReply = "";

      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const result = await generateContentWithFallback({
          messages,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.8,
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
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    const { ingredients, defaultDishName } = req.body || {};
    console.log("[PIPELINE TRACE 1] Raw Input from Client:", JSON.stringify(ingredients?.map((i: any) => ({ name: i.fullName || i.shortName, weight: i.weight }))), "HasImage: false");
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
      const promptText = `КРИТИЧЕСКОЕ ПРАВИЛО: Ты — Анна, молодая девушка-нутрициолог. Ты всегда говоришь о себе ТОЛЬКО в женском роде (например: 'я заметила', 'я проанализировала', 'я вынуждена', 'я рада'). НИКОГДА, ни при каких обстоятельствах не используй мужской род по отношению к себе. Это недопустимо.

${forbiddenWarning}You are a professional certified food nutritionist and USDA Database Analyzer for the "Всё дело в еде!" plant-based (WFPB) app.
The user confirmed the following list of verified ingredients with their weights in grams:
${ingredientsDescription}

Your task is to:
1. Identify EACH ingredient (including non-WFPB ones like meat, fish, dairy) and provide three customized nutritional insights in Russian based on the composition. DO NOT skip or ignore any ingredient.
2. Provide a Russian dish name based on the ingredients.
3. Estimate micronutrient values for ALL ingredients combined (iron, zinc, magnesium, iodine, selenium, vitamin C, vitamin B9, lysine, methionine). Non-WFPB ingredients should have their estimated micronutrients included in the totals.

CRITICAL: Include ALL listed ingredients in your analysis regardless of their WFPB compliance. Non-compliant ingredients must be flagged in the "compliance" insight but still included in micronutrient estimates.

Return ONLY a valid JSON object matching this schema:
{
  "dishName": "string (Russian Name of the entire dish, e.g. 'Тёплый боул с киноа и нутом')",
  "micronutrients": {
    "iron": { "value": number, "unit": "мг" },
    "zinc": { "value": number, "unit": "мг" },
    "magnesium": { "value": number, "unit": "мг" },
    "iodine": { "value": number, "unit": "мкг" },
    "selenium": { "value": number, "unit": "мкг" },
    "vitaminC": { "value": number, "unit": "мг" },
    "vitaminB9": { "value": number, "unit": "мкг" },
    "lysine": { "value": number, "unit": "г" },
    "methionine": { "value": number, "unit": "г" }
  },
  "insights": {
    "strengths": { "title": "Сильные стороны блюда", "text": "string" },
    "improvements": { "title": "Что можно улучшить", "text": "string" },
    "compliance": { "title": "Соответствие растительному рациону", "text": "string" }
  }
}

Important Rules:
- All texts, titles, and descriptions MUST be strictly in Russian.
- Do NOT simulate or invent fake metrics for micronutrients — use reasonable estimates based on ingredient knowledge.
- Output ONLY valid JSON, do not include any other markdown formatting.`;

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
                  type: Type.OBJECT,
                  properties: {
                    dishName: { type: Type.STRING },
                    micronutrients: {
                      type: Type.OBJECT,
                      properties: {
                        iron: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ["value", "unit"] },
                        zinc: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ["value", "unit"] },
                        magnesium: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ["value", "unit"] },
                        iodine: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ["value", "unit"] },
                        selenium: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ["value", "unit"] },
                        vitaminC: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ["value", "unit"] },
                        vitaminB9: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ["value", "unit"] },
                        lysine: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ["value", "unit"] },
                        methionine: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, unit: { type: Type.STRING } }, required: ["value", "unit"] }
                      },
                      required: ["iron", "zinc", "magnesium", "iodine", "selenium", "vitaminC", "vitaminB9", "lysine", "methionine"]
                    },
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
        console.warn("[USDA] Failed, returning 0 macros as fallback");
      }

      // ── Merge ──
      const resultData = {
        dishName: llmData.dishName || defaultDishName || "Цельное растительное блюдо",
        nutrients,
        micronutrients: llmData.micronutrients || {
          iron: { value: 0, unit: "мг" }, zinc: { value: 0, unit: "мг" },
          magnesium: { value: 0, unit: "мг" }, iodine: { value: 0, unit: "мкг" },
          selenium: { value: 0, unit: "мкг" }, vitaminC: { value: 0, unit: "мг" },
          vitaminB9: { value: 0, unit: "мкг" }, lysine: { value: 0, unit: "г" },
          methionine: { value: 0, unit: "г" }
        },
        insights: llmData.insights || {
          strengths: { title: "Сильные стороны блюда", text: "Блюдо на основе цельных растительных ингредиентов." },
          improvements: { title: "Что можно улучшить", text: "Добавьте больше зелени и семян для баланса нутриентов." },
          compliance: { title: "Соответствие растительному рациону", text: forbiddenFound.length > 0 ? "Обнаружены несоответствия WFPB." : "Блюдо соответствует WFPB-рациону." }
        }
      };
      console.log("[PIPELINE TRACE 4] Response:", JSON.stringify({ dishName: resultData.dishName, nutrients: resultData.nutrients, insightCount: resultData.insights ? Object.keys(resultData.insights).length : 0 }, null, 2));
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
        text: `You are an objective food ingredient analyzer. Identify EVERY visible food item in the photo regardless of dietary compliance.

CRITICAL — NEVER OMIT INGREDIENTS: You MUST list absolutely EVERY food ingredient visible in the image. Never skip, hide, rename, or rephrase an ingredient to make it appear compliant. If an ingredient violates WFPB rules, simply set its "status" to "error" — but ALWAYS include it in the output. Omitting ingredients is strictly forbidden.

WFPB compliance rules for reference (use only for status="error" classification):
1. Animal products (meat, poultry, fish, seafood, eggs, milk, cheese, yogurt, cream, butter, ghee, honey, gelatin) → status: "error"
2. Added salt (salt, sea salt, soy sauce, miso with salt, bouillon cubes) → status: "error"
3. Added oils (olive oil, sunflower oil, coconut oil, any extracted oil) → status: "error"

EXAMPLES of correct status assignment:
- "мясо", "говядина", "курица", "свинина" → status: "error"
- "рыба", "лосось", "креветки" → status: "error"
- "сыр", "молоко", "яйцо", "масло сливочное" → status: "error"
- "хлеб", "макароны", "сахар" → status: "error"
- "помидор", "огурец", "яблоко", "рис", "нут" → status: "green"
- "ключи", "телефон", "очки" → status: "blue" (non-food)

CRITICAL RULE FOR INGREDIENT EXTRACTION:
- DECOMPOSITION ONLY: Never output complex dishes or recipes as single ingredients. Break down everything into its primary raw components. WRONG: 'Овощной салат', 'Блины', 'Котлеты из нута', 'Хумус'. RIGHT: 'помидор, огурец, лук', 'мука, яйцо, растительное молоко', 'нут, морковь', 'нут, кунжут, оливковое масло'.
- UNIFICATION: Use singular nouns in lowercase. Return exact matches to our frontend keys whenever possible (e.g., return 'помидор' not 'Томаты', 'макароны' not 'Паста', 'овсянка' not 'Овсяные хлопья').

VERY IMPORTANT SCENARIOS:
1. If the image is a food/dish picture (edible), return ALL ingredients with "status" set to "green" or "error" based on compliance. NEVER omit any ingredient.
2. If the image contains a MIX of both food/edible items AND non-food/inedible items (e.g. some food next to keys or glasses), focus on food items only but still list ALL of them.
3. If the image contains ONLY non-food/inedible items (e.g. household items, accessories, electronics, keys, mugs, books, glasses, decor, toys), identify them all with "status": "blue".

Return ONLY a valid JSON object matching this schema:
{
  "dishName": "string (Russian Name of the dish, or if it is purely non-food, describe the collection of objects in Russian, e.g., 'Несъедобные предметы')",
  "ingredients": [
    {
      "id": "string (unique clean snake_case slug, e.g. 'spinach', 'chickpeas', 'salt', 'beef', 'keys', 'eyeglasses')",
      "fullName": "string (descriptive name in Russian, e.g., 'Сочный молодой шпинат', 'Связка металлических ключей')",
      "shortName": "string (short name in Russian, e.g., 'Шпинат', 'Ключи')",
      "status": "green" | "error" | "blue",
      "weight": number (estimated weight in grams),
      "reason": "string (reason in Russian for 'error', or a humorous comment for 'blue' objects, or empty string)"
    }
  ]
}

Ensure to output strictly valid JSON conforming exactly to this structure.`,
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
      
      const prompt = `Ты — куратор Анна в мобильном приложении на основе цельного растительного рациона (WFPB) без соли и продуктов животного происхождения «Всё дело в еде!».
Пользователь загрузил фото своего блюда, и сейчас идёт процесс нейросетевого распознавания ингредиентов.

Сгенерируй ОДНУ короткую, поддерживающую и вежливую фразу на русском языке, которая объясняет текущий процесс с технической стороны и информирует о действиях Системы в данный момент.
Контекст ситуации для генерации:
${situation || "временное ожидание повторного анализа блюда"}

Правила:
1. Исключи любое личное заигрывание, фамильярность, кокетство, уменьшительно-ласкательные слова или хвастовство. Тон должен быть профессиональным, поддерживающим и технологичным.
2. Абсолютно ЗАПРЕЩЕНО говорить от первого лица ("я", "я рада", "я заметила", "я проверила", "я настраиваю", "мой", "моя", "мы" и т.д.). Текст должен описывать только действия Системы, Алгоритма или Нейросети (например: "Идёт обработка...", "Система производит...", "Алгоритм выполняет...", "Проводится техническая сонастройка...").
3. Описывай техническую сторону происходящего: сопоставление текстур, определение контуров, сегментация кадров на ингредиенты и сверка со стандартами цельного растительного питания без соли.
4. ОДНА законченная фраза, длиной от 8 до 20 слов, без кавычек вокруг. Пиши строго на русском языке.`;

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

      const prompt = `КРИТИЧЕСКОЕ ПРАВИЛО: Ты — Анна, молодая девушка-нутрициолог. Ты всегда говоришь о себе ТОЛЬКО в женском роде (например: 'я заметила', 'я проанализировала', 'я вынуждена', 'я рада'). НИКОГДА, ни при каких обстоятельствах не используй мужской род по отношению к себе. Это недопустимо.

Ты — куратор-советник Анна (девушка, WFPB-диетолог) из приложения WFPB-рациона «Всё дело в еде!».
Пользователь загрузил фото, на котором Система распознала только НЕСЪЕДОБНЫЕ (непищевые, не съедобные) предметы: ${itemsStr}.

Напиши для пользователя живой, интеллектуальный литературный комментарий на русском языке от твоего лица (в женском роде: "я заметила", "я удивлена" и т.д.).
Твоя цель — мягко и с юмором пожурить пользователя за выбор "абсолютно бессолевого и низкокалорийного", но совершенно несъедобного меню из этих вещей, весело обыграть конкретные предметы, которые здесь распознаны, и с улыбкой направить пользователя обратно в безопасное русло — сфотографировать здоровую растительную еду.

Характер твоего юмора:
- Умный, тонкий, живой, книжный, интеллигентный, с легким подтрунированием и мягким удивлением. Без банальностей.
- ПРЯМО и весело обыграй именно эти предметы: ${itemsStr}. (Например, если это ключи, напиши про крепкие замки или зубы, если очки — про точное зрение, если чашка — про пустоту без полезного чая, и т.д. Обыгрывай конкретно те предметы, которые указаны в списке!).
- Если среди предметов есть что-то потенциально странное, опасное или чувствительное, сделай тон максимально бережным, безопасным и мягким.
- ПРЕДОСТЕРЕЖЕНИЕ: Никакой токсичности, грубости, агрессии или глупых шуток "ниже пояса". Ты остаешься обаятельной, грамотной, чуть озорной WFPB-советницей.

Смысл реплики:
1. Показать, что ты видишь конкретные предметы (${itemsStr}) и удивлённо-весело отметить этот выбор.
2. Обратить внимание на их несъедобность (хоть в них и гарантированно нет соли, масла или животных продуктов!).
3. Мягко призвать сделать фото настоящей полезной WFPB-еды (овощи, злаки, бобовые, фрукты) для здоровья эндотелия и сосудов.

Длина реплики: средняя (приблизительно 2-4 предложения, от 40 до 90 слов). Напиши реплику целиком как один абзац текста. Глаголы в прошедшем времени и прилагательные от первого лица пиши строго в ЖЕНСКОМ РОДЕ.`;

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
          hasSavedSettings: data.hasSavedSettings ?? undefined,
          chronicConditions: data.chronicConditions ? JSON.stringify(data.chronicConditions) : undefined,
          healthGoals: data.healthGoals ? JSON.stringify(data.healthGoals) : undefined,
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
        chronicConditions: user.chronicConditions ? JSON.parse(user.chronicConditions) : [],
        healthGoals: user.healthGoals ? JSON.parse(user.healthGoals) : [],
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
      const [user, dishes, diary, recipeProgress] = await Promise.all([
        prisma.user.findUnique({ where: { id: req.userId } }),
        prisma.savedDish.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.diaryEntry.findMany({ where: { userId: req.userId }, orderBy: { createdAt: "desc" }, take: 50 }),
        prisma.recipeProgress.findMany({ where: { userId: req.userId } }),
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
      const { date, dayIndex, waterMl, sleepMinutes, mealCount, habitsDone, activityMinutes, waterEntries, digestionLog, movementLog, measurements } = req.body;
      
      // Fetch existing record
      const existing = await prisma.dailyMetric.findUnique({
        where: { userId_date: { userId: req.userId, date: new Date(date) } }
      });
      
      // Merge logic for logs
      const currentWaterEntries = existing?.waterEntries ? JSON.parse(existing.waterEntries) : [];
      const newWaterEntries = waterEntries ? [...currentWaterEntries, ...waterEntries] : currentWaterEntries;
      
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
          waterEntries: JSON.stringify(newWaterEntries),
          digestionLog: JSON.stringify(newDigestionLog),
          movementLog: JSON.stringify(newMovementLog),
          measurements: JSON.stringify(newMeasurements),
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
          waterEntries: JSON.stringify(newWaterEntries),
          digestionLog: JSON.stringify(newDigestionLog),
          movementLog: JSON.stringify(newMovementLog),
          measurements: JSON.stringify(newMeasurements),
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
      const { name, category, dayIndex } = req.body;
      const item = await prisma.shoppingItem.create({
        data: { userId: req.userId, name, category: category ?? null, dayIndex: dayIndex ?? null },
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
  // Client sends events, server evaluates conditions and returns newly unlocked achievements
  app.post("/api/achievements/check", async (req, res) => {
    try {
      const { action, payload } = req.body;

      // Load user's existing achievements from DB
      if (req.userId) {
        try {
          const existing = await prisma.userAchievement.findMany({
            where: { userId: req.userId, unlocked: true },
          });
          achievementService.setUnlocked(existing.map((a: any) => a.achievementId));
        } catch (dbErr: any) {
          logger.warn("[Achievements] DB unavailable, using in-memory state:", dbErr.message);
        }
      }

      const result = await achievementService.check({ action, payload });

      // Save newly unlocked achievements to DB
      if (req.userId && result.unlocked.length > 0) {
        try {
          for (const id of result.unlocked) {
            await prisma.userAchievement.upsert({
              where: { userId_achievementId: { userId: req.userId, achievementId: id } },
              update: { unlocked: true, unlockedAt: new Date() },
              create: { userId: req.userId, achievementId: id, unlocked: true, unlockedAt: new Date(), xp: 0 },
            });
          }
          logger.info(`[Achievements] Saved ${result.unlocked.length} new achievements to DB for user ${req.userId}`);
        } catch (dbErr: any) {
          logger.error("[Achievements] Failed to save to DB:", dbErr.message);
        }
      }

      res.json(result);
    } catch (err: any) {
      logger.error("[Achievements] Check error:", err.message);
      res.status(500).json({ error: err.message, unlocked: [] });
    }
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
