import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MOVEMENT_DAILY_TARGET_MIN, MOVEMENT_MAX_POINTS_PER_DAY } from "../constants/movement";
import { formatTimeHM, todayLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";
import {
  SleepDaySummary,
  SleepEntry,
  SleepQuality,
  aggregateSleepPerDay,
  makeSleepId,
  mergeSleepEntries,
  normalizeSleepEntry,
  sleepDurationMinutes,
  sumCompletedSleepMinutes,
} from "../shared/sleep";
import { 
  Calendar, 
  Moon, 
  Zap, 
  Sparkles, 
  Mic, 
  CheckCircle2, 
  ChevronLeft, 
  Smile, 
  Volume2, 
  X, 
  Check,
  Award,
  BookOpen,
  Bell,
  Scale,
  HelpCircle,
  Minus,
  Plus,
  Play,
  Pause,
  Square
} from "lucide-react";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { getWaterGoal, WATER_GOAL_FALLBACK_KG } from "../utils/waterGoal";
import { SystemKeysStore } from "../services/SystemKeysStore";
import { calculateIntegralScore } from "../utils/integralScore";
import AnnaText from "./AnnaText";
import { api } from "../utils/api";
import { getPlural } from "../utils/pluralize";
import { getDailyWaterTip } from "../utils/waterTips";
import { getDailyMeasurementTip } from "../utils/measurementsTips";
import stateEnergyHigh from "../assets/images/measurements/state_energy_high.webp";
import stateEnergyNormal from "../assets/images/measurements/state_energy_normal.webp";
import stateEnergyLow from "../assets/images/measurements/state_energy_low.webp";
import stateMoodGood from "../assets/images/measurements/state_mood_good.webp";
import stateMoodNormal from "../assets/images/measurements/state_mood_normal.webp";
import stateMoodBad from "../assets/images/measurements/state_mood_bad.webp";
import stateWellbeingExcellent from "../assets/images/measurements/state_wellbeing_excellent.webp";
import stateWellbeingNormal from "../assets/images/measurements/state_wellbeing_normal.webp";
import stateWellbeingPoor from "../assets/images/measurements/state_wellbeing_poor.webp";
import waterImg from "../assets/images/buttons/вода.webp";
import volumeDrop1Img from "../assets/images/water/volume_drop_1.webp";
import volumeDrop2Img from "../assets/images/water/volume_drop_2.webp";
import volumeDrop3Img from "../assets/images/water/volume_drop_3.webp";
import volumeGlassSmallImg from "../assets/images/water/volume_glass_small.webp";
import volumeGlassLargeImg from "../assets/images/water/volume_glass_large.webp";
import volumeBottleImg from "../assets/images/water/volume_bottle.webp";
import volumeThermosImg from "../assets/images/water/volume_thermos.webp";
import volumePitcherImg from "../assets/images/water/volume_pitcher.webp";
import foodImg from "../assets/images/buttons/еда.webp";
import movementImg from "../assets/images/buttons/движение.webp";
import sleepImg from "../assets/images/buttons/сон.webp";
import imgNightPrompt from "../assets/images/slipping/8.webp";
import imgWakeUp from "../assets/images/slipping/15.webp";
import measurementsImg from "../assets/images/buttons/замеры.webp";
import recipesImg from "../assets/images/buttons/рецепты.webp";
import organismImg from "../assets/images/buttons/организм.webp";
import bookImg from "../assets/images/buttons/книга.webp";
import purchasesImg from "../assets/images/buttons/покупки.webp";
import diaryImg from "../assets/images/buttons/дневник.webp";
import stateNowImg from "../assets/images/buttons/состояние сейчас.webp";
import logoSprout from "../assets/images/buttons/logo.webp";
import systemKeyWidget from "../assets/images/keysustem/22.webp";
import { DailyNutritionStore } from "../services/DailyNutritionStore";
import { 
  BREAKFAST_RECIPES, 
  LUNCH_RECIPES, 
  DINNER_RECIPES, 
  MUST_HAVE_RECIPES, 
  COMPLIMENTS_RECIPES, 
  RECIPE_OF_DAY_RECIPES, 
  DRINKS_RECIPES 
} from "./BookRecipesScreen";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'positive', intent: 'success' }).src;
import BottomBar from "./BottomBar";
import CalendarButton from "./CalendarButton";
import WaterDetailsScreen from "./WaterDetailsScreen";
import SleepDetailsScreen from "./SleepDetailsScreen";
import MovementDetailsScreen from "./MovementDetailsScreen";
import MeasurementsDetailsScreen, { MeasurementLogEntry } from "./MeasurementsDetailsScreen";
import DigestionScreen from "./DigestionScreen";
import { ACTIVITY_CONFIGS } from "../constants/movement";
import { getMovementAssetPath } from "../utils/movementAssets";
import MovementModal from "./MovementModal";

interface WaterLogEntry {
  id: string;
  amount: number;
  time: string;
  timestamp: number;
}

// Convert the local water cache into the flat store array used by buildDailySummary
const waterLogsToStoreEntries = (logs: Record<number, WaterLogEntry[]>) =>
  Object.entries(logs).flatMap(([dayStr, list]) =>
    (list || []).map(e => ({
      timestamp: e.timestamp,
      amount: e.amount,
      time: e.time,
      dayIndex: Number(dayStr),
    }))
  );

// Convert the local measurements cache into the flat store array used by buildDailySummary
const measurementLogsToStoreEntries = (logs: Record<number, MeasurementLogEntry[]>) =>
  Object.entries(logs).flatMap(([dayStr, list]) =>
    (list || []).map(e => ({
      dayIndex: Number(dayStr),
      weight: e.weight ?? null,
      systolic: e.systolic ?? null,
      diastolic: e.diastolic ?? null,
      timestamp: e.timestamp,
      id: e.id,
      timeString: e.timeString,
      pulse: e.pulse ?? null,
      tonus: e.tonus,
      energy: e.energy,
      mood: e.mood,
      wellbeing: e.wellbeing,
    }))
  );

interface HoldStepperButtonProps {
  onStep: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

// Stepper button that fast-scrolls the value while held with a pointer.
function HoldStepperButton({ onStep, disabled, children, className }: HoldStepperButtonProps) {
  const timerRef = React.useRef<number | null>(null);

  const stop = React.useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Guarantee no leak / runaway scrolling on unmount
  React.useEffect(() => stop, [stop]);

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    if (disabled) return;
    onStep();
    timerRef.current = window.setInterval(onStep, 90);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onClick={(e) => e.preventDefault()}
      className={className}
    >
      {children}
    </button>
  );
}

// Cyclic state configurations for the measurements modal (Энергия / Настроение / Самочувствие).
const ENERGY_STATES = [
  { id: "high", label: "Высокая", img: stateEnergyHigh },
  { id: "normal", label: "Спокойная", img: stateEnergyNormal },
  { id: "low", label: "Сниженная", img: stateEnergyLow },
];

const MOOD_STATES = [
  { id: "good", label: "Лёгкое", img: stateMoodGood },
  { id: "normal", label: "Ровное", img: stateMoodNormal },
  { id: "bad", label: "Тяжёлое", img: stateMoodBad },
];

const WELLBEING_STATES = [
  { id: "excellent", label: "Хорошее", img: stateWellbeingExcellent },
  { id: "normal", label: "Среднее", img: stateWellbeingNormal },
  { id: "poor", label: "Плохое", img: stateWellbeingPoor },
];

interface MyDayScreenProps {
  dayNotes: Record<number, { text: string; time: string }[]>;
  setDayNotes: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string }[]>>>;
  currentDayIndex: number;
  setCurrentDayIndex: React.Dispatch<React.SetStateAction<number>>;
  onOpenCalendar: () => void;
  // Deprecated props — kept for backward compat
  onBack?: () => void;
  selectedChronic?: string[];
  selectedGoals?: string[];
  water?: number;
  setWater?: React.Dispatch<React.SetStateAction<number>>;
  savedDishes?: any[];
  sleep?: number;
  setSleep?: React.Dispatch<React.SetStateAction<number>>;
  mealCount?: number;
  setMealCount?: React.Dispatch<React.SetStateAction<number>>;

  habitsDone?: number;
  setHabitsDone?: React.Dispatch<React.SetStateAction<number>>;
  meals?: { id: string; name: string; checked: boolean }[];
  setMeals?: React.Dispatch<React.SetStateAction<{ id: string; name: string; checked: boolean }[]>>;
  habits?: { id: string; name: string; done: boolean }[];
  setHabits?: React.Dispatch<React.SetStateAction<{ id: string; name: string; done: boolean }[]>>;
  onOpenHabitsTwenty?: () => void;
  onOpenWhatIEat?: () => void;
  onOpenRecipes?: () => void;
  onOpenFromWhatIs?: () => void;
  onOpenBookRecipes?: () => void;
  onOpenPurchases?: () => void;
  onOpenDiary?: () => void;
  onOpenAnna?: () => void;
  onOpenStateNow?: () => void;
  screen?: string;
  userName?: string;
  userGender?: "female" | "male";
  weight?: number;
  setWeight?: (val: number | ((prev: number) => number)) => void;
  systolic?: number;
  setSystolic?: (val: number | ((prev: number) => number)) => void;
  diastolic?: number;
  setDiastolic?: (val: number | ((prev: number) => number)) => void;
  ratingWellbeing?: number;
  setRatingWellbeing?: React.Dispatch<React.SetStateAction<number>>;
  ratingEnergy?: number;
  setRatingEnergy?: React.Dispatch<React.SetStateAction<number>>;
  ratingLightness?: number;
  setRatingLightness?: React.Dispatch<React.SetStateAction<number>>;
  isReadOnly?: boolean;
}

const VESSEL_BUBBLES = [
  { id: 1, size: 5, left: "15%", duration: 4.8, delay: 0 },
  { id: 2, size: 7, left: "42%", duration: 6.2, delay: 1.2 },
  { id: 3, size: 4, left: "73%", duration: 3.8, delay: 0.5 },
  { id: 4, size: 6, left: "28%", duration: 5.4, delay: 2.0 },
  { id: 5, size: 3, left: "58%", duration: 6.5, delay: 0.8 },
  { id: 6, size: 5, left: "82%", duration: 5.0, delay: 1.5 },
  { id: 7, size: 6, left: "22%", duration: 5.7, delay: 2.8 },
  { id: 8, size: 4, left: "64%", duration: 4.5, delay: 3.3 }
];

