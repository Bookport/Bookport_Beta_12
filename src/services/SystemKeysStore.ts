// SystemKeysStore.ts
// Real-time tracking core for "System Keys" (Ключи системы)
// Integrates automatic ingredient parsing from DailyNutritionStore with manual additions.

import { DailyNutritionStore } from "./DailyNutritionStore";
import { 
  BREAKFAST_RECIPES, 
  LUNCH_RECIPES, 
  DINNER_RECIPES, 
  MUST_HAVE_RECIPES, 
  RECIPE_OF_DAY_RECIPES, 
  DRINKS_RECIPES, 
  COMPLIMENTS_RECIPES 
} from "../components/BookRecipesScreen";

export interface SystemKeyDefinition {
  id: string;
  num: number;
  name: string;
  emoji: string;
  category: "product" | "action";
  optimum: number;
  maxCircles: number;
  hasSuperlevel?: boolean;
  portionSizeInGrams: number;
}

export const SYSTEM_KEY_DEFS: SystemKeyDefinition[] = [
  { id: "legumes", num: 1, name: "Бобовые", emoji: "🫘", category: "product", optimum: 2, maxCircles: 2, hasSuperlevel: true, portionSizeInGrams: 50 },
  { id: "whole_grains", num: 2, name: "Цельные злаки", emoji: "🌾", category: "product", optimum: 2, maxCircles: 2, hasSuperlevel: false, portionSizeInGrams: 40 },
  { id: "vegetables", num: 3, name: "Овощи", emoji: "🥕", category: "product", optimum: 4, maxCircles: 4, hasSuperlevel: true, portionSizeInGrams: 80 },
  { id: "leafy_greens", num: 4, name: "Листовые овощи и зелень", emoji: "🌿", category: "product", optimum: 5, maxCircles: 5, hasSuperlevel: true, portionSizeInGrams: 40 },
  { id: "nuts", num: 5, name: "Орехи", emoji: "🌰", category: "product", optimum: 1, maxCircles: 1, hasSuperlevel: false, portionSizeInGrams: 15 },
  { id: "seeds", num: 6, name: "Семена", emoji: "🌻", category: "product", optimum: 1, maxCircles: 1, hasSuperlevel: false, portionSizeInGrams: 15 },
  { id: "ground_flax", num: 7, name: "Молотый лён", emoji: "🤎", category: "product", optimum: 2, maxCircles: 2, hasSuperlevel: false, portionSizeInGrams: 8 },
  { id: "spices", num: 8, name: "Травы и специи", emoji: "🌶️", category: "product", optimum: 3, maxCircles: 3, hasSuperlevel: false, portionSizeInGrams: 1.5 },
  { id: "fruits", num: 9, name: "Фрукты", emoji: "🍎", category: "product", optimum: 1, maxCircles: 1, hasSuperlevel: false, portionSizeInGrams: 120 },
  { id: "berries", num: 10, name: "Ягоды", emoji: "🍇", category: "product", optimum: 1, maxCircles: 1, hasSuperlevel: true, portionSizeInGrams: 80 },
  { id: "sprouts", num: 11, name: "Проростки", emoji: "🌱", category: "product", optimum: 1, maxCircles: 1, hasSuperlevel: true, portionSizeInGrams: 30 },
  { id: "must_have", num: 12, name: "MUST HAVE (ферментированные продукты)", emoji: "🧄", category: "product", optimum: 1, maxCircles: 1, hasSuperlevel: false, portionSizeInGrams: 50 },
  { id: "healthy_drinks", num: 13, name: "Полезные напитки", emoji: "🍵", category: "product", optimum: 3, maxCircles: 3, hasSuperlevel: false, portionSizeInGrams: 200 },
  { id: "compliment", num: 14, name: "Комплимент дня", emoji: "💬", category: "action", optimum: 1, maxCircles: 1, portionSizeInGrams: 1 },
  { id: "recipe", num: 15, name: "Рецепт дня", emoji: "🍳", category: "action", optimum: 1, maxCircles: 1, portionSizeInGrams: 1 },
  { id: "soaking", num: 16, name: "Замачивание ингредиентов", emoji: "💧", category: "action", optimum: 1, maxCircles: 1, portionSizeInGrams: 1 },
  { id: "no_oil_cook", num: 17, name: "Готовка без масла", emoji: "🍲", category: "action", optimum: 1, maxCircles: 1, portionSizeInGrams: 1 },
  { id: "no_salt_cook", num: 18, name: "Готовка без соли", emoji: "🍃", category: "action", optimum: 1, maxCircles: 1, portionSizeInGrams: 1 },
  { id: "no_caffeine_day", num: 19, name: "День без кофеина", emoji: "☕", category: "action", optimum: 1, maxCircles: 1, portionSizeInGrams: 1 },
  { id: "no_sugar_day", num: 20, name: "День без сахара и подсластителей", emoji: "🚫", category: "action", optimum: 1, maxCircles: 1, portionSizeInGrams: 1 }
];

