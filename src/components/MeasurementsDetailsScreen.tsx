import React, { useState, useEffect, useMemo } from "react";
import BottomBar from "./BottomBar";
import { ArrowLeft } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { getMeasurementsFeedback } from "../utils/measurementsCoaching";
import { buildDailySummary } from "../utils/crossModuleSummary";
import AnnaText from "./AnnaText";
import { api } from "../utils/api";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'clear_explanation' }).src;

import stateEnergyHigh from "../assets/images/measurements/state_energy_high.webp";
import stateEnergyNormal from "../assets/images/measurements/state_energy_normal.webp";
import stateEnergyLow from "../assets/images/measurements/state_energy_low.webp";
import stateMoodGood from "../assets/images/measurements/state_mood_good.webp";
import stateMoodNormal from "../assets/images/measurements/state_mood_normal.webp";
import stateMoodBad from "../assets/images/measurements/state_mood_bad.webp";
import stateWellbeingExcellent from "../assets/images/measurements/state_wellbeing_excellent.webp";
import stateWellbeingNormal from "../assets/images/measurements/state_wellbeing_normal.webp";
import stateWellbeingPoor from "../assets/images/measurements/state_wellbeing_poor.webp";
import iconPulse from "../assets/images/measurements/icon_pulse.webp";
import iconWeight from "../assets/images/measurements/icon_weight.webp";
import iconResource from "../assets/images/measurements/icon_resource.webp";
import iconProgress from "../assets/images/measurements/icon_progress.webp";
import iconTime from "../assets/images/measurements/icon_time.webp";
import ingrGreen from "../assets/ingredients/ingr_green.webp";

const ENERGY_STATES = [
  { label: "Высокая", img: stateEnergyHigh },
  { label: "Спокойная", img: stateEnergyNormal },
  { label: "Сниженная", img: stateEnergyLow }
];
const MOOD_STATES = [
  { label: "Лёгкое", img: stateMoodGood },
  { label: "Ровное", img: stateMoodNormal },
  { label: "Тяжёлое", img: stateMoodBad }
];
const WELLBEING_STATES = [
  { label: "Хорошее", img: stateWellbeingExcellent },
  { label: "Среднее", img: stateWellbeingNormal },
  { label: "Плохое", img: stateWellbeingPoor }
];

export const parseTonus = (tonusString: string | undefined | null): { energy: string; mood: string; wellbeing: string } => {
  if (!tonusString) return { energy: "0", mood: "0", wellbeing: "0" };
  const parts = tonusString.split("|").map(p => p.trim());
  const energyIdx = ENERGY_STATES.findIndex(s => s.label === parts[0]);
  const moodIdx = MOOD_STATES.findIndex(s => s.label === parts[1]);
  const wellbeingIdx = WELLBEING_STATES.findIndex(s => s.label === parts[2]);
  return {
    energy: energyIdx >= 0 ? String(energyIdx) : "0",
    mood: moodIdx >= 0 ? String(moodIdx) : "0",
    wellbeing: wellbeingIdx >= 0 ? String(wellbeingIdx) : "0"
  };
};

export interface MeasurementLogEntry {
  id: string;
  dayIndex: number;
  timestamp: number;
  timeString: string;
  
  // Subjective
  energy: "высокая" | "спокойная" | "сниженная" | "";
  mood: "лёгкое" | "ровное" | "тяжёлое" | "";
  wellbeing: "хорошее" | "среднее" | "плохое" | "";
  tonus?: string;
  
  // Objective
  pulse: number | null;
  weight: number | null;
  systolic: number | null;
  diastolic: number | null;
}

interface MeasurementsDetailsScreenProps {
  currentDayIndex: number;
  userName: string;
  userGender: "female" | "male";
  onBack: () => void;
  measurementLogs: Record<number, MeasurementLogEntry[]>;
  setMeasurementLogs: React.Dispatch<React.SetStateAction<Record<number, MeasurementLogEntry[]>>>;

  // Day notes
  dayNotes: Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>;
  setDayNotes: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>>>;
}

