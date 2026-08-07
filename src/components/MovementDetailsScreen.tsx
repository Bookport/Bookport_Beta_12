import React, { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import BottomBar from "./BottomBar";
import { MOVEMENT_DAILY_TARGET_MIN, ACTIVITY_CONFIGS } from "../constants/movement";
import { getMovementAssetPath } from "../utils/movementAssets";
import vsegoVremenyImg from "../assets/images/movement/markers/vsego vremeny.webp";
import spisokAktivnostyImg from "../assets/images/movement/markers/spisok aktivnosty.webp";
import aktivnayaSeriyaImg from "../assets/images/movement/markers/aktivnaya seriya.webp";
import vsegoDyisgbiaImg from "../assets/images/movement/markers/vsego dyisgbia.webp";
import { getAnnaMovementCoaching } from "../utils/movementCoaching";
import { getPlural } from "../utils/pluralize";
import ingrGreenImg from "../assets/ingredients/ingr_green.webp";
import { 
  ArrowLeft
} from "lucide-react";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore, type MovementEntry } from "../store/useAppStore";
import { api } from "../utils/api";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'positive', intent: 'approval' }).src;

export type { MovementEntry as MovementLogEntry } from "../store/useAppStore";

interface MovementDetailsScreenProps {
  currentDayIndex: number;
  userName: string;
  userGender: "female" | "male";
  onBack: () => void;

  // Day notes
  dayNotes: Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>;
  setDayNotes: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>>>;
}

