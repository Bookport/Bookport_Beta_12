import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";

// Импорт эталонных 3D-ассетов из папки SOST/balance/
import imgSleep from "../../assets/images/SOST/balance/1.webp";
import imgWater from "../../assets/images/SOST/balance/2.webp";
import imgBreakfast from "../../assets/images/SOST/balance/3.webp";
import imgMovement from "../../assets/images/SOST/balance/4.webp";
import imgLunch from "../../assets/images/SOST/balance/6.webp";
import imgEveningBalance from "../../assets/images/SOST/balance/9.webp";
import imgDinner from "../../assets/images/SOST/balance/16.webp";
import imgTimelineSpine from "../../assets/images/SOST/balance/23.webp";
import imgPhaseSun from "../../assets/images/SOST/balance/24.webp";

interface DynamicsTabProps {
  key?: any;
  sleep?: any;
  wakeTime?: string | null;
  bedtime?: string | null;
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
}

export default function DynamicsTab({
  sleep = 0,
  wakeTime,
  bedtime,
  water = 0,
  waterTarget = 2385,
  todayWaterEntries = [],
  breakfastLogs = [],
  lunchLogs = [],
  dinnerLogs = [],
  activityLogs = [],
  annaAnalysisText,
  recommendedAction,
}: DynamicsTabProps) {
  // Живое время для шапки и определения активной станции
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const timeString = `${String(currentHour).padStart(2, "0")}:${String(currentMinutes).padStart(2, "0")}`;

  const phaseOfDay = (() => {
    if (currentHour >= 6 && currentHour < 12) return { label: "ПРОБУЖДЕНИЕ И ГИДРАТАЦИЯ", icon: "🌅" };
    if (currentHour >= 12 && currentHour < 16) return { label: "ПИК ОРГАНИЗМА", icon: "☀️" };
    if (currentHour >= 16 && currentHour < 21) return { label: "СНИЖЕНИЕ АКТИВНОСТИ", icon: "🌤️" };
    return { label: "ВОССТАНОВЛЕНИЕ И ДЕТОКС", icon: "🌙" };
  })();

  // Перевод строки "HH:MM" в минуты от начала суток
  const parseTimeToMin = (t?: string): number | null => {
    if (!t || !t.includes(":")) return null;
    const parts = t.split(":");
    const h = Number(parts[0]);
    const m = Number(parts[1]);
    return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
  };

  // Форматирование описания блюда: реальное имя + первые ингредиенты
  const formatMealSubtitle = (logs: any[], defaultWaitingText: string) => {
    if (!logs || logs.length === 0) return defaultWaitingText;
    return logs
      .map((d: any) => {
        let ingText = "";
        if (Array.isArray(d.ingredients) && d.ingredients.length > 0) {
          const names = d.ingredients
            .map((i: any) => (typeof i === "string" ? i : i?.name))
            .filter(Boolean)
            .slice(0, 3);
          if (names.length > 0) ingText = `: ${names.join(", ")}`;
        }
        return `${d.name}${ingText}`;
      })
      .join("; ");
  };

  // Расчёт активности
  const totalActivityMin = (activityLogs || []).reduce((acc: number, log: any) => {
    const dur = log.durationMin ?? Math.round((log.durationSeconds || log.duration || 0) / 60);
    return acc + dur;
  }, 0);

  // Вычисление диапазона логов воды
  const waterTimeRange = (() => {
    if (!todayWaterEntries || todayWaterEntries.length === 0) return "08:00 – 21:00";
    const times = todayWaterEntries.map((e: any) => e.time).filter(Boolean);
    if (times.length === 0) return "08:00 – 21:00";
    if (times.length === 1) return times[0];
    return `${times[0]} – ${times[times.length - 1]}`;
  })();

  // Вычисление диапазона тренировок
  const movementTimeRange = (() => {
    if (!activityLogs || activityLogs.length === 0) return "09:00 – 18:00";
    const times = activityLogs.map((a: any) => a.timeString).filter(Boolean);
    if (times.length === 0) return "09:00 – 18:00";
    if (times.length === 1) return times[0];
    return `${times[0]} – ${times[times.length - 1]}`;
  })();

  // Статусы выполнения станций
  const hasSleepRecorded = typeof sleep === "number" && sleep > 0;
  const hasWaterRecorded = typeof water === "number" && water > 0;
  const hasBreakfastRecorded = breakfastLogs.length > 0;
  const hasMovementRecorded = totalActivityMin > 0;
  const hasLunchRecorded = lunchLogs.length > 0;
  const hasDinnerRecorded = dinnerLogs.length > 0;
  const hasBedtimeRecorded = Boolean(bedtime);

  // Фактическое время фиксации блюд
  const actualBreakfastTime = breakfastLogs[0]?.time;
  const actualLunchTime = lunchLogs[0]?.time;
  const actualDinnerTime = dinnerLogs[0]?.time;

  // Оценка попадания в циркадное окно для Завтрака (план: до 11:30)
  const breakfastWindowStatus = (() => {
    if (!hasBreakfastRecorded || !actualBreakfastTime) return null;
    const min = parseTimeToMin(actualBreakfastTime);
    if (min === null) return { inWindow: true, badge: "Зафиксирован Системой" };
    if (min <= 690) return { inWindow: true, badge: "В циркадном окне" };
    const diffHours = ((min - 690) / 60).toFixed(1).replace(/\.0$/, "");
    return { inWindow: false, badge: `Сдвиг +${diffHours}ч (план до 11:30)` };
  })();

  // Оценка попадания в циркадное окно для Обеда (план: 13:00 – 15:00)
  const lunchWindowStatus = (() => {
    if (!hasLunchRecorded || !actualLunchTime) return null;
    const min = parseTimeToMin(actualLunchTime);
    if (min === null) return { inWindow: true, badge: "Зафиксирован Системой" };
    if (min >= 720 && min <= 930) return { inWindow: true, badge: "В циркадном окне" };
    if (min < 720) return { inWindow: false, badge: "Ранний обед" };
    const diffHours = ((min - 900) / 60).toFixed(1).replace(/\.0$/, "");
    return { inWindow: false, badge: `Сдвиг +${diffHours}ч (план 13:00–15:00)` };
  })();

  // Оценка попадания в циркадное окно для Ужина (план: 18:00 – 20:00)
  const dinnerWindowStatus = (() => {
    if (!hasDinnerRecorded || !actualDinnerTime) return null;
    const min = parseTimeToMin(actualDinnerTime);
    if (min === null) return { inWindow: true, badge: "Зафиксирован Системой" };
    if (min >= 1050 && min <= 1230) return { inWindow: true, badge: "В циркадном окне" };
    if (min < 1050) return { inWindow: false, badge: "Ранний ужин" };
    const diffHours = ((min - 1200) / 60).toFixed(1).replace(/\.0$/, "");
    return { inWindow: false, badge: `Поздний ужин (+${diffHours}ч)` };
  })();

  // Определение ID текущей активной станции
  const activeStationId = (() => {
    if (!hasBreakfastRecorded && currentHour < 12) return "breakfast";
    if (!hasLunchRecorded && currentHour >= 12 && currentHour < 17) return "lunch";
    if (!hasDinnerRecorded && currentHour >= 17 && currentHour < 21) return "dinner";
    if (currentHour >= 21 || (!hasBedtimeRecorded && currentHour >= 20)) return "evening";
    if (!hasWaterRecorded && currentHour < 10) return "water";
    return "";
  })();

  // 7 циркадных станций
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
      img: imgSleep,
      bg: "bg-[#F6F7FB]",
      isCompleted: hasSleepRecorded,
      chips: null,
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
    },
    {
      id: "breakfast",
      title: "Завтрак WFPB",
      timeDisplay: hasBreakfastRecorded ? (actualBreakfastTime || "11:30") : "до 11:30",
      isPlan: !hasBreakfastRecorded,
      inWindow: breakfastWindowStatus?.inWindow,
      subtitle: formatMealSubtitle(breakfastLogs, "Приём пищи пока не зафиксирован Системой"),
      windowBadge: breakfastWindowStatus,
      img: imgBreakfast,
      bg: "bg-[#F2F9F5]",
      isCompleted: hasBreakfastRecorded,
      chips: null,
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
    },
    {
      id: "lunch",
      title: "Обед WFPB",
      timeDisplay: hasLunchRecorded ? (actualLunchTime || "14:00") : "13:00 – 15:00",
      isPlan: !hasLunchRecorded,
      inWindow: lunchWindowStatus?.inWindow,
      subtitle: formatMealSubtitle(lunchLogs, "Ожидание дневного приёма пищи"),
      windowBadge: lunchWindowStatus,
      img: imgLunch,
      bg: "bg-[#F4FAF6]",
      isCompleted: hasLunchRecorded,
      chips: null,
    },
    {
      id: "dinner",
      title: "Ужин WFPB",
      timeDisplay: hasDinnerRecorded ? (actualDinnerTime || "18:30") : "18:30 – 20:00",
      isPlan: !hasDinnerRecorded,
      inWindow: dinnerWindowStatus?.inWindow,
      subtitle: formatMealSubtitle(dinnerLogs, "Ожидание вечернего приёма пищи"),
      windowBadge: dinnerWindowStatus,
      img: imgDinner,
      bg: "bg-[#FDFBF7]",
      isCompleted: hasDinnerRecorded,
      chips: null,
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
      img: imgEveningBalance,
      bg: "bg-[#F5F8F7]",
      isCompleted: hasBedtimeRecorded,
      chips: null,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4 pb-36 w-full font-sans"
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

      {/* 1. Плашка «ТЕКУЩАЯ ФАЗА ДНЯ» с отчётливой парящей тенью */}
      <div className="bg-[#FAF8F3] rounded-2xl border border-white p-3.5 shadow-[0_4px_16px_rgba(15,23,42,0.08)] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src={imgPhaseSun}
            alt="Фаза дня"
            className="w-10 h-10 object-contain drop-shadow-xs select-none pointer-events-none shrink-0"
          />
          <div>
            <span className="text-[11.5px] font-black text-slate-700 uppercase tracking-tight block">
              ТЕКУЩАЯ ФАЗА ДНЯ
            </span>
            <span className="text-[10.5px] font-extrabold text-amber-800/90 tracking-wide uppercase flex items-center gap-1 mt-0.5">
              <span>{phaseOfDay.icon}</span> {phaseOfDay.label}
            </span>
          </div>
        </div>
        <span className="text-[13px] font-mono font-bold tracking-tight text-slate-800 bg-white border border-slate-200/80 px-3 py-1 rounded-2xl shadow-xs shrink-0">
          {timeString}
        </span>
      </div>

      {/* 2. Заголовок шкалы таймлайна */}
      <div className="pt-2 px-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={imgTimelineSpine}
              alt="Светофор"
              className="w-5 h-5 object-contain select-none pointer-events-none shrink-0"
            />
            <h2 className="text-[12.5px] font-black text-slate-800 tracking-tight uppercase">
              ВРЕМЕННАЯ ШКАЛА ТЕКУЩЕГО ДНЯ
            </h2>
          </div>
          <span className="text-[8.5px] font-extrabold text-[#10B981] bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
            АВТОМАТИЧЕСКОЕ ВЕДЕНИЕ
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">
          Интегральный ход циркадных ритмов и ключевые отметки ваших действий, влияющие на индекс. Шкала отражает согласованность систем организма.
        </p>
      </div>

      {/* 3. ТАЙМЛАЙН ЦИРКАДНЫХ СТАНЦИЙ */}
      <div className="relative w-full pt-2">
        {/* Вертикальная направляющая серая линия строго по центру лампочек (15px) */}
        <div className="absolute left-[15px] top-6 bottom-6 w-[1.5px] bg-slate-200/80 pointer-events-none" />

        <div className="space-y-3">
          {stations.map((st) => {
            const isActive = st.id === activeStationId;

            return (
              <div key={st.id} className="relative flex items-start">
                {/* Круглый маркер-лампочка (геометрический центр на 15px) */}
                <div className="w-[30px] flex justify-center shrink-0 pt-3 z-10 select-none">
                  {st.isCompleted ? (
                    <div className="w-7 h-7 rounded-full bg-emerald-50 border-2 border-emerald-300 flex items-center justify-center shadow-xs">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                  ) : isActive ? (
                    <div className="w-7 h-7 rounded-full bg-sky-50 border-2 border-sky-400 flex items-center justify-center shadow-xs animate-pulse">
                      <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                    </div>
                  )}
                </div>

                {/* Индивидуальная пастельная карточка станции с отчётливой тенью */}
                <div
                  className={`flex-1 ml-2.5 rounded-2xl p-3.5 border transition-all duration-200 ${st.bg} ${
                    isActive
                      ? "border-sky-300 shadow-[0_6px_20px_rgba(56,189,248,0.20)] -translate-y-0.5"
                      : "border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]"
                  }`}
                >
                  {/* Верхняя строка: Название слева (14.5px), Время (11.5px) + Миниатюра справа */}
                  <div className="flex items-center justify-between gap-1.5">
                    <h3 className="text-[14.5px] font-black text-slate-800 tracking-tight leading-snug min-w-0">
                      {st.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Капсула времени */}
                      <span
                        className={`text-[11.5px] font-bold rounded-full px-2.5 py-0.5 shadow-xs font-mono whitespace-nowrap flex items-center gap-1.5 ${
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
                        className="w-9 h-9 object-contain select-none pointer-events-none drop-shadow-xs shrink-0"
                      />
                    </div>
                  </div>

                  {/* Вторая строка: состав блюда / статус (12.5px) */}
                  <p className="text-[12.5px] text-slate-600 font-medium leading-snug mt-1">
                    {st.subtitle}
                  </p>

                  {/* Бейдж циркадного окна (10.5px) */}
                  {st.windowBadge && (
                    <div className="mt-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold rounded-md px-2 py-0.5 ${
                          st.windowBadge.inWindow
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                            : "bg-amber-50 text-amber-800 border border-amber-200/60"
                        }`}
                      >
                        <span>{st.windowBadge.inWindow ? "🟢" : "⏱️"}</span>
                        <span>{st.windowBadge.badge}</span>
                      </span>
                    </div>
                  )}

                  {/* Блок чипсов для логов воды и активности (11px) */}
                  {st.chips && st.chips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {st.chips.map((chip: any) => (
                        <span
                          key={chip.id}
                          className="bg-white/95 border border-slate-200/70 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 shadow-xs whitespace-nowrap font-mono"
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