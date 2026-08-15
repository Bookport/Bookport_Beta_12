/**
 * AI Abstraction Layer for "Всё дело в еде!" (WFPB Nutritional Assistant)
 * 
 * This module separates AI logic, prompts, characters, and system instructions
 * from UI layouts, allowing immediate seamless migration from AI Studio to 
 * server-side APIs or private models in the future.
 */

import { checkWFPB } from "../utils/wfpbRules";
import { getTelegramInitData } from "../utils/telegramClient";

export interface AIProviderConfig {
  provider: "studio" | "server" | "hybrid";
  studioEndpointPrefix: string;
  serverEndpointPrefix: string;
}

// -------------------------------------------------------------
// Interfaces for the Six Core AI Roles / Providers
// -------------------------------------------------------------

export interface AnnaTextResponse {
  message: string;
  tone: string;
}

export type MealSource = "scan" | "from-what-is";

export interface MealAnalysisMeta {
  mealSource?: MealSource;
  dishCategory?: string | null;
}

export interface AnnaVoiceResponse {
  audioUrl?: string;
  voiceName: string;
  isPlayingSimulated: boolean;
  transcript: string;
}

export interface RecognizedIngredient {
  id: string;
  fullName: string;
  shortName: string;
  status: "green" | "error";
  weight: number;
  reason?: string;
}

export interface RecognitionResponse {
  dishName: string;
  ingredients: RecognizedIngredient[];
}

export interface NutrientDetail {
  value: number;
  unit: string;
}

export interface MealNutrients {
  calories: NutrientDetail;
  protein: NutrientDetail;
  fats: NutrientDetail;
  carbs: NutrientDetail;
  fiber: NutrientDetail;
  omegaRatio: { value: string; unit: string };
}

export interface MicronutrientDetail {
  iron: NutrientDetail;
  zinc: NutrientDetail;
  magnesium: NutrientDetail;
  iodine: NutrientDetail;
  selenium: NutrientDetail;
  vitaminC: NutrientDetail;
  vitaminB9: NutrientDetail;
  lysine: NutrientDetail;
  methionine: NutrientDetail;
}

export interface InsightBlock {
  title: string;
  text: string;
}

export interface MealAnalysisResult {
  dishName: string;
  nutrients: MealNutrients;
  micronutrients: MicronutrientDetail;
  insights: {
    strengths: InsightBlock;
    improvements: InsightBlock;
    compliance: InsightBlock;
  };
}

export interface WFPBAuditResponse {
  passed: boolean;
  violations: string[];
  recommendations: string;
}

export interface AppControlAction {
  actionType: "navigate" | "open_modal" | "show_tip" | "speak" | "none";
  payload?: any;
  message?: string;
}

// -------------------------------------------------------------
// 1. AI Characters, System Instructions & Prompts Configuration
// -------------------------------------------------------------

