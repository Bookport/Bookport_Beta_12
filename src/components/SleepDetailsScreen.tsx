import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import BottomBar from "./BottomBar";
import { 
  ArrowLeft, 
  Moon, 
  Sparkles, 
  Clock, 
  Award, 
  TrendingUp, 
  Zap, 
  Plus, 
  Minus, 
  X,
  HelpCircle,
  CheckCircle2,
  Smile,
  Frown,
  Activity,
  Calendar,
  AlertTriangle
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

const annaAvatarSrc = resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'thoughtful' }).src;
import BriefNoteBlock from "./BriefNoteBlock";

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
  const [selectedGraphDay, setSelectedGraphDay] = useState<number>(currentDayIndex);
  const [noteSavedOrSkipped, setNoteSavedOrSkipped] = useState(false);

  // Manual sleep entry form state
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualDay, setManualDay] = useState<number>(currentDayIndex);
  const [manualBedtime, setManualBedtime] = useState<string>("23:00");
  const [manualWakeTime, setManualWakeTime] = useState<string>("07:00");
  const [manualQuality, setManualQuality] = useState<SleepQuality>(null);
  const [manualNote, setManualNote] = useState<string>("");
  const [manualError, setManualError] = useState<string>("");

  const handleSaveSleepNote = (noteText: string, selectedTags: string[], isVoice: boolean) => {
    if (!noteText.trim() && selectedTags.length === 0) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    
    const newNote = {
      text: noteText.trim() || "Зафиксирован анализ качества ночного сна 😴",
      time: timeStr,
      source: "sleep",
      tags: selectedTags,
      isVoice
    };

    setDayNotes(prev => {
      const todayArr = prev[currentDayIndex] || [];
      return {
        ...prev,
        [currentDayIndex]: [newNote, ...todayArr]
      };
    });
    setNoteSavedOrSkipped(true);
  };

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
      note: manualNote.trim() ? manualNote.trim() : undefined,
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

  // Dynamic coaching commentary by Anna based on user habits
  const getAnnaSleepCoaching = () => {
    // Current day statistics
    const todayLog = sleepLogs[currentDayIndex];
    const dMin = todayLog ? todayLog.duration : (sleep || 0);
    const dQuality = todayLog ? todayLog.quality : null;

    if (dMin === 0) {
      return {
        text: `Привет, ${userName}! Запись сна за сегодня ещё не добавлена. Когда завершится ночь, зафиксируй сон кнопкой быстрой записи в карточке «Сон» — и я помогу разобраться, как прошло восстановление. 🌙`,
        mood: "neutral" as const,
        label: "Ожидание записи сна"
      };
    }

    if (dMin >= 450 && dQuality === "good") {
      return {
        text: `Великолепный сон, ${userName}! Твоя нервная система успела пройти все фазы глубокого очищения — глимпатическая система вывела метаболиты, а растительные антиоксиданты из ужина защитили сосуды мозга. Без соли и лишней задержки жидкости твоё давление в идеальном балансе. Настоящий эталон восстановления! 🧠✨`,
        mood: "good" as const,
        label: "Идеальный биоритм"
      };
    } else if (dMin >= 420) {
      return {
        text: `Хороший отдых, ${userName}! Твои ${Math.floor(dMin / 60)} ч ${dMin % 60} мин сна — идеальная база на день. Печень завершила ночную детоксикацию, а почки отдохнули от натриевой нагрузки (ведь мы полностью исключили соль!). Попробуй сегодня лечь на 15 минут раньше, чтобы стать ещё активнее! 🔋`,
        mood: "good" as const,
        label: "Хороший отдых"
      };
    } else if (dMin >= 360) {
      return {
        text: `${userName}, сон в пределах ${Math.floor(dMin / 60)} часов допустим, но является пограничным. Твоему организму на чистом WFPB рационе требуется полноценная регенерация митохондрий. Постарайся вечером отказаться от ярких экранов за час до сна и дать глазам отдохнуть в сумерках. Позаботимся о клетках? 😉`,
        mood: "neutral" as const,
        label: "Ограниченное время"
      };
    } else {
      return {
        text: `Ой-ой, ${userName}, сегодня у тебя явный дефицит сна — всего ${Math.floor(dMin / 60)} ч ${dMin % 60} мин. Твой сосудистый тонус и чувствительность к инсулину напрямую страдают от недосыпа. Растительный рацион спасёт от ложного голода, но телу срочно нужен полноценный отдых. Спланируем ранний отбой в тишине? 🛌💤`,
        mood: "warning" as const,
        label: "Кислородное голодание"
      };
    }
  };

  const annaCoaching = getAnnaSleepCoaching();

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
    if (q === "good") return "Отличный сон 👍";
    if (q === "fair") return "Средний сон 😐";
    return "Плохой сон 👎";
  };

  return (
    <div className="w-full flex flex-col justify-between relative overflow-hidden" id="sleep-analytics-screen">
      
      {/* Scrollable Body */}
      <div className="flex-1 flex flex-col px-5 pt-3 pb-6 max-h-[740px] overflow-y-auto scrollbar-none">
        
        {/* Navigation Head */}
        <div className="flex justify-between items-center w-full mb-5">
          <button
            id="sleep-back-btn"
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-slate-100/80 hover:bg-slate-200/80 flex items-center justify-center text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 pointer-events-none" />
          </button>
          
          <span 
            className="text-[17px] font-bold text-slate-800"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Режим Сна & Отдыха
          </span>
          
          <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700">
            <Moon className="w-5 h-5 text-violet-500 fill-violet-100" />
          </div>
        </div>

        {/* Manual sleep entry trigger */}
        <button
          type="button"
          id="sleep-manual-entry-btn"
          onClick={() => {
            setShowManualEntry(true);
            setManualError("");
          }}
          className="w-full mb-5 py-2.5 rounded-2xl border border-violet-200/70 bg-violet-50/70 text-violet-700 text-[12.5px] font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-violet-100 transition-colors"
        >
          <Plus className="w-4 h-4" /> Записать сон вручную
        </button>

        {/* 1. UPPER PART: LAST NIGHT SUMMARY */}
        <div className="bg-white rounded-[32px] border border-gray-100/80 p-4.5 shadow-[0_5px_15px_-3px_rgba(43,49,55,0.03)] flex flex-col gap-4 text-left mb-5">
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
            {/* Massive main metric box */}
            <div className="bg-gradient-to-br from-violet-50/50 to-indigo-50/20 border border-violet-100 rounded-3xl p-4 flex flex-col justify-between min-h-[110px] col-span-2 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="flex justify-between items-center z-10">
                <span className="text-[11px] text-violet-700 font-extrabold tracking-wide uppercase">ДЛИТЕЛЬНОСТЬ</span>
                <Clock className="w-4 h-4 text-violet-500" />
              </div>
              
              {graphDayDuration > 0 ? (
                <div className="flex items-baseline gap-1 mt-2.5 z-10">
                  <span className="text-[34px] font-black text-text-dark font-mono leading-none">
                    {Math.floor(graphDayDuration / 60)}
                  </span>
                  <span className="text-[14px] text-text-muted font-bold">ч</span>
                  <span className="text-[34px] font-black text-text-dark font-mono leading-none ml-2">
                    {graphDayDuration % 60}
                  </span>
                  <span className="text-[14px] text-text-muted font-bold">мин</span>
                </div>
              ) : (
                <div className="flex items-center mt-3.5 z-10">
                  <span className="text-[18px] font-bold text-text-muted">Нет записи</span>
                </div>
              )}

              {/* Progress Slider tube */}
              <div className="w-full h-2.5 rounded-full bg-slate-200/50 border border-gray-100 overflow-hidden mt-3 relative z-10">
                <motion.div 
                  initial={{ width: "0%" }}
                  animate={{ width: `${graphDayPercent}%` }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 shadow-sm"
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            {/* Timing bedtime */}
            <div className="bg-slate-50/85 rounded-2xl p-3 border border-gray-100 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-muted font-black tracking-wider uppercase">ОТБОЙ</span>
                <span className="text-[14px] font-black text-slate-800 font-mono">
                  {graphDayEntry ? (graphDayEntry.sleepTime || "Время не указано") : "—:—"}
                </span>
              </div>
              <span className="text-[18px]">🌙</span>
            </div>

            {/* Timing waketime */}
            <div className="bg-slate-50/85 rounded-2xl p-3 border border-gray-100 flex items-center justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-muted font-black tracking-wider uppercase">ПОДЪЁМ</span>
                <span className="text-[14px] font-black text-slate-800 font-mono">
                  {graphDayEntry ? (graphDayEntry.wakeTime || "Время не указано") : "—:—"}
                </span>
              </div>
              <span className="text-[18px]">☀️</span>
            </div>

            {/* Subjective quality box */}
            <div className="bg-slate-50/85 rounded-2xl p-3 border border-gray-100 flex items-center justify-between col-span-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-text-muted font-black tracking-wider uppercase">СУБЪЕКТИВНОЕ САМОЧУВСТВИЕ</span>
                <span className="text-[13px] font-bold text-slate-800">
                  {graphDayEntry ? (graphDayEntry.quality ? getQualityLabel(graphDayEntry.quality) : "Не отмечено") : "Нет данных"}
                </span>
              </div>
              <div className="w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-xs">
                {graphDayEntry?.quality === "good" ? (
                  <Smile className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                ) : graphDayEntry?.quality === "fair" ? (
                  <Activity className="w-5 h-5 text-amber-500" />
                ) : graphDayEntry?.quality === "poor" ? (
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                ) : (
                  <HelpCircle className="w-5 h-5 text-slate-400" />
                )}
              </div>
            </div>

            {dayJournalEntries.length > 1 && (
              <div className="col-span-2 flex items-center justify-between text-[11px] font-bold text-slate-500 bg-violet-50/60 rounded-2xl border border-violet-100 px-3 py-2">
                <span>Несколько периодов сна за день</span>
                <span className="text-violet-600 font-black">{dayJournalEntries.length} записи</span>
              </div>
            )}
          </div>
        </div>

        {sleep > 0 && !noteSavedOrSkipped && (
          <BriefNoteBlock
            moduleKey="sleep"
            onSave={handleSaveSleepNote}
            onSkip={() => setNoteSavedOrSkipped(true)}
          />
        )}

        {/* 2. MIDDLE PART: ANNA'S BLOCK */}
        <div className={`rounded-[28px] p-4 text-left flex flex-col gap-3 transition-all duration-500 relative z-10 mb-5 ${glowBorderClass}`} id="anna-sleep-coaching-box">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-violet-200/55 shadow-md">
                  <img 
                    src={annaAvatarSrc}
                    alt="Анна советует" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-violet-600 border border-white flex items-center justify-center text-[9px]">
                  🌙
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-slate-900 leading-none">Анна</span>
                <span className="text-[11px] font-bold text-text-muted mt-0.5 leading-none">Советник WFPB</span>
                <span className={`text-[10px] font-extrabold px-2.2 py-0.5 rounded-full inline-block mt-1 tracking-wider uppercase ${statusBadge}`}>
                  {annaCoaching.label}
                </span>
              </div>
            </div>
            
            <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl text-[14px] leading-relaxed font-semibold text-slate-800">
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
              Кульминация Д: <span className="text-violet-500 font-mono font-black">{selectedGraphDay}</span>
            </div>
          </div>

          {/* Interactive columns container */}
          <div className="relative pt-6 pb-2 px-1">
            
            {/* 8-hour line label indicator */}
            <div className="absolute top-[30%] left-0 right-0 border-t border-dashed border-violet-300/30 flex justify-end z-0">
              <span className="text-[8px] text-violet-400 font-bold bg-white px-1 -mt-1.5 font-mono z-10">Норма (8 часов)</span>
            </div>

            <div className="flex justify-between items-end gap-[3px] h-32 relative z-10">
              {Array.from({ length: 28 }).map((_, idx) => {
                const dayNum = idx + 1;
                const active = dayNum === selectedGraphDay;
                const isFuture = dayNum > currentDayIndex;
                
                const entry = sleepLogs[dayNum];
                const dDur = entry ? entry.duration : 0;
                const dQual = entry ? entry.quality : null;
                
                // Height calculation capped between 8% and 100%
                let heightPct = 6;
                if (dDur > 0) {
                  heightPct = Math.min(100, Math.max(12, Math.round((dDur / sleepGoalToday) * 100)));
                }

                // Cylinder colors representing quality
                let barBg = "bg-slate-200/50";
                if (!isFuture && dDur > 0) {
                  if (dQual === "good") {
                    barBg = "bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-xs";
                  } else if (dQual === "fair") {
                    barBg = "bg-gradient-to-t from-violet-500 to-fuchsia-400 shadow-xs";
                  } else if (dQual === "poor") {
                    barBg = "bg-gradient-to-t from-amber-500 to-amber-400 shadow-xs";
                  } else {
                    // Quality not marked (e.g. legacy duration-only record)
                    barBg = "bg-gradient-to-t from-violet-400/80 to-indigo-400/80 shadow-xs";
                  }
                } else if (dayNum === currentDayIndex && sleep > 0) {
                  // Today live bar representing active progress
                  barBg = "bg-gradient-to-t from-violet-400 to-indigo-500 animate-pulse";
                }

                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => setSelectedGraphDay(dayNum)}
                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-pointer"
                  >
                    {/* Tooltip on hover active */}
                    {active && (
                      <div className="absolute bottom-full mb-1.5 bg-slate-900 text-white text-[9px] py-1 px-1.5 rounded-lg font-bold font-mono whitespace-nowrap shadow-md z-40">
                        Д{dayNum}: {Math.floor(dDur / 60)}ч {dDur % 60}м
                        <div className="w-1.5 h-1.5 bg-slate-900 rotate-45 mx-auto -mb-1 mt-0.5" />
                      </div>
                    )}

                    {/* Column */}
                    <div 
                      className={`w-full rounded-t-full transition-all duration-300 relative ${barBg} ${
                        active 
                          ? "ring-2 ring-violet-500 ring-offset-1 scale-110 shadow-md" 
                          : "hover:scale-105"
                      }`}
                      style={{ height: `${heightPct}%` }}
                    >
                      {/* Met goal green spark indicator dot on top */}
                      {!isFuture && dDur >= sleepGoalToday && (
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400 border border-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Weeks */}
            <div className="flex justify-between text-[9px] text-[#737C86] font-bold mt-2.5 px-0.5 border-t border-gray-100 pt-1.5">
              <span>Неделя 1</span>
              <span>Неделя 2</span>
              <span>Неделя 3</span>
              <span>Неделя 4</span>
            </div>
          </div>

          {/* Dynamic description of selected graph day */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100 flex items-center justify-between text-[13px]">
            <div className="flex items-center gap-1.5 text-text-sec font-medium">
              <CheckCircle2 className="w-4.5 h-4.5 text-violet-500" />
              <span>День {selectedGraphDay} {selectedGraphDay > currentDayIndex ? "(будущий)" : ""}:</span>
            </div>
            
            <span className="font-bold text-text-dark font-mono">
              {graphDayDuration > 0 
                ? `${Math.floor(graphDayDuration / 60)}ч ${graphDayDuration % 60}м (${graphDayPercent}%) | ${graphDayEntry?.quality ? getQualityLabel(graphDayEntry.quality) : "Самочувствие не отмечено"}` 
                : "Данных нет"
              }
            </span>
          </div>
        </div>

        {/* 4. LOWER PART: HISTORIC GLOBAL METRICS */}
        <div className="flex flex-col gap-3">
          <span className="text-[11px] font-bold text-violet-600 tracking-wide uppercase px-1 text-left">ГЛОБАЛЬНАЯ КУРСОВАЯ СТАТИСТИКА</span>
          
          <div className="grid grid-cols-2 gap-3 text-left">
            
            {/* Dynamic average duration */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex flex-col gap-1 relative overflow-hidden">
              <TrendingUp className="w-5 h-5 text-violet-500 mb-1" />
              <span className="text-[11px] text-text-muted font-bold block">СРЕДНИЙ СОН</span>
              <span className="text-[17px] font-black text-text-dark mt-0.5 font-mono">
                {metrics.averageDuration > 0 
                  ? `${Math.floor(metrics.averageDuration / 60)}ч ${metrics.averageDuration % 60}м` 
                  : "Нет данных"
                }
              </span>
              <span className="text-[9px] text-text-muted">динамика за {metrics.totalDaysLogged} дн</span>
            </div>

            {/* Streak */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex flex-col gap-1 relative overflow-hidden">
              <Zap className="w-5 h-5 text-amber-500 mb-1 fill-amber-50" />
              <span className="text-[11px] text-text-muted font-bold block">АКТИВНАЯ СЕРИЯ</span>
              <span className="text-[17px] font-black text-amber-600 mt-0.5 font-mono">+{metrics.streak} дн</span>
              <span className="text-[9px] text-text-muted">цель сна достигнута</span>
            </div>

            {/* Bedtime stability */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex flex-col gap-1 relative overflow-hidden">
              <div className="w-5 h-5 flex items-center justify-center text-[18px] mb-1">⏰</div>
              <span className="text-[11px] text-text-muted font-bold block">РЕГУЛЯРНОСТЬ ОТБОЯ</span>
              <span className="text-[14px] font-bold text-violet-700 mt-0.5">
                {metrics.bedtimeStability}
              </span>
              <span className="text-[9px] text-text-muted">смещение ритма</span>
            </div>

            {/* Wake stability */}
            <div className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm flex flex-col gap-1 relative overflow-hidden">
              <div className="w-5 h-5 flex items-center justify-center text-[18px] mb-1">🌅</div>
              <span className="text-[11px] text-text-muted font-bold block">СТАБИЛЬНОСТЬ ПОДЪЁМА</span>
              <span className="text-[14px] font-bold text-emerald-600 mt-0.5">
                {metrics.waketimeStability}
              </span>
              <span className="text-[9px] text-text-muted">утренняя свежесть</span>
            </div>

            {/* Bests and worsts banner rows */}
            <div className="col-span-2 bg-gradient-to-r from-violet-50 to-indigo-50/40 rounded-2xl border border-violet-100 p-3 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <span className="text-[20px]">🏆</span>
                <div className="flex flex-col">
                  <span className="text-[11px] text-violet-700 font-extrabold uppercase tracking-tight">ЛУЧШИЙ СОН</span>
                  <span className="text-[13px] font-bold text-slate-800 mt-0.5">{metrics.bestDay}</span>
                </div>
              </div>
              <div className="text-[11px] font-bold text-[#A78BFA] px-2 py-0.5 bg-white border border-violet-100 rounded-md">РЕКОРД</div>
            </div>

            <div className="col-span-2 bg-[#FDF1F2] rounded-2xl border border-[#FBE1E3] p-3 flex items-center justify-between text-left">
              <div className="flex items-center gap-3">
                <span className="text-[20px]">⚠️</span>
                <div className="flex flex-col">
                  <span className="text-[11px] text-[#C1323B] font-extrabold uppercase tracking-tight">ДЕФИЦИТНЫЙ ДЕНЬ</span>
                  <span className="text-[13px] font-bold text-slate-800 mt-0.5">{metrics.worstDay}</span>
                </div>
              </div>
              <div className="text-[11px] font-bold text-rose-500 px-2 py-0.5 bg-white border border-rose-100 rounded-md">ПРЕДУПРЕЖДЕНИЕ</div>
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

                <div className="flex flex-col gap-4">
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

                  {/* Times */}
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-text-muted font-black tracking-wider uppercase">🌙 ОТБОЙ</span>
                      <input
                        type="time"
                        value={manualBedtime}
                        onChange={(e) => setManualBedtime(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-[15px] font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-[11px] text-text-muted font-black tracking-wider uppercase">☀️ ПОДЪЁМ</span>
                      <input
                        type="time"
                        value={manualWakeTime}
                        onChange={(e) => setManualWakeTime(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-[15px] font-bold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
                      />
                    </label>
                  </div>

                  {/* Quality */}
                  <div>
                    <span className="text-[11px] text-text-muted font-black tracking-wider uppercase mb-1.5 block">САМОЧУВСТВИЕ (необязательно)</span>
                    <div className="flex gap-2 flex-wrap">
                      {([
                        { v: "good" as const, label: "😀 Хорошо" },
                        { v: "fair" as const, label: "😐 Средне" },
                        { v: "poor" as const, label: "😴 Плохо" },
                        { v: null, label: "Не отмечено" },
                      ]).map(opt => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setManualQuality(opt.v)}
                          className={`px-3 py-2 rounded-xl text-[12px] font-bold border transition-all cursor-pointer ${
                            manualQuality === opt.v
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Note */}
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-text-muted font-black tracking-wider uppercase">ЗАМЕТКА (необязательно)</span>
                    <input
                      type="text"
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      placeholder="Например: дневной сон после обеда"
                      className="w-full px-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-[14px] font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                  </label>

                  {manualError && (
                    <span className="text-[12px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                      {manualError}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={submitManualEntry}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[14px] font-extrabold shadow-md hover:scale-[1.01] active:scale-98 transition-all cursor-pointer"
                  >
                    Сохранить запись
                  </button>
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
