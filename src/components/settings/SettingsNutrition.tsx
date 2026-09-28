import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { resolveAvatar } from "../../utils/annaAvatarResolver";
import type { UserPreferences } from "../../services/UserPreferencesStore";
import { GOALS, LIFESTYLE_TRAITS } from "./settingsData";
import AnnaSettingsCard from "./AnnaSettingsCard";
import SettingsSaveButton from "./SettingsSaveButton";
import iconStomach from "../../assets/images/settings/19.webp";
import iconMetabolism from "../../assets/images/settings/20.webp";
import iconCardio from "../../assets/images/settings/21.webp";
import iconAllergies from "../../assets/images/settings/22.webp";
import iconJoints from "../../assets/images/settings/23.webp";
import iconNeuro from "../../assets/images/settings/24.webp";
import iconTarget from "../../assets/images/settings/25.webp";
import iconSprout from "../../assets/images/settings/26.webp";
import iconSunrise from "../../assets/images/settings/27.webp";

const HABIT_THEMES = [
  {
    bg: "bg-gradient-to-r from-indigo-100/70 via-indigo-50/40 to-white",
    checkBg: "bg-indigo-500",
    offBorder: "border-indigo-200",
  },
  {
    bg: "bg-gradient-to-r from-purple-100/70 via-purple-50/40 to-white",
    checkBg: "bg-purple-500",
    offBorder: "border-purple-200",
  },
  {
    bg: "bg-gradient-to-r from-sky-100/70 via-sky-50/40 to-white",
    checkBg: "bg-sky-500",
    offBorder: "border-sky-200",
  },
  {
    bg: "bg-gradient-to-r from-amber-100/70 via-amber-50/40 to-white",
    checkBg: "bg-amber-500",
    offBorder: "border-amber-200",
  },
  {
    bg: "bg-gradient-to-r from-rose-100/70 via-rose-50/40 to-white",
    checkBg: "bg-rose-500",
    offBorder: "border-rose-200",
  },
  {
    bg: "bg-gradient-to-r from-teal-100/70 via-teal-50/40 to-white",
    checkBg: "bg-teal-500",
    offBorder: "border-teal-200",
  },
];

interface ChronicItem {
  id: string;
  label: string;
}

interface ChronicCategory {
  id: string;
  title: string;
  icon: string;
  cardBg: string;
  activeChip: string;
  chipShadow: string;
  badge: string;
  items: ChronicItem[];
}