export default function MovementDetailsScreen({
  currentDayIndex,
  userName,
  userGender,
  onBack,
  dayNotes,
  setDayNotes
}: MovementDetailsScreenProps) {
  const movementEntries = useAppStore((s) => s.movementEntries);
  const [selectedGraphDay, setSelectedGraphDay] = useState<number>(currentDayIndex);

  // Daily physical target: 30 minutes of logged activity in minutes
  const dailyTargetMin = MOVEMENT_DAILY_TARGET_MIN;

  const getDayEntries = (day: number) =>
    movementEntries.filter((e: MovementEntry) => e.dayIndex === day);

  // Initial movement logs are passed as props, defaulting to {} from parent

  // Calculations for current selected day
  const todayEntries = getDayEntries(currentDayIndex);
  const selectedDayEntries = getDayEntries(selectedGraphDay);
  const selectedDayTotalSec = selectedDayEntries.reduce((sum, entry) => sum + entry.duration, 0);
  const selectedDayTotalMin = Math.round(selectedDayTotalSec / 60);
  const selectedDayCount = selectedDayEntries.length;
  const selectedDayPercent = Math.min(100, Math.round((selectedDayTotalMin / dailyTargetMin) * 100));

  // Resolved configuration for latest activity of selected day
  const latestEntryOnSelectedDay = selectedDayEntries.length > 0 
    ? selectedDayEntries[selectedDayEntries.length - 1] 
    : null;

  // Let's configure custom metrics over the entire course (28 days)
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

    // Determine favorite type by count or duration
    let favoriteType = "Нет данных";
    let maxCount = 0;
    Object.entries(favoriteTypeCounts).forEach(([name, data]) => {
      if (data.count > maxCount) {
        maxCount = data.count;
        favoriteType = name;
      }
    });

    // Calculate active days streak (how many days logged consecutively)
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

  // Fetch historical movement logs from server on mount
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

  const todayTotalMin = Math.round(todayEntries.reduce((sum, e) => sum + e.duration, 0) / 60);
  const latestActivityType = todayEntries.length > 0 ? todayEntries[todayEntries.length - 1].type : null;

  const annaCoaching = useMemo(() => getAnnaMovementCoaching({
    userName,
    userGender: userGender as "female" | "male",
    todayTotalMin,
    dailyTargetMin,
    streak: metrics.streak,
    latestActivityType
  }), [userName, userGender, todayTotalMin, dailyTargetMin, metrics.streak, latestActivityType]);

  return (
    <div className="w-full flex flex-col justify-between relative bg-[#FAF9FD]" id="movement-details-screen">
      {/* Scrollable Viewport Body */}
      <div className="flex-1 flex flex-col px-5 pt-4.5 pb-6 max-h-[740px] overflow-y-auto scrollbar-none text-slate-800">
        
        {/* Navigation Header */}
        <div className="flex justify-between items-center w-full mb-5">
          <button 
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-center text-slate-650 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 antialiased" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none">Дневник</span>
            <span className="text-[18px] font-black text-slate-800" style={{ fontFamily: '"Calibri", sans-serif' }}>Активность</span>
          </div>
          <div className="w-10 h-10" />
        </div>

        {/* 1. UPPER PART: TODAY'S ACTIVITY STATUS */}
        <div className="bg-white rounded-[32px] border border-gray-100/90 p-4.5 shadow-[0_5px_15px_-3px_rgba(43,49,55,0.02)] flex flex-col gap-4 text-left mb-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-black text-indigo-600 tracking-wider uppercase block mb-0.5">БАЛАНС ДВИЖЕНИЯ</span>
              <h2 className="text-[20px] font-black text-slate-800" style={{ fontFamily: '"Calibri", sans-serif' }}>Итоги сегодняшнего дня</h2>
            </div>
            <div className="bg-gradient-to-tr from-indigo-50 to-indigo-100/60 text-indigo-700 px-3 py-1 rounded-2xl text-[12px] font-bold border border-indigo-200/50">
              {metrics.activeDaysPercent}% стабильности
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 mt-1">
            {/* Left box: sum */}
            <div className="rounded-2xl p-3.5 shadow-sm flex flex-row justify-between items-center bg-[#F5F3FF]">
              <div>
                <span className="text-[11px] text-slate-500 font-bold block mb-0.5">Всего времени</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[26px] font-black text-indigo-950 font-mono">
                    {todayTotalMin}
                  </span>
                  <span className="text-[14px] font-bold text-slate-600">
                    {getPlural(todayTotalMin, ['минута', 'минуты', 'минут'])}
                  </span>
                </div>
              </div>
              <img src={vsegoVremenyImg} alt="Время" className="w-10 h-10 object-contain shrink-0" />
            </div>

            {/* Right box: counts */}
            <div className="bg-[#F0FDF4] rounded-2xl p-3.5 shadow-sm flex flex-row justify-between items-center">
              <div>
                <span className="text-[11px] text-slate-500 font-bold block mb-0.5">Списков активностей</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-[26px] font-black text-emerald-950 font-mono">{todayEntries.length}</span>
                  <span className="text-[14px] font-bold text-slate-600">{getPlural(todayEntries.length, ['сессия', 'сессии', 'сессий'])}</span>
                </div>
              </div>
              <img src={spisokAktivnostyImg} alt="Сессии" className="w-10 h-10 object-contain shrink-0" />
            </div>
          </div>

          {/* Activity Progress indicator */}
          <div className="flex flex-col gap-1.5 mt-1">
            <div className="flex justify-between items-baseline text-[12px] font-bold text-slate-500">
              <span className="font-extrabold text-indigo-600">Цель: {dailyTargetMin} {getPlural(dailyTargetMin, ['минута', 'минуты', 'минут'])} движения</span>
              <span className="font-mono">{selectedDayPercent}% выполнено</span>
            </div>
            
            <div className="h-[22px] w-full rounded-full bg-slate-100 border border-slate-200 shadow-sm relative overflow-hidden p-[1.5px]">
              {selectedDayPercent > 0 && (
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedDayPercent}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 flex items-center justify-end pr-2.5 shadow-sm"
                >
                  {selectedDayPercent > 15 && (
                    <span className="text-[9px] text-white font-extrabold uppercase tracking-wide">
                      {selectedDayTotalMin}м
                    </span>
                  )}
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
              className="mt-1.5 border border-indigo-100 p-3 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <img src={getMovementAssetPath(latestActivityType || "Walk", userGender)} className="w-8 h-8 object-contain" />
                <div className="text-left">
                  <span className="text-[11px] block font-semibold text-slate-500 uppercase tracking-widest leading-none">ПОСЛЕДНЯЯ ЗАПИСЬ</span>
                  <span className="text-[14px] font-bold text-slate-800">
                    {todayEntries[todayEntries.length - 1].type}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[14px] font-black font-mono text-indigo-700">
                  {Math.round(todayEntries[todayEntries.length - 1].duration / 60)} мин
                </span>
                <span className="text-[10px] block text-slate-500 font-bold">
                  в {todayEntries[todayEntries.length - 1].timeString}
                </span>
              </div>
            </div>
            );
          })() : null}
        </div>

        {/* 2. MIDDLE PART: ANNA'S MOTIVATIONAL ADVICE BOX */}
        <div className="rounded-[28px] p-4 text-left flex flex-col gap-3 transition-all duration-500 relative z-10 mb-5 bg-[#E4F6ED] shadow-sm" id="anna-movement-coaching-box">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full overflow-hidden border border-violet-100/60 shadow-md shrink-0">
                <img 
                  src={annaAvatarSrc}
                  alt="Анна советует" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-slate-900 leading-none">Анна</span>
                <span className="text-[11px] font-bold text-text-muted mt-0.5 leading-none">Советник WFPB</span>
              </div>
            </div>
            
            <img src={ingrGreenImg} alt="Anna Logo" className="w-6 h-6 object-contain animate-pulse" />
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl text-[14px] leading-relaxed font-semibold text-slate-800">
            {annaCoaching.text}
          </div>
        </div>

        {/* 3. LOWER PART: LONG TERM MOVEMENT ANALYTICS COURSE CHART & METRICS */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-left flex flex-col gap-3 mb-5">
          <div className="flex justify-between items-baseline px-1">
            <div className="flex flex-col">
              <span className="text-[11px] font-black text-indigo-600 tracking-wide uppercase">СТАТИСТИКА КУРСА</span>
              <span className="text-[16px] font-black text-slate-800">Мониторинг движения 28 дней</span>
            </div>
            
            <div className="text-[11px] text-slate-500 font-bold bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-100">
              Кульминация Д: <span className="text-indigo-600 font-mono font-black">{selectedGraphDay}</span>
            </div>
          </div>

          <div className="relative pt-6 pb-2 px-1">
            {/* Target 30-min dashed line wrapper */}
            <div className="absolute top-[30%] left-0 right-0 border-t border-dashed border-indigo-200/45 flex justify-end z-0">
              <span className="text-[8px] text-indigo-400 font-bold bg-white px-1 -mt-1.5 font-mono z-10">Цель (30 мин)</span>
            </div>

            <div className="flex justify-between items-end gap-[3.5px] h-32 relative z-10">
              {Array.from({ length: 28 }).map((_, idx) => {
                const dayNum = idx + 1;
                const active = dayNum === selectedGraphDay;
                const isFuture = dayNum > currentDayIndex;
                
                const entries = getDayEntries(dayNum);
                const dMinutes = Math.round(entries.reduce((s, e) => s + e.duration, 0) / 60);
                
                // Height percentage bound between 8% and 100%
                let heightPct = 6;
                if (dMinutes > 0) {
                  heightPct = Math.min(100, Math.max(12, Math.round((dMinutes / dailyTargetMin) * 100)));
                }

                let barBg = "bg-slate-200/50";
                if (!isFuture && dMinutes > 0) {
                  if (dMinutes >= dailyTargetMin) {
                    barBg = "bg-gradient-to-t from-indigo-500 to-indigo-400 shadow-xs";
                  } else {
                    barBg = "bg-gradient-to-t from-indigo-350 to-purple-300 shadow-xs";
                  }
                } else if (dayNum === currentDayIndex && todayEntries.length > 0) {
                  barBg = "bg-gradient-to-t from-indigo-400 to-purple-500 animate-pulse";
                }

                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={isFuture}
                    onClick={() => setSelectedGraphDay(dayNum)}
                    className="flex-1 flex flex-col items-center h-full group focus:outline-none cursor-pointer"
                  >
                    <div className="w-full h-full flex items-end relative rounded-full overflow-hidden">
                      {/* Interactive Column pillar bar */}
                      <motion.div 
                        initial={{ height: "0%" }}
                        animate={{ height: `${heightPct}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.01 }}
                        className={`w-full rounded-full transition-all duration-300 ${barBg} ${
                          active ? "brightness-105 ring-2 ring-indigo-400 ring-offset-1" : "group-hover:brightness-105"
                        }`}
                      />
                    </div>
                    {/* Tick caption */}
                    <span className={`text-[8.5px] mt-1.5 font-mono font-bold leading-none ${
                      active ? "text-indigo-600 font-extrabold scale-110" : "text-slate-400"
                    }`}>
                      {dayNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expanded selected day historic log inspection panel */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col gap-2 relative mt-1">
            <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block">
              Журнал активностей за день {selectedGraphDay}
            </span>
            {selectedDayEntries.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {selectedDayEntries.map((entry, index) => {
                  const cfgKey = Object.keys(ACTIVITY_CONFIGS).find(k => ACTIVITY_CONFIGS[k].name === entry.type) || "Walk";
                  const cfg = ACTIVITY_CONFIGS[cfgKey];
                  return (
                    <div 
                      key={entry.id || index}
                      style={{ backgroundColor: cfg.hexColor }}
                      className="rounded-xl p-2.5 border border-slate-100 flex justify-between items-center text-[13px] shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <img 
                          src={getMovementAssetPath(entry.type, userGender)} 
                          alt={entry.type} 
                          className="w-6 h-6 object-contain"
                          onError={(e) => (e.currentTarget.style.display='none')}
                        />
                        <span className="font-extrabold text-slate-800">{entry.type}</span>
                      </div>
                      <div className="font-mono text-indigo-700 font-bold flex items-center gap-1.5">
                        <span>{Math.round(entry.duration / 60)} мин</span>
                        <span className="text-slate-300 text-[11px] font-semibold font-sans">
                          в {entry.timeString}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[12px] text-slate-400 font-medium italic mt-0.5">
                {selectedGraphDay > currentDayIndex ? "Данные из будущего скрыты" : "Активностей в этот день не зафиксировано"}
              </p>
            )}
          </div>
        </div>

        {/* 4. STATISTICS MATRIX BENTO GRIDS */}
        <div className="grid grid-cols-2 gap-3.5 mb-6 text-left">
          
          {/* Favorite Activity Type Card */}
          <div className="bg-[#F5F3FF] rounded-[24px] p-3.5 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">ЛЮБИМЫЙ ТИП</span>
              <p className="text-[17px] font-black text-slate-800 mt-1" style={{ fontFamily: '"Calibri", sans-serif' }}>
                {metrics.favoriteType}
              </p>
              <span className="text-[11px] font-bold text-indigo-500 mt-2 block">
                Чаще всего выбираете
              </span>
            </div>
            <img src={getMovementAssetPath(metrics.favoriteType || "Walk", userGender)} alt="Любимый тип" className="w-14 h-14 object-contain shrink-0" />
          </div>

          {/* Current streak tracker */}
          <div className="bg-[#F0FDF4] rounded-[24px] p-3.5 shadow-sm flex flex-row justify-between items-center">
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">АКТИВНАЯ СЕРИЯ</span>
              <p className="text-[24px] font-black text-indigo-950 mt-1 font-mono">
                {metrics.streak} <span className="text-xs font-semibold text-slate-500">{getPlural(metrics.streak, ['день', 'дня', 'дней'])}</span>
              </p>
              <span className="text-[11px] font-bold text-slate-400 mt-2 block">
                Рекорд курса: {metrics.maxStreak} {getPlural(metrics.maxStreak, ['день', 'дня', 'дней'])}
              </span>
            </div>
            <img src={aktivnayaSeriyaImg} alt="Серия" className="w-10 h-10 object-contain shrink-0" />
          </div>

          {/* Total Minutes aggregate */}
          <div className="bg-[#F5F3FF] rounded-[24px] p-3.5 shadow-sm flex flex-row justify-between items-center col-span-2">
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wide block">Всего движения за курс</span>
              <p className="text-[24px] font-extrabold text-slate-800 mt-1" style={{ fontFamily: '"Calibri", sans-serif' }}>
                {metrics.totalMinutes} {getPlural(metrics.totalMinutes, ['минута', 'минуты', 'минут'])}
              </p>
              <div className="flex gap-1.5 items-center text-[11px] mt-1.5">
                <span className="font-extrabold text-[#059669]">Среднее:</span>
                <span className="text-slate-500 font-bold">{metrics.averageMinutes} мин / день активности</span>
              </div>
            </div>
            <img src={vsegoDyisgbiaImg} alt="Всего движения" className="w-10 h-10 object-contain shrink-0" />
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