export default function MyDayScreen({
  dayNotes,
  setDayNotes,
  currentDayIndex,
  setCurrentDayIndex,
  onOpenCalendar,
  water: propsWater,
  savedDishes: propsSavedDishes,
  isReadOnly = false,
}: MyDayScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const setSelectedGraphDay = useAppStore((s) => s.setSelectedGraphDay);
  const screen = useAppStore((s) => s.screen);
  const profile = useAppStore((s) => s.userProfile);

  React.useEffect(() => {
    setSelectedGraphDay(currentDayIndex);
  }, [currentDayIndex, setSelectedGraphDay]);

  // Механизм сброса нового дня (New Day Reset)
  React.useEffect(() => {
    const checkAndResetNewDay = () => {
      const tz = getUserTimeZone();
      const todayStr = todayLocalDate(tz);
      const storedDate = localStorage.getItem('wfpb_last_active_date');

      if (storedDate && storedDate !== todayStr) {
        // 1. Жестко удаляем кэш рецептов и напитков прошлого дня из памяти
        const keysToClear = [
          "wfpb_breakfast_state", 
          "wfpb_lunch_state", 
          "wfpb_dinner_state",
          "wfpb_must_have_state", 
          "wfpb_compliments_state",
          "wfpb_recipe_of_day_state", 
          "wfpb_drinks_state"
        ];
        keysToClear.forEach(k => localStorage.removeItem(k));

        // 2. Очищаем Zustand стор
        useAppStore.setState({ recipeStates: {} });
        
        // 3. Записываем новую дату и перезагружаем приложение для инициализации с нуля
        localStorage.setItem('wfpb_last_active_date', todayStr);
        window.location.reload();
      } else if (!storedDate) {
        localStorage.setItem('wfpb_last_active_date', todayStr);
      }
    };

    checkAndResetNewDay();

    const handleVisibility = () => {
      if (!document.hidden) checkAndResetNewDay();
    };
    
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Local state for metrics (will be saved via API)
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState(0);
  const [mealCount, setMealCount] = useState(0);
  const clickCount = useAppStore((s) => s.clickCount);
  const globalProgress = useAppStore((s) => s.globalProgress);
  const setClickCountStore = useAppStore((s) => s.setClickCount);

  // Check for pending achievements when MyDay is active
  useEffect(() => {
    if (screen === "my-day") {
      const checkPendingAchievements = async () => {
        try {
          const data = await api<any>("/api/achievements/check-pending");
          if (data && data.id) {
            window.dispatchEvent(new CustomEvent('show-achievement-overlay', { detail: { id: data.id } }));
          }
        } catch (e) {
          console.error("Failed to check pending achievements", e);
        }
      };
      checkPendingAchievements();
      
      const handleVisibility = () => {
        if (!document.hidden) checkPendingAchievements();
      };
      
      const handleForceCheck = () => checkPendingAchievements();

      document.addEventListener("visibilitychange", handleVisibility);
      window.addEventListener("force-check-pending-achievements", handleForceCheck);
      
      return () => {
        document.removeEventListener("visibilitychange", handleVisibility);
        window.removeEventListener("force-check-pending-achievements", handleForceCheck);
      };
    }
  }, [screen]);

  // DB-sourced daily metric (persisted in DB — survives reload and navigation away)
  const [dbMetric, setDbMetric] = useState<any>(null);
  useEffect(() => {
    api<any>("/api/user/state-now?dayIndex=" + currentDayIndex)
      .then((d) => {
        setDbMetric(d?.dailyMetric || null);
        if (d?.dailyMetric?.movementLog) {
          try {
            const parsed = JSON.parse(d.dailyMetric.movementLog);
            const converted = (Array.isArray(parsed) ? parsed : []).map((e: any) => ({
              id: e.id || `m-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              type: e.activityType || e.type || '',
              duration: e.durationSeconds || e.duration || 0,
              dayIndex: currentDayIndex,
              timestamp: e.timestamp || Date.now(),
              timeString: e.timeString || '',
            }));
            const prev = useAppStore.getState().movementEntries.filter((me: any) => me.dayIndex !== currentDayIndex);
            setMovementEntriesStore([...prev, ...converted]);
          } catch (e) {
            console.error("Failed to parse movementLog:", e);
          }
        }
        if (d?.dailyMetric?.digestionLog) {
          try {
            const parsed = typeof d.dailyMetric.digestionLog === 'string'
              ? JSON.parse(d.dailyMetric.digestionLog)
              : d.dailyMetric.digestionLog;
            const prevEntries = useAppStore.getState().digestionEntries;
            const filtered = (parsed || []).filter((e: any) => !prevEntries.some((p) => p.id === e.id));
            if (filtered.length > 0) {
              useAppStore.getState().setDigestionEntries([...prevEntries, ...filtered]);
            }
          } catch (e) {
            console.error("Failed to parse digestionLog:", e);
          }
        }
        // Load water entries from DB (source of truth), sync localStorage cache
        let dbWaterEntries: any[] = [];
        if (d?.dailyMetric?.waterEntries) {
          try {
            dbWaterEntries = typeof d.dailyMetric.waterEntries === 'string'
              ? JSON.parse(d.dailyMetric.waterEntries)
              : d.dailyMetric.waterEntries;
          } catch (e) {
            console.error("Failed to parse waterEntries:", e);
          }
        }
        setWaterLogs(prev => ({
          ...prev,
          [currentDayIndex]: dbWaterEntries,
        }));
        // Sync localStorage cache with DB data
        try {
          const raw = localStorage.getItem('wfpb_daily_water_entries_v3');
          const allLogs = raw ? JSON.parse(raw) : {};
          allLogs[currentDayIndex] = dbWaterEntries;
          localStorage.setItem('wfpb_daily_water_entries_v3', JSON.stringify(allLogs));
        } catch {}
        // Load sleep journal from DB (canonical source) into client state
        try {
          const dbSleep = d?.dailyMetric?.sleepLogs;
          if (dbSleep) {
            const parsedSleep = typeof dbSleep === 'string' ? JSON.parse(dbSleep) : dbSleep;
            if (Array.isArray(parsedSleep)) {
              const normalized = parsedSleep
                .map((e: any) => normalizeSleepEntry(e))
                .filter((e: SleepEntry | null): e is SleepEntry => e !== null);
              if (normalized.length > 0) {
                setSleepJournal(prev => mergeSleepEntries(prev, normalized));
              }
            }
          }
        } catch {}
        // Load measurements from DB (source of truth for historical analytics)
        if (d?.dailyMetric?.measurements) {
          try {
            const parsed = typeof d.dailyMetric.measurements === 'string'
              ? JSON.parse(d.dailyMetric.measurements)
              : d.dailyMetric.measurements;
            setMeasurementLogs(prev => ({
              ...prev,
              [currentDayIndex]: parsed,
            }));
          } catch (e) {
            console.error("Failed to parse measurements:", e);
          }
        }
      })
      .catch(() => {});
  }, [currentDayIndex]);

  // Live habits count from SystemKeysStore (use props for consistency with HabitsTwentyScreen)
  const recipeStates = useAppStore((s) => s.recipeStates);
  SystemKeysStore.syncRecipeStates(recipeStates);
  const effSavedDishes = propsSavedDishes || [];
  const effWater = typeof propsWater !== "undefined" ? propsWater : water;

  // Progress from SystemKeysStore - the core 20-key WFPB compliance system
  const systemKeysResult = useMemo(() => {
    return SystemKeysStore.calculateKeysForDay(currentDayIndex, effSavedDishes, effWater);
  }, [currentDayIndex, effSavedDishes, effWater, recipeStates]);

  const habitsDone = systemKeysResult.closedCount;

  // Compute nutrition data for DigestionScreen
  const digestionNutritionData = useMemo(() => {
    const mealState = {
      breakfast: (recipeStates as any)['breakfast'] || {},
      lunch: (recipeStates as any)['lunch'] || {},
      dinner: (recipeStates as any)['dinner'] || {},
      mustHave: (recipeStates as any)['must_have'] || {},
      compliments: (recipeStates as any)['compliment'] || {},
      recipeOfDay: (recipeStates as any)['recipe_of_day'] || {},
      drinks: (recipeStates as any)['drinks'] || {},
    };
    const mealRecipes = {
      breakfast: BREAKFAST_RECIPES,
      lunch: LUNCH_RECIPES,
      dinner: DINNER_RECIPES,
      mustHave: MUST_HAVE_RECIPES,
      compliments: COMPLIMENTS_RECIPES,
      recipeOfDay: RECIPE_OF_DAY_RECIPES,
      drinks: DRINKS_RECIPES,
    };
    return DailyNutritionStore.getDailyNutrition(effSavedDishes, currentDayIndex, mealState, mealRecipes);
  }, [currentDayIndex, effSavedDishes, recipeStates]);
  const totalFiber = digestionNutritionData.totalFiber;
  const aggregatedIngredients = digestionNutritionData.aggregatedIngredients;
  const [meals, setMeals] = useState([{ id: "breakfast", name: "Завтрак", checked: false }, { id: "lunch", name: "Обед", checked: false }, { id: "dinner", name: "Ужин", checked: false }, { id: "snack", name: "Перекус", checked: false }]);
  const [habits, setHabits] = useState([{ id: "no_sugar", name: "Без сахара", done: false }, { id: "no_salt", name: "Без соли", done: false }, { id: "greens", name: "Зелень", done: false }, { id: "active", name: "Активность", done: false }]);
  const selectedChronic = profile.chronicConditions || [];
  const selectedGoals = profile.healthGoals || [];
  const userName = profile.name || "";
  const userGender = (profile.gender || "female") as "female" | "male";
  const weight = profile.weight || 0;
  const systolic = profile.systolic || 0;
  const diastolic = profile.diastolic || 0;
  const [ratingWellbeing, setRatingWellbeing] = useState(5);
  const [ratingEnergy, setRatingEnergy] = useState(5);
  const [ratingLightness, setRatingLightness] = useState(5);
  const setWeight = (val: number | ((prev: number) => number)) => {
    useAppStore.setState((s) => {
      const prev = s.userProfile?.weight ?? 0;
      const next = typeof val === "function" ? (val as (p: number) => number)(prev) : val;
      return { userProfile: { ...s.userProfile, weight: next } };
    });
  };
  const setSystolic = (val: number | ((prev: number) => number)) => {};
  const setDiastolic = (val: number | ((prev: number) => number)) => {};

  // Navigation helpers
  const onBack = () => setScreen("my-page");
  const onOpenHabitsTwenty = () => setScreen("habits-twenty");
  const onOpenWhatIEat = () => setScreen("what-i-eat");
  const onOpenRecipes = () => setScreen("my-dishes");
  const onOpenFromWhatIs = () => setScreen("from-what-is");
  const onOpenBookRecipes = () => setScreen("book-recipes");
  const onOpenPurchases = () => setScreen("purchases");
  const onOpenDiary = () => setScreen("diary");
  const onOpenAnna = () => setScreen("anna");
  const onOpenStateNow = () => setScreen("state-now");
  const [annaPhraseOffset] = useState(() => Math.floor(Math.random() * 3));

  // Custom added states for premium sheets ("Покупки", "Дневник", "Состояние сейчас")
  const [showPurchasesSheet, setShowPurchasesSheet] = useState(false);
  const [showDiarySheet, setShowDiarySheet] = useState(false);
  const [showStateNowSheet, setShowStateNowSheet] = useState(false);
  const [purchasesState, setPurchasesState] = useState<Record<string, boolean>>({});
  const [diaryInputText, setDiaryInputText] = useState<string>("");

  // Water detailed tracking & reminders logic states
  const [showWaterDetails, setShowWaterDetails] = useState(false);
  const [showFastAddWater, setShowFastAddWater] = useState(false);
  const [tempSelectedFastAmount, setTempSelectedFastAmount] = useState(250);

  const [waterLogs, setWaterLogs] = useState<Record<number, WaterLogEntry[]>>({});

  // Effect-мост: локальный waterLogs — единственный источник состояния воды;
  // Zustand синхронизируется строго после commit (без render-phase updates).
  useEffect(() => {
    useAppStore.getState().setWaterEntries(waterLogsToStoreEntries(waterLogs));
  }, [waterLogs]);

  // Load ALL available course days' water entries from localStorage cache on mount,
  // so the 28-day hydration chart and record day reflect full course history.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('wfpb_daily_water_entries_v3');
      if (raw) {
        const allLogs = JSON.parse(raw);
        if (allLogs && typeof allLogs === 'object') {
          setWaterLogs(prev => ({ ...prev, ...(allLogs as Record<number, WaterLogEntry[]>) }));
        }
      }
    } catch (e) {
      console.error("Failed to hydrate waterLogs from localStorage:", e);
    }
  }, []);

  const [dayWeights, setDayWeights] = useState<Record<number, number>>({});

  const [isRemindersEnabled, setIsRemindersEnabled] = useState<boolean>(false);

  const [activeNotification, setActiveNotification] = useState<{ text: string; type: string } | null>(null);
  const [isPulsating, setIsPulsating] = useState<boolean>(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const nextAllowedNotificationTimeRef = React.useRef<number>(0);

  // Sync isPulsating out of timeout
  useEffect(() => {
    if (isPulsating) {
      const timer = setTimeout(() => {
        setIsPulsating(false);
      }, 12000);
      return () => clearTimeout(timer);
    }
  }, [isPulsating]);

  // --- SLEEP MODULE ACTIVE LOGS & SCENARIOS STATE ---
  const currentSystemHour = Number(formatTimeHM(new Date().toISOString(), getUserTimeZone()).split(":")[0]);
  const isSleepButtonNightActive = currentSystemHour >= 22 || currentSystemHour < 6;

  const [isCurrentlyPulsing, setIsCurrentlyPulsing] = useState(false);

  useEffect(() => {
    if (!isSleepButtonNightActive) {
      setIsCurrentlyPulsing(false);
      return;
    }

    // Set initial pulse for 10 seconds on mount/override change to give immediate premium visual feedback
    setIsCurrentlyPulsing(true);
    const initialTimeout = setTimeout(() => {
      setIsCurrentlyPulsing(false);
    }, 10000);

    const checkPulse = () => {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      // "запускаться каждые 10 минут, длиться 10 секунд" -> e.g. minutes format like 0, 10, 20...
      if (minutes % 10 === 0 && seconds < 10) {
        setIsCurrentlyPulsing(true);
      } else {
        // stay false if not in the active slot and initial timeout already finished
      }
    };

    const interval = setInterval(checkPulse, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [isSleepButtonNightActive]);

  const [sleepLogs, setSleepLogs] = useState<Record<number, SleepDaySummary>>({});

  const [showSleepDetails, setShowSleepDetails] = useState(false);
  const [showFastSleep, setShowFastSleep] = useState(false);
  const [showSleepQualityModal, setShowSleepQualityModal] = useState(false);
  const [showNightPrompt, setShowNightPrompt] = useState(false);
  const [lastConsumedDate, setLastConsumedDate] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem("wfpb_night_prompt_v1");
      return raw ? JSON.parse(raw).consumedDate : null;
    } catch {
      return null;
    }
  });

  const [isNightModeActive, setIsNightModeActive] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('wfpb_sleep_session');
      return stored ? (JSON.parse(stored)?.active === true && !!JSON.parse(stored)?.bedTime) : false;
    } catch {
      return false;
    }
  });

  const [bedTimeRecorded, setBedTimeRecorded] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('wfpb_sleep_session');
      return stored ? (JSON.parse(stored)?.bedTime ?? "") : "";
    } catch {
      return "";
    }
  });

  const [wakeTimeRecorded, setWakeTimeRecorded] = useState<string>("");

  // Canonical client-side sleep journal (mirror of DailyMetric.sleepLogs).
  const [sleepJournal, setSleepJournal] = useState<SleepEntry[]>([]);

  // Persist the unfinished overnight sleep session so a reload does not lose bedtime.
  useEffect(() => {
    try {
      if (isNightModeActive && bedTimeRecorded) {
        localStorage.setItem('wfpb_sleep_session', JSON.stringify({
          bedTime: bedTimeRecorded,
          active: true,
          draftTimestamp: Date.now(),
        }));
      } else {
        localStorage.removeItem('wfpb_sleep_session');
      }
    } catch {}
  }, [isNightModeActive, bedTimeRecorded]);

  // Persist consumed date so prompt doesn't reappear within the same local day.
  useEffect(() => {
    try {
      localStorage.setItem("wfpb_night_prompt_v1", JSON.stringify({ consumedDate: lastConsumedDate ?? null }));
    } catch {}
  }, [lastConsumedDate]);

  // Timers to handle double click vs. single click vs. long press without intersection conflicts
  const sleepClickTimeoutRef = React.useRef<number | null>(null);
  const sleepLastClickTimeRef = React.useRef<number>(0);
  const sleepLongPressTimerRef = React.useRef<number | null>(null);
  const sleepIsLongPressedRef = React.useRef<boolean>(false);

  // --- MOVEMENT MODULE STATE ---
  const movementEntries = useAppStore((s) => s.movementEntries);
  const addMovementEntry = useAppStore((s) => s.addMovementEntry);
  const setMovementEntriesStore = useAppStore((s) => s.setMovementEntries);

  const [showMovementDetails, setShowMovementDetails] = useState(false);
  const [showFastMovement, setShowFastMovement] = useState(false);

  // Running activity session trackers (Persisted in localStorage)
  const [movementSession, setMovementSession] = useState<{
    activityType: string;
    startTime: number;
    accumulatedMs: number;
    isPaused: boolean;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('wfpb_movement_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activityElapsedTime, setActivityElapsedTime] = useState<number>(0);

  useEffect(() => {
    if (movementSession) {
      localStorage.setItem('wfpb_movement_session', JSON.stringify(movementSession));
    } else {
      localStorage.removeItem('wfpb_movement_session');
    }
  }, [movementSession]);

  // Summary completed session visual helper
  const [showMovementSummaryCompleted, setShowMovementSummaryCompleted] = useState<{
    activityType: string;
    durationSeconds: number;
    pointsEarned: number;
  } | null>(null);

  // Timers to handle double click vs. single click vs. long press for Movement button without intersection conflicts
  const movementClickTimeoutRef = React.useRef<number | null>(null);
  const movementLastClickTimeRef = React.useRef<number>(0);
  const movementLongPressTimerRef = React.useRef<number | null>(null);
  const movementIsLongPressedRef = React.useRef<boolean>(false);

  // --- MEASUREMENTS MODULE STATE ---
  const [measurementLogs, setMeasurementLogs] = useState<Record<number, MeasurementLogEntry[]>>({});

  // Effect-мост: локальный measurementLogs — единственный источник замеров;
  // Zustand синхронизируется строго после commit.
  useEffect(() => {
    useAppStore.getState().setMeasurementEntries(measurementLogsToStoreEntries(measurementLogs));
  }, [measurementLogs]);

  const [showMeasurementsDetails, setShowMeasurementsDetails] = useState(false);
  const [showFastMeasurements, setShowFastMeasurements] = useState(false);

  // States to hold currently selected/entering metrics on the fast entry sheet
  const [fastEnergy, setFastEnergy] = useState<number>(0);
  const [fastMood, setFastMood] = useState<number>(0);
  const [fastWellbeing, setFastWellbeing] = useState<number>(0);
  const [fastPulse, setFastPulse] = useState<number>(68); 
  const [fastWeight, setFastWeight] = useState<number>(weight);
  const [fastSystolic, setFastSystolic] = useState<number>(systolic);
  const [fastDiastolic, setFastDiastolic] = useState<number>(diastolic);

  // Cyclic tap handlers: 0 -> 1 -> 2 -> 0
  const cycleEnergy = () => setFastEnergy(prev => (prev + 1) % ENERGY_STATES.length);
  const cycleMood = () => setFastMood(prev => (prev + 1) % MOOD_STATES.length);
  const cycleWellbeing = () => setFastWellbeing(prev => (prev + 1) % WELLBEING_STATES.length);

  // Timers to handle double click vs. single click vs. long press for Measurements button
  const measurementsClickTimeoutRef = React.useRef<number | null>(null);
  const measurementsLastClickTimeRef = React.useRef<number>(0);
  const measurementsLongPressTimerRef = React.useRef<number | null>(null);
  const measurementsIsLongPressedRef = React.useRef<boolean>(false);

  // --- DIGESTION MODULE STATE ---
  const [showDigestionDetails, setShowDigestionDetails] = useState(false);

  // Timers to handle double click vs. single click vs. long press for Digestion button
  const digestionClickTimeoutRef = React.useRef<number | null>(null);
  const digestionLastClickTimeRef = React.useRef<number>(0);
  const digestionLongPressTimerRef = React.useRef<number | null>(null);
  const digestionIsLongPressedRef = React.useRef<boolean>(false);

  // Handle live stopwatch interval ticking
  useEffect(() => {
    let timerId: number | null = null;
    if (movementSession && !movementSession.isPaused) {
      // Tick every second to update UI
      timerId = window.setInterval(() => {
        const totalMs = movementSession.accumulatedMs + (Date.now() - movementSession.startTime);
        setActivityElapsedTime(Math.floor(totalMs / 1000));
      }, 1000);
      
      // Also update immediately on effect start
      const totalMs = movementSession.accumulatedMs + (Date.now() - movementSession.startTime);
      setActivityElapsedTime(Math.floor(totalMs / 1000));
    } else if (movementSession && movementSession.isPaused) {
      setActivityElapsedTime(Math.floor(movementSession.accumulatedMs / 1000));
    } else {
      setActivityElapsedTime(0);
    }
    return () => {
      if (timerId !== null) clearInterval(timerId);
    };
  }, [movementSession]);



  // Connect Chef / Curator Anna as a daily dashboard screen-aware layer
  useEffect(() => {
    if (typeof window === "undefined") return;

    let subScreen = null;
    let subScreenData: any = {};

    if (showWaterDetails) {
      subScreen = "Детали Водного Баланса";
      const waterTarget = getWaterGoal(getResolvedWeightForDay(currentDayIndex));
      subScreenData = {
        water_target_ml: waterTarget,
        water_current_ml: water,
        percent: Math.min(100, Math.floor((water / waterTarget) * 100))
      };
    } else if (showFastAddWater) {
      subScreen = "Быстрое Добавление Воды";
      subScreenData = {
        suggestion_amount_ml: tempSelectedFastAmount
      };
    } else if (showSleepDetails) {
      subScreen = "Детали Сна";
      subScreenData = {
        sleep_target_minutes: 480,
        sleep_current_minutes: sleep,
        percent: Math.min(100, Math.floor((sleep / 480) * 100))
      };
    } else if (showMovementDetails) {
      subScreen = "Активность и Движение";
      subScreenData = {};
    } else if (showMeasurementsDetails) {
      subScreen = "Замеры Тела";
      subScreenData = {
        current_weight: weight,
        user_gender: userGender
      };
    } else if (showDigestionDetails) {
      subScreen = "Пищеварение";
      subScreenData = {
        current_day: currentDayIndex
      };
    } else if (showDiarySheet) {
      subScreen = "Быстрый Дневник";
      subScreenData = {
        current_day: currentDayIndex
      };
    } else if (showStateNowSheet) {
      subScreen = "Состояние Сейчас";
      subScreenData = {
        ratingWellbeing,
        ratingEnergy,
        ratingLightness
      };
    }

    (window as any).currentScreenContext = {
      screen_id: "my-day",
      screen_title: "Мой День — Главный Дашборд",
      current_day: currentDayIndex,
      metrics: {
        water_ml: water,
        sleep_minutes: sleep,
        meals_completed: mealCount,
        habits_completed: habitsDone
      },
      active_modal_or_overlay: subScreen,
      modal_data: subScreenData,
      userName: userName,
      selectedChronic,
      selectedGoals
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "my-day") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [
    currentDayIndex,
    water,
    sleep,
    mealCount,
    clickCount,
    habitsDone,
    showWaterDetails,
    showFastAddWater,
    tempSelectedFastAmount,
    showSleepDetails,
    showMovementDetails,
    showMeasurementsDetails,
    showDigestionDetails,
    showDiarySheet,
    showStateNowSheet,
    ratingWellbeing,
    ratingEnergy,
    ratingLightness,
    weight,
    userGender,
    userName,
    selectedChronic,
    selectedGoals
  ]);

  // Derive per-day aggregates + achievements cache from the canonical journal.
  useEffect(() => {
    const aggregated = aggregateSleepPerDay(sleepJournal);
    setSleepLogs(aggregated);
    try {
      const sleepRaw = localStorage.getItem('wfpb_daily_sleep_logs_v1');
      const sleepCache = sleepRaw ? JSON.parse(sleepRaw) : {};
      for (const [dayStr, summary] of Object.entries(aggregated)) {
        sleepCache[Number(dayStr)] = summary;
      }
      localStorage.setItem('wfpb_daily_sleep_logs_v1', JSON.stringify(sleepCache));
    } catch {}
    const today = aggregated[currentDayIndex];
    if (today && today.duration > 0) {
      setSleep(today.duration);
    }
  }, [sleepJournal]);

  // Synthesize Sound: Deep Temple Bell (strike sound) on "Сон"
  const playDeepBellSound = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const fund = 180; // Ground note G3
      const partials = [1, 1.25, 1.5, 2.0, 2.65];
      const gains = [0.4, 0.2, 0.12, 0.08, 0.03];
      
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(380, now);
      filter.connect(ctx.destination);

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.35, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      masterGain.connect(filter);
      
      partials.forEach((mul, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(fund * mul, now);
        oscGain.gain.setValueAtTime(gains[idx], now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + (1.3 / mul));
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 1.8);
      });
    } catch (e) {
      console.warn("Audio Context init error", e);
    }
  };

  // Synthesize Sound: Light morning chimes on "Пробуждение"
  const playMorningChimes = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const fund = 920; // High bell pitch B5
      const partials = [1, 1.48, 1.96, 2.45];
      const gains = [0.35, 0.18, 0.08, 0.03];

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.32, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      masterGain.connect(ctx.destination);

      partials.forEach((mul, idx) => {
        const osc = ctx.createOscillator();
        const oscGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(fund * mul, now);
        oscGain.gain.setValueAtTime(gains[idx], now);
        oscGain.gain.exponentialRampToValueAtTime(0.0001, now + (0.5 / mul));
        osc.connect(oscGain);
        oscGain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.9);
      });
    } catch (e) {
      console.warn("Audio Context init error", e);
    }
  };

  // Double click and Single click sleep controller
  const handleSleepButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (sleepIsLongPressedRef.current) {
      sleepIsLongPressedRef.current = false;
      return;
    }

    recordClick(2);
    const now = Date.now();
    const timeDiff = now - sleepLastClickTimeRef.current;

    if (timeDiff < 280) {
      // Double Click: Open analytical dashboard
      if (sleepClickTimeoutRef.current) {
        clearTimeout(sleepClickTimeoutRef.current);
        sleepClickTimeoutRef.current = null;
      }
      setShowSleepDetails(true);
    } else {
      sleepLastClickTimeRef.current = now;
      if (sleepClickTimeoutRef.current) {
        clearTimeout(sleepClickTimeoutRef.current);
      }
      sleepClickTimeoutRef.current = window.setTimeout(() => {
        // Double click / long press always → SleepDetailsScreen (handled above)
        if (!isSleepButtonNightActive) {
          setShowSleepDetails(true);
          return;
        }
        if (isNightModeActive) {
          return;
        }
        const tz = getUserTimeZone();
        const todayStr = todayLocalDate(tz);
        if (lastConsumedDate !== todayStr) {
          setShowNightPrompt(true);
        } else {
          setShowSleepDetails(true);
        }
      }, 220);
    }
  };

  const handleWakeUpFromOverlay = () => {
    completeSleepSession(null);
  };

  const startSleepLongPress = () => {
    sleepIsLongPressedRef.current = false;
    sleepLongPressTimerRef.current = window.setTimeout(() => {
      sleepIsLongPressedRef.current = true;
      recordClick(5);
      playDeepBellSound();
      setShowSleepDetails(true);
    }, 700);
  };

  const cancelSleepLongPress = () => {
    if (sleepLongPressTimerRef.current) {
      clearTimeout(sleepLongPressTimerRef.current);
      sleepLongPressTimerRef.current = null;
    }
  };

  // --- MOVEMENT SOUND SYNTHESIZERS ---
  const playMovementStartSound = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const fund = 520; // High C5 chime
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.2, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.61);
      masterGain.connect(ctx.destination);
      
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(fund, now);
      osc.frequency.exponentialRampToValueAtTime(fund * 1.5, now + 0.3); // lovely sliding upward sound
      osc.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.61);
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  };

  const playMovementStopSound = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.25, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      masterGain.connect(ctx.destination);
      
      // Chime note 1: E5
      const osc1 = ctx.createOscillator();
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.type = "sine";
      osc1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Chime note 2: A5 slightly delayed
      const osc2 = ctx.createOscillator();
      osc2.frequency.setValueAtTime(880, now + 0.15);
      osc2.type = "sine";
      osc2.connect(masterGain);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.7);
    } catch (e) {
      console.warn("Audio Context error", e);
    }
  };

  // --- MOVEMENT GESTURE HANDLERS ---
  const handleMovementButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (movementIsLongPressedRef.current) {
      movementIsLongPressedRef.current = false;
      return;
    }

    recordClick(2);
    const now = Date.now();
    const timeDiff = now - movementLastClickTimeRef.current;

    if (timeDiff < 280) {
      // Double Click: Open analytical dashboard
      if (movementClickTimeoutRef.current) {
        clearTimeout(movementClickTimeoutRef.current);
        movementClickTimeoutRef.current = null;
      }
      setShowMovementDetails(true);
    } else {
      movementLastClickTimeRef.current = now;
      if (movementClickTimeoutRef.current) {
        clearTimeout(movementClickTimeoutRef.current);
      }
      movementClickTimeoutRef.current = window.setTimeout(() => {
        setShowFastMovement(true);
      }, 220);
    }
  };

  const startMovementLongPress = () => {
    movementIsLongPressedRef.current = false;
    movementLongPressTimerRef.current = window.setTimeout(() => {
      movementIsLongPressedRef.current = true;
      recordClick(5);
      playDeepBellSound();
      setShowMovementDetails(true);
    }, 700);
  };

  const cancelMovementLongPress = () => {
    if (movementLongPressTimerRef.current) {
      clearTimeout(movementLongPressTimerRef.current);
      movementLongPressTimerRef.current = null;
    }
  };

  const startMovementActivity = (activityKey: string) => {
    const configObj = ACTIVITY_CONFIGS[activityKey];
    if (!configObj) return;

    playMovementStartSound();
    setMovementSession({
      activityType: configObj.name,
      startTime: Date.now(),
      accumulatedMs: 0,
      isPaused: false
    });
    setActivityElapsedTime(0);
    setShowFastMovement(false);
  };

  const stopMovementActivity = () => {
    if (!movementSession) return;

    playMovementStopSound();
    const nowStamp = Date.now();
    const totalMs = movementSession.isPaused 
      ? movementSession.accumulatedMs 
      : movementSession.accumulatedMs + (nowStamp - movementSession.startTime);
      
    const durationSeconds = Math.max(15, Math.floor(totalMs / 1000));
    const activeActivity = movementSession.activityType;
    
    // Save to daily log entries
    const timeStr = formatTimeHM(new Date().toISOString(), getUserTimeZone());

    const newLogEntry = {
      id: `m-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dayIndex: currentDayIndex,
      type: activeActivity,
      activityType: activeActivity,
      duration: durationSeconds,
      durationSeconds,
      timestamp: nowStamp,
      timeString: timeStr,
    };

    addMovementEntry(newLogEntry);

    // Persist movement log + total activity minutes to DB (fire-and-forget)
    const allLogsToday = [...movementEntries.filter((e: any) => e.dayIndex === currentDayIndex), newLogEntry];
    const prevActivityMin = Math.round(movementEntries.filter(e => e.dayIndex === currentDayIndex).reduce((sum, e) => sum + e.duration, 0) / 60);
    const totalActivityMin = Math.round(allLogsToday.reduce((sum, e) => sum + e.duration, 0) / 60);
    const localDate = todayLocalDate(getUserTimeZone());
    api("/api/metrics/daily", {
      method: "POST",
      body: {
        date: localDate,
        dayIndex: currentDayIndex,
        movementLog: [newLogEntry],
        activityMinutes: totalActivityMin,
      },
    }).catch(() => {});

    // Honest math: 1 minute = 1 point, max MOVEMENT_MAX_POINTS_PER_DAY per day.
    const prevPoints = Math.min(MOVEMENT_MAX_POINTS_PER_DAY, prevActivityMin);
    const newTotalPoints = Math.min(MOVEMENT_MAX_POINTS_PER_DAY, totalActivityMin);
    let pts = Math.max(0, newTotalPoints - prevPoints);
    if (pts === 0 && prevPoints < MOVEMENT_MAX_POINTS_PER_DAY) {
      pts = 1; // Minimum 1 point for any short session, unless daily cap is reached
    }

    // Trigger visual summary modal confirmation
    setShowMovementSummaryCompleted({
      activityType: activeActivity,
      durationSeconds: durationSeconds,
      pointsEarned: pts
    });

    // Reset session
    setMovementSession(null);
    setActivityElapsedTime(0);
  };

  const pauseMovementActivity = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!movementSession || movementSession.isPaused) return;
    setMovementSession({
      ...movementSession,
      accumulatedMs: movementSession.accumulatedMs + (Date.now() - movementSession.startTime),
      isPaused: true,
      startTime: Date.now()
    });
  };

  const resumeMovementActivity = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!movementSession || !movementSession.isPaused) return;
    setMovementSession({
      ...movementSession,
      startTime: Date.now(),
      isPaused: false
    });
  };

  const saveManualMovementActivity = (activityKey: string, durationMinutes: number) => {
    if (!activityKey) return;
    const configObj = ACTIVITY_CONFIGS[activityKey];
    if (!configObj) return;

    playMovementStopSound();
    const nowStamp = Date.now();
    const durationSeconds = durationMinutes * 60;
    const activeActivity = configObj.name;
    
    // Save to daily log entries
    const timeStr = formatTimeHM(new Date().toISOString(), getUserTimeZone());

    const newLogEntry = {
      id: `m-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dayIndex: currentDayIndex,
      type: activeActivity,
      activityType: activeActivity,
      duration: durationSeconds,
      durationSeconds,
      timestamp: nowStamp,
      timeString: timeStr,
    };

    addMovementEntry(newLogEntry);

    // Persist movement log + total activity minutes to DB (fire-and-forget)
    const allLogsToday = [...movementEntries.filter((e: any) => e.dayIndex === currentDayIndex), newLogEntry];
    const prevActivityMin = Math.round(movementEntries.filter(e => e.dayIndex === currentDayIndex).reduce((sum, e) => sum + e.duration, 0) / 60);
    const totalActivityMin = Math.round(allLogsToday.reduce((sum, e) => sum + e.duration, 0) / 60);
    const localDate = todayLocalDate(getUserTimeZone());
    api("/api/metrics/daily", {
      method: "POST",
      body: {
        date: localDate,
        dayIndex: currentDayIndex,
        movementLog: [newLogEntry],
        activityMinutes: totalActivityMin,
      },
    }).catch(() => {});

    // Honest math: 1 minute = 1 point, max MOVEMENT_MAX_POINTS_PER_DAY per day.
    const prevPoints = Math.min(MOVEMENT_MAX_POINTS_PER_DAY, prevActivityMin);
    const newTotalPoints = Math.min(MOVEMENT_MAX_POINTS_PER_DAY, totalActivityMin);
    let pts = Math.max(0, newTotalPoints - prevPoints);
    if (pts === 0 && prevPoints < MOVEMENT_MAX_POINTS_PER_DAY) {
      pts = 1; // Minimum 1 point for any short session, unless daily cap is reached
    }

    // Trigger visual summary modal confirmation
    setShowMovementSummaryCompleted({
      activityType: activeActivity,
      durationSeconds: durationSeconds,
      pointsEarned: pts
    });

    setShowFastMovement(false);
  };

  // --- MEASUREMENTS GESTURES & LOGIC ---

  // Web Audio chime for saving a measurement
  const playMeasurementSaveChime = () => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.18, now);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.82);
      masterGain.connect(ctx.destination);
      
      // Joyful high scale: C5 -> E5 -> G5 rapid arpeggio
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        osc.type = "sine";
        osc.connect(masterGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + 0.5 + idx * 0.08);
      });
    } catch (e) {
      console.warn("Audio error", e);
    }
  };

  const handleMeasurementsButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (measurementsIsLongPressedRef.current) {
      measurementsIsLongPressedRef.current = false;
      return;
    }

    recordClick(1);
    const now = Date.now();
    const timeDiff = now - measurementsLastClickTimeRef.current;

    if (timeDiff < 280) {
      // Double Click: open analytical dashboard
      if (measurementsClickTimeoutRef.current) {
        clearTimeout(measurementsClickTimeoutRef.current);
        measurementsClickTimeoutRef.current = null;
      }
      setShowMeasurementsDetails(true);
    } else {
      measurementsLastClickTimeRef.current = now;
      if (measurementsClickTimeoutRef.current) {
        clearTimeout(measurementsClickTimeoutRef.current);
      }
      measurementsClickTimeoutRef.current = window.setTimeout(() => {
        // Single Click: quick measurement modal
        // Prefill from the latest measurement across all days, fall back to profile
        const allEntries = Object.values(measurementLogs).flat();
        const lastEntry = allEntries.length > 0 ? allEntries.reduce((a, b) => a.timestamp > b.timestamp ? a : b) : null;
        setFastEnergy(0);
        setFastMood(0);
        setFastWellbeing(0);
        setFastPulse(lastEntry?.pulse ?? 68);
        setFastWeight(lastEntry?.weight ?? weight);
        setFastSystolic(lastEntry?.systolic ?? systolic);
        setFastDiastolic(lastEntry?.diastolic ?? diastolic);
        setShowFastMeasurements(true);
      }, 220);
    }
  };

  const startMeasurementsLongPress = () => {
    measurementsIsLongPressedRef.current = false;
    measurementsLongPressTimerRef.current = window.setTimeout(() => {
      measurementsIsLongPressedRef.current = true;
      recordClick(5);
      playDeepBellSound();
      setShowMeasurementsDetails(true);
    }, 700);
  };

  const cancelMeasurementsLongPress = () => {
    if (measurementsLongPressTimerRef.current) {
      clearTimeout(measurementsLongPressTimerRef.current);
      measurementsLongPressTimerRef.current = null;
    }
  };

  const submitFastMeasurement = () => {
    // Generate new entry
    const nowStamp = Date.now();
    const timeStr = formatTimeHM(new Date().toISOString(), getUserTimeZone());

    const newLogEntry: MeasurementLogEntry = {
      id: `m-usr-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dayIndex: currentDayIndex,
      timestamp: nowStamp,
      timeString: timeStr,
      energy: "",
      mood: "",
      wellbeing: "",
      tonus: `${ENERGY_STATES[fastEnergy].label} | ${MOOD_STATES[fastMood].label} | ${WELLBEING_STATES[fastWellbeing].label}`,
      pulse: fastPulse > 30 ? fastPulse : null,
      weight: fastWeight > 10 ? Number(fastWeight.toFixed(1)) : null,
      systolic: fastSystolic > 30 ? fastSystolic : null,
      diastolic: fastDiastolic > 20 ? fastDiastolic : null,
    };

    const updatedLogs = { ...measurementLogs };
    if (!updatedLogs[currentDayIndex]) {
      updatedLogs[currentDayIndex] = [];
    }
    updatedLogs[currentDayIndex].push(newLogEntry);

    setMeasurementLogs(updatedLogs);
    setSelectedGraphDay(currentDayIndex);

    // Persist measurement log to DB (fire-and-forget)
    api("/api/metrics/daily", {
      method: "POST",
      body: {
        date: todayLocalDate(getUserTimeZone()),
        dayIndex: currentDayIndex,
        measurements: [newLogEntry],
      },
    }).catch(() => {});

    // Synchronize to global user profile / current state parameters
    if (newLogEntry.weight !== null && setWeight) {
      setWeight(newLogEntry.weight);
    }
    if (newLogEntry.systolic !== null && setSystolic) {
      setSystolic(newLogEntry.systolic);
    }
    if (newLogEntry.diastolic !== null && setDiastolic) {
      setDiastolic(newLogEntry.diastolic);
    }
    // Синхронизация последнего замера в userProfile для cross-module
    // consumer-слоёв (crossModuleSummary, DigestionScreen, useNotificationEngine):
    // water goal = 30 мл × последний weight из Measurements. Обновляются только
    // фактически сохранённые значения; initial* (registration baseline) не трогаются.
    {
      const profilePatch: { weight?: number; systolic?: number; diastolic?: number } = {};
      if (newLogEntry.weight !== null && newLogEntry.weight !== undefined) profilePatch.weight = newLogEntry.weight;
      if (newLogEntry.systolic !== null && newLogEntry.systolic !== undefined) profilePatch.systolic = newLogEntry.systolic;
      if (newLogEntry.diastolic !== null && newLogEntry.diastolic !== undefined) profilePatch.diastolic = newLogEntry.diastolic;
      if (Object.keys(profilePatch).length > 0) {
        useAppStore.getState().updateUserProfile(profilePatch);
      }
    }
    if (newLogEntry.energy) {
      const valMap: Record<string, number> = {
        "высокая": 5,
        "спокойная": 4,
        "сниженная": 2
      };
      const numVal = valMap[newLogEntry.energy];
      if (numVal !== undefined && setRatingEnergy) {
        setRatingEnergy(numVal);
      }
    }

    if (newLogEntry.wellbeing) {
      const valMap: Record<string, number> = {
        "хорошее": 5,
        "среднее": 3,
        "плохое": 2
      };
      const numVal = valMap[newLogEntry.wellbeing];
      if (numVal !== undefined && setRatingWellbeing) {
        setRatingWellbeing(numVal);
      }
    }

    // Play synthesized sound
    playMeasurementSaveChime();

    // Reward points for daily reflection
    recordClick(15); 

    // Dismiss sheet
    setShowFastMeasurements(false);
  };

  const handleDigestionButtonClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (digestionIsLongPressedRef.current) {
      digestionIsLongPressedRef.current = false;
      return;
    }

    recordClick(1);
    // Single Click: quick digestion modal (global overlay)
    useAppStore.getState().setDigestionModalOpen(true, currentDayIndex);
  };

  const startDigestionLongPress = () => {
    digestionIsLongPressedRef.current = false;
    digestionLongPressTimerRef.current = window.setTimeout(() => {
      digestionIsLongPressedRef.current = true;
      recordClick(5);
      playDeepBellSound();
      setShowDigestionDetails(true);
    }, 500);
  };

  const cancelDigestionLongPress = () => {
    if (digestionLongPressTimerRef.current) {
      clearTimeout(digestionLongPressTimerRef.current);
      digestionLongPressTimerRef.current = null;
    }
  };

  const handleWakeUpClick = () => {
    completeSleepSession("fair");
  };

  const completeSleepSession = (manualQuality?: SleepQuality) => {
    if (!bedTimeRecorded) {
      setActiveNotification({
        text: "Время начала сна не зафиксировано — нажмите «Лечь спать», чтобы внести сон.",
        type: "error"
      });
      return;
    }

    const tz = getUserTimeZone();
    const finalBedTime = bedTimeRecorded;
    const curTime = formatTimeHM(new Date().toISOString(), tz);
    setWakeTimeRecorded(curTime);

    const durationMin = sleepDurationMinutes(finalBedTime, curTime);
    if (durationMin <= 0) {
      setActiveNotification({
        text: "Не удалось рассчитать длительность сна.",
        type: "error"
      });
      setIsNightModeActive(false);
      return;
    }

    const now = Date.now();
    const quality = manualQuality ?? null;
    const entry: SleepEntry = {
      id: makeSleepId(),
      dayIndex: currentDayIndex,
      sleepDate: todayLocalDate(tz),
      bedtime: finalBedTime,
      sleepTime: finalBedTime,
      wakeTime: curTime,
      duration: durationMin,
      quality,
      source: "quick",
      status: "completed",
      timezone: tz,
      createdAt: now,
      updatedAt: now,
    };

    const updatedJournal = mergeSleepEntries(sleepJournal, [entry]);
    setSleepJournal(updatedJournal);
    const daySleepEntries = updatedJournal.filter((e) => e.dayIndex === currentDayIndex);

    api("/api/metrics/daily", {
      method: "POST",
      body: {
        date: todayLocalDate(tz),
        dayIndex: currentDayIndex,
        sleepMinutes: sumCompletedSleepMinutes(daySleepEntries),
        sleepLogs: daySleepEntries,
      },
    }).catch(() => {});

    // Clear overnight session from localStorage
    try {
      localStorage.removeItem('wfpb_sleep_session');
    } catch {}

    setIsNightModeActive(false);
    setWakeTimeRecorded("");
    setBedTimeRecorded("");

    recordClick(20);
    setActiveNotification({
      text: `Сон записан: ${Math.floor(durationMin / 60)} ч ${durationMin % 60} мин. Так держать! ☀️`,
      type: "success"
    });
  };

  // Single pipeline for manual sleep entries (from SleepDetailsScreen form).
  const handleSaveSleepEntry = (entry: SleepEntry) => {
    const updatedJournal = mergeSleepEntries(sleepJournal, [entry]);
    setSleepJournal(updatedJournal);
    const tz = getUserTimeZone();
    const daySleepEntries = updatedJournal.filter((e) => e.dayIndex === entry.dayIndex);
    api("/api/metrics/daily", {
      method: "POST",
      body: {
        date: entry.sleepDate || todayLocalDate(tz),
        dayIndex: entry.dayIndex,
        sleepMinutes: sumCompletedSleepMinutes(daySleepEntries),
        sleepLogs: daySleepEntries,
      },
    }).catch(() => {});
    setActiveNotification({
      text: `Сон записан: ${Math.floor(entry.duration / 60)} ч ${entry.duration % 60} мин. День ${entry.dayIndex}.`,
      type: "success"
    });
  };

  // Hydrate the canonical journal from the server (called by SleepDetailsScreen on mount).
  const handleHydrateJournal = (serverEntries: SleepEntry[]) => {
    setSleepJournal(prev => mergeSleepEntries(prev, serverEntries));
  };

  // Sync today's sum to primary upper state
  useEffect(() => {
    const todayEntries = waterLogs[currentDayIndex] || [];
    const sumToday = todayEntries.reduce((acc, e) => acc + e.amount, 0);
    setWater(sumToday);
  }, [currentDayIndex, waterLogs, setWater]);

  // Smart periodic checks for predictive reminder notifications
  // DEPRECATED: Handled by global NotificationEngine
  useEffect(() => {
    return;
    
    if (!isRemindersEnabled) {
      setActiveNotification(null);
      return;
    }

    const interval = setInterval(() => {
      if (activeNotification) return;

      const nowMs = Date.now();
      // Guard for cooldown timestamps
      if (nowMs < nextAllowedNotificationTimeRef.current) {
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const minutesSinceMidnight = currentHour * 60 + currentMinute;

      // Sane daily active window configuration: 08:00 to 22:00 (14 active hours)
      const DAY_START = 8 * 60; // 08:00
      const DAY_END = 22 * 60; // 22:00
      const TOTAL_ACTIVE_MINUTES = DAY_END - DAY_START; // 840 mins

      // Do not disturb after 22:00 or before 07:00
      if (minutesSinceMidnight > DAY_END || minutesSinceMidnight < 7 * 60) {
        return;
      }

      const weightVal = getResolvedWeightForDay(currentDayIndex);
      const targetVal = getWaterGoal(weightVal);
      const remainingWaterToGoal = Math.max(0, targetVal - water);

      // If user has fully closed their requirement, no warnings!
      if (remainingWaterToGoal <= 0) {
        return;
      }

      // If user drank less than 2 hours ago, do not disturb — water is still being absorbed
      const todayEntries = waterLogs[currentDayIndex] || [];
      if (todayEntries.length > 0) {
        const lastEntry = todayEntries[todayEntries.length - 1];
        const hoursSinceLastDrink = (Date.now() - lastEntry.timestamp) / (1000 * 60 * 60);
        if (hoursSinceLastDrink < 2) {
          return;
        }
      }

      const elapsedActiveMin = Math.max(0, Math.min(TOTAL_ACTIVE_MINUTES, minutesSinceMidnight - DAY_START));
      const remainingActiveMin = Math.max(0, DAY_END - minutesSinceMidnight);

      const timeRatio = elapsedActiveMin / TOTAL_ACTIVE_MINUTES;
      const expectedVolumeByNow = Math.round(timeRatio * targetVal);

      // 1. Predictive calculation — are they on track?
      // If actual water consumed is greater than or equal to expected linear target, they are on track!
      // Absolutely no reminders to respect user boundaries: "Анна не вмешивается. Система молчит."
      if (water >= expectedVolumeByNow) {
        return;
      }

      const deficit = expectedVolumeByNow - water;
      const deficitPct = deficit / targetVal;

      const remainingHours = remainingActiveMin / 60;
      const requiredPacePerHour = remainingHours > 0 ? (remainingWaterToGoal / remainingHours) : 0;

      // 2. Comfortable zone protection
      // If deficit is tiny (under 10% of total norm) OR if required pace is extremely gentle (under 120 ml/hour),
      // we still treat the user as "safe/on-track" and do not disturb!
      if (deficitPct < 0.10 || requiredPacePerHour <= 120) {
        return;
      }

      // 3. Formulate predictive risk level
      const entries = waterLogs[currentDayIndex] || [];
      const count = entries.length;

      let riskLevel: "MILD_DEV" | "MODERATE_DEV" | "HIGH_DEV" = "MILD_DEV";
      let notificationText = "";

      // Smart condition for zero water logged today
      if (count === 0) {
        if (elapsedActiveMin < 150) {
          // Early morning nudge (08:00 to 10:30)
          riskLevel = "MILD_DEV";
          const options = [
            `Доброе утро, ${userName}! Твой целевой объём на сегодня — ${targetVal} мл воды. Самое время запустить лимфоток после сна. Начнём с одного чистого стакана? 🌱`,
            `Привет! Почки и капилляры заждались утренней влаги. Для твоего веса (${weightVal} кг) дневная норма — ${targetVal} мл. Давай проснёмся красиво: сделаем первый глоток прямо сейчас! 🔋`
          ];
          notificationText = options[(currentHour + currentDayIndex) % options.length];
        } else if (elapsedActiveMin < 270) {
          // Mid-day warning (10:30 to 12:30)
          riskLevel = "MODERATE_DEV";
          const options = [
            `${userName}, на часах уже полдень, а у нас 0 мл воды. По прогнозу, требуется выпивать по ${Math.round(requiredPacePerHour)} мл каждый час, чтобы закрыть планку в ${targetVal} мл. Сделаешь паузу на стакан?`,
            `0 пропитых глотков к полудню — это серьёзное испытание для сосудистого тонуса, ${userName}. Нужна помощь цельной растительной клетчатке в усвоении. Выпьем стакан воды прямо сейчас!`
          ];
          notificationText = options[(currentHour + currentDayIndex) % options.length];
        } else {
          // Late-day high threat (after 12:30)
          riskLevel = "HIGH_DEV";
          const options = [
            `Внимание, ${userName}! Уже вторая половина дня, а приёмов воды ещё не было. Текущий прогноз требует пить по ${Math.round(requiredPacePerHour)} мл в час! Давай срочно нальём стакан чистой воды. 🚨`,
            `Экстренный сухой режим, ${userName}! Нам не хватает всех ${targetVal} мл. Чтобы успеть выйти на норму без перегрузки почек перед сном, требуется по ${Math.round(requiredPacePerHour)} мл в час. Начни с одного стакана!`
          ];
          notificationText = options[(currentHour + currentDayIndex) % options.length];
        }
      } else {
        // User has logged some water, but is beginning to lag behind expected pace.
        if (requiredPacePerHour > 350 || deficitPct > 0.40) {
          // High Risk / Severe Deviation
          riskLevel = "HIGH_DEV";
          const options = [
            `Высокий дефицит влаги, ${userName}! Выпито всего ${water} мл из ${targetVal} мл. До конца активного дня осталось ${remainingHours.toFixed(1)} ч., и теперь прогнозный темп составляет ${Math.round(requiredPacePerHour)} мл в час! Давай защитим сосуды стаканом воды. 🚨`,
            `${userName}, твои почки работают в режиме жёсткого удержания влаги, сужая капилляры. Нам не хватает целых ${Math.round(remainingWaterToGoal)} мл до цели. Срочно нужен стакан воды для разжижения лимфы!`,
            `Экстренный водный дефицит! Чтобы комфортно закрыть норму сегодня без отёков на утро, тебе необходимо пить растительный ресурс в темпе ${Math.round(requiredPacePerHour)} мл/час. Пожалуйста, сделай глоток здоровья прямо сейчас!`
          ];
          notificationText = options[(currentHour + currentDayIndex) % options.length];
        } else if (requiredPacePerHour > 220 || deficitPct > 0.22) {
          // Moderate Risk / Clear Rhythm Break
          riskLevel = "MODERATE_DEV";
          const options = [
            `Ритм гидратации замедляется, ${userName}. Выпито ${water} мл, а планировалось ${expectedVolumeByNow} мл (отставание на ${Math.round(deficit)} мл). Требуемый темп вырос до ${Math.round(requiredPacePerHour)} мл/час. Сделаем стакан чистой воды? 🌊`,
            `Внимание на баланс воды: отставание от здорового графика составляет уже ${Math.round(deficit)} мл. Если затягивать, к вечеру придётся пить сразу литр. Давай предупредим нагрузку на почки парой глотков прямо сейчас!`,
            `Твоё сосудистое русло посылает тихие сигналы жажды, ${userName}. Растительные волокна активно впитывают влагу из блюд, и им нужна чистая вода для очищения. Сделай глоток в поддержку микробиома!`
          ];
          notificationText = options[(currentHour + currentDayIndex) % options.length];
        } else {
          // Mild Risk / Light Lag
          riskLevel = "MILD_DEV";
          const options = [
            `${userName}, мы немножко отстали от графика: выпито ${water} мл из ожидавшихся ${expectedVolumeByNow} мл. Твоему организму теперь требуется около ${Math.round(requiredPacePerHour)} мл в час. Это легко исправить парой глотков! 🌱`,
            `Лёгкая пауза в гидратации, ${userName}! Мы отклонились от графика всего на ${Math.round(deficit)} мл. Стакан чистой воды поможет активировать растительные волокна и вернёт во вкладку нормы.`,
            `Баланс плавно колеблется. Для идеального тонуса нам нужно выпивать около ${Math.round(requiredPacePerHour)} мл в час до вечера. Самое время обновить водную среду клеток и поддержать лёгкий кровоток!`
          ];
          notificationText = options[(currentHour + currentDayIndex) % options.length];
        }
      }

      // Show notification to user
      setActiveNotification({
        text: notificationText,
        type: riskLevel.toLowerCase()
      });

      // 4. Set randomized smart cooldown to completely avoid robotic intervals
      let cooldownMs = 120000; // default 2 minutes
      if (riskLevel === "HIGH_DEV") {
        cooldownMs = 70000 + Math.random() * 40000; // 70s - 110s
      } else if (riskLevel === "MODERATE_DEV") {
        cooldownMs = 130000 + Math.random() * 60000; // 130s - 190s
      } else {
        cooldownMs = 200000 + Math.random() * 120000; // 200s - 320s
      }
      nextAllowedNotificationTimeRef.current = nowMs + cooldownMs;

    }, 20000);

    return () => clearInterval(interval);
  }, [isRemindersEnabled, water, currentDayIndex, waterLogs, activeNotification, userName, userGender, weight]);

  const handleNotificationTap = () => {
    setActiveNotification(null);
    setIsPulsating(true);
    // Instant reset cooldown so adding water immediately recalibrates or allows rapid custom logs
    nextAllowedNotificationTimeRef.current = 0;
  };

  // Add water action helper
  const handleAddWaterAmount = (amt: number) => {
    const timeStr = formatTimeHM(new Date().toISOString(), getUserTimeZone());
    
    const newEntry: WaterLogEntry = {
      id: `water-${Date.now()}-${Math.random()}`,
      amount: amt,
      time: timeStr,
      timestamp: Date.now()
    };

    const updatedLogs = { ...waterLogs };
    if (!updatedLogs[currentDayIndex]) {
      updatedLogs[currentDayIndex] = [];
    }
    updatedLogs[currentDayIndex].push(newEntry);
    
    setWaterLogs(updatedLogs);
    localStorage.setItem('wfpb_daily_water_entries_v3', JSON.stringify(updatedLogs));
    
    const sum = updatedLogs[currentDayIndex].reduce((acc, e) => acc + e.amount, 0);
    setWater(sum);

    // Persist water entries to DB (fire-and-forget)
    api("/api/metrics/daily", {
      method: "POST",
      body: {
        date: todayLocalDate(getUserTimeZone()),
        dayIndex: currentDayIndex,
        waterMl: sum,
        waterEntries: [newEntry],
      },
    }).catch(() => {});

    // Provide a 90 second breathing space of absolute silence after logging water so Anna doesn't bug the user immediately
    nextAllowedNotificationTimeRef.current = Date.now() + 90000;
    setActiveNotification(null);
    setIsPulsating(false);
  };

  const getResolvedWeightForDay = (dayIdx: number): number => {
    if (dayWeights[dayIdx]) {
      return dayWeights[dayIdx];
    }
    for (let d = dayIdx; d >= 1; d--) {
      if (dayWeights[d]) return dayWeights[d];
    }
    for (let d = dayIdx; d <= 28; d++) {
      if (dayWeights[d]) return dayWeights[d];
    }
    return weight || WATER_GOAL_FALLBACK_KG;
  };

  // Click & long press handlers
  const lastClickTimeRef = React.useRef<number>(0);
  const clickTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const longPressTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isLongPressedRef = React.useRef<boolean>(false);

  const startLongPressTimer = () => {
    isLongPressedRef.current = false;
    longPressTimeoutRef.current = setTimeout(() => {
      isLongPressedRef.current = true;
      setShowWaterDetails(true);
    }, 600);
  };

  const cancelLongPressTimer = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const handleWaterButtonClick = (e: React.MouseEvent) => {
    if (isLongPressedRef.current) {
      isLongPressedRef.current = false;
      return;
    }

    recordClick(1);
    const now = Date.now();
    const timeDiff = now - lastClickTimeRef.current;

    if (timeDiff < 300) {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
      setShowWaterDetails(true);
    } else {
      lastClickTimeRef.current = now;
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
      }
      clickTimeoutRef.current = setTimeout(() => {
        setShowFastAddWater(true);
      }, 250);
    }
  };

  const handleWaterButtonMouseDown = () => {
    startLongPressTimer();
  };

  const handleWaterButtonMouseUp = () => {
    cancelLongPressTimer();
  };

  const handleWaterButtonTouchStart = () => {
    startLongPressTimer();
  };

  const handleWaterButtonTouchEnd = () => {
    cancelLongPressTimer();
  };

  // Splash particle definition for the dynamic "Полезная двадцатка" water container physics
  interface HabitsSplashParticle {
    id: number;
    x: number;
    y: number;
    size: number;
    delay: number;
    duration: number;
  }

  const [prevHabitsLocal, setPrevHabitsLocal] = useState<number>(habitsDone);

  const [splashParticles, setSplashParticles] = useState<HabitsSplashParticle[]>([]);

  // 1.2 Physical boiling bubbles representing systemic processes
  interface SystemBubble {
    id: string;
    x: number;
    y: number;
    size: number;
    color: string;
    speedY: number;
    speedX: number;
    driftPhase: number;
    driftAmplitude: number;
    hasSplit: boolean;
    type: "small" | "medium" | "large" | "split-child";
    glow: boolean;
  }

  const [systemBubbles, setSystemBubbles] = useState<SystemBubble[]>([]);

  useEffect(() => {
    let lastSpawnTime = 0;
    let animationFrameId: number;

    const colors = [
      "rgba(56, 189, 248, 0.45)",  // Water azure
      "rgba(168, 85, 247, 0.45)",  // Sleep purple
      "rgba(46, 107, 71, 0.5)",    // Brand purchases green (#2E6B47)
      "rgba(16, 185, 129, 0.45)",  // Diet/emerald
      "rgba(249, 115, 22, 0.45)",  // Digestion orange
      "rgba(14, 165, 233, 0.45)",  // Recepies sky blue
      "rgba(234, 179, 8, 0.45)"    // Sunshine gold
    ];

    const updateBubbles = (timestamp: number) => {
      // Spawn new bubble gently
      if (timestamp - lastSpawnTime > 750) { // spawn gentle rate
        lastSpawnTime = timestamp;
        
        // 50% small, 35% medium, 15% large (увеличенные размеры)
        const rStream = Math.random();
        let bType: "small" | "medium" | "large" = "small";
        let bSize = 8 + Math.random() * 6; // 8-14px (было 5-9px)
        if (rStream > 0.50 && rStream <= 0.85) {
          bType = "medium";
          bSize = 15 + Math.random() * 8; // 15-23px (было 10-15px)
        } else if (rStream > 0.85) {
          bType = "large";
          bSize = 24 + Math.random() * 12; // 24-36px (было 16-23px)
        }

        const newBubble: SystemBubble = {
          id: Math.random().toString(36).substring(2, 9),
          x: (Math.random() - 0.5) * 130, // center-aligned around progress circle
          y: 95 + Math.random() * 30,     // start near bottom of the circle
          size: bSize,
          color: colors[Math.floor(Math.random() * colors.length)],
          speedY: 0.85 + Math.random() * 1.1, // smooth pleasant velocity
          speedX: (Math.random() - 0.5) * 0.3,
          driftPhase: Math.random() * Math.PI * 2,
          driftAmplitude: 0.4 + Math.random() * 0.7,
          hasSplit: false,
          type: bType,
          glow: Math.random() > 0.6
        };

        setSystemBubbles(prev => [...prev, newBubble]);
      }

      setSystemBubbles(prev => {
        const nextList: SystemBubble[] = [];
        for (const b of prev) {
          // 1. Ascend upwards
          let newY = b.y - b.speedY;

          // If the bubble rises off the top of the viewport, discard it
          if (newY < -420) {
            continue;
          }

          // 2. Trigonometric horizontal drift
          let newX = b.x + Math.sin(newY * 0.02 + b.driftPhase) * b.driftAmplitude + b.speedX;

          // 3. Brand Wordmark Deflection Physics ("обтекать слоган «Всё дело в еде!»")
          // Slogan is in the left header, hence sits to the left.
          // Center of deflection lies around x = -110, y = -170
          if (newY < -90 && newY > -240) {
            const sloganCenterX = -110;
            const sloganCenterY = -170;
            const dx = newX - sloganCenterX;
            const dy = newY - sloganCenterY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Deflection distance threshold
            if (dist < 85) {
              const force = (85 - dist) * 0.08;
              newX += (dx >= 0 ? 1.1 : -1.1) * force;
            }
          }

          // 4. Large bubble splitting: "крупные пузырьки лопаются и распадаются на мелкие"
          if (b.type === "large" && !b.hasSplit && newY < -30 && newY > -110 && Math.random() < 0.022) {
            // Split into 3 tiny child bubbles
            for (let i = 0; i < 3; i++) {
              nextList.push({
                id: Math.random().toString(36).substring(2, 9),
                x: newX + (i - 1) * 8 + (Math.random() - 0.5) * 3,
                y: newY - Math.random() * 6,
                size: 4 + Math.random() * 3,
                color: b.color,
                speedY: b.speedY * (1.15 + Math.random() * 0.25), // flow slightly faster
                speedX: (Math.random() - 0.5) * 0.5,
                driftPhase: Math.random() * Math.PI * 2,
                driftAmplitude: 0.5 + Math.random() * 0.5,
                hasSplit: true,
                type: "split-child",
                glow: false
              });
            }
            continue; // dismiss the big parent bubble
          }

          nextList.push({
            ...b,
            x: newX,
            y: newY
          });
        }
        return nextList;
      });

      animationFrameId = requestAnimationFrame(updateBubbles);
    };

    animationFrameId = requestAnimationFrame(updateBubbles);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    // Save current count for next comparison
    if (habitsDone > prevHabitsLocal) {
      // Trigger Splash! User has shed bad habits!
      const count = 18;
      const generated: HabitsSplashParticle[] = [];
      for (let i = 0; i < count; i++) {
        generated.push({
          id: Math.random(),
          x: (Math.random() - 0.5) * 160, // horizontal drift trajectory
          y: -130 - Math.random() * 150, // upward trajectory path
          size: 6 + Math.random() * 9,
          delay: Math.random() * 0.12,
          duration: 1.2 + Math.random() * 0.8
        });
      }
      setSplashParticles(generated);

      const timer = setTimeout(() => {
        setSplashParticles([]);
      }, 2500);

      setPrevHabitsLocal(habitsDone);
      return () => clearTimeout(timer);
    } else if (habitsDone < prevHabitsLocal) {
      setPrevHabitsLocal(habitsDone);
    }
  }, [habitsDone, prevHabitsLocal]);

  // 2. Logic Calculations — 7-factor integral score (Water 20%, Sleep 20%, Meals 20%, Habits 15%, Zen 10%, Energy 10%, Lightness 5%)
  const currentWeightForDay = getResolvedWeightForDay(currentDayIndex);
  const waterGoal = getWaterGoal(currentWeightForDay);
  const sleepGoal = 480;
  const mealGoal = 4;
  const activityGoal = MOVEMENT_DAILY_TARGET_MIN;

  const srcWater = water;
  const srcSleep = (dbMetric?.sleepMinutes ?? 0) + sleep;
  const srcMeal = (dbMetric?.mealCount ?? 0) + mealCount;

  const todayActivityLogs = movementEntries.filter((e: any) => e.dayIndex === currentDayIndex);
  const srcActivity = (dbMetric?.activityMinutes ?? 0)
    + Math.round(todayActivityLogs.reduce((sum, e) => sum + e.duration, 0) / 60);

  const planOfDayPercent = calculateIntegralScore({
    waterMl: srcWater,
    waterTarget: waterGoal,
    sleepMinutes: srcSleep,
    sleepTarget: sleepGoal,
    mealCount: srcMeal,
    mealsTarget: mealGoal,
    habitsDone,
    habitsTarget: 20,
    activityMinutes: srcActivity,
    activityTarget: activityGoal,
    ratingEnergy,
    ratingWellbeing,
    ratingLightness,
  });

  // Auto-increment the interaction tracker "Прогресс" when clicking elements on the page
  const recordClick = (points: number = 1) => {
    setClickCountStore(clickCount + points);
  };

  // 3. Anna Recommendations logic
  const getAnnaRecommendation = () => {
    let name = "";
    let isFemale = true;
    if (typeof window !== "undefined") {
      name = "";
      isFemale = true;
    }

    const namePrefix = name ? `${name}, ` : "";
    const pleasedWord = "рада";
    const proudWord = "горжусь";
    const dynamicGreeting = name ? `Привет, ${name}!` : "Привет!";

    const zeroHabitsPhrases = [
      `${namePrefix}твой день чист и полон возможностей! Давай сделаем первый шаг в заполнении ключей. Каждый шаг приблизит тебя к балансу! 🌿`,
      `Свежее утро — время для чистой воды и лёгкой активности. Жду твоих первых побед в «Ключах системы», ${name || "друг"}! 💚`,
      `${dynamicGreeting} Сегодня идеальный день, чтобы зарядить организм природной силой WFPB рациона. Начнём отмечать наши ключи? ✨`
    ];

    const lowHabitsPhrases = [
      `Отличное начало! Уже ${habitsDone} из 20 ключей выполнены. Наш сосуд начинает наполняться, продолжаем! 🔥`,
      `Прекрасный старт дня, ${name || "дорогой друг"}! ${habitsDone} ${getPlural(habitsDone, ['ключ', 'ключа', 'ключей'])} позади. Зелень, вода и движение — это твои проводники к долголетию. 🌿`,
      `Вижу твою заботу о клетках! ${habitsDone} отметок наполнили сосуд. Давай добавим ещё растительной пользы! 🔋`
    ];

    const midHabitsPhrases = [
      `Твоя шкала ключей позеленела! ${habitsDone} из 20 — прекрасный ритм. Организм говорит тебе спасибо за чистую растительную пищу! 🍃`,
      `Какая лёгкость и осознанность, ${namePrefix || ""}ты наполняешься энергией на ${habitsDone} ${getPlural(habitsDone, ['деление', 'деления', 'делений'])}. Впереди новые здоровые рекорды сегодня! 🌟`,
      `Я невероятно ${pleasedWord} твоим упорством! ${habitsDone} ${getPlural(habitsDone, ['ключ', 'ключа', 'ключей'])} выполнены без капли соли и масла. Твой сосуд заряжен больше чем наполовину! 💚`
    ];

    const highHabitsPhrases = [
      `Невероятно, ${name || "друг"}! ${habitsDone} из 20 достижений! Твой пульс жизни бьётся в чистом ритме. Считанные шаги до абсолютного 100% WFPB триумфа! 🚀`,
      `Ты на финишной прямой! ${habitsDone} отмеченных пунктов. Чистое сияние клеток почти на максимуме. Я искренне ${proudWord} твоей динамикой! ⚡`,
      `Каждая клетка твоего тела празднует растительное обновление, ${namePrefix || ""} ${habitsDone} из 20 — космический уровень заботы о себе! 💎`
    ];

    const perfectHabitsPhrases = [
      `👑 Ура, ${name || "победитель"}! Полный триумф! Все 20 ключей закрыты! Твой золотой WFPB-сосуд наполнился на все 100%! Ты — эталон чистой осознанности и здоровья! Поздравляю! 🎉`,
      `☀️ Поздравляю с абсолютным рекордом дня, ${name || "друг мой"}! Все 20 ключей светятся чистым триумфом! Твои клетки сияют живой растительной силой без соли! Ты космос! 🏆`,
      `⭐ Небывалый чистый ритм! Все 20 ключей полностью закрыты! Это настоящий подвиг для здоровья, твоё будущее «я» присылает тебе миллион благодарностей! 💖`
    ];

    if (habitsDone === 0) {
      return {
        title: "Анна приветствует",
        text: zeroHabitsPhrases[annaPhraseOffset % zeroHabitsPhrases.length]
      };
    } else if (habitsDone >= 20) {
      return {
        title: "Анна празднует триумф!",
        text: perfectHabitsPhrases[annaPhraseOffset % perfectHabitsPhrases.length]
      };
    } else if (habitsDone >= 15) {
      return {
        title: "Рекомендация от Анны",
        text: highHabitsPhrases[annaPhraseOffset % highHabitsPhrases.length]
      };
    } else if (habitsDone >= 8) {
      return {
        title: "Рекомендация от Анны",
        text: midHabitsPhrases[annaPhraseOffset % midHabitsPhrases.length]
      };
    } else {
      return {
        title: "Рекомендация от Анны",
        text: lowHabitsPhrases[annaPhraseOffset % lowHabitsPhrases.length]
      };
    }
  };

  const annaMsg = getAnnaRecommendation();

  if (showWaterDetails) {
    return (
      <WaterDetailsScreen
        currentDayIndex={currentDayIndex}
        profileWeight={weight}
        userName={userName}
        userGender={userGender}
        water={water}
        setWater={setWater}
        onBack={() => setShowWaterDetails(false)}
        waterLogs={waterLogs}
        setWaterLogs={setWaterLogs}
        dayWeights={dayWeights}
        setDayWeights={setDayWeights}
        handleAddWaterAmount={handleAddWaterAmount}
      />
    );
  }

  if (showSleepDetails) {
    return (
      <SleepDetailsScreen
        currentDayIndex={currentDayIndex}
        userName={userName}
        userGender={userGender}
        sleep={sleep}
        setSleep={setSleep}
        onBack={() => setShowSleepDetails(false)}
        sleepLogs={sleepLogs}
        setSleepLogs={setSleepLogs}
        sleepJournal={sleepJournal}
        onSaveSleepEntry={handleSaveSleepEntry}
        onHydrateJournal={handleHydrateJournal}
        dayNotes={dayNotes}
        setDayNotes={setDayNotes}
      />
    );
  }

  if (showMovementDetails) {
    return (
      <MovementDetailsScreen
        currentDayIndex={currentDayIndex}
        userName={userName}
        userGender={userGender}
        onBack={() => setShowMovementDetails(false)}
      />
    );
  }

  if (showMeasurementsDetails) {
    return (
      <MeasurementsDetailsScreen
        currentDayIndex={currentDayIndex}
        userName={userName}
        userGender={userGender}
        onBack={() => setShowMeasurementsDetails(false)}
        measurementLogs={measurementLogs}
        setMeasurementLogs={setMeasurementLogs}
        dayNotes={dayNotes}
        setDayNotes={setDayNotes}
      />
    );
  }

  if (showDigestionDetails) {
    return (
      <DigestionScreen
        onBack={() => setShowDigestionDetails(false)}
        currentDayIndex={currentDayIndex}
        userName={userName}
        userGender={userGender}
        meals={meals}
        water={water}
        totalFiber={totalFiber}
        aggregatedIngredients={aggregatedIngredients}
      />
    );
  }

  return (
    <div className="w-full flex flex-col justify-between relative overflow-hidden" id="my-day-screen">

      {/* Main Screen Viewport Body */}
      <div className={`flex-1 flex flex-col px-5 pt-3 pb-6 max-h-[740px] overflow-y-auto scrollbar-none transition-all duration-700 ${
        isNightModeActive ? "blur-[5px] brightness-[0.25] pointer-events-none" : ""
      }`}>
        
        {/* Header: System Title */}
        <div className="flex flex-col mb-3 z-10 relative px-1">
          <span className="text-[16px] font-bold text-gray-400 uppercase tracking-[0.15em]">Система</span>
          <h1 className="text-[26px] leading-none font-black text-emerald-800 mt-1">Всё дело в еде!</h1>
        </div>

        {/* Central Dashboard Matrix */}
        <div className="grid grid-cols-12 gap-3.5 items-start mb-4.5 pt-0.5">
          
          {/* Central element: Big Glass Liquid Circle representing "План дня" */}
          <div className="col-span-7 flex justify-center py-2 relative" id="progress-circle-parent">
            
            {/* === LIVING SYSTEM BUBBLES BACKDROP CONTAINER === */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-visible">
              {systemBubbles.map((bubble) => (
                <div
                  key={bubble.id}
                  className="absolute rounded-full transition-shadow duration-300 pointer-events-none"
                  style={{
                    width: `${bubble.size}px`,
                    height: `${bubble.size}px`,
                    left: `calc(50% + ${bubble.x}px - ${bubble.size / 2}px)`,
                    top: `calc(50% + ${bubble.y}px - ${bubble.size / 2}px)`,
                    background: `radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.95) 0%, ${bubble.color} 55%, rgba(255, 255, 255, 0.05) 100%)`,
                    boxShadow: bubble.glow 
                      ? `0 0 7px 1.5px rgba(255, 255, 255, 0.8), inset 0 1px 2px rgba(255,255,255,0.85), inset 0 -1px 2px rgba(0,0,0,0.12)`
                      : `inset 0 1.2px 2px rgba(255,255,255,0.75), inset 0 -1px 1px rgba(0,0,0,0.08)`,
                    border: "0.5px solid rgba(255, 255, 255, 0.38)",
                    transform: "translate3d(0,0,0)",
                  }}
                />
              ))}
            </div>

            <div className="relative w-[216px] h-[216px] rounded-full flex items-center justify-center select-none active:scale-[0.98] transition-transform duration-300 z-10">
              
              {/* Outer heavy immersive drop realistic casting shadow */}
              <div className="absolute inset-[-1.5px] rounded-full bg-slate-900/15 pointer-events-none filter blur-[12px] translate-y-5" />
              <div className="absolute inset-0 rounded-full bg-[#1F2328]/8 pointer-events-none filter blur-[18px] translate-y-7" />
              
              {/* Outer light glow drop reflection */}
              <div className="absolute inset-[-12px] rounded-full bg-gradient-to-tr from-brand-green-mint/35 to-transparent pointer-events-none filter blur-[22px]" />
              
              {/* Main heavy glass casing ring with incredible double physical shadows */}
              <div className="absolute inset-0 rounded-full bg-white/60 border border-white/90 shadow-[inset_0_10px_20px_rgba(255,255,255,0.95),_inset_0_-10px_20px_rgba(31,35,40,0.06),_0_24px_48px_-8px_rgba(31,35,40,0.22),_0_10px_20px_-8px_rgba(31,35,40,0.18)] backdrop-blur-xl" />
              
              {/* Symmetrical progressive glowing channel ring track with deeper depth shadow */}
              <div className="absolute inset-[10px] rounded-full bg-[#EAEEF0] shadow-[inset_0_4px_8px_rgba(0,0,0,0.15),_inset_0_1.5px_3px_rgba(0,0,0,0.08)] overflow-hidden">
                
                {/* Visual Glass Inner Liquid fill filling up based on planOfDayPercent */}
                <motion.div 
                  initial={{ height: "0%" }}
                  animate={{ height: `${planOfDayPercent}%` }}
                  transition={{ type: "spring", stiffness: 45, damping: 15 }}
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0C7E35] via-[#16B551] to-[#22C55E] flex flex-col justify-end overflow-hidden"
                >
                  {/* Fluid liquid bubble wave generator */}
                  <div className="absolute inset-x-0 -top-2.5 h-3 bg-[#4ADD75] rounded-full scale-y-[0.45] opacity-85 blur-[0.2px] animate-pulse" />
                  
                  {/* Floating micro glass bubbles inside the main liquid */}
                  {planOfDayPercent > 10 && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                      <div className="absolute bottom-4 left-4 w-2.5 h-2.5 rounded-full bg-white/40 blur-[0.3px] animate-bubble-slow" />
                      <div className="absolute bottom-8 right-6 w-3 h-3 rounded-full bg-white/30 blur-[0.5px] animate-bubble-medium" />
                      <div className="absolute bottom-2 left-[55%] w-1.5 h-1.5 rounded-full bg-white/50 blur-[0.2px] animate-bubble-fast" />
                      <div className="absolute bottom-[40%] right-3 w-2 h-2 rounded-full bg-white/30 blur-[0.4px] animate-bubble-slow" />
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Inner floating center cap providing separation of volumetric fluid from text */}
              <div className="absolute inset-[24px] rounded-full bg-white/95 border border-white/60 shadow-[0_10px_22px_rgba(31,35,40,0.08),_0_2px_5px_rgba(0,0,0,0.04),_inset_0_3px_6px_rgba(255,255,255,0.95)] flex flex-col items-center justify-center p-2 z-10 overflow-hidden">
                {/* Linear soft highlight gradient sweeping across the center cap inside */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/40 pointer-events-none" />
                {/* Glossy top crescent cut across the inner text cap */}
                <div className="absolute top-0 left-1 right-1 h-1/3 bg-white/60 rounded-[50%_/_0_0_100%_100%] pointer-events-none filter blur-[0.6px]" />
                
                {/* Glare and high intensity glimmers */}
                <div className="absolute top-[6%] left-[15%] w-[3.5px] h-[3.5px] bg-white rounded-full shadow-[0_0_2px_white]" />
                <div className="absolute top-[12%] left-[10%] w-[1.5px] h-[1.5px] bg-white rounded-full" />
                
                {/* Big bold % text with physical depth text-shadow */}
                <span 
                  className="text-[44px] sm:text-[46px] font-bold text-text-dark leading-none tracking-tight inline-flex items-baseline drop-shadow-[0_1.5px_1.5px_rgba(255,255,255,0.95)] relative z-10 -mt-1"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  {planOfDayPercent}
                  <span className="text-[22px] font-bold text-text-muted ml-0.5">%</span>
                </span>
                
                {/* Little sprout leaf visual */}
                <div className="flex flex-col items-center mt-0 relative z-10">
                  <span 
                    className="text-[11px] font-bold text-text-muted/95 uppercase tracking-[1.2px]"
                    style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  >
                    план дня
                  </span>
                  <img 
                    src={logoSprout}
                    alt="лого"
                    className="w-[68px] h-[68px] object-contain mt-1"
                  />
                </div>
              </div>

              {/* Top outer lens glossy shimmer border reflect */}
              <div className="absolute top-1.5 left-5 right-5 h-[12%] bg-gradient-to-b from-white/80 via-white/30 to-transparent rounded-full pointer-events-none filter blur-[0.3px]" />
              {/* Outer light glare sweep (highly realistic glass lens reflection) */}
              <div className="absolute top-1 left-4 right-4 h-[25%] bg-gradient-to-b from-white/80 via-white/20 to-transparent rounded-[50%_/_100%_100%_0%_0%] pointer-events-none filter blur-[0.5px]" />
              {/* Outstanding high intensity lens flare point with glowing aura */}
              <div className="absolute top-[12%] left-[16%] w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_6px_rgba(255,255,255,0.95),_0_0_4px_2px_rgba(24,242,126,0.3)] pointer-events-none z-10" />
              {/* Glimmer reflection dot bottom left */}
              <div className="absolute bottom-[14%] left-[14%] w-1.5 h-1.5 rounded-full bg-white/60 pointer-events-none filter blur-[0.2px]" />
              {/* Highlight rim flare on bottom left */}
              <div className="absolute bottom-2 left-6 w-10 h-[6px] bg-white/25 rounded-full pointer-events-none filter blur-[0.3px] -rotate-[15deg]" />
            </div>
          </div>

          {/* Right Cards Stack: Unified Progress + Calendar Widget */}
          <div className="col-span-5 flex flex-col gap-2 items-end mt-6">
            
            {/* Unified Widget: Progress + Calendar */}
            <div className="flex flex-row items-center justify-between w-full bg-slate-50/50 backdrop-blur-md border border-slate-200/50 shadow-sm rounded-2xl px-4 py-2.5 mb-3">
              {/* Left: Progress */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[#15803D] shrink-0">
                  <Sparkles className="w-4.5 h-4.5 stroke-[2]" />
                </div>
                <div className="flex flex-col">
                  <span 
                    className="text-[17px] sm:text-[18px] font-bold text-text-dark leading-none"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    {globalProgress}
                  </span>
                  <span 
                    className="text-[11px] text-text-muted font-bold tracking-tight lowercase mt-0.5 leading-none"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    прогресс
                  </span>
                </div>
              </div>

              {/* Center Separator */}
              <div className="w-px h-8 bg-gray-300/50 mx-2"></div>

              {/* Right: Calendar */}
              <motion.button
                type="button"
                onClick={() => { recordClick(); onOpenCalendar(); }}
                className="flex items-center gap-2.5 transition-all duration-300 hover:scale-[1.03] active:scale-97 cursor-pointer focus:outline-none shrink-0"
                whileTap={{ scale: 0.97 }}
              >
                <div className="w-7.5 h-7.5 rounded-lg bg-[#EBF5EF] flex items-center justify-center text-[#2E6B47] shrink-0">
                  <Calendar className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="flex flex-col">
                  <span 
                    className="text-[17px] sm:text-[18px] font-bold text-text-dark leading-none whitespace-nowrap"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    {currentDayIndex} из 28
                  </span>
                  <span 
                    className="text-[11px] text-text-muted font-bold tracking-tight lowercase mt-0.5 leading-none"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    день
                  </span>
                </div>
              </motion.button>
            </div>

            {/* Card 3: Привычки (Ключи системы — новый дизайн с картинкой) */}
            <button
              type="button"
              onClick={() => {
                recordClick(1);
                onOpenHabitsTwenty();
              }}
              className="flex flex-col items-center justify-center cursor-pointer active:scale-[0.98] transition-transform duration-200 w-full -translate-y-4"
            >
              <div className="relative w-full">
                <img
                  src={systemKeyWidget}
                  alt="Ключи системы"
                  className="w-full h-auto drop-shadow-sm pointer-events-none object-contain"
                />
                <div className="absolute top-[53%] right-[25%] -translate-y-1/2 translate-x-1/2 flex items-center justify-center w-12 h-12 text-[36px] font-extrabold text-gray-700 tracking-tighter">
                  {habitsDone}
                </div>
              </div>
              <span className="text-[13px] font-bold text-gray-500 uppercase tracking-wider text-center mt-1 whitespace-nowrap">
                Ключи системы
              </span>
            </button>

          </div>
        </div>

        {/* Section 6: Quick Actions Block */}
        <div className="flex flex-col text-left mb-4.5">
          <div className="grid grid-cols-4 gap-2.5">
            {/* Action 1: Water */}
            <button
              type="button"
              onClick={handleWaterButtonClick}
              onMouseDown={handleWaterButtonMouseDown}
              onMouseUp={handleWaterButtonMouseUp}
              onTouchStart={handleWaterButtonTouchStart}
              onTouchEnd={handleWaterButtonTouchEnd}
              className={`w-full aspect-[3/4] rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none ${
                isPulsating 
                  ? "animate-pulse shadow-[0_0_0_4px_rgba(56,189,248,0.25),0_4px_14px_-2px_rgba(0,0,0,0.08)]" 
                  : "shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
              }`}
            >
              <img
                src={waterImg}
                alt="Вода"
                className="w-full h-full object-cover"
              />
            </button>

            {/* Action 2: Eat (Food photo analysis trigger - dark blue button with camera icon) */}
            <button
              type="button"
              onClick={() => {
                recordClick(1);
                onOpenWhatIEat();
              }}
              className="w-full aspect-[3/4] rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
            >
              <img
                src={foodImg}
                alt="Еда"
                className="w-full h-full object-cover"
              />
            </button>

            {/* Action 3: Movement */}
            <motion.button
              type="button"
              onClick={handleMovementButtonClick}
              onMouseDown={startMovementLongPress}
              onMouseUp={cancelMovementLongPress}
              onTouchStart={startMovementLongPress}
              onTouchEnd={cancelMovementLongPress}
              animate={movementSession ? {
                scale: [1, 1.03, 1],
                boxShadow: [
                  "0 0 0 6px rgba(245,158,11,0.3), 0 4px 14px -2px rgba(0,0,0,0.08)",
                  "0 0 0 10px rgba(245,158,11,0.15), 0 4px 14px -2px rgba(0,0,0,0.08)",
                  "0 0 0 6px rgba(245,158,11,0.3), 0 4px 14px -2px rgba(0,0,0,0.08)"
                ]
              } : { scale: 1, boxShadow: "0 4px 14px -2px rgba(0,0,0,0.08)" }}
              transition={{
                repeat: movementSession ? Infinity : 0,
                duration: 2.2,
                ease: "easeInOut"
              }}
              className="w-full aspect-[3/4] rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
            >
              <img
                src={movementImg}
                alt="Движение"
                className="w-full h-full object-cover"
              />
            </motion.button>

            {/* Action 4: Sleep replacement */}
            <motion.button
              type="button"
              onClick={handleSleepButtonClick}
              onMouseDown={startSleepLongPress}
              onMouseUp={cancelSleepLongPress}
              onTouchStart={startSleepLongPress}
              onTouchEnd={cancelSleepLongPress}
              animate={isSleepButtonNightActive && isCurrentlyPulsing ? {
                scale: [1, 1.04, 1],
                boxShadow: [
                  "0 0 0 6px rgba(139,92,246,0.3), 0 4px 14px -2px rgba(0,0,0,0.08)",
                  "0 0 0 10px rgba(139,92,246,0.15), 0 4px 14px -2px rgba(0,0,0,0.08)",
                  "0 0 0 6px rgba(139,92,246,0.3), 0 4px 14px -2px rgba(0,0,0,0.08)"
                ]
              } : { scale: 1, boxShadow: "0 4px 14px -2px rgba(0,0,0,0.08)" }}
              transition={{
                repeat: isSleepButtonNightActive && isCurrentlyPulsing ? Infinity : 0,
                duration: 2.5,
                ease: "easeInOut"
              }}
              className="w-full aspect-[3/4] rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
            >
              <img
                src={sleepImg}
                alt="Сон"
                className="w-full h-full object-cover"
              />
            </motion.button>
          </div>

          {/* SECOND ACTION BUTTONS ROW */}
          <div className="grid grid-cols-4 gap-2.5 mt-2.5">
            {/* Action 5: Замеры */}
            <motion.button
              type="button"
              onClick={handleMeasurementsButtonClick}
              onMouseDown={startMeasurementsLongPress}
              onMouseUp={cancelMeasurementsLongPress}
              onTouchStart={startMeasurementsLongPress}
              onTouchEnd={cancelMeasurementsLongPress}
              className="w-full aspect-[3/4] rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
            >
              <img
                src={measurementsImg}
                alt="Замеры"
                className="w-full h-full object-cover"
              />
            </motion.button>

            {/* Action 6: Рецепты */}
            <motion.button
              type="button"
              onClick={onOpenFromWhatIs}
              className="w-full aspect-[3/4] rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
            >
              <img
                src={recipesImg}
                alt="Рецепты"
                className="w-full h-full object-cover"
              />
            </motion.button>

            {/* Action 7: Пищеварение */}
            <motion.button
              type="button"
              onClick={handleDigestionButtonClick}
              onMouseDown={startDigestionLongPress}
              onMouseUp={cancelDigestionLongPress}
              onTouchStart={startDigestionLongPress}
              onTouchEnd={cancelDigestionLongPress}
              className="w-full aspect-[3/4] rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
            >
              <img
                src={organismImg}
                alt="Организм"
                className="w-full h-full object-cover"
              />
            </motion.button>

            {/* Action 8: Книга */}
            <motion.button
              type="button"
              onClick={onOpenBookRecipes}
              className="w-full aspect-[3/4] rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
            >
              <img
                src={bookImg}
                alt="Книга"
                className="w-full h-full object-cover"
              />
            </motion.button>
          </div>
        </div>

        {/* Premium Core Action Blocks ("Покупки", "Дневник", "Состояние сейчас") */}
        <div className="grid grid-cols-2 gap-3 mb-3 text-left w-full mt-1">
          {/* Button Purchases - Emerald elegant custom premium card */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { onOpenPurchases?.(); recordClick(1); }}
            className="w-full rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
          >
            <img
              src={purchasesImg}
              alt="Покупки"
              className="w-full h-full object-cover"
            />
          </motion.button>

          {/* Button Diary - light serene celestial blue */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => { if (onOpenDiary) { onOpenDiary(); } else { setShowDiarySheet(true); } recordClick(1); }}
            className="w-full rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
          >
            <img
              src={diaryImg}
              alt="Дневник"
              className="w-full h-full object-cover"
            />
          </motion.button>
        </div>

        {/* Button State Now - full width charcoal grey, deep, premium, important entry point */}
        <div className="mb-5 w-full">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => { if (onOpenStateNow) { onOpenStateNow(); } else { setShowStateNowSheet(true); } recordClick(2); }}
            className="w-full rounded-[22px] overflow-hidden p-0 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer select-none shadow-[0_4px_14px_-2px_rgba(0,0,0,0.08)]"
          >
            <img
              src={stateNowImg}
              alt="Состояние сейчас"
              className="w-full h-full object-cover"
            />
          </motion.button>
        </div>

        {/* Section 5: Recommendation Card from Anna (Dynamic advice based on indicators) */}
        <div className="bg-white rounded-[24px] shadow-[0_4px_16px_rgba(43,49,55,0.03)] p-4 mb-6 flex flex-col gap-3 text-left">
          <div className="flex items-center gap-3">
            {/* Anna's Premium Circular Avatar with glossy glass ring */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full overflow-hidden border border-brand-green-mint/30 shadow-[0_4px_8px_-2px_rgba(16,181,81,0.2)]">
                <img 
                  src={annaAvatarSrc}
                  alt="Анна — Советник WFPB" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-brand-green-bright border-2 border-white flex items-center justify-center text-xs scale-105">
                🌱
              </div>
            </div>

            <div className="flex flex-col">
              <h3 
                className="text-[17px] sm:text-[18px] font-black text-text-dark leading-none"
                style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
              >
                Анна
              </h3>
              <span 
                className="text-[11.5px] sm:text-[12px] font-bold text-text-muted mt-0.5 leading-none"
                style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
              >
                Советник WFPB
              </span>
            </div>
          </div>

          <AnnaText
            text={annaMsg.text}
            userName={userName}
            className="text-[14px] sm:text-[15px] text-text-sec bg-slate-50/70 p-3 rounded-2xl leading-relaxed font-medium"
          />
        </div>

      </div>

      {/* Builtin Premium Bottom navigation layout matching the active "Мой день" view */}
      <div className="w-full">
        <BottomBar 
          onHomeClick={onBack}
          onRecipesClick={onOpenRecipes}
          onDiaryClick={onOpenWhatIEat}
          onAnalyticsClick={onOpenHabitsTwenty}
          onAnnaClick={onOpenAnna}
          activeTab="my-day"
        />
      </div>

      {/* 5. FAST ADD WATER BOTTOM SHEET POPUP MODAL OVERLAY */}
      <AnimatePresence>
        {showFastAddWater && (
          <>
            {/* Backdrop blur darkening filter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A] z-45"
              onClick={() => setShowFastAddWater(false)}
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute inset-0 flex items-center justify-center px-5 py-6 z-50 pointer-events-none"
            >
              <div className="w-full max-w-md bg-white rounded-3xl shadow-[0_-12px_40px_rgba(15,23,42,0.18),0_12px_40px_rgba(15,23,42,0.25)] border border-slate-100 p-6 flex flex-col text-left text-text-dark max-h-[80dvh] overflow-y-auto overscroll-contain pointer-events-auto">

              <div className="flex justify-between items-center mb-5">
                <div className="flex flex-col">
                  <span className="text-[12px] font-extrabold text-sky-600 uppercase tracking-widest leading-none">БЫСТРЫЙ УЧЁТ ВОДЫ</span>
                  <h3 className="text-[20px] font-black text-text-dark font-sans tracking-tight mt-1">Добавить объём жидкости</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFastAddWater(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-90 font-bold transition-transform cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Horizontal Scroll Wheels volume selectors */}
              <div className="relative">
                {/* PC drag scrollbar above cards */}
                <div className="px-1 mb-3">
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={1}
                    value={[100, 150, 200, 250, 300, 400, 500, 750, 1000].indexOf(tempSelectedFastAmount)}
                    onChange={(e) => {
                      const idx = parseInt(e.target.value);
                      const amt = [100, 150, 200, 250, 300, 400, 500, 750, 1000][idx];
                      setTempSelectedFastAmount(amt);
                      if (scrollRef.current) {
                        const child = scrollRef.current.children[idx] as HTMLElement;
                        if (child) {
                          const containerWidth = scrollRef.current.clientWidth;
                          const childLeft = child.offsetLeft;
                          const childWidth = child.offsetWidth;
                          scrollRef.current.scrollLeft = childLeft - containerWidth / 2 + childWidth / 2;
                        }
                      }
                    }}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-sky-500
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5
                      [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-white
                      [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-sky-500
                      [&::-webkit-slider-thumb]:shadow-md
                      [&::-webkit-slider-thumb]:hover:scale-110
                      [&::-webkit-slider-thumb]:transition-transform
                      [&::-moz-range-thumb]:w-5
                      [&::-moz-range-thumb]:h-5
                      [&::-moz-range-thumb]:rounded-full
                      [&::-moz-range-thumb]:bg-white
                      [&::-moz-range-thumb]:border-2
                      [&::-moz-range-thumb]:border-sky-500
                      [&::-moz-range-thumb]:shadow-md"
                  />
                  {/* Tick labels */}
                  <div className="flex justify-between px-[2px] mt-1">
                    {[100, 200, 300, 500, 1000].map((v) => (
                      <span key={v} className="text-[10px] font-medium text-slate-400">
                        {v < 1000 ? `${v}` : `1л`}
                      </span>
                    ))}
                  </div>
                </div>
                {/* Scroll fade edges */}
                <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />
                <div ref={scrollRef} className="flex overflow-x-auto gap-3.5 py-4 px-1 scrollbar-none snap-x snap-mandatory justify-start select-none pointer-events-auto">
                  {[100, 150, 200, 250, 300, 400, 500, 750, 1000].map((amt) => {
                    const isPref = amt === tempSelectedFastAmount;
                    
                    let volumeImg = volumeDrop1Img;
                    if (amt >= 1000) volumeImg = volumePitcherImg;
                    else if (amt >= 750) volumeImg = volumeThermosImg;
                    else if (amt >= 500) volumeImg = volumeBottleImg;
                    else if (amt >= 300) volumeImg = volumeGlassLargeImg;
                    else if (amt === 250) volumeImg = volumeGlassSmallImg;
                    else if (amt === 200) volumeImg = volumeDrop3Img;
                    else if (amt === 150) volumeImg = volumeDrop2Img;

                    return (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTempSelectedFastAmount(amt)}
                        className={`snap-center flex-shrink-0 w-24 h-24 rounded-2xl flex flex-col items-center justify-between p-3.5 transition-all duration-300 border cursor-pointer ${
                          isPref
                            ? "bg-gradient-to-b from-[#0EA5E9] to-[#0284C7] text-white border-sky-300 shadow-[0_8px_16px_rgba(14,165,233,0.3)] scale-105"
                            : "bg-slate-50 text-slate-800 border-slate-100 hover:bg-slate-100/80 active:scale-95"
                        }`}
                      >
                        <img
                          src={volumeImg}
                          alt={`${amt} мл`}
                          className="w-14 h-14 object-contain"
                        />
                        <span className="text-[14px] font-bold font-mono">
                          {amt < 1000 ? `${amt} мл` : `1.0 л`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Information Hint */}
              <div className="flex items-center gap-2 bg-sky-500/5 px-4 py-3 rounded-2xl border border-sky-100/40 text-[12.5px] leading-snug font-medium text-sky-800 my-4 text-left">
                <HelpCircle className="w-4.5 h-4.5 text-sky-500 shrink-0" />
                <span>{getDailyWaterTip()}</span>
              </div>

              {/* Large Confirm primary action button */}
              <button
                type="button"
                onClick={() => {
                  handleAddWaterAmount(tempSelectedFastAmount);
                  setShowFastAddWater(false);
                }}
                className="w-full h-13 rounded-2xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 hover:scale-[1.01] transition-all text-white font-extrabold text-[16px] tracking-wide shadow-[0_5px_15px_rgba(14,165,233,0.3)] select-none pointer-events-auto active:scale-98 cursor-pointer mt-1"
              >
                Подтвердить выбор (+{tempSelectedFastAmount < 1000 ? `${tempSelectedFastAmount} мл` : `1.0 л`})
              </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- SLEEP SYSTEM INTERACTIVE OVERLAYS & MODALS --- */}

      {/* NIGHT PROMPT MODAL */}
      <AnimatePresence>
        {showNightPrompt && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A]/80 z-[60] flex items-center justify-center p-5"
            />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="absolute z-[61] flex flex-col items-center gap-4 p-6 w-full max-w-[340px]"
            >
              <button
                type="button"
                onClick={() => setShowNightPrompt(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 pointer-events-none" />
              </button>

              <img
                src={imgNightPrompt}
                alt="Лечь спать"
                className="w-[180px] h-auto object-contain cursor-pointer select-none"
              />

              <div className="text-center">
                <span className="text-[20px] font-black text-white tracking-tight block leading-tight">
                  ЛЕЧЬ СПАТЬ
                </span>
                <span className="text-[12px] text-violet-200/60 font-bold mt-0.5 block">
                  нажмите сейчас
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  const tz = getUserTimeZone();
                  const todayStr = todayLocalDate(tz);
                  setLastConsumedDate(todayStr);
                  setShowNightPrompt(false);
                }}
                className="mt-2 py-3 px-5 rounded-2xl bg-purple-100 text-purple-600 font-semibold text-[14px] transition-all cursor-pointer active:scale-98"
              >
                Нарушаем режим
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* LOCK OVERLAY (active session) */}
      <AnimatePresence>
        {isNightModeActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0B0F1C] z-[45] flex flex-col items-center justify-between p-6 overflow-hidden select-none"
          >
            {/* Stars ambient */}
            <div className="absolute top-8 left-12 w-40 h-40 bg-violet-600/8 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-24 right-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />

            <div className="flex flex-col items-center gap-4 relative z-10 pt-8">
              <img src={imgNightPrompt} alt="" className="w-[120px] h-auto object-contain opacity-70" />
              <div className="flex flex-col items-center gap-1.5">
                <h2 className="text-[20px] font-black text-white/90 tracking-tight text-center leading-snug">
                  Приложение отдыхает вместе с тобой…
                </h2>
                <p className="text-[13px] text-violet-200/50 text-center leading-relaxed max-w-[260px]">
                  Твой организм восстанавливается. Отдыхай спокойно.
                </p>
              </div>
              {bedTimeRecorded && (
                <span className="text-[12px] bg-white/6 px-4 py-1.5 rounded-full font-mono text-violet-200 border border-white/10 font-bold mt-1">
                  Начали в: {bedTimeRecorded}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-3 pb-16 relative z-10">
              <img
                src={imgWakeUp}
                alt="Пробуждение"
                className="w-[160px] h-auto object-contain cursor-pointer select-none active:scale-95 transition-transform"
                onClick={handleWakeUpFromOverlay}
              />
              <div className="text-center">
                <span className="text-[18px] font-black text-white tracking-tight block">
                  ПРОБУЖДЕНИЕ
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REMINDERS TOAST */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.95 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
            className="absolute top-4 left-4 right-4 bg-gradient-to-r from-[#1E293B] to-[#0F172A] rounded-[24px] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.25)] p-4 text-white z-[70] flex items-center justify-between text-left cursor-pointer hover:brightness-105 active:scale-98 transition-all pointer-events-auto"
            onClick={handleNotificationTap}
          >
            <div className="flex gap-3 items-center">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-[22px] shrink-0 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)]">
                💧
              </div>
              <div className="flex-1 flex flex-col">
                <span className="text-[11px] font-extrabold text-cyan-400 uppercase tracking-widest leading-none">НАПОМИНАНИЕ АННЫ</span>
                <span className="text-[13px] font-medium leading-snug mt-1 text-slate-100 pr-2">
                  {activeNotification.text}
                </span>
              </div>
            </div>
            <div className="text-[10px] bg-cyan-500 text-white px-2.5 py-1 rounded-full font-extrabold uppercase shrink-0 scale-95 shadow-sm">
              ГОРЯЧО
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MOVEMENT MODULE OVERLAYS --- */}
      
      {/* 10. FAST MOVEMENT ACTIVITY LAUNCH SELECTOR SHEET */}
      <MovementModal
        visible={showFastMovement}
        userGender={userGender}
        onClose={() => setShowFastMovement(false)}
        onStart={startMovementActivity}
        onSave={saveManualMovementActivity}
      />

      {/* 11. ACTIVE MOVING ACTIVITY STOPWATCH FLOATING BUTTON Overlay */}
      <AnimatePresence>
        {movementSession && (() => {
          const activeConfig = Object.values(ACTIVITY_CONFIGS).find(cfg => cfg.name === movementSession.activityType) || Object.values(ACTIVITY_CONFIGS)[0];
          return (
          <div className="absolute bottom-22 right-6 z-50 pointer-events-auto" id="floating-active-stopwatch">
            <motion.div
              initial={{ scale: 0, opacity: 0, y: 50 }}
              animate={{ 
                scale: 1, 
                opacity: 1, 
                y: 0,
                boxShadow: movementSession.isPaused ? "0 4px 20px rgba(0,0,0,0.1)" : [
                  "0 4px 20px rgba(0,0,0,0.1), 0 0 0 0px rgba(0,0,0,0.05)",
                  "0 4px 20px rgba(0,0,0,0.1), 0 0 0 10px rgba(0,0,0,0.1)",
                  "0 4px 20px rgba(0,0,0,0.1), 0 0 0 0px rgba(0,0,0,0.05)"
                ]
              }}
              exit={{ scale: 0, opacity: 0, y: 50 }}
              transition={{
                boxShadow: movementSession.isPaused ? {} : { repeat: Infinity, duration: 1.8, ease: "easeInOut" },
                scale: { type: "spring", damping: 15 }
              }}
              style={{ backgroundColor: activeConfig.hexColor }}
              className="rounded-[28px] py-2 px-4 shadow-xl flex items-center gap-3 cursor-default select-none border border-slate-200/50"
            >
              <div className={`w-10 h-10 flex items-center justify-center shrink-0 ${movementSession.isPaused ? "grayscale opacity-80" : "animate-pulse"}`}>
                <img src={getMovementAssetPath(movementSession.activityType, userGender)} alt={movementSession.activityType} className="w-full h-full object-contain" />
              </div>
              
              <div className="flex flex-col text-left mr-2 min-w-[70px]">
                <span className="text-[10px] font-black tracking-widest uppercase leading-none block mb-0.5 text-slate-500">
                  {movementSession.isPaused ? "ПАУЗА" : "АКТИВНО"}
                </span>
                <span className="text-[18px] font-black font-mono leading-none text-slate-800">
                  {Math.floor(activityElapsedTime / 60).toString().padStart(2, "0")}:
                  {(activityElapsedTime % 60).toString().padStart(2, "0")}
                </span>
              </div>

              <div className="flex gap-3 shrink-0 ml-1 items-center">
                {movementSession.isPaused ? (
                  <button 
                    onClick={resumeMovementActivity}
                    className="flex items-center justify-center text-emerald-600 hover:text-emerald-700 active:scale-90 transition-all"
                  >
                    <Play className="w-8 h-8 fill-current" />
                  </button>
                ) : (
                  <button 
                    onClick={pauseMovementActivity}
                    className="flex items-center justify-center text-slate-600 hover:text-slate-700 active:scale-90 transition-all"
                  >
                    <Pause className="w-8 h-8 fill-current" />
                  </button>
                )}
                
                <button 
                  onClick={(e) => { e.stopPropagation(); stopMovementActivity(); }}
                  className="flex items-center justify-center text-rose-600 hover:text-rose-700 active:scale-90 transition-all"
                >
                  <Square className="w-8 h-8 fill-current" />
                </button>
              </div>
            </motion.div>
          </div>
        )})()}
      </AnimatePresence>

      {/* 12. DETAILED SUMMARY OF COMPLETED SESSION POPUP MODAL */}
      <AnimatePresence>
        {showMovementSummaryCompleted && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-6 z-[67]" id="movement-completed-summary-modal">
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              className="bg-white rounded-[32px] border border-gray-100 p-5.5 w-full max-w-[325px] text-center shadow-[0_22px_60px_rgba(0,0,0,0.18)] flex flex-col gap-4 text-slate-800 text-left"
            >
              <div className="flex flex-col gap-1 text-center items-center">
                <div className="w-20 h-20 justify-self-center my-1 select-none animate-bounce">
                  <img src={getMovementAssetPath(showMovementSummaryCompleted.activityType, userGender)} alt="Успех" className="w-full h-full object-contain" />
                </div>
                <span className="text-[11px] font-extrabold text-indigo-600 tracking-widest uppercase mt-1">ОТЛИЧНАЯ ТРЕНИРОВКА!</span>
                <h3 className="text-[19px] font-black text-slate-800 leading-tight" style={{ fontFamily: '"Calibri", sans-serif' }}>
                  {showMovementSummaryCompleted.activityType} завершена!
                </h3>
              </div>

              {/* Key numbers metrics */}
              <div className="grid grid-cols-2 gap-2.5 bg-indigo-50/40 p-3 rounded-2xl border border-indigo-100/30">
                <div className="text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">Время сессии</span>
                  <span className="text-[18px] font-black text-indigo-950 font-mono">
                    {Math.floor(showMovementSummaryCompleted.durationSeconds / 60)}м {showMovementSummaryCompleted.durationSeconds % 60}с
                  </span>
                </div>
                <div className="text-center border-l border-indigo-100/60">
                  <span className="text-[10px] text-slate-500 font-bold block">Вклад в прогресс</span>
                  <span className="text-[18px] font-extrabold text-emerald-600 font-mono">
                    +{showMovementSummaryCompleted.pointsEarned} {getPlural(showMovementSummaryCompleted.pointsEarned, ['балл', 'балла', 'баллов'])}
                  </span>
                </div>
              </div>

              {/* Rich customizable WFPB educational longevity advice tip */}
              <div className="text-[12.5px] leading-relaxed text-slate-600 bg-[#FAF9FD] rounded-xl p-3 border border-slate-100 relative">
                <span className="text-indigo-500 font-extrabold block mb-0.5">🌿 Влияние на организм:</span>
                {(() => {
                  const act = showMovementSummaryCompleted.activityType;
                  if (act.includes("Прогулка")) {
                    return "Прогулка без избыточной соли предотвращает задержку жидкости, ускоряет венозный возврат и активирует естественный лимфодренаж клеток.";
                  }
                  if (act.includes("Растяжка") || act.includes("Йога")) {
                    return "Мягкое вытяжение сухожилий снимает спазмы кровеносных сосудов. На чистом растительном рационе ткани получают максимум кислорода без закисления.";
                  }
                  if (act.includes("Зарядка")) {
                    return "Утренняя зарядка мгновенно пробуждает клетки печени к утилизации свободных жирных кислот, даруя поразительную чистоту ума без кофеина.";
                  }
                  if (act.includes("Кардио")) {
                    return "Аэробная работа активно тренирует эластичность артерий. Кровь омывает ткани легко и быстро, унося остатки метаболического мусора.";
                  }
                  if (act.includes("Силовая")) {
                    return "Силовая нагрузка активирует чувствительность миофибрилл к инсулину, гарантируя, что углеводы составят полезный гликоген мышц.";
                  }
                  if (act.includes("Велосипед")) {
                    return "Циклическое движение коленей бережно стимулирует выработку суставной жидкости, поддерживая хрящи и суставы в идеальном легком состоянии.";
                  }
                  if (act.includes("Танцы")) {
                    return "Ритмические ускорения насыщают клетки эндорфинами, синхронизируют нервные импульсы и активно стимулируют капиллярное русло.";
                  }
                  if (act.includes("Мобилити")) {
                    return "Проработка суставных осей эффективно освобождает лимфатические протоки, поддерживая глубокую детоксикацию твоего тела.";
                  }
                  return "Каждая минута осознанной физической активности бережно снижает уровень воспалительных цитокинов и заряжает митохондрии чистой энергией!";
                })()}
              </div>

              <button
                type="button"
                onClick={() => setShowMovementSummaryCompleted(null)}
                className="w-full py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:brightness-105 text-white font-extrabold rounded-2xl text-[14px] shadow-md transition-all cursor-pointer active:scale-97 text-center"
              >
                Отлично, в журнал!
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. FAST MEASUREMENTS SLOT SHEET */}
      <AnimatePresence>
        {showFastMeasurements && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-[65] px-5 py-6" id="fast-measurements-sheet-overlay">
            {/* Backdrop click to dismiss */}
            <div className="absolute inset-0 z-0" onClick={() => setShowFastMeasurements(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white rounded-[32px] w-full max-w-[420px] p-5 text-left border border-slate-100 shadow-[0_-15px_35px_rgba(0,0,0,0.12)] relative z-10 max-h-[92%] overflow-y-auto scrollbar-none flex flex-col gap-3 text-slate-800"
            >
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[11px] font-black text-emerald-600 tracking-wider uppercase block mb-0.5">ВЫБОР СОСТОЯНИЯ</span>
                  <h3 className="text-[20px] font-black text-slate-850" style={{ fontFamily: '"Calibri", sans-serif' }}>Замеры организма</h3>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowFastMeasurements(false)} 
                  className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100/60 flex items-center justify-center text-emerald-500 hover:bg-emerald-100 active:scale-90 transition-all text-xs font-bold font-mono"
                >
                  ✕
                </button>
              </div>

              {/* 1. Энергия / Настроение / Самочувствие — циклические 2D-миниатюры */}
              <div className="flex flex-row justify-around items-start bg-emerald-50/50 rounded-2xl p-2">
                {[
                  { title: "ЭНЕРГИЯ", states: ENERGY_STATES, current: fastEnergy, onClick: cycleEnergy },
                  { title: "НАСТРОЕНИЕ", states: MOOD_STATES, current: fastMood, onClick: cycleMood },
                  { title: "САМОЧУВСТВИЕ", states: WELLBEING_STATES, current: fastWellbeing, onClick: cycleWellbeing }
                ].map(cat => {
                  const state = cat.states[cat.current];
                  return (
                    <button
                      key={cat.title}
                      type="button"
                      onClick={cat.onClick}
                      className="flex flex-col items-center gap-0.5 cursor-pointer bg-transparent border-0 outline-none"
                    >
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">{cat.title}</span>
                      <img
                        src={state.img}
                        alt={state.label}
                        className="w-20 h-20 object-contain select-none pointer-events-none"
                        draggable={false}
                      />
                      <span className="text-[11px] font-extrabold text-slate-700">{state.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* 2. Пульс, Вес, Давление — крупные степперы с удержанием */}
              <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3">

                {/* Pulse */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Пульс (ЧСС)</span>
                  <div className="flex items-center justify-center gap-4 select-none">
                    <HoldStepperButton
                      disabled={fastPulse <= 40}
                      onStep={() => setFastPulse(prev => Math.max(40, prev - 1))}
                      className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center text-slate-700 active:scale-90 hover:border-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-6 h-6" />
                    </HoldStepperButton>
                    <div className="flex flex-col items-center min-w-[90px]">
                      <span className="font-mono font-bold text-3xl text-slate-800">{fastPulse}</span>
                      <span className="text-[9px] font-extrabold text-slate-400 leading-none">уд/мин</span>
                    </div>
                    <HoldStepperButton
                      disabled={fastPulse >= 180}
                      onStep={() => setFastPulse(prev => Math.min(180, prev + 1))}
                      className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center text-slate-700 active:scale-90 hover:border-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-6 h-6" />
                    </HoldStepperButton>
                  </div>
                </div>

                {/* Weight */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Вес (кг)</span>
                  <div className="flex items-center justify-center gap-4 select-none">
                    <HoldStepperButton
                      disabled={fastWeight <= 30}
                      onStep={() => setFastWeight(prev => Math.max(30, Number((prev - 0.1).toFixed(1))))}
                      className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center text-slate-700 active:scale-90 hover:border-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-6 h-6" />
                    </HoldStepperButton>
                    <div className="flex flex-col items-center min-w-[90px]">
                      <span className="font-mono font-bold text-3xl text-slate-800">{fastWeight.toFixed(1)}</span>
                      <span className="text-[9px] font-extrabold text-slate-400 leading-none">кг</span>
                    </div>
                    <HoldStepperButton
                      disabled={fastWeight >= 250}
                      onStep={() => setFastWeight(prev => Math.min(250, Number((prev + 0.1).toFixed(1))))}
                      className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center text-slate-700 active:scale-90 hover:border-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-6 h-6" />
                    </HoldStepperButton>
                  </div>
                </div>

                {/* Systolic */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Верхнее давление (систола)</span>
                  <div className="flex items-center justify-center gap-4 select-none">
                    <HoldStepperButton
                      disabled={fastSystolic <= 60}
                      onStep={() => setFastSystolic(prev => Math.max(60, prev - 1))}
                      className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center text-slate-700 active:scale-90 hover:border-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-6 h-6" />
                    </HoldStepperButton>
                    <div className="flex flex-col items-center min-w-[90px]">
                      <span className="font-mono font-bold text-3xl text-slate-800">{fastSystolic}</span>
                      <span className="text-[9px] font-extrabold text-slate-400 leading-none">мм рт.ст.</span>
                    </div>
                    <HoldStepperButton
                      disabled={fastSystolic >= 220}
                      onStep={() => setFastSystolic(prev => Math.min(220, prev + 1))}
                      className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center text-slate-700 active:scale-90 hover:border-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-6 h-6" />
                    </HoldStepperButton>
                  </div>
                </div>

                {/* Diastolic */}
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Нижнее давление (диастола)</span>
                  <div className="flex items-center justify-center gap-4 select-none">
                    <HoldStepperButton
                      disabled={fastDiastolic <= 30}
                      onStep={() => setFastDiastolic(prev => Math.max(30, prev - 1))}
                      className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center text-slate-700 active:scale-90 hover:border-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-6 h-6" />
                    </HoldStepperButton>
                    <div className="flex flex-col items-center min-w-[90px]">
                      <span className="font-mono font-bold text-3xl text-slate-800">{fastDiastolic}</span>
                      <span className="text-[9px] font-extrabold text-slate-400 leading-none">мм рт.ст.</span>
                    </div>
                    <HoldStepperButton
                      disabled={fastDiastolic >= 140}
                      onStep={() => setFastDiastolic(prev => Math.min(140, prev + 1))}
                      className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-200 shadow-sm flex items-center justify-center text-slate-700 active:scale-90 hover:border-emerald-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-6 h-6" />
                    </HoldStepperButton>
                  </div>
                </div>

              </div>

              {/* Status and warnings info box inside sheet */}
              <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100/60 text-[11.5px] leading-relaxed text-emerald-800 font-bold">
                💡 {getDailyMeasurementTip()}
              </div>

              {/* Large glorious Save trigger and cancel button */}
              <div className="flex gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setShowFastMeasurements(false)}
                  className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-[14px] transition-all cursor-pointer active:scale-97 text-center"
                >
                  Отмена
                </button>

                <button
                  type="button"
                  onClick={submitFastMeasurement}
                  className="flex-[2] py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl text-[15px] transition-all cursor-pointer active:scale-97 flex items-center justify-center"
                >
                  Записать замер
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* 21. DIARY (ДНЕВНИК) EXPANDED BOTTOM SHEET OVERLAY */}
      <AnimatePresence>
        {showDiarySheet && (
          <div className="absolute inset-0 z-[65] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A] pointer-events-auto"
              onClick={() => setShowDiarySheet(false)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-white rounded-t-[36px] shadow-[0_-12px_40px_rgba(15,23,42,0.18)] border-t border-slate-100 p-6 flex flex-col text-left pointer-events-auto z-50 max-h-[90%] overflow-y-auto scrollbar-none"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                  <span className="text-[12px] font-extrabold text-[#0288D1] uppercase tracking-widest leading-none font-sans">ДНЕВНИК ЗДОРОВЬЯ</span>
                  <h3 className="text-[19px] font-black text-text-dark font-sans tracking-tight mt-1">Осознанность • День {currentDayIndex}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDiarySheet(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-90 font-bold transition-transform cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Emotional/state selector pills */}
              <div className="mb-4">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2 font-sans">ЭМОЦИОНАЛЬНОЕ СОСТОЯНИЕ</span>
                <div className="flex flex-wrap gap-2">
                  {["😊 Дзен", "🌟 Поток", "🧘 Спокойствие", "🍃 Чистота", "⚡ Энергия"].map(mood => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setDiaryInputText(p => p ? `${mood} • ${p}` : `${mood} • `)}
                      className="text-[11.5px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-100/60 hover:border-slate-200 px-3 py-1.5 rounded-full cursor-pointer transition-all active:scale-95 font-sans"
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text input area */}
              <div className="mb-4">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2 font-sans">НОВАЯ ЗАПИСЬ В ДНЕВНИК</span>
                <textarea
                  value={diaryInputText}
                  onChange={(e) => setDiaryInputText(e.target.value)}
                  placeholder="Опишите ваши ощущения... Например: Лёгкость в теле отличная, энергии много, кушал сытные WFPB блюда без грамма соли. Настрой дзен! 🌱"
                  rows={4}
                  className="w-full text-[13.5px] font-bold leading-relaxed text-slate-700 bg-slate-50 border border-slate-100 rounded-2xl p-3.5 focus:outline-none focus:ring-2 focus:ring-[#0288D1]/20 focus:bg-white focus:border-[#0288D1] transition-all placeholder:text-slate-400/85 font-sans shadow-[inset_0_1.5px_3px_rgba(0,0,0,0.02)]"
                />
              </div>

              {/* Past entries block */}
              <div className="mb-5 max-h-[160px] overflow-y-auto pr-1 scrollbar-none">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2 font-sans">ЗАПИСИ ЗА СЕГОДНЯ</span>
                {dayNotes[currentDayIndex] && dayNotes[currentDayIndex].length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {dayNotes[currentDayIndex].map((note, idx) => (
                      <div key={idx} className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl text-[12.5px] text-slate-600 leading-normal">
                        <div className="flex justify-between items-center mb-1 text-[10px] text-slate-400 font-extrabold uppercase font-sans">
                          <span>ЗАПИСЬ #{idx+1}</span>
                          <span>{note.time}</span>
                        </div>
                        <p className="font-bold text-slate-700 font-sans whitespace-pre-wrap">{note.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] text-slate-400/80 italic font-sans font-medium">Сегодня вы ещё не делали записей в Дневник Здоровья. Начните прямо сейчас!</span>
                )}
              </div>

              {/* Submit / Cancel row */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDiarySheet(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2.5xl text-[14px] transition-all cursor-pointer active:scale-97 text-center font-sans"
                >
                  Отмена
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!diaryInputText.trim()) return;
                    const timeStr = formatTimeHM(new Date().toISOString(), getUserTimeZone());

                    const updatedNotes = { ...dayNotes };
                    if (!updatedNotes[currentDayIndex]) {
                      updatedNotes[currentDayIndex] = [];
                    }
                    updatedNotes[currentDayIndex].push({
                      text: diaryInputText.trim(),
                      time: timeStr
                    });
                    setDayNotes(updatedNotes);

                    setDiaryInputText("");
                    recordClick(15);
                    setShowDiarySheet(false);
                    
                    // Show a quick custom friendly confirmation toast through simple local state
                    setActiveNotification({
                      text: "Ваша дзен-запись успешно внесена в дневник здоровья и календарь! 🌱",
                      type: "success"
                    });
                    setTimeout(() => {
                      setActiveNotification(null);
                    }, 4000);
                  }}
                  disabled={!diaryInputText.trim()}
                  className="flex-[2] py-3 bg-gradient-to-r from-[#0288D1] to-[#01579B]/90 hover:brightness-105 disabled:opacity-50 text-white font-bold rounded-2.5xl text-[14px] shadow-[0_5px_15px_rgba(2,136,209,0.25)] transition-all cursor-pointer active:scale-97 flex items-center justify-center gap-1.5 font-sans"
                >
                  <span>Записать в дневник</span>
                  <span className="text-[17px]">📝</span>
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 22. STATE NOW (СОСТОЯНИЕ СЕЙЧАС) EXPANDED BOTTOM SHEET OVERLAY */}
      <AnimatePresence>
        {showStateNowSheet && (
          <div className="absolute inset-0 z-[65] flex items-end justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#0F172A] pointer-events-auto"
              onClick={() => setShowStateNowSheet(false)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-md bg-white rounded-t-[36px] shadow-[0_-12px_40px_rgba(15,23,42,0.18)] border-t border-slate-100 p-6 flex flex-col text-left pointer-events-auto z-50 max-h-[90%] overflow-y-auto scrollbar-none"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

              <div className="flex justify-between items-center mb-4">
                <div className="flex flex-col">
                  <span className="text-[12px] font-extrabold text-[#4E5664] uppercase tracking-widest leading-none font-sans">СОСТОЯНИЕ СЕЙЧАС</span>
                  <h3 className="text-[19px] font-black text-text-dark font-sans tracking-tight mt-1">Оценить жизненный баланс</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowStateNowSheet(false)}
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-90 font-bold transition-transform cursor-pointer"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Wellbeing slider */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] font-extrabold text-slate-500 font-sans uppercase">Психологический дзен: {ratingWellbeing}/5</span>
                  <span className="text-[13px] font-bold text-slate-400 select-none">🕊️</span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRatingWellbeing(val)}
                      className={`flex-1 py-1.5 font-sans font-bold text-[13.5px] rounded-xl border transition-all cursor-pointer ${
                        ratingWellbeing === val 
                          ? "bg-slate-800 border-slate-800 text-white shadow-xs scale-102" 
                          : "bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Energy slider */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] font-extrabold text-slate-500 font-sans uppercase">Физическая энергия: {ratingEnergy}/5</span>
                  <span className="text-[13px] font-bold text-slate-400 select-none">⚡</span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRatingEnergy(val)}
                      className={`flex-1 py-1.5 font-sans font-bold text-[13.5px] rounded-xl border transition-all cursor-pointer ${
                        ratingEnergy === val 
                          ? "bg-emerald-600 border-emerald-650 text-white shadow-xs scale-102" 
                          : "bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lightness slider */}
              <div className="mb-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[12px] font-extrabold text-slate-500 font-sans uppercase">Ощущение лёгкости: {ratingLightness}/5</span>
                  <span className="text-[13px] font-bold text-slate-400 select-none">🍃</span>
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setRatingLightness(val)}
                      className={`flex-1 py-1.5 font-sans font-bold text-[13.5px] rounded-xl border transition-all cursor-pointer ${
                        ratingLightness === val 
                          ? "bg-orange-500 border-orange-550 text-white shadow-xs scale-102" 
                          : "bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Informative advice note */}
              <div className="bg-[#FAF5FF] border border-[#F3E8FF] text-[#6B21A8] text-[12px] font-medium leading-relaxed p-3.5 rounded-2xl flex items-start gap-2 mb-6">
                <span className="text-[18px] leading-none shrink-0 select-none">🌿</span>
                <div className="font-sans font-medium text-[12.5px] leading-relaxed">
                  Баланс цельного питания без добавленной соли гарантирует превосходную лёгкость в органах пищеварения и оптимальный метаболизм.
                </div>
              </div>

              {/* Submit Row */}
              <button
                type="button"
                onClick={() => {
                  const timeStr = formatTimeHM(new Date().toISOString(), getUserTimeZone());

                  const textEntry = `🧘 Зафиксировано состояние [${timeStr}]:\n• Дзен-состояние: ${ratingWellbeing}/5\n• Энергия: ${ratingEnergy}/5\n• Ощущение лёгкости: ${ratingLightness}/5\nРацион WFPB без соли дарит максимальный комфорт.`;
                  
                  const updatedNotes = { ...dayNotes };
                  if (!updatedNotes[currentDayIndex]) {
                    updatedNotes[currentDayIndex] = [];
                  }
                  updatedNotes[currentDayIndex].push({
                    text: textEntry,
                    time: timeStr
                  });
                  setDayNotes(updatedNotes);

                  recordClick(20);
                  setShowStateNowSheet(false);

                  setActiveNotification({
                    text: "Ваше состояние успешно зафиксировано! Запись добавлена в общий календарь здоровья. 🌱",
                    type: "success"
                  });
                  setTimeout(() => {
                    setActiveNotification(null);
                  }, 4000);
                }}
                className="w-full py-3.5 bg-gradient-to-b from-[#4E5664] via-[#353D4A] to-[#1F252E] hover:brightness-105 text-white font-bold rounded-2.5xl text-[14px] shadow-[0_5px_15px_rgba(53,61,74,0.25)] transition-all cursor-pointer active:scale-97 text-center font-sans"
              >
                Зафиксировать баланс
              </button>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
