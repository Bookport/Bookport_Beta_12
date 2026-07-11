import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Brain } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import { resolveAvatarForTab, type StateNowTabId } from "../../utils/annaAvatarResolver";

interface AnnaTabSpoilerProps {
  tabId: StateNowTabId;
  tabName: string;
  analysisText: string;
  recommendedAction: NextStepRecommendation;
}

export default function AnnaTabSpoiler({
  tabId,
  tabName,
  analysisText,
  recommendedAction,
}: AnnaTabSpoilerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const annaAvatar = resolveAvatarForTab(tabId);

  return (
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

        <div className="flex-1 text-left font-sans">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex flex-col">
              <span className="text-[15px] font-black text-slate-900 leading-none">Анна</span>
              <span className="text-[11px] font-bold text-slate-400 mt-1 leading-none">Советник WFPB</span>
            </div>
            <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50/70 border border-emerald-100/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
              Анализ • {tabName}
            </span>
          </div>

          <div className="mt-2.5">
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
                  <p className="text-[13px] sm:text-[13.5px] text-slate-650 leading-relaxed font-semibold hover:text-slate-850 transition-colors">
                    «Твои показатели за сегодня по вкладке "{tabName}" имеют важные взаимосвязи. Давай разберем, о чем говорят эти цифры...»
                  </p>
                  <button 
                    type="button"
                    className="mt-2 flex items-center gap-1 text-[11.5px] font-extrabold text-[#10B981] hover:text-[#0c9063] transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    <span>Читать полный разбор</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="expanded"
                  initial={{ opacity: 0-0.1, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="space-y-4 text-left"
                >
                  <p className="text-[13px] sm:text-[13.5px] text-slate-750 leading-relaxed font-semibold whitespace-pre-line">
                    {analysisText}
                  </p>

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
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(false);
                    }}
                    className="flex items-center gap-1 text-[11.5px] font-extrabold text-slate-400 hover:text-slate-600 transition-colors bg-transparent border-none p-0 cursor-pointer"
                  >
                    <span>Скрыть аналитический разбор</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
