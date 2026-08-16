import type { SavedDish } from "../types/dishes";
import { DailyNutritionStore, parseFiniteMacro } from "./DailyNutritionStore";
import { toLocalDate, todayLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";

// ============================================================================
// B4 + B5: FoodSummary — минимальный read-only контракт питания за один день.
//
// Это НЕ UI, НЕ хранилище, НЕ API, НЕ второй дневной калькулятор.
// Модуль только собирает уже сохранённые SavedDish выбранного дня и
// переиспользует действующую строгую агрегацию (DailyNutritionStore) —
// без новой eligibility-логики, без микроэлементов, без эвристик.
//
// НЕ зависит от React. Не создаёт циклических импортов
// (DailyNutritionStore не импортирует этот файл).
// ============================================================================

/** Производный слот приёма пищи по локальному времени профиля. */
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

/** Компактный снимок одного сохранённого блюда дня. */
export interface FoodSummaryDish {
  id: string;
  name: string;
  category: string;
  isBookRecipe: boolean;
  /** Исходная персистентная метка времени (не перезаписывается summary). */
  createdAt: string | null;
  dayIndex: number | null;
  /** Уже сохранённые макросы/клетчатка, если валидны конечными числами (иначе null). */
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbohydrates: number | null;
  fiber: number | null;
  /** Проходит ли блюдо строгий macro-contract (все пять показателей валидны). */
  includedInStrictMacros: boolean;
  /** Снимок сохранённых ингредиентов блюда (как есть, без нормализации веса). */
  ingredients: { name: string; weight: string; status: string }[];
  /** Локальное время приёма (timezone профиля, "HH:MM") или null при отсутствии/невалидности createdAt. */
  timeLocal: string | null;
  /** Производный слот приёма пищи или null, если время недоступно. */
  mealSlot: MealSlot | null;
}

/** Уникальный ингредиент дня (снимок, без getFoodProfile/NUTRITION_DATABASE). */
export interface FoodSummaryIngredient {
  /** Первое исходное написание имени (для отображения). */
  name: string;
  /** Вес в граммах, только если уже сохранён валидным числом (см. правила B3.0). null иначе. */
  weightGrams: number | null;
  /** WFPB-статус как уже существующее сохранённое значение (без эвристики). */
  status: string | null;
}

export interface FoodSummary {
  /** Индекс дня курса, для которого построена сводка. */
  dayIndex: number;

  /** Строгие дневные КБЖУ — в точности totals из DailyNutritionStore. */
  strictTotals: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
    fiber: number;
  };

  /** Вчерашняя клетчатка (та же семантика, что и в utils/crossModuleSummary). */
  yesterdayFiber: number | null;

  /** Число фактически сохранённых блюд дня (включая legacy без полных макросов). */
  mealCount: number;
  /** Число блюд, вошедших в строгие macro totals. */
  strictMealCount: number;
  /** Компактный список всех сохранённых блюд дня. */
  dishes: FoodSummaryDish[];

  /** Уникальные ингредиенты дня (дедупликация по trim+lowercase имени). */
  ingredients: FoodSummaryIngredient[];
  uniqueIngredientCount: number;

  /** Время первого/последнего приёма пищи (timezone профиля, "HH:MM") или null. */
  firstMealAt: string | null;
  lastMealAt: string | null;
}

// ── Вспомогательное: локальное время профиля из createdAt ──

/**
 * Возвращает { hour, minute } в timezone профиля для валидной ISO-метки,
 * либо null для отсутствующей/невалидной createdAt. Никогда не бросает.
 */
function getLocalHM(createdAt: unknown): { hour: number; minute: number } | null {
  if (typeof createdAt !== "string" || createdAt.trim() === "") return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: getUserTimeZone(),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const hourStr = parts.find(p => p.type === "hour")?.value;
    const minStr = parts.find(p => p.type === "minute")?.value;
    if (hourStr == null || minStr == null) return null;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minStr, 10);
    if (hour === 24) hour = 0; // en-GB может выдать "24" для полуночи
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return { hour, minute };
  } catch {
    return null;
  }
}

