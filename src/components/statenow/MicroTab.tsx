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
  annaAnalysisText,
  recommendedAction,
}: MicroTabProps) {
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
          tabId="micro"
          tabName="Микронутриенты"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}
      {/* Vitamins grid with progress bars */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
        <h2 className="text-[14px] font-black text-slate-850 tracking-tight mb-4 uppercase flex items-center gap-1.5 select-none font-sans">
          <span className="text-emerald-500">🧬</span> Витамины дня
        </h2>
        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3 font-mono">АКТИВАЦИЯ ВИТАМИНОВ (% ОТ ДНЕВНОЙ НОРМЫ)</span>
        
        <div className="grid grid-cols-2 gap-3.5">
          {[
            { name: "Витамин A", value: dayVitA, color: "bg-amber-400" },
            { name: "Витамин C", value: dayVitC, color: "bg-emerald-450" },
            { name: "Витамин B9", value: dayVitB9, color: "bg-sky-400" },
            { name: "Витамин E", value: dayVitE, color: "bg-indigo-400" },
            { name: "Витамин K", value: dayVitK, color: "bg-green-400" }
          ].map(v => (
            <div key={v.name} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/80">
              <div className="flex justify-between items-center text-[11.5px] font-bold text-slate-650 mb-1.5 font-sans">
                <span>{v.name}</span>
                <span className="font-mono text-slate-750 font-black">{Math.round(v.value)}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full ${v.color}`} style={{ width: `${Math.min(100, v.value)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Minerals and supplements */}
      <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_24px_rgba(43,49,55,0.02)] p-5 text-left">
        <h2 className="text-[14px] font-black text-slate-850 tracking-tight mb-4 uppercase flex items-center gap-1.5 select-none font-sans">
          <span className="text-indigo-500">⚡</span> Минералы и аминокислоты
        </h2>
        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3 font-mono">БИОАКТИВНЫЙ БАЛАНС (% ОТ ДНЕВНОЙ НОРМЫ)</span>
        
        <div className="grid grid-cols-2 gap-3.5">
          {[
            { name: "Железо (Fe)", value: dayIron, color: "bg-rose-400" },
            { name: "Магний (Mg)", value: dayMagnesium, color: "bg-sky-400" },
            { name: "Цинк (Zn)", value: dayZinc, color: "bg-amber-400" },
            { name: "Калий (K)", value: dayPotassium, color: "bg-teal-400" },
            { name: "Лизин (L-Lysine)", value: dayLysine, color: "bg-purple-400" },
            { name: "Селен (Se)", value: daySelenium, color: "bg-emerald-400" }
          ].map(m => (
            <div key={m.name} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100/80">
              <div className="flex justify-between items-center text-[11.5px] font-bold text-slate-650 mb-1.5 font-sans">
                <span>{m.name}</span>
                <span className="font-mono text-slate-750 font-black">{Math.round(m.value)}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className={`h-full ${m.color}`} style={{ width: `${Math.min(100, m.value)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Micro conclusions */}
      <div className="bg-white rounded-[28px] border border-gray-150/60 p-5 text-left">
        <h3 className="text-[13px] font-black text-slate-800 mb-2 uppercase select-none font-sans">💡 Интеграция микронутриентов</h3>
        <p className="text-[12px] text-slate-500 leading-relaxed font-sans">
          Даже при частичной фиксации рациона, WFPB меню запускает мощное клеточное насыщение калием и магнием. Калий мгновенно снимает спазмы артериальных сосудов, а магний успокаивает психосоматический контур коры головного мозга.
        </p>
      </div>
    </motion.div>
  );
}