// ВАЖНО: в draftChronic / gastroIssues хранятся те же строковые id,
// что и раньше (совместимость со стором, бэкендом, MyPageScreen и generateAnnaTip).
// Русские названия — только подписи. Существующий id "diabetes" привязан к
// пункту "Диабет 2 типа" (наиболее частая трактовка прежнего общего "Диабет").
const CHRONIC_CATEGORIES: ChronicCategory[] = [
  {
    id: "gi",
    title: "ЖКТ и пищеварение",
    icon: iconStomach,
    cardBg: "bg-gradient-to-r from-emerald-100/80 via-emerald-50/50 to-white border-emerald-200",
    activeChip: "from-emerald-500 to-teal-500",
    chipShadow: "shadow-emerald-200",
    badge: "bg-emerald-500 text-white",
    items: [
      { id: "gastritis", label: "Гастрит" },
      { id: "reflux", label: "Рефлюкс / ГЭРБ" },
      { id: "ibs", label: "СРК" },
      { id: "constipation", label: "Запоры" },
      { id: "diarrhea", label: "Диарея" },
      { id: "bloating", label: "Вздутие / метеоризм" },
      { id: "pancreatitis", label: "Панкреатит" },
      { id: "gallstones", label: "Камни в желчном" },
      { id: "gallbladder_removed", label: "Удалён желчный" },
      { id: "liver", label: "Болезни печени" },
      { id: "ibd", label: "ВЗК (колит / Крон)" },
    ],
  },
  {
    id: "metabolism",
    title: "Обмен веществ и гормоны",
    icon: iconMetabolism,
    cardBg: "bg-gradient-to-r from-amber-100/80 via-amber-50/50 to-white border-amber-200",
    activeChip: "from-amber-500 to-orange-500",
    chipShadow: "shadow-amber-200",
    badge: "bg-amber-500 text-white",
    items: [
      { id: "diabetes_t1", label: "Диабет 1 типа" },
      { id: "diabetes", label: "Диабет 2 типа" },
      { id: "insulin_resistance", label: "Инсулинорезистентность" },
      { id: "prediabetes", label: "Предиабет" },
      { id: "hypothyroidism", label: "Гипотиреоз" },
      { id: "hyperthyroidism", label: "Гипертиреоз" },
      { id: "ait", label: "АИТ" },
      { id: "gout", label: "Подагра" },
      { id: "pcos", label: "СПКЯ" },
      { id: "menopause", label: "Менопауза" },
      { id: "osteoporosis", label: "Остеопороз" },
    ],
  },
  {
    id: "cardio",
    title: "Сердце, сосуды и почки",
    icon: iconCardio,
    cardBg: "bg-gradient-to-r from-rose-100/80 via-rose-50/50 to-white border-rose-200",
    activeChip: "from-rose-500 to-red-500",
    chipShadow: "shadow-rose-200",
    badge: "bg-rose-500 text-white",
    items: [
      { id: "hypertension", label: "Гипертония" },
      { id: "hypotension", label: "Гипотония" },
      { id: "cholesterol", label: "Высокий холестерин" },
      { id: "atherosclerosis", label: "Атеросклероз" },
      { id: "edema", label: "Склонность к отёкам" },
      { id: "oxalate_stones", label: "Оксалатные камни" },
      { id: "urate_stones", label: "Уратные камни" },
      { id: "kidneys", label: "Болезни почек" },
    ],
  },
  {
    id: "allergy",
    title: "Непереносимости и аллергии",
    icon: iconAllergies,
    cardBg: "bg-gradient-to-r from-purple-100/80 via-purple-50/50 to-white border-purple-200",
    activeChip: "from-purple-500 to-violet-500",
    chipShadow: "shadow-purple-200",
    badge: "bg-purple-500 text-white",
    items: [
      { id: "celiac", label: "Целиакия" },
      { id: "gluten_sensitivity", label: "Чувствительность к глютену" },
      { id: "lactose_intolerance", label: "Непереносимость лактозы" },
      { id: "milk_allergy", label: "Аллергия на молоко" },
      { id: "nut_allergy", label: "Аллергия на орехи" },
      { id: "soy_allergy", label: "Аллергия на сою" },
      { id: "histamine", label: "Гистаминоз" },
      { id: "food_allergy_other", label: "Пищевая аллергия (др.)" },
      { id: "allergy", label: "Аллергия" },
    ],
  },
  {
    id: "joints",
    title: "Суставы, дыхание и кожа",
    icon: iconJoints,
    cardBg: "bg-gradient-to-r from-teal-100/80 via-teal-50/50 to-white border-teal-200",
    activeChip: "from-teal-500 to-cyan-500",
    chipShadow: "shadow-teal-200",
    badge: "bg-teal-500 text-white",
    items: [
      { id: "arthritis", label: "Артрит" },
      { id: "arthrosis", label: "Артроз" },
      { id: "joint_pain", label: "Боли в суставах" },
      { id: "asthma", label: "Астма" },
      { id: "hay_fever", label: "Поллиноз (пыльца)" },
      { id: "dermatitis", label: "Дерматит / псориаз" },
      { id: "autoimmune", label: "Аутоиммунные болезни" },
      { id: "thyroid", label: "Заболевания щитовидной железы" },
    ],
  },
  {
    id: "neuro",
    title: "Нервная система, сон, тонус",
    icon: iconNeuro,
    cardBg: "bg-gradient-to-r from-indigo-100/80 via-indigo-50/50 to-white border-indigo-200",
    activeChip: "from-indigo-500 to-blue-500",
    chipShadow: "shadow-indigo-200",
    badge: "bg-indigo-500 text-white",
    items: [
      { id: "fatigue", label: "Хроническая усталость" },
      { id: "weakness", label: "Упадок сил" },
      { id: "anemia", label: "Анемия" },
      { id: "insomnia", label: "Бессонница" },
      { id: "anxiety", label: "Тревожность" },
      { id: "depression", label: "Депрессия / апатия" },
      { id: "migraine", label: "Мигрень" },
    ],
  },
];

interface SettingsNutritionProps {
  prefs: UserPreferences;
  savePrefs: (p: UserPreferences) => void;
  draftGoals: string[];
  setDraftGoals: React.Dispatch<React.SetStateAction<string[]>>;
  draftChronic: string[];
  setDraftChronic: React.Dispatch<React.SetStateAction<string[]>>;
  handleToggleLifestyle: (traitId: string) => void;
  onSave: () => void;
}

