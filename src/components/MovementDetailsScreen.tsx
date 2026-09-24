import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import BottomBar from "./BottomBar";
import { ACTIVITY_CONFIGS } from "../constants/movement";
import { getMovementAssetPath } from "../utils/movementAssets";
import { getMovementGoal, getMovementMinutes } from "../utils/movementUtils";
import vsegoVremenyImg from "../assets/images/movement/markers/vsego vremeny.webp";
import spisokAktivnostyImg from "../assets/images/movement/markers/spisok aktivnosty.webp";
import aktivnayaSeriyaImg from "../assets/images/movement/markers/aktivnaya seriya.webp";
import vsegoDyisgbiaImg from "../assets/images/movement/markers/vsego dyisgbia.webp";
import { generateMovementSummary } from "../utils/movementCoaching";
import { buildDailySummary } from "../utils/crossModuleSummary";
import { buildFoodSummary } from "../services/foodSummary";
import AnnaText from "./AnnaText";
import { getPlural } from "../utils/pluralize";
import ingrGreenImg from "../assets/ingredients/ingr_green.webp";
import { ArrowLeft } from "lucide-react";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore, type MovementEntry } from "../store/useAppStore";
import { api } from "../utils/api";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'positive', intent: 'approval' }).src;

const CustomMovementTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="flex flex-col p-2.5 bg-white/95 backdrop-blur-xs border border-white rounded-2xl shadow-[0_4px_20px_rgba(15,23,42,0.08)] z-50">
        <p className="text-slate-500 text-xs font-bold">День {label}</p>
        <p className="text-indigo-600 font-mono font-black text-sm">{payload[0].value} мин</p>
      </div>
    );
  }
  return null;
};

export type { MovementEntry as MovementLogEntry } from "../store/useAppStore";

interface MovementDetailsScreenProps {
  currentDayIndex: number;
  userName: string;
  userGender: "female" | "male";
  onBack: () => void;
}