export interface SystemKeyProgress {
  id: string;
  num: number;
  name: string;
  emoji: string;
  category: "product" | "action";
  optimum: number;
  maxCircles: number;
  hasSuperlevel?: boolean;
  portionSizeInGrams: number;
  
  // Real-time tracking metrics
  autoGrams: number;
  manualGrams: number;
  totalGrams: number;
  portionsFilled: number;
  optimalDone: boolean;
  superLevelDone: boolean;
}

const store = new Map<string, any>();

export class SystemKeysStore {
  private static getStoredState(key: string, fallback: any = {}): any {
    if (store.has(key)) return store.get(key);
    return fallback;
  }

  private static setStoredState(key: string, data: any): void {
    store.set(key, data);
  }

  /**
   * Bridge recipe states from useAppStore into the internal Map
   * so calculateKeysForDay() can find cooked recipes
   */
  public static syncRecipeStates(recipeStates: Record<string, any>): void {
    const keyMap: Record<string, string> = {
      breakfast: "wfpb_breakfast_state",
      lunch: "wfpb_lunch_state",
      dinner: "wfpb_dinner_state",
      must_have: "wfpb_must_have_state",
      compliment: "wfpb_compliments_state",
      recipe_of_day: "wfpb_recipe_of_day_state",
      drinks: "wfpb_drinks_state",
    };
    for (const [storeKey, sysKey] of Object.entries(keyMap)) {
      if (recipeStates[storeKey]) {
        store.set(sysKey, recipeStates[storeKey]);
      }
    }
  }

