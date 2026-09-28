import React from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { resolveAvatar } from "../../utils/annaAvatarResolver";
import type { UserPreferences } from "../../services/UserPreferencesStore";
import { RECIPE_DIET_PREFS } from "./settingsData";
import AnnaSettingsCard from "./AnnaSettingsCard";
import SettingsSaveButton from "./SettingsSaveButton";
import iconSalads from "../../assets/images/settings/12.webp";
import iconSoups from "../../assets/images/settings/13.webp";
import iconBowls from "../../assets/images/settings/14.webp";
import iconDesserts from "../../assets/images/settings/15.webp";

const RECIPE_TYPE_CARDS = [
  {
    id: "salads",
    name: "Салаты",
    desc: "Свежая биоклетчатка",
    icon: iconSalads,
    selected: "bg-emerald-50/80 border-emerald-200 shadow-[0_4px_16px_rgba(16,185,129,0.12)]",
    unselected: "bg-emerald-50/20 border-emerald-100/40 hover:bg-emerald-50/40",
  },
  {
    id: "soups",
    name: "Супы",
    desc: "Комфорт для кишечника",
    icon: iconSoups,
    selected: "bg-amber-50/80 border-amber-200 shadow-[0_4px_16px_rgba(245,158,11,0.12)]",
    unselected: "bg-amber-50/20 border-amber-100/40 hover:bg-amber-50/40",
  },
  {
    id: "dinners",
    name: "Горячие боулы",
    desc: "Сложные углеводы",
    icon: iconBowls,
    selected: "bg-teal-50/80 border-teal-200 shadow-[0_4px_16px_rgba(20,184,166,0.12)]",
    unselected: "bg-teal-50/20 border-teal-100/40 hover:bg-teal-50/40",
  },
  {
    id: "desserts",
    name: "Десерты",
    desc: "Фруктовая сытость",
    icon: iconDesserts,
    selected: "bg-yellow-50/80 border-yellow-200 shadow-[0_4px_16px_rgba(234,179,8,0.12)]",
    unselected: "bg-yellow-50/20 border-yellow-100/40 hover:bg-yellow-50/40",
  },
];

const RULE_THEMES: Record<string, { bg: string; checkBg: string; offBorder: string }> = {
  book_priority: {
    bg: "bg-gradient-to-r from-sky-50 via-sky-50/40 to-white",
    checkBg: "bg-sky-500",
    offBorder: "border-sky-200",
  },
  simple_dishes: {
    bg: "bg-gradient-to-r from-emerald-50 via-emerald-50/40 to-white",
    checkBg: "bg-emerald-500",
    offBorder: "border-emerald-200",
  },
  fast_variants: {
    bg: "bg-gradient-to-r from-amber-50 via-amber-50/40 to-white",
    checkBg: "bg-amber-500",
    offBorder: "border-amber-200",
  },
  consider_chronic: {
    bg: "bg-gradient-to-r from-purple-50 via-purple-50/40 to-white",
    checkBg: "bg-purple-500",
    offBorder: "border-purple-200",
  },
};

interface SettingsRecipesProps {
  prefs: UserPreferences;
  savePrefs: (p: UserPreferences) => void;
  toggleRecipePref: (prefId: "bookPriority" | "favoritesOnly" | "quickOption" | "simpleOption") => void;
  onSave: () => void;
}

export default function SettingsRecipes({ prefs, savePrefs, toggleRecipePref, onSave }: SettingsRecipesProps) {
  return (
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
      <div className="mb-1">
        <AnnaSettingsCard
          avatarSrc={resolveAvatar({ toneGroup: 'positive', intent: 'joy_and_support', intensity: 2 }).src}
          theme="sky"
          text="Рецепты из Книги адаптируются под ваши привычки. Укажите ваши предпочтения по сложности, скорости приготовления и любимым видам блюд, чтобы я предлагала идеальные сочетания."
        />
      </div>

      {/* Preferences list toggle blocks */}
      <div className="flex flex-col">
        {RECIPE_DIET_PREFS.map(pref => {
          let isChecked = false;
          let mapKey: "bookPriority" | "favoritesOnly" | "quickOption" | "simpleOption" = "bookPriority";

          if (pref.id === "book_priority") mapKey = "bookPriority";
          if (pref.id === "simple_dishes") mapKey = "simpleOption";
          if (pref.id === "fast_variants") mapKey = "quickOption";
          if (pref.id === "consider_chronic") mapKey = "favoritesOnly";

          isChecked = prefs.recipePreferences[mapKey];
          const isActive = isChecked;
          const theme = RULE_THEMES[pref.id] ?? RULE_THEMES.book_priority;

          return (
            <button
              key={pref.id}
              type="button"
              onClick={() => toggleRecipePref(mapKey)}
              className={`w-full text-left p-3.5 mb-2.5 rounded-2xl flex items-center justify-between transition-all duration-200 shadow-[0_4px_16px_rgba(0,0,0,0.03)] border border-transparent active:scale-[0.99] cursor-pointer ${theme.bg}`}
            >
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-[14.5px] font-bold text-slate-800 leading-tight">{pref.name}</span>
                <span className="text-[12px] text-slate-500 mt-0.5 leading-snug">{pref.desc}</span>
              </div>
              {isActive ? (
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow-xs shrink-0 ml-3 ${theme.checkBg}`}>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </span>
              ) : (
                <span className={`w-6 h-6 rounded-full bg-white/90 border-2 shrink-0 ml-3 ${theme.offBorder}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Fav types buttons zone */}
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-extrabold uppercase text-[#737C86] tracking-wide px-1">Любимые типы рецептов:</span>
        <div className="grid grid-cols-2 gap-2.5 mt-2">
          {RECIPE_TYPE_CARDS.map(card => {
            const list = prefs.recipePreferences.favoriteTypes || [];
            const isChecked = list.includes(card.id);
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  const updatedTypes = isChecked
                    ? list.filter(t => t !== card.id)
                    : [...list, card.id];
                  const updated = {
                    ...prefs,
                    recipePreferences: {
                      ...prefs.recipePreferences,
                      favoriteTypes: updatedTypes
                    }
                  };
                  savePrefs(updated);
                }}
                className={`relative p-2.5 px-3 rounded-2xl flex items-center justify-between text-left transition-all duration-200 shadow-[0_4px_14px_rgba(0,0,0,0.03)] border cursor-pointer active:scale-97 ${
                  isChecked ? card.selected : card.unselected
                }`}
              >
                {isChecked && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <div className="flex flex-col justify-center pr-1 min-w-0">
                  <span className="text-[13px] font-bold text-slate-800 leading-tight truncate">{card.name}</span>
                  <span className="text-[10.5px] text-slate-500 leading-tight mt-0.5 truncate">{card.desc}</span>
                </div>
                <img src={card.icon} alt="" className="w-9 h-9 object-contain drop-shadow-xs flex-shrink-0" draggable={false} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Save button for Recipes */}
      <div className="mt-5">
        <SettingsSaveButton onClick={onSave} />
      </div>
    </motion.div>
  );
}