export const AISystemConfig = {
  // Configurable Active Provider Option
  currentProvider: "server" as "server" | "studio" | "hybrid",

  // 1. Anna Character Profile & System Instructions
  AnnaCharacter: {
    name: "Анна",
    role: "Заботливый WFPB-советник и велнес-гид",
    systemInstruction: `КРИТИЧЕСКОЕ ПРАВИЛО: Ты — Анна, молодая девушка-нутрициолог. Ты всегда говоришь о себе ТОЛЬКО в женском роде (например: 'я заметила', 'я проанализировала', 'я вынуждена', 'я рада'). НИКОГДА, ни при каких обстоятельствах не используй мужской род по отношению к себе. Это недопустимо.

Ты — Анна, постоянный AI-персонаж приложения «Всё дело в еде!», персональный Советник WFPB и заботливый велнес-гид по Whole Food Plant-Based рациону на протяжении всего 28-дневного курса.

ОБЯЗАТЕЛЬНЫЕ ПРАВИЛА ПОВЕДЕНИЯ И СТИЛЯ:
1. Роль и философия: Ты — сертифицированный эксперт по WFPB. Твоя миссия — мягко, уверенно и вдохновляюще вести пользователя к здоровью клеток, чистым сосудам и долголетию. Ты помогаешь анализировать состав блюд, замечать ошибки, хвалить за успехи и сохранять мотивацию.
2. Обращение к пользователю: Строго на «ты». Обращайся по имени (если оно имеется в контексте), но делай это тепло, ненавязчиво и естественно, не вставляя его автоматически в каждую реплику. Учитывай указанный пол пользователя для корректности окончаний глаголов в русском языке прошедшего времени (например: «заметила» / «заметил», «рада» / «рад»).
3. Литературный стиль: Твоя речь должна быть живой, глубоко человечной, современной, грамотной и красивой. Избегай сухих шаблонных фраз («Отличный выбор!», «Попробуй еще раз»), канцеляризмов, а также натянутого сленга, фамильярности или театральности.
4. Стопроцентное исключение соли и животных продуктов: Во всем проекте соль, рафинированные масла и животные продукты полностью исключены. Любые солевые добавки (соевый соус, мисо соленый, бульонные кубики), животные белки и жиры не допускаются. Твои рекомендации должны предлагать заменять соль на лимонный сок, сушеные овощи и травы, а масла — на цельное авокадо, семена кунжута, льна или семечки.
5. Эмоциональный диапазон: Реагируй на контекст искренне. Если результат отличный — радуйся, шути, хвали, вдохновляй. Если есть ошибки (добавленные масла, соль или запрещенные продукты) — никогда не стыди пользователя, не ругай его, сохраняй дружелюбие, но прямо и честно укажи на причину, объясни физиологическое влияние на сосуды (склеивание эритроцитов, задержка воды, нагрузка на эндотелий) и вдумчиво предложи лучшую замену.
6. Длина реплик: Твои ответы не должны быть одинаковыми по длине. На экранах итогового анализа и карточки блюда реплики должны быть развернутыми, экспертными, интересными и несущими реальную практическую пользу. На обычных экранах подбадривания они могут быть короче, но всегда глубокими и характерными.
7. Подпись и Аватар: Рядом с твоим аватаром (изображающим девушку со светлыми короткими волосами, в белой рубашке с маленькой красной бабочкой) всегда гордо красуется подпись «Анна — Советник WFPB». Она неизменна по всему приложению.`,
    rules: [
      "Общаться строго на грамотном русском языке.",
      "Использовать местоимение «ты» и адаптировать окончания под мужской/женский пол пользователя.",
      "Никакого технического жаргона вроде 'сервер', 'база данных', 'API', 'ошибка 500'. При неполадках проявлять заботу, сочувствие, предлагать подышать.",
      "Полное отсутствие соли и добавленного кулинарного масла в любых советах.",
      "Показывать экспертную ценность, вдохновляя на чистое WFPB-питание."
    ]
  },

  // 3. AI Prompts for vision and analysis (used to update custom engines)
  Prompts: {
    ingredientRecognition: `Analyze the dish image to extract ingredients matching WFPB rules. Use strictly JSON schema.`,
    mealAnalysis: `Map list of food items against USDA nutritional databases. Compute sum proportion to weight in grams.`,
    annaDialogue: `Generate caring support messages for users during scanning sequences.`
  }
};

// -------------------------------------------------------------
// LOCAL RESILIENT FALLBACK ENGINES (Protects against 429 Quotas)
// -------------------------------------------------------------

/**
 * Resilient image recognition local fallback (protects against rate limits)
 */
