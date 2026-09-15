import React, { useState, useEffect } from "react";
import { MOVEMENT_DAILY_TARGET_MIN } from "../../constants/movement";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";

interface DynamicsTabProps {
  key?: any;
  sleep: number;
  water: number;
  ratingEnergy: number;
  ratingWellbeing: number;
  ratingLightness: number;
  habitsDone: number;
  habitsTarget: number;
  cookedBookDishes: {
    id: string;
    name: string;
    category: string;
  }[];
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
  currentDayIndex?: number;
  savedDishes?: any[];
  activityLogs?: { timestamp: number; durationSeconds: number }[];
}

export default function DynamicsTab({
  sleep,
  water,
  ratingEnergy,
  ratingWellbeing,
  ratingLightness,
  cookedBookDishes,
  annaAnalysisText,
  recommendedAction,
  activityLogs = [],
}: DynamicsTabProps) {
  // Live real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const currentHour = currentTime.getHours();
  const timeString = `${String(currentTime.getHours()).padStart(2, "0")}:${String(currentTime.getMinutes()).padStart(2, "0")}`;
  const phaseOfDay = (() => {
    if (currentHour >= 6 && currentHour < 12) return { label: "ПРОБУЖДЕНИЕ И ГИДРАТАЦИЯ", emoji: "🌅" };
    if (currentHour >= 12 && currentHour < 16) return { label: "ПИК ОРГАНИЗМА", emoji: "☀️" };
    if (currentHour >= 16 && currentHour < 21) return { label: "СНИЖЕНИЕ АКТИВНОСТИ", emoji: "🌤️" };
    return { label: "ВОССТАНОВЛЕНИЕ И ДЕТОКС", emoji: "🌙" };
  })();

  const activityMinutes = Math.round((activityLogs || []).reduce((acc: number, log: any) => acc + (log.durationSeconds || 0), 0) / 60);
  const movementDone = activityMinutes >= MOVEMENT_DAILY_TARGET_MIN;

  // Fixed: persistent meal statuses — once cooked, stays completed for the rest of the day
  const hasBreakfast = cookedBookDishes.some(d => d.category === "Завтраки") || cookedBookDishes.some(d => d.name.toLowerCase().includes("завтрак"));
  const hasLunch = cookedBookDishes.some(d => d.category === "Супы и Салаты" || d.category === "Вторые блюда" || d.category === "Основные блюда") || cookedBookDishes.some(d => d.name.toLowerCase().includes("обед"));
  const hasDinner = cookedBookDishes.some(d => d.category === "Основные блюда") || cookedBookDishes.some(d => d.name.toLowerCase().includes("ужин"));

  const hasRatings = ratingEnergy > 0 || ratingWellbeing > 0 || ratingLightness > 0;

  // 9 circadian checkpoints in correct sequential order
  const timelineItems = [
    {
      id: "wakeup",
      time: "07:30",
      title: "Подъём",
      description: "Фиксация пробуждения и запуск циркадного ритма",
      status: sleep > 0 ? ("green" as const) : ("waiting" as const),
    },
    {
      id: "water_morning",
      time: "08:00",
      title: "Утренняя вода",
      description: "Первый стакан воды для запуска метаболизма и мягкой гидратации",
      status: water >= 250 ? ("green" as const) : ("waiting" as const),
    },
    {
      id: "breakfast",
      time: "09:00",
      title: "Завтрак WFPB",
      description: "Медленные сложные углеводы для ровной энергии без скачков сахара",
      status: hasBreakfast ? ("green" as const) : ("waiting" as const),
    },
    {
      id: "movement",
      time: "11:30",
      title: "Движение",
      description: "Мышечная активность для циркуляции и тонуса",
      status: movementDone ? ("green" as const) : ("waiting" as const),
    },
    {
      id: "lunch",
      time: "13:30",
      title: "Обед WFPB",
      description: "Полноценный приём клетчатки и нутриентов",
      status: hasLunch ? ("green" as const) : ("waiting" as const),
    },
    {
      id: "evening_slowdown",
      time: "17:00",
      title: "Вечернее замедление",
      description: "Плавное снижение физиологической нагрузки и переход к отдыху",
      status: "waiting" as const,
    },
    {
      id: "dinner",
      time: "19:00",
      title: "Ужин WFPB",
      description: "Легкий ужин за 3–4 часа до сна для ночного восстановления",
      status: hasDinner ? ("green" as const) : ("waiting" as const),
    },
    {
      id: "assessment",
      time: "20:30",
      title: "Вечерний баланс",
      description: "Подведение итогов дня и фиксация самочувствия",
      status: hasRatings ? ("green" as const) : ("waiting" as const),
    },
    {
      id: "night_sleep",
      time: "22:30",
      title: "Подготовка ко сну",
      description: "Снижение яркости экранов и подготовка к глубокому сну",
      status: "waiting" as const,
    },
  ];

  const getMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const times = timelineItems.map(i => getMinutes(i.time));
  let currentIndex = -1;
  for (let i = 0; i < times.length; i++) {
    if (currentMinutes >= times[i]) currentIndex = i;
  }
  if (currentIndex === -1) currentIndex = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5 pb-36"
      id="dynamics-tab-panel"
    >
      {/* 0. Anna's Tab Spoiler Analysis */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler
          tabId="dynamics"
          tabName="Динамика и биоритмы дня"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}

      {/* 1. Current phase header — clean info view */}
      <div className="bg-[#FAF9F5] rounded-[30px] border border-[#F2EDE4]/80 p-5 text-left relative overflow-hidden shadow-[0_8px_30px_rgba(243,238,230,0.35)]">
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-center justify-between gap-3 relative">
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] p-1.5 bg-[#FAF3E5] rounded-xl text-amber-800">⏰</span>
            <div>
              <h2 className="text-[13.5px] font-black tracking-tight text-slate-800 uppercase font-sans">
                Текущая фаза дня
              </h2>
              <p className="text-[11px] text-slate-400 font-bold mt-0.5 flex items-center gap-1.5">
                <span>{phaseOfDay.emoji}</span> {phaseOfDay.label}
              </p>
            </div>
          </div>
          <span className="text-[12px] font-mono font-black tracking-wide text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
            {timeString}
          </span>
        </div>
      </div>

      {/* 2. CHRONOLOGICAL WELLNESS TIMELINE (THE SPINE OF THE MODULE) */}
      <div className="bg-[#FAF9F6] rounded-[28px] border border-orange-100/15 shadow-[0_4px_24px_rgba(242,236,228,0.25)] p-5.5 text-left relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-2 select-none">
          <div className="flex items-center gap-2">
            <span className="text-[14px]">⏰</span>
            <h2 className="text-[13.5px] font-black text-slate-800 tracking-tight uppercase font-sans">
              Временная шкала текущего дня
            </h2>
          </div>
          <span className="text-[8.5px] font-extrabold text-[#10B981] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
            Автоматическое ведение
          </span>
        </div>

        <p className="text-[11.5px] text-slate-500/90 leading-relaxed mb-6 font-sans">
          Интегральный ход циркадных ритмов и ключевые отметки ваших действий, влияющие на индекс. Шкала отражает согласованность систем организма.
        </p>

        {/* Timeline list body */}
        <div className="relative pl-7 ml-0.5 mt-4">
          {/* Clean vertical line */}
          <div className="absolute left-[11px] top-3.5 bottom-3.5 w-px bg-slate-200" />

          <div className="space-y-6">
            {timelineItems.map((item, index) => {
              const isCompleted = item.status === "green";
              const isCurrentPhase = index === currentIndex && !isCompleted;
              return (
                <div key={item.id} className="relative pl-3 text-left">
                  {/* Status bullet: green for completed, blue for current phase, slate for upcoming */}
                  <div className="absolute -left-[30px] top-1 flex items-center justify-center z-10 select-none pointer-events-none">
                    {isCompleted ? (
                      <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_0_2px_rgba(16,185,129,0.2)]" />
                    ) : isCurrentPhase ? (
                      <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-[0_0_0_2px_rgba(59,130,246,0.2)]" />
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-slate-300 border-2 border-white shadow-[0_0_0_2px_rgba(148,163,184,0.15)]" />
                    )}
                  </div>

                  {/* Body textual block */}
                  <div className="font-sans">
                    {/* Time badge */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                        {item.time}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-semibold text-slate-800 mt-1.5 leading-snug">{item.title}</h4>

                    {/* Description */}
                    <p className="text-xs leading-relaxed text-slate-600 mt-1">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
