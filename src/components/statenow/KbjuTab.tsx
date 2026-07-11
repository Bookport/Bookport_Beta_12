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
      className="space-y-5"
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
      {/* Light premium dynamic KBJU card */}
      <div className="bg-gradient-to-br from-white via-white to-emerald-50/20 rounded-[32px] p-6 text-left relative overflow-hidden border border-emerald-100/50 shadow-[0_12px_36px_-8px_rgba(16,185,129,0.04),_0_2px_14px_rgba(0,0,0,0.015)]">
        <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-emerald-100/40 rounded-full blur-[24px] pointer-events-none" />

        <div className="flex items-center justify-between mb-4 border-b border-emerald-50 pb-3">
          <h2 className="text-[14.5px] font-bold tracking-tight flex items-center gap-1.5 select-none font-sans text-slate-800">
            <Flame className="w-4 h-4 text-emerald-500" /> Суммарный пищевой итог дня
          </h2>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
            WFPB КБЖУ
          </span>
        </div>

        {totalCalories > 0 ? (
          <div className="grid grid-cols-5 gap-1 text-center">
            <div>
              <span className="text-[19px] font-bold text-emerald-600 block leading-none">{totalCalories}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Ккал</span>
            </div>
            <div className="border-l border-slate-100">
              <span className="text-[17px] font-bold text-slate-800 block leading-none">{totalProtein}г</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Белки</span>
            </div>
            <div className="border-l border-slate-100">
              <span className="text-[17px] font-bold text-slate-800 block leading-none">{totalFat}г</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Жиры</span>
            </div>
            <div className="border-l border-slate-100">
              <span className="text-[17px] font-bold text-slate-800 block leading-none">{totalCarbohydrates}г</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase mt-1 block">Углев.</span>
            </div>
            <div className="border-l border-slate-100">
              <span className="text-[17px] font-bold text-emerald-600 block leading-none">{totalFiber}г</span>
              <span className="text-[9px] font-extrabold text-emerald-500 uppercase mt-1 block font-semibold">Волокна</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <span className="text-[13px] text-slate-400 font-bold">Рацион пока не зафиксирован</span>
            <p className="text-[11px] text-slate-400 mt-1">Отметьте приготовление блюд в других экранах приложения.</p>
          </div>
        )}

        <p className="text-[10.5px] text-slate-500 leading-relaxed font-sans font-medium mt-4 pt-3 border-t border-emerald-50/60">
          ⚡ <span className="text-emerald-700 font-semibold">Интенсивные пищевые волокна</span> вошедших блюд защищают стенки желудка и нежно питают полезную микробиоту. <span className="text-emerald-700 font-semibold">Исключение соли</span> уберегает кишечную стенку от раздражения и накопления избыточной жидкости.
        </p>
      </div>

      {/* Visual Cards representing macro breakdown */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white rounded-3xl p-4 border border-slate-100 text-left">
          <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider font-mono">Белок высокой чистоты</span>
          <span className="text-[20px] font-black text-slate-850 mt-1 block">{totalProtein} г</span>
          <p className="text-[11px] text-gray-400 mt-1 leading-snug">Полный набор аминокислот из бобовых (нут, чечевица, тофу) и цельных круп.</p>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-100 text-left">
          <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider font-mono">Растительные жиры</span>
          <span className="text-[20px] font-black text-slate-850 mt-1 block">{totalFat} г</span>
          <p className="text-[11px] text-gray-400 mt-1 leading-snug">Липиды из семян льна, миндаля, кешью и кунжута для здоровья печени и мозга.</p>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-100 text-left">
          <span className="text-[10px] font-black text-slate-400 uppercase block tracking-wider font-mono">Медленные углеводы</span>
          <span className="text-[20px] font-black text-slate-850 mt-1 block">{totalCarbohydrates} г</span>
          <p className="text-[11px] text-gray-400 mt-1 leading-snug">Цельные углеводы с низким гликемическим индексом питают мозг ровной энергией.</p>
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-100/85 text-left">
          <span className="text-[10px] font-black text-emerald-600 uppercase block tracking-wider font-mono">Качественная клетчатка</span>
          <span className="text-[20px] font-black text-emerald-600 mt-1 block">{totalFiber} г</span>
          <p className="text-[11px] text-gray-400 mt-1 leading-snug">Терапевтическое волокно WFPB выводит токсины и снижает уровень сахара.</p>
        </div>
      </div>

      {/* Explanatory block on minerals and macro balances */}
      <div className="bg-white rounded-[28px] border border-gray-150/60 p-5 text-left">
        <h3 className="text-[13px] font-black text-slate-800 mb-2 uppercase select-none font-sans">⚖️ Золотое сечение WFPB питания</h3>
        <p className="text-[12px] text-slate-500 leading-relaxed font-sans">
          В цельном растительном питании энергия поступает напрямую со сложными пищевыми сетками (клетчаткой). Из-за этого распад молекул глюкозы происходит медленно и сберегающе, не вызывая инсулиновых спайков и бережно сохраняя ресурс вашей поджелудочной железы.
        </p>
      </div>
    </motion.div>
  );
}