  /**
   * Helper to map cooked ingredients from daily diet to specific System Key IDs
   */
  public static mapIngredientsToAutoGrams(ingredients: { name: string; weight: number }[]): Record<string, number> {
    const autoGrams: Record<string, number> = {};
    SYSTEM_KEY_DEFS.forEach(def => {
      if (def.category === "product") {
        autoGrams[def.id] = 0;
      }
    });

    ingredients.forEach(ing => {
      const name = ing.name.toLowerCase();
      const weight = ing.weight;

      // 1. Legumes (Бобовые)
      if (name.includes("нут") || name.includes("чечевиц") || name.includes("фасол") || name.includes("тофу") || 
          name.includes("темпе") || name.includes("горох") || name.includes("соя") || name.includes("маш") || 
          name.includes("хумус") || name.includes("бобов") || name.includes("бобы") || name.includes("соев")) {
        autoGrams["legumes"] += weight;
      }
      
      // 2. Whole Grains (Цельные злаки)
      else if (name.includes("овес") || name.includes("овсян") || name.includes("греч") || name.includes("киноа") || 
               name.includes("рис") || name.includes("пшен") || name.includes("ячмен") || name.includes("полб") || 
               name.includes("спельт") || name.includes("перлов") || name.includes("геркулес") || name.includes("крупа") || 
               name.includes("хлопья") || name.includes("амарант") || name.includes("злак") || name.includes("хлеб цельнозерн")) {
        autoGrams["whole_grains"] += weight;
      }
      
      // 4. Leafy Greens & Salad (Листовые овощи и зелень)
      else if (name.includes("шпинат") || name.includes("руккол") || name.includes("петруш") || name.includes("укроп") || 
               name.includes("салат") || name.includes("ромэн") || name.includes("мангольд") || name.includes("кинз") || 
               name.includes("базилик") || name.includes("зелень") || name.includes("мята") || name.includes("сельдерей") || name.includes("укропа")) {
        autoGrams["leafy_greens"] += weight;
      }

      // 12. Must-Have Crucials (MUST HAVE овощи: брокколи, капуста, чеснок, лук)
      else if (name.includes("броккол") || name.includes("цветная капуста") || name.includes("чеснок") || 
               name.includes("лук") || name.includes("порей") || name.includes("капуст") || name.includes("кейл")) {
        autoGrams["must_have"] += weight;
      }
      
      // 3. General Vegetables (Овощи -excluding must_have / greens)
      else if (name.includes("кабач") || name.includes("тыкв") || name.includes("баклажан") || name.includes("перец") || 
               name.includes("огурец") || name.includes("огурцы") || name.includes("помидор") || name.includes("помидоры") || 
               name.includes("свекл") || name.includes("свёкл") || name.includes("морковь") || name.includes("редис") || 
               name.includes("паприк") || name.includes("картоф") || name.includes("томат")) {
        autoGrams["vegetables"] += weight;
      }
      
      // 5. Nuts (Орехи)
      else if (name.includes("орех") || name.includes("миндаль") || name.includes("фундук") || name.includes("пекан") || 
               name.includes("фисташк") || name.includes("кешью") || name.includes("бразильск") || name.includes("кедров")) {
        autoGrams["nuts"] += weight;
      }
      
      // 7. Ground Flax (Молотый лен)
      else if (name.includes("семена льна") || name.includes("льняное семя") || name.includes("лен") || 
               name.includes("лён") || name.includes("золотого льна") || name.includes("льнян")) {
        autoGrams["ground_flax"] += weight;
      }
      
      // 6. Seeds (Семена -excluding flax)
      else if (name.includes("селен") || name.includes("кунжут") || name.includes("чиа") || name.includes("семен") || 
               name.includes("семечк") || name.includes("подсолнеч") || name.includes("конопл")) {
        autoGrams["seeds"] += weight;
      }
      
      // 8. Spices & Herbs (Травы и специи)
      else if (name.includes("куркум") || name.includes("имбир") || name.includes("специ") || name.includes("кориц") || 
               name.includes("ореган") || name.includes("гвоздик") || name.includes("розмари") || name.includes("черный перец") || 
               name.includes("карри") || name.includes("перец") || name.includes("соус") || name.includes("соль") || name.includes("сахар")) {
        autoGrams["spices"] += weight;
      }
      
      // 10. Berries (Ягоды)
      else if (name.includes("черник") || name.includes("голубик") || name.includes("ежевик") || name.includes("смородин") || 
               name.includes("клубник") || name.includes("малин") || name.includes("вишн") || name.includes("черешн") || 
               name.includes("клюкв") || name.includes("облепих") || name.includes("ягод")) {
        autoGrams["berries"] += weight;
      }

      // 9. Fruits (Фрукты -excluding berries)
      else if (name.includes("яблоко") || name.includes("яблок") || name.includes("груш") || name.includes("апельсин") || 
               name.includes("банан") || name.includes("лимон") || name.includes("лайм") || name.includes("абрикос") || 
               name.includes("персик") || name.includes("грейпфрут") || name.includes("мандарин") || name.includes("фрукт")) {
        autoGrams["fruits"] += weight;
      }
      
      // 11. Sprouts (Проростки)
      else if (name.includes("пророс") || name.includes("микрозелен") || name.includes("ростк")) {
        autoGrams["sprouts"] += weight;
      }
      
      // 13. Healthy Drinks (Полезные напитки / вода)
      else if (name.includes("вода") || name.includes("чай") || name.includes("напит") || name.includes("зеленый чай") || 
               name.includes("шиповник") || name.includes("настой") || name.includes("отвар") || name.includes("ромашк") || name.includes("мята")) {
        autoGrams["healthy_drinks"] += weight;
      }
    });

    // Disable automatic progress calculation for "must_have" (fermented products) 
    // and "sprouts" (sprouts), satisfying the rule that "cooked" !== "actually consumed today" (cooked to stock)
    autoGrams["must_have"] = 0;
    autoGrams["sprouts"] = 0;

    return autoGrams;
  }

