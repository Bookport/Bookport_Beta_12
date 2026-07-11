import React from "react";
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
  ratingEnergy: number;
  energyPct: number;
  ratingWellbeing: number;
  ratingLightness: number;
  wellbeingLog?: {time: string, val: number}[];
  energyLog?: {time: string, val: number}[];
  lightnessLog?: {time: string, val: number}[];
  activityLogs?: any[];
  todayWaterEntries?: { amount: number; time?: string; timestamp: number }[];
  currentDayIndex: number;
  todayCookedBookCount: number;
  todayTotalBookMenuCount: number;
  totalCookedBookRecipesCount: number;
  handleRatingChange: (type: "zen" | "energy" | "lightness", val: number) => void;
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
  wellbeingLog = [],
  energyLog = [],
  lightnessLog = [],
  activityLogs = [],
  todayWaterEntries = [],
  currentDayIndex,
  todayCookedBookCount,
  todayTotalBookMenuCount,
  totalCookedBookRecipesCount,
  handleRatingChange,
  annaAnalysisText,
  recommendedAction,
}: ScalesTabProps) {
  const [activeRating, setActiveRating] = React.useState<Record<string, number>>({});
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5"
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
        <h2 className="text-[14px] font-black text-slate-850 tracking-tight mb-4 uppercase flex items-center gap-1.5 select-none font-sans">
          <span className="text-[#10B981]">🧪</span> Основные шкалы состояния организма
        </h2>

        <div className="flex flex-col gap-4">
          {/* Scale 1: Сон */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1">
                <Moon className="w-3.5 h-3.5 text-indigo-500 translate-y-[-0.5px]" />
                Сон восстановительный
              </span>
              <span className="font-mono text-slate-800 font-extrabold">
                {Math.round(sleep / 60)} ч ({sleepPct}% )
              </span>
            </div>
            
            <div className="relative h-6 bg-slate-100 rounded-full border border-slate-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.07)] overflow-hidden flex items-center">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, sleepPct)}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="h-full rounded-l-full relative flex items-center justify-end"
                style={{
                  background: "linear-gradient(to right, #4F46E5, #6366F1, #818CF8)",
                  boxShadow: "inset 0 2px 3.5px rgba(255,255,255,0.4), inset 0 -2.5px 3.5px rgba(0,0,0,0.2), 0 0 10px rgba(99,102,241,0.3)"
                }}
              >
                <div className="absolute inset-0 overflow-hidden mix-blend-overlay opacity-75">
                  <div className="absolute w-1 h-1 rounded-full bg-white/70 top-1 left-[20%] animate-pulse" />
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-white/60 top-3 left-[60%] animate-ping" />
                </div>
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/85 rounded-r-md shadow-xs pointer-events-none" />
              </motion.div>
              
              <div className="absolute top-[2px] inset-x-2.5 h-[3px] bg-white/35 rounded-full filter blur-[0.1px] pointer-events-none" />
              <div className="absolute bottom-[2px] inset-x-2.5 h-[2px] bg-white/10 rounded-full pointer-events-none" />
            </div>

          </div>

          {/* Scale 2: Вода */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1">
                <Droplet className="w-3.5 h-3.5 text-sky-500" />
                Водный баланс клетки
              </span>
              <span className="font-mono text-slate-800 font-extrabold">
                {water} / {waterTarget} мл ({waterPct}%)
              </span>
            </div>
            
            <div className="relative h-6 bg-slate-100 rounded-full border border-slate-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.07)] overflow-hidden flex items-center">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, waterPct)}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="h-full rounded-l-full relative flex items-center justify-end"
                style={{
                  background: "linear-gradient(to right, #0288D1, #03A9F4, #29B6F6)",
                  boxShadow: "inset 0 2px 3.5px rgba(255,255,255,0.4), inset 0 -2.5px 3.5px rgba(0,0,0,0.2), 0 0 10px rgba(2,136,209,0.3)"
                }}
              >
                <div className="absolute inset-0 overflow-hidden mix-blend-overlay opacity-75">
                  <div className="absolute w-1 h-1 rounded-full bg-white/80 top-2 left-[30%] animate-ping" />
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-white/50 top-1 left-[75%] animate-pulse" />
                </div>
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/85 rounded-r-md shadow-xs pointer-events-none" />
              </motion.div>
              
              <div className="absolute top-[2px] inset-x-2.5 h-[3px] bg-white/35 rounded-full filter blur-[0.1px] pointer-events-none" />
              <div className="absolute bottom-[2px] inset-x-2.5 h-[2px] bg-white/10 rounded-full pointer-events-none" />
            </div>
            {todayWaterEntries && todayWaterEntries.length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                {todayWaterEntries.map((entry, i) => (
                  <span key={i} className="text-[9px] bg-sky-50 text-sky-700 font-bold px-1.5 py-0.5 rounded-md border border-sky-100 flex items-center gap-1">
                    💧 +{entry.amount} мл <span className="text-[8px] text-sky-400 font-mono opacity-80">{entry.time || ''}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Scale 3: Рацион растительный */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1">
                <Apple className="w-3.5 h-3.5 text-emerald-500 translate-y-[-0.5px]" />
                Накопленный WFPB-рацион
              </span>
              <span className="font-mono text-slate-800 font-extrabold">
                {mealCount} / {mealsTarget} ( {mealsPct}% )
              </span>
            </div>
            
            <div className="relative h-6 bg-slate-100 rounded-full border border-slate-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.07)] overflow-hidden flex items-center">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, mealsPct)}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="h-full rounded-l-full relative flex items-center justify-end"
                style={{
                  background: "linear-gradient(to right, #2E6B47, #16B551, #34D399)",
                  boxShadow: "inset 0 2px 3.5px rgba(255,255,255,0.4), inset 0 -2.5px 3.5px rgba(0,0,0,0.2), 0 0 10px rgba(22,181,81,0.3)"
                }}
              >
                <div className="absolute inset-0 overflow-hidden mix-blend-overlay opacity-75">
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-white/70 top-2 left-[50%] animate-pulse" />
                </div>
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/85 rounded-r-md shadow-xs pointer-events-none" />
              </motion.div>
              
              <div className="absolute top-[2px] inset-x-2.5 h-[3px] bg-white/35 rounded-full filter blur-[0.1px] pointer-events-none" />
              <div className="absolute bottom-[2px] inset-x-2.5 h-[2px] bg-white/10 rounded-full pointer-events-none" />
            </div>
          </div>

          {/* Scale 4: Привычки (Активность) */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-[#8B5CF6]" />
                Клеточный импульс (активность)
              </span>
              <span className="font-mono text-slate-800 font-extrabold">
                {habitsDone} / {habitsTarget} ({habitsPct}%)
              </span>
            </div>
            
            <div className="relative h-6 bg-slate-100 rounded-full border border-slate-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.07)] overflow-hidden flex items-center">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, habitsPct)}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="h-full rounded-l-full relative flex items-center justify-end"
                style={{
                  background: "linear-gradient(to right, #7C3AED, #8B5CF6, #A78BFA)",
                  boxShadow: "inset 0 2px 3.5px rgba(255,255,255,0.4), inset 0 -2.5px 3.5px rgba(0,0,0,0.2), 0 0 10px rgba(139,92,246,0.3)"
                }}
              >
                <div className="absolute inset-0 overflow-hidden mix-blend-overlay opacity-75">
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-white/50 top-2 left-[65%] animate-ping" />
                </div>
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/85 rounded-r-md shadow-xs pointer-events-none" />
              </motion.div>
              
              <div className="absolute top-[2px] inset-x-2.5 h-[3px] bg-white/35 rounded-full filter blur-[0.1px] pointer-events-none" />
              <div className="absolute bottom-[2px] inset-x-2.5 h-[2px] bg-white/10 rounded-full pointer-events-none" />
            </div>
          </div>

          {/* Scale 5: Физическая энергия */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center text-[12px] font-bold text-slate-500 mb-1.5">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Физический энергозаряд
              </span>
              <span className="font-mono text-slate-800 font-extrabold">
                {energyPct}%
              </span>
            </div>
            
            <div className="relative h-6 bg-slate-100 rounded-full border border-slate-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.07)] overflow-hidden flex items-center">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(5, energyPct)}%` }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="h-full rounded-l-full relative flex items-center justify-end"
                style={{
                  background: "linear-gradient(to right, #D97706, #F59E0B, #FBBF24)",
                  boxShadow: "inset 0 2px 3.5px rgba(255,255,255,0.4), inset 0 -2.5px 3.5px rgba(0,0,0,0.2), 0 0 10px rgba(245,158,11,0.3)"
                }}
              >
                <div className="absolute inset-0 overflow-hidden mix-blend-overlay opacity-75">
                  <div className="absolute w-1.5 h-1.5 rounded-full bg-white/60 top-2 left-[80%] animate-ping" />
                </div>
                <div className="absolute top-0 right-0 bottom-0 w-1 bg-white/85 rounded-r-md shadow-xs pointer-events-none" />
              </motion.div>
              
              <div className="absolute top-[2px] inset-x-2.5 h-[3px] bg-white/35 rounded-full filter blur-[0.1px] pointer-events-none" />
              <div className="absolute bottom-[2px] inset-x-2.5 h-[2px] bg-white/10 rounded-full pointer-events-none" />
            </div>
            {(activityLogs || []).length > 0 && (
              <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap gap-2">
                {(activityLogs || []).map((log: any, i: number) => (
                  <span key={i} className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
                    🏃 {log.activityType} ({Math.round(log.durationSeconds / 60)} мин) <span className="text-[8px] text-amber-500/80 font-mono ml-1">{log.timeString || ''}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Direct Health Adjustment Sliders */}
      <div className="bg-gradient-to-r from-emerald-50/50 via-teal-50/10 to-sky-50/30 rounded-3xl p-5 border border-emerald-100/45 shadow-sm text-left">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[18px]">✨</span>
          <span className="text-[13px] font-extrabold text-emerald-800 uppercase tracking-wider font-sans">
            Настроить самооценку прямо сейчас
          </span>
        </div>

        {/* Slider 1: Психологический дзен */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5 text-[12.5px] font-bold text-slate-700 font-sans">
            <span>🕊️ Психологический дзен</span>
            <span className="font-mono text-[13px] text-emerald-650 font-extrabold">{ratingWellbeing} из 5</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => { setActiveRating(p => ({...p, zen: val})); handleRatingChange("zen", val); }}
                className={`flex-1 py-1.5 font-sans font-bold text-[13px] rounded-xl border transition-all cursor-pointer ${
                  activeRating["zen"] === val
                    ? "bg-slate-850 border-slate-850 text-white shadow-xs font-extrabold"
                    : "bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          {wellbeingLog && wellbeingLog.length > 0 && (
            <div className="mt-3 bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">График состояния (Психологический дзен)</span>
              <div className="flex items-end gap-2.5 h-16 overflow-x-auto no-scrollbar">
                {wellbeingLog.map((log, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full gap-1 min-w-[28px]">
                    <span className="text-[10px] font-black text-slate-700 leading-none">{log.val}</span>
                    <div className="w-5 bg-slate-100 rounded-t-md relative flex items-end overflow-hidden" style={{ height: '40px' }}>
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: `${(log.val / 5) * 100}%` }} 
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full bg-emerald-400 rounded-t-md" 
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono leading-none">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Slider 3: Ощущение легкости */}
        <div>
          <div className="flex justify-between items-center mb-1.5 text-[12.5px] font-bold text-slate-700 font-sans">
            <span>🍃 Ощущение лёгкости</span>
            <span className="font-mono text-[13px] text-blue-650 font-extrabold">{ratingLightness} из 5</span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => { setActiveRating(p => ({...p, lightness: val})); handleRatingChange("lightness", val); }}
                className={`flex-1 py-1.5 font-sans font-bold text-[13px] rounded-xl border transition-all cursor-pointer ${
                  activeRating["lightness"] === val
                    ? "bg-teal-600 border-teal-650 text-white shadow-xs font-extrabold"
                    : "bg-white text-slate-600 border-slate-200/60 hover:bg-slate-50"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
          {lightnessLog && lightnessLog.length > 0 && (
            <div className="mt-3 bg-white border border-teal-50/50 rounded-xl p-3 shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">График состояния (Ощущение лёгкости)</span>
              <div className="flex items-end gap-2.5 h-16 overflow-x-auto no-scrollbar">
                {lightnessLog.map((log, i) => (
                  <div key={i} className="flex flex-col items-center justify-end h-full gap-1 min-w-[28px]">
                    <span className="text-[10px] font-black text-teal-600 leading-none">{log.val}</span>
                    <div className="w-5 bg-teal-50 rounded-t-md relative flex items-end overflow-hidden" style={{ height: '40px' }}>
                      <motion.div 
                        initial={{ height: 0 }} 
                        animate={{ height: `${(log.val / 5) * 100}%` }} 
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="w-full bg-teal-400 rounded-t-md" 
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 font-mono leading-none">{log.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress in the Book's Course */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-black text-slate-850 tracking-tight uppercase flex items-center gap-1.5 select-none font-sans">
            <span className="text-emerald-500">📖</span> Прогресс по курсу книги рецептов
          </h2>
          <span className="text-[10px] font-extrabold text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-full uppercase">
            ДЕНЬ {currentDayIndex} ИЗ 28
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 mb-2">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase block tracking-wider">Кулинарное меню дня</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[30px] font-black text-slate-800 leading-none">{todayCookedBookCount}</span>
              <span className="text-[14px] text-slate-400 font-bold">/ {todayTotalBookMenuCount} блюд</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
              Рецептов из меню Дня {currentDayIndex} отмечено как приготовлено за сегодня.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase block tracking-wider">Всего по книге курса</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-[30px] font-black text-emerald-600 leading-none">{totalCookedBookRecipesCount}</span>
              <span className="text-[13px] text-slate-400 font-bold">приготовлено</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-snug">
              Суммарное количество приготовленных вами рецептов за все дни.
            </p>
          </div>
        </div>

        {/* Step Visualizer */}
        <div className="mt-3 bg-slate-50 border border-slate-100/55 rounded-2xl p-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex justify-between text-[11px] font-bold text-slate-500 mb-1.5">
              <span>Приготовлено по книге (из 166)</span>
              <span>{Math.round((totalCookedBookRecipesCount / 166) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full" 
                style={{ width: `${(totalCookedBookRecipesCount / 166) * 100}%` }}
              />
            </div>
          </div>
          <Award className="w-8 h-8 text-amber-500 shrink-0" />
        </div>
      </div>
    </motion.div>
  );
}
