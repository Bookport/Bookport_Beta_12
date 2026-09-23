import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ACTIVITY_CONFIGS } from "../constants/movement";
import { getMovementAssetPath } from "../utils/movementAssets";

export interface MovementModalProps {
  visible: boolean;
  userGender: "female" | "male";
  onClose: () => void;
  onStart: (activityKey: string) => void;
  onSave: (activityKey: string, durationMinutes: number) => void;
}

export default function MovementModal({
  visible,
  userGender,
  onClose,
  onStart,
  onSave,
}: MovementModalProps) {
  const [movementEntryMode, setMovementEntryMode] = useState<"timer" | "manual">("timer");
  const [manualMovementDuration, setManualMovementDuration] = useState<number>(30);
  const [selectedActivityForLaunch, setSelectedActivityForLaunch] = useState<string | null>("Walk");

  const handlePrimaryAction = () => {
    if (!selectedActivityForLaunch) return;
    if (movementEntryMode === "timer") {
      onStart(selectedActivityForLaunch);
    } else {
      onSave(selectedActivityForLaunch, manualMovementDuration);
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center p-4 z-[65]" id="fast-movement-sheet-overlay">
          {/* Dark background click back cover dismissal */}
          <div className="absolute inset-0 z-0" onClick={onClose} />

          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-[28px] border border-white w-full max-w-[420px] p-5 text-left shadow-[0_10px_35px_rgba(15,23,42,0.12)] relative z-10 flex flex-col gap-3.5 text-slate-800"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-0.5">
              <div>
                <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase block mb-0.5">
                  ВЫБОР ДВИЖЕНИЯ
                </span>
                <h3 className="text-[18px] font-black text-slate-800 tracking-tight leading-tight">
                  Чем займёмся сегодня?
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100/80 border border-slate-200/50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 active:scale-90 transition-all text-xs font-bold font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Separate mode buttons */}
            <div className="grid grid-cols-2 gap-2 my-0.5 shrink-0">
              <button
                type="button"
                onClick={() => setMovementEntryMode("timer")}
                className={`py-2 px-3 text-[13px] font-black rounded-2xl border transition-all cursor-pointer text-center ${
                  movementEntryMode === "timer"
                    ? "bg-white text-emerald-800 border-emerald-200/80 shadow-[0_2px_8px_rgba(4,120,87,0.08)] ring-1 ring-emerald-500/20"
                    : "bg-slate-50 text-slate-500 border-slate-200/60 hover:bg-slate-100"
                }`}
              >
                Таймер
              </button>
              <button
                type="button"
                onClick={() => setMovementEntryMode("manual")}
                className={`py-2 px-3 text-[13px] font-black rounded-2xl border transition-all cursor-pointer text-center ${
                  movementEntryMode === "manual"
                    ? "bg-white text-emerald-800 border-emerald-200/80 shadow-[0_2px_8px_rgba(4,120,87,0.08)] ring-1 ring-emerald-500/20"
                    : "bg-slate-50 text-slate-500 border-slate-200/60 hover:bg-slate-100"
                }`}
              >
                Ввести вручную
              </button>
            </div>

            {/* Grid of custom activity choices */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              {Object.entries(ACTIVITY_CONFIGS).map(([key, config]) => {
                const isSelected = selectedActivityForLaunch === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedActivityForLaunch(key)}
                    style={{ backgroundColor: config.hexColor }}
                    className={`rounded-2xl py-1.5 px-2.5 text-left border transition-all duration-200 flex items-center gap-2 relative cursor-pointer ${
                      isSelected
                        ? "ring-2 ring-emerald-500 border-white shadow-[0_2px_10px_rgba(16,185,129,0.2)] scale-[1.02] z-10"
                        : "border-white/70 hover:opacity-95"
                    }`}
                  >
                    {/* Blinking indicator on the selected card */}
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 z-20 flex items-center justify-center">
                        <span className="absolute h-2 w-2 rounded-full bg-emerald-400 animate-ping opacity-75" />
                        <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                    )}
                    <div className="w-8 h-8 shrink-0">
                      <img 
                        src={getMovementAssetPath(key, userGender)} 
                        alt={config.name} 
                        className="w-full h-full object-contain" 
                      />
                    </div>
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="text-[12.5px] font-black text-slate-800 leading-tight truncate">
                        {config.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {movementEntryMode === "manual" ? (
              <div className="bg-[#FAF9FD] py-2.5 px-3.5 rounded-2xl border border-slate-200/70 shrink-0">
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase block mb-1 text-center">
                  Продолжительность
                </span>
                <div className="flex items-center justify-center gap-3 mb-2.5">
                  <button
                    type="button"
                    onClick={() => setManualMovementDuration(prev => Math.max(1, prev - 5))}
                    className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shadow-xs active:scale-95 transition-all text-[20px] font-bold cursor-pointer select-none"
                  >
                    -
                  </button>

                  <div className="flex items-baseline gap-1 min-w-[90px] justify-center">
                    <span className="text-[28px] font-black text-slate-800 leading-none font-mono tracking-tight">
                      {manualMovementDuration}
                    </span>
                    <span className="text-[12px] font-bold text-slate-400 uppercase leading-none">
                      мин
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManualMovementDuration(prev => Math.min(300, prev + 5))}
                    className="w-9 h-9 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shadow-xs active:scale-95 transition-all text-[20px] font-bold cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  {[15, 30, 45, 60].map(val => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setManualMovementDuration(val)}
                      className={`py-1.5 px-1 rounded-xl text-[12px] font-black border transition-all cursor-pointer font-mono ${
                        manualMovementDuration === val
                          ? "bg-slate-850 bg-emerald-700 border-emerald-700 text-white shadow-xs"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-[#F4FBF7] rounded-2xl py-2.5 px-3 border border-emerald-100/70 text-[12px] leading-relaxed text-slate-700 font-medium shrink-0">
                <span className="text-[#047857] font-black mr-1">WFPB-факт:</span>
                Свободное движение без соли — лучшая гигиена межклеточного пространства. Можно начать в один клик.
              </div>
            )}

            {/* Launch Controls */}
            <div className="flex gap-2.5 pt-0.5 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-[13.5px] transition-all cursor-pointer active:scale-97 text-center"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handlePrimaryAction}
                className="flex-[2] py-2.5 bg-[#047857] hover:bg-[#065F46] text-white font-black rounded-2xl text-[14px] shadow-[0_4px_14px_rgba(4,120,87,0.22)] transition-all cursor-pointer active:scale-97 flex items-center justify-center"
              >
                {movementEntryMode === "timer" ? "Старт" : "Сохранить"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}