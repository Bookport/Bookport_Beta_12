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
import type { CalorieGoalResult } from "../../utils/calorieGoal";

interface KbjuTabProps {
  key?: any;
  totalCalories: number;
  totalProtein: number;
  totalFat: number;
  totalCarbohydrates: number;
  totalFiber: number;
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
  calorieGoal?: CalorieGoalResult;
}

export default function KbjuTab({
  totalCalories,
  totalProtein,
  totalFat,
  totalCarbohydrates,
  totalFiber,
  annaAnalysisText,
  recommendedAction,
  calorieGoal,
}: KbjuTabProps) {
  const calTarget = calorieGoal?.targetCalories ?? 2000;
  const proteinTarget = calorieGoal?.targetProtein ?? 70;
  const fatTarget = calorieGoal?.targetFat ?? 65;
  const carbsTarget = calorieGoal?.targetCarbs ?? 275;
  const fiberTarget = calorieGoal?.targetFiber ?? 30;

  // Реальные физиологические проценты без фиктивного потолка 100%
  const calPct = totalCalories > 0 ? Math.round((totalCalories / calTarget) * 100) : 0;
  const proteinPct = totalProtein > 0 ? Math.round((totalProtein / proteinTarget) * 100) : 0;
  const fatPct = totalFat > 0 ? Math.round((totalFat / fatTarget) * 100) : 0;
  const carbsPct = totalCarbohydrates > 0 ? Math.round((totalCarbohydrates / carbsTarget) * 100) : 0;
  const fiberPct = totalFiber > 0 ? Math.round((totalFiber / fiberTarget) * 100) : 0;

  // Безопасная ширина для полос прогресса (0-100%)
  const calBarWidth = Math.min(100, calPct);
  const proteinBarWidth = Math.min(100, proteinPct);
  const fatBarWidth = Math.min(100, fatPct);
  const carbsBarWidth = Math.min(100, carbsPct);
  const fiberBarWidth = Math.min(100, fiberPct);

  const isCalorieSurplus = totalCalories > calTarget * 1.05;
  const calDiff = Math.abs(totalCalories - calTarget);

  const goldenRatio = evaluateWfpbGoldenRatio(
    totalCalories,
    totalProtein,
    totalFat,
    totalCarbohydrates,
    totalFiber
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-3.5 pb-5 w-full"
    >
      {/* 0. Аналитический спойлер Анны */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler
          tabId="kbju"
          tabName="КБЖУ питание"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}

      {/* 1. Карточка КАЛОРАЖ ДНЯ */}
      <div className="w-full bg-gradient-to-br from-white via-white to-emerald-50/20 rounded-[28px] p-4 text-left relative overflow-hidden border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
        {/* Шапка карточки */}
        <div className="flex items-start justify-between gap-2 mb-2 w-full">
          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
            <img src={imgZeroCalorieDrop} alt="" className="w-4 h-4 object-contain select-none shrink-0" />
            <h2 className="text-[12px] font-black tracking-wider uppercase text-slate-700 whitespace-nowrap">
              КАЛОРАЖ ДНЯ
            </h2>
          </div>

          {/* Компактный вертикальный стек чипсов справа */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            {/* 1. Чипс статуса нормы/профицита */}
            {totalCalories === 0 ? (
              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-[1px] rounded-full uppercase shrink-0 whitespace-nowrap leading-tight">
                ОЖИДАНИЕ ФИКСАЦИИ
              </span>
            ) : isCalorieSurplus ? (
              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200/70 px-2 py-[1px] rounded-full uppercase shrink-0 whitespace-nowrap leading-tight">
                {calPct}% (+{calDiff} ккал)
              </span>
            ) : (
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-[1px] rounded-full uppercase shrink-0 whitespace-nowrap leading-tight">
                {calPct}% нормы
              </span>
            )}

            {/* 2. Микро-чипс вектора цели */}
            {calorieGoal?.goalLabel && (
              <span className="text-[8.5px] font-semibold text-slate-500 bg-slate-50 border border-slate-200/60 px-1.5 py-[0.5px] rounded-md uppercase tracking-wider shrink-0 whitespace-nowrap leading-tight">
                {calorieGoal.goalLabel}
              </span>
            )}
          </div>
        </div>

        {totalCalories === 0 ? (
          <div className="text-center py-2.5">
            <div className="w-11 h-11 rounded-full bg-white border border-slate-100/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center justify-center mx-auto mb-2">
              <img src={imgZeroCalorieDrop} alt="Калории" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-[12.5px] font-bold text-slate-800 block mb-0.5">Рацион пока не зафиксирован</span>
            <p className="text-[10.5px] text-slate-400 max-w-[240px] mx-auto leading-snug">
              Приготовьте и зафиксируйте блюда Системой, чтобы увидеть калораж и макронутриенты.
            </p>
          </div>
        ) : (
          <div className="text-center py-1">
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-[28px] font-black text-slate-800 leading-none tracking-tight">
                {totalCalories.toLocaleString("ru-RU")}
              </span>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">ккал</span>
            </div>

            <div className="h-2 w-full bg-slate-100/90 rounded-full mt-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCalorieSurplus ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${calBarWidth}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2 px-0.5">
              <span className="text-[10px] font-medium text-slate-400">0 ккал</span>

              {/* Акцентный ориентир нормы */}
              <div className="flex items-baseline gap-1 text-slate-700 bg-slate-100/70 border border-slate-200/60 px-2.5 py-0.5 rounded-full">
                <span className="text-[10px] font-bold text-slate-400 uppercase">норма</span>
                <span className="text-[13px] font-black text-slate-800 tracking-tight">
                  {calTarget.toLocaleString("ru-RU")}
                </span>
                <span className="text-[10px] font-bold text-slate-500">ккал</span>
              </div>

              <span className={`text-[10.5px] font-bold tracking-tight uppercase ${isCalorieSurplus ? "text-amber-600" : "text-slate-400"}`}>
                {isCalorieSurplus ? `профицит` : `${calTarget} ккал`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Сетка 4 макронутриентов */}
      <div className="grid grid-cols-2 gap-2.5 w-full">
        {/* БЕЛКИ */}
        <div className="bg-[#F4F6FF] p-3 rounded-2xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">БЕЛКИ</span>
            <span
              className={`text-[10.5px] font-black shrink-0 whitespace-nowrap ${
                proteinPct > 115 ? "text-indigo-700 font-extrabold" : "text-indigo-600"
              }`}
            >
              {proteinPct}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="min-w-0">
              <span className="text-[18px] font-black text-slate-800 leading-none block shrink-0 whitespace-nowrap">
                {totalProtein} г
              </span>
              <span className="text-[10px] font-medium text-slate-400 mt-0.5 block shrink-0 whitespace-nowrap">
                из {proteinTarget} г
              </span>
            </div>
            <img src={imgProtein} alt="Белки" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs select-none" />
          </div>
          <div className="h-1.5 w-full bg-indigo-100/60 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${proteinBarWidth}%` }} />
          </div>
          <p className="text-[9.5px] text-slate-500 leading-tight mt-1.5 line-clamp-1">бобовые, тофу, крупы</p>
        </div>

        {/* ЖИРЫ */}
        <div className="bg-[#FFFBF0] p-3 rounded-2xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">ЖИРЫ</span>
            <span
              className={`text-[10.5px] font-black shrink-0 whitespace-nowrap ${
                fatPct > 115 ? "text-amber-700 font-extrabold" : "text-amber-600"
              }`}
            >
              {fatPct}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="min-w-0">
              <span className="text-[18px] font-black text-slate-800 leading-none block shrink-0 whitespace-nowrap">
                {totalFat} г
              </span>
              <span className="text-[10px] font-medium text-slate-400 mt-0.5 block shrink-0 whitespace-nowrap">
                из {fatTarget} г
              </span>
            </div>
            <img src={imgFat} alt="Жиры" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs select-none" />
          </div>
          <div className="h-1.5 w-full bg-amber-100/60 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${fatPct > 115 ? "bg-amber-600" : "bg-amber-500"}`}
              style={{ width: `${fatBarWidth}%` }}
            />
          </div>
          <p className="text-[9.5px] text-slate-500 leading-tight mt-1.5 line-clamp-1">лён, миндаль, авокадо</p>
        </div>

        {/* УГЛЕВОДЫ */}
        <div className="bg-[#F0F9FF] p-3 rounded-2xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">УГЛЕВОДЫ</span>
            <span className="text-[10.5px] font-black text-sky-600 shrink-0 whitespace-nowrap">{carbsPct}%</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="min-w-0">
              <span className="text-[18px] font-black text-slate-800 leading-none block shrink-0 whitespace-nowrap">
                {totalCarbohydrates} г
              </span>
              <span className="text-[10px] font-medium text-slate-400 mt-0.5 block shrink-0 whitespace-nowrap">
                из {carbsTarget} г
              </span>
            </div>
            <img src={imgCarbs} alt="Углеводы" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs select-none" />
          </div>
          <div className="h-1.5 w-full bg-sky-100/60 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full" style={{ width: `${carbsBarWidth}%` }} />
          </div>
          <p className="text-[9.5px] text-slate-500 leading-tight mt-1.5 line-clamp-1">крупы, овощи, фрукты</p>
        </div>

        {/* КЛЕТЧАТКА */}
        <div className="bg-[#F0FDF4] p-3 rounded-2xl border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">КЛЕТЧАТКА</span>
            <span className="text-[10.5px] font-black text-emerald-600 shrink-0 whitespace-nowrap">{fiberPct}%</span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-2">
            <div className="min-w-0">
              <span className="text-[18px] font-black text-slate-800 leading-none block shrink-0 whitespace-nowrap">
                {totalFiber} г
              </span>
              <span className="text-[10px] font-medium text-slate-400 mt-0.5 block shrink-0 whitespace-nowrap">
                из {fiberTarget} г
              </span>
            </div>
            <img src={imgFiber} alt="Клетчатка" className="w-8 h-8 object-contain shrink-0 drop-shadow-xs select-none" />
          </div>
          <div className="h-1.5 w-full bg-emerald-100/60 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${fiberBarWidth}%` }} />
          </div>
          <p className="text-[9.5px] text-slate-500 leading-tight mt-1.5 line-clamp-1">WFPB волокна для микробиоты</p>
        </div>
      </div>

      {/* 3. ЗОЛОТОЕ СЕЧЕНИЕ WFPB */}
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
        <p className="text-[11px] text-slate-600 leading-relaxed font-normal w-full pt-1.5 border-t border-amber-100/60 mt-1.5">
          {goldenRatio.description}
        </p>
      </div>
    </motion.div>
  );
}