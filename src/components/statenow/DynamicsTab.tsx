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

  // Derived wellness conditions with circadian time windows — direct props, no local simulation
  const hasBreakfast = (cookedBookDishes.some(d => d.category === "Завтраки") || cookedBookDishes.some(d => d.name.toLowerCase().includes("завтрак"))) && currentHour < 12;
  const hasLunch = (cookedBookDishes.some(d => d.category === "Супы и Салаты" || d.category === "Вторые блюда" || d.category === "Основные блюда") || cookedBookDishes.some(d => d.name.toLowerCase().includes("обед"))) && currentHour >= 12 && currentHour < 17;
  const hasDinner = (cookedBookDishes.some(d => d.category === "Основные блюда") || cookedBookDishes.some(d => d.name.toLowerCase().includes("ужин"))) && currentHour >= 17;

  // Compile the timeline nodes representing the circadian flow of the day — read-only
  const timelineItems = [
    {
      id: "wakeup",
      time: "07:30",
      categoryLabel: "Старт Дня",
      title: "Выход из ночной нейрогормональной фазы",
      description: sleep > 0
        ? `Пробуждение подтверждено. Восстановительный сон: ${Math.round(sleep / 60)} ч.`
        : "Время пробуждения не зафиксировано. Запись сна появится здесь после быстрой записи сна в карточке «Сон».",
      status: sleep > 0
        ? (sleep >= 420 ? "green" : "orange")
        : "waiting" as const,
      type: sleep > 0 ? "actual" as const : "recommendation" as const,
      interpretationText: "Момент фиксации подъема запускает выброс утреннего кортизола, настраивая ритм сосудов на 16 часов вперед.",
    },
    {
      id: "water_morning",
      time: "08:00",
      categoryLabel: "Гидратация",
      title: "Ранняя клеточная детоксикация",
      description: water >= 250
        ? `Внесено первые ${water} мл чистой структурированной теплой воды. Межклеточный матрикс активирован.`
        : "Вчерашний дефицит влаги не восполнен. Капиллярам почек трудно начать утреннюю фильтрацию.",
      status: water >= 250 ? "green" : "waiting" as const,
      type: water >= 250 ? "actual" as const : "recommendation" as const,
      interpretationText: "250-500 мл воды натощак мгновенно разжижают кровь, снижая риски утренних перегрузок кровеносного русла.",
    },
    {
      id: "breakfast",
      time: "09:00",
      categoryLabel: "Питание • Завтрак",
      title: "Завтрак WFPB: Медленный углеводный старт",
      description: hasBreakfast
        ? `Принят завтрак: «${cookedBookDishes.find(d => d.category === "Завтраки")?.name || "Овсяный цельнозерновой завтрак с ягодами"}».`
        : "Завтрак еще не зафиксирован. Клетки мозга нуждаются в безопасной плавной глюкозе без инсулиновых качелей.",
      status: hasBreakfast ? "green" : "waiting" as const,
      type: hasBreakfast ? "actual" as const : "recommendation" as const,
      interpretationText: "Сложные углеводы без соли и сахара обеспечивают равномерную подачу энергии в сосуды и ЖКТ без спазмов.",
    },
    {
      id: "movement",
      time: "11:30",
      categoryLabel: "Движение",
      title: "Венозная помпа и мышечный лимфоток",
      description: movementDone
        ? "Выполнена тридцатиминутная сосудистая прогулка в темпе циркадного тонуса. Застойные процессы ликвидированы."
        : "Длительное гиподинамическое состояние. Наблюдается спад кровообращения малого таза.",
      status: movementDone ? "green" : "waiting" as const,
      type: movementDone ? "actual" as const : "recommendation" as const,
      interpretationText: "Сокращение икроножных мышц работает как второе сердце, облегчая возврат венозной крови и снижая нагрузку давления.",
    },
    {
      id: "lunch",
      time: "13:30",
      categoryLabel: "Питание • Обед",
      title: "Антиоксидантный обеденный импульс",
      description: hasLunch
        ? `Внесен омолаживающий обед с высокой концентрацией клетчатки: «${cookedBookDishes.find(d => d.category === "Супы и Салаты" || d.category === "Вторые блюда" || d.category === "Основные блюда")?.name || "Чечевичный суп-пюре со шпинатом"}».`
        : "Обед не верифицирован. Ожидается сытная, но легкая порция овощей, богатых нитратами для расширения сосудов.",
      status: hasLunch ? "green" : "waiting" as const,
      type: hasLunch ? "actual" as const : "recommendation" as const,
      interpretationText: "Листовая зелень и бобовые стимулируют синтез оксида азота, который расслабляет эндотелий мелких артериол.",
    },
    {
      id: "dinner",
      time: "19:00",
      categoryLabel: "Питание • Ужин",
      title: "Вечерний регенеративный приём",
      description: hasDinner
        ? `Зафиксирован ужин: «${cookedBookDishes.find(d => d.category === "Основные блюда")?.name || "Тёплый салат из киноа с овощами"}».`
        : "Ужин ещё не зафиксирован. Для запуска ночной глимфатической очистки мозга рекомендуется лёгкий приём за 3-4 часа до сна.",
      status: hasDinner ? "green" : "waiting" as const,
      type: hasDinner ? "actual" as const : "recommendation" as const,
      interpretationText: "Умеренный ужин без перегрузки ЖКТ обеспечивает плавный вход в парасимпатическую фазу и глубокий сон с детоксикацией.",
    },
    {
      id: "vagus",
      time: "17:00",
      categoryLabel: "Восстановление • Покой",
      title: "Вагусный ритуал замедления",
      description: "Ближе к вечеру накапливается психологическая нагрузка. Рекомендуется 5 минут дыхания по квадрату.",
      status: "waiting" as const,
      type: "recommendation" as const,
      interpretationText: "Раздражение блуждающего нерва (вагуса) замедляет пульс, успокаивает надпочечники и снижает тонус артерий.",
    },
    {
      id: "assessment",
      time: "20:30",
      categoryLabel: "Самооценка",
      title: "Вечерняя точка вегетативного баланса",
      description: ratingEnergy > 0
        ? `Физический тонус: ${ratingEnergy}/5 • Лёгкость ЖКТ: ${ratingLightness}/5 • Психологический дзен: ${ratingWellbeing}/5.`
        : "Системе не хватает обратной связи о вашем вечернем самочувствии для построения завтрашней карты адаптации.",
      status: ratingEnergy > 0 ? "green" : "waiting" as const,
      type: ratingEnergy > 0 ? "actual" as const : "recommendation" as const,
      interpretationText: "Самооценка — ценнейший маркер субъективного отклика. ИИ сопоставляет его с нутриентами для тонкой настройки рекомендаций.",
    },
    {
      id: "night_sleep",
      time: "22:30",
      categoryLabel: "Конец Цикла",
      title: "Переход к секреции мелатонина",
      description: "Подготовка к отходу ко сну. Пора убрать синие экраны, приглушить свет и активировать ночной режим для идеальной выработки мелатонина.",
      status: "waiting" as const,
      type: "recommendation" as const,
      interpretationText: "Мелатонин является сильнейшим антиоксидантом нервной системы. Засыпание до 23:00 бережет сосуды мозга от раннего старения.",
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-6 animate-fade-in"
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
          {/* Delicate connection line */}
          <div className="absolute left-[11px] top-3.5 bottom-3.5 w-[1.5px] bg-gradient-to-b from-[#E2D8C9] via-[#ECE4D8] to-[#E9DFD0] opacity-60" />

          <div className="space-y-6">
            {timelineItems.map((item) => {
              return (
                <div key={item.id} className="relative pl-3 text-left">
                  {/* Status indicator exactly aligned on the left line */}
                  <div className="absolute -left-[30px] top-1 flex items-center justify-center z-10 select-none pointer-events-none">
                    {item.status === "green" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full bg-emerald-550/10 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.25)]" />
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-emerald-400/35 blur-[3px]" />
                        <div className="relative w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-emerald-600 to-emerald-400 border border-emerald-300/30 shadow-[0_1px_2px_rgba(0,0,0,0.1),_0_0_6px_rgba(16,185,129,0.7),_inset_0_1px_1px_rgba(255,255,255,0.45)]" />
                      </div>
                    )}
                    {item.status === "orange" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full bg-amber-550/10 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.25)]" />
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-amber-400/35 blur-[3px]" />
                        <div className="relative w-2.5 h-2.5 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border border-amber-300/30 shadow-[0_1px_2px_rgba(0,0,0,0.1),_0_0_6px_rgba(245,158,11,0.7),_inset_0_1px_1px_rgba(255,255,255,0.45)]" />
                      </div>
                    )}
                    {item.status === "waiting" && (
                      <div className="w-6 h-6 rounded-full flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full bg-slate-300/10 border border-dashed border-slate-300/40 shadow-[0_0_8px_rgba(148,163,184,0.1)] " />
                        <div className="absolute w-3.5 h-3.5 rounded-full bg-slate-400/15 blur-[2px] animate-pulse" />
                        <div className="relative w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]" />
                        <div className="absolute w-1.5 h-1.5 rounded-full bg-amber-400/70 animate-ping" />
                      </div>
                    )}
                  </div>

                  {/* Body textual block */}
                  <div className="font-sans">
                    {/* Time of node */}
                    <div className="flex items-center gap-1.5 select-none font-sans">
                      <span className="text-[10px] font-black font-mono tracking-wide text-slate-400">
                        {item.time}
                      </span>
                      <span className="text-[9px] text-slate-300">•</span>
                      <span className="text-[9.5px] font-black uppercase tracking-wider text-amber-700/80 font-mono">
                        {item.categoryLabel}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-[13.5px] font-black text-slate-850 mt-0.5 leading-snug">
                      {item.title}
                    </h4>

                    {/* Description */}
                    <p className="text-[12px] text-slate-500 leading-relaxed font-semibold mt-1">
                      {item.description}
                    </p>

                    {/* Integrated interpretive secondary text */}
                    {item.interpretationText && (
                      <p className="text-[11.5px] text-slate-400/95 leading-relaxed font-semibold italic mt-1.5 pl-2.5 border-l border-amber-200/30">
                        {item.interpretationText}
                      </p>
                    )}
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