  /**
   * Main calculation compiler for all 20 keys for a specific day
   */
  public static calculateKeysForDay(currentDayIndex: number, savedDishes: any[], waterAmountMl: number = 0): {
    keys: SystemKeyProgress[];
    closedCount: number;
    progressPercentage: number;
    hasWaterAuto: boolean;
  } {
    // 1. Fetch Book recipe states
    const breakfastState = this.getStoredState("wfpb_breakfast_state");
    const lunchState = this.getStoredState("wfpb_lunch_state");
    const dinnerState = this.getStoredState("wfpb_dinner_state");
    const mustHaveState = this.getStoredState("wfpb_must_have_state");
    const complimentsState = this.getStoredState("wfpb_compliments_state");
    const recipeOfDayState = this.getStoredState("wfpb_recipe_of_day_state");
    const drinksState = this.getStoredState("wfpb_drinks_state");

    // 2. Fetch daily logged food data
    const dailyData = DailyNutritionStore.getDailyNutrition(
      savedDishes,
      currentDayIndex,
      {
        breakfast: breakfastState,
        lunch: lunchState,
        dinner: dinnerState,
        mustHave: mustHaveState,
        compliments: complimentsState,
        recipeOfDay: recipeOfDayState,
        drinks: drinksState,
      },
      {
        breakfast: BREAKFAST_RECIPES,
        lunch: LUNCH_RECIPES,
        dinner: DINNER_RECIPES,
        mustHave: MUST_HAVE_RECIPES,
        compliments: COMPLIMENTS_RECIPES,
        recipeOfDay: RECIPE_OF_DAY_RECIPES,
        drinks: DRINKS_RECIPES,
      }
    );

    // 3. Extract mapped ingredients auto weights
    const autoGramsMap = this.mapIngredientsToAutoGrams(dailyData.aggregatedIngredients);

  // Manual-only keys: "sprouts" (Проростки) and "must_have" (ферментированные продукты)
  // must NEVER be auto-filled by cooked recipes or auto-detected ingredients.
  const manualOnlyKeys = new Set(["sprouts", "must_have"]);

    // Overwrite water progress with direct water log state if higher
    if (waterAmountMl > 0) {
      autoGramsMap["healthy_drinks"] = Math.max(autoGramsMap["healthy_drinks"] || 0, waterAmountMl);
    }

    // 4. Load manual inputs / toggle overrides for this day
    const manualInputs = this.getStoredState(`wfpb_system_keys_day_${currentDayIndex}_manual`, {});
    // manualInputs schema: { [keyId]: { manualGrams: number, checked: boolean } }

    let closedCount = 0;

    // We can also compute some action automations
    // A. "Готовка без масла" (No Oil): True if "масло" ingredient weight is 0
    let autoNoOil = true;
    let autoNoSalt = true;
    let autoNoSugar = true;

    dailyData.aggregatedIngredients.forEach(ing => {
      const lower = ing.name.toLowerCase();
      if (lower.includes("масл")) {
        autoNoOil = false;
      }
      if (lower.includes("соль") || lower.includes("солен")) {
        autoNoSalt = false;
      }
      if (lower.includes("сахар") || lower.includes("сироп")) {
        autoNoSugar = false;
      }
    });

    const isRecipeOfDayCooked = Object.keys(recipeOfDayState).some(k => recipeOfDayState[k]?.status === "cooked");

    const isComplimentGiven = Object.keys(complimentsState).some(k => complimentsState[k]?.status === "cooked");

    const keys: SystemKeyProgress[] = SYSTEM_KEY_DEFS.map(def => {
      let autoGrams = 0;
      let manualGrams = 0;
      let checked = false;

      if (def.category === "product") {
        autoGrams = autoGramsMap[def.id] || 0;
        // Block ANY automatic contribution for manual-only keys (sprouts / must_have)
        if (manualOnlyKeys.has(def.id)) {
          autoGrams = 0;
        }
        manualGrams = manualInputs[def.id]?.manualGrams || 0;
      } else {
        checked = manualInputs[def.id]?.checked || false;

        // Auto overrides for actions to make application fully integrated and smart
        if (def.id === "recipe" && isRecipeOfDayCooked) {
          checked = true;
        }
        if (def.id === "compliment" && isComplimentGiven) {
          checked = true;
        }
      }

      const totalGrams = autoGrams + manualGrams;
      let portionsFilled = 0;
      let optimalDone = false;
      let superLevelDone = false;

      if (def.category === "product") {
        const isProductKey = [
          "legumes", "whole_grains", "vegetables", "leafy_greens", "nuts", "seeds",
          "ground_flax", "spices", "fruits", "berries", "sprouts", "must_have", "healthy_drinks"
        ].includes(def.id);
        if (isProductKey) {
          portionsFilled = Math.min(def.optimum, Math.floor(totalGrams / def.portionSizeInGrams));
          optimalDone = portionsFilled >= def.optimum;
          // For product keys: superlevel requires 1 incremental portion above the optimum (so def.optimum + 1 portions)
          if (def.hasSuperlevel && totalGrams >= (def.optimum + 1) * def.portionSizeInGrams) {
            superLevelDone = true;
          }
        } else {
          portionsFilled = Math.min(def.maxCircles, Math.floor(totalGrams / def.portionSizeInGrams));
          optimalDone = portionsFilled >= def.optimum;
          if (def.hasSuperlevel && portionsFilled > def.optimum) {
            superLevelDone = true;
          }
        }
      } else {
        portionsFilled = checked ? 1 : 0;
        optimalDone = checked;
      }

      if (optimalDone) {
        closedCount += 1;
      }

      return {
        ...def,
        autoGrams,
        manualGrams,
        totalGrams,
        portionsFilled,
        optimalDone,
        superLevelDone
      };
    });

    // Save actual completed keys count in simple wfpb_system_keys_day_${currentDayIndex} location for general backwards compatibility
    const legacyPortions: Record<string, number> = {};
    keys.forEach(k => {
      legacyPortions[k.id] = k.portionsFilled;
    });
    this.setStoredState(`wfpb_system_keys_day_${currentDayIndex}`, legacyPortions);

    return {
      keys,
      closedCount,
      progressPercentage: Math.round((closedCount / 20) * 100),
      hasWaterAuto: autoGramsMap["healthy_drinks"] > 0
    };
  }

