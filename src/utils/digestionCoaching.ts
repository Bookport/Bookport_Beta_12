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
} from "./digestionPhrases";
import { DailySummary } from "./crossModuleSummary";
import { useAppStore } from "../store/useAppStore";
import { parseTriad } from "./triadParser";
import { getGenderVerb } from "./textUtils";

const BRISTOL_ARRAYS: Record<number, string[]> = {
  1: bristol_1,
  2: bristol_2,
  3: bristol_3,
  4: bristol_4,
  5: bristol_5,
  6: bristol_6,
  7: bristol_7,
};

// Категории запрещённых ингредиентов (статус 'error') — проверяем по статусу блюда.
// Фолбэк-список ключевых слов на случай, если статус не заполнен, но название очевидное.
const FORBIDDEN_KEYWORDS = [
  "мясо", "колбас", "сосис", "сало", "рыб", "яйц", "молок", "сыр", "творог", "сливочн", "майонез", "сахар", "шоколад", "конфет", "масло", "сливки",
];

const FODMAP_KEYWORDS = [
  "фасол", "нут", "чечевиц", "горох", "капуст", "яблок", "лук", "чеснок",
];

const STARCH_KEYWORDS = [
  "рис", "картоф", "макарон", "хлеб", "банан",
];

const RAW_KEYWORDS = [
  "ягод", "фрукт", "салат", "зелень", "орех",
];

const hasKeyword = (ingredients: string[], keywords: string[]): boolean =>
  ingredients.some(name => keywords.some(k => name.includes(k)));

