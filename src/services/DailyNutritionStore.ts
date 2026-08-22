import { getBookMacros } from "../utils/bookMacros";
// Unified daily WFPB nutrition aggregation center and calculation core.
// This file solves the architecture requirement of having a single engine
// that merges all eating tracks (Book, Photo recognition, Hand-written/DIY).

 * B3: Строгая нормализация обязательного макронутриента.
 * Принимает число или строку вида "16,7 г" / "16.7" и возвращает конечное число,
 * либо null, если значение отсутствует/непарсимо/не конечно.
 * Валидный 0 сохраняется (0 — корректное значение, не ошибка).
 *
 * B4: экспортируется для переиспользования в FoodSummary — единый strict macro contract,
 * без дублирования eligibility-логики. Поведение не изменено.
 */
export function parseFiniteMacro(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(",", ".").replace(/[^\d.\-]/g, "");
    if (cleaned.trim() === "") return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * B3.0: Строгий парсинг веса ингредиента в граммы БЕЗ фиктивного дефолта и БЕЗ
 * эвристических коэффициентов единиц.
 *
 * Порядок разбора:
 *   1. Явные граммы в любой части строки (число + "г", исключая "кг"/"мг"). Единственное
 *      граммовое значение → используется как вес. Несколько разных → null (не гадаем).
 *   2. Если граммов нет — явные килограммы (число + "кг"/"kg"), умноженные на 1000.
 *      Единственное значение → используется; несколько → null.
 *   3. Иначе (шт., ст. л., ч. л., горсть, мл, число без единицы и т.п.) → null.
 *
 * Возвращает конечное положительное число граммов или null.
 */
function parseStrictWeightGrams(weightStr: unknown): number | null {
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

  // 1) Граммы: число + "г", НО не "кг" и не "мг" (перед 'г' идёт другая буква единицы).
  //    \s* допускает пробел между числом и единицей. Ведущий минус отсекается toNum (n > 0).
  const gramValues = collect(/(-?\d+(?:[.,]\d+)?)\s*г/g);
  if (gramValues.length === 1) return gramValues[0];
  if (gramValues.length > 1) {
    // Несколько граммовых значений — однозначно определить вес ингредиента нельзя.
    return null;
  }

  // 2) Килограммы: число + "кг"/"kg".
  const kgValues = collect(/(-?\d+(?:[.,]\d+)?)\s*(?:кг|kg)/g);
  if (kgValues.length === 1) return kgValues[0] * 1000;
  if (kgValues.length > 1) return null;

  // 3) Любая другая единица без явных граммов/килограммов — веса не даёт.
  return null;
}

// B4: перевод абсолютного значения нутриента в процент суточной нормы.
// Единицы сохраняемых полей должны совпадать с единицами DAILY_VALUES
// (минералы в мг, витамины в мг/мкг, аминокислоты в мг).
function pctOfDaily(value: number, daily: number | null | undefined): number {
  if (daily == null || daily <= 0) return 0;
  return (value / daily) * 100;
}

/**
 7123309 (feat(book): compiled registry, F-sync, each-split, technical guard, approved excluded, BUILD-1 partial fix)
 * Universal Core Engine: parses any dish (Book recipe or Scanned custom dish) and converts it to standard DayNutritionLog
 */
export class DailyNutritionStore {
  
  /**
   * Aggregates cooked courses in the day across ALL components
   */
  public static getDailyNutrition(
    savedDishes: any[], 
    currentDayIndex: number,
    bookStates: {
      breakfast?: Record<number, any>;
      lunch?: Record<number, any>;
      dinner?: Record<number, any>;
      mustHave?: Record<number, any>;
      compliments?: Record<number, any>;
      recipeOfDay?: Record<number, any>;
      drinks?: Record<number, any>;
    },
    recipes: {
      breakfast?: any[];
      lunch?: any[];
      dinner?: any[];
      mustHave?: any[];
      compliments?: any[];
      recipeOfDay?: any[];
      drinks?: any[];
    }
  ): DailyAggregationResult {
    
    const logs: DayNutritionLog[] = [];

    // ==========================================
    // MODULE 1: READY BOOK RECIPES (from LocalStorage)
    // ==========================================
    const checkAndPushBookRecipe = (
      recipeList: any[] | undefined,
      stateMap: Record<number, any> | undefined,
      categoryName: string,
      defaultHour: string,
      refType: string
    ) => {
      if (!recipeList || !stateMap) return;
      
      const todayRecipe = recipeList.find(r => r.id === currentDayIndex || r.day === currentDayIndex);
      if (todayRecipe && stateMap[todayRecipe.id]?.status === "cooked") {
        const ingredientsText = todayRecipe.ingredients || "";
        const ingLines = ingredientsText.split(",").map((i: string) => i.trim()).filter(Boolean);
        
        const mappedIngs: NormalizedIngredient[] = ingLines.map((ingName: string) => {
          const weightNum = parseWeightGrams(ingName);
          const profile = getFoodProfile(ingName);
          
          return {
            name: ingName.charAt(0).toUpperCase() + ingName.slice(1),
            weight: weightNum,
            status: profile.defaultStatus
          };
        });

        // Use exact macros from the database/back data
        const exactMacros = getBookMacros(refType, todayRecipe.id);
        
        let dishCalories = exactMacros.calories;
        let dishProtein = parseFloat(exactMacros.protein);
        let dishFat = parseFloat(exactMacros.fat);
        let dishCarb = parseFloat(exactMacros.carbohydrates);
        let dishFiber = parseFloat(exactMacros.fiber);
        
        if (refType === "drinks") {
          dishCalories = 0; dishProtein = 0; dishFat = 0; dishCarb = 0; dishFiber = 0;
        } else {
          if (dishCalories === 0) dishCalories = 180;
          if (isNaN(dishProtein)) dishProtein = 6;
          if (isNaN(dishFat)) dishFat = 2.5;
          if (isNaN(dishFiber)) dishFiber = 4.5;
          if (isNaN(dishCarb)) {
             dishCarb = Math.round((dishCalories - (dishProtein * 4) - (dishFat * 9)) / 4);
             if (dishCarb < dishFiber) dishCarb = Math.round(dishFiber + 10);
          }
        }

        logs.push({
          dishId: `book-${categoryName}-${todayRecipe.id}`,
          name: todayRecipe.technicalName || todayRecipe.name,
          source: "Книга",
          category: categoryName,
          calories: Math.round(dishCalories),
          protein: parseFloat(dishProtein.toFixed(1)),
          fat: parseFloat(dishFat.toFixed(1)),
          carbohydrates: parseFloat(dishCarb.toFixed(1)),
          fiber: parseFloat(dishFiber.toFixed(1)),
          ingredients: mappedIngs,
          time: defaultHour
        });
      }
    };

    // Parse all Book Recipies
    checkAndPushBookRecipe(recipes.breakfast, bookStates.breakfast, "Завтраки", "08:30", "breakfast");
    checkAndPushBookRecipe(recipes.lunch, bookStates.lunch, "Супы и Салаты", "13:30", "lunch");
    checkAndPushBookRecipe(recipes.dinner, bookStates.dinner, "Основные блюда", "19:00", "dinner");
    checkAndPushBookRecipe(recipes.mustHave, bookStates.mustHave, "Полезное", "11:00", "must_have");
    checkAndPushBookRecipe(recipes.recipeOfDay, bookStates.recipeOfDay, "Блюдо дня", "16:00", "recipe_of_day");
    checkAndPushBookRecipe(recipes.drinks, bookStates.drinks, "Напитки", "10:00", "drinks");
    checkAndPushBookRecipe(recipes.compliments, bookStates.compliments, "Комплименты", "17:30", "compliment");

    // ==========================================
    // MODULE 2: HAND-SAVED & PHOTO-SCANNED DISHES
    // ==========================================
    const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" });
    const todayCustomDishes = (savedDishes || []).filter(dish => {
      // Исключаем блюда Миксера — они не должны влиять на дневную аналитику
      if (dish.sourceType === "mixer" || dish.category === "Миксер") return false;
      // Строгая фильтрация по индексу дня (календарю)
      if (dish.dayIndex !== undefined && dish.dayIndex !== null) {
        return dish.dayIndex === currentDayIndex || (dish as any).current_day === currentDayIndex;
      }
      // Фолбэк для совсем старых блюд без dayIndex
      const dishDate = dish.createdAt ? new Date(dish.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" }) : null;
      return dishDate === todayStr && currentDayIndex === 1; // Только если это первый день и нет dayIndex
    });

    todayCustomDishes.forEach(dish => {
      // Calculate or parse macros
      const rawCal = typeof dish.calories === "number" ? dish.calories : (parseInt(dish.calories, 10) || 190);
      const rawPro = typeof dish.protein === "number" ? dish.protein : (parseFloat(dish.protein) || 5.5);
      const rawFat = typeof dish.fat === "number" ? dish.fat : (parseFloat(dish.fat) || 2.8);
      const rawFiber = typeof dish.fiber === "number" ? dish.fiber : (parseFloat(dish.fiber) || 4.8);
      let rawCarb = 0;
      if (dish.carbohydrates !== undefined) {
        rawCarb = typeof dish.carbohydrates === "number" ? dish.carbohydrates : (parseFloat(dish.carbohydrates) || 30);
      } else {
        rawCarb = Math.round((rawCal - (rawPro * 4) - (rawFat * 9)) / 4);
        if (rawCarb < rawFiber) rawCarb = Math.round(rawFiber + 10);
      }

      // Format ingredients lists — support book recipes saved without ingredients
      let rawIngs = dish.ingredients || [];
      if ((!rawIngs || rawIngs.length === 0) && dish.isBookRecipe && dish.bookRecipeRef) {
        const RECIPES_KEY_MAP: Record<string, string> = {
          breakfast: "breakfast",
          lunch: "lunch",
          dinner: "dinner",
          must_have: "mustHave",
          compliment: "compliments",
          recipe_of_day: "recipeOfDay",
          drinks: "drinks",
        };
        const refType = dish.bookRecipeRef.type;
        const refId = dish.bookRecipeRef.id;
        const recipesKey = RECIPES_KEY_MAP[refType];
        if (recipesKey && refId != null) {
          const recipeList = (recipes as any)[recipesKey];
          if (recipeList) {
            const recipeDef = recipeList.find((r: any) => r.id === refId || r.day === refId);
            if (recipeDef?.ingredients) {
              rawIngs = recipeDef.ingredients
                .split(",")
                .map((i: string) => i.trim())
                .filter(Boolean)
                .map((ingName: string) => ({
                  name: ingName.charAt(0).toUpperCase() + ingName.slice(1),
                  weight: String(Math.round(parseWeightGrams(ingName))) + " г",
                  status: getFoodProfile(ingName).defaultStatus,
                }));
            }
          }
        }
      }
      const mappedIngs: NormalizedIngredient[] = rawIngs.map((i: any) => {
        const weightNum = parseWeightGrams(i.weight);
        const profile = getFoodProfile(i.name);
        return {
          name: i.name.charAt(0).toUpperCase() + i.name.slice(1).trim(),
          weight: weightNum,
          status: i.status || profile.defaultStatus
        };
      });

      // Avoid duplication if book recipes were stored directly in state
      if (!logs.some(l => l.name === dish.name && l.source === "Книга")) {
        logs.push({
          dishId: dish.id,
          name: dish.name,
          source: (dish.id.includes("custom") && dish.annaTip) ? "Разбор по фото" : "Сделай сам",
          category: dish.category || "Сделай сам",
          calories: rawCal,
          protein: rawPro,
          fat: rawFat,
          carbohydrates: rawCarb,
          fiber: rawFiber,
          ingredients: mappedIngs,
          time: dish.time || "14:00"
        });
      }

      // B4: для любого блюда с реальным extended-профилем микро берём из
      // сохранённых абсолютных значений (серверный resolver), а не из getFoodProfile-эвристик.
      const extendedMicros = hasRealExtendedNutrientProfile(dish)
        ? {
              vitA: Number(dish.vitaminA) || 0,
              vitC: Number(dish.vitaminC) || 0,
              vitB9: Number(dish.folate) || 0,
              vitE: Number(dish.vitaminE) || 0,
              vitK: Number(dish.vitaminK) || 0,
              iron: Number(dish.iron) || 0,
              magnesium: Number(dish.magnesium) || 0,
              zinc: Number(dish.zinc) || 0,
              potassium: Number(dish.potassium) || 0,
              lysine: Number(dish.lysine) || 0,
              selenium: Number(dish.selenium) || 0,
            }
          : null;

      logs.push({
        dishId: dish.id,
        name: dish.name,
        source: (dish.id.includes("custom") && dish.annaTip) ? "Разбор по фото" : "Сделай сам",
        category: dish.category || "Сделай сам",
        calories: cal,
        protein: pro,
        fat: fat,
        carbohydrates: carb,
        fiber: fiber,
        ingredients: mappedIngs,
        time: dish.time || "14:00",
        // B2: блюдо без реального extended nutrient profile — только КБЖУ-оценка.
        // Исключается из микро-агрегации, но остаётся в КБЖУ/составе дня.
        excludeFromMicro: !hasRealExtendedNutrientProfile(dish),
        extendedMicros,
      });
>>>>>>> 7123309 (feat(book): compiled registry, F-sync, each-split, technical guard, approved excluded, BUILD-1 partial fix)
    });

    // ==========================================
    // AGGREGATION & CROSS-SUM CALCULATIONS
    // ==========================================
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbohydrates = 0;
    let totalFiber = 0;

    let dayVitA = 0;
    let dayVitC = 0;
    let dayVitB9 = 0;
    let dayVitE = 0;
    let dayVitK = 0;
    
    let dayIron = 0;
    let dayMagnesium = 0;
    let dayZinc = 0;
    let dayPotassium = 0;
    let dayLysine = 0;
    let daySelenium = 0;

    const ingSummaryMap: Record<string, { weight: number; status: "green" | "yellow" | "red" }> = {};

    logs.forEach(log => {
      totalCalories += log.calories;
      totalProtein += log.protein;
      totalFat += log.fat;
      totalCarbohydrates += log.carbohydrates;
      totalFiber += log.fiber;

      log.ingredients.forEach(ing => {
        const canonical = ing.name.charAt(0).toUpperCase() + ing.name.slice(1).trim();
        const weightNum = ing.weight;

        // Add up visual raw weights
        if (ingSummaryMap[canonical]) {
          ingSummaryMap[canonical].weight += weightNum;
        } else {
          ingSummaryMap[canonical] = { weight: weightNum, status: ing.status };
        }
      });

      // B2: блюда без заполненного extended nutrient profile не кормят
      // микро-агрегацию (никаких getFoodProfile/default-профилей для их ингредиентов).
      if (log.excludeFromMicro) return;

      // B4: реальные extended-значения из БД вместо эвристик.
      if (log.extendedMicros) {
        dayVitA += log.extendedMicros.vitA;
        dayVitC += log.extendedMicros.vitC;
        dayVitB9 += log.extendedMicros.vitB9;
        dayVitE += log.extendedMicros.vitE;
        dayVitK += log.extendedMicros.vitK;

        dayIron += log.extendedMicros.iron;
        dayMagnesium += log.extendedMicros.magnesium;
        dayZinc += log.extendedMicros.zinc;
        dayPotassium += log.extendedMicros.potassium;
        dayLysine += log.extendedMicros.lysine;
        daySelenium += log.extendedMicros.selenium;
        return;
      }
    });

    // Format final sorted list of unique ingredients
    const aggregatedIngredients = Object.keys(ingSummaryMap).map(name => ({
      name,
      weight: Math.round(ingSummaryMap[name].weight),
      status: ingSummaryMap[name].status
    })).sort((a, b) => b.weight - a.weight);

    const totalMassOfRational = aggregatedIngredients.reduce((sum, item) => sum + item.weight, 0);

    return {
      logs,
      totalCalories: Math.round(totalCalories),
      totalProtein: parseFloat(totalProtein.toFixed(1)),
      totalFat: parseFloat(totalFat.toFixed(1)),
      totalCarbohydrates: parseFloat(totalCarbohydrates.toFixed(1)),
      totalFiber: parseFloat(totalFiber.toFixed(1)),
      totalMassOfRational,
      aggregatedIngredients,
      vitamins: {
        vitA: Math.min(250, parseFloat(pctOfDaily(dayVitA, DAILY_VALUES.vitaminA).toFixed(1))),
        vitC: Math.min(250, parseFloat(pctOfDaily(dayVitC, DAILY_VALUES.vitaminC).toFixed(1))),
        vitB9: Math.min(250, parseFloat(pctOfDaily(dayVitB9, DAILY_VALUES.folate).toFixed(1))),
        vitE: Math.min(250, parseFloat(pctOfDaily(dayVitE, DAILY_VALUES.vitaminE).toFixed(1))),
        vitK: Math.min(250, parseFloat(pctOfDaily(dayVitK, DAILY_VALUES.vitaminK).toFixed(1))),
      },
      minerals: {
        iron: Math.min(250, parseFloat(pctOfDaily(dayIron, DAILY_VALUES.iron).toFixed(1))),
        magnesium: Math.min(250, parseFloat(pctOfDaily(dayMagnesium, DAILY_VALUES.magnesium).toFixed(1))),
        zinc: Math.min(250, parseFloat(pctOfDaily(dayZinc, DAILY_VALUES.zinc).toFixed(1))),
        potassium: Math.min(250, parseFloat(pctOfDaily(dayPotassium, DAILY_VALUES.potassium).toFixed(1))),
        lysine: Math.min(250, parseFloat(pctOfDaily(dayLysine * 1000, DAILY_VALUES.lysine).toFixed(1))),
        selenium: Math.min(250, parseFloat(pctOfDaily(daySelenium, DAILY_VALUES.selenium).toFixed(1))),
      },
      hasPartialBookDishes: logs.some(log => log.excludeFromMicro),
      // BUILD-1: partial-блюда не скрывают профиль realProfile-блюд.
      realProfileCount: logs.filter(log => !log.excludeFromMicro).length,
      hasAnyRealMicronutrientProfile: logs.some(log => !log.excludeFromMicro),
    };
  }
}
