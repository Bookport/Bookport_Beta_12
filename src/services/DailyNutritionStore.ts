import { getBookMacros } from "../utils/bookMacros";
// Unified daily WFPB nutrition aggregation center and calculation core.
// This file solves the architecture requirement of having a single engine
// that merges all eating tracks (Book, Photo recognition, Hand-written/DIY).

export interface NormalizedIngredient {
  name: string;
  weight: number; // in grams
  status: "green" | "yellow" | "red";
}

export interface DayNutritionLog {
  dishId: string;
  name: string;
  source: "Книга" | "Сделай сам" | "Разбор по фото";
  category: string;
  calories: number;
  protein: number;
  fat: number;
  carbohydrates: number;
  fiber: number;
  ingredients: NormalizedIngredient[];
  time?: string;
}

export interface DailyAggregationResult {
  logs: DayNutritionLog[];
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbohydrates: number;
  totalFiber: number;
  totalMassOfRational: number;
  aggregatedIngredients: { name: string; weight: number; status: "green" | "yellow" | "red" }[];
  vitamins: {
    vitA: number;
    vitC: number;
    vitB9: number;
    vitE: number;
    vitK: number;
  };
  minerals: {
    iron: number;
    magnesium: number;
    zinc: number;
    potassium: number;
    lysine: number;
    selenium: number;
  };
}

// Nutritional database for common WFPB ingredients (per 100 grams)
interface FoodProfile {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  vitA: number; // % of daily intake limit
  vitC: number;
  vitB9: number;
  vitE: number;
  vitK: number;
  iron: number;
  magnesium: number;
  zinc: number;
  potassium: number;
  lysine: number;
  selenium: number;
  defaultStatus: "green" | "yellow" | "red";
}

