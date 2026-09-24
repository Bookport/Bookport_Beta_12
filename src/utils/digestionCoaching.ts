// src/utils/digestionCoaching.ts

import {
  DigestionContext,
  DigestionMeasurements,
  getRandomPhrase,
  bristol_1,
  bristol_2,
  bristol_3,
  bristol_4,
  bristol_5,
  bristol_6,
  bristol_7,
  comfort_easy,
  comfort_normal,
  comfort_hard_constipation,
  comfort_hard_diarrhea,
  comfort_hard_normal,
  food_forbidden,
  food_forbidden_multiple,
  food_fodmap,
  food_starch,
  food_raw,
  symptom_bloating_constipation,
  symptom_bloating_diarrhea,
  symptom_bloating_normal,
  water_deficit_constipation,
  movement_deficit_constipation,
  med_loose_hypotension,
  med_constipation_hypertension,
  med_gut_stress_triad,
  med_diarrhea_tachycardia,
  med_constipation_bradycardia,
  red_flag_blood,
  red_flag_pain,
  red_flag_mucus,
  digestion_no_data,
  digestion_partial_entry,
  digestion_mixed_types,
  digestion_explicit_no_symptoms,
  digestion_volume_scanty,
  digestion_volume_voluminous,
  digestion_last_four_after_seven,
  digestion_last_two_after_loose,
  digestion_same_types,
} from "./digestionPhrases";
import { DailySummary } from "./crossModuleSummary";
import { useAppStore } from "../store/useAppStore";
import { parseTriad } from "./triadParser";

const BRISTOL_ARRAYS: Record<number, string[]> = {
  1: bristol_1,
  2: bristol_2,
  3: bristol_3,
  4: bristol_4,
  5: bristol_5,
  6: bristol_6,
  7: bristol_7,
};

const FORBIDDEN_KEYWORDS = [
  "мясо", "колбас", "сосис", "сало", "рыб", "яйц", "молок", "сыр", "творог",
  "сливочн", "майонез", "сахар", "шоколад", "конфет", "масло", "сливки",
];

const LEGUME_KEYWORDS = ["фасол", "нут", "чечевиц", "горох", "боб", "манг", "соя", "тофу", "эдамаме"];
const FODMAP_FRUIT_VEG_KEYWORDS = ["яблок", "груш", "слив", "вишн", "лук", "чеснок", "капуст", "цветная капуста", "спарж", "гриб"];

const STARCH_KEYWORDS = [
  "сорго", "рис", "картоф", "макарон", "хлеб", "банан", "пшен", "гречк", "овсян", "киноа",
];

const RAW_KEYWORDS = [
  "ягод", "фрукт", "салат", "зелень", "орех",
];

/**
 * Исключение служебных инструкций для разработчиков и заевших канцеляризмов
 */
const isJunkPhrase = (phrase: string): boolean => {
  const p = phrase.toLowerCase();
  return (
    p.includes("не переносим найденный ингредиент") ||
    p.includes("требует точного состава блюда") ||
    p.includes("техническое normal") ||
    p.includes("поле ощущений оставлено пустым") ||
    p.includes("не сообщает ни его массу") ||
    p.includes("не сообщает массу") ||
    p.includes("нельзя узнать размер порции") ||
    p.includes("для медицинского разговора полезно знать, в каком эпизоде") ||
    p.includes("самый удалённый от типа 4 номер не обязательно") ||
    p.includes("не подменяя учёт состоянием гидратации")
  );
};

/**
 * Выбор фразы с солью блока для устранения зацикливания
 */
