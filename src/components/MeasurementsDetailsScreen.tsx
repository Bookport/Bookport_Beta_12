import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import BottomBar from "./BottomBar";
import { 
  ArrowLeft, 
  Sparkles, 
  Heart, 
  Scale, 
  Smile, 
  TrendingUp, 
  Zap, 
  Award, 
  Activity, 
  CheckCircle2, 
  Calendar,
  HelpCircle
} from "lucide-react";
import BriefNoteBlock from "./BriefNoteBlock";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'clear_explanation' }).src;

export interface MeasurementLogEntry {
  id: string;
  dayIndex: number;
  timestamp: number;
  timeString: string; // e.g. "14:15"
  
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
  // Analytical chart default selected day is today
  const [selectedGraphDay, setSelectedGraphDay] = useState<number>(currentDayIndex);
  const [noteSavedOrSkipped, setNoteSavedOrSkipped] = useState(false);

  const handleSaveMeasurementsNote = (noteText: string, selectedTags: string[], isVoice: boolean) => {
    if (!noteText.trim() && selectedTags.length === 0) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    
    const newNote = {
      text: noteText.trim() || "Зафиксированы замеры и тонус организма 📊",
      time: timeStr,
      source: "measurements",
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
  
  // Active selected chart metric tab inside analytics
  // "wellbeing" | "energy" | "pulse" | "weight"
  const [activeChartMetric, setActiveChartMetric] = useState<"wellbeing" | "energy" | "pulse" | "weight">("wellbeing");

  // Initial measurement logs are passed as props, defaulting to {} from parent

  // Real "starting weight" from the global user profile (set at registration/onboarding).
  const profileInitialWeight = useAppStore((s) => s.userProfile?.initialWeight);

  // Aggregate stats over the 28-day course
  const getGlobalMeasurementMetrics = () => {
    let totalLogsCount = 0;
    let daysWithLogsCount = 0;
    
    // Track weights for calculations
    let firstLoggedWeight: number | null = null;
    let finalWeight: number | null = null;
    let minPulse = 200;
    let maxPulse = 0;
    let pulseSum = 0;
    let pulseCount = 0;

    // Daily averages
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

    // "Вес на старте": the first logged measurement wins; otherwise fall back to the
    // real initial weight from the user profile (set at registration/onboarding).
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

  // Resolved logs for current day vs graph-selected day
  const todayList = measurementLogs[currentDayIndex] || [];
  const selectedDayList = measurementLogs[selectedGraphDay] || [];
  
  const latestTodayLog = todayList.length > 0 ? todayList[todayList.length - 1] : null;
  const latestSelectedDayLog = selectedDayList.length > 0 ? selectedDayList[selectedDayList.length - 1] : null;

  // Render text-based wellness summary label for today's last measurement
  const getSubjectiveSummaryText = (log: MeasurementLogEntry | null) => {
    if (!log) return "Замеров сегодня ещё не проводилось. Сделайте первый!";
    
    const energyLabel = log.energy === "высокая" ? "высокий заряд бодрости" : log.energy === "спокойная" ? "спокойное ресурсное состояние" : "сниженный тонус";
    const moodLabel = log.mood === "лёгкое" ? "очень лёгкое радостное настроение" : log.mood === "ровное" ? "сбалансированный эмоциональный фон" : "эмоциональное напряжение";
    const wellbeingLabel = log.wellbeing === "хорошее" ? "отличное физическое самочувствие" : log.wellbeing === "среднее" ? "умеренное самочувствие" : "сниженный физический тонус";

    return `Сейчас у вас ${wellbeingLabel}, ${energyLabel} и ${moodLabel}. Отличная база для WFPB принципов.`;
  };

  // Dedicated dynamic Anna whole foods coaching
  const getAnnaMeasurementCoaching = () => {
    const pronouns = userGender === "male" ? "дорогой" : "дорогая";
    const lastLog = latestTodayLog;

    if (!lastLog) {
      return {
        label: "Начнём замеры?",
        bgStyle: "bg-[#FFF1F2] border-[#FDA4AF] text-[#881337]",
        text: `Привет, ${userName}! Твой дневник замеров сегодня пока пуст. Замеры помогают увидеть, как бережные растительные рецепты без соли снижают отёчность и гармонизируют пульс. Сделай первый замер за сегодня — это займёт ровно 4 секунды! 🌸`
      };
    }

    const { energy, wellbeing, pulse, weight } = lastLog;

    // Check if pulse is optimal
    const hasPulse = pulse !== null;
    const isCalmPulse = hasPulse && pulse <= 72;
    const isFastPulse = hasPulse && pulse > 82;

    // Analyze sodium-free plant based effect
    if (wellbeing === "плохое" || energy === "сниженная") {
      return {
        label: "Бережная перезагрузка",
        bgStyle: "bg-amber-50/90 border-[#FBBF24] text-[#78350F]",
        text: `Чувствую твою усталость, ${userName}. Если тонус снижен, не переживай. На растительном рационе (WFPB) без соли почки максимально быстро снимают токсическую задержку воды, что высвобождает ресурсы сердца. Выпей стакан тёплой чистой воды прямо сейчас и сделай 5 глубоких вдохов. Твоё тело перестраивается на чистый вид энергии. 🌿`
      };
    }

    if (isFastPulse) {
      return {
        label: "Внимание к пульсу",
        bgStyle: "bg-red-50/90 border-red-200 text-red-950",
        text: `Заметила повышенный пульс (${pulse} уд/мин), ${userName}. На чистом растительном питании без добавления поваренной соли тонус сосудов расслабляется сам собой за 3-5 дней. Проверь, не закралась ли соль в готовые соусы или консервы — хлорид натрия мгновенно задерживает воду, сужает капилляры и повышает нагрузку на миокард. Всё наладится! ❤️`
      };
    }

    if (wellbeing === "хорошее" && isCalmPulse) {
      return {
        label: "Великолепный баланс",
        bgStyle: "bg-emerald-50/90 border-emerald-200 text-emerald-950",
        text: `Потрясающий профиль, ${userName}! Твой пульс спокойный (${pulse || 65} уд/мин), а самочувствие великолепно. Сердце работает в оптимальном, мягком режиме. Отсутствие соли полностью разгрузило сосудистое русло, а чистые цельные растительные углеводы плавно питают митохондрии. Твоё состояние — эталон долголетия! 🌟`
      };
    }

    if (stats.weightLoss > 1.5) {
      return {
        label: "Эффект очищения",
        bgStyle: "bg-indigo-50/90 border-indigo-200 text-indigo-950",
        text: `Поразительно! За время курса твой вес зафиксировал уменьшение отёков на -${stats.weightLoss} кг. Это не просто жировая ткань, это ушедшая лишняя межклеточная жидкость, которую раньше мертвой хваткой удерживала соль в организме. Дышать стало легче, а суставы скажут спасибо! Настоящий триумф WFPB питания! 🚀`
      };
    }

    return {
      label: "Равномерный темп",
      bgStyle: "bg-violet-50/90 border-violet-200 text-slate-800",
      text: `Замечательная динамика, ${userName}! Твои параметры сна, движения и питания отлично укладываются в ритм. Без резких скачков веса и давления организм находится в глубоком режиме самовосстановления. Помни, каждый замер создаёт наглядную карту твоего преображения! ☀️`
    };
  };

  const annaAdvice = getAnnaMeasurementCoaching();

  // Draw 28-day column charts based on selected metric
  const renderChartBar = (dayNum: number, idx: number) => {
    const list = measurementLogs[dayNum] || [];
    const active = dayNum === selectedGraphDay;
    const isFuture = dayNum > currentDayIndex;

    let heightPct = 6; // default fallback minimal block
    let valueString = "—";
    let barBg = "bg-slate-100 border border-slate-200";

    if (list.length > 0) {
      // Find representative state of the day (average or latest)
      if (activeChartMetric === "wellbeing") {
        // Map: хорошее=100%, среднее=60%, плохое=20%
        const scoreSum = list.reduce((sum, e) => {
          if (e.wellbeing === "хорошее") return sum + 100;
          if (e.wellbeing === "среднее") return sum + 60;
          return sum + 20;
        }, 0);
        heightPct = Math.round(scoreSum / list.length);
        valueString = heightPct >= 80 ? "Хор" : heightPct >= 50 ? "Срд" : "Плх";
        barBg = heightPct >= 80 
          ? "bg-gradient-to-t from-[#FDA4AF] to-[#F43F5E]" 
          : heightPct >= 50 ? "bg-gradient-to-t from-pink-300 to-rose-350" : "bg-gradient-to-t from-slate-350 to-slate-450";
      } else if (activeChartMetric === "energy") {
        // Map: высокая=100%, спокойная=75%, сниженная=30%
        const scoreSum = list.reduce((sum, e) => {
          if (e.energy === "высокая") return sum + 100;
          if (e.energy === "спокойная") return sum + 75;
          return sum + 30;
        }, 0);
        heightPct = Math.round(scoreSum / list.length);
        valueString = heightPct >= 80 ? "Выс" : heightPct >= 50 ? "Спк" : "Снж";
        barBg = "bg-gradient-to-t from-amber-400 to-amber-500";
      } else if (activeChartMetric === "pulse") {
        // Map pulse between 50 bpm & 110 bpm
        const validPulses = list.filter(e => e.pulse !== null) as { pulse: number }[];
        if (validPulses.length > 0) {
          const avgP = validPulses.reduce((sum, e) => sum + e.pulse, 0) / validPulses.length;
          // map 50-100 to 15-100%
          heightPct = Math.min(100, Math.max(15, Math.round(((avgP - 50) / 50) * 100)));
          valueString = `${Math.round(avgP)}`;
          barBg = avgP <= 72 ? "bg-gradient-to-t from-emerald-450 via-teal-400 to-emerald-500" : "bg-gradient-to-t from-rose-400 to-rose-500";
        }
      } else if (activeChartMetric === "weight") {
        // Map weight around user Gender averages
        const validWeights = list.filter(e => e.weight !== null) as { weight: number }[];
        if (validWeights.length > 0) {
          const avgW = validWeights[validWeights.length - 1].weight; // show latest weight of that day
          // Map variance around some baseline index
          const baseOfScale = userGender === "female" ? 50 : 68;
          heightPct = Math.min(100, Math.max(20, Math.round(((avgW - baseOfScale) / 30) * 100)));
          valueString = `${avgW}`;
          barBg = "bg-gradient-to-t from-indigo-505 via-purple-400 to-sky-400";
        }
      }
    }

    return (
      <button
        key={dayNum}
        type="button"
        disabled={isFuture}
        onClick={() => setSelectedGraphDay(dayNum)}
        className="flex-1 flex flex-col items-center h-full group focus:outline-none cursor-pointer"
      >
        <div className="w-full h-full flex items-end relative rounded-full overflow-hidden bg-slate-50/50">
          <motion.div 
            initial={{ height: "0%" }}
            animate={{ height: `${heightPct}%` }}
            transition={{ duration: 0.4 }}
            className={`w-full rounded-full transition-all duration-300 ${barBg} ${
              active ? "ring-2 ring-rose-500 ring-offset-1 brightness-105" : "group-hover:opacity-90"
            }`}
          />
        </div>
        <span className={`text-[8.5px] mt-1.5 font-mono font-bold leading-none ${
          active ? "text-rose-600 font-black scale-110" : "text-slate-400"
        }`}>
          {dayNum}
        </span>
      </button>
    );
  };

  return (
    <div className="w-full flex flex-col justify-between relative bg-[#FAF9FD]" id="measurements-analytics-screen">
      
      {/* Scrollable container */}
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
            <span className="text-[18px] font-black text-slate-800" style={{ fontFamily: '"Calibri", sans-serif' }}>Замеры & Тонус</span>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-100 animate-pulse" />
          </div>
        </div>

        {/* 1. UPPER PART: TODAY'S CURRENT STATE */}
        <div className="bg-white rounded-[32px] border border-gray-100/90 p-4.5 shadow-[0_5px_15px_-3px_rgba(43,49,55,0.02)] flex flex-col gap-4 text-left mb-5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-black text-rose-600 tracking-wider uppercase block mb-0.5">СОСТОЯНИЕ НА СЕГОДНЯ</span>
              <h2 className="text-[20px] font-black text-slate-800" style={{ fontFamily: '"Calibri", sans-serif' }}>Текущий замер</h2>
            </div>
            <div className="bg-gradient-to-tr from-rose-50 to-pink-50 text-rose-800 px-3 py-1 rounded-2xl text-[12px] font-bold border border-rose-250/30">
              {todayList.length} замер{todayList.length === 1 ? "" : todayList.length > 1 && todayList.length < 5 ? "а" : "ов"} сегодня
            </div>
          </div>

          {/* If there's at least one measurement today, render stats */}
          {latestTodayLog ? (
            <div className="flex flex-col gap-3">
              
              {/* Dynamic summary text box */}
              <div className="text-[13px] leading-relaxed text-slate-600 bg-rose-50/20 rounded-2xl p-3 border border-rose-100/30 font-semibold">
                ✨ {getSubjectiveSummaryText(latestTodayLog)}
              </div>

              {/* Grid of parameters */}
              <div className="grid grid-cols-3 gap-2 mt-0.5">
                {/* Wellbeing */}
                <div className="bg-[#FAF9FD] rounded-2xl p-2.5 border border-slate-100 flex flex-col items-center text-center">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Самочувствие</span>
                  <span className="text-[20px] my-1 select-none">
                    {latestTodayLog.wellbeing === "хорошее" ? "🌟" : latestTodayLog.wellbeing === "среднее" ? "⚡" : "❤️‍🩹"}
                  </span>
                  <span className="text-[12px] font-black text-slate-700 capitalize">
                    {latestTodayLog.wellbeing || "—"}
                  </span>
                </div>

                {/* Energy */}
                <div className="bg-[#FAF9FD] rounded-2xl p-2.5 border border-slate-100 flex flex-col items-center text-center">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Энергия</span>
                  <span className="text-[20px] my-1 select-none">
                    {latestTodayLog.energy === "высокая" ? "⚡" : latestTodayLog.energy === "спокойная" ? "🍃" : "💤"}
                  </span>
                  <span className="text-[12px] font-black text-slate-700 capitalize">
                    {latestTodayLog.energy || "—"}
                  </span>
                </div>

                {/* Mood */}
                <div className="bg-[#FAF9FD] rounded-2xl p-2.5 border border-slate-100 flex flex-col items-center text-center">
                  <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wide">Настроение</span>
                  <span className="text-[20px] my-1 select-none">
                    {latestTodayLog.mood === "лёгкое" ? "✨" : latestTodayLog.mood === "ровное" ? "☀️" : "🌧️"}
                  </span>
                  <span className="text-[12px] font-black text-slate-700 capitalize">
                    {latestTodayLog.mood || "—"}
                  </span>
                </div>
              </div>

              {/* Physical objective numbers panel layout */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50/60 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-600 text-sm">❤️</div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase">Пульс (ЧСС)</span>
                    <span className="text-[14px] font-black text-slate-800 font-mono">
                      {latestTodayLog.pulse ? `${latestTodayLog.pulse} уд/мин` : "Не указан"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 px-1 border-l border-slate-250/40">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 text-sm">⚖️</div>
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase">Текущий вес</span>
                    <span className="text-[14px] font-black text-slate-800 font-mono">
                      {latestTodayLog.weight ? `${latestTodayLog.weight} кг` : "Не указан"}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="py-6 text-center flex flex-col items-center justify-center">
              <span className="text-3xl filter saturate-75 mb-2">📊</span>
              <p className="text-[14px] text-slate-400 font-semibold italic">Замеров сегодня ещё не проводилось.</p>
              <p className="text-[11px] text-slate-400 mt-1">Обычный клик по кнопке «Замеры» позволит мгновенно записать состояние!</p>
            </div>
          )}
        </div>

        {todayList.length > 0 && !noteSavedOrSkipped && (
          <BriefNoteBlock
            moduleKey="measurements"
            onSave={handleSaveMeasurementsNote}
            onSkip={() => setNoteSavedOrSkipped(true)}
          />
        )}

        {/* 2. MIDDLE PART: ANNA'S MOTIVATIONAL ADVICE BOX */}
        <div className={`rounded-[28px] p-4 text-left flex flex-col gap-3 transition-all duration-500 relative z-10 mb-5 ${annaAdvice.bgStyle}`} id="anna-measurements-advice-box">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-rose-100/60 shadow-md">
                  <img 
                    src={annaAvatarSrc}
                    alt="Анна советует" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-rose-600 border border-white flex items-center justify-center text-[9px]">
                  🩺
                </div>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[15px] font-black text-slate-900 leading-none">Анна</span>
                <span className="text-[11px] font-bold text-text-muted mt-0.5 leading-none">Советник WFPB</span>
                <span className="text-[10px] font-extrabold px-2.2 py-0.5 rounded-full inline-block mt-1 tracking-wider uppercase bg-white/70 shadow-xs border border-rose-100 self-start text-rose-800">
                  {annaAdvice.label}
                </span>
              </div>
            </div>
            
            <Sparkles className="w-5 h-5 text-rose-500 animate-pulse" />
          </div>

          <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-2xl text-[13.5px] leading-relaxed font-semibold text-slate-800">
            {annaAdvice.text}
          </div>
        </div>

        {/* 3. LOWER PART: LONG TERM 28-DAY AGGREGATE TELEMETRY */}
        <div className="bg-white rounded-[32px] border border-gray-100 p-4 shadow-[0_4px_16px_rgba(0,0,0,0.02)] text-left flex flex-col gap-3 mb-5">
          <div className="flex justify-between items-baseline px-1">
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-black text-rose-600 tracking-wide uppercase">СТАТИСТИКА КУРСА</span>
              <span className="text-[16px] font-black text-slate-800">Динамика организма 28 дней</span>
            </div>
            
            <div className="text-[11px] text-slate-500 font-bold bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-100">
              Выбран День: <span className="text-rose-600 font-mono font-black">{selectedGraphDay}</span>
            </div>
          </div>

          {/* Metric selector pill bar */}
          <div className="flex gap-1.5 bg-[#FAF9FD] p-1 rounded-2xl border border-slate-100">
            {[
              { id: "wellbeing", label: "Тонус" },
              { id: "energy", label: "Энергия" },
              { id: "pulse", label: "Пульс" },
              { id: "weight", label: "Вес" }
            ].map(tab => {
              const isActive = activeChartMetric === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveChartMetric(tab.id as any)}
                  className={`flex-1 py-1.5 rounded-xl text-[10.5px] font-extrabold tracking-tight transition-all cursor-pointer ${
                    isActive 
                      ? "bg-gradient-to-r from-rose-450 to-pink-500 text-white shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-850"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative pt-6 pb-2 px-1">
            {/* Guide markers background lines */}
            <div className="absolute top-[35%] left-0 right-0 border-t border-dashed border-rose-100 flex justify-end z-0">
              <span className="text-[7.5px] text-slate-400 bg-white px-1 -mt-1 font-mono">Стабильный фон</span>
            </div>

            <div className="flex justify-between items-end gap-[4px] h-32 relative z-10">
              {Array.from({ length: 28 }).map((_, idx) => renderChartBar(idx + 1, idx))}
            </div>
          </div>

          {/* Selected day list inspection block */}
          <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 flex flex-col gap-2 relative mt-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[11.5px] font-bold text-slate-500 uppercase tracking-wider block">
                История замеров • День {selectedGraphDay}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                Записей: {selectedDayList.length}
              </span>
            </div>

            {selectedDayList.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-h-[145px] overflow-y-auto scrollbar-none">
                {selectedDayList.map((entry, index) => (
                  <div 
                    key={entry.id || index}
                    className="bg-white rounded-xl p-2.5 border border-slate-100/90 flex flex-col gap-2 shadow-xs text-left"
                  >
                    <div className="flex justify-between items-center text-[12.5px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold font-mono text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-lg border border-indigo-100/30">
                          ⏱ {entry.timeString}
                        </span>
                        {entry.wellbeing && (
                          <span className="text-[11.5px] font-extrabold text-slate-700">
                            {entry.wellbeing === "хорошее" ? "🌟 Чудесно" : entry.wellbeing === "среднее" ? "⚡ Нормально" : "❤️‍🩹 Усталость"}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {entry.pulse && (
                          <span className="text-[11px] font-mono font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100/30">
                            ❤️ {entry.pulse}
                          </span>
                        )}
                        {entry.weight && (
                          <span className="text-[11px] font-mono font-black text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md border border-violet-100/30">
                            ⚖️ {entry.weight}кг
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 text-[10.5px] font-bold text-slate-500">
                      <span>Энергия: <b className="text-slate-700 font-extrabold">{entry.energy || "—"}</b></span>
                      <span>•</span>
                      <span>Настроение: <b className="text-slate-700 font-extrabold">{entry.mood || "—"}</b></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-400 font-medium italic mt-0.5">
                {selectedGraphDay > currentDayIndex ? "Данные из будущего скрыты" : "Замеры в этот день отсутствуют"}
              </p>
            )}
          </div>
        </div>

        {/* 4. STATISTICS MATRIX BENTO GRIDS */}
        <div className="grid grid-cols-2 gap-3.5 mb-6 text-left">
          
          {/* Average Pulse */}
          <div className="bg-white rounded-[24px] p-3.5 border border-gray-100/90 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">СРЕДНИЙ ПУЛЬС</span>
              <p className="text-[19px] font-black text-slate-800 mt-1 font-mono">
                {stats.avgPulse} <span className="text-xs font-bold text-slate-500">уд/мин</span>
              </p>
            </div>
            <span className="text-[11px] font-bold text-emerald-600 mt-2 block">
              Норма покоя: 55-75
            </span>
          </div>

          {/* High Energy Ratio Percent */}
          <div className="bg-white rounded-[24px] p-3.5 border border-gray-100/90 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">РЕСУРСНЫЕ ДНИ</span>
              <p className="text-[19px] font-black text-slate-800 mt-1 font-mono">
                {stats.highEnergyPercent}% <span className="text-xs font-bold text-slate-500">дней</span>
              </p>
            </div>
            <span className="text-[11px] font-bold text-indigo-500 mt-2 block">
              Энергия высокая/спокойная
            </span>
          </div>

          {/* WFPB Weight aggregate loss wellness achievement */}
          <div className="bg-white rounded-[24px] p-3.5 border border-rose-100 bg-gradient-to-r from-rose-50/20 to-white/90 shadow-sm flex flex-col justify-between col-span-2">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">ИЗМЕНЕНИЕ ВЕСА ЗА КУРС</span>
                <p className="text-[24px] font-black text-rose-955 mt-0.5" style={{ fontFamily: '"Calibri", sans-serif' }}>
                  -{stats.weightLoss} кг
                </p>
              </div>
              <div className="w-[50px] h-[50px] rounded-2xl bg-rose-50 border border-rose-100/60 flex items-center justify-center text-rose-500 text-[24px] shrink-0">
                ☘️
              </div>
            </div>
            <div className="border-t border-slate-100 mt-2.5 pt-2 flex justify-between text-[11px] font-bold text-slate-500">
              <span>Вес на старте: <b className="text-slate-800 font-extrabold">{stats.initialWeight} кг</b></span>
              <span>•</span>
              <span>Сейчас: <b className="text-slate-800 font-extrabold">{stats.currentWeight} кг</b></span>
            </div>
          </div>
        </div>

      </div>

      {/* Symmetrical Bottom Navigation menu context selection */}
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
