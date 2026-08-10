// src/utils/digestionCoaching.ts

import { DigestionContext, DIGESTION_PHRASES, getRandomPhrase } from "./digestionPhrases";
import { DailySummary } from "./crossModuleSummary";
import { useAppStore } from "../store/useAppStore";

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

  // Нет данных о ЖКТ — возвращаем нейтральные фразы
  if (!digestion || digestion.episodes === 0 || worstBristol === null) {
    const noDataMessages = [
      `За этот день у тебя нет записей о пищеварении, ${userName ? userName : 'друг'}. Когда добавишь лог стула, Анна разберёт его вместе с твоим вчерашним меню.`,
      `Пока нет данных для анализа ЖКТ. Зафиксируй стул по Бристольской шкале — и я соединю его с твоими вчерашними блюдами.`,
    ];
    return noDataMessages[Math.floor(Math.random() * noDataMessages.length)];
  }

  // ─────────────────────────────────────────────
  // ШАГ 1: Извлечение вчерашней еды (Пищевой детектив)
  // ─────────────────────────────────────────────
  const { yesterdayIngredients, problemDishName, hasForbidden } = extractYesterdayFood(summary.dayIndex);

  const ctx: DigestionContext = {
    userName,
    userGender: (userGender === "female" ? "female" : userGender === "male" ? "male" : undefined),
    summary,
    problemDishName,
  };

  // ─────────────────────────────────────────────
  // ШАГ 2: Блок 1 — Бристольская шкала
  // ─────────────────────────────────────────────
  const bristolKey = `bristol_${worstBristol}` as keyof typeof DIGESTION_PHRASES;
  if (DIGESTION_PHRASES[bristolKey]) {
    messageParts.push(getRandomPhrase(bristolKey, ctx));
  }

  const symptoms = digestion.symptoms || [];

  // ─────────────────────────────────────────────
  // ШАГ 3: Блок 2 — Анализ Еды + Симптомы
  // ─────────────────────────────────────────────
  if (yesterdayIngredients.length > 0) {
    // Запрещёнка
    if (hasForbidden) {
      messageParts.push(getRandomPhrase("food_forbidden", ctx));
    }

    // ФОДМАП: вздутие/газы + специфические продукты
    const hasFoamMapSymptom = symptoms.some(s => s === "Вздутие" || s === "Газы");
    if (hasFoamMapSymptom && hasKeyword(yesterdayIngredients, FODMAP_KEYWORDS)) {
      messageParts.push(getRandomPhrase("food_fodmap", ctx));
    }

    // Крахмалы: запор + плотная пища
    if (worstBristol <= 2 && hasKeyword(yesterdayIngredients, STARCH_KEYWORDS)) {
      messageParts.push(getRandomPhrase("food_starch", ctx));
    }

    // Сырое: диарея + сырые плоды/овощи
    if (worstBristol >= 6 && hasKeyword(yesterdayIngredients, RAW_KEYWORDS)) {
      messageParts.push(getRandomPhrase("food_raw", ctx));
    }
  }

  // ─────────────────────────────────────────────
  // ШАГ 4: Блок 3 — Кросс-модульность (Вода и Движение)
  // ─────────────────────────────────────────────
  if (worstBristol <= 2) {
    if (water.status === "deficit") {
      messageParts.push(getRandomPhrase("water_deficit_constipation", ctx));
    }
    if (movement.status === "sedentary") {
      messageParts.push(getRandomPhrase("movement_deficit_constipation", ctx));
    }
  }

  // ─────────────────────────────────────────────
  // ШАГ 5: Блок 4 — Красные флаги
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
  // ШАГ 6: Возврат результата
  // ─────────────────────────────────────────────
  return messageParts.filter(Boolean).join('\n\n');
};