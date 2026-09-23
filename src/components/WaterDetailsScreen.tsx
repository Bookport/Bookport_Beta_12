import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  Scale, 
  Clock, 
  Plus, 
  Minus, 
  CheckCircle2,
  Droplet
} from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

import BottomBar from "./BottomBar";
import { useAppStore } from "../store/useAppStore";
import { getWaterFeedback } from "../utils/waterCoaching";
import { getWaterGoal, WATER_GOAL_FALLBACK_KG } from "../utils/waterGoal";
import { buildDailySummary } from "../utils/crossModuleSummary";
import AnnaText from "./AnnaText";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import ingrGreenImg from "../assets/ingredients/ingr_green.webp";
import volumeSplashCircleImg from "../assets/images/water/volume_splash_circle.webp";
import statCareHandsImg from "../assets/images/water/stat_care_hands.webp";
import statSuccessTargetImg from "../assets/images/water/stat_success_target.webp";
import statStreakWaveImg from "../assets/images/water/stat_streak_wave.webp";
import statMedalImg from "../assets/images/water/stat_medal.webp";
import timerImg from "../assets/images/movement/markers/timer.webp";

import volumeDrop1Img from "../assets/images/water/volume_drop_1.webp";
import volumeGlassSmallImg from "../assets/images/water/volume_glass_small.webp";
import volumeGlassLargeImg from "../assets/images/water/volume_glass_large.webp";
import volumeBottleImg from "../assets/images/water/volume_bottle.webp";
import volumeThermosImg from "../assets/images/water/volume_thermos.webp";
import volumePitcherImg from "../assets/images/water/volume_pitcher.webp";
import ostalosImg from "../assets/images/water/ostalos.webp";
import kolichestvoImg from "../assets/images/water/kolichestvo.webp";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'reminder_caution', intent: 'reminder' }).src;

const CustomWaterTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="flex flex-col p-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-[0_4px_16px_rgba(15,23,42,0.12)] border border-sky-100 z-40">
        <div className="text-slate-600 text-[11px] font-bold">День {label}</div>
        <div className="text-sky-600 text-[12px] font-black">{val} мл</div>
      </div>
    );
  }
  return null;
};

const getVolumeIcon = (amt: number) => {
  if (amt >= 1000) return volumePitcherImg;
  if (amt >= 750) return volumeThermosImg;
  if (amt >= 500) return volumeBottleImg;
  if (amt >= 300) return volumeGlassLargeImg;
  if (amt >= 200) return volumeGlassSmallImg;
  return volumeDrop1Img;
};

interface WaterLogEntry {
  id: string;
  amount: number;
  time: string;
  timestamp: number;
}

interface WaterDetailsScreenProps {
  currentDayIndex: number;
  profileWeight: number; // default weight from profile
  userName: string;
  userGender: "female" | "male";
  water: number; // current day's sum
  setWater: (val: number) => void;
  onBack: () => void;
  
  // State lifted from MyDayScreen
  waterLogs: Record<number, WaterLogEntry[]>;
  setWaterLogs: React.Dispatch<React.SetStateAction<Record<number, WaterLogEntry[]>>>;
  dayWeights: Record<number, number>;
  setDayWeights: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  
  // Quick Actions helpers
  handleAddWaterAmount: (amt: number) => void;
}

