import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import BottomBar from "./BottomBar";
import { MOVEMENT_DAILY_TARGET_MIN, ACTIVITY_CONFIGS } from "../constants/movement";
import type { SleepEntry } from "../shared/sleep";
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
import { calculateDailyCalorieGoal } from "../utils/calorieGoal";
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
import { formatTimeHM, todayLocalDate, toLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";
import { buildAnnaBalanceAnalysis, buildAnnaTabAnalysis, type AnnaAnalysisInput } from "../utils/annaAdvisorEngine";
import sostBalance from "../assets/images/SOST/1.webp";
import sostScales from "../assets/images/SOST/2.webp";
import sostKbju from "../assets/images/SOST/3.webp";
import sostMicro from "../assets/images/SOST/4.webp";
import sostComposition from "../assets/images/SOST/5.webp";
import sostDynamics from "../assets/images/SOST/6.webp";

interface StateNowScreenProps {
  dayNotes?: Record<number, { text: string; time: string }[]>;
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

const NON_WFPB_KEYWORDS = [
  "баранин", "говядин", "свинин", "куриц", "цыпленок", "индейк", "мясо", "фарш",
  "сало", "бекон", "колбас", "ветчин", "сосиск", "рыб", "лосос", "тунец", "креветк",
  "морепродукт", "творог", "сливочное масло", "сметан", "сыр", "яйц", "яйцо"
];

export default function StateNowScreen({
  dayNotes = {},
  currentDayIndex,
  onBack: propsOnBack,
  selectedChronic: propsSelectedChronic,
  water = 0,
  sleep = 0,
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
  setScreen: propsSetScreen,
  isReadOnly = false,
}: StateNowScreenProps) {
  const storeScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => storeScreen("my-day"));
  const setScreenFn = propsSetScreen || storeScreen;
  const profile = useAppStore((s) => s.userProfile);
  const selectedChronic = (propsSelectedChronic as string[]) || profile.chronicConditions || [];
  const setRatingWellbeing = propsSetRatingWellbeing || ((_v: number) => {});
  const setRatingEnergy = propsSetRatingEnergy || ((_v: number) => {});
  const setRatingLightness = propsSetRatingLightness || ((_v: number) => {});
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

  const [apiStateNowData, setApiStateNowData] = useState<any>(null);
  const [, setMeasurementHistory] = useState<any[]>([]);
  const [breakfastState, setBreakfastState] = useState<Record<number, any>>({});
  const [lunchState, setLunchState] = useState<Record<number, any>>({});
  const [dinnerState, setDinnerState] = useState<Record<number, any>>({});
  const [mustHaveState, setMustHaveState] = useState<Record<number, any>>({});
  const [complimentsState, setComplimentsState] = useState<Record<number, any>>({});
  const [recipeOfDayState, setRecipeOfDayState] = useState<Record<number, any>>({});
  const [drinksState, setDrinksState] = useState<Record<number, any>>({});

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

  // Эффективные показатели
  const effWater = apiStateNowData?.dailyMetric?.waterMl != null ? apiStateNowData.dailyMetric.waterMl : (isReadOnly ? 0 : water);
  const effSleep = apiStateNowData?.dailyMetric?.sleepMinutes != null ? apiStateNowData.dailyMetric.sleepMinutes : (isReadOnly ? 0 : sleep);
  const effUserName = apiStateNowData?.profile?.name || userName;
  const effSelectedChronic: string[] = (apiStateNowData?.profile?.chronicConditions?.length ? apiStateNowData.profile.chronicConditions : selectedChronic) || [];
  const effRatingWellbeing = apiStateNowData?.dailyRating?.wellbeing ?? ratingWellbeing;
  const effRatingEnergy = apiStateNowData?.dailyRating?.energy ?? ratingEnergy;
  const effRatingLightness = apiStateNowData?.dailyRating?.lightness ?? ratingLightness;
  
  // Биометрия
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

  const effWeight = latestMeas?.weight ?? apiStateNowData?.profile?.weight ?? weight;
  const effSystolic = latestMeas?.systolic ?? undefined;
  const effDiastolic = latestMeas?.diastolic ?? undefined;
  const effPulse = latestMeas?.pulse ?? latestMeas?.heartRate ?? undefined;
  
  const wellbeingLog = apiStateNowData?.dailyRating?.wellbeingLog || [];
  const energyLog = apiStateNowData?.dailyRating?.energyLog || [];
  const lightnessLog = apiStateNowData?.dailyRating?.lightnessLog || [];
  
  const activityLogs = apiStateNowData?.dailyMetric?.movementLog ? (typeof apiStateNowData.dailyMetric.movementLog === 'string' ? JSON.parse(apiStateNowData.dailyMetric.movementLog) : apiStateNowData.dailyMetric.movementLog) : [];
  const effSavedDishes = savedDishes.length ? savedDishes : (apiStateNowData?.savedDishes || []);

  // Записи ЖКТ (Бристольская шкала) текущего дня: стор -> API фолбэк
  const digestionEntries = useAppStore((s) => s.digestionEntries);
  const dayDigestionLogs = React.useMemo(() => {
    const fromStore = (digestionEntries || []).filter(
      (e) => Number(e.dayIndex) === Number(currentDayIndex)
    );
    if (fromStore.length > 0) {
      return [...fromStore].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }
    if (apiStateNowData?.dailyMetric?.digestionLog) {
      try {
        const raw = typeof apiStateNowData.dailyMetric.digestionLog === "string"
          ? JSON.parse(apiStateNowData.dailyMetric.digestionLog)
          : apiStateNowData.dailyMetric.digestionLog;
        if (Array.isArray(raw)) {
          return [...raw]
            .filter((e) => Number(e.dayIndex) === Number(currentDayIndex))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        }
      } catch {}
    }
    return [];
  }, [digestionEntries, apiStateNowData, currentDayIndex]);

  const effHabitsDone = SystemKeysStore.calculateKeysForDay(currentDayIndex || 1, effSavedDishes, effWater).closedCount;
  const todayStr = todayLocalDate(getUserTimeZone());
  
  // ── Надежный сбор данных сна: API -> localStorage -> fallback ──
  const sleepSummary = (() => {
    // 1. Из API
    if (apiStateNowData?.dailyMetric?.sleepLogs) {
      try {
        const parsed = typeof apiStateNowData.dailyMetric.sleepLogs === "string"
          ? JSON.parse(apiStateNowData.dailyMetric.sleepLogs)
          : apiStateNowData.dailyMetric.sleepLogs;
        if (Array.isArray(parsed) && parsed.length > 0) {
          const perDay = aggregateSleepPerDay(parsed);
          const dayData = perDay[currentDayIndex];
          if (dayData && dayData.wakeTime) {
            return {
              wakeTime: dayData.wakeTime,
              quality: dayData.quality || null,
              duration: dayData.duration || effSleep,
            };
          }
        }
      } catch {}
    }
    // 2. Фолбэк на localStorage['wfpb_daily_sleep_logs_v1']
    try {
      const raw = localStorage.getItem("wfpb_daily_sleep_logs_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        const dayData = parsed[currentDayIndex];
        if (dayData && dayData.wakeTime) {
          return {
            wakeTime: dayData.wakeTime,
            quality: dayData.quality || null,
            duration: dayData.duration || effSleep,
          };
        }
      }
    } catch {}
    return { wakeTime: null, quality: null, duration: effSleep };
  })();

  const sleepWakeTime: string | null = sleepSummary.wakeTime;
  const sleepQuality: "good" | "fair" | "poor" | null = sleepSummary.quality;

  // Отбой текущего вечера (только если сегодня вечером активирован ночной режим)
  const tonightBedtime: string | null = (() => {
    try {
      const rawSession = localStorage.getItem("wfpb_sleep_session");
      if (rawSession) {
        const sess = JSON.parse(rawSession);
        if (sess?.active && sess?.bedTime) {
          return sess.bedTime;
        }
      }
    } catch {}
    return null;
  })();

  // Движение
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

  // Cooked book recipes
  const cookedBookDishes: any[] = [];
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

  // Пользовательские блюда
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
      if (dish.dayIndex === currentDayIndex || (dish as any).current_day === currentDayIndex) return true;
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
	
  // Блюда дня для таймлайна
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
        ingredients: d.ingredients,
        time: d.time || (d.createdAt ? formatTimeHM(d.createdAt, getUserTimeZone()) : ""),
        createdAt: d.createdAt,
      })),
  ];

  const uniqueTodayDishes = Array.from(
    new Map(allTodayDishes.map((d: any) => [d.id || d.name, d])).values()
  );

  const getDishHourSafe = (d: any): number => {
    const tz = getUserTimeZone();
    if (d.time && typeof d.time === "string" && d.time.includes(":")) {
      const h = Number(d.time.split(":")[0]);
      if (Number.isFinite(h)) return h;
    }
    if (d.createdAt) {
      try {
        const hm = formatTimeHM(d.createdAt, tz);
        const h = Number(hm.split(":")[0]);
        if (Number.isFinite(h)) return h;
      } catch {}
    }
    return 8; // утренний фолбэк
  };

  const dynamicsBreakfastLogs = uniqueTodayDishes.filter((d: any) => {
    const cat = (d.category || "").toLowerCase();
    const name = (d.name || "").toLowerCase();
    const hour = getDishHourSafe(d);
    return cat.includes("завтрак") || name.includes("завтрак") || hour < 12;
  });

  const dynamicsLunchLogs = uniqueTodayDishes.filter((d: any) => {
    if (dynamicsBreakfastLogs.some((b: any) => (b.id && b.id === d.id) || b.name === d.name)) return false;
    const cat = (d.category || "").toLowerCase();
    const name = (d.name || "").toLowerCase();
    const hour = getDishHourSafe(d);
    return (
      cat.includes("обед") ||
      cat.includes("суп") ||
      cat.includes("салат") ||
      cat.includes("втор") ||
      (hour >= 12 && hour < 17)
    );
  });

  const dynamicsDinnerLogs = uniqueTodayDishes.filter((d: any) => {
    if (dynamicsBreakfastLogs.some((b: any) => (b.id && b.id === d.id) || b.name === d.name)) return false;
    if (dynamicsLunchLogs.some((l: any) => (l.id && l.id === d.id) || l.name === d.name)) return false;
    return true;
  });

  const totalCookedBookRecipesCount = 
    Object.values(breakfastState).filter(item => (item as any).status === "cooked").length +
    Object.values(lunchState).filter(item => (item as any).status === "cooked").length +
    Object.values(dinnerState).filter(item => (item as any).status === "cooked").length +
    Object.values(mustHaveState).filter(item => (item as any).status === "cooked").length +
    Object.values(complimentsState).filter(item => (item as any).status === "cooked").length +
    Object.values(recipeOfDayState).filter(item => (item as any).status === "cooked").length +
    Object.values(drinksState).filter(item => (item as any).status === "cooked").length;

  const todayTotalBookMenuCount = 
    (todayBreakfastRecipe ? 1 : 0) +
    (todayLunchRecipe ? 1 : 0) +
    (todayDinnerRecipe ? 1 : 0) +
    (todayMustHave ? 1 : 0) +
    (todayRecipeOfDay ? 1 : 0) +
    (todayDrink ? 1 : 0);

  const todayCookedBookCount = cookedBookDishes.length;

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
  const totalRawMass = aggregatedIngredients.reduce((acc, ing: any) => acc + (Number(ing.weight) || 0), 0);

  const nonWfpbIngredients = Array.from(new Set(
    aggregatedIngredients
      .filter((i: any) => {
        if (i.status === "red" || i.isProhibited || i.isAnimal) return true;
        const nameLower = (i.name || "").toLowerCase();
        return NON_WFPB_KEYWORDS.some((kw) => nameLower.includes(kw));
      })
      .map((i: any) => i.name)
  ));
  const hasNonWfpb = nonWfpbIngredients.length > 0;

  const waterTarget = getWaterGoal(effWeight || WATER_GOAL_FALLBACK_KG);
  const sleepTarget = 480;
  const mealsTarget = 4;
  const habitsTarget = 20;

  const activeStartMin = WATER_ACTIVE_START_MIN;
  const activeWindowMin = WATER_ACTIVE_WINDOW_MIN;
  const activeEndMin = activeStartMin + activeWindowMin;
  const nowTimeHM = formatTimeHM(new Date().toISOString(), getUserTimeZone()).split(":");
  const currentHour = Number(nowTimeHM[0]);
  const currentMinute = Number(nowTimeHM[1]);
  const nowMinutes = currentHour * 60 + currentMinute;
  const awakeMinutesToday = Math.max(0, Math.min(nowMinutes - activeStartMin, activeWindowMin));
  const expectedWaterByNow = Math.round(waterTarget * (awakeMinutesToday / activeWindowMin));
  const remainingMinutes = Math.max(0, activeEndMin - nowMinutes);

  const effMealCount = cookedBookDishes.length + todayCustomDishes.length;

  const waterPct = Math.min(100, Math.round((effWater / waterTarget) * 100));
  const sleepPct = Math.min(100, Math.round((effSleep / sleepTarget) * 100));
  const mealsPct = Math.min(100, Math.round((effMealCount / mealsTarget) * 100));
  const habitsPct = Math.min(100, Math.round((effHabitsDone / habitsTarget) * 100));
  const activityPercent = Math.min(100, Math.round(((activityLogs || []).reduce((acc: number, log: any) => acc + (log.durationSeconds || 0), 0) / 60 / MOVEMENT_DAILY_TARGET_MIN) * 100));
  const activityMinutes = Math.round((activityPercent / 100) * MOVEMENT_DAILY_TARGET_MIN);
  const activityPct = Math.min(100, Math.round((activityMinutes / 30) * 100));
  const energyPct = activityPercent;

  const dailyCalorieGoal = useMemo(() => {
    return calculateDailyCalorieGoal({
      gender: profile?.gender,
      age: profile?.age,
      height: profile?.height,
      weight: effWeight,
      activityMinutes: activityMinutes,
      healthGoals: profile?.healthGoals,
      chronicConditions: profile?.chronicConditions,
    });
  }, [profile, effWeight, activityMinutes]);

  const hydrationState = ((): 'success' | 'normal' | 'warning' => {
    if (effWater >= waterTarget) return 'success';
    return effWater > 0 ? 'normal' : 'warning';
  })();

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

    const buildCurrentAnnaInput = (): AnnaAnalysisInput => {
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

    return {
      userName: effUserName,
      totalCalories,
      totalProtein,
      totalFat,
      totalCarbohydrates,
      totalFiber,
      calTarget: dailyCalorieGoal.targetCalories,
      topIngredients,
      nonWfpbIngredients,
      hasNonWfpb,
      totalMass: totalRawMass,
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
      effPulse,
      leaderName: leaderNutrient?.name,
      leaderPct: leaderNutrient?.val,
      cookedDishCount: effMealCount,
      totalDishCount: mealsTarget,
      habitDoneCount: effHabitsDone,
      activityMinutes: activityMinutes,
      activityMinutesTotal: activityPercent,
      activityTypesList: dynamicsMovementLogs.map((l: any) => l.displayName),
      digestionCount: dayDigestionLogs.length,
      latestBristolType: dayDigestionLogs[0]?.bristolType ?? dayDigestionLogs[0]?.type,
      latestBristolLabel: dayDigestionLogs[0]?.label || (dayDigestionLogs[0]?.bristolType === 4 ? "Идеал" : undefined),
    };
  };

  function getAnnaAnalysis() {
    return buildAnnaBalanceAnalysis(buildCurrentAnnaInput(), currentDayIndex || 1);
  }

  const getAnnaAnalysisForTab = (tabId: string) => {
    const input = buildCurrentAnnaInput();
    // Для вкладки КБЖУ гарантируем передачу персонального калоража
    if (tabId === "kbju") {
      input.calTarget = dailyCalorieGoal.targetCalories;
    }
    const tabOrder = ["balance", "scales", "kbju", "micro", "composition", "dynamics"];
    const tabIndexOffset = Math.max(0, tabOrder.indexOf(tabId));
    return buildAnnaTabAnalysis(tabId, input, (currentDayIndex || 1) + tabIndexOffset);
  };

  const getDisplayedAnalysis = (tabId: string) => {
    if (savedAnnaText && isReadOnly) return savedAnnaText;
    return getAnnaAnalysisForTab(tabId);
  };

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

  const waterLogData = (() => {
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
    try {
      const raw = localStorage.getItem('wfpb_daily_water_entries_v3');
      if (!raw) return { lastWaterTimestamp: undefined, todayWaterEntries: undefined };
      const logs = JSON.parse(raw);
      const todayLogs = logs[currentDayIndex];
      if (!todayLogs || todayLogs.length === 0) return { lastWaterTimestamp: undefined, todayWaterEntries: undefined };
      return {
        lastWaterTimestamp: todayLogs[todayLogs.length - 1].timestamp,
        todayWaterEntries: todayLogs.map((e: any) => ({ amount: e.amount, timestamp: e.timestamp, time: e.time })),
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

    if (onSaveWellbeingComment) {
      const timeStr = formatTimeHM(new Date().toISOString(), getUserTimeZone());
      onSaveWellbeingComment(
        `Зафиксированы параметры состояния в ${timeStr}:\n• Дзен-состояние: ${effRatingWellbeing}/5\n• Энергия: ${effRatingEnergy}/5\n• Лёгкость: ${effRatingLightness}/5`
      );
    }
  };

  const bioDialAdvice = calculateBioDialAdvice({
    waterMl: effWater,
    waterTarget,
    sleepMinutes: effSleep,
    cookedDishesCount: effMealCount,
    activityMinutes,
    hasBreakfast: dynamicsBreakfastLogs.length > 0,
    hasLunch: dynamicsLunchLogs.length > 0,
    hasDinner: dynamicsDinnerLogs.length > 0,
    currentHour: new Date().getHours(),
    lastWaterTimestamp: waterLogData.lastWaterTimestamp,
    timeZone: getUserTimeZone(),
    recommendedActionText: recommendedAction?.title,
  });

  return (
    <div className="flex-1 flex flex-col justify-between bg-[#FAFBFB] relative min-h-[100dvh]">
      
      {/* Toast Notification */}
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
              className="text-white/60 hover:text-white px-2 py-1 text-[11px] font-extrabold uppercase shrink-0 cursor-pointer"
            >
              OK
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Основная рабочая область скролла */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-32 scrollbar-none">
        
        {/* Шапка */}
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

        {/* Метка времени */}
        <div className="flex items-center justify-center gap-1.5 mb-3 select-none font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-tight whitespace-nowrap">
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

        {/* 3. НАВИГАЦИЯ ПО 6 ВКЛАДКАМ */}
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

        {/* 4. АКТИВНЫЙ РАЗДЕЛ */}
        <AnimatePresence mode="wait">
          {activeTab === "balance" && (
            <BalanceTab
              key="balance"
              tabId={activeTab}
              getAnnaAnalysis={() => getDisplayedAnalysis("balance")}
              integralScore={bioDialAdvice.integralScore}
              sleepPct={sleepPct}
              waterPct={waterPct}
              hydrationState={hydrationState}
              mealsPct={mealsPct}
              habitsPct={habitsPct}
              activityPct={activityPct}
              ratingWellbeing={effRatingWellbeing}
              ratingEnergy={effRatingEnergy}
              ratingLightness={effRatingLightness}
              recommendedAction={recommendedAction}
              triggerNotification={triggerNotification}
              onBack={onBack}
              setScreen={setScreenFn}
              totalCalories={totalCalories}
              totalFiber={totalFiber}
              hasNonWfpb={Boolean(hasNonWfpb || (nonWfpbIngredients && nonWfpbIngredients.length > 0))}
              waterTarget={waterTarget}
              effWater={effWater}
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
              digestionLogs={dayDigestionLogs}
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
              calorieGoal={dailyCalorieGoal}
            />
          )}

          {activeTab === "micro" && (
            <MicroTab
              key="micro"
              dishes={effSavedDishes}
              currentDayIndex={currentDayIndex}
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
              bedtime={tonightBedtime}
              sleepQuality={sleepQuality}
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
              latestMeas={latestMeas}
              dayMeasurements={sortedDayMeasurements}
              effWeight={effWeight}
              effSystolic={effSystolic}
              effDiastolic={effDiastolic}
              effPulse={effPulse}
            />
          )}
        </AnimatePresence>

      </div>

      {/* Нижняя панель */}
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