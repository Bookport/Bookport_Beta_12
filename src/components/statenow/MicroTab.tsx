import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import {
  DAILY_VALUES,
  getUnit,
  getSymbol,
  getLabel,
  getWarningKeys,
} from "../../utils/nutrientConstants";
import { computeDayMicros } from "../../utils/clientMicroAggregator";

import mineralsIcon from "../../assets/images/SOST/balance/19.webp";
import vitaminsIcon from "../../assets/images/SOST/balance/18.webp";
import aminoIcon from "../../assets/images/SOST/balance/14.webp";
import fatsIcon from "../../assets/images/SOST/balance/15.webp";
import ideaIcon from "../../assets/images/SOST/balance/20.webp";

type TabId = "minerals" | "vitamins" | "amino" | "fats";

const TAB_KEYS: Record<TabId, string[]> = {
  minerals: [
    "iron", "calcium", "magnesium", "zinc", "iodine",
    "potassium", "phosphorus", "selenium", "copper", "sodium", "manganese"
  ],
  vitamins: [
    "vitaminB12", "folate", "vitaminD", "vitaminC", "vitaminA",
    "vitaminE", "thiamin", "riboflavin", "niacin", "pantothenicAcid", "vitaminB6"
  ],
  amino: [
    "leucine", "isoleucine", "valine", "lysine", "methionine",
    "phenylalanine", "threonine", "tryptophan", "histidine"
  ],
  fats: [
    "cholesterol", "saturatedFat", "transFat", "omega3", "omega6",
    "omega9", "fructose", "glucose", "lactose"
  ],
};

interface TabConfig {
  id: TabId;
  label: string;
  title: string;
  icon: string;
  activeClass: string;
  inactiveClass: string;
}

const TABS: TabConfig[] = [
  {
    id: "minerals",
    label: "Минералы",
    title: "МИНЕРАЛЫ ДНЯ",
    icon: mineralsIcon,
    activeClass: "bg-sky-500 text-white shadow-xs",
    inactiveClass: "bg-sky-50/70 text-sky-800 border border-sky-200/60 hover:bg-sky-100/70",
  },
  {
    id: "vitamins",
    label: "Витамины",
    title: "ВИТАМИНЫ ДНЯ",
    icon: vitaminsIcon,
    activeClass: "bg-amber-500 text-white shadow-xs",
    inactiveClass: "bg-amber-50/70 text-amber-800 border border-amber-200/60 hover:bg-amber-100/70",
  },
  {
    id: "amino",
    label: "Аминокислоты",
    title: "АМИНОКИСЛОТЫ",
    icon: aminoIcon,
    activeClass: "bg-purple-600 text-white shadow-xs",
    inactiveClass: "bg-purple-50/70 text-purple-800 border border-purple-200/60 hover:bg-purple-100/70",
  },
  {
    id: "fats",
    label: "Жиры и сахара",
    title: "ЖИРЫ И УГЛЕВОДЫ",
    icon: fatsIcon,
    activeClass: "bg-rose-500 text-white shadow-xs",
    inactiveClass: "bg-rose-50/70 text-rose-800 border border-rose-200/60 hover:bg-rose-100/70",
  },
];

function formatNutrientValue(val: number): string {
  if (!val || val <= 0) return "0";
  if (val >= 100) return String(Math.round(val));
  if (val >= 10) {
    const fixed = val.toFixed(1);
    return fixed.endsWith(".0") ? String(Math.round(val)) : fixed;
  }
  const fixed = val.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}

interface MicroTabProps {
  key?: any;
  dishes?: any[];
  currentDayIndex?: number;
  dayVitA?: number;
  dayVitC?: number;
  dayVitB9?: number;
  dayVitE?: number;
  dayVitK?: number;
  dayIron?: number;
  dayMagnesium?: number;
  dayZinc?: number;
  dayPotassium?: number;
  dayLysine?: number;
  daySelenium?: number;
  hasPartialBookDishes?: boolean;
  realProfileCount?: number;
  hasAnyRealMicronutrientProfile?: boolean;
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
}