const getCleanPhrase = (
  phrases: string[],
  ctx: DigestionContext,
  blockSalt: string = "default"
): string => {
  const cleanList = phrases.filter(p => !isJunkPhrase(p));
  const pool = cleanList.length > 0 ? cleanList : phrases;

  if (pool.length === 0) return "";

  const baseSeed = JSON.stringify([
    ctx.dayIndex ?? null,
    ctx.bristolTypes ?? null,
    ctx.latestSymptoms,
    ctx.worstBristol,
    blockSalt,
    pool[0],
  ]);

  let hash = 2166136261;
  for (let i = 0; i < baseSeed.length; i++) {
    hash ^= baseSeed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const selectedIndex = (hash >>> 0) % pool.length;
  const rawPhrase = pool[selectedIndex];

  return rawPhrase
    .replace(/{name}/g, ctx.userName ?? "")
    .replace(/{problemDishName}/g, ctx.problemDishName ?? "блюдо")
    .replace(/{symptoms}/g, (ctx.latestSymptoms ?? []).join(", "));
};

/**
 * Строгий парсер граммовки (только явные «г» и «кг»)
 */
const parseStrictWeightGrams = (val: unknown): number | null => {
  if (typeof val === "number" && !Number.isNaN(val) && val > 0) return Math.round(val);
  if (typeof val !== "string") return null;
  const s = val.trim().toLowerCase().replace(",", ".");
  if (!s) return null;

  const parenMatch = s.match(/\((?:~)?(\d+(?:\.\d+)?)\s*г\)/);
  if (parenMatch) {
    const num = parseFloat(parenMatch[1]);
    if (!Number.isNaN(num) && num > 0) return Math.round(num);
  }

  const kgMatch = s.match(/(\d+(?:\.\d+)?)\s*(?:кг|kg)/);
  if (kgMatch) {
    const num = parseFloat(kgMatch[1]);
    return !Number.isNaN(num) && num > 0 ? Math.round(num * 1000) : null;
  }

  const gMatch = s.match(/(\d+(?:\.\d+)?)\s*г(?![а-яa-z])/);
  if (gMatch) {
    const num = parseFloat(gMatch[1]);
    return !Number.isNaN(num) && num > 0 ? Math.round(num) : null;
  }

  return null;
};

interface TriggerIngredientFact {
  name: string;
  weightGrams: number | null;
  category: "forbidden" | "legume" | "fodmap" | "starch" | "raw";
}

interface YesterdayDishMatch {
  dishName: string;
  isBookRecipe: boolean;
  isForbidden: boolean;
  hasFodmap: boolean;
  hasStarch: boolean;
  hasRaw: boolean;
  fiber: number;
  totalPortionGrams: number | null;
  triggerIngredient: TriggerIngredientFact | null;
  ingredientsSummary: string[];
}

const extractYesterdayFood = (dayIndex: number): {
  yesterdayDishesMatches: YesterdayDishMatch[];
  problemDishName: string | null;
  hasForbidden: boolean;
  forbiddenCount: number;
} => {
  const savedDishes = useAppStore.getState().savedDishes || [];
  const yesterdayIndex = Number(dayIndex) - 1;

  const isMixerDish = (d: any): boolean => d?.sourceType === "mixer" || d?.category === "Миксер";
  const yesterdayDishes = savedDishes.filter(
    dish => dish.dayIndex !== undefined && Number(dish.dayIndex) === yesterdayIndex && !isMixerDish(dish)
  );

  if (yesterdayDishes.length === 0) {
    return {
      yesterdayDishesMatches: [],
      problemDishName: null,
      hasForbidden: false,
      forbiddenCount: 0,
    };
  }

  const yesterdayDishesMatches: YesterdayDishMatch[] = [];

  for (const dish of yesterdayDishes) {
    const isBookRecipe = Boolean(dish.isBookRecipe || dish.bookRecipeRef || dish.category === "Книга");

    const ingredients = (dish.ingredients || []).map((ing: any) => {
      const name = String(ing.name || "").trim();
      const weightGrams = parseStrictWeightGrams(ing.weight);
      const status = String(ing.status || "").toLowerCase();
      return { name, weightGrams, status };
    });

    const validWeights = ingredients.map(i => i.weightGrams).filter((w): w is number => w !== null);
    const totalPortionGrams = validWeights.length > 0 ? validWeights.reduce((a, b) => a + b, 0) : null;

    let triggerIngredient: TriggerIngredientFact | null = null;

    // 1. Поиск запрещённого ингредиента WFPB
    const forbiddenIng = ingredients.find(
      ing => ing.status === "error" || ing.status === "red" || FORBIDDEN_KEYWORDS.some(k => ing.name.toLowerCase().includes(k))
    );
    if (forbiddenIng) {
      triggerIngredient = { name: forbiddenIng.name, weightGrams: forbiddenIng.weightGrams, category: "forbidden" };
    }

    // 2. Поиск бобовых
    const legumeIng = ingredients.find(ing => LEGUME_KEYWORDS.some(k => ing.name.toLowerCase().includes(k)));
    if (!triggerIngredient && legumeIng) {
      triggerIngredient = { name: legumeIng.name, weightGrams: legumeIng.weightGrams, category: "legume" };
    }

    // 3. Поиск фруктов/овощей FODMAP
    const fodmapIng = ingredients.find(ing => FODMAP_FRUIT_VEG_KEYWORDS.some(k => ing.name.toLowerCase().includes(k)));
    if (!triggerIngredient && fodmapIng) {
      triggerIngredient = { name: fodmapIng.name, weightGrams: fodmapIng.weightGrams, category: "fodmap" };
    }

    // 4. Поиск крахмалов / сложных злаков
    const starchIng = ingredients.find(ing => STARCH_KEYWORDS.some(k => ing.name.toLowerCase().includes(k)));
    if (!triggerIngredient && starchIng) {
      triggerIngredient = { name: starchIng.name, weightGrams: starchIng.weightGrams, category: "starch" };
    }

    // 5. Поиск сырой растительной пищи
    const rawIng = ingredients.find(ing => RAW_KEYWORDS.some(k => ing.name.toLowerCase().includes(k)));
    if (!triggerIngredient && rawIng) {
      triggerIngredient = { name: rawIng.name, weightGrams: rawIng.weightGrams, category: "raw" };
    }

    const rawFiber = dish.computedNutrients?.fiber ?? dish.fiber;
    const fiber = typeof rawFiber === "number" ? rawFiber : parseFloat(String(rawFiber || "").replace(",", ".")) || 0;

    const ingredientsSummary = ingredients
      .map(i => i.name)
      .filter(Boolean)
      .slice(0, 4);

    yesterdayDishesMatches.push({
      dishName: dish.name || "блюдо",
      isBookRecipe,
      isForbidden: Boolean(forbiddenIng),
      hasFodmap: Boolean(legumeIng || fodmapIng),
      hasStarch: Boolean(starchIng),
      hasRaw: Boolean(rawIng),
      fiber,
      totalPortionGrams,
      triggerIngredient,
      ingredientsSummary,
    });
  }

  const forbiddenMatches = yesterdayDishesMatches.filter(d => d.isForbidden);
  const hasForbidden = forbiddenMatches.length > 0;
  let problemDishName: string | null = null;

  if (hasForbidden) {
    if (forbiddenMatches.length === 1) {
      problemDishName = forbiddenMatches[0].dishName;
    }
  } else {
    let maxFiber = -1;
    for (const match of yesterdayDishesMatches) {
      if (match.fiber > maxFiber) {
        maxFiber = match.fiber;
        problemDishName = match.dishName;
      }
    }
  }

  return {
    yesterdayDishesMatches,
    problemDishName,
    hasForbidden,
    forbiddenCount: forbiddenMatches.length,
  };
};

export const getDigestionFeedback = (
  summary: DailySummary,
  userName?: string,
  userGender?: string
): string => {
  const messageParts: string[] = [];

  const digestion = summary.digestion;
  const water = summary.water;
  const movement = summary.movement;

  // 1. Нет записей
  if (!digestion || digestion.episodes === 0) {
    const emptyCtx: DigestionContext = {
      userName: userName || "",
      userGender: userGender === "female" ? "female" : userGender === "male" ? "male" : undefined,
      worstBristol: 4,
      latestComfort: null,
      symptoms: [],
      latestSymptoms: [],
      waterStatus: water.status,
      movementStatus: movement.status === "athletic" ? "athlete" : movement.status === "active" ? "active" : movement.activeMin > 0 ? "light" : "sedentary",
      dayIndex: summary.dayIndex,
      episodeCount: 0,
    };
    return getCleanPhrase(digestion_no_data, emptyCtx, "no_data_salt");
  }

  const bristolRef = digestion.latestBristol;
  const bristolTypes = digestion.bristolTypes || [];
  const latestSymptoms = digestion.latestSymptoms || [];
  const allSymptoms = digestion.symptoms || [];
  const volume = digestion.volume ?? null;
  const explicitNoSymptoms = Boolean(digestion.explicitNoSymptoms);

  // 2. Частичная запись
  if (bristolRef === null || bristolRef === undefined) {
    const partialCtx: DigestionContext = {
      userName: userName || "",
      userGender: userGender === "female" ? "female" : userGender === "male" ? "male" : undefined,
      worstBristol: 4,
      latestComfort: digestion.latestComfort ?? null,
      symptoms: allSymptoms,
      latestSymptoms,
      waterStatus: water.status,
      movementStatus: movement.status === "athletic" ? "athlete" : movement.status === "active" ? "active" : movement.activeMin > 0 ? "light" : "sedentary",
      dayIndex: summary.dayIndex,
      episodeCount: digestion.episodes,
      volume,
      explicitNoSymptoms,
    };
    return getCleanPhrase(digestion_partial_entry, partialCtx, "partial_entry_salt");
  }

  const { yesterdayDishesMatches, problemDishName, hasForbidden, forbiddenCount } = extractYesterdayFood(summary.dayIndex);

  const dayMeasurements = summary.measurements;
  const triad = parseTriad(dayMeasurements?.rawTonus);
  const digestionMeasurements: DigestionMeasurements = {
    pulseAvg: dayMeasurements?.pulseAvg ?? dayMeasurements?.latestPulse ?? null,
    systolic: dayMeasurements?.systolic ?? null,
    diastolic: dayMeasurements?.diastolic ?? null,
    weightAvg: dayMeasurements?.weightAvg ?? null,
    weightDelta: dayMeasurements?.weightDelta ?? null,
    tonus: dayMeasurements?.tonus ?? "no_data",
    triad,
  };

  const ctx: DigestionContext = {
    userName: userName || "",
    userGender: userGender === "female" ? "female" : userGender === "male" ? "male" : undefined,
    worstBristol: digestion.worstBristol ?? bristolRef,
    latestComfort: digestion.latestComfort ?? null,
    problemDishName: problemDishName ?? undefined,
    symptoms: allSymptoms,
    latestSymptoms,
    waterStatus: water.status,
    movementStatus: movement.status === "athletic" ? "athlete" : movement.status === "active" ? "active" : movement.activeMin > 0 ? "light" : "sedentary",
    latestMeasurements: digestionMeasurements,
    dayIndex: summary.dayIndex,
    bristolTypes,
    episodeCount: digestion.episodes,
    volume,
    explicitNoSymptoms,
    waterAmount: water.amount,
    waterHasEntries: water.amount > 0,
    movementMinutes: movement.activeMin,
    movementHasEntries: movement.hasEntries,
    yesterdayFiber: summary.food.yesterdayFiber,
  };

  const hasBlood = allSymptoms.some(s => s.toLowerCase().includes("кров"));
  const hasPain = allSymptoms.some(s => s.toLowerCase().includes("бол") || s.toLowerCase().includes("спазм"));
  const hasMucus = allSymptoms.some(s => s.toLowerCase().includes("слиз"));
  const isLoose = bristolRef >= 6;
  const isConstipated = bristolRef <= 2;

  // ──────────────────────────────────────────────────────────────────────────
  // БЛОК 1: СВЯЗНЫЙ КЛИНИЧЕСКИЙ СТАТУС (ФОРМА + СИМПТОМЫ)
  // ──────────────────────────────────────────────────────────────────────────
  if (hasBlood) {
    messageParts.push(getCleanPhrase(red_flag_blood, ctx, "blood_lead"));
  } else if (hasPain) {
    messageParts.push(getCleanPhrase(red_flag_pain, ctx, "pain_lead"));
  } else if (hasMucus && isLoose) {
    messageParts.push(
      "Сегодня стул более мягкий и неоформленный, с урчанием в животе и газами, а также отмечена слизь. При ускоренном движении содержимого по кишечнику бокаловидные клетки активно выделяют муцин (слизь) как естественную защитную смазку в ответ на брожение и раздражение стенок. Это функциональная реакция слизистой; важно проследить, чтобы она ушла вместе с нормализацией консистенции."
    );
  } else if (hasMucus) {
    messageParts.push(
      "В сегодняшней записи отмечена слизь. В норме она вырабатывается эпителием для защиты стенок кишечника, но если симптом повторяется регулярно или сопровождается дискомфортом, это повод внимательнее оценить переносимость рациона со специалистом."
    );
  } else {
    const uniqueTypes = Array.from(new Set(bristolTypes));
    if (bristolTypes.length > 1 && uniqueTypes.length === 1) {
      messageParts.push(getCleanPhrase(digestion_same_types, ctx, "same_types_salt"));
    } else if (uniqueTypes.length > 1) {
      if (bristolRef === 4 && bristolTypes.includes(7)) {
        messageParts.push(getCleanPhrase(digestion_last_four_after_seven, ctx, "transition_7_4"));
      } else if (bristolRef === 2 && bristolTypes.some(t => t >= 6)) {
        messageParts.push(getCleanPhrase(digestion_last_two_after_loose, ctx, "transition_loose_2"));
      } else {
        messageParts.push(
          `В течение дня консистенция стула была неоднородной: отмечены разные типы (последний — тип ${bristolRef} по Бристолю). При такой волнообразной динамике полезно отслеживать реакцию на отдельные приёмы пищи.`
        );
      }
    } else {
      const bristolPhrases = BRISTOL_ARRAYS[bristolRef];
      if (bristolPhrases) {
        messageParts.push(getCleanPhrase(bristolPhrases, ctx, `bristol_${bristolRef}_salt`));
      }
    }

    const benignSymptoms = latestSymptoms.filter(s => {
      const l = s.toLowerCase();
      return !l.includes("кров") && !l.includes("бол") && !l.includes("спазм") && !l.includes("слиз");
    });

    if (benignSymptoms.length > 0) {
      const symptomListStr = benignSymptoms.join(", ").toLowerCase();
      if (isLoose) {
        messageParts.push(
          `Отмеченные симптомы (${symptomListStr}) на фоне неоформленного стула прямо указывают на активное брожение и повышенное газообразование в просвете кишки.`
        );
      } else if (isConstipated) {
        messageParts.push(
          `Ощущения (${symptomListStr}) вместе с плотным стулом говорят о задержке газов из-за более медленной эвакуации каловых масс.`
        );
      } else {
        messageParts.push(`Зафиксированы сопутствующие ощущения: ${symptomListStr}.`);
      }
    } else if (explicitNoSymptoms) {
      messageParts.push(getCleanPhrase(digestion_explicit_no_symptoms, ctx, "no_symptoms_salt"));
    } else if (volume === "scanty") {
      messageParts.push(getCleanPhrase(digestion_volume_scanty, ctx, "volume_scanty_salt"));
    } else if (volume === "voluminous") {
      messageParts.push(getCleanPhrase(digestion_volume_voluminous, ctx, "volume_voluminous_salt"));
    } else if (ctx.latestComfort === "easy") {
      messageParts.push(getCleanPhrase(comfort_easy, ctx, "comfort_easy_salt"));
    } else if (ctx.latestComfort === "hard") {
      if (isConstipated) messageParts.push(getCleanPhrase(comfort_hard_constipation, ctx, "hard_constipation"));
      else if (isLoose) messageParts.push(getCleanPhrase(comfort_hard_diarrhea, ctx, "hard_diarrhea"));
      else messageParts.push(getCleanPhrase(comfort_hard_normal, ctx, "hard_normal"));
    } else if (volume === "normal" || ctx.latestComfort === "normal") {
      messageParts.push(getCleanPhrase(comfort_normal, ctx, "comfort_normal_salt"));
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // БЛОК 2: ДИНАМИЧЕСКИЙ ПИЩЕВОЙ ДЕТЕКТИВ (ПО РЕАЛЬНОМУ БЛЮДУ)
  // ──────────────────────────────────────────────────────────────────────────
  if (yesterdayDishesMatches.length > 0 && !hasBlood) {
    const hasFodmapSymptom = allSymptoms.some(s => {
      const lower = s.toLowerCase();
      return lower.includes("вздут") || lower.includes("газ") || lower.includes("урчан");
    });
    const hasRelevantDigestiveSignal = allSymptoms.length > 0 || isConstipated || isLoose;

    if (hasForbidden && hasRelevantDigestiveSignal) {
      const forbiddenDish = yesterdayDishesMatches.find(d => d.isForbidden);
      if (forbiddenCount === 1 && forbiddenDish) {
        messageParts.push(
          `Во вчерашнем рационе было блюдо «${forbiddenDish.dishName}» с компонентами вне твоего WFPB-курса. Это осознанное отклонение: организм может реагировать на непривычную пищу спазмами или сменой консистенции стула.`
        );
      } else {
        messageParts.push(getCleanPhrase(food_forbidden_multiple, ctx, "forbidden_multiple_salt"));
      }
    } else {
      const fodmapDish = yesterdayDishesMatches.find(d => d.hasFodmap);
      const starchDish = yesterdayDishesMatches.find(d => d.hasStarch);
      const rawDish = yesterdayDishesMatches.find(d => d.hasRaw);

      if (hasFodmapSymptom && fodmapDish) {
        let baseFact = `основа — ${fodmapDish.ingredientsSummary.join(", ")}`;
        let triggerFact = "";
        let triggerName = fodmapDish.triggerIngredient?.name || "ферментируемый продукт";

        if (fodmapDish.triggerIngredient?.weightGrams) {
          triggerFact = `порция включала ${fodmapDish.triggerIngredient.weightGrams} г ингредиента «${triggerName}»`;
        }

        const details = [baseFact, triggerFact, fodmapDish.fiber > 0 ? `клетчатка блюда — ${fodmapDish.fiber} г` : ""]
          .filter(Boolean)
          .join("; ");

        // Динамическое объяснение биохимии: для бобовых vs для фруктов
        let bioReason = "";
        const isLegume = fodmapDish.triggerIngredient?.category === "legume";

        if (isLegume) {
          if (isConstipated) {
            bioReason = `Бобовые («${triggerName}») богаты галактоолигосахаридами (GOS) и плотной клетчаткой. Огромный объём волокон (${fodmapDish.fiber} г) без достаточного количества свободной воды сработал как плотный ком, заблокировав отхождение газов и вызвав урчание на фоне задержки стула.`;
          } else {
            bioReason = `Бобовые («${triggerName}») содержат галактоолигосахариды (GOS), которые не расщепляются в тонком кишечнике и бурно ферментируются микробиотой толстой кишки, вызывая активное урчание и газообразование.`;
          }
        } else {
          // Фрукты (яблоко, груша и др.)
          if (isLoose) {
            bioReason = `Фруктоза и сорбитол из фруктовой части притягивают воду в просвет кишки и быстро сбраживаются бактериями, провоцируя урчание, газы и послабление стула.`;
          } else {
            bioReason = `Ферментируемые углеводы фруктов и высокая доза волокон усилили бактериальное брожение в кишечнике.`;
          }
        }

        messageParts.push(
          `Вчера в меню было блюдо «${fodmapDish.dishName}» (по технологической карте: ${details}). ${bioReason}`
        );
      } else if (isConstipated && starchDish) {
        messageParts.push(
          `Вчера было плотное крахмалистое блюдо «${starchDish.dishName}» (клетчатка — ${starchDish.fiber} г). При высоком содержании сложных углеводов кишечнику требуется больше свободной жидкости, иначе каловые массы быстрее уплотняются.`
        );
      } else if (isLoose && rawDish) {
        messageParts.push(
          `Послабление стула совпало со свежими растительными продуктами в блюде «${rawDish.dishName}». Большой объём сырых волокон ускоряет механическую перистальтику кишечника.`
        );
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // БЛОК 3: КРОСС-МОДУЛЬ ВОДЫ И ДВИЖЕНИЯ (БЕЗ КАНЦЕЛЯРИТА)
  // ──────────────────────────────────────────────────────────────────────────
  if (isConstipated && !hasBlood) {
    const isRecordedWaterDeficit = water.amount > 0 && (ctx.waterStatus === "deficit" || ctx.waterStatus === "zero");
    if (isRecordedWaterDeficit) {
      messageParts.push(
        `В дневнике зафиксирован дефицит воды (${water.amount} мл из нормы ${water.goal} мл). При столь высоком количестве пищевых волокон в рационе недостаток жидкости неизбежно приводит к сухости и плотности каловых масс типа 1–2.`
      );
    } else if (water.amount === 0) {
      messageParts.push(
        `Обрати внимание на воду: записей о питье за день пока нет. Растительная клетчатка работает правильно только при регулярном поступлении жидкости, иначе она уплотняет стул.`
      );
    }

    const isRecordedSedentary = movement.hasEntries && (movement.status === "sedentary" || movement.activeMin < 20);
    if (isRecordedSedentary) {
      messageParts.push(
        "Движения сегодня было немного: спокойная ходьба помогает мягко стимулировать моторику кишечника естественным образом."
      );
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // БЛОК 4: МЕДИЦИНСКИЕ СВЯЗКИ (ЗАМЕРЫ ВЫБРАННОЙ ДАТЫ)
  // ──────────────────────────────────────────────────────────────────────────
  const sys = digestionMeasurements.systolic;
  const dia = digestionMeasurements.diastolic;
  const pulse = digestionMeasurements.pulseAvg;

  if (isLoose && ((sys !== null && sys < 90) || (dia !== null && dia < 60))) {
    messageParts.push(getCleanPhrase(med_loose_hypotension, ctx, "med_hypotension_salt"));
  }
  if (isConstipated && ((sys !== null && sys >= 140) || (dia !== null && dia >= 90))) {
    messageParts.push(getCleanPhrase(med_constipation_hypertension, ctx, "med_hypertension_salt"));
  }
  if (triad) {
    const isTriadStress = triad.wellbeing === "bad" && (triad.mood === "bad" || triad.energy === "high");
    if (allSymptoms.length > 0 && isTriadStress) {
      messageParts.push(getCleanPhrase(med_gut_stress_triad, ctx, "med_triad_salt"));
    }
  }
  if (isLoose && pulse !== null && pulse >= 100) {
    messageParts.push(getCleanPhrase(med_diarrhea_tachycardia, ctx, "med_tachycardia_salt"));
  }
  if (isConstipated && pulse !== null && pulse < 55) {
    messageParts.push(getCleanPhrase(med_constipation_bradycardia, ctx, "med_bradycardia_salt"));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // БЛОК 5: ПРАКТИЧЕСКИЙ КЛИНИЧЕСКИЙ ВЫВОД И ШАГ
  // ──────────────────────────────────────────────────────────────────────────
  if (isLoose || hasMucus) {
    messageParts.push(
      "Практический ориентир на сегодня: дай пищеварению спокойно восстановиться. Временно исключи сырые фрукты с высоким содержанием фруктозы (яблоки, груши), пей чистую тёплую воду или травяной чай небольшими порциями для поддержания водного баланса и отдай предпочтение мягкой, термически обработанной пище."
    );
  } else if (isConstipated) {
    messageParts.push(
      "Практический ориентир: при плотном стуле не пытайся форсировать процесс натуживанием. Равномерно распредели привычный объём воды до вечера, по возможности добавь спокойную комфортную прогулку и сделай упор на источники растворимой клетчатки."
    );
  }

  return messageParts.filter(Boolean).join("\n\n");
};