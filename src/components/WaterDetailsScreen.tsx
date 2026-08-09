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
import { buildDailySummary } from "../utils/crossModuleSummary";
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
      <div className="flex flex-col p-2 bg-[#F1F8FE] rounded-xl shadow-sm border-none outline-none z-40">
        <div className="text-slate-700 text-xs font-bold">День {label}</div>
        <div className="text-[#0EA5E9] text-xs font-bold">{val} мл</div>
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
    return profileWeight || 65;
  };

  const currentWeightForDay = getResolvedWeightForDay(currentDayIndex);
  const waterGoalToday = currentWeightForDay * 30; // 30 ml per kg

  // Reactive store subscriptions for the cross-module Anna summary
  const storeWaterEntries = useAppStore((s) => s.waterEntries);
  const storeMovementEntries = useAppStore((s) => s.movementEntries);
  const storeMeasurementEntries = useAppStore((s) => s.measurementEntries);
  const storeDigestionEntries = useAppStore((s) => s.digestionEntries);
  
  // Selected graph day variables
  const graphDayWeight = getResolvedWeightForDay(selectedGraphDay);
  const graphDayGoal = graphDayWeight * 30;
  const graphDayEntries = waterLogs[selectedGraphDay] || [];
  const graphDaySum = graphDayEntries.reduce((acc, e) => acc + e.amount, 0);
  const graphDayPercent = Math.min(100, Math.round((graphDaySum / graphDayGoal) * 100));

  // Handle local daily weight edits
  const handleWeightChange = (delta: number) => {
    const updated = { ...dayWeights };
    const currentVal = updated[currentDayIndex] || currentWeightForDay;
    const newVal = Math.max(30, Math.min(250, currentVal + delta));
    updated[currentDayIndex] = newVal;
    setDayWeights(updated);
  };
  // Generate Anna's customizable analysis quote using useMemo
  const annaAdviceText = useMemo(() => {
    const summary = buildDailySummary(selectedGraphDay ?? currentDayIndex, useAppStore.getState());
    return getWaterFeedback(summary, userName, userGender);
  }, [selectedGraphDay, currentDayIndex, storeWaterEntries, storeMovementEntries, storeMeasurementEntries, storeDigestionEntries, userName, userGender]);

  // Calculations for past history cycle

  const chartData = React.useMemo(() => {
    return Array.from({ length: 28 }).map((_, idx) => {
      const dayNum = idx + 1;
      const dWeight = dayWeights[dayNum] || getResolvedWeightForDay(dayNum);
      const dGoal = dWeight * 30;
      const dEntries = waterLogs[dayNum] || [];
      const dSum = dEntries.reduce((sum, e) => sum + e.amount, 0);
      return { day: dayNum, sum: dSum, goal: dGoal, isFuture: dayNum > currentDayIndex };
    });
  }, [waterLogs, dayWeights, currentDayIndex]);

  const totals = React.useMemo(() => {
    const allEntries = Object.values(waterLogs).flat();
    const totalVolume = allEntries.reduce((acc, e) => acc + (e.amount || 0), 0);
    const average = Math.round(totalVolume / currentDayIndex);
    
    let complCount = 0;
    let maxVolume = 0;
    let maxDayIdx = 1;
    
    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    for (let d = 1; d <= 28; d++) {
      const dWeight = dayWeights[d] || getResolvedWeightForDay(d);
      const dGoal = dWeight * 30;
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

  // Color mappings for Anna's block glow and labels
  const glowBorderClass = "border-[#E3F2FD] bg-[#E3F2FD] shadow-sm";

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

  return (
    <div className="flex-1 flex flex-col justify-between select-none pointer-events-auto">
      
      {/* Header Bar */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between border-b border-gray-100/70 bg-white/70 backdrop-blur-md sticky top-0 z-40">
        <button 
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-2xl bg-gray-50 border border-gray-100/80 flex items-center justify-center text-text-dark hover:bg-gray-100 font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        
        <div className="flex flex-col text-center">
          <span className="text-[12px] font-extrabold text-brand-green-dark tracking-widest uppercase">АНАЛИТИКА ВОДЫ</span>
          <span className="text-[18px] font-black text-text-dark leading-none mt-0.5">День {currentDayIndex} из 28</span>
        </div>
        
        <div className="w-10 h-10" />
      </div>

      <div className="px-5 py-4 flex-1 overflow-y-auto flex flex-col gap-5">

        {/* 1. UPPER PART: TODAY'S DETAILED STATS */}
        <div className="rounded-[32px] p-5 text-left flex flex-col gap-4 relative overflow-hidden shadow-sm" style={{ backgroundColor: "#F0F9FF" }}>
          {/* Specular glass gloss accent */}
          <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-sky-100/20 to-transparent pointer-events-none" />
          
          <div className="flex justify-between items-center relative z-10">
            <div>
              <span className="text-[13px] font-bold text-sky-600/90 tracking-wide block uppercase font-sans">БАЛАНС НА СЕГОДНЯ</span>
              <h2 className="text-[28px] font-black text-text-dark leading-tight mt-0.5">
                {water} <span className="text-[16px] text-text-muted font-bold">из {waterGoalToday} мл</span>
              </h2>
            </div>
            
            {/* Round radial status percentage rings */}
            <div className="relative w-16 h-16 flex items-center justify-center bg-white rounded-2xl shadow-md border border-sky-100">
              <span className="text-[16px] font-mono font-black text-sky-600">
                {Math.round((water / waterGoalToday) * 100)}%
              </span>
              <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 bg-sky-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold border-2 border-white shadow-sm">
                ✓
              </div>
            </div>
          </div>

          {/* Volumetric water tube visualization inside today stats */}
          <div className="h-4.5 w-full rounded-full bg-slate-100 border border-slate-200/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08)] relative overflow-hidden">
            <motion.div 
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(100, (water / waterGoalToday) * 100)}%` }}
              className="h-full rounded-full bg-gradient-to-r from-sky-300 via-sky-500 to-cyan-600 shadow-[0_2px_6px_rgba(14,165,233,0.3)]"
            />
          </div>

          {/* Detailed stats grids */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="rounded-2xl pl-3 pr-2 py-1.5 flex flex-row justify-between items-center shadow-sm" style={{ backgroundColor: "#F2FBF9" }}>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-text-muted font-bold tracking-tight block uppercase">ОСТАЛОСЬ ДО ЦЕЛИ</span>
                <span className="text-[15px] font-black text-text-dark">
                  {Math.max(0, waterGoalToday - water)} мл
                </span>
              </div>
              <img src={ostalosImg} alt="Осталось" className="w-10 h-10 object-contain" />
            </div>
            <div className="rounded-2xl pl-3 pr-2 py-1.5 flex flex-row justify-between items-center shadow-sm" style={{ backgroundColor: "#F5F7FF" }}>
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] text-text-muted font-bold tracking-tight block uppercase">КОЛ-ВО ПРИЁМОВ</span>
                <span className="text-[15px] font-black text-text-dark">
                  {(waterLogs[currentDayIndex] || []).length} р / сутки
                </span>
              </div>
              <img src={kolichestvoImg} alt="Кол-во" className="w-10 h-10 object-contain" />
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-1.5 col-span-2 flex-row justify-between items-center flex shadow-sm" style={{ backgroundColor: "#FAFAFF" }}>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-text-muted font-bold tracking-tight block uppercase">ПОСЛЕДНИЙ ПРИЁМ</span>
                <span className="text-[14px] font-bold text-text-dark font-mono">
                  {(waterLogs[currentDayIndex] || []).slice(-1)[0]?.time || "Приёмов ещё нет"}
                </span>
              </div>
              <img src={timerImg} alt="Время" className="w-6 h-6 object-contain" />
            </div>
          </div>

          <div className="h-[1px] bg-slate-100 w-full" />

          {/* Live Weight Adjuster (Crucial Requirement for 30ml/kg automatic calculation!) */}
          <div className="flex justify-between items-center hover:brightness-95 transition-all p-3.5 rounded-[22px] shadow-sm" style={{ backgroundColor: "#F0FDF4" }}>
            <div className="flex flex-col gap-0.5">
              <span className="text-[12px] font-bold text-sky-700 tracking-tight flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> ВЕС ДЛЯ РАСЧЁТА НОРМЫ
              </span>
              <span className="text-[13px] text-text-sec font-medium leading-tight">
                30 мл / 1 кг • норма {waterGoalToday} мл
              </span>
            </div>
            
            <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl shadow-sm border border-sky-100">
              <button
                type="button"
                onClick={() => handleWeightChange(-1)}
                className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-black active:scale-90 transition-transform cursor-pointer"
              >
                <Minus className="w-4.5 h-4.5" />
              </button>
              <span className="text-[15px] font-black text-sky-600 min-w-[50px] text-center font-mono">
                {currentWeightForDay} кг
              </span>
              <button
                type="button"
                onClick={() => handleWeightChange(1)}
                className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-black active:scale-90 transition-transform cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. MIDDLE PART: ANNA'S BLOCK */}
        <div className={`rounded-[28px] p-4.5 text-left flex flex-col gap-3.5 transition-all duration-500 relative z-10 ${glowBorderClass}`}>
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-brand-green-mint/30 shadow-md">
                  <img 
                    src={annaAvatarSrc}
                    alt="Анна советует" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col animate-[fadeIn_0.3s_ease]">
                <span className="text-[15px] font-black leading-none">Анна</span>
                <span className="text-[11px] font-bold text-text-muted mt-0.5 leading-none">Советник WFPB</span>
              </div>
            </div>
            
            <img
              src={ingrGreenImg}
              alt="Система"
              className="w-7 h-7 object-contain shrink-0"
            />
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl text-[14px] leading-relaxed font-semibold text-slate-800">
            {annaAdviceText}
          </div>
        </div>

        {/* 3. GRAPHIC: 28-DAY chalenge course history cycle column chart */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-left flex flex-col gap-3">
          <div className="flex justify-between items-baseline px-1">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-brand-green-dark tracking-wide uppercase">ДИНАМИКА КУРСА</span>
              <span className="text-[16px] font-black text-text-dark">28-дневный график гидратации</span>
            </div>
            
            <div className="text-[11px] text-text-muted font-bold bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              Выбран день: <span className="text-sky-500 font-mono font-black">{selectedGraphDay}</span>
            </div>
          </div>

          {/* Interactive column visual cycle representation */}
          <div className="relative pt-6 pb-2 px-1 h-44 outline-none border-none focus:outline-none focus:ring-0" style={{ outline: 'none', border: 'none' }}>
            
            {/* Norm horizontal line indicator */}
            <div className="absolute top-[30%] left-0 right-0 border-t border-dashed border-sky-400/30 flex justify-end z-0 pointer-events-none">
              <span className="text-[8px] text-sky-400/80 font-bold bg-white px-1 -mt-1.5 font-mono z-10 transition-all">Норма (30мл/кг)</span>
            </div>

            <style>{`
              .recharts-wrapper *:focus,
              .recharts-surface:focus,
              .recharts-layer:focus,
              .recharts-bar-rect:focus {
                outline: none !important;
              }
            `}</style>

            <ResponsiveContainer width="100%" height="100%" className="outline-none border-none focus:outline-none focus:ring-0" style={{ outline: 'none', border: 'none' }}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }} className="outline-none border-none focus:outline-none focus:ring-0" style={{ outline: 'none', border: 'none' }}>
                <defs>
                  <linearGradient id="colorWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="colorWaterMissed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#64748b" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis hide type="number" />
                <Tooltip content={<CustomWaterTooltip />} cursor={{ fill: 'transparent' }} wrapperStyle={{ outline: 'none', border: 'none', zIndex: 50, pointerEvents: 'none' }} />
                <Bar 
                  dataKey="sum" 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                  isAnimationActive={false}
                  shape={<CustomWaterBarShape />}
                  background={{ fill: 'transparent', stroke: 'transparent', strokeWidth: 0, strokeOpacity: 0 }}
                  style={{ outline: 'none', stroke: 'none' }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.isFuture || entry.sum === 0 ? "#e2e8f0" : (entry.sum >= entry.goal ? "url(#colorWater)" : "url(#colorWaterMissed)")} stroke="transparent" strokeWidth={0} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive selected bar summary row */}
          <div className="bg-white rounded-2xl p-3.5 border border-[#E0F2F1]/60 flex flex-col gap-2 mt-1 shadow-sm">
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block">
                ЖУРНАЛ ГИДРАТАЦИИ ЗА ДЕНЬ {selectedGraphDay}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Записей: {graphDayEntries.length}
              </span>
            </div>
            
            {graphDayEntries.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto scrollbar-none pr-1">
                {graphDayEntries.map((entry, index) => {
                  const opacity = 0.05 + (index * 0.05);
                  return (
                    <div 
                      key={entry.id || index}
                      className="flex items-center justify-between px-3 py-2 rounded-xl transition-all"
                      style={{ backgroundColor: `rgba(14, 165, 233, ${opacity})` }}
                    >
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={getVolumeIcon(entry.amount)} 
                          alt="Объем" 
                          className="w-5 h-5 object-contain drop-shadow-sm" 
                        />
                        <span className="text-[13px] font-bold text-slate-700 font-mono">
                          {entry.amount} мл
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500 font-mono">
                        {entry.time}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-400 font-medium italic mt-0.5">
                Записи воды за этот день отсутствуют
              </p>
            )}
          </div>
        </div>

        {/* 4. LOWER PART: PERIOD ALL-TIME METRICS */}
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-bold text-brand-green-dark tracking-wide uppercase px-1 text-left">ГЛОБАЛЬНАЯ АНАЛИТИКА КУРСА</span>
          
          <div className="grid grid-cols-2 gap-3 text-left">
            
            {/* Box 1: Total Volume */}
            <div className="rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-sm relative overflow-hidden" style={{ backgroundColor: "#EAF8F5" }}>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] text-text-muted font-bold block">ВЫПИТО ВСЕГО</span>
                <span className="text-[17px] font-black text-text-dark mt-0.5">{(totals.totalVolume / 1000).toFixed(1)} л</span>
                <span className="text-[9px] text-text-muted">за все дни курса</span>
              </div>
              <img
                src={volumeSplashCircleImg}
                alt="Выпито всего"
                className="w-14 h-14 object-contain shrink-0"
              />
            </div>

            {/* Box 2: Average dynamic volume */}
            <div className="rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-sm relative overflow-hidden" style={{ backgroundColor: "#F0F7FF" }}>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] text-text-muted font-bold block">СРЕДНЕЕ В ДЕНЬ</span>
                <span className="text-[17px] font-black text-text-dark mt-0.5">{totals.average} мл</span>
                <span className="text-[9px] text-text-muted">динамика усреднения</span>
              </div>
              <img
                src={statCareHandsImg}
                alt="Среднее в день"
                className="w-14 h-14 object-contain shrink-0"
              />
            </div>

            {/* Box 3: Goal success rate counter */}
            <div className="rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-sm relative overflow-hidden" style={{ backgroundColor: "#F4F0FF" }}>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] text-text-muted font-bold block">УСПЕШНЫХ ДНЕЙ</span>
                <span className="text-[17px] font-black text-emerald-600 mt-0.5">{totals.completedDays} дн</span>
                <span className="text-[9px] text-text-muted">цель достигнута</span>
              </div>
              <img
                src={statSuccessTargetImg}
                alt="Успешных дней"
                className="w-14 h-14 object-contain shrink-0"
              />
            </div>

            {/* Box 4: Streaks check */}
            <div className="rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-sm relative overflow-hidden" style={{ backgroundColor: "#FDF2F8" }}>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[11px] text-text-muted font-bold block">АКТИВНАЯ СЕРИЯ</span>
                <span className="text-[17px] font-black text-orange-600 mt-0.5">+{totals.currentStreak} дн</span>
                <span className="text-[9px] text-[#A2A4A6] font-bold">лучшая: {totals.bestStreak} дн</span>
              </div>
              <img
                src={statStreakWaveImg}
                alt="Активная серия"
                className="w-14 h-14 object-contain shrink-0"
              />
            </div>

            {/* Banner: Best Volume recorded overall */}
            <div className="col-span-2 rounded-2xl p-3.5 flex items-center justify-between shadow-sm" style={{ backgroundColor: "#EAF8F5" }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0">
                  <img
                    src={statMedalImg}
                    alt="Рекордный день"
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#047857] font-bold tracking-tight uppercase">РЕКОРДНЫЙ ДЕНЬ</span>
                  <span className="text-[14px] font-bold text-[#065F46] mt-0.5">День {totals.bestDayIndex}: выпито {totals.bestDayVolume} мл жидкости</span>
                </div>
              </div>
              <div className="shrink-0 bg-[#34D399]/20 text-[#047857] px-2.5 py-1 rounded-full text-[12px] font-extrabold">ПОБЕДА</div>
            </div>

          </div>
        </div>

      </div>

      {/* Embedded Navigation Bar strictly synced */}
      <div className="w-full">
        <BottomBar activeTab="my-day" />
      </div>

    </div>
  );
}
