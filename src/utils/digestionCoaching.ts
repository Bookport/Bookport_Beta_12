// src/utils/digestionCoaching.ts

import { DigestionContext, DigestionMeasurements, DIGESTION_PHRASES, getRandomPhrase } from "./digestionPhrases";
import { DailySummary } from "./crossModuleSummary";
import { useAppStore } from "../store/useAppStore";
import { parseTriad } from "./triadParser";

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
const extractYesterdayFood = (dayIndex: number): { yesterdayIngredients: string[]; problemDishName: string | null; hasForbidden: boolean } => {
  const savedDishes = useAppStore.getState().savedDishes || [];
  const yesterdayIndex = Number(dayIndex) - 1;

  const yesterdayDishes = savedDishes.filter(
    dish => dish.dayIndex !== undefined && Number(dish.dayIndex) === yesterdayIndex
  );

  if (yesterdayDishes.length === 0) {
    return { yesterdayIngredients: [], problemDishName: null, hasForbidden: false };
  }

  const yesterdayIngredients: string[] = [];
  for (const dish of yesterdayDishes) {
    for (const ing of dish.ingredients || []) {
      if (ing.name) yesterdayIngredients.push(String(ing.name).toLowerCase());
    }
  }

  // Проблемное блюдо: сначала запрещёнка, иначе максимальное количество клетчатки
  let problemDishName: string | null = null;
  let hasForbidden = false;

  const forbiddenDish = yesterdayDishes.find(dish =>
    (dish.ingredients || []).some(ing =>
      String(ing.status) === "error" || ing.status === "red" || FORBIDDEN_KEYWORDS.some(k => String(ing.name).toLowerCase().includes(k))
    )
  );

  if (forbiddenDish) {
    problemDishName = forbiddenDish.name;
    hasForbidden = true;
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

  return { yesterdayIngredients, problemDishName, hasForbidden };
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

  const worstBristol = digestion?.worstBristol;
  const symptoms = digestion?.symptoms || [];

  // Нет данных о ЖКТ — возвращаем нейтральные фразы
  if (!digestion || digestion.episodes === 0 || worstBristol === null) {
    const noDataMessages = [
      `За этот день у тебя нет записей о пищеварении, ${userName ? userName : 'друг'}. Когда добавишь лог стула, Анна разберёт его вместе с твоим вчерашним меню.`,
      `Пока нет данных для анализа ЖКТ. Зафиксируй стул по Бристольской шкале — и я соединю его с твоими вчерашними блюдами.`,
    ];
    return noDataMessages[Math.floor(Math.random() * noDataMessages.length)];
  }

  // ─────────────────────────────────────────────
  // СБОР КОНТЕКСТА (независимые срезы данных)
  // ─────────────────────────────────────────────
  const { yesterdayIngredients, problemDishName, hasForbidden } = extractYesterdayFood(summary.dayIndex);

  const triad = parseTriad(summary.latestMeasurements?.rawTonus ?? summary.measurements.rawTonus);
  const digestionMeasurements: DigestionMeasurements = {
    pulse: summary.latestMeasurements?.pulse ?? null,
    systolic: summary.latestMeasurements?.systolic ?? null,
    diastolic: summary.latestMeasurements?.diastolic ?? null,
    weight: summary.latestMeasurements?.weight ?? null,
    weightDelta: summary.latestMeasurements?.weightDelta ?? null,
    tonus: summary.latestMeasurements?.tonus ?? 'no_data',
    triad,
  };

  const ctx: DigestionContext = {
    userName,
    userGender: (userGender === "female" ? "female" : userGender === "male" ? "male" : undefined),
    summary,
    problemDishName,
    latestComfort: digestion.latestComfort ?? null,
    digestionMeasurements,
  };

  // ─────────────────────────────────────────────
  // БЛОК 1: Бристольская шкала (всегда)
  // ─────────────────────────────────────────────
  const bristolKey = `bristol_${worstBristol}` as keyof typeof DIGESTION_PHRASES;
  if (DIGESTION_PHRASES[bristolKey]) {
    messageParts.push(getRandomPhrase(bristolKey, ctx));
  }

  // ─────────────────────────────────────────────
  // БЛОК 2: Комфорт (всегда, если есть данные)
  // ─────────────────────────────────────────────
  if (ctx.latestComfort) {
    const comfortKey = ctx.latestComfort === 'easy'
      ? 'comfort_easy'
      : ctx.latestComfort === 'hard'
        ? 'comfort_hard'
        : 'comfort_normal' as keyof typeof DIGESTION_PHRASES;
    if (DIGESTION_PHRASES[comfortKey]) {
      messageParts.push(getRandomPhrase(comfortKey, ctx));
    }
  }

  // ─────────────────────────────────────────────
  // БЛОК 3: Пищевой детектив (только если есть вчерашняя еда)
  // ─────────────────────────────────────────────
  if (yesterdayIngredients.length > 0) {
    if (hasForbidden) {
      messageParts.push(getRandomPhrase("food_forbidden", ctx));
    }

    const hasFodmapSymptom = symptoms.some(s => s === "Вздутие" || s === "Газы");
    if (hasFodmapSymptom && hasKeyword(yesterdayIngredients, FODMAP_KEYWORDS)) {
      messageParts.push(getRandomPhrase("food_fodmap", ctx));
    }

    if (worstBristol <= 2 && hasKeyword(yesterdayIngredients, STARCH_KEYWORDS)) {
      messageParts.push(getRandomPhrase("food_starch", ctx));
    }

    if (worstBristol >= 6 && hasKeyword(yesterdayIngredients, RAW_KEYWORDS)) {
      messageParts.push(getRandomPhrase("food_raw", ctx));
    }
  }

  // ─────────────────────────────────────────────
  // БЛОК 4: Симптомы (всегда, независимо от еды)
  // ─────────────────────────────────────────────
  const hasBloatingSymptoms = symptoms.some(s => s === "Вздутие" || s === "Газы");
  if (hasBloatingSymptoms && yesterdayIngredients.length === 0) {
    messageParts.push(
      "Вздутие и газы без видимой связи с конкретным блюдом могут говорить о дисбалансе микрофлоры. Понаблюдай, после каких продуктов реакция усиливается, и постепенно увеличивай объём ферментируемой клетчатки."
    );
  }

  // ─────────────────────────────────────────────
  // БЛОК 5: Кросс-модульность (Вода и Движение) — всегда, без привязки к еде
  // ─────────────────────────────────────────────
  if (worstBristol <= 2 && water.status === "deficit") {
    messageParts.push(getRandomPhrase("water_deficit_constipation", ctx));
  }
  if (worstBristol <= 2 && movement.status === "sedentary") {
    messageParts.push(getRandomPhrase("movement_deficit_constipation", ctx));
  }

  // ─────────────────────────────────────────────
  // БЛОК 6: Медицинские кросс-паттерны (Замеры, latest-any-day)
  // ─────────────────────────────────────────────
  const sys = digestionMeasurements.systolic;
  const dia = digestionMeasurements.diastolic;
  const pulse = digestionMeasurements.pulse;

  // 1. Жидкий стул + Гипотония
  if (worstBristol >= 6 && (sys !== null && sys < 90 || dia !== null && dia < 60)) {
    messageParts.push(getRandomPhrase("med_loose_hypotension", ctx));
  }
  // 2. Запор + Гипертония (риск Вальсальвы)
  if (worstBristol <= 2 && ((sys !== null && sys >= 140) || (dia !== null && dia >= 90))) {
    messageParts.push(getRandomPhrase("med_constipation_hypertension", ctx));
  }
  // 3. Сбой ЖКТ + Стресс по Триаде
  const isTriadStress =
    triad.wellbeing === 'bad' && (triad.mood === 'bad' || triad.energy === 'high');
  if (symptoms.length > 0 && isTriadStress) {
    messageParts.push(getRandomPhrase("med_gut_stress_triad", ctx));
  }
  // 4. Диарея + Тахикардия (обезвоживание)
  if (worstBristol >= 6 && pulse !== null && pulse >= 100) {
    messageParts.push(getRandomPhrase("med_diarrhea_tachycardia", ctx));
  }
  // 5. Запор + Брадикардия
  if (worstBristol <= 2 && pulse !== null && pulse < 55) {
    messageParts.push(getRandomPhrase("med_constipation_bradycardia", ctx));
  }

  // ─────────────────────────────────────────────
  // БЛОК 7: Красные флаги (всегда)
  // ─────────────────────────────────────────────
  if (symptoms.includes("Кровь")) {
    messageParts.push(getRandomPhrase("red_flag_blood", ctx));
  }
  if (symptoms.includes("Боль") || symptoms.includes("Спазмы")) {
    messageParts.push(getRandomPhrase("red_flag_pain", ctx));
  }
  if (symptoms.includes("Слизь")) {
    messageParts.push(getRandomPhrase("red_flag_mucus", ctx));
  }

  // ─────────────────────────────────────────────
  // ВОЗВРАТ
  // ─────────────────────────────────────────────
  return messageParts.filter(Boolean).join('\n\n');
};