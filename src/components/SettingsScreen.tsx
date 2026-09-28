import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  Settings,
} from "lucide-react";
import BottomBar from "./BottomBar";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { browserTimezone, validateIanaTimeZone } from "../shared/dates";
import { getUserTimeZone, setUserTimeZone } from "../shared/timeZoneStore";
import {
  UserPreferencesStore,
  UserPreferences,
} from "../services/UserPreferencesStore";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import type { SettingsSection } from "./settings/settingsData";
import SettingsHub from "./settings/SettingsHub";
import SettingsNotifications from "./settings/SettingsNotifications";
import SettingsNutrition from "./settings/SettingsNutrition";
import SettingsRecipes from "./settings/SettingsRecipes";
import SettingsAccount from "./settings/SettingsAccount";

interface SettingsScreenProps {
  onBack: () => void;
  currentDayIndex: number;
  onboardingComplete?: () => void;
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
  const [draftTimeZone, setDraftTimeZone] = useState<string>(() => profile?.timeZone || getUserTimeZone());
  const [timeZoneError, setTimeZoneError] = useState<string | null>(null);
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
    let tz: string | null = null;
    if (draftTimeZone.trim()) {
      try {
        validateIanaTimeZone(draftTimeZone.trim());
        tz = draftTimeZone.trim();
      } catch {
        setTimeZoneError(`Невалидная IANA-зона: "${draftTimeZone.trim()}"`);
        return;
      }
    }
    setUserName(draftName);
    setUserGender(draftGender);
    setAge(draftAge);
    setHeight(draftHeight);
    setWeight(draftWeight);
    setSystolic(draftSystolic);
    setDiastolic(draftDiastolic);
    const data = { name: draftName, gender: draftGender, age: draftAge, height: draftHeight, weight: draftWeight, systolic: draftSystolic, diastolic: draftDiastolic, timeZone: tz ?? undefined };
    setUserProfile({ ...profile, ...data });
    if (tz) setUserTimeZone(tz);
    api("/api/user/profile", { method: "POST", body: data }).catch(() => {});
    UserPreferencesStore.save(prefs);
    setTimeZoneError(null);
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

  // Preserve legacy helpers to keep business logic surface identical
  void hasChanges;
  void handleConfirmChanges;
  void showSavedToast;
  void browserTimezone;
  void currentDayIndex;

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
            <SettingsHub
              onOpenSection={setActiveSection}
              getNextSection={getNextSection}
              isSystemUsageHelpOpen={isSystemUsageHelpOpen}
              onToggleSystemUsageHelp={() => setIsSystemUsageHelpOpen(!isSystemUsageHelpOpen)}
              completedSections={completedSections}
              sectionOrderLength={SECTION_ORDER.length}
              onSaveAll={handleSaveAll}
            />
          )}

          {/* SCREEN: NOTIFICATIONS (Intense Event-Tracker & Window-Fitted Scheduling View) */}
          {activeSection === "notifications" && (
            <SettingsNotifications
              prefs={prefs}
              savePrefs={savePrefs}
              toggleNotifEnabled={toggleNotifEnabled}
              handleTimeRangeChange={handleTimeRangeChange}
              activeNotifKey={activeNotifKey}
              setActiveNotifKey={setActiveNotifKey}
              onSave={handleSaveNotifications}
            />
          )}

          {/* SCREEN: NUTRITION & GOALS (Primary Route & Chronic Selector from health-goals) */}
          {activeSection === "nutrition" && (
            <SettingsNutrition
              prefs={prefs}
              savePrefs={savePrefs}
              draftGoals={draftGoals}
              setDraftGoals={setDraftGoals}
              draftChronic={draftChronic}
              setDraftChronic={setDraftChronic}
              handleToggleLifestyle={handleToggleLifestyle}
              onSave={handleSaveNutrition}
            />
          )}

          {/* SCREEN: RECIPES & BOOK (Book settings & simple/fast options) */}
          {activeSection === "recipes" && (
            <SettingsRecipes
              prefs={prefs}
              savePrefs={savePrefs}
              toggleRecipePref={toggleRecipePref}
              onSave={handleSaveRecipes}
            />
          )}

          {/* SCREEN: ACCOUNT & DATA (User variables, inputs, and database actions) */}
          {activeSection === "account" && (
            <SettingsAccount
              draftName={draftName}
              setDraftName={setDraftName}
              draftGender={draftGender}
              setDraftGender={setDraftGender}
              draftAge={draftAge}
              setDraftAge={setDraftAge}
              draftHeight={draftHeight}
              setDraftHeight={setDraftHeight}
              draftWeight={draftWeight}
              setDraftWeight={setDraftWeight}
              draftSystolic={draftSystolic}
              setDraftSystolic={setDraftSystolic}
              draftDiastolic={draftDiastolic}
              setDraftDiastolic={setDraftDiastolic}
              draftTimeZone={draftTimeZone}
              setDraftTimeZone={setDraftTimeZone}
              timeZoneError={timeZoneError}
              setTimeZoneError={setTimeZoneError}
              onSave={handleSaveAccount}
            />
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