export default function MeasurementsDetailsScreen({
  currentDayIndex,
  userName,
  userGender,
  onBack,
  measurementLogs,
  setMeasurementLogs,
  dayNotes,
  setDayNotes
}: MeasurementsDetailsScreenProps) {
  const selectedGraphDay = useAppStore((s) => s.selectedGraphDay);
  const setSelectedGraphDay = useAppStore((s) => s.setSelectedGraphDay);
  
  const [activeChartMetric, setActiveChartMetric] = useState<"energy" | "mood" | "wellbeing" | "pulse" | "weight">("energy");

  useEffect(() => {
    api<Record<string, any>[]>("/api/metrics/daily")
      .then(records => {
        if (!records || !Array.isArray(records)) return;
        const byDay: Record<number, MeasurementLogEntry[]> = {};
        for (const r of records) {
          const rawMeasurements = r.measurements;
          let measurements: any[] = [];
          if (typeof rawMeasurements === "string") { try { measurements = JSON.parse(rawMeasurements); } catch {} }
          else if (Array.isArray(rawMeasurements)) { measurements = rawMeasurements; }
          for (const entry of measurements) {
            if (entry && entry.id && entry.dayIndex !== undefined) {
              const d = Number(entry.dayIndex);
              if (!byDay[d]) byDay[d] = [];
              byDay[d].push(entry as MeasurementLogEntry);
            }
          }
        }
        if (Object.keys(byDay).length > 0) {
          setMeasurementLogs(prev => {
            const merged = { ...prev };
            for (const [d, entries] of Object.entries(byDay)) {
              merged[Number(d)] = entries;
            }
            useAppStore.getState().setMeasurementEntries(
              Object.entries(merged).flatMap(([dayStr, list]) =>
                (list || []).map(e => ({
                  dayIndex: Number(dayStr),
                  weight: e.weight ?? null,
                  systolic: e.systolic ?? null,
                  diastolic: e.diastolic ?? null,
                  timestamp: e.timestamp,
                  id: e.id,
                  timeString: e.timeString,
                  pulse: e.pulse ?? null,
                  tonus: e.tonus,
                  energy: e.energy,
                  mood: e.mood,
                  wellbeing: e.wellbeing,
                }))
              )
            );
            return merged;
          });
        }
      })
      .catch((err) => console.warn("[MeasurementsDetails] failed to load history:", err));
  }, [setMeasurementLogs]);

  const profileInitialWeight = useAppStore((s) => s.userProfile?.initialWeight);

  const getGlobalMeasurementMetrics = () => {
    let totalLogsCount = 0;
    let daysWithLogsCount = 0;
    
    let firstLoggedWeight: number | null = null;
    let finalWeight: number | null = null;
    let minPulse = 200;
    let maxPulse = 0;
    let pulseSum = 0;
    let pulseCount = 0;

    let highEnergyDays = 0;
    let goodWellbeingDays = 0;

    for (let d = 1; d <= currentDayIndex; d++) {
      const dailyList = measurementLogs[d] || [];
      if (dailyList.length > 0) {
        daysWithLogsCount++;
        totalLogsCount += dailyList.length;

        dailyList.forEach(item => {
          if (item.weight !== null) {
            if (firstLoggedWeight === null) firstLoggedWeight = item.weight;
            finalWeight = item.weight;
          }
          if (item.pulse !== null && item.pulse > 30) {
            pulseSum += item.pulse;
            pulseCount++;
            if (item.pulse < minPulse) minPulse = item.pulse;
            if (item.pulse > maxPulse) maxPulse = item.pulse;
          }
          if (item.energy === "высокая" || item.energy === "спокойная") highEnergyDays++;
          if (item.wellbeing === "хорошее") goodWellbeingDays++;
        });
      }
    }

    const weightLoss = firstLoggedWeight !== null && finalWeight !== null 
      ? Number((firstLoggedWeight - finalWeight).toFixed(1)) 
      : 0;

    const startingWeight = firstLoggedWeight ?? profileInitialWeight ?? 0;

    return {
      totalLogsCount,
      daysWithLogsCount,
      avgPulse: pulseCount > 0 ? Math.round(pulseSum / pulseCount) : 68,
      minPulse: minPulse === 200 ? 58 : minPulse,
      maxPulse: maxPulse === 0 ? 86 : maxPulse,
      weightLoss,
      initialWeight: startingWeight,
      currentWeight: finalWeight || startingWeight,
      highEnergyPercent: totalLogsCount > 0 ? Math.round((highEnergyDays / totalLogsCount) * 100) : 0,
      goodWellbeingPercent: totalLogsCount > 0 ? Math.round((goodWellbeingDays / totalLogsCount) * 100) : 0
    };
  };

  const stats = getGlobalMeasurementMetrics();

  const todayList = measurementLogs[currentDayIndex] || [];
  const selectedDayList = measurementLogs[selectedGraphDay] || [];
  
  const latestTodayLog = todayList.length > 0 ? todayList[todayList.length - 1] : null;

  const storeDigestionEntries = useAppStore((s) => s.digestionEntries);
  const storeWaterEntries = useAppStore((s) => s.waterEntries);
  const storeMovementEntries = useAppStore((s) => s.movementEntries);
  const storeMeasurementEntries = useAppStore((s) => s.measurementEntries);

  const latestBP = useMemo(() => {
    if (latestTodayLog?.systolic && latestTodayLog?.diastolic) {
      return { sys: latestTodayLog.systolic, dia: latestTodayLog.diastolic };
    }
    const allEntries = [...storeMeasurementEntries]
      .filter(m => m.systolic && m.diastolic)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (allEntries.length > 0) {
      return { sys: allEntries[0].systolic, dia: allEntries[0].diastolic };
    }
    return null;
  }, [latestTodayLog, storeMeasurementEntries]);

  const annaComment = useMemo(() => {
    const summary = buildDailySummary(selectedGraphDay ?? currentDayIndex, useAppStore.getState(), currentDayIndex);
    return getMeasurementsFeedback(summary, userName, userGender);
  }, [
    selectedGraphDay,
    currentDayIndex,
    storeDigestionEntries,
    storeWaterEntries,
    storeMovementEntries,
    storeMeasurementEntries,
    userGender,
    userName
  ]);

  const { chartData, maxBars } = React.useMemo(() => {
    let max = 0;
    const data: any[] = [];
    
    for (let d = 1; d <= 28; d++) {
      const logs = measurementLogs[d] || [];
      const sortedLogs = [...logs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      
      if (sortedLogs.length > max) max = sortedLogs.length;
      
      let point: any = { day: d, logs: sortedLogs, hitboxVal: 0.1 };
      
      sortedLogs.forEach((log, i) => {
         point[`log${i}`] = 1;
      });
      
      if (sortedLogs.length > 0) {
        const validPulses = sortedLogs.filter(e => e.pulse !== null).map(e => e.pulse as number);
        point.avgPulse = validPulses.length > 0 ? Math.round(validPulses.reduce((a, b) => a + b, 0) / validPulses.length) : null;
        
        const validWeights = sortedLogs.filter(e => e.weight !== null).map(e => e.weight as number);
        point.avgWeight = validWeights.length > 0 ? Number((validWeights.reduce((a, b) => a + b, 0) / validWeights.length).toFixed(1)) : null;
      } else {
        point.avgPulse = null;
        point.avgWeight = null;
      }
      
      data.push(point);
    }
    return { chartData: data, maxBars: Math.max(1, max) };
  }, [measurementLogs]);

  const HitboxShape = (props: any) => {
    const { x, y, width, height, payload, background } = props;
    const fullHeight = background ? background.height : (height > 0 ? height : 200);
    const bottomY = background ? background.y + background.height : y + height;
    const topY = bottomY - fullHeight;
    return (
      <rect
        x={x}
        y={topY}
        width={width}
        height={fullHeight || 200}
        fill="transparent"
        cursor="pointer"
        style={{ outline: 'none', border: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (payload && payload.day) {
            setSelectedGraphDay(Number(payload.day));
          }
        }}
      />
    );
  };

  const StackedBlockShape = (props: any) => {
    const { x, y, width, height, fill } = props;
    if (!height || height === 0) return null;
    const gap = 2;
    return (
      <rect 
         x={x} 
         y={y + gap/2} 
         width={width} 
         height={Math.max(0, height - gap)} 
         rx={4} 
         ry={4} 
         fill={fill} 
      />
    );
  };

  const PhysicalBarShape = (props: any) => {
    const { x, y, width, height, fill } = props;
    if (!height || height === 0) return null;
    return (
      <rect 
         x={x} 
         y={y} 
         width={width} 
         height={height} 
         rx={4} 
         ry={4} 
         fill={fill} 
      />
    );
  };

  const getFillColor = (log: any, metric: string): string => {
    if (!log) return "transparent";
    
    const parsed = parseTonus(log.tonus);
    let val = 0;
    let baseColor = "";

    if (metric === "energy") {
      val = parseInt(parsed.energy, 10);
      baseColor = "#C5E1A5";
    } else if (metric === "mood") {
      val = parseInt(parsed.mood, 10);
      baseColor = "#B2DFDB";
    } else if (metric === "wellbeing") {
      val = parseInt(parsed.wellbeing, 10);
      baseColor = "#A5D6A7";
    }

    if (val === 0) return baseColor;
    if (val === 1) return "#FFF59D";
    if (val === 2) return "#FFCCBC";
    return baseColor;
  };

  const CustomMeasureTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const { day, logs } = p;
      
      if (!logs || logs.length === 0) {
        return (
          <div className="bg-white/95 backdrop-blur-md shadow-[0_8px_24px_rgba(15,23,42,0.12)] border border-white rounded-2xl p-3 text-xs font-bold text-slate-800 z-[100]">
            <div>День {day}</div>
            <div className="text-slate-400 font-medium mt-0.5">Нет записей</div>
          </div>
        );
      }

      const isPhysical = activeChartMetric === "pulse" || activeChartMetric === "weight";

      return (
        <div className="bg-white/95 backdrop-blur-md shadow-[0_8px_24px_rgba(15,23,42,0.12)] border border-white rounded-2xl p-3 text-xs font-bold text-slate-800 z-[100] max-w-[220px]">
          <div className="mb-2 border-b border-slate-100 pb-1.5 flex justify-between items-center gap-3">
            <span>День {day}</span>
            <span className="text-[10px] text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">Записей: {logs.length}</span>
          </div>
          
          <div className="flex flex-col gap-2">
            {[...logs].map((log: any, idx: number) => {
               let mainText = "";
               let subText = "";
               let color = "#cbd5e1";
               
               if (isPhysical) {
                 if (activeChartMetric === "pulse") {
                   mainText = log.pulse ? `${log.pulse} уд/мин` : "Нет данных";
                   color = "#81C784";
                 } else {
                   mainText = log.weight ? `${log.weight} кг` : "Нет данных";
                   color = "#80CBC4";
                 }
               } else {
                 const parsed = parseTonus(log.tonus);
                 if (activeChartMetric === "energy") {
                   mainText = ENERGY_STATES[parseInt(parsed.energy, 10)]?.label || "—";
                 } else if (activeChartMetric === "mood") {
                   mainText = MOOD_STATES[parseInt(parsed.mood, 10)]?.label || "—";
                 } else if (activeChartMetric === "wellbeing") {
                   mainText = WELLBEING_STATES[parseInt(parsed.wellbeing, 10)]?.label || "—";
                 }
                 
                 const eLabel = ENERGY_STATES[parseInt(parsed.energy, 10)]?.label || "—";
                 const mLabel = MOOD_STATES[parseInt(parsed.mood, 10)]?.label || "—";
                 const wLabel = WELLBEING_STATES[parseInt(parsed.wellbeing, 10)]?.label || "—";
                 
                 if (activeChartMetric === "energy") subText = `(${mLabel}, ${wLabel})`;
                 if (activeChartMetric === "mood") subText = `(${eLabel}, ${wLabel})`;
                 if (activeChartMetric === "wellbeing") subText = `(${eLabel}, ${mLabel})`;
                 
                 color = getFillColor(log, activeChartMetric);
               }
               
               return (
                 <div key={log.id || idx} className="flex items-start gap-2 leading-tight">
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 w-8 shrink-0">{log.timeString || "—"}</span>
                    <div className="w-2.5 h-2.5 rounded-full mt-[3px] shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                    <div className="flex flex-col">
                       <span className="text-slate-700">{mainText}</span>
                       {subText && <span className="text-[10px] text-slate-400 font-medium">{subText}</span>}
                    </div>
                 </div>
               );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#FAFBFB] text-slate-800 flex flex-col justify-between relative pb-5" id="measurements-analytics-screen">
      
      {/* Основной контентный поток без жестких max-h */}
      <div className="w-full max-w-md mx-auto px-4 pt-3.5 flex flex-col gap-4">
        
        {/* Шапка / Navigation Header */}
        <header className="flex justify-between items-center w-full py-1">
          <button 
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-[0_2px_8px_rgba(15,23,42,0.04)] flex items-center justify-center text-slate-600 active:scale-95 transition-transform cursor-pointer"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5 antialiased" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-widest leading-none">Дневник</span>
            <span className="text-[17px] font-bold text-slate-900 tracking-tight mt-0.5">Замеры & Тонус</span>
          </div>
          <div className="w-10 h-10" />
        </header>

        {/* Стили для полного снятия outline Recharts */}
        <style>{`
          .recharts-wrapper, .recharts-wrapper:focus, 
          .recharts-surface, .recharts-surface:focus,
          .recharts-wrapper *:focus {
            outline: none !important;
            border: none !important;
            box-shadow: none !important;
          }
        `}</style>

        {/* 1. ПАРЯЩИЙ ОСТРОВ: ТЕКУЩИЙ ЗАМЕР */}
        <section className="bg-white rounded-[28px] border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] p-4 sm:p-5 flex flex-col gap-3.5 text-left">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="text-[10px] font-black text-emerald-600 tracking-wider uppercase block">СОСТОЯНИЕ НА СЕГОДНЯ</span>
              <h2 className="text-[18px] font-black text-slate-900 tracking-tight mt-0.5">Текущий замер</h2>
            </div>
            <div className="bg-emerald-50 text-emerald-800 rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0 whitespace-nowrap">
              {todayList.length} замер{todayList.length === 1 ? "" : todayList.length > 1 && todayList.length < 5 ? "а" : "ов"} сегодня
            </div>
          </div>

          {latestTodayLog ? (
            <div className="flex flex-col gap-3">
              
              {/* Субъективные состояния: Триада тонуса */}
              <div className="flex flex-row justify-around items-center gap-1 pt-2 pb-1 bg-slate-50/60 rounded-2xl border border-slate-100/60">
                {[
                  { title: "САМОЧУВСТВИЕ", idx: +parseTonus(latestTodayLog.tonus).wellbeing, states: WELLBEING_STATES },
                  { title: "ЭНЕРГИЯ", idx: +parseTonus(latestTodayLog.tonus).energy, states: ENERGY_STATES },
                  { title: "НАСТРОЕНИЕ", idx: +parseTonus(latestTodayLog.tonus).mood, states: MOOD_STATES }
                ].map((s) => {
                  const stateIdx = s.idx >= 0 && s.idx < s.states.length ? s.idx : 0;
                  const item = s.states[stateIdx];
                  return (
                    <div key={s.title} className="flex flex-col items-center gap-1 px-1">
                      <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider">{s.title}</span>
                      <img src={item.img} alt={item.label} className="w-14 h-14 sm:w-16 sm:h-16 object-contain" />
                      <span className="text-[11.5px] font-extrabold text-slate-700">{item.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* Объективные метрики: Адаптивная Bento-сетка */}
              <div className={`grid ${latestBP ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pt-0.5`}>
                
                {/* Пульс */}
                <div className="bg-emerald-50/50 rounded-2xl py-2 px-2.5 flex items-center justify-between border border-emerald-100/40">
                  <img src={iconPulse} alt="Пульс" className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0" />
                  <div className="flex flex-col text-right min-w-0">
                    <span className="text-[9px] text-emerald-700 font-extrabold uppercase tracking-wider leading-none mb-1">Пульс</span>
                    <span className="text-lg sm:text-xl font-black text-slate-800 font-mono tracking-tight whitespace-nowrap leading-none">
                      {latestTodayLog?.pulse ? `${latestTodayLog.pulse}` : "—"}
                    </span>
                  </div>
                </div>

                {/* Давление */}
                {latestBP && (
                  <div className="bg-emerald-50/50 rounded-2xl py-2 px-2 flex flex-col items-center justify-center text-center border border-emerald-100/40">
                    <span className="text-[9px] text-emerald-700 font-extrabold uppercase tracking-wider leading-none mb-1">Давление</span>
                    <span className="text-lg sm:text-xl font-black text-slate-800 font-mono tracking-tight whitespace-nowrap leading-none">
                      {latestBP.sys}/{latestBP.dia}
                    </span>
                    <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0 mt-1">мм рт.ст.</span>
                  </div>
                )}

                {/* Вес */}
                <div className="bg-teal-50/50 rounded-2xl py-2 px-2.5 flex items-center justify-between border border-teal-100/40">
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[9px] text-teal-800 font-extrabold uppercase tracking-wider leading-none mb-1">Вес</span>
                    <span className="text-lg sm:text-xl font-black text-slate-800 font-mono tracking-tight whitespace-nowrap leading-none">
                      {latestTodayLog?.weight ? `${latestTodayLog.weight}` : "—"}
                    </span>
                  </div>
                  <img src={iconWeight} alt="Вес" className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0" />
                </div>
              </div>

            </div>
          ) : (
            <div className="py-6 text-center flex flex-col items-center justify-center">
              <span className="text-3xl filter saturate-75 mb-2">📊</span>
              <p className="text-[13.5px] text-slate-500 font-medium italic">Замеров сегодня ещё не проводилось.</p>
              <p className="text-[11px] text-slate-400 mt-1">Обычный клик по кнопке «Замеры» позволит мгновенно записать состояние!</p>
            </div>
          )}
        </section>

        {/* 2. ПАРЯЩИЙ ОСТРОВ: СОВЕТ АННЫ (Теплый пастельно-оранжевый / персиковый) */}
        <section 
          className="bg-[#FFF8F2] shadow-[0_4px_20px_rgba(249,115,22,0.06)] rounded-[28px] border border-white p-3.5 sm:p-4 text-left flex flex-col gap-2 relative z-10" 
          id="anna-measurements-advice-box"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-orange-200/70 shadow-xs">
                  <img 
                    src={annaAvatarSrc}
                    alt="Анна" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] font-bold text-slate-800 leading-none">Анна</span>
                  <span className="bg-orange-100/80 text-orange-800 text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Биометрия
                  </span>
                </div>
                <span className="text-[10.5px] text-slate-400 font-medium mt-0.5 leading-none">Советник WFPB</span>
              </div>
            </div>
            
            <img src={ingrGreen} alt="WFPB" className="w-6 h-6 object-contain opacity-90" />
          </div>

          <div className="bg-white/90 backdrop-blur-xs p-3 rounded-2xl text-[13px] leading-snug font-normal text-slate-700 border border-orange-100/50 shadow-[0_2px_8px_rgba(0,0,0,0.02)] [&_p+p]:mt-1.5">
            <AnnaText text={annaComment || "Сделай свой первый замер сегодня, чтобы я могла проанализировать твою динамику!"} userName={userName} />
          </div>
        </section>

        {/* 3. ПАРЯЩИЙ ОСТРОВ: 28-ДНЕВНЫЙ ГРАФИК */}
        <section className="bg-white rounded-[28px] border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] p-4 text-left flex flex-col gap-3">
          <div className="flex justify-between items-baseline px-1">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black text-emerald-600 tracking-wider uppercase">СТАТИСТИКА КУРСА</span>
              <span className="text-[16px] font-bold text-slate-900 tracking-tight">Динамика за 28 дней</span>
            </div>
            
            <div className="text-[10.5px] text-slate-500 font-bold bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-100 shrink-0">
              Выбран День: <span className="text-emerald-700 font-mono font-black">{selectedGraphDay}</span>
            </div>
          </div>

          {/* Селектор метрик с защитой мобильной верстки */}
          <div className="flex flex-row justify-between gap-1 w-full bg-slate-100/70 p-1 rounded-2xl">
            {[
              { id: "energy", label: "Энергия", activeClass: "bg-white shadow-xs text-emerald-800 font-bold" },
              { id: "mood", label: "Настроение", activeClass: "bg-white shadow-xs text-teal-800 font-bold" },
              { id: "wellbeing", label: "Тонус", activeClass: "bg-white shadow-xs text-emerald-800 font-bold" },
              { id: "pulse", label: "Пульс", activeClass: "bg-white shadow-xs text-emerald-800 font-bold" },
              { id: "weight", label: "Вес", activeClass: "bg-white shadow-xs text-teal-800 font-bold" }
            ].map(tab => {
              const isActive = activeChartMetric === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveChartMetric(tab.id as any)}
                  className={`flex-1 min-w-0 text-center py-1.5 px-0.5 rounded-xl text-[10.5px] transition-all cursor-pointer ${
                    isActive ? tab.activeClass : "text-slate-500 hover:text-slate-800 font-medium"
                  }`}
                >
                  <span className="truncate block">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative pt-3 pb-1 px-0.5 h-44 outline-none border-none">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 6, left: 6, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 9.5, fill: "#94a3b8" }} />
                <YAxis hide type="number" allowDecimals={false} domain={[0, 'dataMax']} />
                <Tooltip content={<CustomMeasureTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5, rx: 4, ry: 4 }} wrapperStyle={{ pointerEvents: 'none', zIndex: 100 }} />
                
                {activeChartMetric === "pulse" || activeChartMetric === "weight" ? (
                  <Bar
                    dataKey={activeChartMetric === "pulse" ? "avgPulse" : "avgWeight"}
                    stackId="a"
                    isAnimationActive={false}
                    shape={<PhysicalBarShape />}
                    maxBarSize={18}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={activeChartMetric === "pulse" ? "#81C784" : "#80CBC4"}
                        stroke="transparent"
                        strokeWidth={0}
                      />
                    ))}
                  </Bar>
                ) : (
                  Array.from({ length: maxBars }).map((_, i) => (
                    <Bar
                      key={`bar-${i}`}
                      dataKey={`log${i}`}
                      stackId="a"
                      isAnimationActive={false}
                      shape={<StackedBlockShape />}
                      maxBarSize={18}
                    >
                      {chartData.map((entry, index) => {
                        const logData = entry.logs[i];
                        return (
                          <Cell
                            key={`cell-${index}-${i}`}
                            fill={getFillColor(logData, activeChartMetric)}
                            stroke="transparent"
                            strokeWidth={0}
                          />
                        );
                      })}
                    </Bar>
                  ))
                )}

                <Bar 
                  dataKey="hitboxVal" 
                  stackId="a"
                  fill="transparent" 
                  shape={<HitboxShape />} 
                  background={{ fill: 'transparent' }} 
                  isAnimationActive={false} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* История замеров выбранного дня */}
          <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100/80 flex flex-col gap-2 relative mt-0.5">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                История замеров • День {selectedGraphDay}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Записей: {selectedDayList.length}
              </span>
            </div>

            {selectedDayList.length > 0 ? (
              <div className="flex flex-col rounded-xl overflow-hidden border border-emerald-100/80 bg-white max-h-[160px] overflow-y-auto scrollbar-none">
                {selectedDayList.map((entry, index) => {
                  const p = parseTonus(entry.tonus);
                  return (
                    <div 
                      key={entry.id || index}
                      className="flex flex-row items-center justify-between py-2 px-2.5 border-b border-emerald-50 last:border-b-0"
                    >
                      <div className="flex items-center gap-1 shrink-0">
                        <img src={iconTime} alt="time" className="w-3.5 h-3.5 object-contain opacity-50" />
                        <span className="text-[11px] text-slate-500 font-mono font-semibold">{entry.timeString}</span>
                      </div>
                      
                      <div className="flex gap-1 items-center shrink-0">
                        <img src={ENERGY_STATES[+p.energy]?.img || ENERGY_STATES[0].img} className="w-5 h-5 object-contain" alt="energy" />
                        <img src={MOOD_STATES[+p.mood]?.img || MOOD_STATES[0].img} className="w-5 h-5 object-contain" alt="mood" />
                        <img src={WELLBEING_STATES[+p.wellbeing]?.img || WELLBEING_STATES[0].img} className="w-5 h-5 object-contain" alt="wellbeing" />
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="flex items-center gap-0.5 shrink-0">
                          <img src={iconPulse} alt="pulse" className="w-3.5 h-3.5 object-contain" />
                          <span className="text-[10.5px] font-mono font-bold text-slate-700">{entry.pulse || "—"}</span>
                        </div>
                        <div className="flex items-center justify-center shrink-0 bg-emerald-50 rounded-md px-1.5 py-0.5 border border-emerald-150">
                          <span className="text-[9.5px] font-mono font-bold text-emerald-800 tracking-tight whitespace-nowrap">
                            {entry.systolic && entry.diastolic ? `${entry.systolic}/${entry.diastolic}` : "—/—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <img src={iconWeight} alt="weight" className="w-3.5 h-3.5 object-contain" />
                          <span className="text-[10.5px] font-mono font-bold text-slate-700">{entry.weight || "—"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-400 font-medium italic mt-0.5">
                {selectedGraphDay > currentDayIndex ? "Данные из будущего скрыты" : "Замеры в этот день отсутствуют"}
              </p>
            )}
          </div>
        </section>

        {/* 4. СТАТИСТИКА КУРСА: ПАРЯЩИЕ BENTO-ОСТРОВА */}
        <div className="grid grid-cols-2 gap-3 mb-2 text-left">
          
          {/* Средний пульс: персиковый цвет под карточку Анны */}
          <div className="bg-[#FFF8F2] rounded-[22px] border border-white shadow-[0_4px_16px_rgba(249,115,22,0.05)] p-3 flex flex-col gap-1 relative overflow-hidden">
            <img src={iconPulse} alt="Пульс" className="absolute top-2 right-2 w-10 h-10 object-contain opacity-90 pointer-events-none" />
            <div className="relative z-10 pr-9">
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">СРЕДНИЙ ПУЛЬС</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[22px] font-black text-slate-900 font-mono tracking-tight leading-none">{stats.avgPulse}</span>
                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0">уд/мин</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-orange-900/80 relative z-10 leading-none">
              Норма покоя: 55–75
            </span>
          </div>

          {/* Ресурсные дни: свежий мятно-изумрудный */}
          <div className="bg-[#EBF7EE] rounded-[22px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-3 flex flex-col gap-1 relative overflow-hidden">
            <img src={iconResource} alt="Ресурс" className="absolute top-2 right-2 w-10 h-10 object-contain opacity-90 pointer-events-none" />
            <div className="relative z-10 pr-9">
              <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">РЕСУРСНЫЕ ДНИ</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-[22px] font-black text-slate-900 font-mono tracking-tight leading-none">{stats.highEnergyPercent}%</span>
                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0">дней</span>
              </div>
            </div>
            <span className="text-[10px] font-bold text-emerald-800 relative z-10 leading-none truncate">
              Энергия в норме
            </span>
          </div>

      {/* Изменение веса: Компактный акцент с крупными Старт / Сейчас */}
      <div className="bg-[#E6F4F2] rounded-[22px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-3 col-span-2 relative overflow-hidden flex flex-col gap-2.5">
        <img src={iconProgress} alt="Прогресс" className="absolute top-2 right-2.5 w-12 h-12 object-contain opacity-90 pointer-events-none" />
        
        {/* Верхний ряд: Заголовок и дельта */}
        <div className="relative z-10 pr-14 flex flex-col">
          <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block">ИЗМЕНЕНИЕ ВЕСА ЗА КУРС</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-[26px] font-black text-teal-950 font-mono tracking-tight leading-none">
              -{stats.weightLoss}
            </span>
            <span className="text-xs font-bold text-teal-700">кг</span>
          </div>
        </div>

        {/* Контрастные плашки Старт / Сейчас без серой черты */}
        <div className="relative z-10 grid grid-cols-2 gap-2 bg-white/70 p-2 rounded-xl border border-teal-100/60 shadow-xs">
          <div className="flex items-baseline justify-between pr-2 border-r border-teal-100">
            <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">Старт</span>
            <span className="text-[15px] font-black text-slate-800 font-mono tracking-tight">
              {stats.initialWeight} <span className="text-[10px] font-bold text-slate-400">кг</span>
            </span>
          </div>
          <div className="flex items-baseline justify-between pl-1">
            <span className="text-[10.5px] font-bold text-teal-700 uppercase tracking-wide">Сейчас</span>
            <span className="text-[15px] font-black text-teal-950 font-mono tracking-tight">
              {stats.currentWeight} <span className="text-[10px] font-bold text-teal-600">кг</span>
            </span>
          </div>
        </div>
      </div>

    </div>

  </div>

      {/* Нижняя навигация */}
      <BottomBar 
        activeTab="my-day" 
        onHomeClick={onBack} 
        onDiaryClick={onBack} 
        onAnalyticsClick={onBack} 
        onProfileClick={onBack} 
      />
    </div>
  );
}