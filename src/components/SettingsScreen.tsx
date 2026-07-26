import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ChevronLeft, 
  ChevronDown,
  Settings, 
  Bell, 
  Activity, 
  BookOpen, 
  User, 
  Check, 
  Clock, 
  HeartPulse, 
  Sparkles, 
  Droplet, 
  Moon, 
  Trash2, 
  Download, 
  Flame, 
  ArrowUp, 
  Droplets, 
  Shield, 
  BatteryLow, 
  Brain, 
  Wind, 
  Heart, 
  Layers, 
  Link, 
  Waves, 
  CloudRain, 
  ShieldCheck, 
  HelpCircle,
  Sprout,
  Scale,
  Zap,
  EyeOff,
  Leaf,
  ArrowDown,
  ShieldAlert,
  Smile,
  CloudLightning,
  Cookie,
  Ban,
  Sun,
  Trophy,
  MoreHorizontal,
  Minus,
  Plus
} from "lucide-react";
import BottomBar from "./BottomBar";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { 
  UserPreferencesStore, 
  UserPreferences, 
  NotificationPreference, 
  NotificationTimeRange 
} from "../services/UserPreferencesStore";
import { resolveAvatar } from "../utils/annaAvatarResolver";

// Mirroring the exact lists from HealthGoalsScreen.tsx to satisfy complete mapping
const CHRONIC_CONDITIONS = [
  { id: "hypertension", name: "Гипертония", icon: HeartPulse, color: "text-red-500 bg-red-50" },
  { id: "gastritis", name: "Гастрит", icon: Flame, color: "text-orange-500 bg-orange-50" },
  { id: "reflux", name: "Рефлюкс", icon: ArrowUp, color: "text-amber-500 bg-amber-50" },
  { id: "diabetes", name: "Диабет", icon: Droplet, color: "text-blue-500 bg-blue-50" },
  { id: "ibs", name: "СРК", icon: Activity, color: "text-emerald-500 bg-emerald-50" },
  { id: "constipation", name: "Запоры", icon: Clock, color: "text-cyan-500 bg-cyan-50" },
  { id: "cholesterol", name: "Высокий холестерин", icon: Activity, color: "text-rose-500 bg-rose-50" },
  { id: "anemia", name: "Анемия", icon: Droplets, color: "text-red-600 bg-red-100" },
  { id: "allergy", name: "Аллергия", icon: Droplet, color: "text-pink-500 bg-pink-50" },
  { id: "thyroid", name: "Заболевания щитовидной железы", icon: Shield, color: "text-violet-500 bg-violet-50" },
  { id: "fatigue", name: "Хроническая усталость", icon: BatteryLow, color: "text-slate-500 bg-slate-100" },
  { id: "migraine", name: "Мигрень", icon: Brain, color: "text-indigo-500 bg-indigo-50" },
  { id: "asthma", name: "Астма", icon: Wind, color: "text-sky-500 bg-sky-50" },
  { id: "liver", name: "Заболевания печени", icon: Heart, color: "text-red-400 bg-red-50" },
  { id: "kidneys", name: "Заболевания почек", icon: Layers, color: "text-teal-600 bg-teal-50" },
  { id: "arthritis", name: "Артрит / боли в суставах", icon: Link, color: "text-stone-600 bg-stone-100" },
  { id: "anxiety", name: "Тревожность", icon: Waves, color: "text-purple-500 bg-purple-50" },
  { id: "depression", name: "Депрессия", icon: CloudRain, color: "text-blue-600 bg-blue-100" },
  { id: "insomnia", name: "Нарушения сна", icon: Moon, color: "text-indigo-900 bg-indigo-50" },
  { id: "autoimmune", name: "Аутоиммунные заболевания", icon: ShieldCheck, color: "text-lime-600 bg-lime-50" },
  { id: "other_chronic", name: "Другое", icon: MoreHorizontal, color: "text-gray-500 bg-gray-100" }
];

const GOALS = [
  { id: "improve_digestion", name: "Улучшить пищеварение", icon: Sprout, color: "text-emerald-500 bg-emerald-50" },
  { id: "lose_weight", name: "Снизить вес", icon: Scale, color: "text-teal-500 bg-teal-50" },
  { id: "increase_energy", name: "Повысить энергию", icon: Zap, color: "text-amber-500 bg-amber-50" },
  { id: "normalize_sleep", name: "Нормализовать сон", icon: Moon, color: "text-indigo-500 bg-indigo-50" },
  { id: "reduce_sugar_cravings", name: "Уменьшить тягу к сладкому", icon: Ban, color: "text-purple-500 bg-purple-50" },
  { id: "plant_diet", name: "Перейти на растительное питание", icon: Leaf, color: "text-green-500 bg-green-50" },
  { id: "regular_stool", name: "Наладить регулярный стул", icon: Clock, color: "text-cyan-500 bg-cyan-50" },
  { id: "lower_pressure", name: "Снизить давление", icon: HeartPulse, color: "text-red-500 bg-red-50" },
  { id: "stabilize_sugar", name: "Стабилизировать сахар", icon: Activity, color: "text-blue-500 bg-blue-50" },
  { id: "lower_cholesterol", name: "Снизить холестерин", icon: ArrowDown, color: "text-rose-500 bg-rose-50" },
  { id: "reduce_inflammation", name: "Снизить воспаление", icon: ShieldAlert, color: "text-emerald-600 bg-emerald-50" },
  { id: "improve_skin", name: "Улучшить состояние кожи", icon: Sparkles, color: "text-pink-500 bg-pink-50" },
  { id: "improve_mood", name: "Улучшить настроение", icon: Smile, color: "text-yellow-600 bg-yellow-50" },
  { id: "reduce_anxiety", name: "Уменьшить тревожность", icon: CloudLightning, color: "text-indigo-400 bg-indigo-50" },
  { id: "improve_eating_habits", name: "Улучшить пищевые привычки", icon: Heart, color: "text-rose-400 bg-rose-50" },
  { id: "more_wfpb", name: "Есть больше цельной растительной еды", icon: Cookie, color: "text-orange-500 bg-orange-50" },
  { id: "less_overeating", name: "Меньше переедать", icon: Ban, color: "text-stone-500 bg-stone-50" },
  { id: "drink_water", name: "Пить достаточно воды", icon: Droplet, color: "text-sky-500 bg-sky-50" },
  { id: "routine_stability", name: "Быть устойчивее в режиме", icon: Clock, color: "text-teal-600 bg-teal-50" },
  { id: "improve_wellbeing", name: "Улучшить общее самочувствие", icon: Sun, color: "text-amber-600 bg-amber-50" },
  { id: "other_goal", name: "Другое", icon: Sparkles, color: "text-gray-500 bg-gray-100" }
];

const LIFESTYLE_TRAITS = [
  { id: "поздний сон", name: "Поздний сон (после 23:30)", desc: "Влияет на мелатониновый купол и очистку почек" },
  { id: "хаотичный режим", name: "Хаотичный режим дня", desc: "Биоритмы запрашивают стабильность" },
  { id: "недостаток воды", name: "Недостаток воды", desc: "Свободная фильтрация лимфы требует увлажнения" },
  { id: "много кофеина", name: "Избыток кофеина", desc: "Вызывает спазмы почечных артерий" },
  { id: "тяга к сладкому", name: "Выраженная тяга к сладкому", desc: "Свидетельствует о нехватке сложных углеводов" },
  { id: "пропуски приёмов пищи", name: "Пропуски приёмов пищи", desc: "Приводит к застоям желчи" }
];

const RECIPE_DIET_PREFS = [
  { id: "book_priority", name: "Приоритет рецептов из Книги", desc: "Рекомендовать в первую очередь экспертные растительные варианты" },
  { id: "simple_dishes", name: "Простые блюда", desc: "Менее 5 основных ингредиентов в рецепте" },
  { id: "fast_variants", name: "Быстрые варианты", desc: "Менее 20 минут активного приготовления" },
  { id: "consider_chronic", name: "Учитывать медицинские ограничения", desc: "Скрывать рецепты со спорными раздражителями" }
];

