import React from "react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";

interface MicroTabProps {
  key?: any;
  dayVitA: number;
  dayVitC: number;
  dayVitB9: number;
  dayVitE: number;
  dayVitK: number;
  dayIron: number;
  dayMagnesium: number;
  dayZinc: number;
  dayPotassium: number;
  dayLysine: number;
  daySelenium: number;
  hasPartialBookDishes?: boolean;
  realProfileCount?: number;
  hasAnyRealMicronutrientProfile?: boolean;
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
}

export default function MicroTab({
  dayVitA,
  dayVitC,
  dayVitB9,
  dayVitE,
  dayVitK,
  dayIron,
  dayMagnesium,
  dayZinc,
  dayPotassium,
  dayLysine,
  daySelenium,
  hasPartialBookDishes = false,
  realProfileCount = 0,
  hasAnyRealMicronutrientProfile = false,
  annaAnalysisText,
  recommendedAction,
}: MicroTabProps) {
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
          tabId="micro"
          tabName="Микронутриенты"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}

      {/* BUILD-1: neutral empty state — ни одно блюдо дня не имеет реального профиля */}
      {!hasAnyRealMicronutrientProfile && (
        <div className="bg-slate-50/70 border border-gray-150/70 rounded-[28px] p-5 text-left">
          <h2 className="text-[13px] font-black text-slate-850 tracking-tight mb-2 uppercase flex items-center gap-1.5 select-none font-sans">
            <span className="text-slate-400">🧬</span> Микроэлементы
          </h2>
          <p className="text-[12.5px] text-slate-600 leading-relaxed font-sans">
            Для блюд этого дня пока нет полного профиля микроэлементов.
          </p>
        </div>
      )}

      {/* BUILD-1: мягкая пометка об approved partial-блюдах при наличии реального профиля */}
      {hasAnyRealMicronutrientProfile && hasPartialBookDishes && (
        <div className="bg-amber-50/70 border border-amber-200/70 rounded-[28px] p-5 text-left">
          <h2 className="text-[13px] font-black text-slate-850 tracking-tight mb-2 uppercase flex items-center gap-1.5 select-none font-sans">
            <span className="text-amber-500">🔎</span> Микроэлементы
          </h2>
          <p className="text-[12.5px] text-slate-600 leading-relaxed font-sans">
            Для части блюд сегодня пока доступна КБЖУ-оценка. Полный профиль витаминов и минералов уточняется.
          </p>
        </div>
      )}

      {/* Vitamins grid with progress bars */}
      {hasAnyRealMicronutrientProfile && (
        <>
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
            <h2 className="text-[14px] font-black text-slate-800 tracking-tight uppercase flex items-center gap-1.5 select-none">
              <span className="text-emerald-500">🧬</span> ВИТАМИНЫ ДНЯ
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1 mb-4">
              Активация витаминов (% от дневной нормы)
            </p>

            <div className="grid grid-cols-2 gap-3.5">
              {[
                { name: "Витамин A", value: dayVitA, color: "bg-amber-400" },
                { name: "Витамин C", value: dayVitC, color: "bg-emerald-400" },
                { name: "Витамин B9", value: dayVitB9, color: "bg-sky-400" },
                { name: "Витамин E", value: dayVitE, color: "bg-indigo-400" },
                { name: "Витамин K", value: dayVitK, color: "bg-green-400" },
              ].map((v) => (
                <div key={v.name} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/80">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{v.name}</span>
                    <span className="text-sm font-bold text-slate-800">
                      {v.value >= 250 ? "250%+" : `${Math.round(v.value)}%`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${v.color}`}
                      style={{ width: `${Math.min(100, v.value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Minerals and supplements */}
          <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
            <h2 className="text-[14px] font-black text-slate-800 tracking-tight uppercase flex items-center gap-1.5 select-none">
              <span className="text-indigo-500">⚡</span> МИНЕРАЛЫ И АМИНОКИСЛОТЫ
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-1 mb-4">
              Биоактивный баланс (% от дневной нормы)
            </p>

            <div className="grid grid-cols-2 gap-3.5">
              {[
                { name: "Железо (Fe)", value: dayIron, color: "bg-rose-400" },
                { name: "Магний (Mg)", value: dayMagnesium, color: "bg-sky-400" },
                { name: "Цинк (Zn)", value: dayZinc, color: "bg-amber-400" },
                { name: "Калий (K)", value: dayPotassium, color: "bg-teal-400" },
                { name: "Лизин (L-Lysine)", value: dayLysine, color: "bg-purple-400" },
                { name: "Селен (Se)", value: daySelenium, color: "bg-emerald-400" },
              ].map((m) => (
                <div key={m.name} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/80">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-medium text-slate-700">{m.name}</span>
                    <span className="text-sm font-bold text-slate-800">
                      {m.value >= 250 ? "250%+" : `${Math.round(m.value)}%`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${m.color}`}
                      style={{ width: `${Math.min(100, m.value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Micro conclusions */}
      <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-4 text-left">
        <h3 className="text-sm font-bold text-slate-800 mb-2 flex items-center gap-1.5">
          <span>💡</span> ИНТЕГРАЦИЯ МИКРОНУТРИЕНТОВ
        </h3>
        <p className="text-sm leading-relaxed text-slate-600">
          Даже при частичной фиксации рациона, WFPB меню запускает мощное клеточное насыщение калием и магнием. Калий
          мгновенно снимает спазмы артериальных сосудов, а магний успокаивает психосоматический контур коры головного
          мозга.
        </p>
      </div>
    </motion.div>
  );
}
