import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import BottomBar from "./BottomBar";
import {
  ArrowLeft,
  Award,
  Plus,
  Minus,
  X,
  HelpCircle,
  Calendar
} from "lucide-react";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { api } from "../utils/api";
import { addDays, formatTimeHM, toLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";
import {
  SleepDaySummary,
  SleepEntry,
  SleepQuality,
  makeSleepId,
  normalizeSleepEntry,
  sleepDurationMinutes,
  isValidHHMM,
} from "../shared/sleep";
import { useAppStore } from "../store/useAppStore";
import { buildDailySummary } from "../utils/crossModuleSummary";
import { getMovementMinutes } from "../utils/movementUtils";
import ingrGreenImg from "../assets/ingredients/ingr_green.webp";
import imgGood from "../assets/images/slipping/9.webp";
import imgAverage from "../assets/images/slipping/17.webp";
import imgPoor from "../assets/images/slipping/18.webp";
import imgDuration from "../assets/images/slipping/4.webp";
import imgBedtime from "../assets/images/slipping/5.webp";
import imgWakeup from "../assets/images/slipping/15.webp";
import imgAverageSleep from "../assets/images/slipping/8.webp";
import imgActiveStreak from "../assets/images/slipping/7.webp";
import imgBedtimeReg from "../assets/images/slipping/6.webp";
import imgWakeupStab from "../assets/images/slipping/16.webp";
import imgBestSleep from "../assets/images/slipping/19.webp";
import imgDeficitDay from "../assets/images/slipping/21.webp";
import { type SleepContext } from "../utils/annaSleepDictionary";
import { getSleepCoaching } from "../utils/sleepCoaching";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'thoughtful' }).src;

const CustomSleepTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const datum = payload[0].payload;
    const isFuture = datum?.isFuture === true;
    const val = payload[0].value;
    return (
      <div className="flex flex-col p-2 bg-[#F5F3FF] rounded-xl shadow-sm border-none outline-none z-40">
        <div className="text-slate-700 text-xs font-bold">День {label}</div>
        <div className={`text-xs font-bold ${isFuture ? "text-slate-400" : "text-[#8B5CF6]"}`}>
          {isFuture || !val ? "Нет данных" : `${Math.floor(val / 60)} ч ${val % 60} мин`}
        </div>
      </div>
    );
  }
  return null;
};

interface SleepDetailsScreenProps {
  currentDayIndex: number;
  userName: string;
  userGender: "female" | "male";
  sleep: number; // today's sleep minutes
  setSleep: (val: number) => void;
  onBack: () => void;
  sleepLogs: Record<number, SleepDaySummary>;
  setSleepLogs: React.Dispatch<React.SetStateAction<Record<number, SleepDaySummary>>>;

  // Canonical journal (multiple sleeps per day) + save pipeline
  sleepJournal?: SleepEntry[];
  onSaveSleepEntry?: (entry: SleepEntry) => void;
  onHydrateJournal?: (serverEntries: SleepEntry[]) => void;

  // Day notes
  dayNotes: Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>;
  setDayNotes: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>>>;
}

