import { Moon, Droplet, Apple, Activity, Zap, Award, Heart, Battery, Leaf } from "lucide-react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import { getPlural } from "../../utils/pluralize";

interface ScalesTabProps {
  key?: any;
  sleep: number;
  sleepPct: number;
  water: number;
  waterPct: number;
  waterTarget: number;
  mealCount: number;
  mealsPct: number;
  mealsTarget: number;
  habitsDone: number;
  habitsPct: number;
  habitsTarget: number;
  ratingEnergy: number;
  energyPct: number;
  ratingWellbeing?: number;
  ratingLightness?: number;
  wellbeingLog?: {time: string, val: number}[];
  energyLog?: {time: string, val: number}[];
  lightnessLog?: {time: string, val: number}[];
  activityLogs?: any[];
  todayWaterEntries?: { amount: number; time?: string; timestamp: number }[];
  currentDayIndex: number;
  todayCookedBookCount: number;
  todayTotalBookMenuCount: number;
  totalCookedBookRecipesCount: number;
  handleRatingChange?: (type: "zen" | "energy" | "lightness", val: number) => void;
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
}

export default function ScalesTab({
  sleep,
  sleepPct,
  water,
  waterPct,
  waterTarget,
  mealCount,
  mealsPct,
  mealsTarget,
  habitsDone,
  habitsPct,
  habitsTarget,
  ratingEnergy,
  energyPct,
  ratingWellbeing,
  ratingLightness,
  activityLogs = [],
  todayWaterEntries = [],
  currentDayIndex,
  todayCookedBookCount,
  todayTotalBookMenuCount,
  totalCookedBookRecipesCount,
  annaAnalysisText,
  recommendedAction,
}: ScalesTabProps) {
  const zenValue = ratingWellbeing || 5;
  const toneValue = ratingEnergy || 4;
  const lightnessValue = ratingLightness || 4;

  const zenStatus = zenValue >= 4 ? "Стабильно" : "Внимание";
  const toneStatus = toneValue >= 4 ? "Бодрость" : "Усталость";
  const lightnessStatus = lightnessValue >= 4 ? "Легко" : "Тяжесть";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5 pb-36"
    >
      {/* 0. Anna's Tab Spoiler Analysis */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler 
          tabId="scales"
          tabName="Шкалы состояния"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}
      {/* Volumetric progress bars (Pipes) */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
        <h2 className="text-[14px] font-black text-slate-800 tracking-tight mb-5 uppercase flex items-center gap-1.5 select-none font-sans">
          <span className="text-[#10B981]">🧪</span> Основные шкалы состояния организма
        </h2>

        <div className="flex flex-col gap-5">
          {/* Scale 1: Сон */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Moon className="w-4 h-4 text-indigo-500" />
                Сон восстановительный
              </span>
              <span className="text-sm font-bold text-slate-900">
                {Math.round(sleep / 60)} ч ({sleepPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, Math.min(100, sleepPct))}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #4F46E5, #6366F1, #818CF8)",
                }}
              />
            </div>
          </div>

          {/* Scale 2: Вода */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Droplet className="w-4 h-4 text-sky-500" />
                Водный баланс клетки
              </span>
              <span className="text-sm font-bold text-slate-900">
                {water} / {waterTarget} мл ({waterPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, Math.min(100, waterPct))}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #0288D1, #03A9F4, #29B6F6)",
                }}
              />
            </div>
            {todayWaterEntries && todayWaterEntries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {todayWaterEntries.map((entry, i) => (
                  <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-full border border-sky-100">
                    💧 +{entry.amount} мл {entry.time ? <span className="text-[11px] font-medium text-sky-500">{entry.time}</span> : null}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Scale 3: Рацион растительный */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Apple className="w-4 h-4 text-emerald-500" />
                Накопленный WFPB-рацион
              </span>
              <span className="text-sm font-bold text-slate-900">
                {mealCount} / {mealsTarget} ({mealsPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, Math.min(100, mealsPct))}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #2E6B47, #16B551, #34D399)",
                }}
              />
            </div>
          </div>

          {/* Scale 4: Привычки (Активность) */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Activity className="w-4 h-4 text-[#8B5CF6]" />
                Клеточный импульс (активность)
              </span>
              <span className="text-sm font-bold text-slate-900">
                {habitsDone} / {habitsTarget} ({habitsPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, Math.min(100, habitsPct))}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #7C3AED, #8B5CF6, #A78BFA)",
                }}
              />
            </div>
          </div>

          {/* Scale 5: Физическая энергия */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Zap className="w-4 h-4 text-amber-500" />
                Физический энергозаряд
              </span>
              <span className="text-sm font-bold text-slate-900">
                {energyPct}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(4, Math.min(100, energyPct))}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #D97706, #F59E0B, #FBBF24)",
                }}
              />
            </div>
            {(activityLogs || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(activityLogs || []).map((log: any, i: number) => (
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-100">
                    🏃 {log.activityType} ({Math.round(log.durationSeconds / 60)} мин) {log.timeString ? <span className="text-[11px] font-medium text-amber-600">{log.timeString}</span> : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Самооценка и тонус — read-only */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
        <h2 className="text-[14px] font-black text-slate-800 tracking-tight mb-4 uppercase flex items-center gap-1.5 select-none font-sans">
          <span className="text-amber-500">✨</span> САМООЦЕНКА И ТОНУС
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {/* Психологический дзен */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5">
            <span className="w-8 h-8 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center shrink-0">
              <Heart className="w-4 h-4 text-violet-600" />
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Психологический дзен</span>
            <span className="text-lg font-black text-slate-900 leading-none">{zenValue}/5</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${zenValue >= 4 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
              {zenStatus}
            </span>
          </div>
          {/* Физический тонус */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5">
            <span className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0">
              <Battery className="w-4 h-4 text-amber-600" />
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Физический тонус</span>
            <span className="text-lg font-black text-slate-900 leading-none">{toneValue}/5</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${toneValue >= 4 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
              {toneStatus}
            </span>
          </div>
          {/* Лёгкость в ЖКТ */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 flex flex-col items-center text-center gap-1.5">
            <span className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0">
              <Leaf className="w-4 h-4 text-emerald-600" />
            </span>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider leading-tight">Лёгкость в ЖКТ</span>
            <span className="text-lg font-black text-slate-900 leading-none">{lightnessValue}/5</span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${lightnessValue >= 4 ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
              {lightnessStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Progress in the Book's Course */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
        <div className="flex items-center justify-between gap-3 mb-5">
          <h2 className="text-[14px] font-black text-slate-800 tracking-tight uppercase flex items-center gap-1.5 select-none font-sans">
            <span className="text-emerald-500">📖</span> Прогресс по курсу книги рецептов
          </h2>
          <span className="shrink-0 text-xs font-extrabold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-wider">
            День {currentDayIndex} из 28
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Кулинарное меню дня</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-black text-slate-900 leading-none">{todayCookedBookCount}</span>
              <span className="text-sm font-bold text-slate-500">/ {todayTotalBookMenuCount} {getPlural(todayTotalBookMenuCount, ['блюдо', 'блюда', 'блюд'])}</span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-2 leading-snug">
              Рецептов из меню Дня {currentDayIndex} отмечено как приготовлено за сегодня.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Всего по книге курса</span>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-black text-emerald-600 leading-none">{totalCookedBookRecipesCount}</span>
              <span className="text-sm font-bold text-slate-500">приготовлено</span>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-2 leading-snug">
              Суммарное количество приготовленных вами рецептов за все дни.
            </p>
          </div>
        </div>

        {/* Step Visualizer */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-slate-800">Приготовлено по книге (из 166)</span>
              <span className="text-sm font-bold text-slate-900">{Math.round((totalCookedBookRecipesCount / 166) * 100)}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, (totalCookedBookRecipesCount / 166) * 100)}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full bg-emerald-500"
              />
            </div>
          </div>
          <span className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-amber-500" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