const NUTRITION_DATABASE: Record<string, FoodProfile> = {
  "нут": { calories: 140, protein: 9, fat: 1.5, carbs: 22, fiber: 7, vitA: 1, vitC: 2, vitB9: 45, vitE: 2, vitK: 3, iron: 18, magnesium: 12, zinc: 12, potassium: 8, lysine: 35, selenium: 10, defaultStatus: "green" },
  "чечевица": { calories: 116, protein: 9, fat: 0.4, carbs: 20, fiber: 8, vitA: 1, vitC: 3, vitB9: 45, vitE: 1, vitK: 4, iron: 19, magnesium: 10, zinc: 11, potassium: 10, lysine: 38, selenium: 8, defaultStatus: "green" },
  "фасоль": { calories: 120, protein: 8, fat: 0.5, carbs: 19, fiber: 7.5, vitA: 0.5, vitC: 2, vitB9: 35, vitE: 1, vitK: 5, iron: 15, magnesium: 11, zinc: 9, potassium: 9, lysine: 32, selenium: 7, defaultStatus: "green" },
  "тофу": { calories: 76, protein: 8, fat: 4.8, carbs: 1.9, fiber: 1.0, vitA: 2, vitC: 1, vitB9: 8, vitE: 3, vitK: 2, iron: 15, magnesium: 14, zinc: 8, potassium: 4, lysine: 25, selenium: 11, defaultStatus: "green" },
  "темпе": { calories: 193, protein: 18, fat: 11, carbs: 9, fiber: 1.5, vitA: 1, vitC: 0, vitB9: 10, vitE: 2, vitK: 2, iron: 12, magnesium: 18, zinc: 10, potassium: 11, lysine: 36, selenium: 12, defaultStatus: "green" },
  "киноа": { calories: 120, protein: 4.4, fat: 1.9, carbs: 21, fiber: 2.8, vitA: 0.5, vitC: 0, vitB9: 12, vitE: 5, vitK: 2, iron: 8, magnesium: 16, zinc: 7, potassium: 5, lysine: 11, selenium: 8, defaultStatus: "green" },
  "амарант": { calories: 103, protein: 3.8, fat: 1.6, carbs: 19, fiber: 2.1, vitA: 0.5, vitC: 2, vitB9: 14, vitE: 4, vitK: 3, iron: 12, magnesium: 15, zinc: 6, potassium: 4, lysine: 13, selenium: 7, defaultStatus: "green" },
  
  "шпинат": { calories: 23, protein: 2.9, fat: 0.4, carbs: 3.6, fiber: 2.2, vitA: 95, vitC: 45, vitB9: 48, vitE: 10, vitK: 480, iron: 15, magnesium: 20, zinc: 5, potassium: 16, lysine: 4, selenium: 2, defaultStatus: "green" },
  "зелень": { calories: 25, protein: 2.5, fat: 0.3, carbs: 3.5, fiber: 2.4, vitA: 80, vitC: 50, vitB9: 40, vitE: 12, vitK: 350, iron: 14, magnesium: 18, zinc: 4, potassium: 15, lysine: 3, selenium: 2, defaultStatus: "green" },
  "салат": { calories: 15, protein: 1.4, fat: 0.2, carbs: 2.9, fiber: 1.3, vitA: 70, vitC: 15, vitB9: 38, vitE: 2, vitK: 120, iron: 5, magnesium: 5, zinc: 2, potassium: 6, lysine: 1.5, selenium: 0.6, defaultStatus: "green" },
  "брокколи": { calories: 34, protein: 2.8, fat: 0.4, carbs: 6.6, fiber: 2.6, vitA: 12, vitC: 100, vitB9: 16, vitE: 4, vitK: 85, iron: 4, magnesium: 5, zinc: 3, potassium: 9, lysine: 8, selenium: 3, defaultStatus: "green" },
  "петрушка": { calories: 36, protein: 3.0, fat: 0.8, carbs: 6.3, fiber: 3.3, vitA: 105, vitC: 150, vitB9: 38, vitE: 6, vitK: 320, iron: 30, magnesium: 12, zinc: 6, potassium: 16, lysine: 4, selenium: 1, defaultStatus: "green" },
  "руккола": { calories: 25, protein: 2.6, fat: 0.7, carbs: 3.7, fiber: 1.6, vitA: 47, vitC: 25, vitB9: 24, vitE: 3, vitK: 110, iron: 8, magnesium: 12, zinc: 3, potassium: 10, lysine: 3, selenium: 1, defaultStatus: "green" },
  
  "яблоко": { calories: 52, protein: 0.3, fat: 0.2, carbs: 14, fiber: 2.4, vitA: 1, vitC: 8, vitB9: 1, vitE: 1, vitK: 2, iron: 1, magnesium: 1, zinc: 1, potassium: 3, lysine: 0.5, selenium: 0.3, defaultStatus: "green" },
  "банан": { calories: 89, protein: 1.1, fat: 0.3, carbs: 23, fiber: 2.6, vitA: 1.5, vitC: 12, vitB9: 5, vitE: 1, vitK: 1, iron: 2, magnesium: 9, zinc: 1.5, potassium: 10, lysine: 1.2, selenium: 1.5, defaultStatus: "green" },
  "груша": { calories: 57, protein: 0.4, fat: 0.1, carbs: 15, fiber: 3.1, vitA: 0.5, vitC: 7, vitB9: 2, vitE: 1.5, vitK: 4, iron: 1, magnesium: 2, zinc: 1, potassium: 3, lysine: 0.4, selenium: 0.2, defaultStatus: "green" },
  "черника": { calories: 57, protein: 0.7, fat: 0.3, carbs: 14, fiber: 2.4, vitA: 2, vitC: 16, vitB9: 2, vitE: 4, vitK: 16, iron: 2, magnesium: 2, zinc: 1, potassium: 2, lysine: 0.5, selenium: 0.5, defaultStatus: "green" },
  "апельсин": { calories: 47, protein: 0.9, fat: 0.1, carbs: 12, fiber: 2.4, vitA: 4, vitC: 88, vitB9: 8, vitE: 1, vitK: 0, iron: 1.5, magnesium: 2.5, zinc: 1, potassium: 5, lysine: 0.8, selenium: 0.7, defaultStatus: "green" },
  "ягоды": { calories: 43, protein: 0.8, fat: 0.3, carbs: 10, fiber: 2.5, vitA: 2, vitC: 30, vitB9: 6, vitE: 5, vitK: 10, iron: 3, magnesium: 4, zinc: 2, potassium: 4, lysine: 0.7, selenium: 0.4, defaultStatus: "green" },
  "сухофрукты": { calories: 240, protein: 2.2, fat: 0.5, carbs: 64, fiber: 7.2, vitA: 8, vitC: 5, vitB9: 1, vitE: 3, vitK: 6, iron: 10, magnesium: 8, zinc: 4, potassium: 15, lysine: 1.5, selenium: 1, defaultStatus: "green" },
  "тыква": { calories: 26, protein: 1.0, fat: 0.1, carbs: 6.5, fiber: 0.5, vitA: 170, vitC: 15, vitB9: 4, vitE: 5, vitK: 1, iron: 4, magnesium: 3, zinc: 2, potassium: 10, lysine: 1, selenium: 0.5, defaultStatus: "green" },
  "морковь": { calories: 41, protein: 0.9, fat: 0.2, carbs: 10, fiber: 2.8, vitA: 330, vitC: 10, vitB9: 5, vitE: 3, vitK: 11, iron: 2, magnesium: 3, zinc: 2, potassium: 9, lysine: 0.8, selenium: 0.5, defaultStatus: "green" },
  "кабачок": { calories: 17, protein: 1.2, fat: 0.3, carbs: 3.1, fiber: 1.0, vitA: 4, vitC: 30, vitB9: 6, vitE: 1, vitK: 5, iron: 2, magnesium: 4, zinc: 2, potassium: 7, lysine: 1, selenium: 0.2, defaultStatus: "green" },
  "картофель": { calories: 77, protein: 2.0, fat: 0.1, carbs: 17, fiber: 2.2, vitA: 0.2, vitC: 32, vitB9: 4, vitE: 0.5, vitK: 2, iron: 4, magnesium: 6, zinc: 2, potassium: 12, lysine: 1.6, selenium: 0.5, defaultStatus: "green" },
  "помидор": { calories: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.2, vitA: 17, vitC: 22, vitB9: 4, vitE: 3, vitK: 3, iron: 2, magnesium: 2.5, zinc: 1, potassium: 7, lysine: 0.8, selenium: 0.4, defaultStatus: "green" },
  "огурец": { calories: 15, protein: 0.7, fat: 0.1, carbs: 3.6, fiber: 0.5, vitA: 2, vitC: 5, vitB9: 2, vitE: 0.5, vitK: 14, iron: 1.5, magnesium: 3, zinc: 1, potassium: 4, lysine: 0.5, selenium: 0.2, defaultStatus: "green" },
  "авокадо": { calories: 160, protein: 2.0, fat: 14.6, carbs: 8.5, fiber: 6.7, vitA: 3, vitC: 17, vitB9: 20, vitE: 10, vitK: 26, iron: 3.5, magnesium: 7, zinc: 4, potassium: 14, lysine: 1.8, selenium: 0.8, defaultStatus: "green" },
  
  "семена льна": { calories: 534, protein: 18.3, fat: 42.1, carbs: 29, fiber: 27.3, vitA: 0, vitC: 1, vitB9: 22, vitE: 3, vitK: 1, iron: 32, magnesium: 98, zinc: 29, potassium: 23, lysine: 12, selenium: 36, defaultStatus: "green" },
  "миндаль": { calories: 579, protein: 21.1, fat: 49.9, carbs: 21.5, fiber: 12.5, vitA: 0, vitC: 0, vitB9: 11, vitE: 130, vitK: 0, iron: 20, magnesium: 67, zinc: 21, potassium: 20, lysine: 9, selenium: 4, defaultStatus: "green" },
  "льняное": { calories: 534, protein: 18.3, fat: 42.1, carbs: 29, fiber: 27.3, vitA: 0, vitC: 1, vitB9: 22, vitE: 3, vitK: 1, iron: 32, magnesium: 98, zinc: 29, potassium: 23, lysine: 12, selenium: 36, defaultStatus: "green" },
  "семена чиа": { calories: 486, protein: 16.5, fat: 30.7, carbs: 42, fiber: 34.4, vitA: 1, vitC: 2, vitB9: 12, vitE: 4, vitK: 1, iron: 43, magnesium: 84, zinc: 31, potassium: 11, lysine: 14, selenium: 70, defaultStatus: "green" },
  "кунжут": { calories: 573, protein: 17.7, fat: 49.7, carbs: 23.4, fiber: 11.8, vitA: 1, vitC: 0, vitB9: 24, vitE: 1, vitK: 0, iron: 80, magnesium: 88, zinc: 50, potassium: 13, lysine: 10, selenium: 45, defaultStatus: "green" },
  "кешью": { calories: 553, protein: 18.2, fat: 43.8, carbs: 30.2, fiber: 3.3, vitA: 0, vitC: 1, vitB9: 6, vitE: 5, vitK: 28, iron: 37, magnesium: 73, zinc: 38, potassium: 19, lysine: 15, selenium: 28, defaultStatus: "green" },
  "грецкий орех": { calories: 654, protein: 15.2, fat: 65.2, carbs: 13.7, fiber: 6.7, vitA: 0.5, vitC: 2, vitB9: 24, vitE: 15, vitK: 3, iron: 16, magnesium: 39, zinc: 21, potassium: 13, lysine: 8, selenium: 9, defaultStatus: "green" },
  
  "лук": { calories: 40, protein: 1.1, fat: 0.1, carbs: 9.3, fiber: 1.7, vitA: 0.1, vitC: 12, vitB9: 5, vitE: 0.2, vitK: 0.5, iron: 1.5, magnesium: 2.5, zinc: 1, potassium: 4, lysine: 0.7, selenium: 0.5, defaultStatus: "green" },
  "чеснок": { calories: 149, protein: 6.4, fat: 0.5, carbs: 33, fiber: 2.1, vitA: 0.2, vitC: 52, vitB9: 1, vitE: 0.5, vitK: 1, iron: 9, magnesium: 6, zinc: 8, potassium: 11, lysine: 3.5, selenium: 20, defaultStatus: "green" },
  "масло": { calories: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, vitA: 0, vitC: 0, vitB9: 0, vitE: 40, vitK: 60, iron: 0, magnesium: 0, zinc: 0, potassium: 0, lysine: 0, selenium: 0, defaultStatus: "yellow" },
  "соль": { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, vitA: 0, vitC: 0, vitB9: 0, vitE: 0, vitK: 0, iron: 0, magnesium: 0, zinc: 0, potassium: 0, lysine: 0, selenium: 0, defaultStatus: "yellow" },
  "сахар": { calories: 387, protein: 0, fat: 0, carbs: 100, fiber: 0, vitA: 0, vitC: 0, vitB9: 0, vitE: 0, vitK: 0, iron: 0, magnesium: 0, zinc: 0, potassium: 0, lysine: 0, selenium: 0, defaultStatus: "red" },
  "уксус": { calories: 22, protein: 0, fat: 0, carbs: 0.9, fiber: 0, vitA: 0, vitC: 0, vitB9: 0, vitE: 0, vitK: 0, iron: 1, magnesium: 1, zinc: 0, potassium: 2, lysine: 0, selenium: 0, defaultStatus: "yellow" },
};