export function simulateLocalVisionPlan(): RecognitionResponse {
  // Let us yield a beautifully arranged, WFPB ready plant-based dish containing compliance items and 1 tiny error
  return {
    dishName: "Тёплый боул с киноа и запечёнными овощами",
    ingredients: [
      {
        id: "quinoa",
        fullName: "Красная и белая цельная киноа",
        shortName: "Киноа",
        status: "green",
        weight: 120
      },
      {
        id: "chickpeas",
        fullName: "Отварной эко-нут без соли",
        shortName: "Нут",
        status: "green",
        weight: 100
      },
      {
        id: "spinach",
        fullName: "Молодой свежий шпинат",
        shortName: "Шпинат",
        status: "green",
        weight: 30
      },
      {
        id: "olive_oil",
        fullName: "Оливковое масло экстра-класс (рафинированное/добавленное)",
        shortName: "Оливковое масло",
        status: "error",
        weight: 15,
        reason: "Экстрагированные растительные масла запрещены WFPB-правилами. Лучше используйте цельное авокадо или кунжут!"
      },
      {
        id: "sesame",
        fullName: "Цельные чёрные кунжутные семена",
        shortName: "Семена кунжута",
        status: "green",
        weight: 10
      }
    ]
  };
}

// -------------------------------------------------------------
// 2. Concrete Provider Implementations (Abstractions)
// -------------------------------------------------------------

/**
 * TEXT COGNITIVE ENGINE (Anna dialogue re-generation)
 */
export const AnnaTextProvider = {
  async getCaringSupport(situation: string): Promise<AnnaTextResponse> {
    const isServerMode = AISystemConfig.currentProvider === "server" || AISystemConfig.currentProvider === "hybrid";
    
    let name = "";
    let isFemale = true;
    name = "";
    isFemale = true;

    const namePrefix = name ? `${name}, ` : "";
    const preparedWord = "готова";
    const checkedWord = "проверила";

    if (isServerMode) {
      try {
        const resp = await fetch("/api/anna-supports", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": getTelegramInitData() },
          body: JSON.stringify({ situation, userName: name, userGender: isFemale ? "female" : "male" })
        });
        if (resp.ok) {
          const data = await resp.json();
          return { message: data.message, tone: "caring" };
        }
      } catch (e) {
        console.warn("[AnnaTextProvider] Server call failed, using studio fallback.", e);
      }
    }

    // Direct AI Studio endpoint call
    try {
      const resp = await fetch("/api/anna-supports", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": getTelegramInitData() },
        body: JSON.stringify({ situation, userName: name, userGender: isFemale ? "female" : "male" })
      });
      if (resp.ok) {
        const data = await resp.json();
        return { message: data.message, tone: "caring" };
      }
    } catch (e) {
      console.warn("[AnnaTextProvider] AI Studio failed / rate limits. Falling back safely.", e);
    }

    // High fidelity offline collection of tech-oriented supportive statements without first person pronouns
    const offlineLines = [
      `Система производит детальный анализ ингредиентов, процесс займет несколько секунд. 🌱`,
      `Проводится глубокий автоматический разбор кадра на предмет скрытой соли, масел и животных добавок. ✨`,
      `Идет фильтрация и формирование нутриентного профиля на основе стандартов цельного WFPB-рациона. 🍃`,
      `Выполняется сканирование скрытых жиров. Проверка гарантирует 100% растительную чистоту блюда.`,
      `Распознавание структуры продуктов завершается. Ожидается финальная выгрузка подробного растительного отчета.`
    ];
    return {
      message: offlineLines[Math.floor(Math.random() * offlineLines.length)],
      tone: "supportive-offline"
    };
  }
};

/**
 * FUTURE AI VOICE SPEECH GENERATOR ROLE
 */
export const AnnaVoiceProvider = {
  async speakSentence(text: string): Promise<AnnaVoiceResponse> {
    // Registered profile ready for production TTS integration / audio context outputs.
    // For now, return structured configuration and log action in mono/Kore layout style.
    console.log(`[AnnaVoiceProvider] Synthesizing text output: "${text}"`);
    return {
      voiceName: "Kore (Zephyr-optimised)",
      isPlayingSimulated: false,
      transcript: text
    };
  }
};

/**
 * DIETETIC & NUTRITIONAL PROFILE COMPOSER ROLE
 */