interface SettingsScreenProps {
  onBack: () => void;
  currentDayIndex: number;
  onboardingComplete?: () => void;
}

type SettingsSection = "hub" | "notifications" | "nutrition" | "recipes" | "account";


// Helper component for holdable stepper buttons
function StepperButton({ onClick, disabled, children, className }: any) {
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const startHolding = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (disabled) return;
    onClick(); // trigger immediate single click
    const tid = setTimeout(() => {
      const iid = setInterval(() => {
        onClick();
      }, 100); // 100ms interval for fast scrolling
      setIntervalId(iid);
    }, 500); // 500ms delay before continuous
    setTimeoutId(tid);
  };

  const stopHolding = () => {
    if (timeoutId) clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
    setTimeoutId(null);
    setIntervalId(null);
  };

  return (
    <button
      type="button"
      onMouseDown={startHolding}
      onMouseUp={stopHolding}
      onMouseLeave={stopHolding}
      onTouchStart={startHolding}
      onTouchEnd={stopHolding}
      onTouchCancel={stopHolding}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export default function SettingsScreen({
  onBack,
  currentDayIndex,
  onboardingComplete,
}: SettingsScreenProps) {
  const profile = useAppStore((s) => s.userProfile);
  const setUserProfile = useAppStore((s) => s.setUserProfile);
  const setScreen = useAppStore((s) => s.setScreen);
  const p = profile;

  const [userName, setUserName] = useState(p.name || "");
  const [userGender, setUserGender] = useState<"female" | "male">((p.gender as "female" | "male") || "female");
  const [age, setAge] = useState(p.age || 28);
  const [height, setHeight] = useState(p.height || 165);
  const [weight, setWeight] = useState(p.weight || 50);
  const [systolic, setSystolic] = useState(p.systolic || 120);
  const [diastolic, setDiastolic] = useState(p.diastolic || 80);
  const [selectedChronic, setSelectedChronic] = useState<string[]>(p.chronicConditions || []);
  const [selectedGoals, setSelectedGoals] = useState<string[]>(p.healthGoals || []);
  
  const [activeSection, setActiveSection] = useState<SettingsSection>("hub");
  const [prefs, setPrefs] = useState<UserPreferences>(() => UserPreferencesStore.load());
  const [isSystemUsageHelpOpen, setIsSystemUsageHelpOpen] = useState<boolean>(false);
  
  // Draft states
  const [draftName, setDraftName] = useState(userName);
  const [draftGender, setDraftGender] = useState(userGender);
  const [draftAge, setDraftAge] = useState(age);
  const [draftHeight, setDraftHeight] = useState(height);
  const [draftWeight, setDraftWeight] = useState(weight);
  const [draftSystolic, setDraftSystolic] = useState(systolic);
  const [draftDiastolic, setDraftDiastolic] = useState(diastolic);
  const [draftRitualTime, setDraftRitualTime] = useState(profile?.ritualTime || "21:00");
  const [draftChronic, setDraftChronic] = useState<string[]>(() => [...selectedChronic]);
  const [draftGoals, setDraftGoals] = useState<string[]>(() => [...selectedGoals]);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [completedSections, setCompletedSections] = useState<string[]>([]);

  const SECTION_ORDER = ["account", "nutrition", "recipes", "notifications"];

  const getNextSection = () => {
    return SECTION_ORDER.find(s => !completedSections.includes(s)) || null;
  };

  const completeSection = (id: string) => {
    const updated = completedSections.includes(id) ? completedSections : [...completedSections, id];
    setCompletedSections(updated);
  };

  const isNewUser = !profile?.name && !profile?.hasSavedSettings;

  useEffect(() => {
    if (isNewUser) {
      setShowOnboardingModal(true);
    }
  }, [isNewUser])

  // Sync draft states with incoming props (e.g. from file exports or resets)
  useEffect(() => {
    setDraftName(userName);
    setDraftGender(userGender);
    setDraftAge(age);
    setDraftHeight(height);
    setDraftWeight(weight);
    setDraftSystolic(systolic);
    setDraftDiastolic(diastolic);
    setDraftChronic([...selectedChronic]);
    setDraftGoals([...selectedGoals]);
  }, [userName, userGender, age, height, weight, systolic, diastolic, selectedChronic, selectedGoals]);

  // Handle array comparisons
  const arraysEqual = (a: string[], b: string[]) => {
    if (a.length !== b.length) return false;
    const sa = [...a].sort();
    const sb = [...b].sort();
    return sa.every((v, idx) => v === sb[idx]);
  };

  // Compute if any draft state is different from compiled/saved states
  const hasChanges = () => {
    if (draftName !== userName) return true;
    if (draftGender !== userGender) return true;
    if (draftAge !== age) return true;
    if (draftHeight !== height) return true;
    if (draftWeight !== weight) return true;
    if (draftSystolic !== systolic) return true;
    if (draftDiastolic !== diastolic) return true;
    if (!arraysEqual(draftChronic, selectedChronic)) return true;
    if (!arraysEqual(draftGoals, selectedGoals)) return true;
    
    const baselinePrefs = UserPreferencesStore.load();
    if (JSON.stringify(prefs) !== JSON.stringify(baselinePrefs)) return true;
    
    return false;
  };

  const handleConfirmChanges = () => {
    setUserName(draftName);
    setUserGender(draftGender);
    setAge(draftAge);
    setHeight(draftHeight);
    setWeight(draftWeight);
    setSystolic(draftSystolic);
    setDiastolic(draftDiastolic);
    setSelectedChronic(draftChronic);
    setSelectedGoals(draftGoals);

    // Save preferences to local storage persistent store
    UserPreferencesStore.save(prefs);

    // Show temporary glow feedback toast
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
    }, 3000);
  };

  const handleSaveAccount = () => {
    setUserName(draftName);
    setUserGender(draftGender);
    setAge(draftAge);
    setHeight(draftHeight);
    setWeight(draftWeight);
    setSystolic(draftSystolic);
    setDiastolic(draftDiastolic);
    const data = { name: draftName, gender: draftGender, age: draftAge, height: draftHeight, weight: draftWeight, systolic: draftSystolic, diastolic: draftDiastolic, ritualTime: draftRitualTime };
    setUserProfile({ ...profile, ...data });
    api("/api/user/profile", { method: "POST", body: data }).catch(() => {});
    UserPreferencesStore.save(prefs);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
    completeSection("account");
    setActiveSection("hub");
  };

  const handleSaveNutrition = () => {
    setSelectedChronic(draftChronic);
    setSelectedGoals(draftGoals);
    const data = { ...profile, chronicConditions: draftChronic, healthGoals: draftGoals };
    setUserProfile(data);
    api("/api/user/profile", { method: "POST", body: data }).catch(() => {});
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
    completeSection("nutrition");
    setActiveSection("hub");
  };

  const handleSaveRecipes = () => {
    UserPreferencesStore.save(prefs);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
    completeSection("recipes");
    setActiveSection("hub");
  };

  const handleSaveNotifications = () => {
    UserPreferencesStore.save(prefs);
    const data = { ritualTime: draftRitualTime };
    setUserProfile({ ...profile, ...data });
    api("/api/user/profile", { method: "POST", body: data }).catch(() => {});
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
    completeSection("notifications");
    setActiveSection("hub");
  };

  const handleSaveAll = () => {
    setUserName(draftName);
    setUserGender(draftGender);
    setAge(draftAge);
    setHeight(draftHeight);
    setWeight(draftWeight);
    setSystolic(draftSystolic);
    setDiastolic(draftDiastolic);
    setSelectedChronic(draftChronic);
    setSelectedGoals(draftGoals);
    const data = {
      name: draftName, gender: draftGender, age: draftAge, height: draftHeight,
      weight: draftWeight, systolic: draftSystolic, diastolic: draftDiastolic,
      chronicConditions: draftChronic, healthGoals: draftGoals,
      hasSavedSettings: true,
      ritualTime: draftRitualTime,
    };
    setUserProfile({ ...profile, ...data });
    api("/api/user/profile", { method: "POST", body: data }).catch(() => {});
    UserPreferencesStore.save(prefs);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
    if (onboardingComplete) {
      onboardingComplete();
    }
  };

  // Keep track of active expanded notification item in the list
  const [activeNotifKey, setActiveNotifKey] = useState<keyof UserPreferences["notifications"] | null>("water");

  // Save preferences changes only to memory state
  const savePrefs = (newPrefs: UserPreferences) => {
    setPrefs(newPrefs);
  };

  // Sync window context whenever preferences are modified to influence server-side AI responses automatically!
  useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).currentScreenContext = {
      screen_id: "settings",
      screen_title: `Настройки и Персонализация — Раздел ${activeSection}`,
      current_status: "Тонкая настройка WFPB маршрута, лимитов, напоминаний и ограничений",
      selectedGoals: draftGoals,
      selectedChronic: draftChronic,
      user_input_values: {
        prefs: {
          nutritionSettings: prefs.nutritionSettings,
          recipePreferences: prefs.recipePreferences,
          notificationsEnabled: Object.keys(prefs.notifications).reduce((acc: any, key) => {
            acc[key] = prefs.notifications[key as keyof UserPreferences["notifications"]].enabled;
            return acc;
          }, {})
        },
        personal_measurements: {
          name: draftName,
          gender: draftGender,
          age: draftAge,
          height_cm: draftHeight,
          weight_kg: draftWeight,
          systolic_ad: draftSystolic,
          diastolic_ad: draftDiastolic
        }
      }
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "settings") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [prefs, activeSection, draftName, draftGender, draftAge, draftHeight, draftWeight, draftSystolic, draftDiastolic, draftChronic, draftGoals]);

  const toggleNotifEnabled = (key: keyof UserPreferences["notifications"]) => {
    const updated = { ...prefs };
    updated.notifications[key].enabled = !updated.notifications[key].enabled;
    savePrefs(updated);
  };

  const handleTimeRangeChange = (
    key: keyof UserPreferences["notifications"], 
    mode: "morning" | "day" | "evening" | "single", 
    value: string
  ) => {
    const updated = { ...prefs };
    const ranges = updated.notifications[key].timeWindows;
    if (mode === "single") {
      ranges.single = value;
    } else {
      ranges[mode] = value;
    }
    savePrefs(updated);
  };

  const handleToggleLifestyle = (traitId: string) => {
    const list = prefs.nutritionSettings.lifestyleHabits || [];
    const updatedList = list.includes(traitId) 
      ? list.filter(i => i !== traitId) 
      : [...list, traitId];
    
    const updated = {
      ...prefs,
      nutritionSettings: {
        ...prefs.nutritionSettings,
        lifestyleHabits: updatedList
      }
    };
    savePrefs(updated);
  };

  const toggleRecipePref = (prefId: "bookPriority" | "favoritesOnly" | "quickOption" | "simpleOption") => {
    const updated = {
      ...prefs,
      recipePreferences: {
        ...prefs.recipePreferences,
        [prefId]: !prefs.recipePreferences[prefId]
      }
    };
    savePrefs(updated);
  };

  const handleExportData = () => {
    const dump = {
      app: "Всё дело в еде!",
      timestamp: new Date().toISOString(),
      userName,
      gender: userGender,
      metrics: { age, height, weight, status: `${systolic}/${diastolic}` },
      goals: selectedGoals,
      chronic: selectedChronic,
      dayIndex: currentDayIndex,
      userPreferences: prefs
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
    const dlAnchorElem = document.createElement("a");
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `wfpb_diet_settings_${userName || "user"}.json`);
    dlAnchorElem.click();
  };

  const handleClearDiaryAndStats = () => {
    if (confirm("Вы уверены, что хотите полностью стереть историю Дневника Замеров и съеденных блюд? Это обнулит текущий прогресс.")) {
      console.log("handleClearDiaryAndStats called");
      alert("История замеров успешно очищена. Приложение перезапустит суточные индексы!");
      window.location.reload();
    }
  };

  const handleFullReset = () => {
    if (confirm("ВНИМАНИЕ: Это полностью удалит все ваши введённые цели, настройки уведомлений, личные метрики и перезагрузит приложение. Продолжить?")) {
      console.log("handleFullReset called");
      alert("Все данные успешно стерты. Приложение возвращено к начальному экрану.");
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-full" id="settings-module-screen">

      {/* One-time onboarding modal */}
      <AnimatePresence>
        {showOnboardingModal && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative mx-5 w-full max-w-sm rounded-3xl bg-white flex flex-col items-center text-center p-6 max-h-[85dvh] overflow-y-auto overscroll-contain"
              style={{ boxShadow: '0 0 40px rgba(34,197,94,0.3)' }}
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            >
              <img
                src={resolveAvatar({ toneGroup: 'positive', intent: 'cheerful_approval', intensity: 2 }).src}
                alt="Анна"
                className="w-20 h-20 object-contain rounded-full mb-4"
                referrerPolicy="no-referrer"
              />
              <h2 className="text-xl font-black text-gray-800 leading-tight mb-3">
                Фундамент твоего результата 📊
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed font-medium mb-6">
                Отсюда начинается твой путь к здоровью. Прямо сейчас я запускаю сбор данных для старта. Очень важно последовательно заполнить информацию во всех четырёх вкладках: настройки, питание, рецепты и аккаунт. Твои цели и параметры — это база, без которой я не смогу правильно выстроить твой личный 28-дневный маршрут. Максимум данных = максимальный результат. Сделаем всё как надо?
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowOnboardingModal(false)
                  setActiveSection('notifications')
                }}
                className="w-full max-w-[200px] py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-black text-[15px] shadow-lg hover:brightness-105 transition-all cursor-pointer active:scale-97"
              >
                Понятно
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable Interior container */}
      <div className="flex-1 overflow-y-auto px-5 pt-3 pb-8 select-none scrollbar-none max-h-[720px]">
        
        {/* Top Header Row with Back button to center hub, or inside hub to outer app */}
        <div className="flex items-center justify-between mb-4">
          <button 
            type="button"
            onClick={() => {
              if (activeSection === "hub") {
                onBack(); // Exit settings to my day/page
              } else {
                setActiveSection("hub"); // Return to settings main lists
              }
            }}
            className="w-10 h-10 rounded-full bg-[#FAFAFA] border border-gray-100 shadow-[0_2px_8px_rgba(43,49,55,0.02)] flex items-center justify-center text-text-sec hover:bg-white active:scale-95 transition-all duration-200 cursor-pointer"
            aria-label="Назад"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5] text-text-dark" />
          </button>
          
          <div className="flex items-center gap-1.5">
            <Settings className="w-4.5 h-4.5 text-brand-green-dark animate-spin-slow" />
            <span className="text-[13px] font-black text-brand-green-dark" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>Всё дело в еде!</span>
          </div>

          <div className="w-10 h-10" /> {/* Spacer */}
        </div>

        {/* Dynamic Inner screens animation container */}
        <AnimatePresence mode="wait">
          
          {/* SCREEN: HUB (Primary Settings Categories List) */}
          {activeSection === "hub" && (
            <motion.div
              key="settings-hub"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col"
            >
              {/* Slogan Title */}
              <div className="text-center flex flex-col gap-1.5 mb-6">
                <h2 
                  className="text-[26px] sm:text-[28px] font-bold text-text-dark leading-tight"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  Настройки
                </h2>
                <p 
                  className="text-[14px] sm:text-[15px] text-text-muted leading-snug px-3"
                  style={{ fontFamily: '"Calibri", sans-serif' }}
                >
                  Пространство персональной конфигурации вашего 28-дневного маршрута долголетия и лёгкости.
                </p>
              </div>

              {/* Settings hub entry cards */}
              <div className="flex flex-col gap-3">

                {/* 1. Personal Account And Data Control Card */}
                <button
                  type="button"
                  onClick={() => setActiveSection("account")}
                  className={`bg-gradient-to-br from-white to-purple-50/10 rounded-[22px] border border-purple-100/60 p-4 shadow-[0_4px_20px_rgba(139,92,246,0.08)] hover:shadow-[0_8px_25px_rgba(139,92,246,0.15)] flex items-center gap-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer w-full focus:outline-none ${
                    getNextSection() === "account" ? "animate-pulse ring-2 ring-brand-green-light/50" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                    <User className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span 
                      className="text-[17px] font-bold text-text-dark leading-tight"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      Аккаунт и данные
                    </span>
                    <span className="text-[12px] text-text-muted font-medium mt-0.5 leading-snug">
                      Метрики тела, экспорт данных в файл, очистка архивов
                    </span>
                  </div>
                </button>

                {/* 2. Nutrition and Goals Customizer Card */}
                <button
                  type="button"
                  onClick={() => setActiveSection("nutrition")}
                  className={`bg-gradient-to-br from-white to-emerald-50/10 rounded-[22px] border border-emerald-100/60 p-4 shadow-[0_4px_20px_rgba(16,185,129,0.08)] hover:shadow-[0_8px_25px_rgba(16,185,129,0.15)] flex items-center gap-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer w-full focus:outline-none ${
                    getNextSection() === "nutrition" ? "animate-pulse ring-2 ring-brand-green-light/50" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                    <Activity className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span 
                      className="text-[17px] font-bold text-text-dark leading-tight"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      Питание и цели
                    </span>
                    <span className="text-[12px] text-text-muted font-medium mt-0.5 leading-snug">
                      Чувствительность к сахару, цели здоровья, особенности ЖКТ
                    </span>
                  </div>
                </button>

                {/* 3. Recipes and Book Preferences Card */}
                <button
                  type="button"
                  onClick={() => setActiveSection("recipes")}
                  className={`bg-gradient-to-br from-white to-sky-50/10 rounded-[22px] border border-sky-100/60 p-4 shadow-[0_4px_20px_rgba(6,182,212,0.08)] hover:shadow-[0_8px_25px_rgba(6,182,212,0.15)] flex items-center gap-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer w-full focus:outline-none ${
                    getNextSection() === "recipes" ? "animate-pulse ring-2 ring-brand-green-light/50" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-550 shrink-0">
                    <BookOpen className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span 
                      className="text-[17px] font-bold text-text-dark leading-tight"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      Книга и рецепты
                    </span>
                    <span className="text-[12px] text-text-muted font-medium mt-0.5 leading-snug">
                      Приоритеты, любимые типы, простота блюд, время готовки
                    </span>
                  </div>
                </button>

                {/* 4. Notifications Category Card */}
                <button
                  type="button"
                  onClick={() => setActiveSection("notifications")}
                  className={`bg-gradient-to-br from-white to-amber-50/10 rounded-[22px] border border-amber-100/60 p-4 shadow-[0_4px_20px_rgba(245,158,11,0.08)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.15)] flex items-center gap-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer w-full focus:outline-none ${
                    getNextSection() === "notifications" ? "animate-pulse ring-2 ring-brand-green-light/50" : ""
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                    <Bell className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span 
                      className="text-[17px] font-bold text-text-dark leading-tight"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      Уведомления
                    </span>
                    <span className="text-[12px] text-text-muted font-medium mt-0.5 leading-snug">
                      Умные напоминания, фазы показа, превью карточек от Анны
                    </span>
                  </div>
                </button>

                {/* 5. Мои награды */}
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-rewards-screen"))}
                  className="bg-gradient-to-br from-white to-amber-50/10 rounded-[22px] border border-amber-100/60 p-4 shadow-[0_4px_20px_rgba(245,158,11,0.08)] hover:shadow-[0_8px_25px_rgba(245,158,11,0.15)] flex items-center gap-4 text-left transition-all duration-300 hover:scale-[1.02] active:scale-98 cursor-pointer w-full focus:outline-none"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                    <Trophy className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  <div className="flex-1 flex flex-col">
                    <span 
                      className="text-[17px] font-bold text-text-dark leading-tight"
                      style={{ fontFamily: '"Calibri", sans-serif' }}
                    >
                      Мои награды
                    </span>
                    <span className="text-[12px] text-text-muted font-medium mt-0.5 leading-snug">
                      Достижения и трофеи WFPB-пути
                    </span>
                  </div>
                </button>

              </div>

              {/* Collapsible System Info Spoiler */}
              <div className="mt-6 border border-slate-100 rounded-[22px] bg-white overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsSystemUsageHelpOpen(!isSystemUsageHelpOpen)}
                  className="w-full flex items-center justify-between p-4.5 text-left font-bold text-text-dark text-[14.5px] hover:bg-slate-50/50 transition-colors focus:outline-none cursor-pointer"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#64748B]" />
                    Как система использует ваши настройки?
                  </span>
                  <ChevronDown 
                    className={`w-4 h-4 text-text-muted transition-transform duration-300 ${isSystemUsageHelpOpen ? 'rotate-180' : ''}`} 
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {isSystemUsageHelpOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div 
                        className="px-4.5 pb-5 pt-1 text-[13px] text-text-sec leading-relaxed border-t border-slate-50 flex flex-col gap-3"
                        style={{ fontFamily: '"Calibri", sans-serif' }}
                      >
                        <p className="font-semibold text-text-dark">
                          Этот раздел помогает Системе выстроить ваш индивидуальный маршрут оздоровления.
                        </p>
                        <ul className="flex flex-col gap-2.5 list-none pl-0">
                          <li>
                            <strong className="text-text-dark">Уведомления:</strong> задают комфортный ритм. Система подскажет, когда выпить воду или готовиться ко сну, ориентируясь на ваши временные окна.
                          </li>
                          <li>
                            <strong className="text-text-dark">Питание и цели:</strong> формируют главный вектор. Система адаптирует меню и советы, строго учитывая ваши цели, особенности ЖКТ и пищевые ограничения.
                          </li>
                          <li>
                            <strong className="text-text-dark">Книга и рецепты:</strong> управляют вашей кулинарной базой, чтобы предлагать блюда нужной сложности и времени готовки.
                          </li>
                          <li>
                            <strong className="text-text-dark">Аккаунт и данные:</strong> надежно хранят вашу историю, метрики тела и прогресс.
                          </li>
                        </ul>
                        <p>
                          Каждая отметка здесь делает ваши ежедневные рекомендации точнее.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Start button - appears after all sections saved */}
              {completedSections.length === SECTION_ORDER.length && (
                <motion.div 
                  className="mt-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      handleSaveAll();
                    }}
                    className="w-full bg-gradient-to-r from-brand-green-bright to-brand-green-dark text-white font-bold py-4 px-6 rounded-[20px] shadow-[0_6px_20px_rgba(22,181,81,0.2)] hover:shadow-[0_8px_25px_rgba(22,181,81,0.3)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-[16px] border border-brand-green-deep/15 animate-pulse"
                    style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                  >
                    <Check className="w-5 h-5 stroke-[3] text-white" />
                    <span>Старт</span>
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* SCREEN: NOTIFICATIONS (Intense Event-Tracker & Window-Fitted Scheduling View) */}
          {activeSection === "notifications" && (
            <motion.div
              key="settings-notifications"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              {/* Title Section */}
              <div className="mb-4 flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#737C86]">Раздел 1 из 4</span>
                <h3 className="text-[22px] font-bold text-text-dark">Параметры уведомлений</h3>
                <p className="text-[13px] text-text-muted leading-tight">
                  Задайте временные окна сопровождения. Алгоритм выберет лучший биоритмический момент показа.
                </p>
              </div>

              {/* Anna Context Guide */}
              <div className="bg-emerald-50/60 rounded-[20px] p-4 flex gap-3 border border-emerald-100 flex-row items-start mb-4 text-left">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-emerald-200">
                  <img src={resolveAvatar({ toneGroup: 'positive', intent: 'cheerful_reminder', intensity: 2 }).src} alt="Анна" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex flex-col">
                    <span className="text-[14.5px] font-black text-brand-green-dark leading-none">Анна</span>
                    <span className="text-[11px] font-bold text-text-muted mt-0.5 leading-none">Советник WFPB</span>
                  </div>
                  <p className="text-[12.5px] text-brand-green-dark/95 font-semibold leading-relaxed mt-1.5">
                    Настройте комфортные временные окна. Я буду ориентироваться на них, посылая вам напоминания о воде, сне и замерах здоровья строго в нужный момент биоритма.
                  </p>
                </div>
              </div>

              {/* Event Cards Loop */}
              <div className="flex flex-col gap-3">
                {(Object.keys(prefs.notifications) as Array<keyof UserPreferences["notifications"]>).map((key) => {
                  const item = prefs.notifications[key];
                  const isExpanded = activeNotifKey === key;
                  
                  // Label maps for nice layout titles
                  const labelMap: Record<string, string> = {
                    water: "Напоминание про воду",
                    sleep: "Напоминание про сон",
                    measurements: "Напоминание про замеры",
                    habits: "Напоминание про привычки",
                    daySummary: "Напоминание про итог дня",
                    annaTip: "ИИ Совет дня от Анны"
                  };

                  const iconMap: Record<string, string> = {
                    water: "💧",
                    sleep: "🌙",
                    measurements: "📈",
                    habits: "✨",
                    daySummary: "📋",
                    annaTip: "💚"
                  };

                  return (
                    <div 
                      key={key} 
                      className={`bg-white rounded-[22px] border transition-all duration-300 overflow-hidden ${
                        isExpanded 
                          ? "border-emerald-200 shadow-[0_4px_16px_rgba(22,181,81,0.05)]" 
                          : "border-gray-100 shadow-sm"
                      }`}
                    >
                      {/* Interactive Header area */}
                      <div className="p-3.5 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveNotifKey(isExpanded ? null : key)}
                          className="flex-1 flex items-center gap-3 text-left cursor-pointer focus:outline-none"
                        >
                          <span className="text-[19px] bg-[#FAFAFA] w-9 h-9 rounded-xl flex items-center justify-center border border-gray-100">{iconMap[key]}</span>
                          <div className="flex flex-col">
                            <span className="text-[15px] font-bold text-text-dark leading-tight">{labelMap[key]}</span>
                            <span className="text-[11px] text-text-muted leading-none mt-1">
                              {item.enabled ? "Включено" : "Выключено"} • {item.timeWindows.mode === "three" ? "3 окна" : "1 окно"}
                            </span>
                          </div>
                        </button>

                        {/* Slide Toggle Switch */}
                        <button
                          type="button"
                          onClick={() => toggleNotifEnabled(key)}
                          className={`w-[48px] h-[26px] rounded-full p-0.5 transition-colors duration-300 focus:outline-none cursor-pointer relative ${
                            item.enabled ? "bg-brand-green-bright" : "bg-gray-200"
                          }`}
                        >
                          <motion.div 
                            layout
                            className="w-[22px] h-[22px] rounded-full bg-white shadow-sm"
                            style={{ x: item.enabled ? 20 : 0 }}
                          />
                        </button>
                      </div>

                      {/* Expandable options box */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-gray-50 flex flex-col gap-3 bg-[#FCFDFD]/60">
                          
                          {/* Explanation and AI metadata source label */}
                          <div className="flex flex-col gap-1.5 text-left bg-white p-3 rounded-2xl border border-gray-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.01)]">
                            <span className="text-[11px] font-bold uppercase text-brand-green-dark tracking-wide">Почему это нужно:</span>
                            <p className="text-[12.5px] text-text-sec leading-snug font-medium">{item.explanation}</p>
                            <div className="h-[1px] bg-slate-100 w-full my-1" />
                            <span className="text-[10.5px] font-semibold text-text-muted">
                              <span className="text-brand-green-bright font-black">⚙️ Источник триггера:</span> {item.sourceOfData}
                            </span>
                          </div>

                          {/* VISUAL PUSH NOTIFICATION WIDGET PREVIEW */}
                          <div className="flex flex-col gap-1.5 text-left">
                            <span className="text-[11px] font-bold uppercase text-[#737C86] tracking-wide px-1">Визуальный Превью уведомления:</span>
                            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 border border-white/10 shadow-[0_10px_25px_rgba(0,0,0,0.15)] relative overflow-hidden text-white">
                              {/* Glare reflect */}
                              <div className="absolute top-0 left-0 right-0 h-[25%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                              <div className="flex justify-between items-center text-[10px] text-white/50 font-bold mb-1 px-0.5">
                                <span className="flex items-center gap-1">🌱 {item.previewTemplate.badge} • сейчас</span>
                                <span>Всё дело в еде!</span>
                              </div>
                              <h5 className="text-[13px] font-bold text-emerald-355 leading-tight">{item.previewTemplate.title}</h5>
                              <p className="text-[12px] text-slate-200 leading-snug mt-1 font-normal italic">&laquo;{item.previewTemplate.body}&raquo;</p>
                              
                              <div className="mt-2 bg-white/10 text-emerald-300 rounded-[10px] py-1 px-2 text-[10.5px] flex items-center justify-between">
                                <span className="font-bold flex items-center gap-1">💬 Анна говорит:</span>
                                <span className="font-medium truncate max-w-[180px]">{item.annaPhrase}</span>
                              </div>
                            </div>
                          </div>

                          {/* RANGE CONFIGURATION ( утром / днём / вечером ) format "с - по" */}
                          <div className="flex flex-col gap-2 pt-1 text-left">
                            <div className="flex justify-between items-center px-1">
                              <span className="text-[11px] font-extrabold uppercase text-[#737C86] tracking-wide">Временные Интервалы Показа:</span>
                              <div className="flex gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...prefs };
                                    updated.notifications[key].timeWindows.mode = "single";
                                    savePrefs(updated);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-black tracking-wider uppercase transition-colors ${
                                    item.timeWindows.mode === "single" ? "bg-emerald-100 text-[#14532D]" : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  1 окно
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = { ...prefs };
                                    updated.notifications[key].timeWindows.mode = "three";
                                    savePrefs(updated);
                                  }}
                                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-black tracking-wider uppercase transition-colors ${
                                    item.timeWindows.mode === "three" ? "bg-emerald-100 text-[#14532D]" : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  3 окна
                                </button>
                              </div>
                            </div>

                            {item.timeWindows.mode === "three" ? (
                              <div className="grid grid-cols-3 gap-1.5">
                                <div className="bg-white p-2 border border-gray-100 shadow-sm rounded-xl text-center">
                                  <span className="text-[9.5px] text-text-muted uppercase font-black tracking-wide block mb-1">🌤️ Утро</span>
                                  <select 
                                    value={item.timeWindows.morning} 
                                    onChange={(e) => handleTimeRangeChange(key, "morning", e.target.value)}
                                    className="text-[11px] font-bold text-text-dark bg-gray-50 px-1 py-0.5 rounded border border-gray-100 focus:outline-none w-full"
                                  >
                                    <option value="06:30 - 08:30">06:30 - 08:30</option>
                                    <option value="07:30 - 10:00">07:30 - 10:00</option>
                                    <option value="08:00 - 10:30">08:00 - 10:30</option>
                                    <option value="09:00 - 11:30">09:00 - 11:30</option>
                                  </select>
                                </div>
                                <div className="bg-white p-2 border border-gray-100 shadow-sm rounded-xl text-center">
                                  <span className="text-[9.5px] text-text-muted uppercase font-black tracking-wide block mb-1">☀️ День</span>
                                  <select 
                                    value={item.timeWindows.day} 
                                    onChange={(e) => handleTimeRangeChange(key, "day", e.target.value)}
                                    className="text-[11px] font-bold text-text-dark bg-gray-50 px-1 py-0.5 rounded border border-gray-100 focus:outline-none w-full"
                                  >
                                    <option value="12:00 - 14:00">12:00 - 14:00</option>
                                    <option value="12:00 - 16:00">12:00 - 16:00</option>
                                    <option value="14:00 - 17:00">14:00 - 17:00</option>
                                    <option value="15:30 - 18:00">15:30 - 18:00</option>
                                  </select>
                                </div>
                                <div className="bg-white p-2 border border-gray-100 shadow-sm rounded-xl text-center">
                                  <span className="text-[9.5px] text-text-muted uppercase font-black tracking-wide block mb-1">🌙 Вечер</span>
                                  <select 
                                    value={item.timeWindows.evening} 
                                    onChange={(e) => handleTimeRangeChange(key, "evening", e.target.value)}
                                    className="text-[11px] font-bold text-text-dark bg-gray-50 px-1 py-0.5 rounded border border-gray-100 focus:outline-none w-full"
                                  >
                                    <option value="18:30 - 20:30">18:30 - 20:30</option>
                                    <option value="18:30 - 21:30">18:30 - 21:30</option>
                                    <option value="19:00 - 22:00">19:00 - 22:00</option>
                                    <option value="21:30 - 23:00">21:30 - 23:00</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-white p-2.5 border border-gray-100 shadow-sm rounded-xl text-center flex items-center justify-between gap-4">
                                <span className="text-[10.5px] text-text-muted uppercase font-black tracking-wide">⌚ Единый диапазон замера:</span>
                                <select 
                                  value={item.timeWindows.single || "09:00 - 12:00"} 
                                  onChange={(e) => handleTimeRangeChange(key, "single", e.target.value)}
                                  className="text-[12px] font-bold text-text-dark bg-gray-50 px-2.5 py-1 rounded border border-gray-100 focus:outline-none"
                                >
                                  <option value="07:00 - 11:00">Утро: с 07:00 до 11:00</option>
                                  <option value="09:00 - 12:00">Утро: с 09:00 до 12:00</option>
                                  <option value="12:00 - 16:00">День: с 12:00 до 16:00</option>
                                  <option value="18:00 - 22:00">Вечер: с 18:00 до 22:00</option>
                                </select>
                              </div>
                            )}
                          </div>

                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ritual Time Setting */}
              <div className="mt-4 bg-white border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] rounded-[24px] p-4 flex flex-col gap-2 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-bold text-text-dark">Вечерний Ритуал</span>
                  <select 
                    value={draftRitualTime} 
                    onChange={(e) => setDraftRitualTime(e.target.value)}
                    className="text-[13px] font-bold text-brand-green-dark bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 focus:outline-none"
                  >
                    <option value="19:00">19:00</option>
                    <option value="19:30">19:30</option>
                    <option value="20:00">20:00</option>
                    <option value="20:30">20:30</option>
                    <option value="21:00">21:00</option>
                    <option value="21:30">21:30</option>
                    <option value="22:00">22:00</option>
                    <option value="22:30">22:30</option>
                    <option value="23:00">23:00</option>
                  </select>
                </div>
                <p className="text-[12px] text-text-muted leading-snug">
                  Укажите комфортное время для подведения итогов дня с Анной. Ритуал будет открываться ежедневно в назначенное время.
                </p>
              </div>

              {/* Save button for Notifications */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleSaveNotifications}
                  className="w-full bg-gradient-to-r from-brand-green-bright to-brand-green-dark text-white font-bold py-3.5 px-6 rounded-[20px] shadow-[0_6px_20px_rgba(22,181,81,0.2)] hover:shadow-[0_8px_25px_rgba(22,181,81,0.3)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-[15px] border border-brand-green-deep/15"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  <Check className="w-5 h-5 stroke-[3] text-white" />
                  <span>Сохранить</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN: NUTRITION & GOALS (Primary Route & Chronic Selector from health-goals) */}
          {activeSection === "nutrition" && (
            <motion.div
              key="settings-nutrition"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 text-left"
            >
              {/* Head title */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#737C86]">Раздел 2 из 4</span>
                <h3 className="text-[22px] font-bold text-text-dark">Питание и цели здоровья</h3>
                <p className="text-[13px] text-text-muted leading-tight">
                  Параметры ЖКТ и терапевтические направления. Данные напрямую перестраивают поведение Анны и подбор рецептов.
                </p>
              </div>

              {/* Anna Context Guide */}
              <div className="bg-emerald-50/60 rounded-[20px] p-4 flex gap-3 border border-emerald-100 flex-row items-start mb-1 text-left">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-emerald-200">
                  <img src={resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'explanation', intensity: 3 }).src} alt="Анна" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex flex-col">
                    <span className="text-[14.5px] font-black text-[#15803D] leading-none">Анна</span>
                    <span className="text-[11px] font-bold text-text-muted mt-0.5 leading-none">Советник WFPB</span>
                  </div>
                  <p className="text-[12.5px] text-brand-green-dark/95 font-semibold leading-relaxed mt-1.5">
                    Укажите ваши цели и особенности здоровья. На основе этих меток я автоматически откалибрую ваши пищевые импульсы и исключу нежелательные триггеры ЖКТ.
                  </p>
                </div>
              </div>

              {/* 1. Primary main user goal selection */}
              <div className="flex flex-col gap-1.5 bg-white p-3.5 border border-emerald-100/60 shadow-[0_4px_20px_rgba(16,185,129,0.06)] rounded-3xl">
                <span className="text-[13px] font-bold text-[#14532D] flex items-center gap-1">
                  🎯 Основная довлеющая цель:
                </span>
                <p className="text-[11px] text-text-muted mb-1.5 leading-none">Управляет главным вектором ИИ-сопровождения</p>
                <select
                  value={prefs.nutritionSettings.primaryGoal}
                  onChange={(e) => {
                    const updated = {
                      ...prefs,
                      nutritionSettings: {
                        ...prefs.nutritionSettings,
                        primaryGoal: e.target.value
                      }
                    };
                    savePrefs(updated);
                    // Also make sure it is added inside draft states
                    if (!draftGoals.includes(e.target.value)) {
                      setDraftGoals(prev => [...prev, e.target.value]);
                    }
                  }}
                  className="font-bold text-[14px] text-text-dark bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 focus:outline-none w-full"
                >
                  {GOALS.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              {/* 2. Full identical targets selection */}
              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-extrabold text-[#111827] uppercase tracking-wide px-1 block mt-2">
                  Вторичные Цели и Направления:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {GOALS.filter(g => g.id !== prefs.nutritionSettings.primaryGoal).map(goal => {
                    const isChecked = draftGoals.includes(goal.id);
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => {
                          setDraftGoals(prev => 
                            prev.includes(goal.id) ? prev.filter(i => i !== goal.id) : [...prev, goal.id]
                          );
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all cursor-pointer ${
                          isChecked 
                            ? "bg-emerald-50 border-emerald-250 text-brand-green-dark shadow-[0_3px_12px_rgba(16,185,129,0.08)]" 
                             : "bg-[#FAFAFA] border-gray-100 text-text-sec hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-xs">{isChecked ? "✓" : "+"}</span>
                        <span>{goal.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Fully replicated list of Chronic/Gastro conditions */}
              <div className="flex flex-col gap-2">
                <span className="text-[14px] font-extrabold text-[#111827] uppercase tracking-wide px-1 block mt-2">
                  Хронические Состояния и особенности ЖКТ:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {CHRONIC_CONDITIONS.map(cond => {
                    const isChecked = draftChronic.includes(cond.id);
                    return (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => {
                          setDraftChronic(prev => 
                            prev.includes(cond.id) ? prev.filter(i => i !== cond.id) : [...prev, cond.id]
                          );
                          // Also keep synced inside local gastro issues list
                          const currentIssues = prefs.nutritionSettings.gastroIssues || [];
                          const updatedIssues = currentIssues.includes(cond.id)
                            ? currentIssues.filter(i => i !== cond.id)
                            : [...currentIssues, cond.id];
                          const updated = {
                            ...prefs,
                            nutritionSettings: {
                              ...prefs.nutritionSettings,
                              gastroIssues: updatedIssues
                            }
                          };
                          savePrefs(updated);
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold border transition-all cursor-pointer ${
                          isChecked 
                            ? "bg-rose-50 border-red-200 text-red-700 shadow-[0_3px_12px_rgba(239,68,68,0.06)]" 
                            : "bg-[#FAFAFA] border-gray-100 text-text-sec hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-xs">{isChecked ? "✓" : "+"}</span>
                        <span>{cond.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Lifestyle Traits and habits list */}
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[14px] font-extrabold text-[#111827] uppercase tracking-wide px-1">
                  Привычки и образ жизни:
                </span>
                <div className="flex flex-col gap-2">
                  {LIFESTYLE_TRAITS.map(trait => {
                    const list = prefs.nutritionSettings.lifestyleHabits || [];
                    const isChecked = list.includes(trait.id);
                    return (
                      <button
                        key={trait.id}
                        type="button"
                        onClick={() => handleToggleLifestyle(trait.id)}
                        className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                          isChecked 
                            ? "bg-emerald-50/70 border-emerald-200 shadow-[0_3px_12px_rgba(16,185,129,0.06)]" 
                            : "bg-white border-gray-100 hover:brightness-98"
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 ${
                          isChecked ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 bg-white"
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[13.5px] font-bold text-text-dark leading-tight">{trait.name}</span>
                          <span className="text-[11px] text-text-muted mt-0.5 leading-snug">{trait.desc}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save button for Nutrition */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleSaveNutrition}
                  className="w-full bg-gradient-to-r from-brand-green-bright to-brand-green-dark text-white font-bold py-3.5 px-6 rounded-[20px] shadow-[0_6px_20px_rgba(22,181,81,0.2)] hover:shadow-[0_8px_25px_rgba(22,181,81,0.3)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-[15px] border border-brand-green-deep/15"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  <Check className="w-5 h-5 stroke-[3] text-white" />
                  <span>Сохранить</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN: RECIPES & BOOK (Book settings & simple/fast options) */}
          {activeSection === "recipes" && (
            <motion.div
              key="settings-recipes"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 text-left"
            >
              {/* Header title */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#737C86]">Раздел 3 из 4</span>
                <h3 className="text-[22px] font-bold text-text-dark">Книга и настройки рецептов</h3>
                <p className="text-[13px] text-text-muted leading-tight">
                  Задайте критерии выдачи кулинарного каталога. Ограничения мгновенно отфильтруют рекомендуемые боулы.
                </p>
              </div>

              {/* Anna Context Guide */}
              <div className="bg-emerald-50/60 rounded-[20px] p-4 flex gap-3 border border-emerald-100 flex-row items-start mb-1 text-left">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-emerald-200">
                  <img src={resolveAvatar({ toneGroup: 'positive', intent: 'joy_and_support', intensity: 2 }).src} alt="Анна" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex flex-col">
                    <span className="text-[14.5px] font-black text-[#15803D] leading-none">Анна</span>
                    <span className="text-[11px] font-bold text-text-muted mt-0.5 leading-none">Советник WFPB</span>
                  </div>
                  <p className="text-[12.5px] text-brand-green-dark/95 font-semibold leading-relaxed mt-1.5">
                    Рецепты из Книги адаптируются под ваши привычки. Укажите ваши предпочтения по сложности, скорости приготовления и любимым видам блюд, чтобы я предлагала идеальные сочетания.
                  </p>
                </div>
              </div>

              {/* Preferences list toggle blocks */}
              <div className="flex flex-col gap-2.5">
                {RECIPE_DIET_PREFS.map(pref => {
                  let isChecked = false;
                  let mapKey: "bookPriority" | "favoritesOnly" | "quickOption" | "simpleOption" = "bookPriority";

                  if (pref.id === "book_priority") mapKey = "bookPriority";
                  if (pref.id === "simple_dishes") mapKey = "simpleOption";
                  if (pref.id === "fast_variants") mapKey = "quickOption";
                  if (pref.id === "consider_chronic") mapKey = "favoritesOnly"; 

                  isChecked = prefs.recipePreferences[mapKey];

                  return (
                    <button
                      key={pref.id}
                      type="button"
                      onClick={() => toggleRecipePref(mapKey)}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                        isChecked 
                          ? "bg-sky-50/75 border-sky-200 shadow-[0_4px_16px_rgba(6,182,212,0.1)] text-[#0C4A6E]" 
                          : "bg-white border-slate-100 hover:brightness-98 shadow-sm"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 mt-0.5 ${
                        isChecked ? "bg-sky-500 border-sky-500 text-white" : "border-gray-300 bg-white"
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[14px] font-bold text-text-dark leading-tight">{pref.name}</span>
                        <span className="text-[11.5px] text-text-muted mt-0.5 leading-snug">{pref.desc}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Fav types buttons zone */}
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-extrabold uppercase text-[#737C86] tracking-wide px-1">Любимые типы рецептов:</span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "salads", name: "Салаты 🌱", desc: "Свежая биоклетчатка" },
                    { id: "soups", name: "Супы 🥣", desc: "Комфорт для кишечника" },
                    { id: "dinners", name: "Горячие боулы 🍲", desc: "Сложные углеводы" },
                    { id: "desserts", name: "Десерты 🍌", desc: "Фруктовая сытость" }
                  ].map(type => {
                    const list = prefs.recipePreferences.favoriteTypes || [];
                    const isChecked = list.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          const updatedTypes = isChecked 
                            ? list.filter(t => t !== type.id) 
                            : [...list, type.id];
                          const updated = {
                            ...prefs,
                            recipePreferences: {
                              ...prefs.recipePreferences,
                              favoriteTypes: updatedTypes
                            }
                          };
                          savePrefs(updated);
                        }}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer ${
                          isChecked 
                            ? "bg-sky-50/60 border-sky-250 shadow-[0_3px_12px_rgba(6,182,212,0.08)]" 
                            : "bg-[#FAFAFA] border-slate-200/60 hover:bg-gray-50"
                        }`}
                      >
                        <span className="text-[13px] font-bold text-text-dark">{type.name}</span>
                        <span className="text-[10px] text-text-muted leading-tight">{type.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Save button for Recipes */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleSaveRecipes}
                  className="w-full bg-gradient-to-r from-brand-green-bright to-brand-green-dark text-white font-bold py-3.5 px-6 rounded-[20px] shadow-[0_6px_20px_rgba(22,181,81,0.2)] hover:shadow-[0_8px_25px_rgba(22,181,81,0.3)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-[15px] border border-brand-green-deep/15"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  <Check className="w-5 h-5 stroke-[3] text-white" />
                  <span>Сохранить</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* SCREEN: ACCOUNT & DATA (User variables, inputs, and database actions) */}
          {activeSection === "account" && (
            <motion.div
              key="settings-account"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5 text-left"
            >
              {/* Header title */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#737C86]">Раздел 4 из 4</span>
                <h3 className="text-[22px] font-bold text-text-dark">Аккаунт и управление данными</h3>
                <p className="text-[13px] text-text-muted leading-tight">
                  Ваши биологические метрики тела и инструменты резервного копирования истории пути.
                </p>
              </div>

              {/* Anna Context Guide */}
              <div className="bg-emerald-50/60 rounded-[20px] p-4 flex gap-3 border border-emerald-100 flex-row items-start mb-1 text-left">
                <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-emerald-200">
                  <img src={resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'understanding_nuances', intensity: 3 }).src} alt="Анна" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex flex-col">
                    <span className="text-[14.5px] font-black text-[#15803D] leading-none">Анна</span>
                    <span className="text-[11px] font-bold text-text-muted mt-0.5 leading-none">Советник WFPB</span>
                  </div>
                  <p className="text-[12.5px] text-brand-green-dark/95 font-semibold leading-relaxed mt-1.5">
                    Ваши биологические метрики помогают мне точнее рассчитывать КБЖУ, объём воды для очистки почек и плотность капиллярного тонуса. Держите эти показатели актуальными!
                  </p>
                </div>
              </div>

              {/* Personal measurements fields */}
              <div className="bg-gradient-to-br from-white to-purple-50/5 rounded-[24px] border border-purple-100/60 p-5 shadow-[0_4px_20px_rgba(139,92,246,0.06)] flex flex-col gap-4">
                
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Ваше имя:</span>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl text-[15px] font-bold text-text-dark bg-gray-50 border border-gray-100 focus:outline-none focus:border-purple-300 focus:bg-white"
                  />
                </div>

                {/* Gender toggle */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Ваш пол для обращений Анны:</span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDraftGender("female")}
                      className={`h-12 rounded-xl text-[14px] font-bold transition-all border-2 cursor-pointer ${
                        draftGender === "female" 
                          ? "bg-purple-50 border-purple-300 text-purple-700 shadow-[0_2px_12px_rgba(139,92,246,0.08)]" 
                          : "bg-[#FAFAFA] border-gray-100 text-text-sec hover:bg-gray-50"
                      }`}
                    >
                      Женский 👩
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraftGender("male")}
                      className={`h-12 rounded-xl text-[14px] font-bold transition-all border-2 cursor-pointer ${
                        draftGender === "male" 
                          ? "bg-purple-50 border-purple-300 text-purple-700 shadow-[0_2px_12px_rgba(139,92,246,0.08)]" 
                          : "bg-[#FAFAFA] border-gray-100 text-text-sec hover:bg-gray-50"
                      }`}
                    >
                      Мужской 👨
                    </button>
                  </div>
                </div>

                {/* Age stepper */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Возраст:</span>
                  <div className="flex items-center justify-center gap-3">
                    <StepperButton
                      onClick={() => setDraftAge(prev => Math.max(1, prev - 1))}
                      disabled={draftAge <= 1}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                    <div className="min-w-[80px] h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <span className="text-[20px] font-bold text-text-dark">{draftAge}</span>
                    </div>
                    <StepperButton
                      onClick={() => setDraftAge(prev => Math.min(120, prev + 1))}
                      disabled={draftAge >= 120}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                  </div>
                </div>

                {/* Height stepper */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Рост (см):</span>
                  <div className="flex items-center justify-center gap-3">
                    <StepperButton
                      onClick={() => setDraftHeight(prev => Math.max(50, prev - 1))}
                      disabled={draftHeight <= 50}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                    <div className="min-w-[80px] h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <span className="text-[20px] font-bold text-text-dark">{draftHeight}</span>
                    </div>
                    <StepperButton
                      onClick={() => setDraftHeight(prev => Math.min(250, prev + 1))}
                      disabled={draftHeight >= 250}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                  </div>
                </div>

                {/* Weight stepper */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Вес (кг):</span>
                  <div className="flex items-center justify-center gap-3">
                    <StepperButton
                      onClick={() => setDraftWeight(prev => {
                        const step = 0.1
                        return Math.round(Math.max(20, prev - step) * 100) / 100
                      })}
                      disabled={draftWeight <= 20}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                    <div className="min-w-[100px] h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <span className="text-[20px] font-bold text-text-dark">{draftWeight.toFixed(1)}</span>
                    </div>
                    <StepperButton
                      onClick={() => setDraftWeight(prev => {
                        const step = 0.1
                        return Math.round(Math.min(300, prev + step) * 100) / 100
                      })}
                      disabled={draftWeight >= 300}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                  </div>
                </div>

                {/* Systolic pressure stepper */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Верхнее давление (систола):</span>
                  <div className="flex items-center justify-center gap-3">
                    <StepperButton
                      onClick={() => setDraftSystolic(prev => Math.max(60, prev - 5))}
                      disabled={draftSystolic <= 60}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                    <div className="min-w-[80px] h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <span className="text-[20px] font-bold text-text-dark">{draftSystolic}</span>
                    </div>
                    <StepperButton
                      onClick={() => setDraftSystolic(prev => Math.min(220, prev + 5))}
                      disabled={draftSystolic >= 220}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                  </div>
                </div>

                {/* Diastolic pressure stepper */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-extrabold uppercase text-[#737C86]">Нижнее давление (диастола):</span>
                  <div className="flex items-center justify-center gap-3">
                    <StepperButton
                      onClick={() => setDraftDiastolic(prev => Math.max(30, prev - 5))}
                      disabled={draftDiastolic <= 30}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Minus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                    <div className="min-w-[80px] h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                      <span className="text-[20px] font-bold text-text-dark">{draftDiastolic}</span>
                    </div>
                    <StepperButton
                      onClick={() => setDraftDiastolic(prev => Math.min(140, prev + 5))}
                      disabled={draftDiastolic >= 140}
                      className="w-12 h-12 rounded-xl bg-white border-2 border-gray-100 shadow-sm flex items-center justify-center text-text-sec active:scale-90 hover:border-purple-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Plus className="w-5 h-5 stroke-[2.5]" />
                    </StepperButton>
                  </div>
                </div>

              </div>

              {/* Maintenance database triggers */}
              <div className="flex flex-col gap-2.5 mt-2">
                
                {/* Export anchor */}
                <button
                  type="button"
                  onClick={handleExportData}
                  className="w-full bg-[#FCFDFD] hover:bg-gray-50 border border-gray-150 p-3.5 rounded-[18px] flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-bold text-text-dark font-sans leading-none">Экспорт всех параметров</span>
                    <span className="text-[10.5px] text-text-muted mt-0.5 leading-none">Сохранить настройки и прогресс в файл резервной копии</span>
                  </div>
                  <Download className="w-5 h-5 text-purple-500 shrink-0 ml-2" />
                </button>

                {/* Reset Diary and measures */}
                <button
                  type="button"
                  onClick={handleClearDiaryAndStats}
                  className="w-full bg-[#FFFDFD] hover:bg-red-50/20 border border-red-100/60 p-3.5 rounded-[18px] flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer shadow-sm"
                >
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-bold text-red-650 leading-none">История дневника за 3 дня</span>
                    <span className="text-[10.5px] text-text-muted mt-0.5 leading-none">Удалить только историю дневных замеров ЖКТ</span>
                  </div>
                  <Trash2 className="w-5 h-5 text-red-400 shrink-0 ml-2 animate-pulse" />
                </button>

                {/* Deep hard factory reset */}
                <button
                  type="button"
                  onClick={handleFullReset}
                  className="w-full bg-red-500 text-white p-3.5 rounded-[18px] flex items-center justify-between text-left transition-all active:scale-98 cursor-pointer shadow-md"
                >
                  <div className="flex flex-col">
                    <span className="text-[13.5px] font-bold text-white leading-none">Удалить все данные</span>
                    <span className="text-[10.5px] text-red-100 mt-0.5 leading-none">Сбросить настройки, имя, цели и все замеры</span>
                  </div>
                  <Trash2 className="w-5 h-5 text-white shrink-0 ml-2" />
                </button>

              </div>

              {/* Save button for Account */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleSaveAccount}
                  className="w-full bg-gradient-to-r from-brand-green-bright to-brand-green-dark text-white font-bold py-3.5 px-6 rounded-[20px] shadow-[0_6px_20px_rgba(22,181,81,0.2)] hover:shadow-[0_8px_25px_rgba(22,181,81,0.3)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-[15px] border border-brand-green-deep/15"
                  style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
                >
                  <Check className="w-5 h-5 stroke-[3] text-white" />
                  <span>Сохранить</span>
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* Persistent Symmetrical Bottom control bar inside Settings context */}
      <div className="w-full mt-auto">
        <BottomBar 
          onHomeClick={onBack}
          onDiaryClick={() => {}} // Simple triggers inside popup navigation blocker settings
          onAnalyticsClick={() => {}}
          onProfileClick={() => setActiveSection("hub")}
          activeTab="cellular-impulse" // Highlights Settings icon cleanly for the current route
        />
      </div>

    </div>
  );
}
