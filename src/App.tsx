import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mic, Send } from "lucide-react";
import { SpeechToTextSession } from "./utils/speechToText";
import { useAppStore } from "./store/useAppStore";
import { useNotificationEngine } from "./services/useNotificationEngine";
import GlobalNotificationOverlay from "./components/GlobalNotificationOverlay";
import { api } from "./utils/api";
import GlassRing from "./components/GlassRing";
import StartButton from "./components/StartButton";
import BottomBar from "./components/BottomBar";

import MyPageScreen from "./components/MyPageScreen";
import DigestionScreen from "./components/DigestionScreen";
import MyDayScreen from "./components/MyDayScreen";
import HabitsTwentyScreen from "./components/HabitsTwentyScreen";
import WhatIEatScreen from "./components/WhatIEatScreen";
import CheckCompositionScreen from "./components/CheckCompositionScreen";
import DishAnalysisScreen from "./components/DishAnalysisScreen";
import CalendarOverlay from "./components/CalendarOverlay";
import RecipesScreen from "./components/RecipesScreen";
import type { SavedDish } from "./components/MyDishesScreen";
import FromWhatIsScreen from "./components/FromWhatIsScreen";
import BookRecipesScreen from "./components/BookRecipesScreen";
import MyPurchasesScreen from "./components/MyPurchasesScreen";
import MyDiaryScreen from "./components/MyDiaryScreen";
import { HabitsState } from "./types";
import AnnaScreen from "./components/AnnaScreen";
import StateNowScreen from "./components/StateNowScreen";
import SettingsScreen from "./components/SettingsScreen";
import { SystemKeysStore } from "./services/SystemKeysStore";
import {
  initializeAchievementSystem,
  ingestAchievementEvent,
  getUnlockedAchievementIds,
  isGodModeEnabled,
  AchievementOverlay,
  MyRewardsScreen,
} from "./modules/achievements";
import type { AchievementStateSnapshot } from "./modules/achievements";
import type { MixerConfig } from "./modules/mixer/types/mixer.types";
import MixerScreen from "./modules/mixer/screens/MixerScreen";
import ErrorBoundary from "./components/ErrorBoundary";

import { getCategoryColor } from "./utils/categoryColors";
import { resolveGeneralAvatar, resolveAvatarByState } from "./utils/annaAvatarResolver";
import { getBookMacros } from "./utils/bookMacros";
import {
  BREAKFAST_RECIPES,
  LUNCH_RECIPES,
  DINNER_RECIPES,
  MUST_HAVE_RECIPES,
  COMPLIMENTS_RECIPES,
  RECIPE_OF_DAY_RECIPES,
  DRINKS_RECIPES,
} from "./components/BookRecipesScreen";
import { getFoodProfile, parseWeightGrams } from "./services/DailyNutritionStore";
import AchievementsDebugPanel from "./components/AchievementsDebugPanel";

const RECIPE_TYPE_TO_ARRAY: Record<string, any[]> = {
  breakfast: BREAKFAST_RECIPES,
  lunch: LUNCH_RECIPES,
  dinner: DINNER_RECIPES,
  must_have: MUST_HAVE_RECIPES,
  compliment: COMPLIMENTS_RECIPES,
  recipe_of_day: RECIPE_OF_DAY_RECIPES,
  drinks: DRINKS_RECIPES,
};

function getAnnaBubbleStyle(currentScreen: string) {
  switch (currentScreen) {
    case "personal-data":
      return {
        bg: "bg-slate-50/90 backdrop-blur-md",
        border: "border-slate-350/40 shadow-[0_4px_16px_rgba(100,116,139,0.06)]",
        text: "text-slate-800",
        title: "Личные данные 📊",
        iconColor: "text-slate-500",
        badgeBg: "bg-slate-100 text-slate-600 border-slate-200"
      };
    case "health-goals":
      return {
        bg: "bg-emerald-50/90 backdrop-blur-md",
        border: "border-[#A7F3D0]/60 shadow-[0_4px_16px_rgba(16,185,129,0.06)]",
        text: "text-emerald-900",
        title: "Цели здоровья 🎯",
        iconColor: "text-emerald-650",
        badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200"
      };
    case "my-page":
      return {
        bg: "bg-slate-50/95 backdrop-blur-md",
        border: "border-slate-300/40 shadow-[0_4px_16px_rgba(100,116,139,0.06)]",
        text: "text-slate-800",
        title: "Мой аккаунт 👤",
        iconColor: "text-slate-500",
        badgeBg: "bg-slate-100 text-slate-600 border-slate-200"
      };
    case "digestion":
      return {
        bg: "bg-orange-50/90 backdrop-blur-md",
        border: "border-[#FED7AA]/60 shadow-[0_4px_16px_rgba(249,115,22,0.06)]",
        text: "text-orange-950",
        title: "Пищеварение 🍏",
        iconColor: "text-orange-500",
        badgeBg: "bg-orange-100 text-orange-850 border-orange-200"
      };
    case "habits-twenty":
      return {
        bg: "bg-teal-50/90 backdrop-blur-md",
        border: "border-[#99F6E4]/60 shadow-[0_4px_16px_rgba(13,148,136,0.06)]",
        text: "text-teal-950",
        title: "Полезная 20-ка 🌿",
        iconColor: "text-teal-600",
        badgeBg: "bg-teal-100 text-teal-850 border-teal-200"
      };
    case "what-i-eat":
      return {
        bg: "bg-amber-50/90 backdrop-blur-md",
        border: "border-[#FDE68A]/60 shadow-[0_4px_16px_rgba(245,158,11,0.06)]",
        text: "text-amber-950",
        title: "Дневник тарелки 🥗",
        iconColor: "text-amber-600",
        badgeBg: "bg-amber-100 text-amber-800 border-amber-200"
      };
    case "check-composition":
      return {
        bg: "bg-indigo-50/90 backdrop-blur-md",
        border: "border-[#C7D2FE]/60 shadow-[0_4px_16px_rgba(99,102,241,0.06)]",
        text: "text-indigo-950",
        title: "Проверка состава 🔬",
        iconColor: "text-indigo-600",
        badgeBg: "bg-indigo-100 text-indigo-850 border-indigo-200"
      };
    case "dish-analysis":
      return {
        bg: "bg-lime-50/90 backdrop-blur-md",
        border: "border-[#D9F99D]/60 shadow-[0_4px_16px_rgba(132,204,22,0.06)]",
        text: "text-lime-950",
        title: "Анализатор блюда 🔍",
        iconColor: "text-lime-700",
        badgeBg: "bg-lime-100 text-lime-850 border-lime-200"
      };
    case "my-dishes":
      return {
        bg: "bg-rose-50/90 backdrop-blur-md",
        border: "border-[#FECDD3]/60 shadow-[0_4px_16px_rgba(244,63,94,0.06)]",
        text: "text-rose-950",
        title: "Мои рецепты 🍲",
        iconColor: "text-rose-600",
        badgeBg: "bg-rose-100 text-rose-850 border-rose-200"
      };
    case "from-what-is":
      return {
        bg: "bg-yellow-50/90 backdrop-blur-md",
        border: "border-[#FDE047]/60 shadow-[0_4px_16px_rgba(234,179,8,0.06)]",
        text: "text-yellow-950",
        title: "Готовим из холодильника 🍅",
        iconColor: "text-yellow-600",
        badgeBg: "bg-yellow-100 text-yellow-850 border-yellow-200"
      };
    case "book-recipes":
      return {
        bg: "bg-sky-50/90 backdrop-blur-md",
        border: "border-[#BAE6FD]/60 shadow-[0_4px_16px_rgba(14,165,233,0.06)]",
        text: "text-sky-950",
        title: "Рецепты долголетия 📖",
        iconColor: "text-sky-600",
        badgeBg: "bg-sky-100 text-sky-850 border-sky-200"
      };
    case "purchases":
      return {
        bg: "bg-purple-50/90 backdrop-blur-md",
        border: "border-[#E9D5FF]/60 shadow-[0_4px_16px_rgba(168,85,247,0.06)]",
        text: "text-purple-950",
        title: "Список покупок 🛒",
        iconColor: "text-purple-650",
        badgeBg: "bg-purple-100 text-purple-850 border-purple-200"
      };
    case "diary":
      return {
        bg: "bg-rose-50/90 backdrop-blur-md",
        border: "border-[#FECDD3]/60 shadow-[0_4px_16px_rgba(244,63,94,0.06)]",
        text: "text-rose-950",
        title: "Дневник замеров 📈",
        iconColor: "text-rose-600",
        badgeBg: "bg-rose-100 text-rose-850 border-[#FECDD3]"
      };
    default:
      return {
        bg: "bg-[#FAFAF9]/95 backdrop-blur-md",
        border: "border-stone-250 shadow-[0_4px_16px_rgba(120,113,108,0.06)]",
        text: "text-stone-800",
        title: "Куратор Анна 💚",
        iconColor: "text-brand-green-dark",
        badgeBg: "bg-stone-100 text-stone-700 border-stone-200"
      };
  }
}