function formatHM(hm: { hour: number; minute: number } | null): string | null {
  if (!hm) return null;
  const h = String(hm.hour).padStart(2, "0");
  const m = String(hm.minute).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * B5: Централизованный mapper слота приёма пищи по локальному часу профиля.
 * Единственное правило в проекте (ранее mealSlot-правила не существовало).
 * Границы слотов:
 *   05:00–10:59 → breakfast
 *   11:00–15:59 → lunch
 *   16:00–20:59 → dinner
 *   21:00–04:59 → snack
 */
export function deriveMealSlot(hm: { hour: number; minute: number } | null): MealSlot | null {
  if (!hm) return null;
  const { hour } = hm;
  if (hour >= 5 && hour <= 10) return "breakfast";
  if (hour >= 11 && hour <= 15) return "lunch";
  if (hour >= 16 && hour <= 20) return "dinner";
  return "snack"; // 21:00–23:59 и 00:00–04:59
}

/**
 * Фильтр блюд дня — канонически по dayIndex, с тем же legacy-fallback по createdAt
 * (только день 1), что и в DailyNutritionStore. Миксер исключается тем же правилом.
 * Здесь включаются ВСЕ сохранённые блюда дня (в т.ч. legacy без полных макросов),
 * т.к. mealCount = число реально сохранённых блюд.
 */
function filterDayDishes(savedDishes: SavedDish[], dayIndex: number): SavedDish[] {
  const todayStr = todayLocalDate(getUserTimeZone());
  return (savedDishes || []).filter((dish: any) => {
    if (dish.sourceType === "mixer" || dish.category === "Миксер") return false;
    if (dish.dayIndex !== undefined && dish.dayIndex !== null) {
      return dish.dayIndex === dayIndex || dish.current_day === dayIndex;
    }
    const dishDate = dish.createdAt
      ? toLocalDate(new Date(dish.createdAt), getUserTimeZone())
      : null;
    return dishDate === todayStr && dayIndex === 1;
  });
}

/**
 * Строит read-only FoodSummary для выбранного дня.
 *
 * @param savedDishes   Все сохранённые блюда пользователя (store.savedDishes).
 * @param dayIndex      Индекс дня курса, по которому строится сводка.
 * @param yesterdayFiber Уже вычисленное вчерашнее значение клетчатки
 *                       (та же семантика, что в utils/crossModuleSummary; не пересчитывается здесь).
 */
export function buildFoodSummary(
  savedDishes: SavedDish[],
  dayIndex: number,
  yesterdayFiber: number | null = null
): FoodSummary {
  // 1) Строгие totals — из действующего единого агрегатора (StateNow использует тот же путь).
  //    bookStates/recipes не влияют на факт еды после B3 → передаём пустые объекты.
  const agg = DailyNutritionStore.getDailyNutrition(savedDishes, dayIndex, {}, {});
  const strictTotals = {
    calories: agg.totalCalories,
    protein: agg.totalProtein,
    fat: agg.totalFat,
    carbohydrates: agg.totalCarbohydrates,
    fiber: agg.totalFiber,
  };
  const strictMealCount = agg.logs.length;

  // 2) Все реально сохранённые блюда дня (в т.ч. legacy без полных макросов).
  const dayDishes = filterDayDishes(savedDishes, dayIndex);

  // 3) Компактный снимок блюд + время/слот + флаг вхождения в строгие totals.
  const dishes: FoodSummaryDish[] = dayDishes.map((dish: any) => {
    const cal = parseFiniteMacro(dish.calories);
    const pro = parseFiniteMacro(dish.protein);
    const fat = parseFiniteMacro(dish.fat);
    const carb = parseFiniteMacro(dish.carbohydrates);
    const fiber = parseFiniteMacro(dish.fiber);
    const includedInStrictMacros =
      cal !== null && pro !== null && fat !== null && carb !== null && fiber !== null;

    const hm = getLocalHM(dish.createdAt);

    const ingredients = Array.isArray(dish.ingredients)
      ? dish.ingredients.map((i: any) => ({
          name: String(i?.name ?? ""),
          weight: String(i?.weight ?? ""),
          status: String(i?.status ?? ""),
        }))
      : [];

    return {
      id: String(dish.id),
      name: String(dish.name ?? ""),
      category: String(dish.category ?? ""),
      isBookRecipe: dish.isBookRecipe === true,
      createdAt: typeof dish.createdAt === "string" && dish.createdAt.trim() !== "" ? dish.createdAt : null,
      dayIndex: dish.dayIndex ?? null,
      calories: cal,
      protein: pro,
      fat: fat,
      carbohydrates: carb,
      fiber: fiber,
      includedInStrictMacros,
      ingredients,
      timeLocal: formatHM(hm),
      mealSlot: deriveMealSlot(hm),
    };
  });

  // 4) Уникальные ингредиенты дня — снимок, без getFoodProfile/NUTRITION_DATABASE.
  //    Дедупликация ТОЛЬКО по trim+lowercase; отображаемое имя — первое исходное написание.
  const seen = new Map<string, FoodSummaryIngredient>();
  for (const dish of dayDishes as any[]) {
    if (!Array.isArray(dish.ingredients)) continue;
    for (const ing of dish.ingredients) {
      const rawName = String(ing?.name ?? "");
      const key = rawName.trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) continue;
      const weightGrams = parseStoredWeightGrams(ing?.weight);
      const status = ing?.status != null && String(ing.status) !== "" ? String(ing.status) : null;
      seen.set(key, { name: rawName, weightGrams, status });
    }
  }
  const ingredients = Array.from(seen.values());

  // 5) Время первого/последнего приёма (хронологически по createdAt, timezone профиля).
  const timed = dayDishes
    .map((d: any) => (typeof d.createdAt === "string" && d.createdAt.trim() !== "" ? new Date(d.createdAt) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
  const firstMealAt = timed.length > 0 ? formatHM(getLocalHM(timed[0].toISOString())) : null;
  const lastMealAt = timed.length > 0 ? formatHM(getLocalHM(timed[timed.length - 1].toISOString())) : null;

  return {
    dayIndex,
    strictTotals,
    yesterdayFiber,
    mealCount: dayDishes.length,
    strictMealCount,
    dishes,
    ingredients,
    uniqueIngredientCount: ingredients.length,
    firstMealAt,
    lastMealAt,
  };
}

/**
 * Вес ингредиента для снимка: только явные граммы/килограммы (как B3.0 strict),
 * без конверсии "1 шт."/"1 ст. л."/"300 мл". Возвращает граммы или null.
 * Локальная копия строгого правила, чтобы не менять сигнатуру и не создавать
 * зависимость от внутренних (не экспортируемых) helper'ов DailyNutritionStore.
 */
function parseStoredWeightGrams(weightStr: unknown): number | null {
  if (typeof weightStr === "number") {
    return Number.isFinite(weightStr) && weightStr > 0 ? weightStr : null;
  }
  if (typeof weightStr !== "string") return null;
  const cleaned = weightStr.trim().toLowerCase();
  if (!cleaned) return null;

  const toNum = (raw: string): number | null => {
    const n = parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const collect = (re: RegExp): number[] => {
    const out: number[] = [];
    for (const m of cleaned.matchAll(re)) {
      const n = toNum(m[1]);
      if (n !== null) out.push(n);
    }
    return out;
  };

  const gramValues = collect(/(-?\d+(?:[.,]\d+)?)\s*г/g);
  if (gramValues.length === 1) return gramValues[0];
  if (gramValues.length > 1) return null;

  const kgValues = collect(/(-?\d+(?:[.,]\d+)?)\s*(?:кг|kg)/g);
  if (kgValues.length === 1) return kgValues[0] * 1000;
  if (kgValues.length > 1) return null;

  return null;
}