export default function MovementDetailsScreen({
  currentDayIndex,
  userName,
  userGender,
  onBack
}: MovementDetailsScreenProps) {
  const movementEntries = useAppStore((s) => s.movementEntries);
  const digestionEntries = useAppStore((s) => s.digestionEntries);
  const waterEntries = useAppStore((s) => s.waterEntries);
  const measurementEntries = useAppStore((s) => s.measurementEntries);
  const savedDishes = useAppStore((s) => s.savedDishes);
  const selectedGraphDay = useAppStore((s) => s.selectedGraphDay);
  const setSelectedGraphDay = useAppStore((s) => s.setSelectedGraphDay);

  const dailyTargetMin = getMovementGoal();
  const summaryDay = selectedGraphDay ?? currentDayIndex;

  const getDayEntries = (day: number) =>
    movementEntries.filter((e: MovementEntry) => e.dayIndex === day);

  const todayEntries = getDayEntries(currentDayIndex);
  const selectedDayEntries = getDayEntries(summaryDay);
  const selectedDayTotalMin = getMovementMinutes(selectedDayEntries);
  const selectedDayPercent = Math.min(100, Math.round((selectedDayTotalMin / dailyTargetMin) * 100));

  const getAllTimeMetrics = () => {
    let totalMinutesAllDays = 0;
    let totalSessions = 0;
    let daysWithMovement = 0;
    const favoriteTypeCounts: Record<string, { duration: number; count: number }> = {};

    for (let day = 1; day <= currentDayIndex; day++) {
      const entries = getDayEntries(day);
      if (entries.length > 0) {
        daysWithMovement++;
        const seconds = entries.reduce((s, e) => s + e.duration, 0);
        totalMinutesAllDays += seconds / 60;
        totalSessions += entries.length;

        entries.forEach(e => {
          const t = e.type;
          if (!favoriteTypeCounts[t]) {
            favoriteTypeCounts[t] = { duration: 0, count: 0 };
          }
          favoriteTypeCounts[t].duration += e.duration / 60;
          favoriteTypeCounts[t].count += 1;
        });
      }
    }

    let favoriteType = "Нет данных";
    let maxCount = 0;
    Object.entries(favoriteTypeCounts).forEach(([name, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        favoriteType = name;
      }
    });

    let currentStreak = 0;
    let maxStreak = 0;
    for (let day = 1; day <= currentDayIndex; day++) {
      const entries = getDayEntries(day);
      if (entries.length > 0) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    return {
      averageMinutes: daysWithMovement > 0 ? Math.round(totalMinutesAllDays / daysWithMovement) : 0,
      totalMinutes: Math.round(totalMinutesAllDays),
      totalSessions,
      streak: currentStreak,
      maxStreak,
      favoriteType,
      activeDaysPercent: currentDayIndex > 0 ? Math.round((daysWithMovement / currentDayIndex) * 100) : 0
    };
  };

  const metrics = getAllTimeMetrics();

  useEffect(() => {
    api<Record<string, any>[]>("/api/metrics/daily")
      .then(records => {
        if (!records || !Array.isArray(records)) return;
        const setMovementEntries = useAppStore.getState().setMovementEntries;
        const serverEntries: MovementEntry[] = [];
        for (const r of records) {
          const rawLogs = r.movementLog;
          let logs: any[] = [];
          if (typeof rawLogs === 'string') { try { logs = JSON.parse(rawLogs); } catch {} }
          else if (Array.isArray(rawLogs)) { logs = rawLogs; }
          for (const entry of logs) {
            if (entry && entry.id && entry.dayIndex !== undefined) {
              serverEntries.push({
                id: entry.id,
                dayIndex: Number(entry.dayIndex),
                type: entry.type || entry.activityType || "",
                activityType: entry.activityType || entry.type || "",
                duration: entry.duration || entry.durationSeconds || 0,
                durationSeconds: entry.durationSeconds || entry.duration || 0,
                timestamp: entry.timestamp || Date.now(),
                timeString: entry.timeString || "",
              });
            }
          }
        }
        if (serverEntries.length > 0) {
          setMovementEntries(serverEntries);
        }
      })
      .catch((err) => console.warn("[MovementDetails] failed to load history:", err));
  }, []);

  const todayTotalMin = getMovementMinutes(todayEntries);
  const latestActivityType = todayEntries.length > 0 ? todayEntries[todayEntries.length - 1].type : null;

  const annaCoaching = useMemo(() => {
    const summary = buildDailySummary(summaryDay, useAppStore.getState(), currentDayIndex);
    const foodSummary = buildFoodSummary(savedDishes, summaryDay);
    const isCurrentDay = summaryDay === currentDayIndex;
    return generateMovementSummary(summary, userName, userGender, getDayEntries(summaryDay), foodSummary, isCurrentDay);
  }, [summaryDay, currentDayIndex, digestionEntries, waterEntries, measurementEntries, movementEntries, savedDishes, userName, userGender]);

  const isCurrentSelected = summaryDay === currentDayIndex;
  const [historicalText, setHistoricalText] = useState<string | null>(null);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const historyRequestDayRef = useRef<number | null>(null);
  const savedDayRef = useRef<number | null>(null);
  const savedTextRef = useRef<string | null>(null);

  useEffect(() => {
    if (isCurrentSelected) {
      historyRequestDayRef.current = null;
      setHistoricalText(null);
      setHistoricalLoading(false);
      return;
    }
    const requestedDay = summaryDay;
    historyRequestDayRef.current = requestedDay;
    setHistoricalLoading(true);
    setHistoricalText(null);
    api<{ text: string | null }>("/api/anna-analysis?dayIndex=" + requestedDay + "&sender=anna_movement")
      .then((data) => {
        if (historyRequestDayRef.current !== requestedDay) return;
        setHistoricalText(data?.text || null);
        setHistoricalLoading(false);
      })
      .catch(() => {
        if (historyRequestDayRef.current !== requestedDay) return;
        setHistoricalText(null);
        setHistoricalLoading(false);
      });
  }, [summaryDay, currentDayIndex, isCurrentSelected]);

  useEffect(() => {
    if (!isCurrentSelected || !currentDayIndex) return;
    if (savedDayRef.current === currentDayIndex && savedTextRef.current === annaCoaching.text) return;
    const timer = setTimeout(() => {
      savedDayRef.current = currentDayIndex;
      savedTextRef.current = annaCoaching.text;
      api("/api/anna-analysis/save", {
        method: "POST",
        body: { dayIndex: currentDayIndex, analysisText: annaCoaching.text, sender: "anna_movement" },
      }).catch(() => {});
    }, 4000);
    return () => clearTimeout(timer);
  }, [isCurrentSelected, currentDayIndex, annaCoaching.text]);

  // Сохранённый комментарий остаётся снимком прошлого дня. Если его нет,
  // показываем локальный расчёт для выбранной даты, ничего не записывая в историю.
  const displayedText = summaryDay > currentDayIndex
    ? "Данные из будущего скрыты"
    : isCurrentSelected
      ? annaCoaching.text
      : historicalLoading
        ? "Загружаем сохраненный комментарий…"
        : historicalText || annaCoaching.text;

  const chartData = useMemo(() => {
    return Array.from({ length: 28 }).map((_, idx) => {
      const dayNum = idx + 1;
      const entries = getDayEntries(dayNum);
      const minutes = getMovementMinutes(entries);
      return { day: dayNum, minutes, isFuture: dayNum > currentDayIndex };
    });
  }, [movementEntries, currentDayIndex]);

  const CustomBarShape = (props: any) => {
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
    <div className="w-full flex flex-col justify-between relative bg-[#FAF9FD]" id="movement-details-screen">
      {/* Scrollable Viewport Body */}
      <div className="flex-1 flex flex-col px-4.5 pt-4 pb-5 overflow-y-auto scrollbar-none text-slate-800">
        
        {/* Navigation Header */}
        <div className="flex justify-between items-center w-full mb-4">
          <button 
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 antialiased" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Дневник</span>
            <span className="text-[17px] font-black text-slate-800 tracking-tight mt-0.5">Активность</span>
          </div>
          <div className="w-10 h-10" />
        </div>

        {/* 1. UPPER PART: TODAY'S ACTIVITY STATUS */}
        <div className="bg-white rounded-[28px] border border-white p-4.5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] flex flex-col gap-4 text-left mb-4">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0">
              <span className="text-[11px] font-black text-indigo-600 tracking-wider uppercase block mb-0.5">БАЛАНС ДВИЖЕНИЯ</span>
              <h2 className="text-[18px] font-black text-slate-800 tracking-tight leading-tight">Итоги сегодняшнего дня</h2>
            </div>
            <div className="bg-gradient-to-tr from-indigo-50 to-indigo-100/60 text-indigo-700 px-3 py-1 rounded-2xl text-[11px] font-bold border border-indigo-200/50 whitespace-nowrap shrink-0">
              {metrics.activeDaysPercent}% стабильности
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-0.5">
            {/* Left box: sum */}
            <div className="rounded-2xl py-2.5 pl-3 pr-1.5 shadow-sm flex flex-row justify-between items-center bg-[#F5F3FF] border border-white">
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 font-bold block mb-0.5 whitespace-nowrap">Всего времени</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-[24px] font-black text-indigo-950 font-mono tracking-tight leading-none">
                    {todayTotalMin}
                  </span>
                  <span className="text-[12px] font-bold text-slate-600 leading-none">
                    {getPlural(todayTotalMin, ['минута', 'минуты', 'минут'])}
                  </span>
                </div>
              </div>
              <img src={vsegoVremenyImg} alt="Время" className="w-11 h-11 object-contain shrink-0 ml-auto" />
            </div>

            {/* Right box: counts */}
            <div className="bg-[#F0FDF4] rounded-2xl py-2.5 pl-3 pr-1.5 shadow-sm flex flex-row justify-between items-center border border-white">
              <div className="min-w-0">
                <span className="text-[11px] text-slate-500 font-bold block mb-0.5 whitespace-nowrap">Активностей</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-[24px] font-black text-emerald-950 font-mono tracking-tight leading-none">{todayEntries.length}</span>
                  <span className="text-[12px] font-bold text-slate-600 leading-none">{getPlural(todayEntries.length, ['сессия', 'сессии', 'сессий'])}</span>
                </div>
              </div>
              <img src={spisokAktivnostyImg} alt="Сессии" className="w-11 h-11 object-contain shrink-0 ml-auto" />
            </div>
          </div>

          {/* Activity Progress indicator */}
          <div className="flex flex-col gap-1.5 mt-0.5">
            <div className="flex justify-between items-baseline text-[12px] font-bold text-slate-500">
              <span className="font-extrabold text-indigo-600 whitespace-nowrap">Цель: {dailyTargetMin} {getPlural(dailyTargetMin, ['минута', 'минуты', 'минут'])}</span>
              <span className="font-mono text-slate-600 whitespace-nowrap">{selectedDayPercent}% выполнено</span>
            </div>
            
            <div className="h-[22px] w-full rounded-full bg-slate-100 border border-slate-200/80 shadow-inner relative overflow-hidden p-[1.5px]">
              {selectedDayPercent > 0 && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedDayPercent}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-end pr-2 shadow-sm min-w-[20px]"
                >
                  <span className="text-[9px] text-white font-mono font-black tracking-wider">
                    {selectedDayTotalMin}м
                  </span>
                </motion.div>
              )}
              {selectedDayPercent === 0 && (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[9.5px] text-slate-400 font-bold">Ожидание первого движения сегодняшнего дня</span>
                </div>
              )}
            </div>
          </div>

          {/* Details of last session */}
          {todayEntries.length > 0 ? (() => {
            const latestCfgKey = Object.keys(ACTIVITY_CONFIGS).find(k => ACTIVITY_CONFIGS[k].name === latestActivityType || k === latestActivityType) || "Walk";
            return (
            <div 
              style={{ backgroundColor: ACTIVITY_CONFIGS[latestCfgKey].hexColor }}
              className="mt-0.5 border border-white shadow-sm p-3 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <img src={getMovementAssetPath(latestActivityType || "Walk", userGender)} className="w-8 h-8 object-contain shrink-0" />
                <div className="text-left min-w-0">
                  <span className="text-[10px] block font-black text-slate-400 uppercase tracking-widest leading-none">ПОСЛЕДНЯЯ ЗАПИСЬ</span>
                  <span className="text-[14px] font-black text-slate-800 truncate block mt-0.5">
                    {todayEntries[todayEntries.length - 1].type}
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[14px] font-black font-mono text-indigo-700 block leading-tight">
                  {Math.round(todayEntries[todayEntries.length - 1].duration / 60)} мин
                </span>
                <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                  в {todayEntries[todayEntries.length - 1].timeString}
                </span>
              </div>
            </div>
            );
          })() : null}
        </div>

        {/* 2. MIDDLE PART: ANNA'S MOTIVATIONAL ADVICE BOX */}
        <div className="rounded-[28px] p-4 text-left flex flex-col gap-3 transition-all duration-500 relative z-10 mb-4 bg-[#F4FBF7] border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]" id="anna-movement-coaching-box">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-emerald-200/60 shadow-xs shrink-0">
                <img 
                  src={annaAvatarSrc}
                  alt="Анна советует" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-slate-900 leading-none">Анна</span>
                <span className="text-[11px] font-bold text-emerald-800 mt-0.5 leading-none">Советник WFPB</span>
              </div>
            </div>
            
            <img src={ingrGreenImg} alt="Anna Logo" className="w-6 h-6 object-contain animate-pulse" />
          </div>

          <div className="bg-white/95 backdrop-blur-xs p-3.5 rounded-2xl text-[13px] leading-relaxed font-medium text-slate-700 border border-white shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <AnnaText text={displayedText} userName={userName} />
          </div>
        </div>

        {/* 3. LOWER PART: LONG TERM MOVEMENT ANALYTICS COURSE CHART & METRICS */}
        <div className="bg-white rounded-[28px] p-4.5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-white text-left flex flex-col gap-3.5 mb-4">
          <div className="flex justify-between items-baseline px-0.5">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-indigo-600 tracking-wider uppercase">СТАТИСТИКА КУРСА</span>
              <span className="text-[16px] font-black text-slate-800 tracking-tight mt-0.5">Мониторинг движения 28 дней</span>
            </div>
            
            <div className="text-[11px] text-slate-500 font-bold bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100 whitespace-nowrap shrink-0">
              Кульминация Д: <span className="text-indigo-600 font-mono font-black">{selectedGraphDay}</span>
            </div>
          </div>

          <style>{`
            .recharts-wrapper *:focus,
            .recharts-surface:focus,
            .recharts-layer:focus,
            .recharts-bar-rect:focus {
              outline: none !important;
            }
          `}</style>

          <div
            className="relative h-40 w-full outline-none focus:outline-none select-none"
            tabIndex={-1}
          >
            <ResponsiveContainer width="100%" height="100%" className="outline-none border-none focus:outline-none focus:ring-0" style={{ outline: 'none', border: 'none' }}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
                className="outline-none border-none focus:outline-none focus:ring-0"
                style={{ outline: 'none', border: 'none' }}
              >
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis hide type="number" />
                <Tooltip content={<CustomMovementTooltip />} cursor={{ fill: 'transparent' }} wrapperStyle={{ outline: 'none', border: 'none', zIndex: 50, pointerEvents: 'none' }} />
                <ReferenceLine y={dailyTargetMin} stroke="#C7D2FE" strokeDasharray="4 4" label={{ value: "Цель", position: 'insideTopRight', fontSize: 9, fill: '#818CF8', fontWeight: 700 }} />
                <Bar
                  dataKey="minutes"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                  isAnimationActive={false}
                  shape={<CustomBarShape />}
                  background={{ fill: 'transparent', stroke: 'transparent', strokeWidth: 0, strokeOpacity: 0 }}
                  style={{ outline: 'none', stroke: 'none' }}
                >
                  {chartData.map((entry, index) => {
                    const active = entry.day === selectedGraphDay;
                    let fill = "#e2e8f0";
                    if (!entry.isFuture && entry.minutes > 0) {
                      fill = entry.minutes >= dailyTargetMin ? "#818CF8" : "#C4B5FD";
                    } else if (entry.day === currentDayIndex && todayEntries.length > 0) {
                      fill = "#A78BFA";
                    }
                    return <Cell key={`cell-${index}`} fill={fill} stroke={active ? "#818CF8" : "transparent"} strokeWidth={active ? 2 : 0} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Expanded selected day historic log inspection panel */}
          <div className="bg-[#FAF9FD] rounded-2xl p-3.5 flex flex-col gap-2 relative border border-slate-100">
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider block">
                Журнал активностей • День {selectedGraphDay}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Записей: {selectedDayEntries.length}
              </span>
            </div>

            {selectedDayEntries.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto scrollbar-none">
                {selectedDayEntries.map((entry, index) => {
                  const cfgKey = Object.keys(ACTIVITY_CONFIGS).find(k => ACTIVITY_CONFIGS[k].name === entry.type) || entry.type || "Walk";
                  const cfg = ACTIVITY_CONFIGS[cfgKey] || ACTIVITY_CONFIGS["Walk"];
                  return (
                    <div 
                      key={entry.id || index}
                      className={`flex flex-row items-center justify-between py-2 px-3 rounded-xl border border-white/60 shadow-xs ${cfg.bgColor}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img 
                          src={getMovementAssetPath(entry.type, userGender)} 
                          alt={entry.type} 
                          className="w-5 h-5 object-contain shrink-0"
                          onError={(e) => (e.currentTarget.style.display='none')}
                        />
                        <span className="font-black text-slate-800 text-[13px] truncate">{entry.type}</span>
                      </div>
                      <div className="font-mono text-indigo-700 font-black flex items-center gap-1.5 text-[13px] shrink-0">
                        <span>{Math.round(entry.duration / 60)} мин</span>
                        <span className="text-slate-400 text-[11px] font-semibold font-sans">
                          в {entry.timeString}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-slate-400 font-medium italic py-1">
                {selectedGraphDay > currentDayIndex ? "Данные из будущего скрыты" : "Активностей в этот день не зафиксировано"}
              </p>
            )}
          </div>
        </div>

        {/* 4. STATISTICS MATRIX BENTO GRIDS */}
        <div className="grid grid-cols-2 gap-3 mb-2 text-left">
          
          {/* Favorite Activity Type Card */}
          <div className="bg-[#F5F3FF] rounded-2xl py-3 pl-3.5 pr-2 shadow-sm border border-white flex items-center justify-between">
            <div className="min-w-0 pr-1">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block leading-none">
                Любимый тип
              </span>
              <p className="text-[16px] font-black text-slate-800 mt-1 truncate leading-tight">
                {metrics.favoriteType}
              </p>
              <span className="text-[10.5px] font-bold text-indigo-500/90 mt-1 block leading-tight truncate">
                Чаще выбираете
              </span>
            </div>
            <img 
              src={getMovementAssetPath(metrics.favoriteType || "Walk", userGender)} 
              alt="Любимый тип" 
              className="w-11 h-11 object-contain shrink-0 ml-auto" 
            />
          </div>

          {/* Current streak tracker */}
          <div className="bg-[#FDF2F8] rounded-2xl py-3 pl-3.5 pr-2 shadow-sm border border-white flex items-center justify-between">
            <div className="min-w-0 pr-1">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block leading-none">
                Активная серия
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-[20px] font-black text-pink-950 font-mono tracking-tight leading-none">
                  {metrics.streak}
                </span>
                <span className="text-[11px] font-bold text-slate-500 leading-none">
                  {getPlural(metrics.streak, ['день', 'дня', 'дней'])}
                </span>
              </div>
              <span className="text-[10.5px] font-bold text-slate-400 mt-1 block leading-tight truncate">
                Рекорд: {metrics.maxStreak} {getPlural(metrics.maxStreak, ['дн.', 'дн.', 'дн.'])}
              </span>
            </div>
            <img 
              src={aktivnayaSeriyaImg} 
              alt="Серия" 
              className="w-10 h-10 object-contain shrink-0 ml-auto" 
            />
          </div>

          {/* Total Minutes aggregate */}
          <div className="bg-[#F4FBF7] rounded-2xl py-3 pl-3.5 pr-3 shadow-sm border border-white flex items-center justify-between col-span-2">
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider block leading-none">
                Всего движения за курс
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-[22px] font-black text-slate-800 font-mono tracking-tight leading-none">
                  {metrics.totalMinutes}
                </span>
                <span className="text-[13px] font-bold text-slate-600 leading-none">
                  {getPlural(metrics.totalMinutes, ['минута', 'минуты', 'минут'])}
                </span>
              </div>
              <div className="flex gap-1.5 items-center text-[11px] mt-1 leading-none">
                <span className="font-black text-[#047857]">Среднее:</span>
                <span className="text-slate-500 font-bold">{metrics.averageMinutes} мин / день</span>
              </div>
            </div>
            <img 
              src={vsegoDyisgbiaImg} 
              alt="Всего движения" 
              className="w-12 h-12 object-contain shrink-0 ml-auto" 
            />
          </div>
        </div>

      </div>

      {/* Symmetrical Bottom Navigation Menu context */}
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