// Fallback profile if ingredient is unrecognized
const DEFAULT_PROFILE: FoodProfile = {
  calories: 45, protein: 1.0, fat: 0.2, carbs: 9.0, fiber: 1.8,
  vitA: 5, vitC: 8, vitB9: 5, vitE: 2, vitK: 5,
  iron: 3, magnesium: 4, zinc: 3, potassium: 4, lysine: 1.5, selenium: 1.5,
  defaultStatus: "green"
};

/**
 * Searches the profile database using fuzzy-like matches
 */
export function getFoodProfile(ingredientName: string): FoodProfile {
  const norm = ingredientName.trim().toLowerCase();
  
  // Try exact match first
  if (NUTRITION_DATABASE[norm]) {
    return NUTRITION_DATABASE[norm];
  }
  
  // Try partial match key
  for (const key of Object.keys(NUTRITION_DATABASE)) {
    if (norm.includes(key) || key.includes(norm)) {
      return NUTRITION_DATABASE[key];
    }
  }
  
  // General high-level sub-strings
  if (norm.includes("зел") || norm.includes("петруш") || norm.includes("укроп") || norm.includes("салат") || norm.includes("кинз") || norm.includes("мята")) {
    return NUTRITION_DATABASE["зелень"];
  }
  if (norm.includes("орех") || norm.includes("миндаль") || norm.includes("кешью") || norm.includes("фундук") || norm.includes("семечки")) {
    return NUTRITION_DATABASE["миндаль"];
  }
  if (norm.includes("круп") || norm.includes("пшен") || norm.includes("греч") || norm.includes("овсян") || norm.includes("рис") || norm.includes("геркулес") || norm.includes("крупа") || norm.includes("хлопья")) {
    return NUTRITION_DATABASE["киноа"];
  }
  if (norm.includes("нут") || norm.includes("боб") || norm.includes("фасол") || norm.includes("чечевиц") || norm.includes("горох")) {
    return NUTRITION_DATABASE["чечевица"];
  }
  if (norm.includes("ягод") || norm.includes("черник") || norm.includes("клубник") || norm.includes("малин") || norm.includes("вишн")) {
    return NUTRITION_DATABASE["черника"];
  }
  if (norm.includes("яблоко") || norm.includes("яблок")) {
    return NUTRITION_DATABASE["яблоко"];
  }
  if (norm.includes("апельсин") || norm.includes("цитрус") || norm.includes("лимон") || norm.includes("грейпфр")) {
    return NUTRITION_DATABASE["апельсин"];
  }
  if (norm.includes("банан")) {
    return NUTRITION_DATABASE["банан"];
  }
  if (norm.includes("капуст") || norm.includes("броккол") || norm.includes("цветн")) {
    return NUTRITION_DATABASE["брокколи"];
  }
  if (norm.includes("томат") || norm.includes("помидор")) {
    return NUTRITION_DATABASE["помидор"];
  }
  if (norm.includes("авокад")) {
    return NUTRITION_DATABASE["авокадо"];
  }
  if (norm.includes("масл") || norm.includes("оливы") || norm.includes("жир")) {
    return NUTRITION_DATABASE["масло"];
  }
  if (norm.includes("соль") || norm.includes("солен")) {
    return NUTRITION_DATABASE["соль"];
  }
  if (norm.includes("сахар") || norm.includes("сироп")) {
    return NUTRITION_DATABASE["сахар"];
  }

  return DEFAULT_PROFILE;
}