export default function SettingsNutrition({
  prefs,
  savePrefs,
  draftGoals,
  setDraftGoals,
  draftChronic,
  setDraftChronic,
  handleToggleLifestyle,
  onSave,
}: SettingsNutritionProps) {
  // Локальный UI-стейт (на бизнес-логику не влияет)
  const [isPrimaryOpen, setIsPrimaryOpen] = useState(false);
  const [isSecondaryGoalsOpen, setIsSecondaryGoalsOpen] = useState(false);
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  // Тот же двойной апдейт, что и раньше: draftChronic + gastroIssues в prefs
  const toggleChronic = (id: string) => {
    setDraftChronic((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
    const currentIssues = prefs.nutritionSettings.gastroIssues || [];
    const updatedIssues = currentIssues.includes(id)
      ? currentIssues.filter((i) => i !== id)
      : [...currentIssues, id];
    savePrefs({
      ...prefs,
      nutritionSettings: {
        ...prefs.nutritionSettings,
        gastroIssues: updatedIssues,
      },
    });
  };

  const selectPrimaryGoal = (goalId: string) => {
    savePrefs({
      ...prefs,
      nutritionSettings: {
        ...prefs.nutritionSettings,
        primaryGoal: goalId,
      },
    });
    // Also make sure it is added inside draft states
    if (!draftGoals.includes(goalId)) {
      setDraftGoals((prev) => [...prev, goalId]);
    }
    setIsPrimaryOpen(false);
  };

  const primaryGoalName =
    GOALS.find((g) => g.id === prefs.nutritionSettings.primaryGoal)?.name ?? "Выберите цель";

  const selectedGoals = draftGoals.filter((id) => id !== prefs.nutritionSettings.primaryGoal);

  return (
    <motion.div
      key="settings-nutrition"
      initial={{ opacity: 0, x: 15 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -15 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col gap-5 text-left max-w-full overflow-x-hidden"
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
      <div className="mb-1">
        <AnnaSettingsCard
          avatarSrc={resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'explanation', intensity: 3 }).src}
          theme="mint"
          text="Укажите ваши цели и особенности здоровья. На основе этих меток я автоматически откалибрую ваши пищевые импульсы и исключу нежелательные триггеры ЖКТ."
        />
      </div>

      {/* 1. Primary main user goal selection */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-emerald-100/70 via-emerald-50/40 to-white shadow-[0_4px_20px_rgba(16,185,129,0.08)] border border-white/80 mb-4 relative">
        <div className="flex items-center gap-2 mb-1">
          <img src={iconTarget} alt="" className="w-5 h-5 object-contain" draggable={false} />
          <span className="text-[14px] font-bold text-slate-800">Основная довлеющая цель:</span>
        </div>
        <p className="text-[11.5px] text-slate-500">Управляет главным вектором ИИ-сопровождения</p>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsPrimaryOpen((v) => !v)}
            aria-expanded={isPrimaryOpen}
            className="w-full mt-2.5 bg-white/95 border border-emerald-300 hover:border-emerald-400 rounded-2xl px-3.5 py-2.5 flex items-center justify-between text-[13px] font-semibold text-slate-800 shadow-xs cursor-pointer transition-all outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            <span className="truncate">{primaryGoalName}</span>
            <ChevronDown
              className={`w-4 h-4 text-emerald-600 transition-transform duration-200 shrink-0 ml-2 ${isPrimaryOpen ? "rotate-180" : ""}`}
            />
          </button>
          <AnimatePresence>
            {isPrimaryOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsPrimaryOpen(false)} />
                <motion.ul
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className="absolute left-0 right-0 top-full max-h-56 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border border-emerald-100 shadow-xl rounded-2xl bg-white mt-1 z-30 p-1"
                >
                  {GOALS.map((g) => {
                    const isActive = g.id === prefs.nutritionSettings.primaryGoal;
                    return (
                      <li key={g.id}>
                        <button
                          type="button"
                          onClick={() => selectPrimaryGoal(g.id)}
                          className={`w-full p-2.5 rounded-lg text-[12.5px] transition-colors flex items-center justify-between cursor-pointer text-left ${
                            isActive
                              ? "bg-emerald-100/60 font-bold text-emerald-900"
                              : "font-medium hover:bg-emerald-50 text-slate-700"
                          }`}
                        >
                          <span>{g.name}</span>
                          {isActive && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3] shrink-0 ml-2" />}
                        </button>
                      </li>
                    );
                  })}
                </motion.ul>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. Secondary goals — спойлер-аккордеон как хронические состояния */}
      <div className="flex flex-col min-w-0">
        <button
          type="button"
          onClick={() => setIsSecondaryGoalsOpen((v) => !v)}
          aria-expanded={isSecondaryGoalsOpen}
          className="w-full h-11 px-3.5 rounded-2xl flex items-center justify-between cursor-pointer border border-emerald-200 mb-2 shadow-[0_2px_10px_rgba(16,185,129,0.04)] bg-gradient-to-r from-emerald-100/80 via-emerald-50/50 to-white transition-all"
        >
          <span className="flex items-center gap-2 min-w-0">
            <img src={iconSprout} alt="" className="w-6 h-6 object-contain shrink-0" draggable={false} />
            <span className="text-[13px] font-bold text-slate-800 truncate">Вторичные цели и направления</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0 ml-2">
            {selectedGoals.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white shadow-xs">
                ({selectedGoals.length})
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSecondaryGoalsOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>
        <AnimatePresence initial={false}>
          {isSecondaryGoalsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="p-2.5 mb-3 bg-white/80 rounded-2xl border border-emerald-100/60 shadow-xs flex flex-wrap gap-1.5">
                {GOALS.filter((g) => g.id !== prefs.nutritionSettings.primaryGoal).map((goal) => {
                  const isSelected = draftGoals.includes(goal.id);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => {
                        setDraftGoals((prev) =>
                          prev.includes(goal.id) ? prev.filter((i) => i !== goal.id) : [...prev, goal.id]
                        );
                      }}
                      className={
                        isSelected
                          ? "px-2.5 py-1 rounded-full text-[11.5px] font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-xs -translate-y-0.5 border-0 flex items-center gap-1 transition-all active:scale-95"
                          : "px-2.5 py-1 rounded-full text-[11.5px] font-medium bg-slate-100/80 text-slate-700 hover:bg-emerald-50/50 border border-slate-200/50 transition-all active:scale-95"
                      }
                    >
                      {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                      <span>{goal.name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 3. Chronic conditions accordions */}
      <div className="flex flex-col">
        <span className="text-[13.5px] font-bold text-slate-800 uppercase tracking-wide px-1 block mb-2.5">
          Хронические состояния и особенности
        </span>
        <div className="flex flex-col">
          {CHRONIC_CATEGORIES.map((cat) => {
            const isOpen = openCategories.includes(cat.id);
            const selectedCount = cat.items.filter((i) => draftChronic.includes(i.id)).length;
            return (
              <div key={cat.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  aria-expanded={isOpen}
                  className={`w-full min-h-[44px] px-3.5 rounded-2xl flex items-center justify-between cursor-pointer border mb-2 shadow-[0_2px_10px_rgba(0,0,0,0.03)] ${cat.cardBg}`}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <img src={cat.icon} alt="" className="w-6 h-6 object-contain shrink-0" draggable={false} />
                    <span className="text-[13px] font-bold text-slate-800 truncate">{cat.title}</span>
                  </span>
                  <span className="flex items-center gap-1.5 shrink-0 ml-2">
                    {selectedCount > 0 && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cat.badge}`}>
                        ({selectedCount})
                      </span>
                    )}
                    <ChevronDown
                      className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap gap-1.5 p-2 mb-2 bg-white/70 rounded-2xl border border-slate-100">
                        {cat.items.map((item) => {
                          const isSelected = draftChronic.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleChronic(item.id)}
                              className={`px-2.5 py-1 rounded-full text-[11.5px] transition-all active:scale-95 ${
                                isSelected
                                  ? `font-semibold bg-gradient-to-r ${cat.activeChip} text-white shadow-xs ${cat.chipShadow} -translate-y-0.5 border-0 flex items-center gap-1`
                                  : "font-medium bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 border border-slate-200/60"
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                              <span>{item.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Lifestyle Traits and habits list */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-3 mt-5">
          <img src={iconSunrise} alt="" className="w-5 h-5 object-contain" draggable={false} />
          <span className="text-[13.5px] font-bold text-slate-800 uppercase tracking-wide">
            Привычки и образ жизни:
          </span>
        </div>
        <div className="flex flex-col">
          {LIFESTYLE_TRAITS.map((trait, index) => {
            const list = prefs.nutritionSettings.lifestyleHabits || [];
            const isChecked = list.includes(trait.id);
            const theme = HABIT_THEMES[index % HABIT_THEMES.length];
            return (
              <button
                key={trait.id}
                type="button"
                onClick={() => handleToggleLifestyle(trait.id)}
                className={`w-full text-left p-3.5 mb-2.5 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-transparent active:scale-[0.99] cursor-pointer ${theme.bg}`}
              >
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="text-[13.5px] font-bold text-slate-800 leading-tight">{trait.name}</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 leading-snug">{trait.desc}</span>
                </div>
                {isChecked ? (
                  <span className={`w-6 h-6 rounded-xl text-white flex items-center justify-center shadow-xs shrink-0 ml-3 ${theme.checkBg}`}>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                ) : (
                  <span className={`w-6 h-6 rounded-xl bg-white/90 border-2 shrink-0 ml-3 ${theme.offBorder}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Save button for Nutrition */}
      <div className="mt-5">
        <SettingsSaveButton onClick={onSave} />
      </div>
    </motion.div>
  );
}
