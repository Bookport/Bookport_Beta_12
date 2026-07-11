import React, { useState } from "react";
import { Scale, Sparkles, ChevronDown, ChevronUp, Brain, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import { resolveAvatarForTab, type StateNowTabId } from "../../utils/annaAvatarResolver";

interface BalanceTabProps {
  key?: any;
  tabId: StateNowTabId;
  getAnnaAnalysis: () => string;
  integralScore: number;
  sleepPct: number;
  waterPct: number;
  hydrationState: 'success' | 'normal' | 'warning';
  mealsPct: number;
  habitsPct: number;
  ratingWellbeing: number;
  ratingEnergy: number;
  ratingLightness: number;
  recommendedAction: NextStepRecommendation;
  triggerNotification: (msg: string) => void;
  onBack: () => void;
  setWater?: React.Dispatch<React.SetStateAction<number>>;
  setScreen?: (screen: any) => void;
}

export default function BalanceTab({
  tabId,
  getAnnaAnalysis,
  integralScore,
  sleepPct,
  waterPct,
  hydrationState,
  mealsPct,
  habitsPct,
  ratingWellbeing,
  ratingEnergy,
  ratingLightness,
  recommendedAction,
  triggerNotification,
  onBack,
  setWater,
  setScreen,
}: BalanceTabProps) {
  const [isAnnaExpanded, setIsAnnaExpanded] = useState(false);

  const annaAvatar = resolveAvatarForTab(tabId);

  const handleExplainNextStep = () => {
    setIsAnnaExpanded(true);
    triggerNotification("Анна проанализировала системные взаимосвязи! 🧠");
    // Scroll smoothly to top
    const workspace = document.querySelector(".overflow-y-auto");
    if (workspace) {
      workspace.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* 1. Collapsible Speech Card from Curator Anna (Spoiler) */}
      <div className="bg-white rounded-[28px] shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 border border-gray-100/50 text-left relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#16B551]/3 rounded-full blur-[20px] pointer-events-none" />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="relative shrink-0">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-slate-100/80 shadow-xs">
              <img 
                src={annaAvatar.src}
                alt="Анна советует" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-emerald-600 border border-white flex items-center justify-center text-[9px] shadow-sm select-none">
              🧘
            </div>
          </div>

          <div className="flex-1 text-left">
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex flex-col">
                <span className="text-[15px] font-black text-slate-900 leading-none">Анна</span>
                <span className="text-[11px] font-bold text-slate-400 mt-1 leading-none">Советник WFPB</span>
              </div>
              <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50/70 border border-emerald-100/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
                Аналитический итог
              </span>
            </div>

            {/* Collapsed message preview or fully expanded content */}
            <div className="mt-2.5">
              {!isAnnaExpanded ? (
                <div onClick={() => setIsAnnaExpanded(true)} className="cursor-pointer group">
                  <p className="text-[13px] sm:text-[13.5px] text-slate-650 leading-relaxed font-semibold hover:text-slate-850 transition-colors">
                    «Приветствую! Рада подвести для вас целостный биоэнергетический итог дня по питанию, гидратации, сну и сосудистому контуру...»
                  </p>
                  <button 
                    type="button"
                    className="mt-2 flex items-center gap-1 text-[11.5px] font-extrabold text-[#10B981] hover:text-[#0c9063] transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    <span>Читать полный разбор</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-[13px] sm:text-[13.5px] text-slate-750 leading-relaxed font-semibold whitespace-pre-line">
                    {getAnnaAnalysis()}
                  </p>

                  {/* Active callout showing Anna's detailed reasoning for this specific recommendation */}
                  <div className="p-3.5 bg-slate-50 border border-slate-100/50 rounded-2xl text-[12.5px] text-slate-650 font-medium">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 mb-1 select-none">
                      <Sparkles className="w-3.5 h-3.5 text-[#10B981] animate-pulse" />
                      <span>Взаимосвязь систем дня:</span>
                    </div>
                    <p className="leading-relaxed opacity-95">
                      {recommendedAction.reasoning}
                    </p>
                  </div>

                  <button 
                    type="button"
                    onClick={() => setIsAnnaExpanded(false)}
                    className="flex items-center gap-1 text-[11.5px] font-extrabold text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-0 cursor-pointer mt-2"
                  >
                    <span>Скрыть аналитический разбор</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>      {/* 2. Recommended Step - Visual priority action card */}
      <div className="bg-[#FAF6F0]/90 rounded-[28px] p-5 text-left relative overflow-hidden transition-all duration-300">
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-amber-500/5 rounded-full blur-[24px] pointer-events-none" />
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-[22px] shadow-xs shrink-0 select-none">
            {recommendedAction.icon}
          </div>
          <div className="flex-1 text-left font-sans">
            <span className="text-[10px] font-extrabold text-amber-700/85 uppercase tracking-widest block leading-none">
              Рекомендуемый следующий шаг
            </span>
            <h3 className="text-[15.5px] font-black text-amber-955 tracking-tight mt-1 leading-snug">
              {recommendedAction.title}
            </h3>
            <p className="text-[12.5px] sm:text-[13px] text-amber-900/90 leading-relaxed font-semibold mt-1.5">
              {recommendedAction.desc}
            </p>
            
            <div className="flex items-center mt-3">
              <button
                type="button"
                onClick={() => {
                  if (recommendedAction.actionType === "water" && setWater) {
                    setWater(prev => Math.min(2500, prev + 250));
                    triggerNotification("Добавлено 250 мл чистой воды в баланс дня! 💧");
                  } else if (recommendedAction.actionType === "habits" && setScreen) {
                    setScreen("habits-twenty");
                    triggerNotification("Переход к разделу привычек... ⚡");
                  } else if (recommendedAction.actionType === "book-recipes" && setScreen) {
                    setScreen("book-recipes");
                    triggerNotification("Переход к Книге рецептов... 🍲");
                  } else if (recommendedAction.actionType === "what-i-eat" && setScreen) {
                    setScreen("what-i-eat");
                    triggerNotification("Переход в раздел питания... 🍏");
                  } else if (recommendedAction.actionType === "diary" && setScreen) {
                    setScreen("diary");
                    triggerNotification("Переход к Дневнику замеров состояния... 📈");
                  } else {
                    triggerNotification(`Задание "${recommendedAction.title}" принято в работу! ✓`);
                    setTimeout(() => {
                      onBack();
                    }, 1200);
                  }
                }}
                className="text-[12.5px] font-black text-amber-800 hover:text-amber-950 transition-all hover:underline cursor-pointer inline-flex items-center gap-1 p-0 bg-transparent border-none select-none"
              >
                <span>{recommendedAction.btnText}</span>
                <span className="text-[11px]">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Factor Summary Map */}
      <div className="bg-white rounded-[28px] border border-gray-100/80 shadow-[0_8px_24px_rgba(43,49,55,0.015)] p-5 text-left font-sans">
        <h2 className="text-[14px] font-black text-slate-800 tracking-tight mb-3.5 uppercase flex items-center gap-1.5 select-none animate-fade-in">
          <span className="text-emerald-500">📊</span> Сводка факторов общего баланса
        </h2>
        <p className="text-[11.5px] text-slate-400 mb-4 leading-normal">
          Каждая физиологическая система и привычка поставляет биологические импульсы в единый кольцевой индекс дня ({integralScore}%).
        </p>
        
        <div className="space-y-2.5">
          {[
            { name: "Сон восстановительный", contribution: "20%", pct: sleepPct, status: sleepPct >= 70 ? "Цель близка" : "Рекомендуется отдых", color: "text-indigo-600 bg-indigo-50/50" },
            { name: "Клеточная гидратация (Вода)", contribution: "20%", pct: waterPct, status: hydrationState === 'warning' ? "Дефицит влаги" : "Норма", color: "text-sky-650 bg-sky-50/50" },
            { name: "Цельный WFPB-рацион", contribution: "20%", pct: mealsPct, status: mealsPct >= 50 ? "Оптимально" : "Мало клетчатки", color: "text-emerald-700 bg-emerald-50/50" },
            { name: "Клеточный импульс", contribution: "15%", pct: habitsPct, status: habitsPct >= 50 ? "Активно" : "Низкий ритм", color: "text-purple-600 bg-purple-50/50" },
            { name: "Психологический дзен", contribution: "10%", pct: ratingWellbeing * 20, status: ratingWellbeing >= 3 ? "Стабильно" : "Нужна пауза", color: "text-rose-600 bg-rose-50/50" },
            { name: "Физический тонус и сила", contribution: "10%", pct: ratingEnergy * 20, status: ratingEnergy >= 3 ? "Бодрость" : "Запрос энергии", color: "text-amber-700 bg-amber-50/50" },
            { name: "Ощущение лёгкости в ЖКТ", contribution: "5%", pct: ratingLightness * 20, status: ratingLightness >= 3 ? "Легко" : "Нагрузка", color: "text-teal-700 bg-teal-50/50" }
          ].map((factor) => (
            <div key={factor.name} className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/30 text-[12.5px] hover:bg-slate-50 transition-colors">
              <div className="flex flex-col">
                <span className="font-bold text-slate-755">{factor.name}</span>
                <span className="text-[10px] text-gray-400 font-medium mt-0.5">Влияние: +{factor.contribution}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${factor.color}`}>
                  {factor.status}
                </span>
                <span className="font-mono font-extrabold text-slate-800">{factor.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. System Connections */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left font-sans">
        <h2 className="text-[14px] font-black text-slate-850 tracking-tight mb-4 uppercase flex items-center gap-1.5 select-none">
          <span className="text-[#0288D1]">🔍</span> Системные взаимосвязи дня
        </h2>

        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
              🌿
            </div>
            <div className="flex-1">
              <span className="text-[13px] font-bold text-slate-800 leading-snug block">Ресурс натрия и калия</span>
              <span className="text-[11.5px] text-gray-500 leading-relaxed block mt-0.5">
                Цельный WFPB-рацион без добавленной соли защищает стенки кровеносных капилляров и оптимизирует кровяное давление. Калий из зеленых листьев уходит прямиком в ядра мышечных волокон.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
              ⚡
            </div>
            <div className="flex-1">
              <span className="text-[13px] font-bold text-slate-800 leading-snug block">Зависимость энергии от гидратации</span>
              <span className="text-[11.5px] text-gray-500 leading-relaxed block mt-0.5">
                {hydrationState === 'warning'
                  ? "Прошло больше 2 часов с последнего стакана. Клеточная влага падает. Выпей 250 мл тёплой воды прямо сейчас."
                  : hydrationState === 'success'
                    ? "Дневная норма воды выполнена. Водно-солевой баланс идеален."
                    : "Уровень клеточной гидратации в норме. Вода усваивается."
                }
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
              🍃
            </div>
            <div className="flex-1">
              <span className="text-[13px] font-bold text-slate-800 leading-snug block">Связь сна и пищеварительной лёгкости</span>
              <span className="text-[11.5px] text-gray-500 leading-relaxed block mt-0.5">
                Качественные растительные аминокислоты нормализуют моторику тонкой кишки, снижая нагрузку на блуждающий нерв, что мгновенно улучшает глубину фаз быстрого сна.
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