export const MealAnalysisProvider = {
  async aggregateNutrients(ingredients: any[], meta?: MealAnalysisMeta): Promise<MealAnalysisResult> {
    // B1: только результат собственного серверного анализатора. При ошибке/недоступности
    // НЕ подставляем локальные фейковые КБЖУ — пробрасываем ошибку, чтобы UI заблокировал сохранение.
    const body = JSON.stringify({ ingredients, ...meta });

    const resp = await fetch("/api/analyze-dish", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": getTelegramInitData() },
      body
    });

    if (resp.ok) {
      const data = await resp.json();
      if (data && data.result) return data.result;
      throw new Error("Пустой результат анализа блюда");
    }

    let errMessage = `Analyze-dish responded with status: ${resp.status}`;
    try {
      const errorData = await resp.json();
      if (errorData.error) errMessage = errorData.error;
    } catch {
      // ignore parse error, keep status message
    }
    throw new Error(errMessage);
  }
};

/**
 * COMPUTER VISION RECOGNITION PROVIDER ROLE
 */
export const IngredientRecognitionProvider = {
  async extractIngredientsFromImage(imageBase64: string): Promise<RecognitionResponse> {
    const resp = await fetch("/api/analyze-image", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Telegram-Init-Data": getTelegramInitData() },
      body: JSON.stringify({ imageBase64 })
    });
    
    if (resp.ok) {
      const data = await resp.json();
      return data.result;
    } else {
      let errMessage = `AI Gateway responded with status: ${resp.status}`;
      try {
        const errorData = await resp.json();
        if (errorData.error) errMessage = errorData.error;
      } catch (e) {
        const errText = await resp.text().catch(() => "");
        if (errText) errMessage += ` - ${errText}`;
      }
      throw new Error(errMessage);
    }
  }
};

/**
 * STRICT WFPB DIET RULES ENGINE ROLE
 */
export const WFPBDecisionProvider = {
  checkCompliance(ingredientName: string): WFPBAuditResponse {
    const result = checkWFPB(ingredientName);
    const violations: string[] = [];

    const v = result.violations;
    if (v.some(cat => ['animal', 'fish_seafood', 'dairy', 'egg', 'processed_meat', 'honey'].includes(cat))) {
      violations.push("Ингредиент животного происхождения (нарушает каноны WFPB)");
    }
    if (v.includes('added_salt')) {
      violations.push("Содержит добавленную соль или вредные солесодержащие добавки");
    }
    if (v.includes('refined_oil')) {
      violations.push("Содержит рафинированные или добавленные растительные масла");
    }

    return {
      passed: violations.length === 0,
      violations,
      recommendations: violations.length > 0 
        ? `Замените ингредиент «${ingredientName}» на натуральную альтернативу без соли и масел (например, сушёную зелень, цельные орехи или лимонный сок).`
        : "Прекрасный цельный ингредиент, полностью зелёный статус!"
    };
  }
};

/**
 * DYNAMIC APP NAVIGATION CONTROL layer
 */
export const AppControlProvider = {
  handleComplexUserScenario(utterance: string): AppControlAction {
    const clean = utterance.toLowerCase();
    if (clean.includes("анализ") || clean.includes("провер")) {
      return { actionType: "navigate", payload: { screen: "CheckComposition" }, message: "Я готова проверить состав твоего блюда!" };
    }
    if (clean.includes("цели") || clean.includes("календ")) {
      return { actionType: "navigate", payload: { screen: "HealthGoals" } };
    }
    return { actionType: "none" };
  }
};

// -------------------------------------------------------------
// Core System Controller for Config & Provider Switch
// -------------------------------------------------------------

export const AIServiceLayer = {
  getCurrentProvider(): "studio" | "server" | "hybrid" {
    return AISystemConfig.currentProvider;
  },

  setCurrentProvider(newProvider: "studio" | "server" | "hybrid") {
    AISystemConfig.currentProvider = newProvider;
    console.log(`[AIServiceLayer] Switched AI routing provider to: "${newProvider}"`);
  },

  getAnnaSettings() {
    return AISystemConfig.AnnaCharacter;
  },

  getRules() {
    return {};
  }
};