export default function MicroTab({
  dishes = [],
  currentDayIndex = 1,
  dayVitA,
  dayVitC,
  dayVitB9,
  dayVitE,
  dayVitK,
  dayIron,
  dayMagnesium,
  dayZinc,
  dayPotassium,
  dayLysine,
  daySelenium,
  hasPartialBookDishes = false,
  realProfileCount = 0,
  hasAnyRealMicronutrientProfile = false,
  annaAnalysisText,
  recommendedAction,
}: MicroTabProps) {
  const [activeTab, setActiveTab] = useState<TabId>("minerals");

  // Гибридный агрегатор дня: server-truth -> fallback техкарта × CLIENT_NUTRIENT_DB
  const dayMicros = useMemo(() => {
    if (dishes && dishes.length > 0) {
      return computeDayMicros(dishes, currentDayIndex);
    }
    return null;
  }, [dishes, currentDayIndex]);

  // Маппинг для обратной совместимости при отсутствии raw-дишей (legacy 11 полей)
  const legacyPctMap: Record<string, number | undefined> = useMemo(() => ({
    vitaminA: dayVitA,
    vitaminC: dayVitC,
    folate: dayVitB9,
    vitaminE: dayVitE,
    vitaminK: dayVitK,
    iron: dayIron,
    magnesium: dayMagnesium,
    zinc: dayZinc,
    potassium: dayPotassium,
    lysine: dayLysine,
    selenium: daySelenium,
  }), [dayVitA, dayVitC, dayVitB9, dayVitE, dayVitK, dayIron, dayMagnesium, dayZinc, dayPotassium, dayLysine, daySelenium]);

  // Расчёт сумм и процентов для активного таба — гибридный (миксер исключен внутри агрегатора)
  const nutrientsList = useMemo(() => {
    const keys = TAB_KEYS[activeTab];
    const warningKeys = getWarningKeys();

    return keys.map((key) => {
      const unit = getUnit(key);
      const dv = DAILY_VALUES[key];
      const symbol = getSymbol(key);
      const label = getLabel(key);
      const isWarning = warningKeys.has(key);

      let sum = 0;
      let dvPercent: number | null = null;

      if (dayMicros) {
        sum = Number(dayMicros.sums[key]) || 0;
        if (dv != null && dv > 0) {
          const compareValue = (unit === "г" && dv > 50) ? sum * 1000 : sum;
          dvPercent = Math.min(250, Math.round((compareValue / dv) * 100));
        } else if (sum > 0) {
          dvPercent = null; // без нормы — факт
        }
        // если суммы 0 и есть legacy fallback, используем legacy для совместимости
        if (sum === 0 && legacyPctMap[key] !== undefined && !dayMicros.meta.hasValid) {
          const rawPct = Number(legacyPctMap[key]) || 0;
          dvPercent = Math.min(250, Math.round(rawPct));
          if (dv != null && dv > 0) {
            const comp = (dvPercent / 100) * dv;
            sum = (unit === "г" && dv > 50) ? comp / 1000 : comp;
          }
        }
      } else if (legacyPctMap[key] !== undefined) {
        const rawPct = Number(legacyPctMap[key]) || 0;
        dvPercent = Math.min(250, Math.round(rawPct));
        if (dv != null && dv > 0) {
          const comp = (dvPercent / 100) * dv;
          sum = (unit === "г" && dv > 50) ? comp / 1000 : comp;
        }
      }

      return {
        key,
        symbol,
        label,
        unit,
        value: sum,
        dv,
        dvPercent,
        isWarning,
      };
    });
  }, [activeTab, dayMicros, legacyPctMap]);

  const hasData = dayMicros ? dayMicros.meta.hasValid : (hasAnyRealMicronutrientProfile || (realProfileCount > 0));
  const hasPartial = dayMicros ? dayMicros.meta.hasPartial : hasPartialBookDishes;
  const currentTabConfig = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4 pb-5 sm:pb-24 w-full overflow-x-hidden"
    >
      {/* 0. Anna's Tab Spoiler Analysis */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler
          tabId="micro"
          tabName="Микронутриенты"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}

      {/* 1. Neutral empty state — ни одно блюдо дня не имеет профиля */}
      {!hasData && (
        <div className="bg-white rounded-3xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] p-6 text-center flex flex-col items-center justify-center">
          <img src={mineralsIcon} alt="Микроэлементы" className="w-10 h-10 object-contain opacity-50 mb-2" />
          <span className="text-[13px] font-bold text-slate-700 font-sans">
            Для блюд этого дня пока нет полного профиля микроэлементов
          </span>
          <p className="text-[11.5px] text-slate-400 max-w-[260px] mt-1 leading-snug font-sans">
            Зафиксируйте блюда из Книги рецептов или меню «Сделай сам» для активации микронутриентного профиля.
          </p>
        </div>
      )}

      {/* 2. Мягкая пометка о частичных блюдах (гибридный мета) */}
      {hasData && hasPartial && (
        <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 text-left flex items-start gap-2.5">
          <span className="text-amber-500 text-base leading-none mt-0.5 select-none">🔎</span>
          <div>
            <h2 className="text-[12px] font-bold text-slate-850 uppercase tracking-tight font-sans">
              Микроэлементы
            </h2>
            <p className="text-[11.5px] text-slate-600 leading-snug font-sans mt-0.5">
              Для части блюд сегодня пока доступна КБЖУ-оценка. Полный профиль витаминов и минералов уточняется — недостающие микро честно дорассчитаны из техкарты × база на 100 г.
            </p>
          </div>
        </div>
      )}

      {/* 3. Основной аналитический блок нутриентов с табами */}
      {hasData && (
        <div className="bg-white rounded-[32px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] p-3.5 sm:p-5 text-left w-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={currentTabConfig.icon}
                alt={currentTabConfig.label}
                className="w-6 h-6 object-contain shrink-0 drop-shadow-xs"
              />
              <h2 className="text-[13px] sm:text-sm font-bold tracking-wider text-slate-700 uppercase truncate">
                {currentTabConfig.title}
              </h2>
            </div>
            <span className="text-[9.5px] font-mono font-black uppercase px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200/80 shrink-0 whitespace-nowrap">
              {nutrientsList.length} ПОЗИЦИЙ
            </span>
          </div>

          <p className="text-[11.5px] text-slate-400 mb-3 leading-normal font-sans">
            Суммарное накопление микронутриентов по всем блюдам дня относительно нормы RDA.
          </p>

          {/* 2-рядные кнопки табов без горизонтальной прокрутки */}
          <div className="grid grid-cols-2 gap-1.5 mb-3 w-full">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-extrabold transition-all duration-200 flex items-center justify-center gap-1.5 w-full whitespace-nowrap select-none ${
                    isActive ? tab.activeClass : tab.inactiveClass
                  }`}
                >
                  <img src={tab.icon} alt={tab.label} className="w-4 h-4 object-contain shrink-0 select-none" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* 3-Column Nutrient Cards Grid */}
          <div className="grid grid-cols-3 gap-2 w-full">
            {nutrientsList.map((nutr) => {
              const isOverNorm = nutr.dvPercent !== null && nutr.dvPercent >= 100;
              const isWarningAlert = nutr.isWarning && nutr.value > 0;

              let symbolBg = "bg-sky-50 text-sky-700 border-sky-100";
              let barColor = isOverNorm ? "bg-emerald-500" : "bg-sky-400";

              if (activeTab === "vitamins") {
                symbolBg = "bg-amber-50 text-amber-700 border-amber-100";
                barColor = isOverNorm ? "bg-emerald-500" : "bg-amber-400";
              } else if (activeTab === "amino") {
                symbolBg = "bg-purple-50 text-purple-700 border-purple-100";
                barColor = isOverNorm ? "bg-emerald-500" : "bg-purple-400";
              } else if (activeTab === "fats") {
                symbolBg = isWarningAlert
                  ? "bg-rose-50 text-rose-700 border-rose-100"
                  : "bg-teal-50 text-teal-700 border-teal-100";
                barColor = isWarningAlert ? "bg-rose-400" : isOverNorm ? "bg-emerald-500" : "bg-teal-400";
              }

              return (
                <div
                  key={nutr.key}
                  className={`bg-white rounded-2xl border p-2 flex flex-col justify-between transition-all duration-200 min-h-[72px] shadow-[0_2px_8px_rgba(15,23,42,0.03)] ${
                    isWarningAlert ? "border-rose-200/80 bg-rose-50/20" : "border-slate-100/90"
                  }`}
                >
                  {/* Top row: Symbol chip + Label */}
                  <div className="flex items-center gap-1 min-w-0 w-full">
                    <span
                      className={`w-5 h-5 rounded-full border flex items-center justify-center text-[9px] font-black shrink-0 leading-none select-none ${symbolBg}`}
                    >
                      {nutr.symbol}
                    </span>
                    <span
                      className="text-[10.5px] font-bold text-slate-800 truncate leading-tight block flex-1 min-w-0"
                      title={nutr.label}
                    >
                      {nutr.label}
                    </span>
                  </div>

                  {/* Middle row: Exact Sum Mass + Unit */}
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-[15.5px] sm:text-[16px] font-black text-slate-850 leading-none tracking-tight">
                      {formatNutrientValue(nutr.value)}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 leading-none">
                      {nutr.unit}
                    </span>
                  </div>

                  {/* Bottom row: Micro Progress Bar + % of Daily Norm */}
                  {nutr.dvPercent !== null ? (
                    <div className="flex items-center justify-between gap-1.5 mt-1.5 pt-0.5">
                      <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                          style={{ width: `${Math.min(100, nutr.dvPercent)}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] sm:text-[10.5px] font-black shrink-0 leading-none ${
                          isWarningAlert
                            ? "text-rose-600"
                            : isOverNorm
                            ? "text-emerald-700 font-extrabold"
                            : "text-slate-600"
                        }`}
                      >
                        {nutr.dvPercent >= 250 ? "250%+" : `${nutr.dvPercent}%`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-start mt-1.5 pt-0.5">
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded leading-none">
                        факт
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. Micro conclusions with 3D Idea Icon */}
      <div className="bg-white rounded-3xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] p-4 text-left">
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-2">
          <img src={ideaIcon} alt="Интеграция" className="w-5 h-5 object-contain shrink-0 drop-shadow-xs" />
          ИНТЕГРАЦИЯ МИКРОНУТРИЕНТОВ
        </h3>
        <p className="text-[12.5px] leading-relaxed text-slate-600 font-sans">
          Даже при частичной фиксации рациона, WFPB меню запускает мощное клеточное насыщение калием и магнием. Калий
          мгновенно снимает спазмы артериальных сосудов, а магний успокаивает психосоматический контур коры головного
          мозга.
        </p>
      </div>
    </motion.div>
  );
}