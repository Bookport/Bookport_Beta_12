import React from "react";
import { User, Search, Moon, Sun, X } from "lucide-react";

interface DiaryHeaderProps {
  onBack: () => void;
  onToggleProfileModal: () => void;
  onToggleSearch: () => void;
  onToggleNightMode: () => void;
  currentName: string;
  isNightMode: boolean;
}

export default function DiaryHeader({
  onBack,
  onToggleProfileModal,
  onToggleSearch,
  onToggleNightMode,
  currentName,
  isNightMode
}: DiaryHeaderProps) {
  const cardBg = isNightMode ? "bg-[#2A3634]" : "bg-[#FBFAF7]";
  const borderCol = isNightMode ? "border-[#2D3F3C]" : "border-[#E7E1D6]";
  const labelText = isNightMode ? "text-[#C7CEC8]" : "text-[#6F786F]";
  const bodyText = isNightMode ? "text-[#F4F1EA]" : "text-[#243126]";
  const brandGreen = isNightMode ? "text-[#7FB596]" : "text-[#2F6B45]";

  return (
    <div className="flex justify-between items-center mb-4 mt-3 px-4 relative">
      {/* LEFT: BACK BUTTON */}
      <button
        onClick={onBack}
        className={`w-9 h-9 rounded-full ${cardBg} border ${borderCol} flex items-center justify-center ${bodyText} hover:bg-emerald-50 active:scale-90 transition-all cursor-pointer font-bold outline-none`}
      >
        <X className="w-4.5 h-4.5 stroke-[2.5]" />
      </button>

      {/* CENTER: TITLE AND USER NAME (truly centered relative to full header) */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center">
        <span className={`text-[12px] font-black uppercase tracking-widest ${labelText} font-sans leading-none`}>ЛИЧНЫЙ ДНЕВНИК</span>
        <button
          onClick={onToggleProfileModal}
          className="flex items-center gap-1.5 mt-1.5 bg-white/20 backdrop-blur-sm hover:bg-white/40 border border-slate-200/50 hover:border-slate-300 rounded-full px-3 py-1 text-left transition-all active:scale-95 outline-none cursor-pointer max-w-[200px] mx-auto"
        >
          <User className={`w-4 h-4 ${brandGreen}`} />
          <span className={`text-[14px] sm:text-[15px] font-black leading-none ${bodyText} font-sans truncate`}>
            {currentName || "Пользователь"}
          </span>
          <span className="text-[10px] text-slate-400">▼</span>
        </button>
      </div>

      {/* RIGHT: SEARCH AND THEME TOGGLES */}
      <div className="flex gap-2">
        {/* SEARCH */}
        <button
          onClick={onToggleSearch}
          className={`w-9 h-9 rounded-full ${cardBg} border ${borderCol} flex items-center justify-center ${bodyText} hover:bg-slate-100/10 active:scale-90 transition-transform cursor-pointer outline-none`}
        >
          <Search className="w-4.5 h-4.5 stroke-[2.2]" />
        </button>

        {/* NIGHT MODE ("Выключить свет") */}
        <button
          onClick={onToggleNightMode}
          title="Выключить свет"
          className={`w-9 h-9 rounded-full ${cardBg} border ${borderCol} flex items-center justify-center ${bodyText} hover:bg-slate-100/10 active:scale-90 transition-transform cursor-pointer outline-none`}
        >
          {isNightMode ? (
            <Sun className="w-4.5 h-4.5 text-amber-400 animate-spin" style={{ animationDuration: '20s' }} />
          ) : (
            <Moon className="w-4.5 h-4.5 text-slate-500" />
          )}
        </button>
      </div>
    </div>
  );
}