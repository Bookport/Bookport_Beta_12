import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import { formatTimeHM } from "../../shared/dates";
import { getUserTimeZone } from "../../shared/timeZoneStore";

// Базовые 3D-ассеты циркадных станций
import imgSleepStar from "../../assets/images/SOST/balance/1.webp"; // Месяц со спящей звездочкой
import imgWater from "../../assets/images/SOST/balance/2.webp";
import imgBreakfast from "../../assets/images/SOST/balance/3.webp";
import imgMovement from "../../assets/images/SOST/balance/4.webp";
import imgLunch from "../../assets/images/SOST/balance/6.webp";
import imgBiometrics from "../../assets/images/SOST/balance/13.webp";
import imgDinner from "../../assets/images/SOST/balance/16.webp";
import imgTimelineSpine from "../../assets/images/SOST/balance/23.webp";
import imgPhaseSun from "../../assets/images/SOST/balance/24.webp";

// 3D-миниатюры качества пробуждения из модуля Сна
import imgSleepGood from "../../assets/images/slipping/9.webp";
import imgSleepAverage from "../../assets/images/slipping/17.webp";
import imgSleepPoor from "../../assets/images/slipping/18.webp";

// 3D-миниатюры состояний из модуля Замеров
import stateEnergyHigh from "../../assets/images/measurements/state_energy_high.webp";
import stateEnergyNormal from "../../assets/images/measurements/state_energy_normal.webp";
import stateEnergyLow from "../../assets/images/measurements/state_energy_low.webp";
import stateMoodGood from "../../assets/images/measurements/state_mood_good.webp";
import stateMoodNormal from "../../assets/images/measurements/state_mood_normal.webp";
import stateMoodBad from "../../assets/images/measurements/state_mood_bad.webp";
import stateWellbeingExcellent from "../../assets/images/measurements/state_wellbeing_excellent.webp";
import stateWellbeingNormal from "../../assets/images/measurements/state_wellbeing_normal.webp";
import stateWellbeingPoor from "../../assets/images/measurements/state_wellbeing_poor.webp";

const ENERGY_STATES = [
  { id: "high", label: "Высокая", img: stateEnergyHigh },
  { id: "normal", label: "Спокойная", img: stateEnergyNormal },
  { id: "low", label: "Сниженная", img: stateEnergyLow },
];

const MOOD_STATES = [
  { id: "good", label: "Лёгкое", img: stateMoodGood },
  { id: "normal", label: "Ровное", img: stateMoodNormal },
  { id: "bad", label: "Тяжёлое", img: stateMoodBad },
];

const WELLBEING_STATES = [
  { id: "excellent", label: "Хорошее", img: stateWellbeingExcellent },
  { id: "normal", label: "Среднее", img: stateWellbeingNormal },
  { id: "poor", label: "Плохое", img: stateWellbeingPoor },
];

const getPluralRus = (n: number, one: string, few: string, many: string): string => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
};

