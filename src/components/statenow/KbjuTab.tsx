import React from "react";
import { Flame } from "lucide-react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-5 pb-36"
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
      {/* Summary card - СУММАРНЫЙ ПИЩЕВОЙ ИТОГ ДНЯ */}
      <div className="bg-gradient-to-br from-white via-white to-emerald-50/20 rounded-[32px] p-6 text-left relative overflow-hidden border border-emerald-100/50 shadow-[0_12px_36px_-8px_rgba(16,185,129,0.04),_0_2px_14px_rgba(0,0,0,0.015)]">
        <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-emerald-100/40 rounded-full blur-[24px] pointer-events-none" />

        <div className="flex items-center justify-between mb-4 border-b border-emerald-50 pb-3">
          <h2 className="text-[13px] font-black tracking-wide flex items-center gap-1.5 select-none font-sans text-slate-800 uppercase">
            <Flame className="w-4 h-4 text-emerald-500 shrink-0" /> СУММАРНЫЙ ПИЩЕВОЙ ИТОГ ДНЯ
          </h2>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100/80 px-2.5 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
            WFPB КБЖУ
          </span>
        </div>

        {totalCalories > 0 ? (
          <div className="grid grid-cols-5 gap-1.5 text-center">
            <div className="flex flex-col items-center">
              <span className="text-xl font-extrabold text-emerald-600 block leading-none">{totalCalories}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 block tracking-wide">Ккал</span>
            </div>
            <div className="flex flex-col items-center border-l border-slate-100">
              <span className="text-base font-bold text-blue-600 block leading-none">{totalProtein}г</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 block tracking-wide leading-tight">
                Белки
                <br />
                (г)
              </span>
            </div>
            <div className="flex flex-col items-center border-l border-slate-100">
              <span className="text-base font-bold text-amber-600 block leading-none">{totalFat}г</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 block tracking-wide leading-tight">
                Жиры
                <br />
                (г)
              </span>
            </div>
            <div className="flex flex-col items-center border-l border-slate-100">
              <span className="text-base font-bold text-indigo-600 block leading-none">{totalCarbohydrates}г</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 block tracking-wide leading-tight">
                Углеводы
                <br />
                (г)
              </span>
            </div>
            <div className="flex flex-col items-center border-l border-slate-100">
              <span className="text-base font-bold text-teal-600 block leading-none">{totalFiber}г</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 block tracking-wide leading-tight">
                Волокна
                <br />
                (г)
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 px-2 rounded-2xl bg-slate-50/70 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center mx-auto mb-2.5 shadow-sm">
              <Flame className="w-5 h-5 text-slate-300" />
            </div>
            <span className="text-[13px] text-slate-700 font-bold block">Рацион пока не зафиксирован</span>
            <p className="text-[12px] text-slate-400 mt-1 leading-snug">Отметьте приготовление блюд в других экранах приложения, чтобы увидеть КБЖУ.</p>
          </div>
        )}

        <div className="mt-4 rounded-2xl bg-emerald-50/70 border border-emerald-100/60 px-3.5 py-2.5 flex gap-2 items-start">
          <span className="text-[13px] leading-none mt-0.5">🌱</span>
          <p className="text-[11px] leading-relaxed font-medium text-slate-600">
            <span className="text-emerald-700 font-bold">Пищевые волокна</span> защищают стенки желудка и питают полезную микробиоту.{" "}
            <span className="text-emerald-700 font-bold">Без соли</span> — бережная защита от отёков и раздражения кишечника.
          </p>
        </div>
      </div>

      {/* Nutrient quality cards - 2x2 grid */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white rounded-3xl p-4 border border-blue-100/70 text-left shadow-[0_4px_20px_rgba(59,130,246,0.06)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Белок</span>
          </div>
          <span className="text-[22px] font-black text-slate-900 block leading-none tracking-tight">{totalProtein} г</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 block">высокой чистоты</span>
          <p className="text-[11px] text-slate-500 mt-2 leading-snug">Источники: бобовые, нут, чечевица, тофу, крупы</p>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-amber-100/70 text-left shadow-[0_4px_20px_rgba(245,158,11,0.06)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">Растительные жиры</span>
          </div>
          <span className="text-[22px] font-black text-slate-900 block leading-none tracking-tight">{totalFat} г</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 block">омега-баланс</span>
          <p className="text-[11px] text-slate-500 mt-2 leading-snug">Источники: семена льна, миндаль, авокадо</p>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-indigo-100/70 text-left shadow-[0_4px_20px_rgba(99,102,241,0.06)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Медленные углеводы</span>
          </div>
          <span className="text-[22px] font-black text-slate-900 block leading-none tracking-tight">{totalCarbohydrates} г</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 block">низкий ГИ</span>
          <p className="text-[11px] text-slate-500 mt-2 leading-snug">Сложные углеводы с низким ГИ для стабильной энергии</p>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-teal-100/70 text-left shadow-[0_4px_20px_rgba(20,184,166,0.06)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-teal-500" />
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
            <span className="text-[10px] font-black text-teal-600 uppercase tracking-wider">Качественная клетчатка</span>
          </div>
          <span className="text-[22px] font-black text-teal-700 block leading-none tracking-tight">{totalFiber} г</span>
          <span className="text-[10px] font-bold text-teal-600/70 uppercase tracking-wide mt-0.5 block">WFPB волокно</span>
          <p className="text-[11px] text-slate-500 mt-2 leading-snug">Терапевтическое волокно для микробиоты и детокса</p>
        </div>
      </div>

      {/* ЗОЛОТОЕ СЕЧЕНИЕ WFPB */}
      <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/70 border-emerald-100/80 border rounded-[28px] p-5 text-left relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-emerald-100/30 rounded-full blur-[18px] pointer-events-none" />
        <h3 className="text-[13px] font-black text-slate-800 mb-2.5 uppercase select-none tracking-wide flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-white border border-emerald-100 flex items-center justify-center text-[13px] shadow-sm shrink-0">
            ⚖️
          </span>
          ЗОЛОТОЕ СЕЧЕНИЕ WFPB
        </h3>
        <p className="text-sm leading-relaxed text-slate-700">
          В цельном растительном питании энергия поступает вместе со сложными пищевыми сетками (клетчаткой). Распад глюкозы идёт медленно и
          сберегающе — без инсулиновых спайков, бережно сохраняя ресурс поджелудочной железы и даря ровную энергию на весь день.
        </p>
      </div>
    </motion.div>
  );
}
