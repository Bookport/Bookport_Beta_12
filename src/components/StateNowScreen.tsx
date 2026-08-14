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
import { resolveAvatarForTab, resolveGeneralAvatar } from "../utils/annaAvatarResolver";
import { api } from "../utils/api";
import { getBookMacros } from "../utils/bookMacros";
import { getRecipeImagePath } from "../utils/recipeImageMapper";
import { getPlural } from "../utils/pluralize";

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

  // Anna Assistant Dialog Overlay states
  const [showAnnaOverlay, setShowAnnaOverlay] = useState(false);
  const [annaSelectedQuestion, setAnnaSelectedQuestion] = useState<string | null>(null);
  const [annaOverlayAnswer, setAnnaOverlayAnswer] = useState<string>("");
  const [isAnnaThinking, setIsAnnaThinking] = useState(false);

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
    if (isReadOnly || !currentDayIndex) return;
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
  }, [currentDayIndex]);

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

  const handleWakeConfirm = (minutes: number) => {
    const todayStr = new Date().toLocaleDateString("en-CA");
    api("/api/metrics/daily", {
      method: "POST",
      body: { date: todayStr, dayIndex: currentDayIndex, sleepMinutes: minutes },
    }).then(() => {
      const dayIdx = currentDayIndex || 1;
      api<any>("/api/user/state-now?dayIndex=" + dayIdx).then(data => {
        setApiStateNowData(data);
      });
    }).catch(() => {});
  };

  // ── Effective values: props take precedence, API data is fallback ──
  const effWater = apiStateNowData?.dailyMetric?.waterMl ?? water;
  const effSleep = apiStateNowData?.dailyMetric?.sleepMinutes ?? sleep;
  const effUserName = apiStateNowData?.profile?.name || userName;
  const effUserGender = apiStateNowData?.profile?.gender || userGender;
  const effSelectedChronic: string[] = (apiStateNowData?.profile?.chronicConditions?.length ? apiStateNowData.profile.chronicConditions : selectedChronic) || [];
  const effRatingWellbeing = apiStateNowData?.dailyRating?.wellbeing ?? ratingWellbeing;
  const effRatingEnergy = apiStateNowData?.dailyRating?.energy ?? ratingEnergy;
  const effRatingLightness = apiStateNowData?.dailyRating?.lightness ?? ratingLightness;
  const effInitialWeight = apiStateNowData?.profile?.initialWeight;
  const effInitialSystolic = apiStateNowData?.profile?.initialSystolic;
  
  // Extract all valid measurements from history, sorted by timestamp
  const allMeasurements = measurementHistory
    .flatMap(d => d.measurements || [])
    .filter(m => m && m.timestamp)
    .sort((a: any, b: any) => a.timestamp - b.timestamp);

  const latestMeas = allMeasurements.length > 0 ? allMeasurements[allMeasurements.length - 1] : null;
  const prevMeas = allMeasurements.length > 1 ? allMeasurements[allMeasurements.length - 2] : null;

  const effWeight = latestMeas?.weight ?? apiStateNowData?.profile?.weight ?? weight;
  const effSystolic = latestMeas?.systolic ?? apiStateNowData?.profile?.systolic;
  const effDiastolic = latestMeas?.diastolic ?? apiStateNowData?.profile?.diastolic;
  
  const wellbeingLog = apiStateNowData?.dailyRating?.wellbeingLog || [];
  const energyLog = apiStateNowData?.dailyRating?.energyLog || [];
  const lightnessLog = apiStateNowData?.dailyRating?.lightnessLog || [];
  
  const activityLogs = apiStateNowData?.dailyMetric?.movementLog ? (typeof apiStateNowData.dailyMetric.movementLog === 'string' ? JSON.parse(apiStateNowData.dailyMetric.movementLog) : apiStateNowData.dailyMetric.movementLog) : [];
  const effSavedDishes = savedDishes.length ? savedDishes : (apiStateNowData?.savedDishes || []);
  const effHabitsDone = SystemKeysStore.calculateKeysForDay(currentDayIndex || 1, effSavedDishes, effWater).closedCount;
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" });

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
      carb: !isNaN(parseFloat(macros.carbohydrates)) ? parseFloat(macros.carbohydrates) : 30,
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
        const dishDate = dish.createdAt ? new Date(dish.createdAt).toLocaleDateString("en-CA", { timeZone: "Europe/Moscow" }) : null;
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
            ? new Date(dish.createdAt).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" })
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

  // Custom Dishes from DIY / From What Is modules
  const todayCustomDishes = (effSavedDishes || [])
    .filter(dish => {
      if (dish.isBookRecipe) return false;
      return true;
    })
    .map(dish => {
      return {
        id: dish.id,
        name: dish.name,
        category: dish.category,
        image: dish.image,
        ingredients: typeof dish.ingredients === 'string' ? JSON.parse(dish.ingredients) : dish.ingredients,
        calories: dish.calories,
        protein: dish.protein,
        fat: dish.fat,
        fiber: dish.fiber,
        time: dish.time || (dish.createdAt
          ? new Date(dish.createdAt).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" })
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

  const totalCalories = dbData.totalCalories;
  const totalProtein = dbData.totalProtein;
  const totalFat = dbData.totalFat;
  const totalCarbohydrates = dbData.totalCarbohydrates;
  const totalFiber = dbData.totalFiber;

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
  const currentHour = new Date().getHours();
  const currentMinute = new Date().getMinutes();
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

  // Dynamic holistic synthesis from AI Expert curator Anna
  function getAnnaAnalysis() {
    const greeting = effUserName ? `${effUserName}, ` : "Приветствую! ";
    const totalDishes = cookedBookDishes.length + todayCustomDishes.length;
    
    let foodParagraph = "";
    if (totalDishes > 0) {
      const topIngredients = aggregatedIngredients.slice(0, 3).map(i => i.name.toLowerCase()).join(", ");
      const ingredientsAddon = topIngredients ? ` на базе биоактивных компонентов: ${topIngredients}` : "";
      foodParagraph = `Сегодня в архив вашего рациона занесено ${totalDishes} ${getPlural(totalDishes, ['блюдо', 'блюда', 'блюд'])}${ingredientsAddon}. Мы обеспечили клетки питательным объемом в ${totalCalories} ккал, ${totalProtein} г целевого белка и ${totalFiber} г терапевтической растительной клетчатки. `;
    } else {
      foodParagraph = `В архиве питания пока нет подтвержденных блюд за сегодня. Постарайтесь записать приготовленный завтрак или обед из книги курса либо отсканировать состав в модуле «Сделай сам». `;
    }

    let progressParagraph = "";
    const bookCookedToday = cookedBookDishes.length;
    if (bookCookedToday > 0) {
      progressParagraph = `Ваш прогресс по курсу книги сегодня: ${bookCookedToday} ${getPlural(bookCookedToday, ['шаг', 'шага', 'шагов'])} дневного меню выполнено на текущем Дне ${currentDayIndex}. Каждое такое попадание формирует правильный состав кишечной микробиоты, поддерживая тонкий баланс иммунных клеток. Всего по курсу вами приготовлено уже ${totalCookedBookRecipesCount} ${getPlural(totalCookedBookRecipesCount, ['рецепт', 'рецепта', 'рецептов'])}. `;
    } else {
      progressParagraph = `Сегодня отличный момент, чтобы свериться со страницей Дня ${currentDayIndex} в книге рецептов и сделать первый шаг. Приготовление даже одного цельного блюда дня — мощная поддержка ваших сосудов. `;
    }

    let microsParagraph = "";
    if (totalDishes > 0) {
      const highestCovered = [
        { name: "Витамина C", value: dayVitC },
        { name: "Витамина A", value: dayVitA },
        { name: "Калия", value: dayPotassium },
        { name: "Магния", value: dayMagnesium },
        { name: "Железа", value: dayIron }
      ].sort((a, b) => b.value - a.value)[0];

      if (highestCovered && highestCovered.value > 15) {
        microsParagraph = `Ваше сегодняшнее меню создало мощный клеточный щит — особенно выделяется высокий уровень накопления ${highestCovered.name} (около ${Math.min(150, highestCovered.value)}% суточной нормы), что способствует мгновенному расслаблению гладкой мускулатуры почек и выводу застойной жидкости. `;
      }
    }

    let chronicParagraph = "";
    if (effSelectedChronic && effSelectedChronic.length > 0) {
      const mainChr = effSelectedChronic[0].toLowerCase();
      if (mainChr.includes("давлен") || mainChr.includes("гипертония") || mainChr.includes("сосуд")) {
        chronicParagraph = `Учитывая вашу склонность к колебаниям давления, отсутствие поваренной соли и минимизация насыщенных жиров в сегодняшних блюдах — критически важная непревентивная мера: кровоток свободен от сопротивления, почки дышат легко. `;
      } else if (mainChr.includes("вес") || mainChr.includes("ожирение") || mainChr.includes("метабол")) {
        chronicParagraph = `Для снижения веса и нормализации липидного профиля клетчатка весом ${totalFiber} г выступает природным адсорбентом и задерживает усвоение простых сахаров, исключая гликемические инсулиновые качели. `;
      } else {
        chronicParagraph = `Гармоничное WFPB-сочетание снижает системное воспаление, поддерживая органы-мишени от оксидативного стресса. `;
      }
    }

    let measurementParagraph = "";
    if (effWeight > 0) {
      let weightTrend = "";
      
      if (latestMeas?.weight && prevMeas?.weight && Math.abs(latestMeas.weight - prevMeas.weight) >= 0.1) {
        const diff = latestMeas.weight - prevMeas.weight;
        weightTrend = diff < 0
          ? `Со времени прошлого замера ваш вес снизился на ${Math.abs(diff).toFixed(1)} кг! `
          : `Со времени прошлого замера ваш вес увеличился на ${diff.toFixed(1)} кг. `;
      } else if (effInitialWeight && effInitialWeight > 0 && Math.abs(effWeight - effInitialWeight) > 0.5) {
        const diff = effWeight - effInitialWeight;
        weightTrend = diff < 0
          ? `Отлично, вы снизили вес на ${Math.abs(diff).toFixed(1)} кг относительно стартовой отметки. `
          : `Ваш вес вырос на ${diff.toFixed(1)} кг относительно стартовой отметки. `;
      }
      
      const bpInfo = (effSystolic && effDiastolic)
        ? `Артериальное давление держится в пределах ${effSystolic}/${effDiastolic} мм рт. ст. `
        : "";
      measurementParagraph = `По замерам сегодня: масса тела составляет ${effWeight} кг. ${bpInfo}${weightTrend}`;
    }

    let contextParagraph = "";
    const notesArr = dayNotes[currentDayIndex] || [];
    if (notesArr.length > 0) {
      const lastNoteText = notesArr[notesArr.length - 1].text.toLowerCase();
      if (lastNoteText.includes("тяжесть") || lastNoteText.includes("дискомфорт")) {
        contextParagraph = `Заметила вашу отметку о легком дискомфорте в заметках. Помните, что адаптация ЖКТ к высоким дозам клетчатки требует времени и обильного питья. Не перегружайте желудок, делайте теплые глотки. `;
      } else {
        contextParagraph = `Судя по вашим заметкам и настроению дня, дзен-состояние находится на стабильной отметке ${effRatingWellbeing}/5 — психосоматический контур полностью синхронизирован с балансом питания. `;
      }
    }

    let waterAdvice = "";
    if (hydrationState === 'success') {
      waterAdvice = `Дневная норма воды выполнена (${effWater} мл). Водно-солевой баланс идеален. `;
    } else if (hydrationState === 'warning') {
      waterAdvice = `Обращаю внимание: клеточная гидратация требует внимания (${effWater} мл). Прошло больше 2 часов с последнего стакана — выпейте 250 мл чистой воды прямо сейчас. `;
    } else {
      waterAdvice = `Ваш водный баланс в безупречном тонусе (${effWater} мл), лимфоток и детоксикация идут полным ходом! `;
    }

    return `${greeting}рада подвести для вас целостный биоэнергетический итог дня.\n\n${foodParagraph}${progressParagraph}${microsParagraph}${chronicParagraph}${measurementParagraph}${contextParagraph}${waterAdvice}Желаю вам прекрасного самочувствия. Какой наш индивидуальный следующий шаг?`;
  }

  const getAnnaAnalysisForTab = (tabId: string) => {
    const greeting = effUserName ? `${effUserName}, ` : "";

    if (tabId === "balance") {
      const hasRed = aggregatedIngredients.some(i => i.status === "red");
      const hasGreenNeutralizer = aggregatedIngredients.some(i =>
        i.status === "green" && ["шпинат","брокколи","яблоко","лён","льнян","чиа","зелень","салат","капуст","сельдерей","петруш","укроп","кинз"].some(kw => i.name.toLowerCase().includes(kw))
      );
      const analysis = getAnnaAnalysis();
      if (hasRed && !hasGreenNeutralizer) {
        const badNames = aggregatedIngredients.filter(i => i.status === "red").slice(0, 2).map(i => i.name.toLowerCase()).join(" и ");
        return `⚠️ Внимание! В рационе обнаружены нежелательные компоненты: ${badNames}. Рекомендуется нейтрализовать их зелёными волокнами (шпинат, брокколи, лён).\n\n` + analysis;
      }
      if (hasRed && hasGreenNeutralizer && !neutralizationNoted.current) {
        neutralizationNoted.current = true;
        return "Отлично! Нейтрализация вредного ингредиента произведена. Баланс восстановлен.\n\n" + analysis;
      }
      return analysis;
    }

    if (tabId === "scales") {
      let waterText = "";
      if (isAheadOnWater) {
        if (remainingMinutes < 120 && effWater < waterTarget) {
          waterText = `выпито ${effWater} мл из ${waterTarget} мл. До сна осталось меньше 2 часов, постарайся уложиться в норму, но не пей за час до отхода ко сну.`;
        } else {
          waterText = `водный баланс в отличном состоянии (${effWater} мл). Ты опережаешь график — к этому часу ожидалось ${expectedWaterByNow} мл.`;
        }
      } else {
        if (remainingMinutes < 120) {
          const need = waterTarget - effWater;
          waterText = `выпито ${effWater} мл из ${waterTarget} мл, осталось ${need} мл. До сна меньше 2 часов — постарайся уложиться, но без фанатизма перед сном.`;
        } else {
          const deficitNow = expectedWaterByNow - effWater;
          const paceNeeded = Math.ceil((waterTarget - effWater) / Math.max(1, remainingMinutes / 60));
          waterText = `заметен дефицит гидратации клеток: выпито ${effWater} мл при ожидаемых ${expectedWaterByNow} мл к этому часу (отставание ${deficitNow} мл). Чтобы уложиться в норму ${waterTarget} мл, рекомендуется темп ~${paceNeeded} мл/ч.`;
        }
      }

      let sleepText = "";
      if (sleepPct < 60) {
        sleepText = `продолжительность сна (${Math.round(effSleep / 60)} ч) ниже восстановительного оптимума. Постарайся сегодня лечь пораньше, чтобы нервная система успела завершить глимфатическую очистку мозга.`;
      } else {
        sleepText = `сон составил прекрасные ${Math.round(effSleep / 60)} ч. Твой сосудистый тонус восстановился благодаря активности мелатонина.`;
      }

      let habitsText = "";
      if (habitsPct < 50) {
        habitsText = `клеточный импульс (активность) пока на невысоком уровне (${effHabitsDone}/${habitsTarget}). Добавь немного шагов, чтобы раскачать лимфодренаж и снабдить ткани свежим кислородом.`;
      } else {
        habitsText = `отличный показатель по привычкам активности (${effHabitsDone}/${habitsTarget})! Мы активировали жиросжигающий потенциал и поддержали чувствительность к инсулину.`;
      }

      return `${greeting}давай взглянем на главные шкалы твоего состояния.\n\nУ нас сложилась следующая картина: по воде ${waterText} По сну ${sleepText} А по активности — ${habitsText}\n\nС учётом этого система подобрала рекомендованный шаг: **${recommendedAction.title}** (${recommendedAction.desc}). Это лучшее точечное действие, чтобы подтянуть проседающие зоны.`;
    }

    if (tabId === "kbju") {
      const kcalText = totalCalories > 0 
        ? `сегодня рацион обеспечил ${totalCalories} ккал.` 
        : `питание за сегодня пока не зафиксировано. Помни, что регулярный WFPB рацион уберегает твой организм от метаболической просадки.`;

      let fiberAdvice = "";
      if (totalFiber === 0) {
        fiberAdvice = `клетчатка сегодня на нуле. Это критично! Кишечная микробиота ждёт пищевых волокон для синтеза короткоцепочечных жирных кислот, защищающих сосуды от воспаления.`;
      } else if (totalFiber < 25) {
        fiberAdvice = `у нас накоплено ${totalFiber} г клетчатки при целевой норме от 35 г. Чтобы поддержать гладкую мускулатуру ЖКТ и очистить сосуды от холестерина, постарайся добавить бобовые или зелень.`;
      } else {
        fiberAdvice = `супер-результат по клетчатке: ${totalFiber} г! Твой ЖКТ работает безупречно, а уровень инсулина будет оставаться ровным и стабильным.`;
      }

      let macroPower = "";
      if (totalProtein > 0 || totalFat > 0) {
        macroPower = `Белки высокой чистоты (${totalProtein} г) и растительные липиды (${totalFat} г) дают клеткам прочную строительную базу без создания оксидативного стресса для сосудов.`;
      }

      return `${greeting}анализ твоего КБЖУ на сегодня:\n\nПо энергетическому наполнению: ${kcalText} По волокнам: ${fiberAdvice} ${macroPower}\n\nРекомендованное действие **${recommendedAction.title}** идеально вписывается в твой план питания.`;
    }

    if (tabId === "micro") {
      const highestVit = [
        { name: "витамину C", value: dayVitC },
        { name: "витамину A", value: dayVitA },
        { name: "фолиевой кислоте (B9)", value: dayVitB9 },
        { name: "витамину E", value: dayVitE },
        { name: "витамину K", value: dayVitK }
      ].sort((a, b) => b.value - a.value)[0];

      const highestMin = [
        { name: "калию (K)", value: dayPotassium },
        { name: "магнию (Mg)", value: dayMagnesium },
        { name: "железу (Fe)", value: dayIron },
        { name: "цинку (Zn)", value: dayZinc },
        { name: "селену (Se)", value: daySelenium }
      ].sort((a, b) => b.value - a.value)[0];

      let vitLeaderText = (highestVit && highestVit.value > 10) 
        ? `Лидером среди витаминов является вклад по ${highestVit.name} (${Math.round(highestVit.value)}%).`
        : `Витаминная активность пока в процессе накопления.`;

      let minLeaderText = (highestMin && highestMin.value > 10)
        ? `Среди минералов лидирует насыщение по ${highestMin.name} (оно достигло ${Math.round(highestMin.value)}% суточной нормы), что способствует мгновенному расслаблению гладкой мускулатуры сосудов.`
        : `Показатели минералов отражают начальный этап фиксации рациона.`;

      let emptyWarn = "";
      if (dayVitC === 0 || dayPotassium === 0 || dayMagnesium === 0) {
        emptyWarn = ` Не переживай, если по некоторым показателям (например, калию или селену) видишь 0%. Это лишь значит, что мы пока не успели подтвердить все блюда. Твоему телу нужно время на кумулятивный накопительный эффект.`;
      }

      return `${greeting}твоя микронутриентная карта — это тончайший оркестр здоровья.\n\n${vitLeaderText} ${minLeaderText}${emptyWarn}\n\nЧтобы мягко напитать клетки и усилить минеральный щит, наш рекомендованный следующий шаг — **${recommendedAction.title}** — сработает безупречно!`;
    }

    if (tabId === "composition") {
      if (aggregatedIngredients.length === 0) {
        return `${greeting}в сырьевой базе твоего дня пока пусто. Растительное разнообразие измеряется десятками цельных продуктов. Как только мы занесём первое приготовленное блюдо, я смогу разобрать его молекулярные преимущества.\n\nДавай начнем с выполнения шага — **${recommendedAction.title}**!`;
      }

      const topIngredientsText = aggregatedIngredients.slice(0, 4).map(i => i.name.toLowerCase()).join(", ");
      const hasLeafyGreen = aggregatedIngredients.some(i => i.name.toLowerCase().includes("шпинат") || i.name.toLowerCase().includes("зелень") || i.name.toLowerCase().includes("салат"));

      let microBioText = hasLeafyGreen 
        ? "Особенно ценно присутствие зелёных листьев — они поставляют оксид азота для защиты эндотелия сосудов."
        : "Постарайся добавить в течение дня больше тёмно-зелёных листьев, чтобы поддержать тонус капилляров.";

      return `${greeting}анализирую сырьевой состав твоего рациона.\n\nСегодня в основе твоей тарелки: ${topIngredientsText}. Это прекрасный биоактивный спектр, поставляющий клетчатке нужный объём. ${microBioText}\n\nНаш рекомендованный шаг **${recommendedAction.title}** гармонично дополнит этот сырьевой профиль.`;
    }

    if (tabId === "dynamics") {
      let zenMood = "";
      if (effRatingWellbeing >= 4) {
        zenMood = "Твоё дзен-состояние на высоте, психосоматический контур полностью стабилен.";
      } else {
        zenMood = "Фиксируется легкое напряжение в дзен-состоянии. Тёплое питье и исключение раздражителей помогут восстановить баланс.";
      }

      let energyMood = "";
      if (effRatingEnergy >= 4) {
        energyMood = "Запас физической энергии на отличном уровне, клетки заряжены митохондриальным кислородом.";
      } else {
        energyMood = "Уровень энергии умеренный. Не перегружай сегодня рецепторы, дай организму мягкий отдых.";
      }

      return `${greeting}давай проследим динамику твоего биоритма.\n\n${zenMood} ${energyMood} Все показатели текущего дня формируют плавную синусоиду активности без резких перепадов.\n\nВыполнение шага **${recommendedAction.title}** прямо сейчас поможет закрепить результат и подготовить нервную систему к благотворному восстановлению.`;
    }

    return getAnnaAnalysis();
  };

  const getDisplayedAnalysis = (tabId: string) => {
    if (savedAnnaText && isReadOnly) return savedAnnaText;
    return getAnnaAnalysisForTab(tabId);
  };

  const getTabRussianName = (tabId: string) => {
    switch (tabId) {
      case "balance": return "Баланс";
      case "scales": return "Шкалы";
      case "kbju": return "КБЖУ";
      case "micro": return "Микро";
      case "composition": return "Состав";
      case "dynamics": return "Динамика";
      default: return "";
    }
  };

  const getAnnaQuestionsForTab = (tabId: string) => {
    const defaultQ = [
      { key: "why_next_step", label: "Почему выбран этот следующий шаг?" },
      { key: "general_analysis", label: "О чем говорят показатели этой вкладки?" },
    ];
    switch (tabId) {
      case "balance":
        return [
          { key: "balance_why", label: "Почему у меня именно такой баланс?" },
          { key: "why_next_step", label: "Почему рекомендован этот следующий шаг?" },
          { key: "balance_water_zen", label: "Как связаны вода и мой психосоматический дзен?" }
        ];
      case "scales":
        return [
          { key: "scales_trouble", label: "Что у меня здесь сильнее всего проседает?" },
          { key: "scales_pulse", label: "Что означает процент клеточного импульса?" },
          { key: "why_next_step", label: "Зачем мне этот рекомендуемый следующий шаг?" }
        ];
      case "kbju":
        return [
          { key: "kbju_fiber", label: "Хватает ли мне сейчас клетчатки?" },
          { key: "kbju_macros", label: "Сбалансированы ли мои белки и жиры?" },
          { key: "why_next_step", label: "Как следующий шаг повлияет на КБЖУ?" }
        ];
      case "micro":
        return [
          { key: "micro_leaders", label: "Какие микроэлементы у меня сегодня в лидерах?" },
          { key: "micro_zeros", label: "Что делать с нулевыми показателями на шкале?" },
          { key: "micro_vaso", label: "Как калий и магний укрепляют сосуды?" }
        ];
      case "composition":
        return [
          { key: "comp_factors", label: "Какие ингредиенты больше всего формируют мой день?" },
          { key: "comp_microbiome", label: "Как этот сырьевой состав кормит микробиоту?" },
          { key: "comp_diversity", label: "Как мне повысить сортовое WFPB-разнообразие завтра?" }
        ];
      case "dynamics":
        return [
          { key: "dyn_rhythm", label: "О чем говорит динамика моих действий?" },
          { key: "dyn_energy", label: "Как связан уровень энергии и съеденные блюда?" },
          { key: "dyn_future", label: "Как закрепить стабильный результат на будущее?" }
        ];
      default:
        return defaultQ;
    }
  };

  const handleSelectQuestion = (qKey: string) => {
    setAnnaSelectedQuestion(qKey);
    setIsAnnaThinking(true);
    
    setTimeout(() => {
      setIsAnnaThinking(false);
      let answer = "";
      
      const greeting = effUserName ? `${effUserName}, ` : "";
      
      if (qKey === "why_next_step") {
        answer = `${greeting}система предложила тебе шаг **«${recommendedAction.title}»** (${recommendedAction.desc}) по очень конкретной причине:\n\n${recommendedAction.reasoning}\n\nЯ абсолютно поддерживаю этот выбор, так как он точечно закрывает дефицит ресурсов твоего организма прямо сейчас!`;
      } else if (qKey === "general_analysis") {
        answer = getDisplayedAnalysis(activeTab);
      }
      
      // Balance tab detailed
      else if (qKey === "balance_why") {
        answer = `${greeting}твой интегральный баланс равен **${integralScore}%**. Этот показатель отражает общую картину дня. Он складывается на 20% из воды (${waterPct}%), на 20% из сна (${sleepPct}%), на 20% из питания (${mealsPct}%), на 15% из активности (${habitsPct}%) и 25% из твоего ментального и физического самочувствия.\n\nКаждая из этих зон важна, поэтому высокий индекс — это показатель твоей бережной заботы о здоровье.`;
      } else if (qKey === "balance_water_zen") {
        answer = `Связь воды и психосоматики огромна. Когда гидратация клеток падает (${waterPct}%), кровь сгущается, снижается доставка кислорода в структуры мозга, что воспринимается корой как сигнал тревоги. Стабильный водный баланс убирает этот базовый тканевый стресс, помогая твоему дзень-состоянию зафиксироваться на отметке ${effRatingWellbeing}/5!`;
      }
      
      // Scales tab detailed
      else if (qKey === "scales_trouble") {
        const items = [
          { name: "Водный баланс", val: waterPct, d: "выпить 250 мл чистой теплой воды" },
          { name: "Восстановительный сон", val: sleepPct, d: "постараться уснуть до 23:00" },
          { name: "Растительный рацион", val: mealsPct, d: "записать ужин или перекус" },
          { name: "Клеточный импульс (активность)", val: habitsPct, d: "сделать легкую разминку или прогулку" }
        ].sort((a, b) => a.val - b.val);
        
        const lowest = items[0];
        if (lowest.val === 100) {
          answer = `${greeting}у тебя идеальные шкалы! Все показатели на 100%. Ты сегодня настоящий WFPB-чемпион, продолжай в том же духе!`;
        } else {
          answer = `Сейчас сильнее всего провисает **${lowest.name}** (${lowest.val}%). Я рекомендую сосредоточиться на этом дефиците — например, ${lowest.d}, чтобы мгновенно выровнять интегральный индекс здоровья.`;
        }
      } else if (qKey === "scales_pulse") {
        answer = `Клеточный импульс равен **${habitsPct}%**. Это уровень выполнения твоих намеченных привычек за сегодня (${effHabitsDone}/${habitsTarget}). В WFPB-программе физическая активность — это не просто калории, а способ активировать лимфодренаж и тонус сосудистого русла. Каждый пройденный шаг бережет твои вены!`;
      }
      
      // KBJU tab detailed
      else if (qKey === "kbju_fiber") {
        if (totalFiber === 0) {
          answer = `Сегодня клетчатка равна 0 г. Это серьезный сигнал! Пищевые волокна — единственная пища для симбионтной микробиоты кишечника. Постарайся добавить в ближайший приём пищи немного бобовых, шпината или ягод.`;
        } else if (totalFiber < 25) {
          answer = `Сейчас у нас зафиксировано **${totalFiber} г клетчатки** (при целевой норме 35 г). Это хорошая база, но её можно улучшить. Волокна — это естественный фильтр, который замедляет всасывание сахаров и не допускает инсулиновых скачков. Предлагаю добавить горсть миндаля или порцию брокколи!`;
        } else {
          answer = `У тебя блестящий уровень клетчатки — **${totalFiber} г**! Это прекрасный терапевтический объём. Твоя микрофлора ликует, а сосуды и кишечник работают на полную мощность. Горжусь тобой!`;
        }
      } else if (qKey === "kbju_macros") {
        answer = `Твои белки составляют **${totalProtein} г**, а жиры — **${totalFat} г**. В цельном растительном питании мы избегаем тяжелых насыщенных жиров и концентрированных белков, чтобы уберечь сосуды от холестериновых бляшек. То точечное количество липидов и аминокислот, которое есть сегодня, является идеальным строительным материалом.`;
      }
      
      // Micro tab detailed
      else if (qKey === "micro_leaders") {
        const items = [
          { name: "Витамин C", val: dayVitC },
          { name: "Витамин A", val: dayVitA },
          { name: "Калий", val: dayPotassium },
          { name: "Магний", val: dayMagnesium }
        ].sort((a, b) => b.val - a.val);
        const leader = items[0];
        answer = `Сегодняшним абсолютным лидером выступает **${leader.name}** — его уровень составляет **${Math.round(leader.val)}%** от суточной нормы! Это создает мощный антиоксидантный барьер для твоих сосудов и снимает микровоспаления.`;
      } else if (qKey === "micro_zeros") {
        answer = `Видеть 0% по отдельным витаминам — это нормально, особенно если мы пока не подтвердили все блюда. Накопление нутриентов имеет накопительный эффект. Главное ловить кумулятивный результат по курсу, а система своевременно подскажет, что добавить в тарелку. Нулевой показатель — это не диагноз, а точка роста!`;
      } else if (qKey === "micro_vaso") {
        answer = `Калий (${dayPotassium}%) и магний (${dayMagnesium}%) — это главные защитники твоих почек и сердца. Калий регулирует водно-солевой баланс клеток, выводя лишнюю поваренную соль, а магний защищает сосудистую стенку от спазмов. С ними твоё давление будет оставаться абсолютно стабильным.`;
      }
      
      // Composition tab detailed
      else if (qKey === "comp_factors") {
        if (aggregatedIngredients.length === 0) {
          answer = `Сейчас сырьевых данных пока нет. Добавь приготовленные блюда из нашей книги курса, и мы сразу увидим твоих растительных фаворитов!`;
        } else {
          const names = aggregatedIngredients.slice(0, 3).map(i => i.name.toLowerCase()).join(", ");
          answer = `Твой день сегодня больше всего формируют: **${names}**. Эти сырые цельные продукты богаты полифенолами и флавоноидами, которые защищают кровеносные капилляры от микровоспалений и улучшают венозный отток.`;
        }
      } else if (qKey === "comp_microbiome") {
        answer = `Наша микробиота питается сырыми сложными углеводами. Чем шире твое сортовое разнообразие растительного сырья, тем сильнее популяция лакто- и бифидобактерий, подавляющих гнилостную флору. Это напрямую укрепляет кишечный барьер и гасит системный психосоматический стресс.`;
      } else if (qKey === "comp_diversity") {
        answer = `Чтобы завтра расширить видовое разнообразие, сыграй в игру «Радуга в тарелке». Попробуй добавить хотя бы 2 новых цвета: например, фиолетовую капусту или горсть оранжевой моркови, либо добавь столовую ложку семян чиа!`;
      }
      
      // Dynamics tab detailed
      else if (qKey === "dyn_rhythm") {
        answer = `Твой день выстроен отлично! Ритмичный подъем в 08:00, правильная гидратация по графику и порционные приёмы пищи создают для тела комфортную предсказуемую среду. Это исключает выработку кортизола, поддерживая твои сосуды расслабленными.`;
      } else if (qKey === "dyn_energy") {
        answer = `Твой уровень энергии находится на уровне **${effRatingEnergy}/5**. Это прямое следствие употребления сложных углеводов, которые расщепляются медленно и плавно под занавесом клетчатки. Никаких «гликемических качелей» и слабости после еды, только чистая митохондриальная энергия!`;
      } else if (qKey === "dyn_future") {
        answer = `Секрет стабильности — в мелких шагах без героизма и насилия над собой. Приготовь одно вкусное блюдо, сделай несколько теплых глотков воды, пройдись 10 минут перед сном. Именно эти приятные ритуалы формируют долговечный биологический фундамент твоего здоровья.`;
      }
      
      setAnnaOverlayAnswer(answer);
    }, 1200);
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
  });

  const triggerNotification = (msg: string) => {
    setNotificationMsg(msg);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleRatingChange = (type: "zen" | "energy" | "lightness", val: number) => {
    const time = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    const logEntry = { type, time, value: val };
    
    api("/api/metrics/ratings", {
      method: "POST",
      body: {
        date: new Date().toISOString().split("T")[0],
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
      const timeStr = new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
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

          <div className="w-10 h-10 rounded-full bg-[#E8F8EE] flex items-center justify-center text-[18px]">
            🧘
          </div>
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
            данные обновлены на {new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })} • экспертная оценка
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
              setWater={setWater}
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
              onWakeConfirm={handleWakeConfirm}
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

        {/* 5. EVENING SIGNATURE / NOTICES block */}
        <div className="px-4 py-3 border border-slate-100 bg-slate-50/50 rounded-2xl mt-6 flex items-center gap-3 text-left font-sans">
          <Info className="text-slate-400 w-4 h-4 shrink-0 animate-pulse" />
          <p className="text-[11px] md:text-[11.5px] text-slate-400 leading-relaxed font-semibold">
            Ближе к вечеру этот экран трансформируется в сессию итогового подведения итогов дня и подготовки нервной системы ко входу в глубокие фазы мелатонинового сна.
          </p>
        </div>

      </div>

      {/* Interactive Floating Anna Trigger button */}
      <div className="absolute bottom-24 right-5 z-[50] font-sans">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setShowAnnaOverlay(true);
            setAnnaSelectedQuestion(null);
            setAnnaOverlayAnswer(`Привет! Я рада помочь тебе разобраться во вкладке "${getTabRussianName(activeTab)}". Выбери вопрос ниже, чтобы я провела глубокий анализ твоих показателей...`);
          }}
          className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#10B981] to-[#34D399] text-white flex items-center justify-center shadow-[0_8px_32px_rgba(16,185,129,0.35)] border-2 border-white/80 cursor-pointer relative group transition-all"
        >
          <img 
            src={resolveGeneralAvatar().src}
            alt="Куратор Анна" 
            className="w-12 h-12 rounded-full object-cover border border-transparent"
            referrerPolicy="no-referrer"
          />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border border-white flex items-center justify-center text-[10px] animate-pulse">
            💬
          </span>
        </motion.button>
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

      {/* 6. COZY REAL-TIME INTERACTIVE ANNA DIALOG OVERLAY / BOTTOM SHEET */}
      <AnimatePresence>
        {showAnnaOverlay && (
          <div className="fixed inset-0 z-[100] font-sans flex items-end justify-center">
            {/* Backdrop opacity */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAnnaOverlay(false)}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
            />

            {/* Content card sliding up */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-white rounded-t-[36px] shadow-[0_-16px_36px_rgba(15,23,42,0.15)] border-t border-slate-100 p-6 flex flex-col text-left max-h-[85vh] overflow-y-auto z-50"
            >
              {/* Handle bar decoration */}
              <div className="w-12 h-1.5 bg-slate-250 rounded-full mx-auto mb-4 shrink-0" />

              {/* Header block info */}
              <div className="flex items-center justify-between mb-5 select-none pb-3 border-b border-fold slate-100 shrink-0">
                <div className="flex items-center gap-3 text-left">
                  <div className="relative">
                    <div className="w-[48px] h-[48px] rounded-full p-[2.5px] bg-gradient-to-tr from-[#34D399] to-[#10B981] shadow-sm">
                      <img 
                        src={resolveGeneralAvatar().src}
                        alt="Куратор Анна" 
                        className="w-full h-full rounded-full object-cover border border-white"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div className="text-left font-sans flex flex-col justify-center">
                    <h4 className="text-[16px] font-black text-slate-800 leading-none">Анна</h4>
                    <span className="text-[11px] font-bold text-slate-400 block mt-0.5 leading-none">
                      Советник WFPB
                    </span>
                  </div>
                </div>

                <button 
                  onClick={() => setShowAnnaOverlay(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center text-slate-500 hover:text-slate-800 font-extrabold cursor-pointer border-none"
                >
                  ✕
                </button>
              </div>

              {/* Conversation Area */}
              <div className="flex-1 space-y-4 mb-6">
                
                {/* Recommended Next Step Sticky Label */}
                <div className="p-3.5 bg-amber-50/70 border border-amber-100/80 rounded-2xl flex items-center gap-2.5 text-left text-[12px] text-amber-950 font-bold leading-normal">
                  <div className="w-7 h-7 rounded-lg bg-white shadow-sm flex items-center justify-center text-[15px] border border-amber-100 shrink-0">
                    {recommendedAction.icon}
                  </div>
                  <div>
                    <span className="text-[9px] font-extrabold text-amber-800 tracking-wider block uppercase font-mono mb-0.5">РЕКОМЕНДОВАННЫЙ ШАГ СИСТЕМЫ</span>
                    {recommendedAction.title}
                  </div>
                </div>

                {/* Speech container */}
                <div className="bg-[#FAFBFB] border border-slate-100 rounded-3xl p-5 min-h-[140px] relative">
                  {isAnnaThinking ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <div className="flex gap-1.5 justify-center items-center">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-bounce" />
                      </div>
                      <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest font-mono">Анна анализирует показатели...</span>
                    </div>
                  ) : (
                    <p className="text-[13px] text-slate-700 font-medium leading-relaxed whitespace-pre-wrap text-left">
                      {annaOverlayAnswer}
                    </p>
                  )}
                </div>

              </div>

              {/* Question list drawer bottom */}
              <div className="shrink-0 mb-2">
                <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-3 text-left leading-none">
                  ЗАДАТЬ ВОПРОС ОБ ЭТОЙ ВКЛАДКЕ:
                </h5>
                
                <div className="flex flex-col gap-2">
                  {getAnnaQuestionsForTab(activeTab).map((q) => (
                    <button
                      key={q.key}
                      onClick={() => handleSelectQuestion(q.key)}
                      disabled={isAnnaThinking}
                      className={`w-full text-left p-3.5 rounded-2xl text-[12.5px] font-bold border transition-all flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        annaSelectedQuestion === q.key 
                          ? "bg-emerald-50/50 border-emerald-300 text-emerald-950 font-black scale-[1.01]"
                          : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/30"
                      }`}
                    >
                      <span className="flex-1 pr-2">{q.label}</span>
                      <span className="text-emerald-500 text-[10px] shrink-0 font-extrabold select-none">💬</span>
                    </button>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
