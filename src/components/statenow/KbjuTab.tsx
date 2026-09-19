import React from "react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import imgZeroCalorieDrop from "../../assets/images/SOST/balance/12.webp"; // бирюзовая капля в круг
import imgProtein from "../../assets/images/SOST/balance/16.webp"; // белки (фасоль с колоском)
import imgFat from "../../assets/images/SOST/balance/15.webp"; // жиры (авокадо с личиком)
import imgCarbs from "../../assets/images/SOST/balance/17.webp"; // углеводы (зеленый лист)
import imgFiber from "../../assets/images/SOST/balance/14.webp"; // клетчатка (стручок гороха)
import imgGoldenRatio from "../../assets/images/SOST/balance/13.webp"; // золотые весы
import { evaluateWfpbGoldenRatio } from "../../utils/wfpbGoldenRatioEngine";

interface KbjuTabProps {
  key?: any;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbohydrates: number;
  totalFiber: number;
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
}

export default function KbjuTab({
  totalCalories,
  totalProtein,
  totalFat,
  totalCarbohydrates,
  totalFiber,
  annaAnalysisText,
  recommendedAction,
}: KbjuTabProps) {
  const calTarget = 2000;
  const calPct = Math.min(100, Math.round((totalCalories / calTarget) * 100));
  const goldenRatio = evaluateWfpbGoldenRatio(
    totalCalories,
    totalProtein,
    totalFat,
    totalCarbohydrates,
    totalFiber
  );

  const proteinPct = Math.min(100, Math.round((totalProtein / 70) * 100));
  const fatPct = Math.min(100, Math.round((totalFat / 65) * 100));
  const carbsPct = Math.min(100, Math.round((totalCarbohydrates / 275) * 100));
  const fiberPct = Math.min(100, Math.round((totalFiber / 30) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5 pb-36 w-full max-w-[360px] mx-auto"
    >
      {/* 0. Anna's Tab Spoiler Analysis */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler
          tabId="kbju"
          tabName="КБЖУ питание"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}
      {/* Большая верхняя карточка КАЛОРАЖ ДНЯ */}
      <div className="w-full bg-gradient-to-br from-white via-white to-emerald-50/20 rounded-[32px] p-4 sm:p-5 text-left relative overflow-hidden border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        {/* Шапка карточки */}
        <div className="flex items-center justify-between mb-3 w-full">
          <div className="flex items-center gap-1.5">
            <img src={imgZeroCalorieDrop} alt="" className="w-4 h-4 object-contain" />
            <h2 className="text-[13px] font-black tracking-wide uppercase text-slate-700">КАЛОРАЖ ДНЯ</h2>
          </div>
          {totalCalories > 0 ? (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full uppercase whitespace-nowrap">
              {calPct}% нормы
            </span>
          ) : (
            <span className="text-[10px] font-bold text-teal-800 bg-[#D7F3E5]/70 border border-teal-200/50 px-2.5 py-0.5 rounded-full whitespace-nowrap">
              нет данных
            </span>
          )}
        </div>

        {totalCalories === 0 ? (
          <div className="text-center py-2">
            <div className="w-12 h-12 rounded-full bg-white border border-slate-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center mx-auto mb-2.5">
              <img src={imgZeroCalorieDrop} alt="Калории" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-[13px] font-bold text-slate-800 block mb-1">Рацион пока не зафиксирован</span>
            <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto leading-snug">
              Отметьте приготовление блюд, чтобы увидеть калораж и баланс нутриентов.
            </p>
          </div>
        ) : (
          <div className="text-center py-1">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-[28px] font-black text-slate-800 leading-none">{totalCalories}</span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">ккал</span>
            </div>
            <div className="h-1.5 w-full bg-white/70 rounded-full mt-2.5 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${calPct}%` }} />
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1.5">из {calTarget} ккал нормы</p>
          </div>
        )}

        {/* Нижняя плашка */}
        <div className="mt-3 rounded-2xl bg-[#E8F7EE]/70 border border-emerald-100/60 p-3 text-left">
          <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
            <strong className="text-emerald-800 font-bold">Пищевые волокна</strong> защищают стенки желудка и питают полезную микробиоту.{" "}
            <strong className="text-emerald-800 font-bold">Без соли</strong> — бережная защита от отёков и раздражения кишечника.
          </p>
        </div>
      </div>

      {/* Сетка 4 макронутриентов */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        {/* БЕЛКИ */}
        <div className="bg-[#F4F6FF] p-2.5 sm:p-3 rounded-2xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase">БЕЛКИ</span>
            <span className="text-[10.5px] font-black text-indigo-600">{proteinPct}%</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="min-w-0">
              <span className="text-[18px] font-black text-slate-800 leading-none block">{totalProtein} г</span>
              <span className="text-[10.5px] font-medium text-slate-400 mt-0.5 block">из 70 г</span>
            </div>
            <img src={imgProtein} alt="Белки" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs select-none" />
          </div>
          <div className="h-1.5 w-full bg-white/70 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${proteinPct}%` }} />
          </div>
          <p className="text-[9.5px] text-slate-500 leading-tight mt-1 line-clamp-1">бобовые, тофу, крупы</p>
        </div>

        {/* ЖИРЫ */}
        <div className="bg-[#FFFBF0] p-2.5 sm:p-3 rounded-2xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase">ЖИРЫ</span>
            <span className="text-[10.5px] font-black text-amber-600">{fatPct}%</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="min-w-0">
              <span className="text-[18px] font-black text-slate-800 leading-none block">{totalFat} г</span>
              <span className="text-[10.5px] font-medium text-slate-400 mt-0.5 block">из 65 г</span>
            </div>
            <img src={imgFat} alt="Жиры" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs select-none" />
          </div>
          <div className="h-1.5 w-full bg-white/70 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${fatPct}%` }} />
          </div>
          <p className="text-[9.5px] text-slate-500 leading-tight mt-1 line-clamp-1">лён, миндаль, авокадо</p>
        </div>

        {/* УГЛЕВОДЫ */}
        <div className="bg-[#F0F9FF] p-2.5 sm:p-3 rounded-2xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase">УГЛЕВОДЫ</span>
            <span className="text-[10.5px] font-black text-sky-600">{carbsPct}%</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="min-w-0">
              <span className="text-[18px] font-black text-slate-800 leading-none block">{totalCarbohydrates} г</span>
              <span className="text-[10.5px] font-medium text-slate-400 mt-0.5 block">из 275 г</span>
            </div>
            <img src={imgCarbs} alt="Углеводы" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs select-none" />
          </div>
          <div className="h-1.5 w-full bg-white/70 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${carbsPct}%` }} />
          </div>
          <p className="text-[9.5px] text-slate-500 leading-tight mt-1 line-clamp-1">крупы, овощи, фрукты</p>
        </div>

        {/* КЛЕТЧАТКА */}
        <div className="bg-[#F0FDF4] p-2.5 sm:p-3 rounded-2xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase">КЛЕТЧАТКА</span>
            <span className="text-[10.5px] font-black text-emerald-600">{fiberPct}%</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5">
            <div className="min-w-0">
              <span className="text-[18px] font-black text-slate-800 leading-none block">{totalFiber} г</span>
              <span className="text-[10.5px] font-medium text-slate-400 mt-0.5 block">из 30 г</span>
            </div>
            <img src={imgFiber} alt="Клетчатка" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs select-none" />
          </div>
          <div className="h-1.5 w-full bg-white/70 rounded-full mt-1.5 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fiberPct}%` }} />
          </div>
          <p className="text-[9.5px] text-slate-500 leading-tight mt-1 line-clamp-1">WFPB волокна для микробиоты</p>
        </div>
      </div>

      {/* ЗОЛОТОЕ СЕЧЕНИЕ WFPB */}
      <div className="w-full p-3.5 rounded-2xl bg-[#FFFDF5] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
        <div className="flex items-center gap-2.5 mb-2 w-full">
          <img src={imgGoldenRatio} alt="Золотое сечение WFPB" className="w-8 h-8 shrink-0 object-contain select-none" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-[10.5px] font-bold uppercase tracking-wider text-slate-700 truncate">
                Золотое сечение WFPB
              </h3>
              <span
                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0 border ${goldenRatio.badgeBg} ${goldenRatio.badgeText} ${goldenRatio.badgeBorder}`}
              >
                {goldenRatio.badge}
              </span>
            </div>
            <p className="text-[12.5px] font-bold text-slate-800 leading-tight mt-0.5">{goldenRatio.ratioString}</p>
          </div>
        </div>
        <p className="text-[11.5px] text-slate-600 leading-relaxed font-normal w-full pt-1.5 border-t border-amber-100/60 mt-1.5">
          {goldenRatio.description}
        </p>
      </div>
    </motion.div>
  );
}
