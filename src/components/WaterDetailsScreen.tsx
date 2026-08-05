import React, { useState, useEffect } from "react";
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
import BottomBar from "./BottomBar";
import { getAnnaWaterPhrase } from "../utils/waterPhrases";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import ingrGreenImg from "../assets/ingredients/ingr_green.webp";
import volumeSplashCircleImg from "../assets/images/water/volume_splash_circle.webp";
import statCareHandsImg from "../assets/images/water/stat_care_hands.webp";
import statSuccessTargetImg from "../assets/images/water/stat_success_target.webp";
import statStreakWaveImg from "../assets/images/water/stat_streak_wave.webp";
import statMedalImg from "../assets/images/water/stat_medal.webp";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'reminder_caution', intent: 'reminder' }).src;

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
  const [selectedGraphDay, setSelectedGraphDay] = useState<number>(currentDayIndex);
  
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

  // Generate Anna's customizable analysis quote for the selected day or today
  const [annaAdvice, setAnnaAdvice] = useState<{ text: string; mood: "good" | "neutral" | "warning" | "alert" }>({
    text: "Загрузка биологического ритма...",
    mood: "neutral"
  });

  useEffect(() => {
    // Generate advice based on current ratios
    const weight = getResolvedWeightForDay(currentDayIndex);
    const target = weight * 30;
    const todayLogs = waterLogs[currentDayIndex] || [];

    const hoursSinceLastDrink = (() => {
      if (todayLogs.length === 0) return 99
      const last = todayLogs[todayLogs.length - 1]
      return (Date.now() - last.timestamp) / (1000 * 60 * 60)
    })()

    const lastDrinkVolume = todayLogs.length > 0 ? todayLogs[todayLogs.length - 1].amount : 0;

    const text = getAnnaWaterPhrase(water, target, hoursSinceLastDrink, lastDrinkVolume);

    let mood: "good" | "neutral" | "warning" | "alert" = "neutral";
    if (water === 0) {
      mood = "alert";
    } else if (water >= target) {
      mood = "good";
    } else if (water >= target * 0.85) {
      mood = "good";
    } else if (hoursSinceLastDrink > 2.5) {
      mood = "warning";
    } else {
      mood = "good";
    }

    setAnnaAdvice({ text, mood });
  }, [water, currentDayIndex, waterLogs, userGender, userName]);

  // Calculations for past history cycle
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
  const glowBorderClass = {
    good: "border-brand-green-bright bg-gradient-to-b from-emerald-50/70 to-emerald-100/30 text-emerald-950 shadow-[0_10px_25px_-5px_rgba(22,181,81,0.15),_inset_0_2px_4px_rgba(255,255,255,0.7)]",
    neutral: "border-sky-300 bg-gradient-to-b from-sky-50/70 to-sky-100/30 text-sky-950 shadow-[0_10px_25px_-5px_rgba(56,189,248,0.15),_inset_0_2px_4px_rgba(255,255,255,0.7)]",
    warning: "border-amber-400 bg-gradient-to-b from-amber-50/70 to-amber-100/30 text-amber-950 shadow-[0_10px_25px_-5px_rgba(245,158,11,0.15),_inset_0_2px_4px_rgba(255,255,255,0.7)]",
    alert: "border-red-400 bg-gradient-to-b from-red-50/70 to-red-100/30 text-red-950 shadow-[0_10px_25px_-5px_rgba(239,68,68,0.15),_inset_0_2px_4px_rgba(255,255,255,0.7)]"
  }[annaAdvice.mood];

  const statusBadge = {
    good: "bg-emerald-500 text-white shadow-emerald-200",
    neutral: "bg-sky-500 text-white shadow-sky-200",
    warning: "bg-amber-500 text-white shadow-amber-200",
    alert: "bg-red-500 text-white shadow-red-200"
  }[annaAdvice.mood];

  const statusLabel = {
    good: "Отличный баланс 🌱",
    neutral: "Умеренный ритм 🌊",
    warning: "Лёгкое отставание ⚠️",
    alert: "Экстренный дефицит! 🚨"
  }[annaAdvice.mood];

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
        
        {/* Decorative dynamic icon */}
        <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center shadow-sm">
          <Droplet className="w-7 h-7 text-sky-500 fill-sky-500/20" strokeWidth={2.5} />
        </div>
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
            <div className="rounded-2xl p-3 flex flex-col gap-1.5 shadow-sm" style={{ backgroundColor: "#F2FBF9" }}>
              <span className="text-[11px] text-text-muted font-bold tracking-tight block uppercase">ОСТАЛОСЬ ДО ЦЕЛИ</span>
              <span className="text-[15px] font-black text-text-dark">
                {Math.max(0, waterGoalToday - water)} мл
              </span>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-1.5 shadow-sm" style={{ backgroundColor: "#F5F7FF" }}>
              <span className="text-[11px] text-text-muted font-bold tracking-tight block uppercase">КОЛ-ВО ПРИЁМОВ</span>
              <span className="text-[15px] font-black text-text-dark">
                {(waterLogs[currentDayIndex] || []).length} р / сутки
              </span>
            </div>
            <div className="rounded-2xl p-3 flex flex-col gap-1.5 col-span-2 flex-row justify-between items-center flex shadow-sm" style={{ backgroundColor: "#FAFAFF" }}>
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-text-muted font-bold tracking-tight block uppercase">ПОСЛЕДНИЙ ПРИЁМ</span>
                <span className="text-[14px] font-bold text-text-dark font-mono">
                  {(waterLogs[currentDayIndex] || []).slice(-1)[0]?.time || "Приёмов ещё нет"}
                </span>
              </div>
              <Clock className="w-5 h-5 text-sky-400" />
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
                <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-brand-green-bright border border-white flex items-center justify-center text-[9px]">
                  💧
                </div>
              </div>
              <div className="flex flex-col animate-[fadeIn_0.3s_ease]">
                <span className="text-[15px] font-black leading-none">Анна</span>
                <span className="text-[11px] font-bold text-text-muted mt-0.5 leading-none">Советник WFPB</span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block mt-1 tracking-wider uppercase ${statusBadge}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
            
            <img
              src={ingrGreenImg}
              alt="Система"
              className="w-7 h-7 object-contain shrink-0"
            />
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl text-[14px] leading-relaxed font-semibold text-slate-800">
            {annaAdvice.text}
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
          <div className="relative pt-6 pb-2 px-1">
            
            {/* Norm horizontal line indicator */}
            <div className="absolute top-[30%] left-0 right-0 border-t border-dashed border-sky-400/30 flex justify-end z-0">
              <span className="text-[8px] text-sky-400/80 font-bold bg-white px-1 -mt-1.5 font-mono z-10 transition-all">Норма (30мл/кг)</span>
            </div>

            {/* Flex container of mini-columns */}
            <div className="flex justify-between items-end gap-[3.5px] h-32 relative z-10">
              {Array.from({ length: 28 }).map((_, idx) => {
                const dayNum = idx + 1;
                const active = dayNum === selectedGraphDay;
                const isFuture = dayNum > currentDayIndex;
                
                // Get weight and water for this loop day
                const dWeight = dayWeights[dayNum] || getResolvedWeightForDay(dayNum);
                const dGoal = dWeight * 30;
                const dEntries = waterLogs[dayNum] || [];
                const dSum = dEntries.reduce((sum, e) => sum + e.amount, 0);
                const pct = dGoal > 0 ? (dSum / dGoal) : 0;
                
                // Height calculation capped between 8% and 100%
                let heightPct = 4;
                if (dSum > 0) {
                  heightPct = Math.min(100, Math.max(12, Math.round(pct * 100)));
                }

                // Bar styling colors
                let barBg = "bg-slate-200/60"; // future or zero
                if (!isFuture && dSum > 0) {
                  barBg = pct >= 1.0 
                    ? "bg-gradient-to-t from-sky-500 via-sky-400 to-cyan-400 shadow-[0_2px_4px_rgba(14,165,233,0.15)]" 
                    : "bg-gradient-to-t from-slate-400 to-slate-500";
                }

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedGraphDay(dayNum)}
                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    {/* Tooltip on hover/active */}
                    {active && (
                      <div className="absolute bottom-full mb-1.5 bg-[#1F2328] text-white text-[9px] py-1 px-1.5 rounded-lg font-bold font-mono whitespace-nowrap shadow-md z-40 transform -translate-x-0">
                        Д{dayNum}: {dSum}мл
                        <div className="w-1.5 h-1.5 bg-[#1F2328] rotate-45 mx-auto -mb-1 mt-0.5" />
                      </div>
                    )}

                    {/* Cylinder column element */}
                    <div 
                      className={`w-full rounded-t-full transition-all duration-300 relative ${barBg} ${
                        active 
                          ? "ring-2 ring-sky-500 ring-offset-1 scale-110 shadow-lg" 
                          : "hover:scale-105"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* Met goal green spark indicator dot on top */}
                      {!isFuture && dSum >= dGoal && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* X-axis labels representing the weeks */}
            <div className="flex justify-between text-[9px] text-[#737C86] font-bold mt-2.5 px-0.5 border-t border-gray-100 pt-1.5">
              <span>Неделя 1</span>
              <span>Неделя 2</span>
              <span>Неделя 3</span>
              <span>Неделя 4</span>
            </div>
          </div>

          {/* Interactive selected bar summary row */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-1.5 text-text-sec font-medium">
              <CheckCircle2 className="w-4.5 h-4.5 text-sky-500" />
              <span>День {selectedGraphDay} {selectedGraphDay > currentDayIndex ? "(будущий день)" : ""}:</span>
            </div>
            
            <span className="font-bold text-text-dark font-mono">
              {graphDaySum} мл выпито из {graphDayGoal} мл ({graphDayPercent}%)
            </span>
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
