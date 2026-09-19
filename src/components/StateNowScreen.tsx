import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Sparkles, Droplet, Moon, Apple, Zap, Activity, Compass, Heart, Brain, Info, CheckCircle, TrendingUp, TrendingDown, BarChart3, Scale, Flame, Utensils } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import BottomBar from "./BottomBar";
import { MOVEMENT_DAILY_TARGET_MIN } from "../constants/movement";
import { 
  BREAKFAST_RECIPES, 
  LUNCH_RECIPES, 
  DINNER_RECIPES, 
  MUST_HAVE_RECIPES, 
  COMPLIMENTS_RECIPES, 
  RECIPE_OF_DAY_RECIPES, 
  DRINKS_RECIPES 
} from "./BookRecipesScreen";
import type { SavedDish } from "../types/dishes";
import { DailyNutritionStore } from "../services/DailyNutritionStore";
import { SystemKeysStore } from "../services/SystemKeysStore";
import { calculateIntegralScore } from "../utils/integralScore";
import { getWaterGoal, WATER_GOAL_FALLBACK_KG, WATER_ACTIVE_START_MIN, WATER_ACTIVE_WINDOW_MIN } from "../utils/waterGoal";
import BalanceTab from "./statenow/BalanceTab";
import { getRecommendedNextStep } from "../utils/nextStepEngine";
import ScalesTab from "./statenow/ScalesTab";
import KbjuTab from "./statenow/KbjuTab";
import MicroTab from "./statenow/MicroTab";
import CompositionTab from "./statenow/CompositionTab";
import DynamicsTab from "./statenow/DynamicsTab";
import { api } from "../utils/api";
import { getBookMacros } from "../utils/bookMacros";
import { getRecipeImagePath } from "../utils/recipeImageMapper";
import { getPlural } from "../utils/pluralize";
import { formatTimeHM, todayLocalDate, toLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";
import { buildAnnaBalanceAnalysis, buildAnnaTabAnalysis } from "../utils/annaAdvisorEngine";
import { calculateBioDialAdvice } from "../utils/bioDialAdvisorEngine";
import BiometricDialWidget from "./statenow/BiometricDialWidget";

interface StateNowScreenProps {
  dayNotes: Record<number, { text: string; time: string }[]>;
  setDayNotes?: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string }[]>>>;
  currentDayIndex: number;
  onBack?: () => void;
  selectedChronic?: string[];
  selectedGoals?: string[];
  water?: number;
  sleep?: number;
  mealCount?: number;
  habitsDone?: number;
  userName?: string;
  userGender?: "female" | "male";
  weight?: number;
  ratingWellbeing?: number;
  setRatingWellbeing?: (val: number) => void;
  ratingEnergy?: number;
  setRatingEnergy?: (val: number) => void;
  ratingLightness?: number;
  setRatingLightness?: (val: number) => void;
  onSaveWellbeingComment?: (text: string) => void;
  savedDishes?: SavedDish[];
  setWater?: React.Dispatch<React.SetStateAction<number>>;
  setScreen?: (screen: any) => void;
  isReadOnly?: boolean;
}

