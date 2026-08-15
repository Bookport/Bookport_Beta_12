import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
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
            className="bg-white rounded-[32px] w-full max-w-[420px] p-5 text-left shadow-[0_25px_50px_rgba(0,0,0,0.25)] relative z-10 flex flex-col gap-4 text-slate-800"
          >
            <div className="flex justify-between items-center pb-1">
              <div>
                <span className="text-[11px] font-black text-indigo-600 tracking-wider uppercase block mb-0.5">ВЫБОР ДВИЖЕНИЯ</span>
                <h3 className="text-[20px] font-black text-slate-850" style={{ fontFamily: '"Calibri", sans-serif' }}>Чем займёмся сегодня?</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200/50 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-90 transition-all text-xs font-bold font-mono"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2 p-1 bg-slate-100 rounded-[20px] mb-2 mt-2 shrink-0">
              <button
                type="button"
                onClick={() => setMovementEntryMode("timer")}
                className={`flex-1 py-2 text-[13px] font-extrabold rounded-[16px] transition-all cursor-pointer ${
                  movementEntryMode === "timer"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                Таймер
              </button>
              <button
                type="button"
                onClick={() => setMovementEntryMode("manual")}
                className={`flex-1 py-2 text-[13px] font-extrabold rounded-[16px] transition-all cursor-pointer ${
                  movementEntryMode === "manual"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
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
                    className={`rounded-2xl p-2.5 text-left border transition-all duration-300 flex items-center gap-2.5 relative cursor-pointer ${
                      isSelected
                        ? "bg-[#E4F6ED] ring-1 ring-[#34D399] border-transparent scale-102 z-10"
                        : "border-transparent opacity-90 hover:opacity-100"
                    }`}
                  >
                    {/* Blinking indicator on the selected card */}
                    {isSelected && (
                      <span className="absolute top-1 right-1 z-20 flex items-center justify-center">
                        <span className="absolute h-2 w-2 rounded-full bg-green-400 animate-ping opacity-75" />
                        <span className="relative h-2 w-2 rounded-full bg-green-500" />
                      </span>
                    )}
                    <div className="w-10 h-10 shrink-0">
                      <img src={getMovementAssetPath(key, userGender)} alt={config.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-extrabold text-slate-800 leading-tight">
                        {config.name}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {movementEntryMode === "manual" ? (
              <div className="mt-2 mb-1 bg-indigo-50/40 p-4 rounded-[24px] border border-indigo-100/50 shrink-0">
                <span className="text-[11px] font-black text-indigo-900 tracking-wider uppercase block mb-3 text-center">Продолжительность</span>
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setManualMovementDuration(prev => Math.max(1, prev - 5))}
                    className="w-12 h-12 rounded-[16px] bg-white hover:bg-slate-50 text-indigo-900 border border-indigo-200/60 flex items-center justify-center shadow-xs active:scale-95 transition-all text-[24px] font-bold cursor-pointer select-none"
                  >
                    -
                  </button>

                  <div className="flex items-baseline gap-1">
                    <span className="text-[38px] font-black text-indigo-600 leading-none tracking-tight font-sans">
                      {manualMovementDuration}
                    </span>
                    <span className="text-[13px] font-extrabold text-indigo-400 uppercase leading-none font-sans">
                      мин
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setManualMovementDuration(prev => Math.min(300, prev + 5))}
                    className="w-12 h-12 rounded-[16px] bg-white hover:bg-slate-50 text-indigo-900 border border-indigo-200/60 flex items-center justify-center shadow-xs active:scale-95 transition-all text-[24px] font-bold cursor-pointer select-none"
                  >
                    +
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map(val => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setManualMovementDuration(val)}
                      className={`py-2 px-1 rounded-xl text-[13px] font-extrabold border transition-all cursor-pointer ${
                        manualMovementDuration === val
                          ? "bg-indigo-500 border-indigo-600 text-white shadow-sm"
                          : "bg-white border-indigo-200/60 text-indigo-700 hover:bg-indigo-50"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-indigo-50/50 rounded-2xl p-3 border border-indigo-100 text-[11.5px] leading-relaxed text-indigo-950 font-semibold mb-1 mt-2 shrink-0">
                📌 <b className="text-indigo-900 font-extrabold">WFPB-факт:</b> Свободное движение без соли — это лучшая гигиена межклеточного пространства. Вы можете начать в один клик!
              </div>
            )}

            {/* Giant Launch Controls */}
            <div className="flex gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 bg-[#F1F5F9] hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl text-[14px] transition-all cursor-pointer active:scale-97 text-center"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={handlePrimaryAction}
                className="flex-[2] py-3.5 bg-[#A78BFA] hover:brightness-105 text-white font-black rounded-xl text-[15px] shadow-sm transition-all cursor-pointer active:scale-97 flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-5 h-5 opacity-90" />
                {movementEntryMode === "timer" ? "Старт" : "Сохранить"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}