export default function App() {
  useNotificationEngine(); // Run global notifications
  
  console.log("App.tsx is rendering!");
  const screen = useAppStore((s) => s.screen);
  console.log("Current screen is:", screen);
  const setScreen = useAppStore((s) => s.setScreen);
  const buildVersion = "Beta_12.1";
  const annaAvatarSrc = resolveGeneralAvatar().src;

  const [selectedChronic, setSelectedChronic] = useState<string[]>([]);

  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);

  // Elevated personal data state
  const [userName, setUserName] = useState("");

  const [userGender, setUserGender] = useState<"female" | "male">("female");

  const [age, setAge] = useState<number>(28);

  const [height, setHeight] = useState<number>(165);

  const [weight, setWeight] = useState<number>(50);

  const [systolic, setSystolic] = useState<number>(120);

  const [diastolic, setDiastolic] = useState<number>(80);

  const [initialAge, setInitialAge] = useState<number>(28);

  const [initialHeight, setInitialHeight] = useState<number>(165);

  const [initialWeight, setInitialWeight] = useState<number>(50);

  const [initialSystolic, setInitialSystolic] = useState<number>(120);

  const [initialDiastolic, setInitialDiastolic] = useState<number>(80);

  // ONBOARDING update functions (primary start inputs)
  const updateUserNameFromOnboarding = (val: string) => {
    setUserName(val);
  };

  const updateUserGenderFromOnboarding = (val: "female" | "male") => {
    setUserGender(val);
  };

  const updateAgeFromOnboarding = (val: number | ((prev: number) => number)) => {
    setAge(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      setInitialAge(next);
      return next;
    });
  };

  const updateHeightFromOnboarding = (val: number | ((prev: number) => number)) => {
    setHeight(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      setInitialHeight(next);
      return next;
    });
  };

  const updateWeightFromOnboarding = (val: number | ((prev: number) => number)) => {
    setWeight(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      setInitialWeight(next);
      return next;
    });
  };

  const updateSystolicFromOnboarding = (val: number | ((prev: number) => number)) => {
    setSystolic(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      setInitialSystolic(next);
      return next;
    });
  };

  const updateDiastolicFromOnboarding = (val: number | ((prev: number) => number)) => {
    setDiastolic(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      setInitialDiastolic(next);
      return next;
    });
  };

  const updateChronicFromOnboarding = (val: string[] | ((prev: string[]) => string[])) => {
    setSelectedChronic(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const updateGoalsFromOnboarding = (val: string[] | ((prev: string[]) => string[])) => {
    setSelectedGoals(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  // SETTINGS update functions (high priority source of truth)
  const updateUserNameFromSettings = (val: string) => {
    setUserName(val);
  };

  const updateUserGenderFromSettings = (val: "female" | "male") => {
    setUserGender(val);
  };

  const updateAgeFromSettings = (val: number | ((prev: number) => number)) => {
    setAge(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const updateHeightFromSettings = (val: number | ((prev: number) => number)) => {
    setHeight(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const updateWeightFromSettings = (val: number | ((prev: number) => number)) => {
    setWeight(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const updateSystolicFromSettings = (val: number | ((prev: number) => number)) => {
    setSystolic(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const updateDiastolicFromSettings = (val: number | ((prev: number) => number)) => {
    setDiastolic(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const updateChronicFromSettings = (val: string[] | ((prev: string[]) => string[])) => {
    setSelectedChronic(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const updateGoalsFromSettings = (val: string[] | ((prev: string[]) => string[])) => {
    setSelectedGoals(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  // UNIFIED setters for general diary logging (respects currently active keys)
  const handleUpdateWeight = (val: number | ((prev: number) => number)) => {
    setWeight(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const handleUpdateSystolic = (val: number | ((prev: number) => number)) => {
    setSystolic(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const handleUpdateDiastolic = (val: number | ((prev: number) => number)) => {
    setDiastolic(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  // Elevated states for MyDayScreen to persist data across transitions
  const [water, setWater] = useState<number>(0); // in ml, max 2500ml
  const [sleep, setSleep] = useState<number>(0); // in minutes, max 480min
  const [mealCount, setMealCount] = useState<number>(0); // completed meals out of 4
  const [clickCount, setClickCount] = useState<number>(0);
  const [habitsDone, setHabitsDone] = useState<number>(0);

  // Elevated rating states for general bioenergy and zen
  const [ratingWellbeing, setRatingWellbeing] = useState<number>(5);

  const [ratingEnergy, setRatingEnergy] = useState<number>(5);

  const [ratingLightness, setRatingLightness] = useState<number>(5);

  const handleSetRatingWellbeing = (val: number | ((prev: number) => number)) => {
    setRatingWellbeing(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const handleSetRatingEnergy = (val: number | ((prev: number) => number)) => {
    setRatingEnergy(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const handleSetRatingLightness = (val: number | ((prev: number) => number)) => {
    setRatingLightness(prev => {
      const next = typeof val === "function" ? val(prev) : val;
      return next;
    });
  };

  const [customMealIngredients, setCustomMealIngredients] = useState<any[] | null>(null);
  const [currentMealImage, setCurrentMealImage] = useState<string | null>(null);

  const [meals, setMeals] = useState<{ id: string; name: string; checked: boolean }[]>([
    { id: "breakfast", name: "Завтрак (Зелёный смузи)", checked: false },
    { id: "lunch", name: "Обед (Салат с нутом и авокадо)", checked: false },
    { id: "dinner", name: "Ужин (Тушёные овощи с киноа)", checked: false },
    { id: "snack", name: "Перекус (Горсть миндаля и яблоко)", checked: false },
  ]);

  const [habits, setHabits] = useState([
    { id: "no_sugar", name: "Без сахара", done: false },
    { id: "no_salt", name: "Без соли 🌿", done: false }, // WFPB core requirement
    { id: "greens", name: "Зелень в рационе", done: false },
    { id: "active", name: "30 мин активности", done: false },
  ]);

  const [mixerConfig, setMixerConfig] = useState<MixerConfig | null>(null);

  const [currentDayIndex, setCurrentDayIndex] = useState<number>(1);
  const [viewingDayIndex, setViewingDayIndex] = useState<number | null>(null);

  const activeDayIndex = viewingDayIndex ?? currentDayIndex;
  const isReadOnly = viewingDayIndex !== null && viewingDayIndex < currentDayIndex;

  const [dayNotes, setDayNotes] = useState<Record<number, { text: string; time: string; [key: string]: any }[]>>({});
  const isCalendarOpen = useAppStore((s) => s.isCalendarOpen);
  const setCalendarOpen = useAppStore((s) => s.setCalendarOpen);

  // Dynamic state container for HabitsTwenty screen checked circles data
  const [habitsTwentyData, setHabitsTwentyData] = useState<HabitsState | undefined>(undefined);

  // Init achievement subsystem + App store (device ID, profile sync)
  useEffect(() => {
    (async () => {
      await useAppStore.getState().initApp();

      try {
        // Init course day from server (auto-advances based on calendar date)
        const initData = await api<any>("/api/user/init");
        setCurrentDayIndex(initData.currentDayIndex);

        const data = await api<any>("/api/user/data");
        console.log("[Init] profile:", data.profile?.name || "—", "dishes:", data.savedDishes?.length, "diary:", data.diary?.length, "progress:", data.recipeProgress?.length);

        if (data.profile?.hasSavedSettings) {
          useAppStore.getState().setScreen("my-day");
        }

        if (data.savedDishes?.length > 0) {
          setSavedDishes(prev => {
            const existingIds = new Set(prev.map(d => d.id));
            const newDishes = data.savedDishes
              .filter((d: any) => !existingIds.has(d.id))
              .map((d: any) => ({
                id: d.id,
                name: d.name,
                time: d.createdAt ? new Date(d.createdAt).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" }) : "",
                tag: d.tag || "",
                category: d.category || "Основные блюда",
                image: d.image || "",
                isFavorite: d.isFavorite || false,
                isNew: d.isNew !== false,
                createdAt: d.createdAt || new Date().toISOString(),
                ingredients: d.ingredients || [],
                calories: d.calories || 0,
                protein: d.protein || "",
                fiber: d.fiber || "",
                fat: d.fat || "",
                annaTip: d.annaTip || "",
                isBookRecipe: d.isBookRecipe || false,
                dayIndex: d.dayIndex ?? undefined,
                bookRecipeRef: d.bookRecipeType ? { type: d.bookRecipeType, id: d.bookRecipeId, technicalName: "", emotionalName: "" } : undefined,
              } as SavedDish));
            return [...newDishes, ...prev];
          });
        }

        if (data.diary?.length > 0) {
          setDayNotes(prev => {
            const next = { ...prev };
            for (const entry of data.diary) {
              const dayIdx = entry.dayIndex ?? 0;
              if (!next[dayIdx]) next[dayIdx] = [];
              const exists = next[dayIdx].some((n: any) => n.id === entry.id);
              if (!exists) {
                next[dayIdx] = [{
                  id: entry.id,
                  text: entry.note || "",
                  time: entry.time || (entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" }) : ""),
                  origin: Array.isArray(entry.tags) ? entry.tags[0] : "thoughts",
                  isVoice: false,
                  isImportant: false,
                  isPinned: false,
                }, ...next[dayIdx]];
              }
            }
            return next;
          });
        }

        if (data.recipeProgress?.length > 0) {
          const grouped: Record<string, Record<string, any>> = {};
          for (const p of data.recipeProgress) {
            if (!grouped[p.bookRecipeType]) grouped[p.bookRecipeType] = {};
            grouped[p.bookRecipeType][p.bookRecipeId] = {
              status: p.status,
              note: p.note || "",
              tags: p.tags || [],
              method: "text",
            };
          }
          for (const [type, state] of Object.entries(grouped)) {
            useAppStore.getState().setRecipeState(type, state as any);
          }
        }
      } catch (err) {
        console.warn("[Init] server data load failed:", err);
      }
    })();

    if (typeof window !== 'undefined') {
      initializeAchievementSystem()
    }
  }, [])

  // Persist daily ratings to DB whenever they change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      api("/api/metrics/ratings", {
        method: "POST",
        body: {
          date: new Date().toISOString().split("T")[0],
          wellbeing: ratingWellbeing,
          energy: ratingEnergy,
          lightness: ratingLightness,
        },
      }).catch(() => {});
    }, 2000);
    return () => clearTimeout(timer);
  }, [ratingWellbeing, ratingEnergy, ratingLightness]);

  // --- SPECIAL ANNA LOCAL OVERLAY CHAT STATES ---
  const [isOverlayOpen, setOverlayOpen] = useState(false);
  const [overlayState, setOverlayState] = useState<"На связи" | "Слушаю" | "Думаю" | "Отвечаю">("На связи");
  const [overlayMessages, setOverlayMessages] = useState<{ id: string; sender: "user" | "anna"; text: string; time: string }[]>([]);
  const [overlayInput, setOverlayInput] = useState("");
  const [typedOverlayInput, setTypedOverlayInput] = useState("");
  
  const overlaySpeechSessionRef = useRef<SpeechToTextSession | null>(null);
  const isOverlayHoldingMicRef = useRef(false);
  const overlayAutoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const overlayActiveFetchAbortRef = useRef<AbortController | null>(null);
  const overlayTypingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const overlayStateRef = useRef(overlayState);
  overlayStateRef.current = overlayState;



  const getOverlayGreeting = (currentScreen: string): string => {
    switch (currentScreen) {
      case "personal-data":
        return "Привет! Настраиваем профиль? Нажми и удерживай кнопку Анны внизу, чтобы спросить меня про нормы веса или давления! 📊";
      case "health-goals":
        return "Рада помочь с твоими целями здоровья! Готова обсудить, как WFPB-рацион без соли защищает сосуды и почки. 🌱";
      case "digestion":
        return "Обсудим пищеварение? В переходный период на растительном питании микрофлора активно перестраивается. Всё ли комфортно? 🍏";
      case "habits-twenty":
        return "Ключи системы! Это твой гид по ключевым привычкам долголетия и растительной пище. Спрашивай про любой пункт, расскажу подробности! 🌿";
      case "what-i-eat":
        return "Дневник тарелки готов к заполнению! Можешь спросить меня, как сбалансировать рацион или сфотографировать блюдо. 🥗";
      case "check-composition":
        return "Давай проверим состав! Помогаю выявить скрытую соль, масла и продукты животного происхождения. Есть сомнения? 🔬";
      case "dish-analysis":
        return "Отличная тарелка! Хочешь узнать больше про баланс аминокислот, Омега-3 или железо в этом блюде? Готова рассказать! 🔍";
      case "my-dishes":
        return "Твоя личная кулинарная книга! Здесь собраны все проверенные WFPB шедевры. О каком блюде рассказать подробнее? 🍲";
      case "from-what-is":
        return "Готовим из холодильника? Назови продукты, и я посоветую восхитительный рецепт без капли соли и масла! 🍅";
      case "book-recipes":
        return "Изучаешь здоровые рецепты? С удовольствием подскажу топ-варианты без экстракта соли для здорового эндотелия! 📖";
      case "purchases":
        return "Составляем список покупок? Подскажу, на что обратить внимание в супермаркете и какие семена выбрать! 🛒";
      case "diary":
        return "Журнал замеров на связи! Слежу за динамикой твоего давления и горжусь каждым шагом к лёгкости. О чём пообщаемся? 📈";
      default:
        return "Привет! Я Анна, твой личный WFPB-гид. Рада помочь тебе именно здесь! Спрашивай о здоровом питании без соли. 💚";
    }
  };

  const resetOverlayAutoCloseTimer = (durationMs = 8000) => {
    if (overlayAutoCloseTimerRef.current) {
      clearTimeout(overlayAutoCloseTimerRef.current);
    }
    overlayAutoCloseTimerRef.current = setTimeout(() => {
      setOverlayOpen(prev => {
        if (prev) {
          setOverlayState(state => {
            if (state === "На связи") return "На связи";
            return state;
          });
          return false;
        }
        return false;
      });
    }, durationMs);
  };

  const triggerOverlayResponse = async (queryText: string, currentHistory: any[]) => {
    setOverlayState("Думаю");
    
    if (overlayAutoCloseTimerRef.current) {
      clearTimeout(overlayAutoCloseTimerRef.current);
    }

    if (overlayActiveFetchAbortRef.current) {
      overlayActiveFetchAbortRef.current.abort();
    }
    const abortController = new AbortController();
    overlayActiveFetchAbortRef.current = abortController;

    try {
      const data = await api<any>("/api/anna-chat", {
        method: "POST",
        signal: abortController.signal,
        body: {
          message: queryText,
          history: currentHistory.map(m => ({ sender: m.sender, text: m.text })),
          screenContext: screen,
          screenContextDetails: typeof window !== "undefined" ? {
            ...((window as any).currentScreenContext || {}),
            initialAge,
            initialHeight,
            initialWeight,
            initialSystolic,
            initialDiastolic,
            age,
            height,
            weight,
            systolic,
            diastolic
          } : null,
          bookRecipesDataContext: typeof window !== "undefined" ? (window as any).currentBookRecipesContext : null,
          userName: userName
        }
      });
      const rawReply = data.reply || "Я рядом! Давай поддержим твой растительный рацион всей душой! 🌿";
      const replyText = rawReply.replace(/^(?:`[^`]+`(?:\s*[-–]\s*\d+|\s*\([^)]*\))?|[\wа-яА-Я]+\s+\d+)\s*\n+/g, '').trim();

      const annaMsgId = `back-anna-overlay-${Date.now()}`;
      const now = new Date();
      const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

      setOverlayState("Отвечаю");

      // Animate typing text words (strictly text-only, no speech synthesis!)
      let currentText = "";
      const words = replyText.split(" ");
      let wordIndex = 0;

      if (overlayTypingTimerRef.current) {
        clearTimeout(overlayTypingTimerRef.current);
      }

      const animateTyping = () => {
        if (wordIndex < words.length) {
          currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
          setOverlayMessages(prev => {
            const exists = prev.some(m => m.id === annaMsgId);
            if (exists) {
              return prev.map(m => m.id === annaMsgId ? { ...m, text: currentText } : m);
            } else {
              return [
                ...prev,
                { id: annaMsgId, sender: "anna", text: currentText, time: timeStr }
              ];
            }
          });
          wordIndex++;
          overlayTypingTimerRef.current = setTimeout(animateTyping, 40);
        } else {
          setOverlayState("На связи");
          resetOverlayAutoCloseTimer(15000); // 15s to read
        }
      };

      animateTyping();

    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error("Overlay query error:", err);
      setOverlayState("На связи");
    }
  };

  const handleOverlaySendText = (textToSend?: string) => {
    const text = textToSend || typedOverlayInput.trim();
    if (!text) return;

    if (overlayAutoCloseTimerRef.current) clearTimeout(overlayAutoCloseTimerRef.current);
    if (overlayTypingTimerRef.current) clearTimeout(overlayTypingTimerRef.current);

    setTypedOverlayInput("");
    setOverlayInput("");

    const userMsgId = `overlay-msg-user-${Date.now()}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });

    const newUserMsg = {
      id: userMsgId,
      sender: "user" as const,
      text,
      time: timeStr
    };

    const updated = [...overlayMessages, newUserMsg];
    setOverlayMessages(updated);

    triggerOverlayResponse(text, updated);
  };

  const startOverlaySpeech = () => {
    if (overlayAutoCloseTimerRef.current) clearTimeout(overlayAutoCloseTimerRef.current);
    if (overlayTypingTimerRef.current) clearTimeout(overlayTypingTimerRef.current);

    isOverlayHoldingMicRef.current = true;
    setOverlayState("Слушаю");
    setOverlayOpen(true);
    setOverlayInput("");
    
    setOverlayMessages(prev => {
      if (prev.length === 0) {
        return [{
          id: "overlay-welcome",
          sender: "anna",
          text: getOverlayGreeting(screen),
          time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
        }];
      }
      return prev;
    });

    overlaySpeechSessionRef.current = new SpeechToTextSession({
      isHoldingRef: isOverlayHoldingMicRef,
      onTranscript: (incomingTranscript, isFinalState) => {
        setOverlayInput(incomingTranscript);
      },
      onStateChange: (state) => {
        if (state === "listening") {
          setOverlayState("Слушаю");
        }
      },
      onError: (err) => {
        console.warn("Overlay speech error:", err);
      }
    });

    overlaySpeechSessionRef.current.start();
  };

  const stopOverlaySpeechAndSend = () => {
    isOverlayHoldingMicRef.current = false;
    
    let textToSend = "";
    if (overlaySpeechSessionRef.current) {
      textToSend = overlaySpeechSessionRef.current.getAccumulatedText().trim();
      overlaySpeechSessionRef.current.stop();
      overlaySpeechSessionRef.current = null;
    }

    if (!textToSend) {
      textToSend = overlayInput.trim();
    }

    setOverlayInput("");

    if (!textToSend) {
      setOverlayState("На связи");
      resetOverlayAutoCloseTimer(5000);
      return;
    }

    handleOverlaySendText(textToSend);
  };

  const cancelOverlaySpeech = () => {
    isOverlayHoldingMicRef.current = false;
    if (overlaySpeechSessionRef.current) {
      overlaySpeechSessionRef.current.stop();
      overlaySpeechSessionRef.current = null;
    }
    setOverlayInput("");
    setOverlayState("На связи");
    resetOverlayAutoCloseTimer(5000);
  };

  // Listen both to full-screen triggers and the local overlay events
  useEffect(() => {
    const handleOpenAnna = () => {
      setScreen("anna");
    };

    const handleOpenSettings = () => {
      setScreen("settings");
    };

    const handleOpenRewards = () => {
      setScreen("rewards");
    };

    const handleStartPress = () => {
      startOverlaySpeech();
    };

    const handleEndPress = () => {
      stopOverlaySpeechAndSend();
    };

    const handleCancelPress = () => {
      cancelOverlaySpeech();
    };

    const handleTap = () => {
      setOverlayOpen(true);
      setOverlayState("На связи");
      setOverlayMessages([
        {
          id: "overlay-welcome",
          sender: "anna",
          text: getOverlayGreeting(screen),
          time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
        }
      ]);
      resetOverlayAutoCloseTimer(30000); // Fades in 30s of pure idle
    };

    window.addEventListener("open-anna-screen", handleOpenAnna);
    window.addEventListener("open-settings-screen", handleOpenSettings);
    window.addEventListener("open-rewards-screen", handleOpenRewards);
    window.addEventListener("anna-overlay-start-press", handleStartPress);
    window.addEventListener("anna-overlay-end-press", handleEndPress);
    window.addEventListener("anna-overlay-cancel-press", handleCancelPress);
    window.addEventListener("anna-overlay-tap", handleTap);

    return () => {
      window.removeEventListener("open-anna-screen", handleOpenAnna);
      window.removeEventListener("open-settings-screen", handleOpenSettings);
      window.removeEventListener("open-rewards-screen", handleOpenRewards);
      window.removeEventListener("anna-overlay-start-press", handleStartPress);
      window.removeEventListener("anna-overlay-end-press", handleEndPress);
      window.removeEventListener("anna-overlay-cancel-press", handleCancelPress);
      window.removeEventListener("anna-overlay-tap", handleTap);

      if (overlayAutoCloseTimerRef.current) clearTimeout(overlayAutoCloseTimerRef.current);
      if (overlayTypingTimerRef.current) clearTimeout(overlayTypingTimerRef.current);
    };
  }, [screen]);

  const [savedDishes, setSavedDishes] = useState<SavedDish[]>([]);

  // ─── ACHIEVEMENT SNAPSHOT INGESTION ────────────────────────────
  const lastSnapshotRef = useRef('')
  useEffect(() => {
    const snapshot: AchievementStateSnapshot = {
      savedDishes,
      water,
      sleep,
      mealCount,
      clickCount,
      habitsDone,
      currentDayIndex,
      dayNotes,
      weight,
      systolic,
      initialWeight,
      initialSystolic,
      overlayState: overlayStateRef.current,
    }
    const json = JSON.stringify(snapshot)
    if (json === lastSnapshotRef.current) return
    lastSnapshotRef.current = json
    ingestAchievementEvent({ type: 'state:updated', snapshot })
  }, [
    savedDishes, water, sleep, mealCount, clickCount, habitsDone,
    currentDayIndex, dayNotes, weight, systolic, initialWeight, initialSystolic, overlayState,
  ])

  // Synchronize dynamic habits progress in real-time from SystemKeysStore
  useEffect(() => {
    const { closedCount } = SystemKeysStore.calculateKeysForDay(currentDayIndex, savedDishes, water);
    setHabitsDone(closedCount);
  }, [currentDayIndex, savedDishes, water]);

  const handleToggleFavorite = (id: string) => {
    setSavedDishes(prev => {
      const dish = prev.find(d => d.id === id);
      const next = dish ? !dish.isFavorite : false;
      // Persist to DB (fire-and-forget)
      api("/api/saved-dishes/" + encodeURIComponent(id), {
        method: "PATCH",
        body: { isFavorite: next },
      }).catch(() => {});
      return prev.map(d => d.id === id ? { ...d, isFavorite: next } : d);
    });
  };

  const handleSaveDishCategory = (id: string, category: string) => {
    setSavedDishes(prev => prev.map(d => d.id === id ? { ...d, category, isNew: false, categoryColor: getCategoryColor(category).shadow } : d));
    // Persist category change to DB (fire-and-forget)
    api("/api/saved-dishes/" + encodeURIComponent(id), {
      method: "PATCH",
      body: { category, isNew: false },
    }).catch(() => {});
  };

  const handleSaveBookRecipe = (name: string, image: string, sourceType: string, ref: any) => {
    const tag = sourceType === "breakfast" ? "Завтрак" :
                sourceType === "lunch" ? "Обед" :
                sourceType === "dinner" ? "Ужин" :
                sourceType === "recipe_of_day" ? "Рецепт дня" :
                sourceType === "must_have" ? "Маст Хев" :
                sourceType === "drinks" ? "Напитки" :
                sourceType === "compliment" ? "Комплименты" : "";
    const macros = ref?.type && ref?.id != null ? getBookMacros(ref.type, ref.id) : null;
    const generatedId = `book_${sourceType}_${Date.now()}`;

    // Parse ingredients from the recipe definition
    let parsedIngredients: { name: string; weight: string; status: "green" | "yellow" | "red" }[] = [];
    if (ref?.type && ref?.id != null) {
      const recipeArray = RECIPE_TYPE_TO_ARRAY[ref.type];
      if (recipeArray) {
        const recipeDef = recipeArray.find((r: any) => r.id === ref.id || r.day === ref.id);
        if (recipeDef?.ingredients) {
          parsedIngredients = recipeDef.ingredients
            .split(",")
            .map((i: string) => i.trim())
            .filter(Boolean)
            .map((ingName: string) => {
              const weightNum = parseWeightGrams(ingName);
              const profile = getFoodProfile(ingName);
              return {
                name: ingName.charAt(0).toUpperCase() + ingName.slice(1),
                weight: String(Math.round(weightNum)) + " г",
                status: profile.defaultStatus,
              };
            });
        }
      }
    }

    const newDish: SavedDish = {
      id: generatedId,
      name,
      createdAt: new Date().toISOString(),
      time: new Date().toLocaleTimeString("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit" }),
      tag,
      category: "Книга",
      image: image || "",
      isFavorite: false,
      calories: macros?.calories ?? 0,
      protein: macros?.protein ?? "",
      fiber: macros?.fiber ?? "",
      fat: macros?.fat ?? "",
      ingredients: parsedIngredients,
      annaTip: "",
      isBookRecipe: true,
      bookRecipeRef: ref,
    };
    setSavedDishes(prev => [newDish, ...prev]);

    // Persist SavedDish to the database (fire-and-forget)
    api("/api/saved-dishes", {
      method: "POST",
      body: {
        name: newDish.name,
        image: newDish.image || null,
        category: newDish.category,
        tag: newDish.tag || null,
        isFavorite: newDish.isFavorite,
        isBookRecipe: true,
        bookRecipeType: ref?.type || null,
        bookRecipeId: ref?.id || null,
        sourceType: ref?.type || null,
        ingredients: parsedIngredients,
        calories: newDish.calories,
        protein: newDish.protein,
        fiber: newDish.fiber,
        fat: newDish.fat,
        dayIndex: currentDayIndex,
        annaTip: newDish.annaTip || "",
        isNew: true,
      },
    }).catch(() => {});
  };

  const handleSaveProgress = (updatedHabits: any) => {
    setHabitsTwentyData(updatedHabits);

    let completedKeysCount = 0;
    if (updatedHabits && typeof updatedHabits === "object") {
      if (typeof updatedHabits.completedCount === "number") {
        completedKeysCount = updatedHabits.completedCount;
      } else if (Array.isArray(updatedHabits.nutrition) && Array.isArray(updatedHabits.lifestyle)) {
        const totalCheckedCircles = updatedHabits.nutrition.reduce((acc: number, h: any) => acc + (h.checkedCircles || 0), 0) +
                                   updatedHabits.lifestyle.reduce((acc: number, h: any) => acc + (h.checkedCircles || 0), 0);
        completedKeysCount = Math.min(20, totalCheckedCircles);
      }
    } else if (typeof updatedHabits === "number") {
      completedKeysCount = updatedHabits;
    }

    // Synchronize simple habits list completed badge counts
    setHabitsDone(completedKeysCount);

    // Increase click count indicating progress
    setClickCount(prev => prev + completedKeysCount + 5);

    // Turn screen back to 'my-day'
    setScreen("my-day");
  };

  return (
    <ErrorBoundary>
      <GlobalNotificationOverlay />
      <div 
        className="min-h-screen bg-[#F0F3F5] text-text-main flex items-center justify-center py-6 px-4 md:py-10 transition-colors duration-300 pointer-events-auto" 
        style={{ fontFamily: '"Calibri", "Candara", "Segoe UI", system-ui, sans-serif' }}
      >
      {/* Decorative organic background blobs for context styling */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-brand-green-bright/3 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-green-mint/3 rounded-full blur-[100px] pointer-events-none" />

      {/* Main viewport Container (No device notched borders or system status overlays, purely the screen UI content) */}
      <motion.div 
        layout
        className="w-full max-w-[420px] bg-white rounded-[40px] shadow-[0_24px_54px_-10px_rgba(43,49,55,0.08),_0_12px_24px_-12px_rgba(0,0,0,0.03)] border border-gray-100/50 flex flex-col justify-between overflow-hidden relative"
        style={{ minHeight: "844px" }}
      >
        
        {/* Top Spacer element representing the status bar region - completely clean empty area of the interface itself */}
        <div className="h-4 w-full" />

        <AnimatePresence mode="wait">
          {screen === "welcome" ? (
            <motion.div 
              key="welcome-view"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col justify-between"
            >
              {/* Scrollable / Flexible content view of the single screen */}
              <div className="flex-1 flex flex-col items-center justify-start px-6 pt-4 pb-2">
                
                {/* Section 1: Glass Progress tube with logo inside */}
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.8 }}
                  className="w-full flex justify-center mb-6"
                >
                  <GlassRing />
                </motion.div>

                {/* Section 2: Header Typography */}
                <div className="text-center w-full max-w-[340px] flex flex-col gap-3 mb-6">
                  <motion.h1 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-[30px] sm:text-[32px] font-bold text-text-dark leading-[1.1] tracking-tight"
                    style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  >
                    Добро пожаловать
                  </motion.h1>

                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="text-[18px] sm:text-[20px] font-bold text-brand-green-dark leading-snug tracking-wide"
                    style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  >
                    Ваш 28-дневный путь к лучшему самочувствию
                  </motion.p>
                </div>

                {/* Section 3: Descriptive Copy Paragraphs */}
                <div className="w-full max-w-[340px] flex flex-col gap-4 text-left px-1 mb-8">
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="text-[16px] sm:text-[18px] text-text-sec leading-[1.35] font-normal"
                    style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  >
                    Это приложение поможет вам пройти курс шаг за шагом: отслеживать питание, привычки, сон, пищеварение и личный прогресс.
                  </motion.p>

                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    className="text-[16px] sm:text-[18px] text-text-sec leading-[1.35] font-normal"
                    style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  >
                    Анна будет рядом, чтобы подсказывать, поддерживать и помогать видеть изменения.
                  </motion.p>
                  <p className="text-[10px] text-gray-400 text-center mt-2 font-medium tracking-wide">
                    v{buildVersion}
                  </p>
                </div>

                {/* Section 4: Premium Start Button */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.7 }}
                  className="w-full mt-auto"
                >
                  <StartButton onClick={() => setScreen("settings")} />
                </motion.div>

              </div>

              {/* Section 5: Customized bottom menu panel (firmware layout) */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.7 }}
                className="w-full mt-4"
              >
                <BottomBar />
              </motion.div>
            </motion.div>
          ) : screen === "my-page" ? (
            <motion.div
              key="my-page-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <MyPageScreen 
                onBack={() => setScreen("settings")} 
                onOpenMyDay={() => { setScreen("my-day"); setTimeout(() => ingestAchievementEvent({ type: 'course:started' }), 5000); }}
                dayNotes={dayNotes}
                currentDayIndex={currentDayIndex}
                screen={screen}
                onOpenCalendar={() => setCalendarOpen(true)}
              />
            </motion.div>
          ) : screen === "digestion" ? (
            <motion.div
              key="digestion-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <DigestionScreen 
                dayNotes={dayNotes}
                setDayNotes={setDayNotes}
                currentDayIndex={activeDayIndex}
              />
            </motion.div>
          ) : screen === "habits-twenty" ? (
            <motion.div
              key="habits-twenty-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <HabitsTwentyScreen 
                dayNotes={dayNotes}
                setDayNotes={setDayNotes}
                currentDayIndex={activeDayIndex}
                savedDishes={savedDishes}
                water={water}
                setWater={setWater}
                initialHabits={habitsTwentyData}
                recordClickExternally={(pts) => setClickCount(prev => prev + pts)}
                onSaveProgress={handleSaveProgress}
                screen={screen}
                onOpenCalendar={() => setCalendarOpen(true)}
                onBack={() => setScreen("my-day")}
                onNavigateHome={() => setScreen("my-day")}
                onNavigateDiary={() => setScreen("what-i-eat")}
                onNavigateProgress={() => setScreen("habits-twenty")}
              />
            </motion.div>
          ) : screen === "what-i-eat" ? (
            <motion.div
              key="what-i-eat-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <WhatIEatScreen 
                onVerifyComposition={(ingredients, imgBase64) => {
                  setCustomMealIngredients(ingredients);
                  setCurrentMealImage(imgBase64);
                  if (ingredients) setScreen("check-composition");
                }}
                currentDayIndex={activeDayIndex}
              />
            </motion.div>
          ) : screen === "check-composition" ? (
            <motion.div
              key="check-composition-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <CheckCompositionScreen 
                initialIngredients={customMealIngredients}
                onAnalyzeComplete={(cards) => {
                  setCustomMealIngredients(cards);
                  setScreen("dish-analysis");
                }}
                currentDayIndex={activeDayIndex}
              />
            </motion.div>
          ) : screen === "dish-analysis" ? (
            <motion.div
              key="dish-analysis-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <DishAnalysisScreen 
                ingredients={customMealIngredients || []}
                onConfirm={(dishName, computedNutrients, annaComment) => {
                  setMealCount(prev => Math.min(4, prev + 1));
                  setClickCount(prev => prev + 25);
                  setMeals(prev => prev.map((m, idx) => {
                    if (idx === mealCount) {
                      return { ...m, name: dishName, checked: true };
                    }
                    return m;
                  }));

                  const generatedId = "custom-" + Date.now();
                  const lowerName = dishName.toLowerCase();
                  let determinedCategory = "Салаты";

                  if (lowerName.includes("суп") || lowerName.includes("борщ") || lowerName.includes("бульон")) {
                    determinedCategory = "Супы";
                  } else if (lowerName.includes("каш") || lowerName.includes("овсян") || lowerName.includes("завтрак") || lowerName.includes("гранол") || lowerName.includes("блин")) {
                    determinedCategory = "Завтраки";
                  } else if (lowerName.includes("напит") || lowerName.includes("сок") || lowerName.includes("чай") || lowerName.includes("смузи") || lowerName.includes("кофе") || lowerName.includes("компот")) {
                    determinedCategory = "Напитки";
                  } else if (lowerName.includes("десерт") || lowerName.includes("пудинг") || lowerName.includes("чиа") || lowerName.includes("сладк")) {
                    determinedCategory = "Дессерты";
                  } else if (lowerName.includes("кекс") || lowerName.includes("пирог") || lowerName.includes("булоч") || lowerName.includes("выпеч")) {
                    determinedCategory = "выпечка";
                  } else if (lowerName.includes("соус") || lowerName.includes("дрессинг")) {
                    determinedCategory = "соусы";
                  }

                  // Format verified scanned ingredients smoothly
                  const mappedIngredients = (customMealIngredients || []).map((item, idx) => ({
                    name: item.fullName || item.shortName || `Компонент ${idx + 1}`,
                    weight: item.weight ? `${item.weight} г` : "75 г",
                    status: item.status === "error" ? "red" as const : ((item.status === "green" || item.status === "yellow" || item.status === "red") ? item.status : "green" as const),
                    manuallyAllowed: item.manuallyAllowed === true
                  }));

                  const newDish: SavedDish = {
                    id: generatedId,
                    name: dishName,
                    createdAt: new Date().toISOString(),
                    time: "",
                    tag: determinedCategory === "Салаты" || determinedCategory === "Напитки" ? "Лёгкий ужин" : (determinedCategory === "Завтраки" ? "Для энергии" : "Белок"),
                    category: determinedCategory,
                    image: currentMealImage || null,
                    isFavorite: false,
                    calories: computedNutrients ? computedNutrients.calories : Math.floor(Math.random() * 80) + 180,
                    protein: computedNutrients ? computedNutrients.protein : `${Math.floor(Math.random() * 5) + 6} г`,
                    fiber: computedNutrients ? computedNutrients.fiber : `${Math.floor(Math.random() * 4) + 5} г`,
                    fat: computedNutrients ? computedNutrients.fat : `${Math.floor(Math.random() * 3) + 2} г`,
                    isNew: true,
                    categoryColor: getCategoryColor(determinedCategory).shadow,
                    dayIndex: currentDayIndex,
                    annaTip: annaComment || "",
                    ingredients: mappedIngredients.length > 0 ? mappedIngredients : [
                      { name: "Свежие WFPB ингредиенты", weight: "120 г", status: "green" }
                    ],
                    computedNutrients,
                    annaComment,
                    isMixerGenerated: false,
                  };

                  setSavedDishes(prev => [newDish, ...prev]);
                  setScreen("my-dishes");

                  // Persist photo/DIY dish to DB (fire-and-forget)
                  api("/api/saved-dishes", {
                    method: "POST",
                    body: {
                      name: dishName,
                      image: currentMealImage || null,
                      category: determinedCategory,
                      isBookRecipe: false,
                      isFavorite: false,
                      ingredients: mappedIngredients,
                      calories: newDish.calories,
                      protein: newDish.protein,
                      fiber: newDish.fiber,
                      fat: newDish.fat,
                      dayIndex: currentDayIndex,
                      annaTip: annaComment || "",
                      isNew: true,
                    },
                  }).catch(() => {});

                  // Persist cooking diary entry to DB (fire-and-forget)
                  if (currentDayIndex !== undefined) {
                    const ingredientNames = mappedIngredients.map((i: any) => i.name).join(", ");
                    api("/api/diary", {
                      method: "POST",
                      body: {
                        dayIndex: currentDayIndex,
                        note: `🍳 Приготовлено блюдо: ${dishName}. Ингредиенты: ${ingredientNames}`,
                        time: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
                        tags: ["food"],
                      },
                    }).catch(() => {});
                  }

                  fetch("/api/anna-comment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ dishName, ingredients: mappedIngredients })
                  })
                    .then(r => r.json())
                    .then(data => {
                      if (data.comment) {
                        setSavedDishes(prev => prev.map(d => d.id === generatedId ? { ...d, annaTip: data.comment, annaComment: d.annaComment || data.comment } : d));
                      }
                    })
                    .catch(() => {});
                }}
                onCancel={() => { setScreen("my-day"); }}
                currentDayIndex={activeDayIndex}
              />
            </motion.div>
          ) : screen === "my-dishes" ? (
            <motion.div
              key="recipes-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <RecipesScreen
                savedDishes={savedDishes}
                onToggleFavorite={handleToggleFavorite}
                onSaveDishCategory={handleSaveDishCategory}
              />
            </motion.div>
          ) : screen === "from-what-is" ? (
            <motion.div
              key="from-what-is-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <FromWhatIsScreen 
                currentDayIndex={activeDayIndex}
                onConfirmRecipe={(ingredients) => {
                  setCustomMealIngredients(ingredients);
                  setCurrentMealImage(null);
                  setScreen("check-composition");
                }}
              />
            </motion.div>
          ) : screen === "book-recipes" ? (
            <motion.div
              key="book-recipes-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <BookRecipesScreen 
                dayNotes={dayNotes}
                setDayNotes={setDayNotes}
                currentDayIndex={activeDayIndex}
                onSaveBookRecipe={handleSaveBookRecipe}
              />
            </motion.div>
          ) : screen === "purchases" ? (
            <motion.div
              key="purchases-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <MyPurchasesScreen 
                currentDayIndex={activeDayIndex}
              />
            </motion.div>
          ) : screen === "diary" ? (
            <motion.div
              key="diary-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <MyDiaryScreen 
                dayNotes={dayNotes}
                setDayNotes={setDayNotes}
                currentDayIndex={activeDayIndex}
              />
            </motion.div>
          ) : screen === "anna" ? (
            <motion.div
              key="anna-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <AnnaScreen />
            </motion.div>
          ) : screen === "state-now" ? (
            <motion.div
              key="state-now-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <StateNowScreen 
                dayNotes={dayNotes}
                setDayNotes={setDayNotes}
                currentDayIndex={activeDayIndex}
                savedDishes={savedDishes}
                weight={initialWeight}
                isReadOnly={isReadOnly}
              />
            </motion.div>
          ) : screen === "rewards" ? (
            <motion.div
              key="rewards-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <MyRewardsScreen />
            </motion.div>
          ) : screen === "settings" ? (
            <motion.div
              key="settings-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <SettingsScreen 
                onBack={() => setScreen("my-day")}
                currentDayIndex={activeDayIndex}
                onboardingComplete={() => setScreen("my-day")}
              />
            </motion.div>
          ) : (
            <motion.div
              key="my-day-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.4 }}
              className="flex-1 flex flex-col"
            >
              <MyDayScreen 
                dayNotes={dayNotes}
                setDayNotes={setDayNotes}
                currentDayIndex={activeDayIndex}
                setCurrentDayIndex={setCurrentDayIndex}
                onOpenCalendar={() => setCalendarOpen(true)}
                savedDishes={savedDishes}
                water={water}
                isReadOnly={isReadOnly}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global Local Overlay for Anna Conversation (non-MyDay screens) */}
        <AnimatePresence>
          {isOverlayOpen && screen !== "anna" && screen !== "welcome" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute bottom-[104px] left-4 right-4 z-40 flex flex-col gap-2 pointer-events-none select-none"
              id="anna-local-overlay-panel"
            >
              {/* Context Pill (Indicator of active screen being analyzed) */}
              <div className="flex items-center justify-between w-full">
                <motion.div 
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="flex items-center justify-between pointer-events-auto bg-white/90 backdrop-blur-md border border-gray-150/50 px-3 py-1.5 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.06)] text-[11.5px] font-semibold text-gray-500 gap-3"
                  id="anna-context-pill"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-[12px] tracking-wide text-gray-700 font-bold">Анна</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-widest text-[#758478] font-bold font-mono hidden">
                      {overlayState === "На связи" ? "текст-only" : overlayState}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOverlayOpen(false)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-all text-gray-400 hover:text-gray-600 active:scale-90 cursor-pointer flex items-center justify-center"
                      aria-label="Свернуть Куратора"
                      id="anna-overlay-close-btn"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              </div>

              {/* Stack of Floating Chat Bubbles */}
              <div 
                className="w-full flex flex-col gap-2.5 max-h-[300px] overflow-y-auto no-scrollbar justify-end pointer-events-none pr-1"
                id="anna-overlay-bubble-stack"
                ref={(el) => {
                  if (el) {
                    el.scrollTop = el.scrollHeight;
                  }
                }}
              >
                {/* Last 4 messages inside the floating stack */}
                {overlayMessages.slice(-4).map((msg) => {
                  const isUser = msg.sender === "user";
                  const customStyle = getAnnaBubbleStyle(screen);

                  if (isUser) {
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={msg.id}
                        className="flex flex-col max-w-[85%] self-end items-end ml-auto pointer-events-auto select-text"
                      >
                        <div className="px-4 py-2.5 rounded-[20px] rounded-br-[4px] text-[13px] leading-relaxed bg-white/90 text-[#0E4A1C] border border-[#16B551]/25 shadow-[0_4px_12px_rgba(22,181,81,0.06),0_0_8px_rgba(22,181,81,0.08)]">
                          <p className="font-normal">{msg.text}</p>
                        </div>
                      </motion.div>
                    );
                  } else {
                    return (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        key={msg.id}
                        className="flex items-start gap-3 max-w-[85%] self-start pointer-events-auto select-text"
                      >
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-200/60 shadow-sm flex-shrink-0 relative mt-0.5">
                            <img 
                              src={resolveAvatarByState("Отвечаю", msg.text).src}
                              alt="Анна"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 rounded-full bg-[#16B551] border-2 border-white" />
                        </div>
                        <div className={`p-4 rounded-[20px] rounded-bl-[4px] text-[13px] leading-relaxed border shadow-sm ${customStyle.bg} ${customStyle.border} ${customStyle.text}`}>
                          <p className="font-normal">{msg.text}</p>
                        </div>
                      </motion.div>
                    );
                  }
                })}

                {/* Live speech transcription display while user holds & speaks */}
                {overlayState === "Слушаю" && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 15, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="flex flex-col max-w-[85%] self-end items-end ml-auto pointer-events-auto"
                    key="live-transcript-bubble"
                  >
                    <div className="px-4 py-2.5 rounded-[20px] rounded-br-[4px] text-[13px] leading-relaxed bg-white/95 text-[#0E4A1C] border-2 border-brand-green-bright/40 shadow-[0_4px_16px_rgba(22,181,81,0.1),_0_0_12px_rgba(22,181,81,0.12)] animate-[pulse_1.5s_infinite]">
                      <p className="font-medium flex items-center gap-1.5">
                        <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#16B551] animate-ping" />
                        {overlayInput || "Слушаю ваш голос..."}
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Thinking animation state bubble */}
                {overlayState === "Думаю" && (
                  <motion.div
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="flex items-end gap-3 max-w-[85%] self-start pointer-events-auto"
                    key="thinking-bubble"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-emerald-200/60 shadow-sm animate-pulse flex-shrink-0 relative mt-0.5">
                      <img 
                        src={resolveAvatarByState("Отвечаю", "").src}
                        alt="Анна"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className={`px-4 py-3 rounded-[20px] rounded-bl-[4px] border shadow-xs flex items-center gap-1 min-w-[55px] justify-center ${getAnnaBubbleStyle(screen).bg} ${getAnnaBubbleStyle(screen).border}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16B551] animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16B551] animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16B551] animate-bounce" style={{ animationDelay: '0.3s' }} />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Floating translucent interactive input pill-capsule */}
              <div className="w-full flex justify-center mt-1 select-text pointer-events-auto" id="anna-overlay-input-wrap">
                <div className="w-full relative rounded-full bg-white/90 backdrop-blur-md border border-gray-150 p-1 flex items-center focus-within:border-brand-green-light focus-within:bg-white shadow-[0_6px_20px_rgba(0,0,0,0.05)] transition-all">
                  <input 
                    type="text"
                    value={typedOverlayInput}
                    onChange={(e) => {
                      setTypedOverlayInput(e.target.value);
                      resetOverlayAutoCloseTimer(35000); // give them plenty of time while typing
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleOverlaySendText();
                    }}
                    placeholder={overlayState === "Слушаю" ? "Слушаю голос..." : "Напиши куратору Анне..."}
                    className="flex-1 bg-transparent px-4 py-1.5 text-[13px] text-gray-800 outline-none placeholder:text-gray-400"
                    disabled={overlayState === "Слушаю" || overlayState === "Думаю"}
                  />
                  <button
                    type="button"
                    onClick={() => handleOverlaySendText()}
                    disabled={!typedOverlayInput.trim() || overlayState === "Думаю" || overlayState === "Слушаю"}
                    className={`p-2 rounded-full flex items-center justify-center transition-all ${
                      typedOverlayInput.trim() && overlayState !== "Думаю"
                        ? "bg-[#16B551] text-white hover:scale-105 active:scale-95 cursor-pointer"
                        : "text-gray-350 cursor-default"
                    }`}
                    aria-label="Отправить письмо Анне"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Gentle non-intrusive action hint */}
              <p className="text-[10px] text-gray-400 text-center font-semibold">
                {overlayState === "Слушаю" 
                  ? "Отпустите зелёный круг внизу, чтобы отправить" 
                  : "Удерживайте зелёный круг внизу, чтобы говорить"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <CalendarOverlay 
          isOpen={isCalendarOpen}
          onClose={() => { setCalendarOpen(false); setViewingDayIndex(null); }}
          dayNotes={dayNotes}
          setDayNotes={setDayNotes}
          currentDayIndex={currentDayIndex}
          viewingDayIndex={viewingDayIndex}
          setViewingDayIndex={setViewingDayIndex}
          recordClick={(pts) => setClickCount(prev => prev + (pts || 1))}
        />

        {/* Global Achievement Overlay */}
        <AchievementOverlay userGender={userGender} />

        {/* Developer Debug Panel */}
        <AchievementsDebugPanel />

        {/* MixerScreen overlay */}
        <AnimatePresence>
          {mixerConfig && (
            <MixerScreen
              config={mixerConfig}
              onClose={() => setMixerConfig(null)}
            />
          )}
        </AnimatePresence>

      </motion.div>
    </div>
    </ErrorBoundary>
  );
}