  /**
   * Triggers a manual gram adjustment for a Product Key or checked toggle for an Action Key
   */
  public static updateManualKey(
    currentDayIndex: number,
    keyId: string,
    isProduct: boolean,
    params: { manualGrams?: number; checked?: boolean }
  ): void {
    const manualInputs = this.getStoredState(`wfpb_system_keys_day_${currentDayIndex}_manual`, {});
    if (!manualInputs[keyId]) {
      manualInputs[keyId] = { manualGrams: 0, checked: false };
    }

    if (isProduct) {
      if (params.manualGrams !== undefined) {
        manualInputs[keyId].manualGrams = Math.max(0, params.manualGrams);
      }
    } else {
      if (params.checked !== undefined) {
        manualInputs[keyId].checked = params.checked;
      }
    }

    this.setStoredState(`wfpb_system_keys_day_${currentDayIndex}_manual`, manualInputs);
  }

  /**
   * Calculate daily water goal based on user weight (30ml per kg), fallback 2000ml
   */
  public static getDailyWaterGoal(): number {
    return 2000
  }

  /**
   * Dynamic vessel visual configurations based on raw data parameters
   */
  public static getVesselVisualParams(closedCount: number) {
    const fillLevel = closedCount / 20; // 0 to 1
    
    // Wave parameters (frequency, speed, complexity based on data progress)
    let waveEnergy = 1.0; 
    let colorDepth = "peaceful-light"; // low: light, mid: vibrant, high: celestial gold/deep green
    let bubbleDensity = 4;

    if (fillLevel === 0) {
      waveEnergy = 0.2;
      colorDepth = "empty";
      bubbleDensity = 0;
    } else if (fillLevel < 0.4) {
      waveEnergy = 0.8; // gentle rising
      colorDepth = "sprouting-green";
      bubbleDensity = 3;
    } else if (fillLevel < 0.75) {
      waveEnergy = 1.4; // active nutrient flow
      colorDepth = "vibrant-emerald";
      bubbleDensity = 6;
    } else {
      waveEnergy = 1.8; // complete life force peak (highest waves and bubble action points)
      colorDepth = "celestial-triumph";
      bubbleDensity = 9;
    }

    return {
      fillLevel,
      waveEnergy,
      colorDepth,
      bubbleDensity
    };
  }
}
