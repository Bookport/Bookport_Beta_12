// src/components/statenow/ScalesTab.tsx
import { Moon, Droplet, Apple, Activity, Zap, Award } from "lucide-react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";

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
  energyPct: number;
  activityLogs?: any[];
  todayWaterEntries?: { amount: number; time?: string; timestamp: number }[];
  currentDayIndex: number;
  todayCookedBookCount: number;
  todayTotalBookMenuCount?: number;
  totalCookedBookRecipesCount: number;
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
  // Опциональные поля обратной совместимости
  ratingEnergy?: number;
  ratingWellbeing?: number;
  ratingLightness?: number;
  wellbeingLog?: { time: string; val: number }[];
  energyLog?: { time: string; val: number }[];
  lightnessLog?: { time: string; val: number }[];
  handleRatingChange?: (type: "zen" | "energy" | "lightness", val: number) => void;
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
  energyPct,
  activityLogs = [],
  todayWaterEntries = [],
  currentDayIndex,
  todayCookedBookCount,
  totalCookedBookRecipesCount,
  annaAnalysisText,
  recommendedAction,
}: ScalesTabProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4 pb-36 w-full"
    >
      {/* 0. Карточка аналитики Анны */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler 
          tabId="scales"
          tabName="Шкалы состояния"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}

      {/* 5 шкал приборов состояния */}
      <div className="bg-white rounded-[28px] border border-white shadow-[0_2px_12px_rgba(15,23,42,0.05)] p-4 text-left">
        <h2 className="text-[13px] font-black text-slate-800 tracking-tight mb-4 uppercase flex items-center gap-1.5 select-none font-sans">
          <span className="text-[#10B981]">🧪</span> Основные шкалы состояния организма
        </h2>

        <div className="flex flex-col gap-4">
          {/* Шкала 1: Сон */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
                Сон восстановительный
              </span>
              <span className="text-sm font-bold text-slate-900 shrink-0">
                {Math.round(sleep / 60)} ч ({sleepPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${sleepPct > 0 ? Math.max(4, Math.min(100, sleepPct)) : 0}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #4F46E5, #6366F1, #818CF8)",
                }}
              />
            </div>
          </div>

          {/* Шкала 2: Вода */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Droplet className="w-4 h-4 text-sky-500 shrink-0" />
                Водный баланс клетки
              </span>
              <span className="text-sm font-bold text-slate-900 shrink-0">
                {water} / {waterTarget} мл ({waterPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${waterPct > 0 ? Math.max(4, Math.min(100, waterPct)) : 0}%` }}
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
                  <span key={i} className="inline-flex items-center gap-1 text-xs font-semibold bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded-full border border-sky-100">
                    💧 +{entry.amount} мл {entry.time ? <span className="text-[11px] font-medium text-sky-500">{entry.time}</span> : null}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Шкала 3: Рацион растительный */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                <Apple className="w-4 h-4 text-emerald-500 shrink-0" />
                Накопленный WFPB-рацион
              </span>
              <span className="text-sm font-bold text-slate-900 shrink-0">
                {mealCount} / {mealsTarget} ({mealsPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${mealsPct > 0 ? Math.max(4, Math.min(100, mealsPct)) : 0}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #2E6B47, #16B551, #34D399)",
                }}
              />
            </div>
          </div>

          {/* Шкала 4: Ключи системы (формируем привычки) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Activity className="w-4 h-4 text-[#8B5CF6] shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-semibold text-slate-800 leading-tight">
                    Ключи системы
                  </span>
                  <span className="text-[11px] font-normal text-slate-500 leading-tight">
                    (формируем привычки)
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-900 shrink-0 whitespace-nowrap">
                {habitsDone} / {habitsTarget} ({habitsPct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${habitsPct > 0 ? Math.max(4, Math.min(100, habitsPct)) : 0}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(to right, #7C3AED, #8B5CF6, #A78BFA)",
                }}
              />
            </div>
          </div>

          {/* Шкала 5: Движение / Активность */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 shrink-0">
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                Движение / Активность
              </span>
              <span className="text-sm font-bold text-slate-900 shrink-0">
                {energyPct}%
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${energyPct > 0 ? Math.max(4, Math.min(100, energyPct)) : 0}%` }}
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
                  <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-100">
                    🏃 {log.activityType || "Движение"} ({Math.round((log.durationSeconds || 0) / 60)} мин) {log.timeString ? <span className="text-[11px] font-medium text-amber-600">{log.timeString}</span> : null}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Прогресс по курсу книги рецептов */}
      <div className="bg-white rounded-[28px] border border-white shadow-[0_2px_12px_rgba(15,23,42,0.05)] p-4 text-left">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-[13px] font-black text-slate-800 tracking-tight uppercase flex items-center gap-1.5 select-none font-sans">
            <span className="text-emerald-500">📖</span> Прогресс по курсу книги рецептов
          </h2>
          <span className="shrink-0 text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wider whitespace-nowrap">
            День {currentDayIndex} из 28
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <div className="bg-slate-50/80 border border-slate-100/80 p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Кулинарное меню дня</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black text-slate-900 leading-none">{todayCookedBookCount}</span>
              <span className="text-xs font-bold text-slate-500">/ 4 блюда</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1.5 leading-snug">
              Рецептов из меню Дня {currentDayIndex} отмечено как приготовлено за сегодня.
            </p>
          </div>

          <div className="bg-slate-50/80 border border-slate-100/80 p-3 rounded-2xl">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Всего по книге курса</span>
            <div className="flex items-baseline gap-1 mt-1.5">
              <span className="text-2xl font-black text-emerald-600 leading-none">{totalCookedBookRecipesCount}</span>
              <span className="text-xs font-bold text-slate-500">приготовлено</span>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1.5 leading-snug">
              Суммарное количество приготовленных вами рецептов за все дни.
            </p>
          </div>
        </div>

        {/* Шкала общего прогресса книги (из 166) */}
        <div className="bg-slate-50/80 border border-slate-100/80 rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1.5 gap-2">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                Приготовлено по книге (из 166) рецептов
              </span>
              <span className="text-xs font-bold text-slate-900 shrink-0">
                {Math.round((totalCookedBookRecipesCount / 166) * 100)}%
              </span>
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
          <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
            <Award className="w-4.5 h-4.5 text-amber-500" />
          </span>
        </div>
      </div>
    </motion.div>
  );
}