/**
 * Extracts a numeric value for weight in grams from strings like "120 г", "0.5 кг", "75g", etc.
 */
export function parseWeightGrams(weightStr: string): number {
  if (!weightStr) return 75;
  const cleaned = weightStr.trim().toLowerCase();
  
  // Extract number
  const numMat = cleaned.match(/([0-9]+[.,]?[0-9]*)/);
  if (!numMat) return 75;
  
  const value = parseFloat(numMat[1].replace(",", "."));
  if (isNaN(value)) return 75;

  if (cleaned.includes("кг") || cleaned.includes("kg")) {
    return value * 1000;
  }
  
  // Handful or piece heuristic
  if (cleaned.includes("ст.л") || cleaned.includes("ст. л") || cleaned.includes("ложка")) {
    return value * 15;
  }
  if (cleaned.includes("ч.л") || cleaned.includes("ч. л")) {
    return value * 5;
  }
  if (cleaned.includes("шт") || cleaned.includes("зуб") || cleaned.includes("дол")) {
    // Piece weights depending on the likely size
    return value * 40;
  }
  if (cleaned.includes("горст") || cleaned.includes("стакан")) {
    return value * 100;
  }
  
  return value; // Assume grams
}

/**
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

        // Add up real biological microminerals mathematically
        const profile = getFoodProfile(ing.name);
        const fraction = weightNum / 100;

        dayVitA += profile.vitA * fraction;
        dayVitC += profile.vitC * fraction;
        dayVitB9 += profile.vitB9 * fraction;
        dayVitE += profile.vitE * fraction;
        dayVitK += profile.vitK * fraction;

        dayIron += profile.iron * fraction;
        dayMagnesium += profile.magnesium * fraction;
        dayZinc += profile.zinc * fraction;
        dayPotassium += profile.potassium * fraction;
        dayLysine += profile.lysine * fraction;
        daySelenium += profile.selenium * fraction;
      });
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
        vitA: Math.min(250, parseFloat(dayVitA.toFixed(1))),
        vitC: Math.min(250, parseFloat(dayVitC.toFixed(1))),
        vitB9: Math.min(250, parseFloat(dayVitB9.toFixed(1))),
        vitE: Math.min(250, parseFloat(dayVitE.toFixed(1))),
        vitK: Math.min(250, parseFloat(dayVitK.toFixed(1))),
      },
      minerals: {
        iron: Math.min(250, parseFloat(dayIron.toFixed(1))),
        magnesium: Math.min(250, parseFloat(dayMagnesium.toFixed(1))),
        zinc: Math.min(250, parseFloat(dayZinc.toFixed(1))),
        potassium: Math.min(250, parseFloat(dayPotassium.toFixed(1))),
        lysine: Math.min(250, parseFloat(dayLysine.toFixed(1))),
        selenium: Math.min(250, parseFloat(daySelenium.toFixed(1))),
      }
    };
  }
}
