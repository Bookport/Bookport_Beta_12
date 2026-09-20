import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Droplet } from "lucide-react";
import { motion } from "motion/react";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import { resolveAvatarForTab, type StateNowTabId } from "../../utils/annaAvatarResolver";
import { evaluateSystemInterconnections } from "../../utils/systemInterconnectionsEngine";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import imgFactorSleep from "../../assets/images/SOST/balance/1.webp"; // Сон
import imgFactorWater from "../../assets/images/SOST/balance/2.webp"; // Вода
import imgFactorFood from "../../assets/images/SOST/balance/3.webp"; // Рацион
import imgFactorMove from "../../assets/images/SOST/balance/4.webp"; // Движение
import imgRelSodiumPotassium from "../../assets/images/SOST/balance/9.webp"; // Ресурс натрия и калия
import imgRelEnergyHydration from "../../assets/images/SOST/balance/10.webp"; // Зависимость энергии от гидратации
import imgRelSleepDigestion from "../../assets/images/SOST/balance/11.webp"; // Связь сна и пищеварительной лёгкости

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
  setScreen,
}: BalanceTabProps) {
  const [isAnnaExpanded, setIsAnnaExpanded] = useState(false);

  const annaAvatar = resolveAvatarForTab(tabId);

  const handleExplainNextStep = () => {
    setIsAnnaExpanded(true);
    triggerNotification("Анна проанализировала системные взаимосвязи! 🧠");
    const workspace = document.querySelector(".overflow-y-auto");
    if (workspace) {
      workspace.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

// Точная смысловая привязка категории и 3D-миниатюры по полю icon рекомендации
  const getActionMeta = () => {
    switch (recommendedAction?.icon) {
      case "apple":
      case "leaf":
      case "recipe-book":
        return {
          category: "РАЦИОН WFPB",
          badge: "+4% к балансу",
          badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
          img: imgFactorFood,
        };
      case "movement":
        return {
          category: "ТОНУС И ДВИЖЕНИЕ",
          badge: "+3% к балансу",
          badgeClass: "bg-orange-50 text-orange-700 border-orange-200/60",
          img: imgFactorMove,
        };
      case "water":
      case "water-glass":
        return {
          category: "ГИДРАТАЦИЯ",
          badge: "+3% к балансу",
          badgeClass: "bg-sky-50 text-sky-700 border-sky-200/60",
          img: imgFactorWater,
        };
      case "sleep":
        return {
          category: "ЦИРКАДНЫЙ ПОКОЙ",
          badge: "+3% к балансу",
          badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
          img: imgFactorSleep,
        };
      case "sparkles":
        return {
          category: "БАЛАНС СИСТЕМЫ",
          badge: "Ресурс",
          badgeClass: "bg-amber-50 text-amber-700 border-amber-200/60",
          img: imgRelSodiumPotassium,
        };
      case "zen":
      default:
        return {
          category: "ПСИХОСОМАТИКА И ДЗЕН",
          badge: "Ресурс",
          badgeClass: "bg-teal-50 text-teal-700 border-teal-200/60",
          img: imgRelSleepDigestion,
        };
    }
  };

  const actionMeta = getActionMeta();
  
  const interconnections = evaluateSystemInterconnections({
    currentDayIndex: 1,
    waterPct,
    water: (waterPct * 2000) / 100,
    waterTarget: 2000,
    sleepPct,
    mealsPct,
    totalCalories: mealsPct > 0 ? 800 : 0,
    totalFiber: mealsPct > 0 ? 25 : 0,
    habitsPct,
    ratingEnergy,
    ratingLightness,
    hydrationState,
  });

return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5 pb-36 w-full"
    >
      {/* 1. Карточка куратора Анны (единый компонент AnnaTabSpoiler) */}
      <AnnaTabSpoiler
        tabId="balance"
        tabName="Аналитический итог"
        analysisText={getAnnaAnalysis()}
        recommendedAction={recommendedAction}
      />

      {/* 2. Recommended Step - динамическая категория и 3D-миниатюра */}
      {recommendedAction && (
        <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-white border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] mb-3">
          {/* Верхний ряд: 3D-миниатюра + категория слева, бейдж эффекта справа */}
          <div className="flex items-center justify-between gap-2 mb-2 w-full">
            <div className="flex items-center gap-2">
              <img
                src={actionMeta.img}
                alt={actionMeta.category}
                className="w-7 h-7 object-contain drop-shadow-xs select-none shrink-0"
              />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                {actionMeta.category}
              </span>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${actionMeta.badgeClass}`}>
              {actionMeta.badge}
            </span>
          </div>
          {/* Заголовок действия и описание на полную ширину плашки */}
          <h3 className="text-[13.5px] font-extrabold text-slate-800 leading-snug mb-1 text-left">{recommendedAction.title}</h3>
          <p className="text-[11.5px] text-slate-600 leading-relaxed font-normal text-left">{recommendedAction.desc}</p>
        </div>
      )}

      {/* 3. Карточка СВОДКА ФАКТОРОВ ОБЩЕГО БАЛАНСА — точнейшая подгонка */}
      <div className="w-full rounded-[24px] bg-white border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] p-3.5 sm:p-4 text-left mb-4">
        <div className="flex items-center justify-between gap-1 mb-0.5 w-full">
          <h3 className="text-[11px] sm:text-[11.5px] font-extrabold tracking-tight uppercase text-slate-700 truncate">
            СВОДКА ФАКТОРОВ ОБЩЕГО БАЛАНСА
          </h3>
          <span className="text-[10px] font-bold text-slate-400 font-mono whitespace-nowrap shrink-0">Индекс: {integralScore}%</span>
        </div>
        <p className="text-[10.5px] text-slate-400 leading-tight mb-3">
          Каждая физиологическая система и привычка поставляет импульс в баланс дня ({integralScore}%).
        </p>

        {/* Сетка 4 факторов в 4 колонки */}
        <div className="grid grid-cols-4 gap-1 sm:gap-2 w-full">
          {/* 1. Сон */}
          <div className="bg-[#F0F4FF] rounded-xl py-2 px-1 flex flex-col items-center text-center">
            <img src={imgFactorSleep} alt="Сон" className="w-7 h-7 object-contain drop-shadow-xs select-none" />
            <span className="text-[10px] font-semibold text-slate-600 mt-1 leading-none whitespace-nowrap">Сон</span>
            <span className="text-[15px] font-black text-slate-800 leading-none mt-1">{sleepPct}%</span>
            <div className="w-full h-1 bg-slate-200/50 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, sleepPct)}%` }} />
            </div>
          </div>

          {/* 2. Вода */}
          <div className="bg-[#F0F9FF] rounded-xl py-2 px-1 flex flex-col items-center text-center">
            <img src={imgFactorWater} alt="Вода" className="w-7 h-7 object-contain drop-shadow-xs select-none" />
            <span className="text-[10px] font-semibold text-slate-600 mt-1 leading-none whitespace-nowrap">Вода</span>
            <span className="text-[15px] font-black text-slate-800 leading-none mt-1">{waterPct}%</span>
            <div className="w-full h-1 bg-slate-200/50 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, waterPct)}%` }} />
            </div>
          </div>

          {/* 3. Рацион */}
          <div className="bg-[#F0FDF4] rounded-xl py-2 px-1 flex flex-col items-center text-center">
            <img src={imgFactorFood} alt="Рацион" className="w-7 h-7 object-contain drop-shadow-xs select-none" />
            <span className="text-[10px] font-semibold text-slate-600 mt-1 leading-none whitespace-nowrap">Рацион</span>
            <span className="text-[15px] font-black text-slate-800 leading-none mt-1">{mealsPct}%</span>
            <div className="w-full h-1 bg-slate-200/50 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, mealsPct)}%` }} />
            </div>
          </div>

          {/* 4. Движение */}
          <div className="bg-[#FFF8F0] rounded-xl py-2 px-0.5 flex flex-col items-center text-center">
            <img src={imgFactorMove} alt="Движение" className="w-7 h-7 object-contain drop-shadow-xs select-none" />
            <span className="text-[10px] font-semibold text-slate-600 mt-1 leading-none whitespace-nowrap tracking-tight">Движение</span>
            <span className="text-[15px] font-black text-slate-800 leading-none mt-1">{habitsPct}%</span>
            <div className="w-full h-1 bg-slate-200/50 rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min(100, habitsPct)}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 4. Блок СИСТЕМНЫЕ ВЗАИМОСВЯЗИ ДНЯ — точнейшая подгонка */}
      <h4 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-1 text-left">СИСТЕМНЫЕ ВЗАИМОСВЯЗИ ДНЯ</h4>

      <div className="w-full bg-white rounded-2xl p-3 border border-white shadow-[0_2px_12px_rgba(15,23,42,0.04)] mb-2.5 text-left">
        <div className="flex items-center gap-2.5 mb-1">
          <img src={imgRelSodiumPotassium} alt="Ресурс натрия и калия" className="w-7 h-7 shrink-0 object-contain select-none" />
          <span className="text-[12.5px] font-bold text-slate-800 leading-tight">
            {interconnections.sodiumPotassium.title}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed font-normal block w-full mt-1">
          {interconnections.sodiumPotassium.description}
        </p>
      </div>

      {/* Карточка 2: Зависимость энергии от гидратации */}
      <div className="w-full bg-white rounded-2xl p-3 border border-white shadow-[0_2px_12px_rgba(15,23,42,0.04)] mb-2.5 text-left">
        <div className="flex items-center gap-2.5 mb-1">
          <img src={imgRelEnergyHydration} alt="Зависимость энергии от гидратации" className="w-7 h-7 shrink-0 object-contain select-none" />
          <span className="text-[12.5px] font-bold text-slate-800 leading-tight">
            {interconnections.energyHydration.title}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed font-normal block w-full mt-1">
          {interconnections.energyHydration.description}
        </p>
      </div>

      {/* Карточка 3: Связь сна и пищеварительной лёгкости */}
      <div className="w-full bg-white rounded-2xl p-3 border border-white shadow-[0_2px_12px_rgba(15,23,42,0.04)] mb-2.5 text-left">
        <div className="flex items-center gap-2.5 mb-1">
          <img src={imgRelSleepDigestion} alt="Связь сна и пищеварительной лёгкости" className="w-7 h-7 shrink-0 object-contain select-none" />
          <span className="text-[12.5px] font-bold text-slate-800 leading-tight">
            {interconnections.sleepDigestion.title}
          </span>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed font-normal block w-full mt-1">
          {interconnections.sleepDigestion.description}
        </p>
      </div>
    </motion.div>
  );
}