// Извлечение вчерашней еды (Пищевой детектив)
const extractYesterdayFood = (dayIndex: number): { yesterdayIngredients: string[]; problemDishName: string | null; hasForbidden: boolean; forbiddenDishes: any[] } => {
  const savedDishes = useAppStore.getState().savedDishes || [];
  const yesterdayIndex = Number(dayIndex) - 1;

  const yesterdayDishes = savedDishes.filter(
    dish => dish.dayIndex !== undefined && Number(dish.dayIndex) === yesterdayIndex
  );

  if (yesterdayDishes.length === 0) {
    return { yesterdayIngredients: [], problemDishName: null, hasForbidden: false, forbiddenDishes: [] };
  }

  const yesterdayIngredients: string[] = [];
  for (const dish of yesterdayDishes) {
    for (const ing of dish.ingredients || []) {
      if (ing.name) yesterdayIngredients.push(String(ing.name).toLowerCase());
    }
  }

  // Проблемное блюдо: сначала запрещёнка, иначе максимальное количество клетчатки
  let problemDishName: string | null = null;
  const forbiddenDishes = yesterdayDishes.filter(dish =>
    (dish.ingredients || []).some(ing =>
      String(ing.status) === "error" || ing.status === "red" || FORBIDDEN_KEYWORDS.some(k => String(ing.name).toLowerCase().includes(k))
    )
  );
  const hasForbidden = forbiddenDishes.length > 0;

  if (hasForbidden) {
    if (forbiddenDishes.length === 1) {
      problemDishName = forbiddenDishes[0].name;
    } else {
      problemDishName = null;
    }
  } else {
    let maxFiber = -1;
    for (const dish of yesterdayDishes) {
      const fiberVal = typeof dish.fiber === "number"
        ? dish.fiber
        : parseFloat(String(dish.fiber)) || 0;
      if (fiberVal > maxFiber) {
        maxFiber = fiberVal;
        problemDishName = dish.name;
      }
    }
  }

  return { yesterdayIngredients, problemDishName, hasForbidden, forbiddenDishes };
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

  const bristolRef = digestion?.latestBristol;
  const latestSymptoms = digestion?.latestSymptoms || [];

  // Нет данных о ЖКТ — возвращаем нейтральные фразы
  if (!digestion || digestion.episodes === 0 || bristolRef == null) {
    const noDataUser = userName || getGenderVerb(userGender, "друг", "подруга");
    const noDataMessages = [
      `За этот день у тебя нет записей о пищеварении, ${noDataUser}. Когда добавишь лог стула, Анна разберёт его вместе с твоим вчерашним меню.`,
      `Пока нет данных для анализа ЖКТ. Зафиксируй стул по Бристольской шкале — и я соединю его с твоими вчерашними блюдами.`,
    ];
    return noDataMessages[Math.floor(Math.random() * noDataMessages.length)];
  }

  // ─────────────────────────────────────────────
  // СБОР КОНТЕКСТА (независимые срезы данных)
  // ─────────────────────────────────────────────
  const { yesterdayIngredients, problemDishName, hasForbidden, forbiddenDishes } = extractYesterdayFood(summary.dayIndex);

  const triad = parseTriad(summary.latestMeasurements?.rawTonus ?? summary.measurements.rawTonus);
  const latestMeasurements: DigestionMeasurements = {
    pulseAvg: summary.latestMeasurements?.pulse ?? null,
    systolic: summary.latestMeasurements?.systolic ?? null,
    diastolic: summary.latestMeasurements?.diastolic ?? null,
    weightAvg: summary.latestMeasurements?.weight ?? null,
    weightDelta: summary.latestMeasurements?.weightDelta ?? null,
    tonus: summary.latestMeasurements?.tonus ?? 'no_data',
    triad,
  };

  const ctx: DigestionContext = {
    userName: userName || '',
    userGender: (userGender === "female" ? "female" : userGender === "male" ? "male" : undefined),
    worstBristol: bristolRef,
    latestComfort: digestion.latestComfort ?? null,
    problemDishName: problemDishName ?? undefined,
    symptoms: latestSymptoms,
    latestSymptoms,
    waterStatus: water.status,
    movementStatus: movement.status === 'athletic' ? 'athlete' : movement.status === 'active' ? 'active' : movement.activeMin > 0 ? 'light' : 'sedentary',
    latestMeasurements,
  };

  // ─────────────────────────────────────────────
  // БЛОК 1: Бристольская шкала (всегда)
  // ─────────────────────────────────────────────
  const bristolPhrases = BRISTOL_ARRAYS[bristolRef];
  if (bristolPhrases) {
    messageParts.push(getRandomPhrase(bristolPhrases, ctx));
  }

  // ─────────────────────────────────────────────
  // БЛОК 2: Симптомы ИЛИ Комфорт — взаимоисключающе, ровно один блок.
  // Если в последней записи есть симптомы — один симптомный блок.
  // Иначе — блок комфорта.
  // ─────────────────────────────────────────────
  if (latestSymptoms.length > 0) {
    const symptomPhrases = bristolRef <= 2
      ? symptom_bloating_constipation
      : bristolRef >= 6
        ? symptom_bloating_diarrhea
        : symptom_bloating_normal;
    if (symptomPhrases) {
      messageParts.push(getRandomPhrase(symptomPhrases, ctx));
    }
  } else if (ctx.latestComfort) {
    let comfortPhrases: string[] | null = null;
    if (ctx.latestComfort === 'easy') {
      comfortPhrases = comfort_easy;
    } else if (ctx.latestComfort === 'hard') {
      if (bristolRef <= 2) comfortPhrases = comfort_hard_constipation;
      else if (bristolRef >= 6) comfortPhrases = comfort_hard_diarrhea;
      else comfortPhrases = comfort_hard_normal;
    } else {
      comfortPhrases = comfort_normal;
    }
    if (comfortPhrases) {
      messageParts.push(getRandomPhrase(comfortPhrases, ctx));
    }
  }

  // ─────────────────────────────────────────────
  // БЛОК 3: Пищевой детектив (только если есть вчерашняя еда)
  // Взаимоисключающие проверки: название блюда упоминается максимум ОДИН раз.
  // Приоритет: запрещёнка, затем FODMAP, затем крахмалы (запор), затем сырая клетчатка (диарея).
  // ─────────────────────────────────────────────
  if (yesterdayIngredients.length > 0) {
    const hasFodmapSymptom = latestSymptoms.some(s => s === "Вздутие" || s === "Газы");
    const hasRelevantDigestiveSignal = latestSymptoms.length > 0 || bristolRef <= 2 || bristolRef >= 6;

    if (hasForbidden) {
      if (hasRelevantDigestiveSignal) {
        if (forbiddenDishes.length === 1) {
          messageParts.push(getRandomPhrase(food_forbidden, ctx));
        } else {
          messageParts.push(getRandomPhrase(food_forbidden_multiple, ctx));
        }
      }
    } else if (hasFodmapSymptom && hasKeyword(yesterdayIngredients, FODMAP_KEYWORDS)) {
      messageParts.push(getRandomPhrase(food_fodmap, ctx));
    } else if (bristolRef <= 2 && hasKeyword(yesterdayIngredients, STARCH_KEYWORDS)) {
      messageParts.push(getRandomPhrase(food_starch, ctx));
    } else if (bristolRef >= 6 && hasKeyword(yesterdayIngredients, RAW_KEYWORDS)) {
      messageParts.push(getRandomPhrase(food_raw, ctx));
    }
  }

  // ─────────────────────────────────────────────
  // БЛОК 5: Кросс-модульность (Вода и Движение) — всегда, без привязки к еде
  // ─────────────────────────────────────────────
  const isWaterDeficit = ctx.waterStatus === 'zero' || ctx.waterStatus === 'deficit';
  const isSedentary = ctx.movementStatus === 'sedentary' || ctx.movementStatus === 'light';
  if (bristolRef <= 2 && isWaterDeficit) {
    messageParts.push(getRandomPhrase(water_deficit_constipation, ctx));
  }
  if (bristolRef <= 2 && isSedentary) {
    messageParts.push(getRandomPhrase(movement_deficit_constipation, ctx));
  }

  // ─────────────────────────────────────────────
  // БЛОК 6: Медицинские кросс-паттерны (Замеры, latest-any-day)
  // ─────────────────────────────────────────────
  const sys = latestMeasurements.systolic;
  const dia = latestMeasurements.diastolic;
  const pulse = latestMeasurements.pulseAvg;

  // 1. Жидкий стул + Гипотония
  if (bristolRef >= 6 && (sys !== null && sys < 90 || dia !== null && dia < 60)) {
    messageParts.push(getRandomPhrase(med_loose_hypotension, ctx));
  }
  // 2. Запор + Гипертония (риск Вальсальвы)
  if (bristolRef <= 2 && ((sys !== null && sys >= 140) || (dia !== null && dia >= 90))) {
    messageParts.push(getRandomPhrase(med_constipation_hypertension, ctx));
  }
  // 3. Сбой ЖКТ + Стресс по Триаде
  const isTriadStress =
    triad.wellbeing === 'bad' && (triad.mood === 'bad' || triad.energy === 'high');
  if (latestSymptoms.length > 0 && isTriadStress) {
    messageParts.push(getRandomPhrase(med_gut_stress_triad, ctx));
  }
  // 4. Диарея + Тахикардия (обезвоживание)
  if (bristolRef >= 6 && pulse !== null && pulse >= 100) {
    messageParts.push(getRandomPhrase(med_diarrhea_tachycardia, ctx));
  }
  // 5. Запор + Брадикардия
  if (bristolRef <= 2 && pulse !== null && pulse < 55) {
    messageParts.push(getRandomPhrase(med_constipation_bradycardia, ctx));
  }

  // ─────────────────────────────────────────────
  // БЛОК 7: Красные флаги (всегда)
  // ─────────────────────────────────────────────
  if (latestSymptoms.includes("Кровь")) {
    messageParts.push(getRandomPhrase(red_flag_blood, ctx));
  }
  if (latestSymptoms.includes("Боль") || latestSymptoms.includes("Спазмы")) {
    messageParts.push(getRandomPhrase(red_flag_pain, ctx));
  }
  if (latestSymptoms.includes("Слизь")) {
    messageParts.push(getRandomPhrase(red_flag_mucus, ctx));
  }

  // ─────────────────────────────────────────────
  // ВОЗВРАТ
  // ─────────────────────────────────────────────
  return messageParts.filter(Boolean).join('\n\n');
};