import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import { resolveAvatarForTab, type StateNowTabId } from "../../utils/annaAvatarResolver";

interface AnnaTabSpoilerProps {
  tabId: StateNowTabId;
  tabName: string;
  analysisText: string;
  recommendedAction?: NextStepRecommendation;
}

// Маппинг пастельных тем под каждую вкладку
const TAB_THEMES: Record<StateNowTabId, {
  containerBg: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  actionText: string;
}> = {
  balance: {
    containerBg: "bg-[#F4FBF7]",
    badgeBg: "bg-emerald-100/80",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200/60",
    actionText: "text-emerald-700 hover:text-emerald-800",
  },
  scales: {
    containerBg: "bg-[#FFFDF5]",
    badgeBg: "bg-amber-100/80",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200/60",
    actionText: "text-amber-700 hover:text-amber-800",
  },
  kbju: {
    containerBg: "bg-[#FFF9F2]",
    badgeBg: "bg-orange-100/80",
    badgeText: "text-orange-800",
    badgeBorder: "border-orange-200/60",
    actionText: "text-orange-700 hover:text-orange-800",
  },
  micro: {
    containerBg: "bg-[#FFF5F7]",
    badgeBg: "bg-rose-100/80",
    badgeText: "text-rose-800",
    badgeBorder: "border-rose-200/60",
    actionText: "text-rose-700 hover:text-rose-800",
  },
  composition: {
    containerBg: "bg-[#F2FAF6]",
    badgeBg: "bg-teal-100/80",
    badgeText: "text-teal-800",
    badgeBorder: "border-teal-200/60",
    actionText: "text-teal-700 hover:text-teal-800",
  },
  dynamics: {
    containerBg: "bg-[#F0F7FF]",
    badgeBg: "bg-sky-100/80",
    badgeText: "text-sky-800",
    badgeBorder: "border-sky-200/60",
    actionText: "text-sky-700 hover:text-sky-800",
  },
};

export default function AnnaTabSpoiler({
  tabId,
  tabName,
  analysisText,
  recommendedAction,
}: AnnaTabSpoilerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const annaAvatar = resolveAvatarForTab(tabId);
  const theme = TAB_THEMES[tabId] ?? TAB_THEMES.balance;

  return (
    <div className={`${theme.containerBg} border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] rounded-[28px] p-3.5 sm:p-4 relative overflow-hidden font-sans antialiased text-slate-800 transition-colors duration-200`}>
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#16B551]/3 rounded-full blur-[20px] pointer-events-none" />
      
      {/* Шапка карточки */}
      <div className="flex items-center justify-between gap-3 relative z-10 w-full mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white shadow-xs shrink-0">
            <img 
              src={annaAvatar.src}
              alt="Анна советует" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[14px] font-bold text-slate-800 leading-tight">Анна</span>
            <span className="text-[11px] text-slate-500 font-medium leading-tight">Советник WFPB</span>
          </div>
        </div>

        <span className={`whitespace-nowrap px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${theme.badgeBg} ${theme.badgeText} border ${theme.badgeBorder} select-none shrink-0`}>
          {tabName}
        </span>
      </div>

      {/* Текстовый блок на всю ширину плашки */}
      <div className="w-full relative z-10 text-left">
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div 
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(true)} 
              className="cursor-pointer group text-left"
            >
              <div className="bg-white rounded-2xl p-3.5 shadow-xs border border-slate-100/80 w-full">
                <p className="text-[12.5px] sm:text-[13px] text-slate-700 leading-relaxed font-normal line-clamp-2">
                  {analysisText}
                </p>
              </div>
              <div className="flex justify-end mt-2.5">
                <button 
                  type="button"
                  className={`flex items-center gap-1 text-[11.5px] font-extrabold ${theme.actionText} transition-colors bg-transparent border-none p-0 cursor-pointer`}
                >
                  <span>Читать полный разбор</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="expanded"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="space-y-3 text-left w-full"
            >
              <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100/80 w-full">
                <p className="text-[12.5px] sm:text-[13px] text-slate-700 leading-relaxed font-normal whitespace-pre-line">
                  {analysisText}
                </p>
              </div>

              <div className="flex justify-end mt-2.5">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsExpanded(false);
                  }}
                  className="flex items-center gap-1 text-[11.5px] font-extrabold text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-0 cursor-pointer"
                >
                  <span>Скрыть аналитический разбор</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}