export default function WaterDetailsScreen({
  currentDayIndex,
  profileWeight,
  userName,
  userGender,
  water,
  setWater,
  onBack,
  waterLogs,
  setWaterLogs,
  dayWeights,
  setDayWeights,
  handleAddWaterAmount
}: WaterDetailsScreenProps) {
  
  // Active selected day in the historical graph to view statistics (defaults to today)
  const selectedGraphDay = useAppStore((s) => s.selectedGraphDay);
  const setSelectedGraphDay = useAppStore((s) => s.setSelectedGraphDay);
  
  // Resolved weights for calculation
  const getResolvedWeightForDay = (dayIdx: number): number => {
    if (dayWeights[dayIdx]) {
      return dayWeights[dayIdx];
    }
    // Backward search
    for (let d = dayIdx; d >= 1; d--) {
      if (dayWeights[d]) return dayWeights[d];
    }
    // Forward search
    for (let d = dayIdx; d <= 28; d++) {
      if (dayWeights[d]) return dayWeights[d];
    }
    return profileWeight || WATER_GOAL_FALLBACK_KG;
  };

  const currentWeightForDay = getResolvedWeightForDay(currentDayIndex);
  const waterGoalToday = getWaterGoal(currentWeightForDay);

  // Reactive store subscriptions for the cross-module Anna summary
  const storeWaterEntries = useAppStore((s) => s.waterEntries);
  const storeMovementEntries = useAppStore((s) => s.movementEntries);
  const storeMeasurementEntries = useAppStore((s) => s.measurementEntries);
  const storeDigestionEntries = useAppStore((s) => s.digestionEntries);
  
  // Selected graph day variables
  const graphDayWeight = getResolvedWeightForDay(selectedGraphDay);
  const graphDayGoal = getWaterGoal(graphDayWeight);
  const graphDayEntries = waterLogs[selectedGraphDay] || [];
  const graphDaySum = graphDayEntries.reduce((acc, e) => acc + e.amount, 0);
  const graphDayPercent = Math.min(100, Math.round((graphDaySum / graphDayGoal) * 100));

  // Handle local daily weight edits with 0.1 kg (100g) step
  const handleWeightChange = (delta: number) => {
    const updated = { ...dayWeights };
    const currentVal = updated[currentDayIndex] || currentWeightForDay;
    // Округляем до 1 знака, чтобы не накапливались JS-хвосты вроде 79.4000000001
    const newVal = Math.max(30, Math.min(250, Math.round((currentVal + delta) * 10) / 10));
    updated[currentDayIndex] = newVal;
    setDayWeights(updated);
  };

  // Хук для плавного изменения при удержании кнопки (Long Press)
  const timerRef = React.useRef<any>(null);
  const intervalRef = React.useRef<any>(null);

  const startAdjusting = (delta: number) => {
    handleWeightChange(delta);
    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        handleWeightChange(delta);
      }, 70); // частота шага при удержании
    }, 300); // задержка перед автоскроллом
  };

  const stopAdjusting = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  // Generate Anna's customizable analysis quote using useMemo
  const annaAdviceText = useMemo(() => {
    const summary = buildDailySummary(selectedGraphDay ?? currentDayIndex, useAppStore.getState(), currentDayIndex);
    return getWaterFeedback(summary, userName, userGender);
  }, [selectedGraphDay, currentDayIndex, storeWaterEntries, storeMovementEntries, storeMeasurementEntries, storeDigestionEntries, userName, userGender]);

  // Calculations for past history cycle
  const chartData = React.useMemo(() => {
    return Array.from({ length: 28 }).map((_, idx) => {
      const dayNum = idx + 1;
      const dWeight = dayWeights[dayNum] || getResolvedWeightForDay(dayNum);
      const dGoal = getWaterGoal(dWeight);
      const dEntries = dayNum <= currentDayIndex ? (waterLogs[dayNum] || []) : [];
      const dSum = dEntries.reduce((sum, e) => sum + e.amount, 0);
      return { day: dayNum, sum: dSum, goal: dGoal, isFuture: dayNum > currentDayIndex };
    });
  }, [waterLogs, dayWeights, currentDayIndex]);

  const totals = React.useMemo(() => {
    const filteredEntries = Object.entries(waterLogs)
      .filter(([day]) => Number(day) <= currentDayIndex)
      .flatMap(([, entries]) => entries as WaterLogEntry[]);
    const totalVolume = filteredEntries.reduce((acc, e) => acc + (e.amount || 0), 0);
    const average = Math.round(totalVolume / currentDayIndex);
    
    let complCount = 0;
    let maxVolume = 0;
    let maxDayIdx = 1;
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let d = 1; d <= currentDayIndex; d++) {
      const dWeight = dayWeights[d] || getResolvedWeightForDay(d);
      const dGoal = getWaterGoal(dWeight);
      const dEntries = waterLogs[d] || [];
      const dSum = dEntries.reduce((sum, e) => sum + e.amount, 0);
      
      if (dSum > 0) {
        if (dSum > maxVolume) {
          maxVolume = dSum;
          maxDayIdx = d;
        }
      }

      if (d <= currentDayIndex) {
        if (dSum >= dGoal) {
          complCount++;
          tempStreak++;
          bestStreak = Math.max(bestStreak, tempStreak);
        } else {
          tempStreak = 0;
        }
      }
    }
    currentStreak = tempStreak;

    return {
      totalVolume,
      average,
      completedDays: complCount,
      bestDayVolume: maxVolume,
      bestDayIndex: maxDayIdx,
      currentStreak,
      bestStreak
    };
  }, [waterLogs, dayWeights, currentDayIndex]);

  const CustomWaterBarShape = (props: any) => {
    const { x, y, width, height, fill, stroke, strokeWidth, payload, background } = props;
    const fullHeight = background ? background.height : height;
    const bottomY = background ? background.y + background.height : y + height;
    const topY = bottomY - fullHeight;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={4}
          ry={4}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          style={{ outline: 'none' }}
        />
        <rect
          x={x - width / 2}
          y={topY}
          width={width * 2}
          height={fullHeight}
          fill="transparent"
          stroke="transparent"
          strokeWidth={0}
          strokeOpacity={0}
          cursor="pointer"
          style={{ outline: 'none' }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (payload && payload.day) {
              setSelectedGraphDay(Number(payload.day));
            }
          }}
        />
      </g>
    );
  };

  const todayPercent = Math.min(100, Math.round((water / waterGoalToday) * 100));

  return (
    <div className="flex-1 flex flex-col justify-between select-none pointer-events-auto bg-[#FFFBF7]">
      
      {/* Header Bar */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-white/80 bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <button 
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-white border border-white flex items-center justify-center text-slate-700 hover:bg-slate-50 font-bold transition-all active:scale-95 cursor-pointer shadow-[0_4px_16px_rgba(15,23,42,0.05)]"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        
        <div className="flex flex-col text-center">
          <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase">АНАЛИТИКА ВОДЫ</span>
          <span className="text-[17px] font-black text-slate-800 leading-none mt-0.5">День {currentDayIndex} из 28</span>
        </div>
        
        <div className="w-10 h-10" />
      </div>

      <div className="px-4 py-4 flex-1 overflow-y-auto flex flex-col gap-4">

        {/* 1. ВЕРХНИЙ БЛОК: БАЛАНС НА СЕГОДНЯ (ПАРИТ, БЕЗ СИНЕГО КОНТЕЙНЕРА-ГРОБА) */}
        <div className="rounded-[28px] p-4.5 text-left flex flex-col gap-3.5 bg-gradient-to-br from-white via-white to-sky-50/30 border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] relative overflow-hidden">
          
          <div className="flex justify-between items-center relative z-10">
            <div>
              <span className="text-[11px] font-black text-slate-400 tracking-wider block uppercase">БАЛАНС НА СЕГОДНЯ</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-[28px] font-black text-slate-800 leading-none">{water}</span>
                <span className="text-[14px] text-slate-400 font-bold leading-none">из {waterGoalToday} мл</span>
              </div>
            </div>
            
            {/* Опрятный статус-бейдж с процентом */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full border border-sky-100/80 shadow-[0_2px_8px_rgba(14,165,233,0.08)]">
              <span className="text-[14px] font-mono font-black text-sky-600">
                {todayPercent}%
              </span>
              <div className="w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center text-[9px] text-white font-bold">
                ✓
              </div>
            </div>
          </div>

          {/* Премиальная округлая линия прогресса */}
          <div className="h-3 w-full rounded-full bg-slate-100/80 border border-slate-200/40 relative overflow-hidden p-0.5">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: `${todayPercent}%` }}
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-cyan-500 to-teal-400 shadow-[0_1px_4px_rgba(14,165,233,0.3)]"
            />
          </div>

          {/* Парящие мини-плитки статуса */}
          <div className="grid grid-cols-2 gap-2.5 mt-0.5">
            <div className="rounded-2xl p-2.5 flex flex-row justify-between items-center bg-[#F2FBF9] border border-white shadow-sm">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold tracking-tight block uppercase">ОСТАЛОСЬ ДО ЦЕЛИ</span>
                <span className="text-[14px] font-black text-slate-800 mt-0.5">
                  {Math.max(0, waterGoalToday - water)} мл
                </span>
              </div>
              <img src={ostalosImg} alt="Осталось" className="w-9 h-9 object-contain shrink-0" />
            </div>

            <div className="rounded-2xl p-2.5 flex flex-row justify-between items-center bg-[#F0F7FF] border border-white shadow-sm">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold tracking-tight block uppercase">КОЛ-ВО ПРИЁМОВ</span>
                <span className="text-[14px] font-black text-slate-800 mt-0.5">
                  {(waterLogs[currentDayIndex] || []).length} р / сутки
                </span>
              </div>
              <img src={kolichestvoImg} alt="Кол-во" className="w-9 h-9 object-contain shrink-0" />
            </div>

            <div className="rounded-2xl p-2.5 flex flex-row justify-between items-center col-span-2 bg-[#F5F3FF] border border-white shadow-sm">
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold tracking-tight block uppercase">ПОСЛЕДНИЙ ПРИЁМ</span>
                <span className="text-[13px] font-bold text-slate-700 font-mono mt-0.5">
                  {(waterLogs[currentDayIndex] || []).slice(-1)[0]?.time || "Приёмов ещё нет"}
                </span>
              </div>
              <img src={timerImg} alt="Время" className="w-6 h-6 object-contain shrink-0" />
            </div>
          </div>

          {/* Регулятор веса для нормы 30 мл / 1 кг (Вариант 1: компактный ряд) */}
          <div className="flex justify-between items-center pt-1.5 px-0.5">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[11px] font-black text-slate-700 tracking-wider uppercase whitespace-nowrap">
                ТЕКУЩИЙ ВЕС ТЕЛА
              </span>
              <span className="text-[12px] text-slate-400 font-medium whitespace-nowrap mt-0.5">
                30 мл/кг • норма {waterGoalToday} мл
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-2xl shadow-sm border border-slate-100 shrink-0 select-none">
              <button
                type="button"
                onPointerDown={() => startAdjusting(-0.1)}
                onPointerUp={stopAdjusting}
                onPointerLeave={stopAdjusting}
                onContextMenu={(e) => e.preventDefault()}
                className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 active:bg-slate-200 text-slate-700 flex items-center justify-center font-black active:scale-90 transition-transform cursor-pointer touch-none"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[14px] font-black text-slate-800 min-w-[56px] text-center font-mono whitespace-nowrap">
                {Number(currentWeightForDay).toFixed(1)} кг
              </span>
              <button
                type="button"
                onPointerDown={() => startAdjusting(0.1)}
                onPointerUp={stopAdjusting}
                onPointerLeave={stopAdjusting}
                onContextMenu={(e) => e.preventDefault()}
                className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 active:bg-slate-200 text-slate-700 flex items-center justify-center font-black active:scale-90 transition-transform cursor-pointer touch-none"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. БЛОК АННЫ: СТРОГО ПО ЭТАЛОНУ «СОСТОЯНИЕ СЕЙЧАС» */}
        <div className="rounded-[28px] p-4 text-left flex flex-col gap-3 bg-[#F4FBF7] border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] relative z-10">
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-emerald-200/60 shadow-sm">
                  <img 
                    src={annaAvatarSrc}
                    alt="Анна советует" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-slate-800 leading-none">Анна</span>
                <span className="text-[10.5px] font-bold text-slate-400 mt-0.5 leading-none">Советник WFPB</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100/70 border border-emerald-200/50 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                АНАЛИТИЧЕСКИЙ ИТОГ
              </span>
              <img
                src={ingrGreenImg}
                alt="Система"
                className="w-6 h-6 object-contain shrink-0 opacity-80"
              />
            </div>
          </div>

          <div className="bg-white/95 backdrop-blur-xs p-4 rounded-2xl border border-white text-[13px] leading-relaxed font-medium text-slate-700 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <AnnaText text={annaAdviceText} userName={userName} />
          </div>
        </div>

        {/* 3. ДИНАМИКА КУРСА (28-ДНЕВНЫЙ ГРАФИК) — САМОСТОЯТЕЛЬНАЯ КАРТОЧКА */}
        <div className="bg-white rounded-[28px] border border-white p-4 shadow-[0_4px_20px_rgba(15,23,42,0.05)] text-left flex flex-col gap-3">
          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col min-w-0 pr-2">
              <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase whitespace-nowrap">
                ДИНАМИКА КУРСА
              </span>
              <span className="text-[15px] font-black text-slate-800 whitespace-nowrap">
                28-дневный график гидратации
              </span>
            </div>
            
            <div className="shrink-0 whitespace-nowrap text-[12px] font-bold text-slate-600 bg-slate-50/80 px-3 py-1 rounded-full border border-slate-200/60 shadow-xs">
              День <span className="text-sky-600 font-mono font-black">{selectedGraphDay}</span>
            </div>
          </div>

          {/* Интерактивный Recharts график */}
          <div className="relative pt-6 pb-2 px-1 h-44 outline-none border-none focus:outline-none focus:ring-0">
            
            {/* Пунктирная направляющая нормы */}
            <div className="absolute top-[30%] left-0 right-0 border-t border-dashed border-sky-400/30 flex justify-end z-0 pointer-events-none">
              <span className="text-[8px] text-sky-500/80 font-bold bg-white px-1.5 -mt-1.5 font-mono z-10">Норма (30мл/кг)</span>
            </div>

            <style>{`
              .recharts-wrapper *:focus,
              .recharts-surface:focus,
              .recharts-layer:focus,
              .recharts-bar-rect:focus {
                outline: none !important;
              }
            `}</style>

            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="colorWaterMissed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CBD5E1" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#94A3B8" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9.5, fill: "#94A3B8", fontWeight: "bold" }} />
                <YAxis hide type="number" />
                <Tooltip content={<CustomWaterTooltip />} cursor={{ fill: 'transparent' }} wrapperStyle={{ outline: 'none', border: 'none', zIndex: 50, pointerEvents: 'none' }} />
                <Bar 
                  dataKey="sum" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={18}
                  isAnimationActive={false}
                  shape={<CustomWaterBarShape />}
                  background={{ fill: 'transparent', stroke: 'transparent', strokeWidth: 0, strokeOpacity: 0 }}
                  style={{ outline: 'none', stroke: 'none' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.isFuture || entry.sum === 0 ? "#F1F5F9" : (entry.sum >= entry.goal ? "url(#colorWater)" : "url(#colorWaterMissed)")} 
                      stroke="transparent" 
                      strokeWidth={0} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. ЖУРНАЛ ГИДРАТАЦИИ — ОТДЕЛЬНАЯ ПАРЯЩАЯ КАРТОЧКА-СПИСОК */}
        <div className="bg-white rounded-[28px] p-4 border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] text-left flex flex-col gap-2.5">
          <div className="flex justify-between items-baseline px-1 mb-1">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
              ЖУРНАЛ ГИДРАТАЦИИ ЗА ДЕНЬ {selectedGraphDay}
            </span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
              Записей: {graphDayEntries.length}
            </span>
          </div>
          
          {graphDayEntries.length > 0 ? (
            <div className="flex flex-col gap-2 max-h-[160px] overflow-y-auto scrollbar-none pr-0.5">
              {graphDayEntries.map((entry, index) => (
                <div 
                  key={entry.id || index}
                  className="flex items-center justify-between px-3 py-2 rounded-2xl bg-gradient-to-r from-sky-50/50 via-white to-transparent border border-sky-100/50 transition-all shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={getVolumeIcon(entry.amount)} 
                      alt="Объем" 
                      className="w-5 h-5 object-contain drop-shadow-xs" 
                    />
                    <span className="text-[13px] font-black text-slate-700 font-mono">
                      {entry.amount} мл
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-400 font-mono">
                    {entry.time}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11.5px] text-slate-400 font-medium italic py-2 text-center">
              Записи воды за этот день отсутствуют
            </p>
          )}
        </div>

        {/* 5. ГЛОБАЛЬНАЯ АНАЛИТИКА КУРСА: СЕТКА 2x2 И ПЛАШКА РЕКОРДА */}
        <div className="flex flex-col gap-3 pb-5">
          <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase px-1 text-left">
            ГЛОБАЛЬНАЯ АНАЛИТИКА КУРСА
          </span>
          
          <div className="grid grid-cols-2 gap-2.5 text-left">
            
            {/* Box 1: Общий объем */}
            <div className="rounded-2xl p-3 flex items-center justify-between gap-2 border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] bg-[#EAF8F5]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-tight">ВЫПИТО ВСЕГО</span>
                <span className="text-[17px] font-black text-slate-800 shrink-0 whitespace-nowrap mt-0.5">{(totals.totalVolume / 1000).toFixed(1)} л</span>
                <span className="text-[9px] text-slate-400 font-medium">за курс</span>
              </div>
              <img
                src={volumeSplashCircleImg}
                alt="Выпито всего"
                className="w-12 h-12 object-contain shrink-0"
              />
            </div>

            {/* Box 2: Среднее за день */}
            <div className="rounded-2xl p-3 flex items-center justify-between gap-2 border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] bg-[#F0F7FF]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-tight">СРЕДНЕЕ В ДЕНЬ</span>
                <span className="text-[17px] font-black text-slate-800 shrink-0 whitespace-nowrap mt-0.5">{totals.average} мл</span>
                <span className="text-[9px] text-slate-400 font-medium">динамика</span>
              </div>
              <img
                src={statCareHandsImg}
                alt="Среднее в день"
                className="w-12 h-12 object-contain shrink-0"
              />
            </div>

            {/* Box 3: Успешных дней */}
            <div className="rounded-2xl p-3 flex items-center justify-between gap-2 border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] bg-[#F4F0FF]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-tight">УСПЕШНЫХ ДНЕЙ</span>
                <span className="text-[17px] font-black text-emerald-600 shrink-0 whitespace-nowrap mt-0.5">{totals.completedDays} дн</span>
                <span className="text-[9px] text-slate-400 font-medium">цель достигнута</span>
              </div>
              <img
                src={statSuccessTargetImg}
                alt="Успешных дней"
                className="w-12 h-12 object-contain shrink-0"
              />
            </div>

            {/* Box 4: Активная серия */}
            <div className="rounded-2xl p-3 flex items-center justify-between gap-2 border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] bg-[#FDF2F8]">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-tight">АКТИВНАЯ СЕРИЯ</span>
                <span className="text-[17px] font-black text-rose-600 shrink-0 whitespace-nowrap mt-0.5">+{totals.currentStreak} дн</span>
                <span className="text-[9px] text-slate-400 font-medium">лучшая: {totals.bestStreak} дн</span>
              </div>
              <img
                src={statStreakWaveImg}
                alt="Активная серия"
                className="w-12 h-12 object-contain shrink-0"
              />
            </div>

            {/* Рекордный день */}
            <div className="col-span-2 rounded-2xl p-3 flex items-center justify-between border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] bg-gradient-to-r from-[#EAF8F5] via-white to-[#EAF8F5]">
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={statMedalImg}
                  alt="Рекордный день"
                  className="w-11 h-11 object-contain shrink-0"
                />
                <div className="flex flex-col">
                  <span className="text-[10px] text-emerald-800 font-black tracking-tight uppercase">РЕКОРДНЫЙ ДЕНЬ</span>
                  <span className="text-[13px] font-bold text-slate-700 leading-tight mt-0.5">
                    День {totals.bestDayIndex}: выпито {totals.bestDayVolume} мл жидкости
                  </span>
                </div>
              </div>
              <div className="shrink-0 bg-emerald-100/80 border border-emerald-200/60 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider">
                ПОБЕДА
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Фиксированный нижний бар */}
      <div className="w-full">
        <BottomBar activeTab="my-day" />
      </div>

    </div>
  );
}