// Дедупликация блюд по нормализованному названию
const dedupeMealLogs = (logs: any[]): any[] => {
  if (!logs || logs.length === 0) return [];
  const seen = new Set<string>();
  const result: any[] = [];
  for (const item of logs) {
    const key = (item.name || "").toLowerCase().trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

interface DynamicsTabProps {
  key?: any;
  sleep?: any;
  wakeTime?: string | null;
  bedtime?: string | null;
  sleepQuality?: "good" | "fair" | "poor" | null;
  sleepLogs?: any[];
  water?: any;
  waterTarget?: number;
  todayWaterEntries?: any[];
  breakfastLogs?: any[];
  lunchLogs?: any[];
  dinnerLogs?: any[];
  ratingEnergy?: number;
  ratingWellbeing?: number;
  ratingLightness?: number;
  wellbeingLog?: any[];
  energyLog?: any[];
  lightnessLog?: any[];
  habitsDone?: number;
  habitsTarget?: number;
  cookedBookDishes?: any[];
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
  currentDayIndex?: number;
  savedDishes?: any[];
  activityLogs?: any[];
  latestMeas?: any;
  dayMeasurements?: any[];
  effWeight?: number;
  effSystolic?: number;
  effDiastolic?: number;
  effPulse?: number;
}

export default function DynamicsTab({
  sleep = 0,
  wakeTime,
  bedtime,
  sleepQuality,
  water = 0,
  waterTarget = 2385,
  todayWaterEntries = [],
  breakfastLogs = [],
  lunchLogs = [],
  dinnerLogs = [],
  activityLogs = [],
  latestMeas,
  dayMeasurements = [],
  effWeight,
  effSystolic,
  effDiastolic,
  effPulse,
  annaAnalysisText,
  recommendedAction,
}: DynamicsTabProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const timeString = `${String(currentHour).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;

  const phaseOfDay = (() => {
    if (currentHour >= 6 && currentHour < 12) return "ПРОБУЖДЕНИЕ И ГИДРАТАЦИЯ";
    if (currentHour >= 12 && currentHour < 16) return "ПИК ОРГАНИЗМА";
    if (currentHour >= 16 && currentHour < 21) return "СНИЖЕНИЕ АКТИВНОСТИ";
    return "ВОССТАНОВЛЕНИЕ И ДЕТОКС";
  })();

  const parseTimeToMin = (t?: string): number | null => {
    if (!t || !t.includes(":")) return null;
    const parts = t.split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };

  const totalActivityMin = (activityLogs || []).reduce((acc: number, log: any) => {
    const dur = log.durationMin ?? Math.round((log.durationSeconds || log.duration || 0) / 60);
    return acc + dur;
  }, 0);

  const waterTimeRange = (() => {
    if (!todayWaterEntries || todayWaterEntries.length === 0) return "08:00 – 21:00";
    const times = todayWaterEntries.map((e: any) => e.time).filter(Boolean);
    if (times.length === 0) return "08:00 – 21:00";
    if (times.length === 1) return times[0];
    return `${times[0]} – ${times[times.length - 1]}`;
  })();

  const movementTimeRange = (() => {
    if (!activityLogs || activityLogs.length === 0) return "09:00 – 18:00";
    const times = activityLogs.map((a: any) => a.timeString).filter(Boolean);
    if (times.length === 0) return "09:00 – 18:00";
    if (times.length === 1) return times[0];
    return `${times[0]} – ${times[times.length - 1]}`;
  })();

  const cleanBreakfastLogs = dedupeMealLogs(breakfastLogs);
  const cleanLunchLogs = dedupeMealLogs(lunchLogs);
  const cleanDinnerLogs = dedupeMealLogs(dinnerLogs);

  const hasSleepRecorded = typeof sleep === "number" && sleep > 0;
  const hasWaterRecorded = typeof water === "number" && water > 0;
  const hasBiometricsRecorded = Boolean(latestMeas || (effSystolic && effDiastolic) || dayMeasurements.length > 0);
  const hasBreakfastRecorded = cleanBreakfastLogs.length > 0;
  const hasMovementRecorded = totalActivityMin > 0;
  const hasLunchRecorded = cleanLunchLogs.length > 0;
  const hasDinnerRecorded = cleanDinnerLogs.length > 0;
  
  // Вечерняя станция активна только после 20:00 при наличии зафиксированного отбоя
  const hasBedtimeRecorded = Boolean(bedtime && currentHour >= 20);

  // Динамическая миниатюра пробуждения на станции 1
  const wakeupStationImg = (() => {
    if (sleepQuality === "good") return imgSleepGood;
    if (sleepQuality === "fair") return imgSleepAverage;
    if (sleepQuality === "poor") return imgSleepPoor;
    return imgSleepStar;
  })();

  const getMeasTimeStr = (m: any): string => {
    if (!m) return "";
    if (m.timeString) return m.timeString;
    if (m.time) return m.time;
    if (m.timestamp) {
      try {
        return formatTimeHM(new Date(m.timestamp).toISOString(), getUserTimeZone());
      } catch {
        return "";
      }
    }
    return "";
  };

  const parseTriadStates = (tonus?: string) => {
    if (!tonus || typeof tonus !== "string") {
      return {
        energy: ENERGY_STATES[1],
        mood: MOOD_STATES[0],
        wellbeing: WELLBEING_STATES[1],
      };
    }
    const parts = tonus.split("|").map((s) => s.trim().toLowerCase());
    const eText = parts[0] || "";
    const mText = parts[1] || "";
    const wText = parts[2] || "";

    const energy = ENERGY_STATES.find((s) => s.label.toLowerCase() === eText || s.id === eText) || ENERGY_STATES[1];
    const mood = MOOD_STATES.find((s) => s.label.toLowerCase() === mText || s.id === mText) || MOOD_STATES[0];
    const wellbeing = WELLBEING_STATES.find((s) => s.label.toLowerCase() === wText || s.id === wText) || WELLBEING_STATES[1];

    return { energy, mood, wellbeing };
  };

  const normalizedMeasurements: any[] = (() => {
    if (dayMeasurements && dayMeasurements.length > 0) {
      return dayMeasurements;
    }
    if (hasBiometricsRecorded) {
      return [
        {
          id: latestMeas?.id || "meas-1",
          timeString: getMeasTimeStr(latestMeas) || "08:00",
          systolic: effSystolic,
          diastolic: effDiastolic,
          pulse: effPulse,
          weight: effWeight,
          tonus: latestMeas?.tonus,
        },
      ];
    }
    return [];
  })();

  const biometricsTimeDisplay = (() => {
    if (!hasBiometricsRecorded) return "07:30 – 09:00";
    if (normalizedMeasurements.length > 1) {
      const firstTime = getMeasTimeStr(normalizedMeasurements[0]);
      const lastTime = getMeasTimeStr(normalizedMeasurements[normalizedMeasurements.length - 1]);
      if (firstTime && lastTime && firstTime !== lastTime) return `${firstTime} – ${lastTime}`;
      return lastTime || firstTime || "08:00";
    }
    return getMeasTimeStr(normalizedMeasurements[0]) || "08:00";
  })();

  const biometricsBadge = (() => {
    if (!hasBiometricsRecorded) return null;
    const count = normalizedMeasurements.length;
    const countText = count > 1 ? ` • ${count} ${getPluralRus(count, "замер", "замера", "замеров")}` : "";
    return {
      inWindow: true,
      badge: `Система${countText}`,
    };
  })();

  const getMealTimeDisplay = (logs: any[], defaultPlanWindow: string) => {
    if (!logs || logs.length === 0) return defaultPlanWindow;
    const times = logs.map((d: any) => d.time).filter(Boolean);
    if (times.length === 0) return defaultPlanWindow;
    if (times.length > 1 && times[0] !== times[times.length - 1]) {
      return `${times[0]} – ${times[times.length - 1]}`;
    }
    return times[0];
  };

  const actualBreakfastTime = cleanBreakfastLogs[0]?.time;
  const actualLunchTime = cleanLunchLogs[0]?.time;
  const actualDinnerTime = cleanDinnerLogs[0]?.time;

  const breakfastWindowStatus = (() => {
    if (!hasBreakfastRecorded || !actualBreakfastTime) return null;
    const min = parseTimeToMin(actualBreakfastTime);
    if (min === null) return { inWindow: true, badge: "Зафиксирован Системой" };
    if (min <= 690) return { inWindow: true, badge: "окно" };
    const diffHours = ((min - 690) / 60).toFixed(1).replace(/\.0$/, "");
    return { inWindow: false, badge: `Сдвиг +${diffHours}ч` };
  })();

  const lunchWindowStatus = (() => {
    if (!hasLunchRecorded || !actualLunchTime) return null;
    const min = parseTimeToMin(actualLunchTime);
    if (min === null) return { inWindow: true, badge: "Зафиксирован Системой" };
    if (min >= 720 && min <= 930) return { inWindow: true, badge: "В циркадном окне" };
    if (min < 720) return { inWindow: false, badge: "Ранний обед" };
    const diffHours = ((min - 900) / 60).toFixed(1).replace(/\.0$/, "");
    return { inWindow: false, badge: `Сдвиг +${diffHours}ч` };
  })();

  const dinnerWindowStatus = (() => {
    if (!hasDinnerRecorded || !actualDinnerTime) return null;
    const min = parseTimeToMin(actualDinnerTime);
    if (min === null) return { inWindow: true, badge: "Зафиксирован Системой" };
    if (min >= 1050 && min <= 1230) return { inWindow: true, badge: "В циркадном окне" };
    if (min < 1050) return { inWindow: false, badge: "Ранний ужин" };
    const diffHours = ((min - 1200) / 60).toFixed(1).replace(/\.0$/, "");
    return { inWindow: false, badge: `Поздний ужин (+${diffHours}ч)` };
  })();

  const activeStationId = (() => {
    if (!hasBiometricsRecorded && currentHour >= 7 && currentHour < 10) return "biometrics";
    if (!hasBreakfastRecorded && currentHour < 12) return "breakfast";
    if (!hasLunchRecorded && currentHour >= 12 && currentHour < 17) return "lunch";
    if (!hasDinnerRecorded && currentHour >= 17 && currentHour < 21) return "dinner";
    if (currentHour >= 21 || (!hasBedtimeRecorded && currentHour >= 20)) return "evening";
    if (!hasWaterRecorded && currentHour < 10) return "water";
    return "";
  })();

  // Построение компактных чипсов без распирания по ширине
  const buildMealChips = (logs: any[], prefix: string) => {
    if (!logs || logs.length === 0) return null;
    return logs.map((d: any, idx: number) => {
      let ingText = "";
      if (Array.isArray(d.ingredients) && d.ingredients.length > 0) {
        const names = d.ingredients
          .map((i: any) => (typeof i === "string" ? i : i?.name))
          .filter(Boolean)
          .slice(0, 2);
        if (names.length > 0) ingText = ` (${names.join(", ")})`;
      }
      const timePrefix = d.time ? `${d.time} • ` : "";
      const rawName = d.name || "Блюдо";
      const shortName = rawName.length > 20 ? `${rawName.slice(0, 18)}…` : rawName;
      return {
        id: `${prefix}-${idx}`,
        text: `${timePrefix}${shortName}${ingText}`,
      };
    });
  };

  const stations = [
    {
      id: "wakeup",
      title: "Подъём и нейростарт",
      timeDisplay: hasSleepRecorded ? (wakeTime || "07:00") : "07:00",
      isPlan: !hasSleepRecorded,
      subtitle: hasSleepRecorded
        ? `Восстановительный сон: ${(sleep / 60).toFixed(1)} ч`
        : "Данные о ночном сне пока не зафиксированы Системой",
      windowBadge: null,
      img: wakeupStationImg,
      bg: "bg-[#F6F7FB]",
      isCompleted: hasSleepRecorded,
      chips: null,
      measurements: null,
    },
    {
      id: "water",
      title: "Водный баланс",
      timeDisplay: waterTimeRange,
      isPlan: !hasWaterRecorded,
      subtitle: `Прогресс: ${water} / ${waterTarget} мл`,
      windowBadge: null,
      img: imgWater,
      bg: "bg-[#F2F8FB]",
      isCompleted: hasWaterRecorded,
      chips: (todayWaterEntries || []).map((e: any, idx: number) => ({
        id: `w-${idx}`,
        text: `${e.time || "—"} • ${e.amount} мл`,
      })),
      measurements: null,
    },
    {
      id: "biometrics",
      title: "Биомаркеры",
      timeDisplay: biometricsTimeDisplay,
      isPlan: !hasBiometricsRecorded,
      subtitle: !hasBiometricsRecorded ? "Ожидание утренней фиксации давления, пульса, веса и самочувствия" : "",
      windowBadge: biometricsBadge,
      img: imgBiometrics,
      bg: "bg-[#FBF8F5]",
      isCompleted: hasBiometricsRecorded,
      chips: null,
      measurements: normalizedMeasurements,
    },
    {
      id: "breakfast",
      title: "Завтрак WFPB",
      timeDisplay: getMealTimeDisplay(cleanBreakfastLogs, "до 11:30"),
      isPlan: !hasBreakfastRecorded,
      inWindow: breakfastWindowStatus?.inWindow,
      subtitle: !hasBreakfastRecorded ? "Приём пищи пока не зафиксирован Системой" : "",
      windowBadge: breakfastWindowStatus,
      img: imgBreakfast,
      bg: "bg-[#F2F9F5]",
      isCompleted: hasBreakfastRecorded,
      chips: buildMealChips(cleanBreakfastLogs, "bf"),
      measurements: null,
    },
    {
      id: "movement",
      title: "Движение",
      timeDisplay: movementTimeRange,
      isPlan: !hasMovementRecorded,
      subtitle: totalActivityMin > 0 ? `${totalActivityMin} мин активности` : "Ожидание активности",
      windowBadge: null,
      img: imgMovement,
      bg: "bg-[#FAF7F2]",
      isCompleted: hasMovementRecorded,
      chips: (activityLogs || []).map((a: any, idx: number) => ({
        id: `a-${idx}`,
        text: `${a.timeString || "—"} • ${a.displayName || "Активность"} ${a.durationMin ?? Math.round((a.durationSeconds || a.duration || 0) / 60)}м`,
      })),
      measurements: null,
    },
    {
      id: "lunch",
      title: "Обед WFPB",
      timeDisplay: getMealTimeDisplay(cleanLunchLogs, "13:00 – 15:00"),
      isPlan: !hasLunchRecorded,
      inWindow: lunchWindowStatus?.inWindow,
      subtitle: !hasLunchRecorded ? "Ожидание дневного приёма пищи" : "",
      windowBadge: lunchWindowStatus,
      img: imgLunch,
      bg: "bg-[#F4FAF6]",
      isCompleted: hasLunchRecorded,
      chips: buildMealChips(cleanLunchLogs, "ln"),
      measurements: null,
    },
    {
      id: "dinner",
      title: "Ужин WFPB",
      timeDisplay: getMealTimeDisplay(cleanDinnerLogs, "18:30 – 20:00"),
      isPlan: !hasDinnerRecorded,
      inWindow: dinnerWindowStatus?.inWindow,
      subtitle: !hasDinnerRecorded ? "Ожидание вечернего приёма пищи" : "",
      windowBadge: dinnerWindowStatus,
      img: imgDinner,
      bg: "bg-[#FDFBF7]",
      isCompleted: hasDinnerRecorded,
      chips: buildMealChips(cleanDinnerLogs, "dn"),
      measurements: null,
    },
    {
      id: "evening",
      title: "Баланс и сон",
      timeDisplay: hasBedtimeRecorded ? (bedtime || "21:30") : "21:30 – 22:30",
      isPlan: !hasBedtimeRecorded,
      subtitle: hasBedtimeRecorded
        ? "Отбой зафиксирован Системой"
        : currentHour >= 21
        ? "Циркадное окно отдыха: снижение освещения и восстановление систем"
        : "Плановое время подготовки ко сну (завершение пищевого окна)",
      windowBadge: null,
      img: imgSleepStar, // Ночной месяц со спящей звездой (1.webp)
      bg: "bg-[#F5F8F7]",
      isCompleted: hasBedtimeRecorded,
      chips: null,
      measurements: null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-3 pb-4 w-full font-sans"
    >
      {/* 0. Карточка советника Анны */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler
          tabId="dynamics"
          tabName="Динамика и биоритмы дня"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}

      {/* 1. Плашка «ТЕКУЩАЯ ФАЗА ДНЯ» */}
      <div className="bg-[#FAF8F3] rounded-2xl border border-white px-3.5 py-[2.5px] shadow-[0_4px_16px_rgba(15,23,42,0.08)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src={imgPhaseSun}
            alt="Фаза дня"
            className="w-9 h-9 object-contain drop-shadow-xs select-none pointer-events-none shrink-0"
          />
          <div>
            <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight block">
              ТЕКУЩАЯ ФАЗА ДНЯ
            </span>
            <span className="text-[10px] font-extrabold text-amber-800/90 tracking-wide uppercase flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              {phaseOfDay}
            </span>
          </div>
        </div>
        <span className="text-[12px] font-mono font-bold tracking-tight text-slate-800 bg-white border border-slate-200/80 px-2.5 py-0.5 rounded-2xl shadow-xs shrink-0">
          {timeString}
        </span>
      </div>

      {/* 2. Заголовок шкалы таймлайна */}
      <div className="pt-1 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={imgTimelineSpine}
              alt="Светофор"
              className="w-4.5 h-4.5 object-contain select-none pointer-events-none shrink-0"
            />
            <h2 className="text-[12px] font-black text-slate-800 tracking-tight uppercase">
              ШКАЛА ТЕКУЩЕГО ДНЯ
            </h2>
          </div>
          <span className="text-[8.5px] font-extrabold text-[#10B981] bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
            АВТОМАТИЧЕСКОЕ ВЕДЕНИЕ
          </span>
        </div>
        <p className="text-[10.5px] text-slate-500 leading-snug mt-1">
          Интегральный ход циркадных ритмов и ключевые отметки ваших действий, влияющие на индекс. Шкала отражает согласованность систем организма.
        </p>
      </div>

      {/* 3. ТАЙМЛАЙН ЦИРКАДНЫХ СТАНЦИЙ */}
      <div className="relative w-full pt-1">
        <div className="absolute left-[15px] top-4 bottom-4 w-[1.5px] bg-slate-200/80 pointer-events-none" />

        <div className="space-y-2.5">
          {stations.map((st) => {
            const isActive = st.id === activeStationId;

            return (
              <div key={st.id} className="relative flex items-start">
                {/* Круглый маркер-лампочка */}
                <div className="w-[30px] flex justify-center shrink-0 pt-2 z-10 select-none">
                  {st.isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>
                  ) : isActive ? (
                    <div className="w-6 h-6 rounded-full bg-sky-50 border-2 border-sky-400 flex items-center justify-center shadow-xs animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-sky-500" />
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                    </div>
                  )}
                </div>

                {/* Карточка станции с компактным вертикальным отступом py-[2.5px] */}
                <div
                  className={`flex-1 min-w-0 ml-2.5 rounded-2xl px-3.5 py-[2.5px] border transition-all duration-200 ${st.bg} ${
                    isActive
                      ? "border-sky-300 shadow-[0_4px_16px_rgba(56,189,248,0.18)] -translate-y-0.5"
                      : "border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
                  }`}
                >
                  {/* Верхняя строка: Заголовок + бейдж окна слева, Время + Иконка справа */}
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 shrink">
                      <h3 className="text-[14px] font-black text-slate-800 tracking-tight leading-snug truncate">
                        {st.title}
                      </h3>
                      {st.windowBadge && (
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-bold rounded-md px-1.5 py-0.5 shrink-0 ${
                            st.windowBadge.inWindow
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-amber-50 text-amber-800 border border-amber-200/60"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              st.windowBadge.inWindow ? "bg-emerald-500" : "bg-amber-500"
                            }`}
                          />
                          <span className="truncate max-w-[120px]">{st.windowBadge.badge}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[11px] font-bold rounded-full px-2 py-0.5 shadow-xs font-mono whitespace-nowrap flex items-center gap-1 ${
                          st.isPlan
                            ? "text-slate-500 bg-white/75 border border-slate-200/60"
                            : "text-slate-700 bg-white border border-slate-200/90"
                        }`}
                      >
                        {st.timeDisplay}
                        {!st.isPlan && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              st.inWindow === false ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                        )}
                      </span>

                      <img
                        src={st.img}
                        alt={st.title}
                        className="w-8 h-8 object-contain select-none pointer-events-none drop-shadow-xs shrink-0"
                      />
                    </div>
                  </div>

                  {/* Подзаголовок (если есть) */}
                  {st.subtitle ? (
                    <p className="text-[11.5px] text-slate-600 font-medium leading-snug mt-0.5">
                      {st.subtitle}
                    </p>
                  ) : null}

                  {/* Блок замеров «Биомаркеры» */}
                  {st.id === "biometrics" && st.measurements && st.measurements.length > 0 && (
                    <div className="space-y-2 mt-1.5">
                      {st.measurements.map((m: any, idx: number) => {
                        const triad = parseTriadStates(m.tonus);
                        const mTime = getMeasTimeStr(m) || "—";
                        return (
                          <div key={m.id || `meas-${idx}`} className="space-y-1">
                            {/* Строка чипсов: метрики слева + время справа */}
                            <div className="flex items-center justify-between gap-1 w-full">
                              <div className="flex items-center gap-1 shrink min-w-0">
                                {m.systolic && m.diastolic ? (
                                  <span className="bg-white border border-slate-200/90 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-700 font-mono shadow-xs whitespace-nowrap">
                                    АД {m.systolic}/{m.diastolic}
                                  </span>
                                ) : null}
                                {m.pulse ? (
                                  <span className="bg-white border border-slate-200/90 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-700 font-mono shadow-xs whitespace-nowrap">
                                    ЧСС {m.pulse}
                                  </span>
                                ) : null}
                                {m.weight ? (
                                  <span className="bg-white border border-slate-200/90 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-700 font-mono shadow-xs whitespace-nowrap">
                                    {m.weight} кг
                                  </span>
                                ) : null}
                              </div>

                              <span className="text-[10px] font-bold font-mono text-slate-600 bg-white border border-slate-200/90 rounded-full px-2 py-0.5 shrink-0 whitespace-nowrap flex items-center gap-1 shadow-xs ml-auto">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                {mTime}
                              </span>
                            </div>

                            {/* Парящие плашки триады */}
                            <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                              <div className="flex flex-col items-center justify-center py-1 px-1 rounded-xl bg-white border border-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                                <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 leading-none">
                                  Энергия
                                </span>
                                <img
                                  src={triad.energy.img}
                                  alt={triad.energy.label}
                                  className="w-6 h-6 object-contain my-0.5 drop-shadow-xs select-none pointer-events-none"
                                />
                                <span className="text-[9.5px] font-extrabold text-slate-700 leading-none truncate max-w-full">
                                  {triad.energy.label}
                                </span>
                              </div>

                              <div className="flex flex-col items-center justify-center py-1 px-1 rounded-xl bg-white border border-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                                <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 leading-none">
                                  Настроение
                                </span>
                                <img
                                  src={triad.mood.img}
                                  alt={triad.mood.label}
                                  className="w-6 h-6 object-contain my-0.5 drop-shadow-xs select-none pointer-events-none"
                                />
                                <span className="text-[9.5px] font-extrabold text-slate-700 leading-none truncate max-w-full">
                                  {triad.mood.label}
                                </span>
                              </div>

                              <div className="flex flex-col items-center justify-center py-1 px-1 rounded-xl bg-white border border-white shadow-[0_2px_8px_rgba(15,23,42,0.06)]">
                                <span className="text-[7.5px] font-black uppercase tracking-wider text-slate-400 leading-none">
                                  Самочувствие
                                </span>
                                <img
                                  src={triad.wellbeing.img}
                                  alt={triad.wellbeing.label}
                                  className="w-6 h-6 object-contain my-0.5 drop-shadow-xs select-none pointer-events-none"
                                />
                                <span className="text-[9.5px] font-extrabold text-slate-700 leading-none truncate max-w-full">
                                  {triad.wellbeing.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Блок чипсов для логов воды, движения и блюд (с защитой от горизонтального переполнения) */}
                  {st.chips && st.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {st.chips.map((chip: any) => (
                        <span
                          key={chip.id}
                          className="bg-white/95 border border-slate-200/70 rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-slate-600 shadow-xs max-w-full truncate font-mono"
                        >
                          {chip.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}