export default function StateNowScreen({
  dayNotes = {},
  setDayNotes: propsSetDayNotes,
  currentDayIndex,
  onBack: propsOnBack,
  selectedChronic: propsSelectedChronic,
  water = 0,
  sleep = 0,
  mealCount = 0,
  habitsDone = 0,
  userName = "",
  userGender = "female",
  ratingWellbeing = 5,
  ratingEnergy = 5,
  ratingLightness = 5,
  weight = 70,
  setRatingWellbeing: propsSetRatingWellbeing,
  setRatingEnergy: propsSetRatingEnergy,
  setRatingLightness: propsSetRatingLightness,
  onSaveWellbeingComment,
  savedDishes = [],
  setWater,
  setScreen: propsSetScreen,
  isReadOnly = false,
}: StateNowScreenProps) {
  const storeScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => storeScreen("my-day"));
  const setScreenFn = propsSetScreen || storeScreen;
  const profile = useAppStore((s) => s.userProfile);
  const selectedChronic = (propsSelectedChronic as string[]) || profile.chronicConditions || [];
  const setRatingWellbeing = propsSetRatingWellbeing || ((v: number) => {});
  const setRatingEnergy = propsSetRatingEnergy || ((v: number) => {});
  const setRatingLightness = propsSetRatingLightness || ((v: number) => {});
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"balance" | "scales" | "kbju" | "micro" | "composition" | "dynamics">("balance");

  const neutralizationNoted = useRef(false);

  // ── API data fetch for StateNow ──
  const [apiStateNowData, setApiStateNowData] = useState<any>(null);
  const [measurementHistory, setMeasurementHistory] = useState<any[]>([]);
  const [breakfastState, setBreakfastState] = useState<Record<number, any>>({});
  const [lunchState, setLunchState] = useState<Record<number, any>>({});
  const [dinnerState, setDinnerState] = useState<Record<number, any>>({});
  const [mustHaveState, setMustHaveState] = useState<Record<number, any>>({});
  const [complimentsState, setComplimentsState] = useState<Record<number, any>>({});
  const [recipeOfDayState, setRecipeOfDayState] = useState<Record<number, any>>({});
  const [drinksState, setDrinksState] = useState<Record<number, any>>({});

  // ── Saved Anna analysis snapshot (load from DB for past days, save for current day) ──
  const [savedAnnaText, setSavedAnnaText] = useState<string | null>(null);
  const savedAnnaDayRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentDayIndex) return;
    if (isReadOnly) {
      api<{ text: string | null }>("/api/anna-analysis?dayIndex=" + currentDayIndex)
        .then(data => setSavedAnnaText(data.text || null))
        .catch(() => setSavedAnnaText(null));
    } else {
      setSavedAnnaText(null);
      savedAnnaDayRef.current = null;
    }
  }, [currentDayIndex, isReadOnly]);

  useEffect(() => {
    savedAnnaDayRef.current = null;
  }, [currentDayIndex]);

  useEffect(() => {
    if (isReadOnly || !currentDayIndex) return;
    if (!apiStateNowData) return;
    if (savedAnnaDayRef.current === currentDayIndex) return;
    const timer = setTimeout(() => {
      const text = getAnnaAnalysis();
      savedAnnaDayRef.current = currentDayIndex;
      api("/api/anna-analysis/save", {
        method: "POST",
        body: { dayIndex: currentDayIndex, analysisText: text },
      }).catch(() => {});
    }, 4000);
    return () => clearTimeout(timer);
  }, [currentDayIndex, isReadOnly, apiStateNowData]);

  useEffect(() => {
    const dayIdx = currentDayIndex || 1;
    Promise.all([
      api<any>("/api/user/state-now?dayIndex=" + dayIdx),
      api<any[]>("/api/metrics/daily")
    ])
      .then(([data, historyData]) => {
        setApiStateNowData(data);
        setMeasurementHistory(historyData || []);
        const rp = data.recipeProgress || [];
        const byType = (type: string) =>
          Object.fromEntries(
            rp.filter((r: any) => r.bookRecipeType === type).map((r: any) => [r.bookRecipeId, { status: r.status }])
          );
        setBreakfastState(byType("breakfast"));
        setLunchState(byType("lunch"));
        setDinnerState(byType("dinner"));
        setMustHaveState(byType("must_have"));
        setComplimentsState(byType("compliment"));
        setRecipeOfDayState(byType("recipe_of_day"));
        setDrinksState(byType("drinks"));
      })
      .catch(() => {});
  }, [currentDayIndex]);

  // ── Effective values: props take precedence, API data is fallback ──
  const effWater = apiStateNowData?.dailyMetric?.waterMl != null ? apiStateNowData.dailyMetric.waterMl : (isReadOnly ? 0 : water);
  const effSleep = apiStateNowData?.dailyMetric?.sleepMinutes != null ? apiStateNowData.dailyMetric.sleepMinutes : (isReadOnly ? 0 : sleep);
  const effUserName = apiStateNowData?.profile?.name || userName;
  const effUserGender = apiStateNowData?.profile?.gender || userGender;
  const effSelectedChronic: string[] = (apiStateNowData?.profile?.chronicConditions?.length ? apiStateNowData.profile.chronicConditions : selectedChronic) || [];
  const effRatingWellbeing = apiStateNowData?.dailyRating?.wellbeing ?? ratingWellbeing;
  const effRatingEnergy = apiStateNowData?.dailyRating?.energy ?? ratingEnergy;
  const effRatingLightness = apiStateNowData?.dailyRating?.lightness ?? ratingLightness;
  const effInitialWeight = apiStateNowData?.profile?.initialWeight;
  const effInitialSystolic = apiStateNowData?.profile?.initialSystolic;
  
  // Day-isolated biometrics: only measurements for currentDayIndex
  const rawDayMeasurements = apiStateNowData?.dailyMetric?.measurements;
  const dayMeasurements: any[] = (() => {
    if (!rawDayMeasurements) return [];
    try {
      const parsed = typeof rawDayMeasurements === "string" ? JSON.parse(rawDayMeasurements) : rawDayMeasurements;
      return Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
    } catch {
      return Array.isArray(rawDayMeasurements) ? rawDayMeasurements : [];
    }
  })();
  const sortedDayMeasurements = [...dayMeasurements].filter((m: any) => m && m.timestamp).sort((a: any, b: any) => a.timestamp - b.timestamp);
  const latestMeas = sortedDayMeasurements.length > 0 ? sortedDayMeasurements[sortedDayMeasurements.length - 1] : null;
  const prevMeas = sortedDayMeasurements.length > 1 ? sortedDayMeasurements[sortedDayMeasurements.length - 2] : null;

  const effWeight = latestMeas?.weight ?? apiStateNowData?.profile?.weight ?? weight;
  const effSystolic = latestMeas?.systolic ?? undefined;
  const effDiastolic = latestMeas?.diastolic ?? undefined;
  
  const wellbeingLog = apiStateNowData?.dailyRating?.wellbeingLog || [];
  const energyLog = apiStateNowData?.dailyRating?.energyLog || [];
  const lightnessLog = apiStateNowData?.dailyRating?.lightnessLog || [];
  
  const activityLogs = apiStateNowData?.dailyMetric?.movementLog ? (typeof apiStateNowData.dailyMetric.movementLog === 'string' ? JSON.parse(apiStateNowData.dailyMetric.movementLog) : apiStateNowData.dailyMetric.movementLog) : [];
  const effSavedDishes = savedDishes.length ? savedDishes : (apiStateNowData?.savedDishes || []);
  const effHabitsDone = SystemKeysStore.calculateKeysForDay(currentDayIndex || 1, effSavedDishes, effWater).closedCount;
  const todayStr = todayLocalDate(getUserTimeZone());

  // Set up cooked book recipes
  const cookedBookDishes: any[] = [];
  // Core macro calculation algorithms
  const getExactMacros = (type: string, id: number) => {
    const macros = getBookMacros(type, id);
    if (type === "drinks") {
      return { cal: 0, pro: 0, fpt: 0, carb: 0, fib: 0 };
    }
    return {
      cal: macros.calories > 0 ? macros.calories : 180,
      pro: !isNaN(parseFloat(macros.protein)) ? parseFloat(macros.protein) : 6,
      fpt: !isNaN(parseFloat(macros.fat)) ? parseFloat(macros.fat) : 3,
      carb: (macros.carbohydrates != null && !isNaN(macros.carbohydrates)) ? macros.carbohydrates : 30,
      fib: !isNaN(parseFloat(macros.fiber)) ? parseFloat(macros.fiber) : 4.5
    };
  };

  // Breakfast Check
   const todayBreakfastRecipe = BREAKFAST_RECIPES.find(r => r.id === currentDayIndex);
    if (todayBreakfastRecipe && breakfastState[todayBreakfastRecipe.id]?.status === "cooked") {
      const macros = getExactMacros("breakfast", todayBreakfastRecipe.id);
      cookedBookDishes.push({
        id: `book-breakfast-${todayBreakfastRecipe.id}`,
        name: todayBreakfastRecipe.technicalName,
        source: "Книга",
        category: "Завтраки",
        page: todayBreakfastRecipe.page || 0,
        time: "08:30",
        image: getRecipeImagePath(todayBreakfastRecipe.emotionalName || todayBreakfastRecipe.technicalName),
        calories: Math.round(macros.cal),
        protein: macros.pro.toFixed(1),
        fat: macros.fpt.toFixed(1),
        fiber: macros.fib.toFixed(1)
      });
    }

  // Lunch Check
   const todayLunchRecipe = LUNCH_RECIPES.find(r => r.id === currentDayIndex);
    if (todayLunchRecipe && lunchState[todayLunchRecipe.id]?.status === "cooked") {
      const macros = getExactMacros("lunch", todayLunchRecipe.id);
      cookedBookDishes.push({
        id: `book-lunch-${todayLunchRecipe.id}`,
        name: todayLunchRecipe.technicalName,
        source: "Книга",
        category: "Супы и Салаты",
        page: todayLunchRecipe.page || 0,
        time: "13:30",
        image: getRecipeImagePath(todayLunchRecipe.emotionalName || todayLunchRecipe.technicalName),
        calories: Math.round(macros.cal),
        protein: macros.pro.toFixed(1),
        fat: macros.fpt.toFixed(1),
        fiber: macros.fib.toFixed(1)
      });
    }

  // Dinner Check
   const todayDinnerRecipe = DINNER_RECIPES.find(r => r.id === currentDayIndex);
    if (todayDinnerRecipe && dinnerState[todayDinnerRecipe.id]?.status === "cooked") {
      const macros = getExactMacros("dinner", todayDinnerRecipe.id);
      cookedBookDishes.push({
        id: `book-dinner-${todayDinnerRecipe.id}`,
        name: todayDinnerRecipe.technicalName,
        source: "Книга",
        category: "Основные блюда",
        page: todayDinnerRecipe.page || 0,
        time: "19:00",
        image: getRecipeImagePath(todayDinnerRecipe.emotionalName || todayDinnerRecipe.technicalName),
        calories: Math.round(macros.cal),
        protein: macros.pro.toFixed(1),
        fat: macros.fpt.toFixed(1),
        fiber: macros.fib.toFixed(1)
      });
    }

  // Must have Check
   const todayMustHave = MUST_HAVE_RECIPES.find(r => r.id === currentDayIndex);
    if (todayMustHave && mustHaveState[todayMustHave.id]?.status === "cooked") {
      const macros = getExactMacros("must_have", todayMustHave.id);
      cookedBookDishes.push({
        id: `book-must-have-${todayMustHave.id}`,
        name: todayMustHave.technicalName,
        source: "Книга",
        category: "Полезное",
        page: todayMustHave.page || 0,
        time: "11:00",
        image: getRecipeImagePath(todayMustHave.emotionalName || todayMustHave.technicalName),
        calories: Math.round(macros.cal),
        protein: macros.pro.toFixed(1),
        fat: macros.fpt.toFixed(1),
        fiber: macros.fib.toFixed(1)
      });
    }

  // Recipe of day Check
   const todayRecipeOfDay = RECIPE_OF_DAY_RECIPES.find(r => r.day === currentDayIndex || r.id === currentDayIndex);
    if (todayRecipeOfDay && recipeOfDayState[todayRecipeOfDay.id]?.status === "cooked") {
      const macros = getExactMacros("recipe_of_day", todayRecipeOfDay.id);
      cookedBookDishes.push({
        id: `book-recipe-of-day-${todayRecipeOfDay.id}`,
        name: todayRecipeOfDay.technicalName,
        source: "Книга",
        category: "Блюдо дня",
        page: todayRecipeOfDay.page || 0,
        time: "16:00",
        image: getRecipeImagePath(todayRecipeOfDay.emotionalName || todayRecipeOfDay.technicalName),
        calories: Math.round(macros.cal),
        protein: macros.pro.toFixed(1),
        fat: macros.fpt.toFixed(1),
        fiber: macros.fib.toFixed(1)
      });
    }

  // Drinks Check
   const todayDrink = DRINKS_RECIPES.find(r => r.day === currentDayIndex || r.id === currentDayIndex);
    if (todayDrink && drinksState[todayDrink.id]?.status === "cooked") {
      const macros = getExactMacros("drinks", todayDrink.id);
      cookedBookDishes.push({
        id: `book-drink-${todayDrink.id}`,
        name: todayDrink.technicalName,
        source: "Книга",
        category: "Напитки",
        page: todayDrink.page || 0,
        time: "10:00",
        image: getRecipeImagePath(todayDrink.emotionalName || todayDrink.technicalName),
        calories: Math.round(macros.cal),
        protein: macros.pro.toFixed(1),
        fat: macros.fpt.toFixed(1),
        fiber: macros.fib.toFixed(1)
      });
    }

  // Compliments Check
   const todayCompliment = COMPLIMENTS_RECIPES.find(r => r.id === currentDayIndex);
    if (todayCompliment && complimentsState[todayCompliment.id]?.status === "cooked") {
      const macros = getExactMacros("compliment", todayCompliment.id);
      cookedBookDishes.push({
        id: `book-compliment-${todayCompliment.id}`,
        name: todayCompliment.technicalName,
        source: "Книга",
        category: "Комплименты",
        page: todayCompliment.page || 0,
        time: "17:30",
        image: getRecipeImagePath(todayCompliment.emotionalName || todayCompliment.technicalName),
        calories: Math.round(macros.cal),
        protein: macros.pro.toFixed(1),
        fat: macros.fpt.toFixed(1),
        fiber: macros.fib.toFixed(1)
      });
    }

  // Also include book recipes from savedDishes that aren't tracked in recipeProgress
  const cookedBookIds = new Set(cookedBookDishes.map(d => d.id));
  for (const dish of (effSavedDishes || [])) {
    if (dish.isBookRecipe) {
      if (dish.dayIndex !== undefined && dish.dayIndex !== null) {
        if (dish.dayIndex !== currentDayIndex) continue;
      } else {
        const dishDate = dish.createdAt ? toLocalDate(new Date(dish.createdAt), getUserTimeZone()) : null;
        if (dishDate !== todayStr) continue;
      }
      const bookType = (dish as any).bookRecipeRef?.type || (dish as any).bookRecipeType;
      const bookIdVal = (dish as any).bookRecipeRef?.id ?? (dish as any).bookRecipeId;
      const bookKey = bookType && bookIdVal != null
        ? `book-${bookType}-${bookIdVal}`
        : dish.id;
      if (!cookedBookIds.has(bookKey) && !cookedBookIds.has(dish.id)) {
        cookedBookDishes.push({
          id: bookKey,
          name: dish.name,
          source: "Книга",
          category: dish.category || "Книга",
          page: 0,
          time: dish.time || (dish.createdAt
            ? formatTimeHM(dish.createdAt, getUserTimeZone())
            : ""),
          image: dish.image || "",
          calories: dish.calories || 0,
          protein: dish.protein || "0",
          fat: dish.fat || "0",
          fiber: dish.fiber || "0",
        });
        cookedBookIds.add(bookKey);
      }
    }
  }

  // R1/R2: helpers for hub aggregation — protect against strict gate drops
  const parseFiniteOrZero = (v: unknown): number => {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "string") {
      const clean = v.replace(",", ".").replace(/[^\d.-]/g, "").trim();
      const n = parseFloat(clean);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };
  const parseFiniteOrNull = (v: unknown): number | null => {
    if (typeof v === "number") return Number.isFinite(v) ? v : null;
    if (typeof v === "string") {
      const clean = v.replace(",", ".").replace(/[^\d.-]/g, "").trim();
      const n = parseFloat(clean);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  const isRealMixerDish = (d: any) => d?.sourceType === "mixer" || d?.category === "Миксер";

  // Custom Dishes from DIY / From What Is modules — strictly scoped to currentDayIndex, R1 protection
  const todayCustomDishes = (effSavedDishes || [])
    .filter(dish => {
      if (dish.isBookRecipe) return false;
      if (isRealMixerDish(dish)) return false;
      if (parseFiniteOrZero(dish.calories) <= 0) return false;
      // Strict day scoping: only dishes cooked on currentDayIndex
      if (dish.dayIndex === currentDayIndex || (dish as any).current_day === currentDayIndex) return true;
      // Legacy fallback — only for day 1: dishes without dayIndex that match today's local date
      if (!dish.dayIndex && currentDayIndex === 1) {
        const dishDate = dish.createdAt ? toLocalDate(new Date(dish.createdAt), getUserTimeZone()) : null;
        return dishDate === todayStr;
      }
      return false;
    })
    .map(dish => {
      return {
        id: dish.id,
        name: dish.name,
        category: dish.category,
        image: dish.image,
        ingredients: typeof dish.ingredients === 'string' ? JSON.parse(dish.ingredients) : dish.ingredients,
        calories: parseFiniteOrZero(dish.calories),
        protein: dish.protein != null ? String(dish.protein) : "0",
        fat: dish.fat != null ? String(dish.fat) : "0",
        fiber: dish.fiber != null ? String(dish.fiber) : "0",
        carbohydrates: (dish as any).carbohydrates,
        time: dish.time || (dish.createdAt
          ? formatTimeHM(dish.createdAt, getUserTimeZone())
          : "")
      };
    });

  // Calculate overall course stats from Book module
  const totalCookedBookRecipesCount = 
    Object.values(breakfastState).filter(item => (item as any).status === "cooked").length +
    Object.values(lunchState).filter(item => (item as any).status === "cooked").length +
    Object.values(dinnerState).filter(item => (item as any).status === "cooked").length +
    Object.values(mustHaveState).filter(item => (item as any).status === "cooked").length +
    Object.values(complimentsState).filter(item => (item as any).status === "cooked").length +
    Object.values(recipeOfDayState).filter(item => (item as any).status === "cooked").length +
    Object.values(drinksState).filter(item => (item as any).status === "cooked").length;

  // Book targets of today menu
  const todayTotalBookMenuCount = 
    (todayBreakfastRecipe ? 1 : 0) +
    (todayLunchRecipe ? 1 : 0) +
    (todayDinnerRecipe ? 1 : 0) +
    (todayMustHave ? 1 : 0) +
    (todayRecipeOfDay ? 1 : 0) +
    (todayDrink ? 1 : 0);

  const todayCookedBookCount = cookedBookDishes.length;

  // Perform daily macro and micro aggregation via the central unified DailyNutritionStore
  const dbData = DailyNutritionStore.getDailyNutrition(
    effSavedDishes,
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

  // R2: корректор КБЖУ — компенсация строгого гейта DailyNutritionStore для todayCustomDishes
  const dbLoggedIds = new Set(dbData.logs.map(l => l.dishId));
  let r1ExtraCalories = 0, r1ExtraProtein = 0, r1ExtraFat = 0, r1ExtraCarb = 0, r1ExtraFiber = 0;
  for (const d of todayCustomDishes) {
    if (!dbLoggedIds.has(d.id)) {
      r1ExtraCalories += parseFiniteOrZero(d.calories);
      r1ExtraProtein += parseFiniteOrZero(d.protein);
      r1ExtraFat += parseFiniteOrZero(d.fat);
      r1ExtraCarb += parseFiniteOrZero((d as any).carbohydrates);
      r1ExtraFiber += parseFiniteOrZero(d.fiber);
    }
  }
  // debug hint for R1/R2 (visible in console when extra macros applied)
  if (r1ExtraCalories > 0) {
    try { console.debug("[StateNow:R2] r1Extra", { r1ExtraCalories, r1ExtraProtein, r1ExtraFat, r1ExtraCarb, r1ExtraFiber }); } catch {}
  }
  const totalCalories = dbData.totalCalories + Math.round(r1ExtraCalories);
  const totalProtein = +(dbData.totalProtein + r1ExtraProtein).toFixed(1);
  const totalFat = +(dbData.totalFat + r1ExtraFat).toFixed(1);
  const totalCarbohydrates = +(dbData.totalCarbohydrates + r1ExtraCarb).toFixed(1);
  const totalFiber = +(dbData.totalFiber + r1ExtraFiber).toFixed(1);

  const dayVitA = dbData.vitamins.vitA;
  const dayVitC = dbData.vitamins.vitC;
  const dayVitB9 = dbData.vitamins.vitB9;
  const dayVitE = dbData.vitamins.vitE;
  const dayVitK = dbData.vitamins.vitK;

  const dayIron = dbData.minerals.iron;
  const dayMagnesium = dbData.minerals.magnesium;
  const dayZinc = dbData.minerals.zinc;
  const dayPotassium = dbData.minerals.potassium;
  const dayLysine = dbData.minerals.lysine;
  const daySelenium = dbData.minerals.selenium;

  const hasPartialBookDishes = dbData.hasPartialBookDishes;
  const realProfileCount = dbData.realProfileCount;
  const hasAnyRealMicronutrientProfile = dbData.hasAnyRealMicronutrientProfile;

  const aggregatedIngredients = dbData.aggregatedIngredients;

  // Core target definitions
  const waterTarget = getWaterGoal(effWeight || WATER_GOAL_FALLBACK_KG);
  const sleepTarget = 480;
  const mealsTarget = 4;
  const habitsTarget = 20;

  // Time-aware water expectations
  const activeStartMin = WATER_ACTIVE_START_MIN;      // 08:00
  const activeWindowMin = WATER_ACTIVE_WINDOW_MIN;    // 840 мин (08:00–22:00)
  const activeEndMin = activeStartMin + activeWindowMin;
  const nowTimeHM = formatTimeHM(new Date().toISOString(), getUserTimeZone()).split(":");
  const currentHour = Number(nowTimeHM[0]);
  const currentMinute = Number(nowTimeHM[1]);
  const nowMinutes = currentHour * 60 + currentMinute;
  const awakeMinutesToday = Math.max(0, Math.min(nowMinutes - activeStartMin, activeWindowMin));
  const expectedWaterByNow = Math.round(waterTarget * (awakeMinutesToday / activeWindowMin));
  const remainingMinutes = Math.max(0, activeEndMin - nowMinutes);
  const isAheadOnWater = effWater >= expectedWaterByNow;

  const effMealCount = cookedBookDishes.length + todayCustomDishes.length;

  // Percentage estimations
  const waterPct = Math.min(100, Math.round((effWater / waterTarget) * 100));
  const sleepPct = Math.min(100, Math.round((effSleep / sleepTarget) * 100));
  const mealsPct = Math.min(100, Math.round((effMealCount / mealsTarget) * 100));
  const habitsPct = Math.min(100, Math.round((effHabitsDone / habitsTarget) * 100));
  const activityPercent = Math.min(100, Math.round(((activityLogs || []).reduce((acc: number, log: any) => acc + (log.durationSeconds || 0), 0) / 60 / MOVEMENT_DAILY_TARGET_MIN) * 100)); // % of target mins
  const activityMinutes = Math.round((activityPercent / 100) * MOVEMENT_DAILY_TARGET_MIN);
  const subjectiveEnergyPercent = (effRatingEnergy ?? 3) * 20; // 1–5 → 20–100%, default 3 = 60%
  const energyPct = Math.min(100, Math.round((activityPercent + subjectiveEnergyPercent) / 2));
  const zenPct = effRatingWellbeing * 20;
  const lightnessPct = effRatingLightness * 20;

  const hydrationState = ((): 'success' | 'normal' | 'warning' => {
    if (effWater >= waterTarget) return 'success'
    return effWater > 0 ? 'normal' : 'warning'
  })()

  const integralScore = calculateIntegralScore({
    waterMl: effWater,
    waterTarget,
    sleepMinutes: effSleep,
    sleepTarget,
    mealCount: effMealCount,
    mealsTarget,
    habitsDone: effHabitsDone,
    habitsTarget,
    activityMinutes,
    activityTarget: MOVEMENT_DAILY_TARGET_MIN,
    ratingEnergy: effRatingEnergy,
    ratingWellbeing: effRatingWellbeing,
    ratingLightness: effRatingLightness,
  });

  const getStatusInfo = (score: number) => {
    // 95-100
    if (score >= 95) return { label: "Состояние идеального баланса", style: "text-emerald-700 bg-emerald-50 border-emerald-200/60 shadow-[0_2px_8px_rgba(16,185,129,0.06)]", desc: "Сверхвысокий уровень физиологического резерва", dotColor: "bg-emerald-500" };
    // 90-94
    if (score >= 90) return { label: "Отличный жизненный тонус", style: "text-teal-700 bg-teal-50 border-teal-200/60 shadow-[0_2px_8px_rgba(20,184,166,0.06)]", desc: "Высокая метаболическая устойчивость", dotColor: "bg-teal-500" };
    // 85-89
    if (score >= 85) return { label: "Стабильное состояние", style: "text-green-700 bg-green-50 border-green-200/60 shadow-[0_2px_8px_rgba(34,197,94,0.06)]", desc: "Уверенная адаптация к нагрузкам", dotColor: "bg-green-500" };
    // 80-84
    if (score >= 80) return { label: "Хороший ресурсный фон", style: "text-lime-700 bg-lime-50 border-lime-200/60 shadow-[0_2px_8px_rgba(132,204,22,0.06)]", desc: "Свободный запас прочности органов", dotColor: "bg-lime-500" };
    
    // 75-79
    if (score >= 75) return { label: "Устойчивый тонус", style: "text-cyan-700 bg-cyan-50 border-cyan-200/60 shadow-[0_2px_8px_rgba(6,182,212,0.06)]", desc: "Оптимальное самочувствие", dotColor: "bg-cyan-500" };
    // 70-74
    if (score >= 70) return { label: "Физиологический баланс", style: "text-sky-700 bg-sky-50 border-sky-200/60 shadow-[0_2px_8px_rgba(14,165,233,0.06)]", desc: "Благоприятный обмен веществ", dotColor: "bg-sky-500" };
    // 65-69
    if (score >= 65) return { label: "Ровное самочувствие", style: "text-blue-700 bg-blue-50 border-blue-200/60 shadow-[0_2px_8px_rgba(59,130,246,0.06)]", desc: "Адаптивные механизмы активны", dotColor: "bg-blue-500" };
    // 60-64
    if (score >= 60) return { label: "Умеренный ресурс", style: "text-indigo-700 bg-indigo-50 border-indigo-200/60 shadow-[0_2px_8px_rgba(99,102,241,0.06)]", desc: "Основные показатели в норме", dotColor: "bg-indigo-500" };
    
    // 55-59
    if (score >= 55) return { label: "Легкое утомление", style: "text-yellow-700 bg-yellow-50 border-yellow-200/60 shadow-[0_2px_8px_rgba(234,179,8,0.06)]", desc: "Организм расходует накопленный запас", dotColor: "bg-yellow-500" };
    // 50-54
    if (score >= 50) return { label: "Сбалансированный ритм", style: "text-amber-700 bg-amber-50 border-amber-200/60 shadow-[0_2px_8px_rgba(245,158,11,0.06)]", desc: "Рекомендуется не перегружать системы", dotColor: "bg-amber-500" };
    // 45-49
    if (score >= 45) return { label: "Мягкий дефицит сил", style: "text-orange-700 bg-orange-50 border-orange-200/60 shadow-[0_2px_8px_rgba(249,115,22,0.06)]", desc: "Полезно обратить внимание на отдых", dotColor: "bg-orange-500" };
    // 40-44
    if (score >= 40) return { label: "Ресурс постепенно снижается", style: "text-amber-800 bg-orange-50 border-orange-200 shadow-[0_2px_8px_rgba(245,158,11,0.04)]", desc: "Организм запрашивает передышку", dotColor: "bg-amber-600" };
    
    // 35-39
    if (score >= 35) return { label: "Умеренное напряжение", style: "text-orange-900 bg-orange-100/40 border-orange-200 shadow-[0_2px_8px_rgba(239,68,68,0.04)]", desc: "Требуется восполнение энергии", dotColor: "bg-orange-600" };
    // 30-34
    if (score >= 30) return { label: "Сниженный тонус органов", style: "text-rose-700 bg-rose-50 border-rose-200 shadow-[0_2px_8px_rgba(244,63,94,0.06)]", desc: "Стоит снизить темп и восстановиться", dotColor: "bg-rose-500" };
    // 25-29
    if (score >= 25) return { label: "Выраженная усталость", style: "text-rose-800 bg-rose-50 border-rose-200 shadow-[0_2px_8px_rgba(244,63,94,0.08)]", desc: "Адаптация затруднена, нужен ресурс", dotColor: "bg-rose-600" };
    // 20-24
    if (score >= 20) return { label: "Организм в дефиците", style: "text-red-700 bg-red-50 border-red-200 shadow-[0_2px_8px_rgba(239,68,68,0.08)]", desc: "Пора позаботиться о базовых потребностях", dotColor: "bg-red-500" };
    // 15-19
    if (score >= 15) return { label: "Бережный режим", style: "text-red-800 bg-red-55 border-red-200 shadow-[0_2px_8px_rgba(239,68,68,0.1)]", desc: "Рекомендуется мягкий расслабляющий отдых", dotColor: "bg-red-600" };
    // 10-14
    if (score >= 10) return { label: "Критический расход сил", style: "text-red-900 bg-red-50 border-red-300 shadow-[0_2px_8px_rgba(220,38,38,0.1)]", desc: "Необходима пауза для глубокого сна", dotColor: "bg-red-700" };
    // 5-9
    if (score >= 5) return { label: "Глубокое истощение", style: "text-red-950 bg-red-100/70 border-red-350 shadow-[0_2px_8px_rgba(185,28,28,0.12)]", desc: "Срочно перейдите в энергосберегающий режим", dotColor: "bg-red-800" };
    // 0-4
    return { label: "Минимальный уровень ресурса", style: "text-red-950 bg-red-100 border-red-400 shadow-[0_4px_12px_rgba(185,28,28,0.15)]", desc: "Время для полной физической разгрузки", dotColor: "bg-red-900 animate-pulse" };
  };

  const statusObj = getStatusInfo(integralScore);

  // Anna analysis via dedicated engine — delegates to annaAdvisorEngine for varied, non-repetitive phrasing
  function getAnnaAnalysis() {
    const deficitNow = Math.max(0, expectedWaterByNow - effWater);
    const paceNeeded = Math.ceil(Math.max(0, waterTarget - effWater) / Math.max(1, remainingMinutes / 60));
    const topIngredients = (aggregatedIngredients || []).slice(0, 4).map((i: any) => i.name);
    const leaderCandidates = [
      { name: "Витамина C", val: dayVitC },
      { name: "Витамина A", val: dayVitA },
      { name: "Калия", val: dayPotassium },
      { name: "Магния", val: dayMagnesium },
      { name: "Железа", val: dayIron },
      { name: "Витамина B9", val: dayVitB9 },
      { name: "Витамина E", val: dayVitE },
      { name: "Витамина K", val: dayVitK },
      { name: "Цинка", val: dayZinc },
      { name: "Селена", val: daySelenium },
    ].sort((a, b) => b.val - a.val);
    const leaderNutrient = leaderCandidates[0]?.val > 0 ? leaderCandidates[0] : undefined;
    const input = {
      userName: effUserName,
      totalCalories,
      totalProtein,
      totalFat,
      totalCarbohydrates,
      totalFiber,
      topIngredients,
      effWater,
      waterTarget,
      expectedWaterByNow,
      deficitNow,
      remainingMinutes,
      paceNeeded,
      effSleep,
      effWeight,
      effSystolic,
      effDiastolic,
      leaderName: leaderNutrient?.name,
      leaderPct: leaderNutrient?.val,
    };
    return buildAnnaBalanceAnalysis(input, currentDayIndex || 1);
  }

  const getAnnaAnalysisForTab = (tabId: string) => {
    const deficitNow = Math.max(0, expectedWaterByNow - effWater);
    const paceNeeded = Math.ceil(Math.max(0, waterTarget - effWater) / Math.max(1, remainingMinutes / 60));
    const topIngredients = (aggregatedIngredients || []).slice(0, 4).map((i: any) => i.name);
    const leaderCandidates = [
      { name: "Витамина C", val: dayVitC },
      { name: "Витамина A", val: dayVitA },
      { name: "Калия", val: dayPotassium },
      { name: "Магния", val: dayMagnesium },
      { name: "Железа", val: dayIron },
      { name: "Витамина B9", val: dayVitB9 },
      { name: "Витамина E", val: dayVitE },
      { name: "Витамина K", val: dayVitK },
      { name: "Цинка", val: dayZinc },
      { name: "Селена", val: daySelenium },
    ].sort((a, b) => b.val - a.val);
    const leaderNutrient = leaderCandidates[0]?.val > 0 ? leaderCandidates[0] : undefined;
    const input = {
      userName: effUserName,
      totalCalories,
      totalProtein,
      totalFat,
      totalCarbohydrates,
      totalFiber,
      topIngredients,
      effWater,
      waterTarget,
      expectedWaterByNow,
      deficitNow,
      remainingMinutes,
      paceNeeded,
      effSleep,
      effWeight,
      effSystolic,
      effDiastolic,
      leaderName: leaderNutrient?.name,
      leaderPct: leaderNutrient?.val,
    };
    const tabOrder = ["balance", "scales", "kbju", "micro", "composition", "dynamics"];
    const tabIndexOffset = Math.max(0, tabOrder.indexOf(tabId));
    return buildAnnaTabAnalysis(tabId, input, (currentDayIndex || 1) + tabIndexOffset);
  };

  const getDisplayedAnalysis = (tabId: string) => {
    if (savedAnnaText && isReadOnly) return savedAnnaText;
    return getAnnaAnalysisForTab(tabId);
  };

  const waterLogData = (() => {
    // Primary source: DB
    if (apiStateNowData?.dailyMetric?.waterEntries) {
      try {
        const entries = typeof apiStateNowData.dailyMetric.waterEntries === 'string'
          ? JSON.parse(apiStateNowData.dailyMetric.waterEntries)
          : apiStateNowData.dailyMetric.waterEntries;
        if (entries?.length > 0) {
          return {
            lastWaterTimestamp: entries[entries.length - 1].timestamp,
            todayWaterEntries: entries.map((e: any) => ({ amount: e.amount, timestamp: e.timestamp, time: e.time })),
          };
        }
      } catch {}
    }
    // Fallback: localStorage cache
    try {
      const raw = localStorage.getItem('wfpb_daily_water_entries_v3');
      if (!raw) return { lastWaterTimestamp: undefined, todayWaterEntries: undefined };
      const logs = JSON.parse(raw);
      const todayLogs = logs[currentDayIndex];
      if (!todayLogs || todayLogs.length === 0) return { lastWaterTimestamp: undefined, todayWaterEntries: undefined };
      return {
        lastWaterTimestamp: todayLogs[todayLogs.length - 1].timestamp,
        todayWaterEntries: todayLogs.map((e) => ({ amount: e.amount, timestamp: e.timestamp, time: e.time })),
      };
    } catch {
      return { lastWaterTimestamp: undefined, todayWaterEntries: undefined };
    }
  })();

  const recommendedAction = getRecommendedNextStep({
    water: effWater,
    waterPct,
    waterTarget,
    sleep: effSleep,
    sleepPct,
    mealCount: effMealCount,
    mealsPct,
    habitsDone: effHabitsDone,
    habitsPct,
    integralScore,
    ratingWellbeing: effRatingWellbeing,
    ratingEnergy: effRatingEnergy,
    ratingLightness: effRatingLightness,
    currentDayIndex,
    dayNotes: dayNotes[currentDayIndex] || [],
    selectedChronic: effSelectedChronic,
    totalFiber,
    totalCalories,
    activityMinutes,
    ...waterLogData,
    aggregatedIngredients,
    timeZone: getUserTimeZone(),
  });

  // Hub-derived meal flags for bioDial contract (read-only hub)
  const hubHasBreakfast = effMealCount > 0;
  const hubHasLunch = effMealCount > 1;
  const hubHasDinner = effMealCount > 2;
  const hubNextStation = (() => {
    const h = currentHour;
    if (!hubHasBreakfast && h < 12) return { stationName: "Завтрак WFPB", timeRemainingText: "до 11:30" };
    if (!hubHasLunch && h < 16) return { stationName: "Обед WFPB", timeRemainingText: "13:00 – 15:00" };
    if (!hubHasDinner && h < 21) return { stationName: "Ужин WFPB", timeRemainingText: "18:30 – 20:00" };
    return { stationName: "Отдых ЖКТ и сон", timeRemainingText: "после 21:30" };
  })();

  // Correct bioDial contract — uses hub-computed stations and timeZone
  const bioDialAdvice = calculateBioDialAdvice({
    waterMl: effWater,
    waterTarget,
    sleepMinutes: effSleep,
    cookedDishesCount: effMealCount,
    activityMinutes,
    hasBreakfast: hubHasBreakfast,
    hasLunch: hubHasLunch,
    hasDinner: hubHasDinner,
    lastWaterTimestamp: waterLogData.lastWaterTimestamp,
    timeZone: getUserTimeZone(),
    nextStationName: hubNextStation.stationName,
    nextStationTime: hubNextStation.timeRemainingText,
    recommendedActionText: (recommendedAction as any)?.title,
  });

  const triggerNotification = (msg: string) => {
    setNotificationMsg(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleRatingChange = (type: "zen" | "energy" | "lightness", val: number) => {
    if (isReadOnly) return;
    const time = formatTimeHM(new Date().toISOString(), getUserTimeZone());
    const logEntry = { type, time, value: val };
    
    api("/api/metrics/ratings", {
      method: "POST",
      body: {
        date: todayLocalDate(getUserTimeZone()),
        wellbeing: type === "zen" ? val : effRatingWellbeing,
        energy: type === "energy" ? val : effRatingEnergy,
        lightness: type === "lightness" ? val : effRatingLightness,
        logEntry
      }
    }).catch(() => {});

    if (type === "zen") {
      setRatingWellbeing(val);
      triggerNotification(`Психологический дзен обновлён: ${val}/5 🕊️`);
    } else if (type === "energy") {
      setRatingEnergy(val);
      triggerNotification(`Физическая энергия обновлена: ${val}/5 ⚡`);
    } else if (type === "lightness") {
      setRatingLightness(val);
      triggerNotification(`Ощущение лёгкости обновлено: ${val}/5 🍃`);
    }

    // Save automatic diary trace if required
    if (onSaveWellbeingComment) {
      const timeStr = formatTimeHM(new Date().toISOString(), getUserTimeZone());
      onSaveWellbeingComment(
        `Зафиксированы параметры состояния в ${timeStr}:\n• Дзен-состояние: ${effRatingWellbeing}/5\n• Энергия: ${effRatingEnergy}/5\n• Лёгкость: ${effRatingLightness}/5`
      );
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#FAFBFB] relative min-h-screen">
      
      {/* Toast Notification Container */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-16 left-4 right-4 z-[90] bg-slate-900/90 backdrop-blur-md text-white py-3 px-4 rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.15)] text-[13px] font-bold flex items-center justify-between border border-white/10 font-sans"
          >
            <div className="flex items-center gap-2">
              <span className="text-[15px]">✨</span>
              <span>{notificationMsg}</span>
            </div>
            <button 
              onClick={() => setShowNotification(false)}
              className="text-white/60 hover:text-white px-2 py-1 text-[11px] font-extrabold uppercase shrink-0"
            >
              OK
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main scrollable workspace */}
      <div className="flex-1 overflow-y-auto px-5 pb-32 scrollbar-none">
        
        {/* Header Block */}
        <div className="flex items-center justify-between pt-5 pb-4 mb-2">
          <button 
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-gray-150/60 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-center text-gray-500 hover:text-gray-800 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-extrabold text-[#758478] uppercase tracking-widest leading-none font-mono">
              ДНЕВНАЯ АНАЛИТИКА • ДЕНЬ {currentDayIndex}
            </span>
            <h1 className="text-[20px] font-black text-slate-800 font-sans tracking-tight mt-1">
              Состояние сейчас
            </h1>
          </div>

          <div className="w-10 h-10 rounded-full bg-[#E8F8EE] border border-emerald-100/60 shadow-sm" />
        </div>

        {isReadOnly && (
          <div className="mx-1 mb-4 py-2 px-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
            <span className="text-amber-600 text-[13px] font-bold">📋</span>
            <span className="text-amber-800 text-[12px] font-semibold">
              Просмотр данных дня {currentDayIndex} — изменения недоступны
            </span>
          </div>
        )}

        {/* Short timestamp tag */}
        <div className="flex items-center justify-center gap-1.5 mb-5 select-none font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">
            данные обновлены на {formatTimeHM(new Date().toISOString(), getUserTimeZone())} • экспертная оценка
          </span>
        </div>

        {/* 2. MAIN INTEGRAL SCORE CONTAINER (Visible on all tabs) */}
        <div className="bg-gradient-to-b from-white to-[#F8FAFC] rounded-[32px] border border-slate-100 shadow-[0_10px_32px_rgba(15,23,42,0.02)] p-6 mb-5 text-center relative overflow-hidden">
          <div className={`absolute left-1/2 -top-12 -translate-x-1/2 w-48 h-48 rounded-full blur-[48px] pointer-events-none opacity-40 transition-all duration-700 ${
            integralScore >= 75 ? "bg-emerald-400" : (integralScore >= 50 ? "bg-sky-400" : "bg-orange-300")
          }`} />

          <div className="relative z-10 flex flex-col items-center animate-fade-in">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-sans">
              ИНТЕГРАЛЬНЫЙ ИНДЕКС WFPB-ЗДОРОВЬЯ
            </span>

            {/* Giant stylish circular progress ring */}
            <div className="relative w-40 h-40 flex items-center justify-center mt-4 mb-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle 
                  cx="60" 
                  cy="60" 
                  r="52" 
                  fill="none" 
                  stroke="#E2E8F0" 
                  strokeWidth="8"
                  className="opacity-75"
                />
                <motion.circle 
                  cx="60" 
                  cy="60" 
                  r="52" 
                  fill="none" 
                  stroke="url(#integralScoreGradient)" 
                  strokeWidth="9"
                  strokeDasharray={`${2 * Math.PI * 52}`}
                  initial={{ strokeDashoffset: `${2 * Math.PI * 52}` }}
                  animate={{ strokeDashoffset: `${2 * Math.PI * 52 * (1 - integralScore / 100)}` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="integralScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="50%" stopColor="#0EA5E9" />
                    <stop offset="100%" stopColor="#6366F1" />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center select-none font-sans">
                <span className="text-[44px] font-black text-slate-800 tracking-tight leading-none">
                  {integralScore}%
                </span>
                <span className="text-[9px] font-extrabold text-[#758478] tracking-widest uppercase mt-1">
                  БАЛАНС ДНЯ
                </span>
              </div>
            </div>

            <div className={`mt-2.5 border px-[18px] py-3 rounded-[20px] flex items-center justify-center gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-500 max-w-[310px] w-full ${statusObj.style}`}>
              {/* Dynamic Glowing LED-style core signal light */}
              <div className="relative flex h-3 w-3 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${statusObj.dotColor}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${statusObj.dotColor} border border-white/20`} />
              </div>
              
              <div className="flex flex-col text-left">
                <span className="text-[13px] font-bold tracking-tight leading-tight">
                  {statusObj.label}
                </span>
                <span className="text-[10.5px] opacity-85 font-medium mt-0.5 leading-snug">
                  {statusObj.desc}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. NEW TAB NAVIGATION (6 big tactile card buttons) */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 font-sans">
          
          {/* TAB 1: БАЛАНС */}
          <button
            onClick={() => setActiveTab("balance")}
            className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[82px] cursor-pointer ${
              activeTab === "balance"
                ? "bg-emerald-50/50 border-emerald-200 shadow-sm text-emerald-800 scale-[1.02] font-black"
                : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-850"
            }`}
          >
            {activeTab === "balance" && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
            <Scale className={`w-5 h-5 mb-1 ${activeTab === "balance" ? "text-emerald-600" : "text-slate-400"}`} />
            <span className="text-[11.5px] font-bold tracking-tight">Баланс</span>
            <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Итог дня</span>
          </button>

          {/* TAB 2: ШКАЛЫ */}
          <button
            onClick={() => setActiveTab("scales")}
            className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[82px] cursor-pointer ${
              activeTab === "scales"
                ? "bg-indigo-50/50 border-indigo-200 shadow-sm text-indigo-800 scale-[1.02] font-black"
                : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-850"
            }`}
          >
            {activeTab === "scales" && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-indigo-500" />
            )}
            <Activity className={`w-5 h-5 mb-1 ${activeTab === "scales" ? "text-indigo-600" : "text-slate-400"}`} />
            <span className="text-[11.5px] font-bold tracking-tight">Шкалы</span>
            <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Приборы</span>
          </button>

          {/* TAB 3: КБЖУ */}
          <button
            onClick={() => setActiveTab("kbju")}
            className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[82px] cursor-pointer ${
              activeTab === "kbju"
                ? "bg-amber-50/50 border-amber-200 shadow-sm text-amber-900 scale-[1.02] font-black"
                : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-850"
            }`}
          >
            {activeTab === "kbju" && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-amber-550" />
            )}
            <Flame className={`w-5 h-5 mb-1 ${activeTab === "kbju" ? "text-amber-600" : "text-slate-400"}`} />
            <span className="text-[11.5px] font-bold tracking-tight">КБЖУ</span>
            <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Питание</span>
          </button>

          {/* TAB 4: МИКРО */}
          <button
            onClick={() => setActiveTab("micro")}
            className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[82px] cursor-pointer ${
              activeTab === "micro"
                ? "bg-rose-50/50 border-rose-200 shadow-sm text-rose-850 scale-[1.02] font-black"
                : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-850"
            }`}
          >
            {activeTab === "micro" && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
            )}
            <Sparkles className={`w-5 h-5 mb-1 ${activeTab === "micro" ? "text-rose-600" : "text-slate-400"}`} />
            <span className="text-[11.5px] font-bold tracking-tight">Микро</span>
            <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Витамины</span>
          </button>

          {/* TAB 5: СОСТАВ */}
          <button
            onClick={() => setActiveTab("composition")}
            className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[82px] cursor-pointer ${
              activeTab === "composition"
                ? "bg-emerald-50/50 border-emerald-250 shadow-sm text-emerald-950 scale-[1.02] font-black"
                : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-850"
            }`}
          >
            {activeTab === "composition" && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            )}
            <Utensils className={`w-5 h-5 mb-1 ${activeTab === "composition" ? "text-[#10B981]" : "text-slate-400"}`} />
            <span className="text-[11.5px] font-bold tracking-tight">Состав</span>
            <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Сырьё</span>
          </button>

          {/* TAB 6: ДИНАМИКА */}
          <button
            onClick={() => setActiveTab("dynamics")}
            className={`relative p-3 rounded-2xl border flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[82px] cursor-pointer ${
              activeTab === "dynamics"
                ? "bg-sky-50/50 border-sky-200 shadow-sm text-sky-850 scale-[1.02] font-black"
                : "bg-white border-slate-100 hover:border-slate-200 text-slate-500 hover:text-slate-850"
            }`}
          >
            {activeTab === "dynamics" && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-sky-500" />
            )}
            <TrendingUp className={`w-5 h-5 mb-1 ${activeTab === "dynamics" ? "text-sky-600" : "text-slate-400"}`} />
            <span className="text-[11.5px] font-bold tracking-tight">Динамика</span>
            <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">Ход дня</span>
          </button>

        </div>

        {/* 4. ACTIVE SECTION CONTAINER */}
        <AnimatePresence mode="wait">
          {activeTab === "balance" && (
            <BalanceTab
              key="balance"
              tabId={activeTab}
               getAnnaAnalysis={() => getDisplayedAnalysis("balance")}
              integralScore={integralScore}
              sleepPct={sleepPct}
              waterPct={waterPct}
              hydrationState={hydrationState}
              mealsPct={mealsPct}
              habitsPct={habitsPct}
              ratingWellbeing={effRatingWellbeing}
              ratingEnergy={effRatingEnergy}
              ratingLightness={effRatingLightness}
              recommendedAction={recommendedAction}
              triggerNotification={triggerNotification}
              onBack={onBack}
              setScreen={setScreenFn}
            />
          )}

          {activeTab === "scales" && (
            <ScalesTab
              key="scales"
              sleep={effSleep}
              sleepPct={sleepPct}
              water={effWater}
              waterPct={waterPct}
              waterTarget={waterTarget}
              mealCount={effMealCount}
              mealsPct={mealsPct}
              mealsTarget={mealsTarget}
              habitsDone={effHabitsDone}
              habitsPct={habitsPct}
              habitsTarget={habitsTarget}
              ratingEnergy={effRatingEnergy}
              energyPct={energyPct}
              ratingWellbeing={effRatingWellbeing}
              ratingLightness={effRatingLightness}
              wellbeingLog={wellbeingLog}
              energyLog={energyLog}
              lightnessLog={lightnessLog}
              activityLogs={activityLogs}
              todayWaterEntries={waterLogData.todayWaterEntries}
              currentDayIndex={currentDayIndex}
              todayCookedBookCount={todayCookedBookCount}
              todayTotalBookMenuCount={todayTotalBookMenuCount}
              totalCookedBookRecipesCount={totalCookedBookRecipesCount}
              handleRatingChange={handleRatingChange}
              annaAnalysisText={getDisplayedAnalysis("scales")}
              recommendedAction={recommendedAction}
            />
          )}

          {activeTab === "kbju" && (
            <KbjuTab
              key="kbju"
              totalCalories={totalCalories}
              totalProtein={totalProtein}
              totalFat={totalFat}
              totalCarbohydrates={totalCarbohydrates}
              totalFiber={totalFiber}
              annaAnalysisText={getDisplayedAnalysis("kbju")}
              recommendedAction={recommendedAction}
            />
          )}

          {activeTab === "micro" && (
            <MicroTab
              key="micro"
              dayVitA={dayVitA}
              dayVitC={dayVitC}
              dayVitB9={dayVitB9}
              dayVitE={dayVitE}
              dayVitK={dayVitK}
              dayIron={dayIron}
              dayMagnesium={dayMagnesium}
              dayZinc={dayZinc}
              dayPotassium={dayPotassium}
              dayLysine={dayLysine}
              daySelenium={daySelenium}
              hasPartialBookDishes={hasPartialBookDishes}
              realProfileCount={realProfileCount}
              hasAnyRealMicronutrientProfile={hasAnyRealMicronutrientProfile}
              annaAnalysisText={getDisplayedAnalysis("micro")}
              recommendedAction={recommendedAction}
            />
          )}

          {activeTab === "composition" && (
            <CompositionTab
              key="composition"
              aggregatedIngredients={aggregatedIngredients}
              cookedBookDishes={cookedBookDishes}
              todayCustomDishes={todayCustomDishes}
              annaAnalysisText={getDisplayedAnalysis("composition")}
              recommendedAction={recommendedAction}
            />
          )}

          {activeTab === "dynamics" && (
            <DynamicsTab
              key="dynamics"
              sleep={effSleep}
              water={effWater}
              ratingEnergy={effRatingEnergy}
              ratingWellbeing={effRatingWellbeing}
              ratingLightness={effRatingLightness}
              habitsDone={effHabitsDone}
              habitsTarget={habitsTarget}
              cookedBookDishes={cookedBookDishes}
              annaAnalysisText={getDisplayedAnalysis("dynamics")}
              recommendedAction={recommendedAction}
              currentDayIndex={currentDayIndex}
              savedDishes={effSavedDishes}
              activityLogs={activityLogs}
            />
          )}
        </AnimatePresence>

      </div>

      {/* FIXED FOOTER NAV PANEL - Remains part of screen layout and moves with the app */}
      <div className="absolute bottom-0 left-0 right-0 z-30 font-sans">
        <BottomBar 
          onHomeClick={onBack}
          onDiaryClick={() => {}}
          onAnalyticsClick={() => {}}
          onProfileClick={() => {}}
          activeTab="my-day"
        />
      </div>

    </div>
  );
}