export default function SleepDetailsScreen({
  currentDayIndex,
  userName,
  userGender,
  sleep,
  setSleep,
  onBack,
  sleepLogs,
  setSleepLogs,
  dayNotes,
  setDayNotes,
  sleepJournal = [],
  onSaveSleepEntry,
  onHydrateJournal,
}: SleepDetailsScreenProps) {
  // Selected graph day — общий store-выбор (как в Water/Movement)
  const selectedGraphDay = useAppStore((s) => s.selectedGraphDay);
  const setSelectedGraphDay = useAppStore((s) => s.setSelectedGraphDay);

  // Manual sleep entry form state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDay, setManualDay] = useState<number>(currentDayIndex);
  const [manualBedtime, setManualBedtime] = useState<string>("23:00");
  const [manualWakeTime, setManualWakeTime] = useState<string>("07:00");
  const [manualQuality, setManualQuality] = useState<SleepQuality>(null);
  const [manualError, setManualError] = useState<string>("");

  // Time stepper helper: shift "HH:MM" by deltaMin with 24h wraparound
  const shiftTime = (hhmm: string, deltaMin: number): string => {
    const [h, m] = hhmm.split(":").map(Number);
    const total = ((h * 60 + m + deltaMin) % 1440 + 1440) % 1440;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  // Press-and-hold auto-repeat для степперов времени: клик = один шаг,
  // зажатие >400ms — автоповтор каждые 120ms.
  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimeHold = () => {
    if (holdTimeoutRef.current) { clearTimeout(holdTimeoutRef.current); holdTimeoutRef.current = null; }
    if (holdIntervalRef.current) { clearInterval(holdIntervalRef.current); holdIntervalRef.current = null; }
  };
  const startTimeHold = (setter: React.Dispatch<React.SetStateAction<string>>, deltaMin: number) => {
    stopTimeHold();
    setter(t => shiftTime(t, deltaMin));
    holdTimeoutRef.current = setTimeout(() => {
      holdIntervalRef.current = setInterval(() => setter(t => shiftTime(t, deltaMin)), 120);
    }, 400);
  };
  useEffect(() => stopTimeHold, []);

  const submitManualEntry = () => {
    if (!isValidHHMM(manualBedtime) || !isValidHHMM(manualWakeTime)) {
      setManualError("Укажите корректное время в формате ЧЧ:ММ.");
      return;
    }
    const durationMin = sleepDurationMinutes(manualBedtime, manualWakeTime);
    if (durationMin <= 0) {
      setManualError("Время подъёма должно отличаться от времени отбоя.");
      return;
    }
    const tz = getUserTimeZone();
    const now = Date.now();
    const sleepDate = toLocalDate(addDays(new Date(), manualDay - currentDayIndex), tz);
    const entry: SleepEntry = {
      id: makeSleepId(),
      dayIndex: manualDay,
      sleepDate,
      bedtime: manualBedtime,
      sleepTime: manualBedtime,
      wakeTime: manualWakeTime,
      duration: durationMin,
      quality: manualQuality,
      source: "manual",
      status: "completed",
      timezone: tz,
      createdAt: now,
      updatedAt: now,
    };
    onSaveSleepEntry?.(entry);
    setShowManualEntry(false);
    setManualError("");
  };

  // Fetch historical sleep journal from server on mount and hydrate the parent.
  useEffect(() => {
    api<Record<string, any>[]>("/api/metrics/daily")
      .then(records => {
        if (!records || !Array.isArray(records)) return;
        const allEntries: SleepEntry[] = [];
        for (const r of records) {
          const rawLogs = r.sleepLogs;
          let logs: any[] = [];
          if (typeof rawLogs === 'string') { try { logs = JSON.parse(rawLogs); } catch {} }
          else if (Array.isArray(rawLogs)) { logs = rawLogs; }

          let hasValidLog = false;
          for (const entry of logs) {
            const norm = normalizeSleepEntry(entry);
            if (norm) {
              hasValidLog = true;
              allEntries.push(norm);
            }
          }

          // Legacy row: sleepMinutes recorded but journal absent -> honest entry
          // without invented bed/wake times and without fake quality.
          const rDay = Number(r.dayIndex);
          if (!hasValidLog && r.sleepMinutes > 0 && rDay) {
            const now = Date.now();
            allEntries.push({
              id: `legacy-${rDay}`,
              dayIndex: rDay,
              sleepDate: "",
              bedtime: "",
              sleepTime: "",
              wakeTime: "",
              duration: r.sleepMinutes,
              quality: null,
              source: "legacy",
              status: "completed",
              timezone: "",
              createdAt: now,
              updatedAt: now,
            });
          }
        }
        if (allEntries.length > 0) {
          onHydrateJournal?.(allEntries);
        }
      })
      .catch((err) => console.warn("[SleepDetails] failed to load history:", err));
  }, []);

  // Selected day variables
  const sleepGoalToday = 480; // 8 Hours
  const graphDayEntry = sleepLogs[selectedGraphDay];
  const graphDayDuration = graphDayEntry ? graphDayEntry.duration : 0;
  const graphDayPercent = Math.min(100, Math.round((graphDayDuration / sleepGoalToday) * 100));
  const dayJournalEntries = (sleepJournal || []).filter(e => e.dayIndex === selectedGraphDay && e.status !== "draft");

  // Per-day primitives feeding the Anna SleepContext (selected graph day).
  const summaryDay = selectedGraphDay ?? currentDayIndex;
  const hasEntryForDay = graphDayEntry !== null;
  const qualityForDay = graphDayEntry?.quality ?? null;
  const bedtimeForDay = graphDayEntry?.sleepTime || graphDayEntry?.bedtime || null;
  const wakeTimeForDay = graphDayEntry?.wakeTime || null;
  const activeMinForDay = useAppStore(
    (s) => getMovementMinutes(s.movementEntries.filter(m => Number(m.dayIndex) === summaryDay)),
  );
  const pulseForDay = useAppStore((s) => {
    const dayMeasurements = s.measurementEntries
      .filter(m => Number(m.dayIndex) === summaryDay)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const pulses = dayMeasurements.filter(m => m.pulse).map(m => m.pulse as number);
    const latest = pulses.length > 0 ? pulses[0] : null;
    const avg = pulses.length > 0 ? Math.round(pulses.reduce((a, b) => a + b, 0) / pulses.length) : null;
    return latest ?? avg;
  });
  const weightDeltaForDay = useAppStore((s) => {
    const dayMeasurements = s.measurementEntries
      .filter(m => Number(m.dayIndex) === summaryDay)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const weights = dayMeasurements.filter(m => m.weight).map(m => m.weight as number);
    const weightAvg = weights.length > 0 ? Number((weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1)) : null;
    return weightAvg !== null
      ? Number((weightAvg - (s.userProfile?.initialWeight || weightAvg)).toFixed(1))
      : null;
  });

  // 28-day chart data: duration + future flag for every course day.
  const chartData = useMemo(() => {
    return Array.from({ length: 28 }).map((_, idx) => {
      const dayNum = idx + 1;
      const entry = sleepLogs[dayNum];
      const duration = entry ? entry.duration : 0;
      return { day: dayNum, duration, isFuture: dayNum > currentDayIndex };
    });
  }, [sleepLogs, currentDayIndex]);

  // Click-through zone over each bar (Water/Movement pattern).
  const CustomSleepBarShape = (props: any) => {
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

  // Global calculations for the entire course period
  const getGlobalMetrics = () => {
    const entries = Object.values(sleepLogs).filter(e => e.duration > 0 && e.dayIndex <= currentDayIndex);
    const count = entries.length;
    
    if (count === 0) {
      return {
        averageDuration: 0,
        goodQualityCount: 0,
        bedtimeStability: "Нет данных",
        waketimeStability: "Нет данных",
        streak: 0,
        bestDay: "Нет записей",
        worstDay: "Нет записей",
        totalDaysLogged: 0
      };
    }

    const totalMin = entries.reduce((acc, e) => acc + e.duration, 0);
    const avgMin = Math.round(totalMin / count);
    const goodQ = entries.filter(e => e.quality === "good").length;

    // Bedtime stability (checking if bedtime is usually before 23:30)
    let earlyBedtimes = 0;
    let bedtimesWithTime = 0;
    entries.forEach(e => {
      if (!e.sleepTime) return;
      bedtimesWithTime++;
      const [h, m] = e.sleepTime.split(":").map(Number);
      // bedtimes like 22:00, 23:00, 21:00 are early
      if (h === 21 || h === 22 || (h === 23 && m <= 15)) {
        earlyBedtimes++;
      }
    });
    const bedtimeStability = bedtimesWithTime === 0
      ? "Нет данных"
      : (earlyBedtimes / bedtimesWithTime > 0.7 
        ? "Стабильный (22:00–23:15)" 
        : (earlyBedtimes / bedtimesWithTime > 0.4 ? "Умеренный ритм" : "Плавающий график ⚠️"));

    // Waketime stability (consistent wake minutes after midnight ratio)
    let properWake = 0;
    let waketimesWithTime = 0;
    entries.forEach(e => {
      if (!e.wakeTime) return;
      waketimesWithTime++;
      const [h] = e.wakeTime.split(":").map(Number);
      if (h >= 6 && h <= 8) {
        properWake++;
      }
    });
    const waketimeStability = waketimesWithTime === 0
      ? "Нет данных"
      : (properWake / waketimesWithTime > 0.75 
        ? "Высокая (06:00–08:00)" 
        : "Нерегулярная");

    // Streak of meeting at least 7 hours (420 mins)
    let currentStreak = 0;
    let maxStreak = 0;
    for (let d = 1; d <= currentDayIndex; d++) {
      const entry = sleepLogs[d];
      if (entry && entry.duration >= 420) {
        currentStreak++;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    }

    // Find best and worst days based on duration
    let bestDayIdx = 1;
    let maxDuration = -1;
    let worstDayIdx = 1;
    let minDuration = 9999;
    
    entries.forEach(e => {
      if (e.duration > maxDuration) {
        maxDuration = e.duration;
        bestDayIdx = e.dayIndex;
      }
      if (e.duration < minDuration) {
        minDuration = e.duration;
        worstDayIdx = e.dayIndex;
      }
    });

    return {
      averageDuration: avgMin,
      goodQualityCount: goodQ,
      bedtimeStability,
      waketimeStability,
      streak: maxStreak,
      bestDay: `День ${bestDayIdx} (${Math.floor(maxDuration / 60)}ч ${maxDuration % 60}м)`,
      worstDay: `День ${worstDayIdx} (${Math.floor(minDuration / 60)}ч ${minDuration % 60}м)`,
      totalDaysLogged: count
    };
  };

  const metrics = getGlobalMetrics();

  // Anna coaching: built from the real sleep journal of the SELECTED day via
  // the shared sleep dictionary. Memoized over the primitives that feed the
  // SleepContext, so the phrase only changes when that data actually changes.
  const annaCoaching = useMemo(() => {
    const summary = buildDailySummary(summaryDay, useAppStore.getState(), currentDayIndex);
    const bedtimeRegularity: SleepContext["bedtimeRegularity"] =
      metrics.bedtimeStability === "Стабильный (22:00–23:15)" ? "stable"
        : metrics.bedtimeStability === "Умеренный ритм" ? "moderate"
          : "unstable";
    const wakeRegularity: SleepContext["wakeRegularity"] =
      metrics.waketimeStability === "Высокая (06:00–08:00)" ? "stable"
        : "unstable";
    const isCurrentDay = selectedGraphDay === currentDayIndex;
    const context: SleepContext = {
      userName,
      userGender,
      summary,
      courseDay: selectedGraphDay,
      hasEntry: hasEntryForDay,
      isCurrentDay,
      sleepMinutes: graphDayDuration,
      sleepGoalMinutes: sleepGoalToday,
      quality: qualityForDay,
      bedtime: bedtimeForDay,
      wakeTime: wakeTimeForDay,
      bedtimeRegularity,
      wakeRegularity,
      streak: metrics.streak,
      activeMinutes: summary.movement.activeMin,
      activeStreak: null,
      pulse: summary.measurements.latestPulse ?? summary.measurements.pulseAvg,
      weightDelta: summary.measurements.weightDelta,
    };

    return getSleepCoaching(context);
  }, [
    summaryDay,
    currentDayIndex,
    userName,
    userGender,
    graphDayEntry,
    graphDayDuration,
    sleepGoalToday,
    hasEntryForDay,
    qualityForDay,
    bedtimeForDay,
    wakeTimeForDay,
    metrics.bedtimeStability,
    metrics.waketimeStability,
    metrics.streak,
    activeMinForDay,
    pulseForDay,
    weightDeltaForDay,
  ]);

  // Color mappings based on sleep duration/quality
  let glowBorderClass = "border-violet-100 shadow-[0_8px_30px_rgb(139,92,246,0.04)]";
  let statusBadge = "bg-violet-50 text-violet-600 border border-violet-100";
  if (annaCoaching.mood === "good") {
    glowBorderClass = "border-emerald-100 shadow-[0_8px_30px_rgb(16,185,129,0.06)]";
    statusBadge = "bg-emerald-50 text-emerald-600 border border-emerald-100";
  } else if (annaCoaching.mood === "warning") {
    glowBorderClass = "border-amber-100 shadow-[0_8px_30px_rgb(245,158,11,0.06)]";
    statusBadge = "bg-amber-50 text-amber-600 border border-amber-100";
  }

  // Quality label mapping Helper
  const getQualityLabel = (q: string) => {
    if (q === "good") return "Отличный сон";
    if (q === "fair") return "Средний сон";
    return "Плохой сон";
  };

  return (
    <div className="w-full flex flex-col justify-between relative overflow-hidden" id="sleep-analytics-screen">
      
      {/* Scrollable Body */}
      <div className="flex-1 flex flex-col px-5 pt-3 pb-6 max-h-[740px] overflow-y-auto scrollbar-none">
        
        {/* Navigation Header */}
        <div className="flex justify-between items-center w-full mb-5">
          <button
            id="sleep-back-btn"
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-center text-slate-650 hover:bg-slate-50 transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 antialiased pointer-events-none" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none">Дневник</span>
            <span className="text-[18px] font-black text-slate-800" style={{ fontFamily: '"Calibri", sans-serif' }}>Режим сна и отдыха</span>
          </div>
          <div className="w-10 h-10" />
        </div>

        {/* Manual sleep entry trigger */}
        <button
          type="button"
          id="sleep-manual-entry-btn"
          onClick={() => {
            setShowManualEntry(true);
            setManualError("");
          }}
          className="w-[min(320px,calc(100%-48px))] mx-auto mb-5 py-2.5 rounded-2xl border-none bg-violet-50/90 text-violet-700 text-sm font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-violet-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> Записать сон вручную
        </button>

        {/* 1. UPPER PART: LAST NIGHT SUMMARY */}
        <div className="bg-white rounded-[32px] p-4.5 shadow-md flex flex-col gap-4 text-left mb-5">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-violet-500 tracking-wider uppercase">ОТЧЁТ О СНЕ</span>
              <h2 className="text-[20px] font-bold text-text-dark leading-tight">Прошлая ночь • День {selectedGraphDay}</h2>
            </div>
            
            <span className="text-xs bg-violet-100/60 font-black text-violet-700 px-3 py-1 rounded-full border border-violet-200/50">
              Цель: 8 ч
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1.5">
            {/* Duration card */}
            <div className="bg-[#F8F4F9] rounded-3xl p-4 shadow-md col-span-2 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] text-purple-600 font-extrabold tracking-wide uppercase">ДЛИТЕЛЬНОСТЬ</span>
                  {graphDayDuration > 0 ? (
                    <span className="text-[26px] font-black text-text-dark font-mono leading-tight">
                      {Math.floor(graphDayDuration / 60)} ч {graphDayDuration % 60} мин
                    </span>
                  ) : (
                    <span className="text-[18px] font-bold text-text-muted">Нет записи</span>
                  )}
                </div>
                <img src={imgDuration} alt="" className="w-14 h-14 object-contain pointer-events-none shrink-0" />
              </div>

              {/* Progress Slider tube */}
              <div className="w-full h-2.5 rounded-full bg-slate-200/50 overflow-hidden mt-3 relative z-10">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: `${graphDayPercent}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 shadow-sm"
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] gap-3">
              {/* Card 1: Отбой */}
              <div className="bg-[#F4ECF7] shadow-sm rounded-2xl p-3 flex flex-row justify-between items-center min-w-0">
                <div className="flex flex-col items-start min-w-0 truncate">
                  <span className="text-[9px] text-purple-600 font-black uppercase tracking-wider">ОТБОЙ</span>
                  <span className="text-[17px] font-black font-mono text-slate-800 truncate">
                    {graphDayEntry ? (graphDayEntry.sleepTime || "Время не указано") : "—:—"}
                  </span>
                </div>
                <img src={imgBedtime} className="w-11 h-11 object-contain shrink-0 ml-1" alt="Отбой" />
              </div>

              {/* Card 2: Самочувствие */}
              <div className="bg-[#F9F0F5] shadow-sm rounded-2xl p-3 flex flex-row justify-between items-center min-w-0">
                <div className="flex flex-col items-start min-w-0 truncate">
                  <span className="text-[9px] text-purple-600 font-black uppercase tracking-wider">САМОЧУВСТВИЕ</span>
                  <span className="text-[13px] font-bold text-slate-800 leading-tight whitespace-nowrap">
                    {graphDayEntry ? (graphDayEntry.quality ? getQualityLabel(graphDayEntry.quality) : "Не отмечено") : "Нет данных"}
                  </span>
                </div>
                {graphDayEntry?.quality === "good" ? (
                  <img src={imgGood} className="w-11 h-11 object-contain shrink-0 ml-1" alt="Самочувствие" />
                ) : graphDayEntry?.quality === "fair" ? (
                  <img src={imgAverage} className="w-11 h-11 object-contain shrink-0 ml-1" alt="Самочувствие" />
                ) : graphDayEntry?.quality === "poor" ? (
                  <img src={imgPoor} className="w-11 h-11 object-contain shrink-0 ml-1" alt="Самочувствие" />
                ) : (
                  <HelpCircle className="w-11 h-11 object-contain shrink-0 ml-1 text-slate-400" />
                )}
              </div>

              {/* Card 3: Подъём */}
              <div className="bg-[#F0F0FA] shadow-sm rounded-2xl p-3 flex flex-row justify-between items-center min-w-0">
                <div className="flex flex-col items-start min-w-0 truncate">
                  <span className="text-[9px] text-purple-600 font-black uppercase tracking-wider">ПОДЪЁМ</span>
                  <span className="text-[17px] font-black font-mono text-slate-800 truncate">
                    {graphDayEntry ? (graphDayEntry.wakeTime || "Время не указано") : "—:—"}
                  </span>
                </div>
                <img src={imgWakeup} className="w-11 h-11 object-contain shrink-0 ml-1" alt="Подъём" />
              </div>
            </div>

            {/* Multi-period record count row */}
            {dayJournalEntries.length >= 2 && (() => {
              const n = dayJournalEntries.length;
              const m10 = n % 10, m100 = n % 100;
              const plural = (m10 === 1 && m100 !== 11)
                ? "запись"
                : (m10 >= 2 && m10 <= 4 && !(m100 >= 12 && m100 <= 14))
                  ? "записи"
                  : "записей";
              return (
                <div className="col-span-2 flex items-center justify-between text-[11px] font-bold text-slate-500 bg-[#F8F4F9] rounded-2xl shadow-sm px-3 py-2">
                  <span>Несколько периодов сна за день</span>
                  <span className="text-violet-600 font-black">{n} {plural}</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 2. MIDDLE PART: ANNA'S BLOCK */}
        <div className={`rounded-[28px] p-4.5 text-left flex flex-col gap-3.5 transition-all duration-500 relative z-10 mb-5 bg-[#F5F3FF] shadow-sm ${glowBorderClass}`} id="anna-sleep-coaching-box">
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

            <img src={ingrGreenImg} alt="Anna Logo" className="w-6 h-6 object-contain shrink-0" />
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-3 rounded-2xl text-[14px] leading-relaxed font-semibold text-slate-800">
            {annaCoaching.text}
          </div>
        </div>

        {/* 3. GRAPHIC: 28-DAY sleep dynamic course chart */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-left flex flex-col gap-3 mb-5">
          <div className="flex justify-between items-baseline px-1">
            <div className="flex flex-col">
              <span className="text-[11px] font-bold text-violet-600 tracking-wide uppercase">СТАТИСТИКА КУРСА</span>
              <span className="text-[16px] font-black text-text-dark">Мониторинг ритма сна 28 дней</span>
            </div>
            
            <div className="text-[11px] text-text-muted font-bold bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-100">
              Выбран день: <span className="text-violet-500 font-mono font-black">{selectedGraphDay}</span>
            </div>
          </div>

          {/* Interactive 28-day chart (Recharts, Water/Movement pattern) */}
          <div className="relative pt-6 pb-2 px-1 h-44 outline-none border-none focus:outline-none focus:ring-0" style={{ outline: 'none', border: 'none' }}>
            {/* 8-hour norm line indicator */}
            <div className="absolute top-[30%] left-0 right-0 border-t border-dashed border-violet-300/30 flex justify-end z-0 pointer-events-none">
              <span className="text-[8px] text-violet-400 font-bold bg-white px-1 -mt-1.5 font-mono z-10">Норма (8 часов)</span>
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
                  <linearGradient id="colorSleep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#C4B5FD" stopOpacity={1}/>
                  </linearGradient>
                  <linearGradient id="colorSleepEmpty" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#DDD6FE" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#EDE9FE" stopOpacity={1}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis hide type="number" domain={[0, sleepGoalToday * 1.15]} />
                <Tooltip content={<CustomSleepTooltip />} cursor={{ fill: 'transparent' }} wrapperStyle={{ outline: 'none', border: 'none', zIndex: 50, pointerEvents: 'none' }} />
                <ReferenceLine y={sleepGoalToday} stroke="#C4B5FD" strokeDasharray="4 4" />
                <Bar
                  dataKey="duration"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                  isAnimationActive={false}
                  shape={<CustomSleepBarShape />}
                  background={{ fill: 'transparent', stroke: 'transparent', strokeWidth: 0, strokeOpacity: 0 }}
                  style={{ outline: 'none', stroke: 'none' }}
                >
                  {chartData.map((entry, index) => {
                    const isActive = entry.day === selectedGraphDay;
                    let fill = "url(#colorSleep)";
                    if (entry.isFuture) fill = "#F1F5F9";
                    else if (entry.duration === 0) fill = "url(#colorSleepEmpty)";
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={fill}
                        stroke={isActive ? "#A78BFA" : "transparent"}
                        strokeWidth={isActive ? 2 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Selected day summary: header + individual entry cards */}
          <div className="flex justify-between items-end mb-2 px-1">
            <h3 className="text-sm font-bold text-purple-600 uppercase">
              Сон за день {selectedGraphDay}
            </h3>
            {dayJournalEntries.length >= 2 && (
              <span className="text-xs text-slate-500">Записей: {dayJournalEntries.length}</span>
            )}
          </div>

          <div className="flex flex-col mb-5">
            {(dayJournalEntries.length > 0
              ? dayJournalEntries
              : graphDayEntry
                ? [{
                    duration: graphDayDuration,
                    quality: graphDayEntry.quality ?? null,
                  }]
                : []
            ).map((entry: { duration: number; quality: string | null }, idx: number) => {
              const dur = entry.duration || 0;
              const pct = Math.min(100, Math.round((dur / sleepGoalToday) * 100));
              const thumb = entry.quality === "good" ? imgGood
                : entry.quality === "fair" ? imgAverage
                : entry.quality === "poor" ? imgPoor
                : null;
              return (
                <div
                  key={idx}
                  className="bg-[#F4ECF7] shadow-sm rounded-2xl flex flex-row justify-between items-center px-3 py-[2px] mb-2"
                >
                  <span className="text-[14px] font-bold text-slate-800">
                    {dur > 0
                      ? `${Math.floor(dur / 60)} ч ${dur % 60} мин (${pct}%)`
                      : "Нет записи"}
                  </span>
                  <span className="flex items-center shrink-0">
                    <span className="text-[12px] font-semibold text-slate-500 mr-2">
                      {entry.quality ? getQualityLabel(entry.quality) : "Не отмечено"}
                    </span>
                    {thumb && (
                      <img src={thumb} alt="" className="w-8 h-8 object-contain shrink-0 ml-2 pointer-events-none" />
                    )}
                  </span>
                </div>
              );
            })}
            {dayJournalEntries.length === 0 && !graphDayEntry && (
              <div className="bg-[#F4ECF7] shadow-sm rounded-2xl px-3 py-[2px] mb-2">
                <p className="text-[12px] text-slate-400 font-medium italic leading-tight py-1">
                  Записи сна за этот день отсутствуют
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. LOWER PART: HISTORIC GLOBAL METRICS */}
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-bold text-violet-600 tracking-wide uppercase px-1 text-left">ГЛОБАЛЬНАЯ КУРСОВАЯ СТАТИСТИКА</span>
          
          <div className="grid grid-cols-2 gap-3 text-left">

            {/* Средний сон */}
            <div className="bg-[#F3F4F9] rounded-2xl shadow-sm px-3 py-1 flex flex-row justify-between items-center min-w-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[9px] text-purple-600 font-black tracking-wider uppercase">СРЕДНИЙ СОН</span>
                <span className="text-[15px] font-black text-text-dark font-mono leading-none">
                  {metrics.averageDuration > 0
                    ? `${Math.floor(metrics.averageDuration / 60)}ч ${metrics.averageDuration % 60}м`
                    : "Нет данных"
                  }
                </span>
                <span className="text-[9px] text-text-muted">динамика за {metrics.totalDaysLogged} дн</span>
              </div>
              <img src={imgAverageSleep} alt="" className="w-11 h-11 object-contain shrink-0" />
            </div>

            {/* Активная серия */}
            <div className="bg-[#FFF6ED] rounded-2xl shadow-sm px-3 py-1 flex flex-row justify-between items-center min-w-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[9px] text-purple-600 font-black tracking-wider uppercase">АКТИВНАЯ СЕРИЯ</span>
                <span className="text-[15px] font-black text-amber-600 font-mono leading-none">+{metrics.streak} дн</span>
                <span className="text-[9px] text-text-muted">цель сна достигнута</span>
              </div>
              <img src={imgActiveStreak} alt="" className="w-11 h-11 object-contain shrink-0" />
            </div>

            {/* Регулярность отбоя */}
            <div className="bg-[#F6F0FA] rounded-2xl shadow-sm px-3 py-1 flex flex-row justify-between items-center min-w-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[9px] text-purple-600 font-black tracking-wider uppercase">РЕГУЛЯРНОСТЬ ОТБОЯ</span>
                <span className="text-[13px] font-bold text-violet-700 leading-tight">
                  {metrics.bedtimeStability}
                </span>
                <span className="text-[9px] text-text-muted">смещение ритма</span>
              </div>
              <img src={imgBedtimeReg} alt="" className="w-11 h-11 object-contain shrink-0" />
            </div>

            {/* Стабильность подъёма */}
            <div className="bg-[#F0F8F6] rounded-2xl shadow-sm px-3 py-1 flex flex-row justify-between items-center min-w-0">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[9px] text-purple-600 font-black tracking-wider uppercase">СТАБИЛЬНОСТЬ ПОДЪЁМА</span>
                <span className="text-[13px] font-bold text-emerald-600 leading-tight">
                  {metrics.waketimeStability}
                </span>
                <span className="text-[9px] text-text-muted">утренняя свежесть</span>
              </div>
              <img src={imgWakeupStab} alt="" className="w-11 h-11 object-contain shrink-0" />
            </div>

            {/* Лучший сон */}
            <div className="bg-[#FFF9E6] rounded-2xl shadow-sm p-2 flex flex-row items-center gap-3 text-left min-w-0">
              <img src={imgBestSleep} alt="" className="w-11 h-11 object-contain shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[9px] text-violet-700 font-black uppercase tracking-tight">ЛУЧШИЙ СОН</span>
                <span className="text-[12px] font-bold text-slate-800 leading-tight truncate">{metrics.bestDay}</span>
              </div>
              <span className="ml-auto text-[9px] font-bold text-[#A78BFA] px-2 py-0.5 bg-white rounded-md shrink-0">РЕКОРД</span>
            </div>

            {/* Дефицитный день */}
            <div className="bg-[#FFF0F0] rounded-2xl shadow-sm p-2 flex flex-row items-center gap-3 text-left min-w-0">
              <img src={imgDeficitDay} alt="" className="w-11 h-11 object-contain shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[9px] text-[#C1323B] font-black uppercase tracking-tight">ДЕФИЦИТНЫЙ ДЕНЬ</span>
                <span className="text-[12px] font-bold text-slate-800 leading-tight truncate">{metrics.worstDay}</span>
              </div>
              <span className="ml-auto text-[9px] font-bold text-rose-500 px-2 py-0.5 bg-white rounded-md shrink-0">ПРЕДУПРЕЖДЕНИЕ</span>
            </div>

          </div>
        </div>

      </div>

      {/* Manual sleep entry modal */}
      <AnimatePresence>
        {showManualEntry && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.45 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowManualEntry(false)}
              className="absolute inset-0 bg-[#0F172A] z-50 cursor-pointer pointer-events-auto"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="absolute inset-0 z-[60] flex items-center justify-center p-6 pointer-events-none"
            >
              <div className="w-full max-w-[360px] bg-white rounded-[28px] p-5 shadow-2xl text-left pointer-events-auto max-h-[88%] overflow-y-auto scrollbar-none">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-violet-600 tracking-wider uppercase">РУЧНОЙ ВВОД</span>
                    <h3 className="text-[17px] font-black text-text-dark" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
                      Запись сна задним числом
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualEntry(false)}
                    className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4 pointer-events-none" />
                  </button>
                </div>

                <div className="flex flex-col gap-5">
                  {/* Feeling Selection — top */}
                  <div className="bg-[#F8F0FA] rounded-[24px] p-4 flex justify-around mb-2">
                    {([
                      { v: "good" as const, label: "Хорошо", img: imgGood },
                      { v: "fair" as const, label: "Средне", img: imgAverage },
                      { v: "poor" as const, label: "Плохо", img: imgPoor },
                    ]).map(opt => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setManualQuality(opt.v)}
                        className={`flex flex-col items-center gap-1.5 cursor-pointer select-none transition-transform ${
                          manualQuality === opt.v ? "scale-110 drop-shadow-md" : ""
                        }`}
                      >
                        <img src={opt.img} alt={opt.label} className="w-20 h-20 object-contain pointer-events-none" />
                        <span className={`text-[13px] font-bold ${manualQuality === opt.v ? "text-purple-900" : "text-slate-500"}`}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Day picker */}
                  <div>
                    <span className="text-[11px] text-text-muted font-black tracking-wider uppercase mb-1.5 block">ДЕНЬ КУРСА</span>
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setManualDay(d => Math.max(1, d - 1))}
                        className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="w-4 h-4 pointer-events-none" />
                      </button>
                      <span className="text-[18px] font-black text-slate-800 font-mono">День {manualDay}</span>
                      <button
                        type="button"
                        onClick={() => setManualDay(d => Math.min(currentDayIndex, d + 1))}
                        className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 pointer-events-none" />
                      </button>
                    </div>
                  </div>

                  {/* Time Steppers — vertical, fat-finger sized */}
                  <div className="flex flex-col gap-6 items-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Отбой</span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          aria-label="Отбой: минус 5 минут"
                          onPointerDown={(e) => { e.preventDefault(); startTimeHold(setManualBedtime, -5); }}
                          onPointerUp={stopTimeHold}
                          onPointerLeave={stopTimeHold}
                          onPointerCancel={stopTimeHold}
                          className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-3xl text-slate-600 hover:bg-slate-100 cursor-pointer select-none active:scale-95 transition-transform touch-none"
                        >
                          −
                        </button>
                        <span className="text-5xl font-bold text-slate-800 tracking-tight w-40 text-center">{manualBedtime}</span>
                        <button
                          type="button"
                          aria-label="Отбой: плюс 5 минут"
                          onPointerDown={(e) => { e.preventDefault(); startTimeHold(setManualBedtime, 5); }}
                          onPointerUp={stopTimeHold}
                          onPointerLeave={stopTimeHold}
                          onPointerCancel={stopTimeHold}
                          className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-3xl text-slate-600 hover:bg-slate-100 cursor-pointer select-none active:scale-95 transition-transform touch-none"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Подъём</span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          aria-label="Подъём: минус 5 минут"
                          onPointerDown={(e) => { e.preventDefault(); startTimeHold(setManualWakeTime, -5); }}
                          onPointerUp={stopTimeHold}
                          onPointerLeave={stopTimeHold}
                          onPointerCancel={stopTimeHold}
                          className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-3xl text-slate-600 hover:bg-slate-100 cursor-pointer select-none active:scale-95 transition-transform touch-none"
                        >
                          −
                        </button>
                        <span className="text-5xl font-bold text-slate-800 tracking-tight w-40 text-center">{manualWakeTime}</span>
                        <button
                          type="button"
                          aria-label="Подъём: плюс 5 минут"
                          onPointerDown={(e) => { e.preventDefault(); startTimeHold(setManualWakeTime, 5); }}
                          onPointerUp={stopTimeHold}
                          onPointerLeave={stopTimeHold}
                          onPointerCancel={stopTimeHold}
                          className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center text-3xl text-slate-600 hover:bg-slate-100 cursor-pointer select-none active:scale-95 transition-transform touch-none"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {manualError && (
                    <span className="text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                      {manualError}
                    </span>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualEntry(false)}
                      className="flex-1 py-3 rounded-2xl bg-slate-50 text-slate-500 text-[14px] font-semibold active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={submitManualEntry}
                      className="flex-[2] py-3 rounded-2xl bg-[#E6D4EB] text-purple-900 text-[14px] font-semibold shadow-sm active:scale-[0.98] transition-transform cursor-pointer"
                    >
                      Сохранить запись
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Embedded Bottom Bar */}
      <div className="w-full">
        <BottomBar activeTab="my-day" />
      </div>

    </div>
  );
}
