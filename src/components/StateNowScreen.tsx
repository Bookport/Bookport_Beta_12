import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, Sparkles, Droplet, Moon, Apple, Zap, Activity, Compass, Heart, Brain, Info, CheckCircle, TrendingUp, TrendingDown, BarChart3, Scale, Flame, Utensils } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import BottomBar from "./BottomBar";
import { MOVEMENT_DAILY_TARGET_MIN, ACTIVITY_CONFIGS } from "../constants/movement";
import type { SleepEntry, SleepDaySummary } from "../shared/sleep";
import { aggregateSleepPerDay } from "../shared/sleep";
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
import BiometricDialWidget from "./statenow/BiometricDialWidget";
import { calculateBioDialAdvice } from "../utils/bioDialAdvisorEngine";
import { api } from "../utils/api";
import { getBookMacros } from "../utils/bookMacros";
import { getRecipeImagePath } from "../utils/recipeImageMapper";
import { getPlural } from "../utils/pluralize";
import { formatTimeHM, todayLocalDate, toLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";
import { buildAnnaBalanceAnalysis, buildAnnaTabAnalysis } from "../utils/annaAdvisorEngine";
import sostBalance from "../assets/images/SOST/1.webp";
import sostScales from "../assets/images/SOST/2.webp";
import sostKbju from "../assets/images/SOST/3.webp";
import sostMicro from "../assets/images/SOST/4.webp";
import sostComposition from "../assets/images/SOST/5.webp";
import sostDynamics from "../assets/images/SOST/6.webp";

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

  const SOST_TABS = [
    { id: "balance" as const,     title: "Баланс",   subtitle: "Итог дня", img: sostBalance,     active: "bg-emerald-50 border-emerald-300 text-emerald-800", dot: "bg-emerald-500" },
    { id: "scales" as const,      title: "Шкалы",    subtitle: "Приборы",  img: sostScales,      active: "bg-indigo-50 border-indigo-300 text-indigo-800", dot: "bg-indigo-500" },
    { id: "kbju" as const,        title: "КБЖУ",     subtitle: "Питание",  img: sostKbju,        active: "bg-amber-50 border-amber-300 text-amber-900", dot: "bg-amber-500" },
    { id: "micro" as const,       title: "Микро",    subtitle: "Витамины", img: sostMicro,       active: "bg-rose-50 border-rose-300 text-rose-800", dot: "bg-rose-500" },
    { id: "composition" as const, title: "Состав",   subtitle: "Сырьё",    img: sostComposition, active: "bg-emerald-50 border-emerald-300 text-emerald-900", dot: "bg-[#10B981]" },
    { id: "dynamics" as const,    title: "Динамика", subtitle: "Ход дня",  img: sostDynamics,    active: "bg-sky-50 border-sky-300 text-sky-800", dot: "bg-sky-500" },
  ] as const;

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
  
  // ── Живые данные для 7 станций Вкладки «Динамика» ──
  // 1. Сон: парсинг журнала сна и расчет точного времени пробуждения
  const rawSleepLogs: SleepEntry[] = apiStateNowData?.dailyMetric?.sleepLogs
    ? (typeof apiStateNowData.dailyMetric.sleepLogs === "string"
        ? JSON.parse(apiStateNowData.dailyMetric.sleepLogs)
        : apiStateNowData.dailyMetric.sleepLogs)
    : [];
  const sleepPerDay = aggregateSleepPerDay(rawSleepLogs);
  const todaySleepEntry: SleepDaySummary | null = sleepPerDay[currentDayIndex] || null;
  const sleepWakeTime: string | null = todaySleepEntry?.wakeTime || null;
  const sleepBedtime: string | null = todaySleepEntry?.bedtime || null;

  // 2. Блюда по категориям с реальным временем приготовления
  const filterMealsByCategory = (categoryKeywords: string[]) => {
    return effSavedDishes
      .filter((dish: any) => {
        const isDay = dish.dayIndex === currentDayIndex || (dish as any).current_day === currentDayIndex;
        if (!isDay && currentDayIndex !== 1) return false;
        const cat = (dish.category || "").toLowerCase();
        const name = (dish.name || "").toLowerCase();
        return categoryKeywords.some((kw) => cat.includes(kw) || name.includes(kw));
      })
      .map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        time: d.time || (d.createdAt ? formatTimeHM(d.createdAt, getUserTimeZone()) : ""),
        createdAt: d.createdAt,
      }));
  };

  // 3. Движение с расшифровкой названий тренировок и длительности
  const dynamicsMovementLogs = (activityLogs || []).map((e: any) => {
    const durationMin = Math.round((e.durationSeconds || e.duration || 0) / 60);
    const cfg = ACTIVITY_CONFIGS[e.type as keyof typeof ACTIVITY_CONFIGS];
    return {
      id: e.id || String(e.timestamp),
      type: e.type,
      displayName: cfg?.name || e.activityType || "Движение",
      durationMin,
      timestamp: e.timestamp,
      timeString:
        e.timeString ||
        (e.timestamp ? formatTimeHM(new Date(e.timestamp).toISOString(), getUserTimeZone()) : ""),
    };
  });

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

  // Custom Dishes from DIY / From What Is modules — strictly scoped to currentDayIndex
  // R1/R2 (READ-ONLY хаб): исключаем ТОЛЬКО игровой Миксер (sourceType/category),
  // пользовательские блюда и Сборки с calories>0 учитываем обязательно, фолбэча макросы в 0.
  const parseFiniteOrZero = (value: unknown): number => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(",", ".").replace(/[^\d.\-]/g, "");
      if (cleaned.trim() === "") return 0;
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };
  const parseFiniteOrNull = (value: unknown): number | null => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(",", ".").replace(/[^\d.\-]/g, "");
      if (cleaned.trim() === "") return null;
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };
  const isRealMixerDish = (dish: any): boolean => dish?.sourceType === "mixer" || dish?.category === "Миксер";
  const todayCustomDishes = (effSavedDishes || [])
    .filter(dish => {
      if (dish.isBookRecipe) return false;
      if (isRealMixerDish(dish)) return false;
      const cal = parseFiniteOrNull(dish.calories);
      if (cal === null || cal <= 0) return false;
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
        protein: String(parseFiniteOrZero(dish.protein)),
        fat: String(parseFiniteOrZero(dish.fat)),
        fiber: String(parseFiniteOrZero(dish.fiber)),
        carbohydrates: parseFiniteOrNull(dish.carbohydrates) ?? 0,
        time: dish.time || (dish.createdAt
          ? formatTimeHM(dish.createdAt, getUserTimeZone())
          : "")
      };
    });
	
	// ── Живой сбор блюд дня для Вкладки «Динамика» (Книга + Свои блюда / Архив) ──
  const allTodayDishes = [
    ...cookedBookDishes,
    ...todayCustomDishes,
    ...(effSavedDishes || [])
      .filter((dish: any) => {
        const isDay = dish.dayIndex === currentDayIndex || (dish as any).current_day === currentDayIndex;
        if (!isDay && currentDayIndex !== 1) return false;
        return true;
      })
      .map((d: any) => ({
        id: d.id,
        name: d.name,
        category: d.category || "",
        time: d.time || (d.createdAt ? formatTimeHM(d.createdAt, getUserTimeZone()) : ""),
        createdAt: d.createdAt,
      })),
  ];

  // Убираем возможные дубликаты по id / названию
  const uniqueTodayDishes = Array.from(
    new Map(allTodayDishes.map((d: any) => [d.id || d.name, d])).values()
  );

  // R6: каноническое локальное время без UTC-смещения
  const getDishHour = (d: any): number => {
    const tz = getUserTimeZone();
    if (d.time && typeof d.time === "string" && d.time.includes(":")) {
      const h = Number(d.time.split(":")[0]);
      if (Number.isFinite(h)) return h;
    }
    if (d.createdAt) {
      try {
        const hm = formatTimeHM(d.createdAt, tz);
        return Number(hm.split(":")[0]) || 0;
      } catch {}
    }
    return 0;
  };

  // Завтрак: по слову "завтрак" либо блюдо до 12:00
  const dynamicsBreakfastLogs = uniqueTodayDishes.filter((d: any) => {
    const cat = (d.category || "").toLowerCase();
    const name = (d.name || "").toLowerCase();
    const hour = getDishHour(d);
    return cat.includes("завтрак") || name.includes("завтрак") || (hour > 0 && hour < 12);
  });

  // Обед: супы, салаты, вторые блюда либо блюда с 12:00 до 17:00
  const dynamicsLunchLogs = uniqueTodayDishes.filter((d: any) => {
    if (dynamicsBreakfastLogs.some((b: any) => (b.id && b.id === d.id) || b.name === d.name)) return false;
    const cat = (d.category || "").toLowerCase();
    const name = (d.name || "").toLowerCase();
    const hour = getDishHour(d);
    return (
      cat.includes("обед") ||
      cat.includes("суп") ||
      cat.includes("салат") ||
      cat.includes("втор") ||
      (hour >= 12 && hour < 17)
    );
  });

  // Ужин: всё, что помечено как ужин/основное, либо создано после 17:00
  const dynamicsDinnerLogs = uniqueTodayDishes.filter((d: any) => {
    if (dynamicsBreakfastLogs.some((b: any) => (b.id && b.id === d.id) || b.name === d.name)) return false;
    if (dynamicsLunchLogs.some((l: any) => (l.id && l.id === d.id) || l.name === d.name)) return false;
    const cat = (d.category || "").toLowerCase();
    const name = (d.name || "").toLowerCase();
    const hour = getDishHour(d);
    return (
      cat.includes("ужин") ||
      cat.includes("основн") ||
      name.includes("ужин") ||
      hour >= 17 ||
      hour === 0
    );
  });

  // R6: единая станция хаба (синхронизирована с локальной TZ, без UTC-смещения)
  // В 11:15 при зафиксированном завтраке следующая станция — Обед WFPB.
  const hubTz = getUserTimeZone();
  const hubNowHM = formatTimeHM(new Date().toISOString(), hubTz);
  const hubHour = Number(hubNowHM.split(":")[0]) || 0;
  const hubHasBreakfast = dynamicsBreakfastLogs.length > 0;
  const hubHasLunch = dynamicsLunchLogs.length > 0;
  const hubHasDinner = dynamicsDinnerLogs.length > 0;
  const hubNextStation: { stationName: string; timeRemainingText: string } = (() => {
    if (!hubHasBreakfast && hubHour < 12) return { stationName: "Завтрак WFPB", timeRemainingText: "до 11:30" };
    if (!hubHasLunch && hubHour < 16) return { stationName: "Обед WFPB", timeRemainingText: "13:00 – 15:00" };
    if (!hubHasDinner && hubHour < 21) return { stationName: "Ужин WFPB", timeRemainingText: "18:30 – 20:00" };
    return { stationName: "Отдых ЖКТ и сон", timeRemainingText: "после 21:30" };
  })();

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

  // R1/R2: фолбэч строгой агрегации DailyNutritionStore — блюда с calories>0 но без полного набора макросов
  // добавляем к totals с недостающими макросами = 0 (без touching внешних сторов).
  const dbLoggedIds = new Set((dbData.logs as any[]).map((l: any) => l.dishId));
  let r1ExtraCalories = 0;
  let r1ExtraProtein = 0;
  let r1ExtraFat = 0;
  let r1ExtraCarbohydrates = 0;
  let r1ExtraFiber = 0;
  const r1ExtraIngredients: { name: string; weight: number; status: "green" | "yellow" | "red"}[] = [];
  for (const d of todayCustomDishes) {
    if (dbLoggedIds.has((d as any).id)) continue;
    const cal = typeof (d as any).calories === "number" ? (d as any).calories : parseFiniteOrZero((d as any).calories);
    r1ExtraCalories += cal;
    r1ExtraProtein += parseFiniteOrZero((d as any).protein);
    r1ExtraFat += parseFiniteOrZero((d as any).fat);
    r1ExtraFiber += parseFiniteOrZero((d as any).fiber);
    r1ExtraCarbohydrates += parseFiniteOrZero((d as any).carbohydrates);
    const rawIngs: any[] = Array.isArray((d as any).ingredients) ? (d as any).ingredients : [];
    for (const ing of rawIngs) {
      if (!ing?.name) continue;
      let w = 0;
      const ws = ing.weight;
      if (typeof ws === "number" && Number.isFinite(ws) && ws > 0) w = ws;
      else if (typeof ws === "string") {
        const s = ws.trim().toLowerCase();
        const kgM = s.match(/(-?\d+[\d.,]*)\s*(?:кг|kg)/);
        if (kgM) {
          const n = parseFloat(kgM[1].replace(",", "."));
          if (Number.isFinite(n) && n > 0) w = n * 1000;
        } else {
          const gM = s.match(/(-?\d+[\d.,]*)\s*г(?![а-яa-z])/);
          if (gM) {
            const n = parseFloat(gM[1].replace(",", "."));
            if (Number.isFinite(n) && n > 0) w = n;
          }
        }
      }
      if (w > 0) r1ExtraIngredients.push({ name: String(ing.name), weight: Math.round(w), status: ing.status || "green" });
    }
  }
  const totalCalories = dbData.totalCalories + Math.round(r1ExtraCalories);
  const totalProtein = parseFloat((dbData.totalProtein + r1ExtraProtein).toFixed(1));
  const totalFat = parseFloat((dbData.totalFat + r1ExtraFat).toFixed(1));
  const totalCarbohydrates = parseFloat((dbData.totalCarbohydrates + r1ExtraCarbohydrates).toFixed(1));
  const totalFiber = parseFloat((dbData.totalFiber + r1ExtraFiber).toFixed(1));

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

  const aggregatedIngredients = [...dbData.aggregatedIngredients, ...r1ExtraIngredients].sort((a,b)=> b.weight - a.weight);

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

  // ── Расчёт адаптивного циферблата био-метрик и смарт-трио (R3/R4: строгий контракт BioDialInput) ──
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
    recommendedActionText: recommendedAction?.title,
    // совместимость: единая станция уже вычислена хабом — дублируем как primary input
  });

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#FAFBFB] relative min-h-[100dvh]">
      
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
      <div className="flex-1 overflow-y-auto px-2.5 pb-32 scrollbar-none">
        
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

          <div className="w-10 h-10 shrink-0" aria-hidden="true" />
        </div>

        {isReadOnly && (
          <div className="mx-1 mb-4 py-2 px-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
            <span className="text-amber-600 text-[13px] font-bold">📋</span>
            <span className="text-amber-800 text-[12px] font-semibold">
              Просмотр данных дня {currentDayIndex} — изменения недоступны
            </span>
          </div>
        )}

        {/* Short timestamp tag — строгая одна строка */}
        <div className="flex items-center justify-center gap-1.5 mb-3 select-none font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">
            данные обновлены на {formatTimeHM(new Date().toISOString(), getUserTimeZone())} • экспертная оценка
          </span>
        </div>

        {/* 2. БИОМЕТРИЧЕСКИЙ ЦИФЕРБЛАТ И СМАРТ-КАСКАД */}
        <BiometricDialWidget
          advice={bioDialAdvice}
          onFocusClick={() => {
            if (bioDialAdvice.focusAction.actionType === "water") setActiveTab("scales");
            else if (bioDialAdvice.focusAction.actionType === "meal") setActiveTab("composition");
            else setActiveTab("dynamics");
          }}
          onGrowthClick={() => setActiveTab("scales")}
          onStationClick={() => setActiveTab("dynamics")}
        />

        {/* 3. TAB NAVIGATION (6 tactile 3D miniature card buttons) */}
        <div className="grid grid-cols-3 gap-2.5 mb-6 font-sans">
          {SOST_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-selected={isActive}
                aria-label={tab.title}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex flex-col items-center justify-center text-center rounded-2xl border transition-all duration-200 cursor-pointer py-1.5 px-1 min-h-[76px] ${
                  isActive
                    ? `${tab.active} shadow-[0_4px_14px_rgba(15,23,42,0.06)] -translate-y-0.5 font-black border-2`
                    : "bg-white border-slate-100 hover:border-slate-200 text-slate-600 hover:text-slate-800 shadow-[0_2px_8px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
                }`}
              >
                {isActive && (
                  <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${tab.dot} shadow-sm`} />
                )}
                <img
                  src={tab.img}
                  alt={tab.title}
                  loading="eager"
                  draggable={false}
                  className={`w-[54px] h-[54px] object-contain select-none pointer-events-none drop-shadow-[0_2px_5px_rgba(0,0,0,0.10)] ${
                    isActive ? "drop-shadow-[0_3px_7px_rgba(0,0,0,0.14)] scale-105" : "opacity-95"
                  }`}
                />
                <span className="text-[11.5px] font-bold tracking-tight leading-none mt-0.5">{tab.title}</span>
                <span className="text-[7.5px] font-extrabold text-slate-400 uppercase tracking-wider mt-0.5 leading-none">{tab.subtitle}</span>
              </button>
            );
          })}
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
              wakeTime={sleepWakeTime}
              bedtime={sleepBedtime}
              sleepLogs={rawSleepLogs}
              water={effWater}
              waterTarget={waterTarget}
              todayWaterEntries={waterLogData.todayWaterEntries || []}
              breakfastLogs={dynamicsBreakfastLogs}
              lunchLogs={dynamicsLunchLogs}
              dinnerLogs={dynamicsDinnerLogs}
              activityLogs={dynamicsMovementLogs}
              ratingEnergy={effRatingEnergy}
              ratingWellbeing={effRatingWellbeing}
              ratingLightness={effRatingLightness}
              wellbeingLog={wellbeingLog}
              energyLog={energyLog}
              lightnessLog={lightnessLog}
              habitsDone={effHabitsDone}
              habitsTarget={habitsTarget}
              cookedBookDishes={cookedBookDishes}
              annaAnalysisText={getDisplayedAnalysis("dynamics")}
              recommendedAction={recommendedAction}
              currentDayIndex={currentDayIndex}
              savedDishes={effSavedDishes}
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
