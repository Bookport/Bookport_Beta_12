import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { 
  BRISTOL_IMAGES,
  BRISTOL_DESCRIPTIONS,
  DIGESTION_TIME_INTERVALS,
  DIGESTION_SYMPTOMS,
  DIGESTION_SYMPTOM_COLORS,
} from "../utils/digestionConstants";
import digestionTimeIcon from "../assets/images/digestion/icons/time.webp";
import digestionScaleIcon from "../assets/images/digestion/icons/scale.webp";
import digestionComfortIcon from "../assets/images/digestion/icons/comfort.webp";
import digestionSymptomsIcon from "../assets/images/digestion/icons/symptoms.webp";
import type { DigestionEntry } from "../store/useAppStore";
import { formatTimeHM, todayLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";

interface DigestionModalProps {
  day?: number;
}

export default function DigestionModal({ day }: DigestionModalProps) {
  const isDigestionModalOpen = useAppStore((s) => s.isDigestionModalOpen);
  const digestionModalDay = useAppStore((s) => s.digestionModalDay);
  const setDigestionModalOpen = useAppStore((s) => s.setDigestionModalOpen);
  const digestionEntries = useAppStore((s) => s.digestionEntries);
  const addDigestionEntry = useAppStore((s) => s.addDigestionEntry);
  const profileDayIndex = useAppStore((s) => s.userProfile.currentDayIndex);
  const dayIndex = day ?? digestionModalDay ?? profileDayIndex ?? 1;

  const [fastDigestionBristol, setFastDigestionBristol] = useState<number>(4);
  const [fastDigestionComfort, setFastDigestionComfort] = useState<string>("normal");
  const [fastDigestionNote, setFastDigestionNote] = useState<string>("");
  const [fastDigestionTime, setFastDigestionTime] = useState<string>("");
  const [fastDigestionInterval, setFastDigestionInterval] = useState<string>("08:00 - 12:00");
  const [fastDigestionSymptoms, setFastDigestionSymptoms] = useState<string[]>([]);
  const [isSymptomsOpen, setIsSymptomsOpen] = useState(false);

  // Reset form & auto-highlight interval each time the modal opens
  useEffect(() => {
    if (!isDigestionModalOpen) return;
    setFastDigestionBristol(4);
    setFastDigestionComfort("normal");
    setFastDigestionNote("");
    setFastDigestionSymptoms([]);
    setIsSymptomsOpen(false);

    const nowIso = new Date().toISOString();
    setFastDigestionTime(formatTimeHM(nowIso, getUserTimeZone()));

    const hour = Number(formatTimeHM(nowIso, getUserTimeZone()).split(":")[0]);
    const intervalIdx = Math.min(5, Math.floor(hour / 4));
    setFastDigestionInterval(DIGESTION_TIME_INTERVALS[intervalIdx]);
  }, [isDigestionModalOpen]);

  const submitFastDigestion = () => {
    const nowStamp = Date.now();
    const timeStr = fastDigestionTime || formatTimeHM(new Date().toISOString(), getUserTimeZone());

    const newLogEntry: DigestionEntry = {
      id: `d-modal-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dayIndex,
      timestamp: nowStamp,
      timeString: timeStr,
      timeInterval: fastDigestionInterval,
      bristolType: fastDigestionBristol,
      comfort: fastDigestionComfort,
      symptoms: fastDigestionSymptoms,
      note: fastDigestionNote,
      type: "stool",
    };

    addDigestionEntry(newLogEntry);

    // Persist digestion log to DB (fire-and-forget)
    api("/api/metrics/daily", {
      method: "POST",
      body: {
        date: todayLocalDate(getUserTimeZone()),
        dayIndex,
        digestionLog: [newLogEntry],
      },
    }).catch(() => {
      console.warn("Failed to save digestion log to DB");
    });

    // Организм/ЖКТ +10 XP за сохранение записи пищеварения
    useAppStore.getState().addProgressXp(10);

    setIsSymptomsOpen(false);
    setDigestionModalOpen(false);
  };

  return (
    <AnimatePresence>
      {isDigestionModalOpen && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-[65] p-3 sm:p-4" id="digestion-modal-overlay">
          {/* Backdrop click to dismiss */}
          <div className="absolute inset-0 z-0" onClick={() => setDigestionModalOpen(false)} />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="bg-white rounded-[28px] border border-white shadow-[0_10px_35px_rgba(15,23,42,0.12)] w-full max-w-[420px] p-4.5 sm:p-5 text-left relative z-10 max-h-[92vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] flex flex-col gap-3.5 text-slate-800"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-0.5">
              <h3 className="text-[19px] sm:text-[20px] font-black tracking-tight text-slate-800 leading-none">
                Регистрация стула
              </h3>
              <button
                type="button"
                onClick={() => setDigestionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100/80 flex items-center justify-center text-slate-500 hover:bg-slate-200/80 active:scale-90 transition-all text-xs font-bold font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* A. ВРЕМЯ — точное время + сетка интервалов */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <img src={digestionTimeIcon} alt="Время" className="w-5 h-5 object-contain select-none pointer-events-none" draggable={false} />
                  <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider">ВРЕМЯ</span>
                  <span className="bg-amber-50/80 border border-amber-200/60 px-2.5 py-0.5 rounded-xl text-[13px] font-mono font-black text-slate-800 shadow-2xs">
                    {fastDigestionTime}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nowIso = new Date().toISOString();
                    setFastDigestionTime(formatTimeHM(nowIso, getUserTimeZone()));
                    const intervalIdx = Math.min(5, Math.floor(Number(formatTimeHM(nowIso, getUserTimeZone()).split(":")[0]) / 4));
                    setFastDigestionInterval(DIGESTION_TIME_INTERVALS[intervalIdx]);
                  }}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-[11.5px] font-black px-3.5 py-1.5 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Сейчас
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {DIGESTION_TIME_INTERVALS.map(interval => {
                  const active = fastDigestionInterval === interval;
                  return (
                    <button
                      key={interval}
                      type="button"
                      onClick={() => setFastDigestionInterval(interval)}
                      className={`py-2 rounded-xl text-[11.5px] font-mono font-bold transition-all cursor-pointer border ${
                        active 
                          ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs" 
                          : "bg-amber-50/50 text-slate-600 border-amber-100/70 hover:bg-amber-50/80"
                      }`}
                    >
                      {interval}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. БРИСТОЛЬСКАЯ ШКАЛА — компактная пилюля точно по высоте банки */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline px-1">
                <div className="flex items-center gap-1.5">
                  <img src={digestionScaleIcon} alt="Шкала" className="w-5 h-5 object-contain select-none pointer-events-none" draggable={false} />
                  <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider">Бристольская шкала</span>
                </div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">
                  Тип {fastDigestionBristol}
                </span>
              </div>

              <div className="flex flex-row justify-between items-center gap-1 sm:gap-1.5 py-1">
                {[1, 2, 3, 4, 5, 6, 7].map((type) => {
                  const active = fastDigestionBristol === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFastDigestionBristol(type)}
                      className={`w-fit flex flex-col items-center justify-center rounded-[20px] transition-all cursor-pointer ${
                        active 
                          ? "bg-emerald-100/70 ring-2 ring-emerald-400/80 shadow-xs py-1 px-0.5" 
                          : "py-1 px-0.5 hover:bg-slate-50"
                      }`}
                    >
                      <img
                        src={BRISTOL_IMAGES[type - 1]}
                        alt={`Бристоль ${type}`}
                        className="h-28 w-auto object-contain select-none pointer-events-none"
                        draggable={false}
                      />
                    </button>
                  );
                })}
              </div>

              <div className="text-slate-600 text-center text-[12px] sm:text-[12.5px] font-medium leading-snug px-3 py-2 bg-slate-50/90 border border-slate-100 rounded-xl mt-0.5 min-h-[38px] flex items-center justify-center">
                {BRISTOL_DESCRIPTIONS[fastDigestionBristol]}
              </div>
            </div>

            {/* C. ОЩУЩЕНИЕ КОМФОРТА — 3 кнопки в ряд */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 px-1">
                <img src={digestionComfortIcon} alt="Комфорт" className="w-5 h-5 object-contain select-none pointer-events-none" draggable={false} />
                <span className="text-[10.5px] font-black text-slate-400 uppercase tracking-wider">Ощущение комфорта</span>
              </div>
              <div className="flex flex-row justify-between gap-2">
                {[
                  { id: "scanty", label: "Скудно", bgActive: "bg-amber-100 text-amber-900 border-amber-300" },
                  { id: "normal", label: "Нормально", bgActive: "bg-emerald-100 text-emerald-900 border-emerald-300" },
                  { id: "voluminous", label: "Объёмно", bgActive: "bg-sky-100 text-sky-900 border-sky-300" }
                ].map((x) => {
                  const active = fastDigestionComfort === x.id;
                  return (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setFastDigestionComfort(x.id)}
                      className={`flex-1 py-2.5 rounded-2xl text-[12.5px] font-bold text-center transition-all cursor-pointer border ${
                        active 
                          ? `${x.bgActive} shadow-xs font-black` 
                          : "bg-amber-50/40 text-slate-600 border-amber-100/70 hover:bg-amber-50/80"
                      }`}
                    >
                      {x.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* D. СИМПТОМЫ — спойлер-аккордеон с мультиселектом тегов */}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setIsSymptomsOpen(prev => !prev)}
                className="w-fit mx-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl text-[12.5px] flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <img src={digestionSymptomsIcon} alt="Симптомы" className="w-4 h-4 object-contain select-none pointer-events-none" draggable={false} />
                <span>Симптомы</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-300 ${isSymptomsOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              <AnimatePresence initial={false}>
                {isSymptomsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-1.5 pt-1 justify-center">
                      {DIGESTION_SYMPTOMS.map(tag => {
                        const active = fastDigestionSymptoms.includes(tag);
                        const colors = DIGESTION_SYMPTOM_COLORS[tag] || { inactive: "bg-amber-50/50 text-slate-700 border-amber-100/70", active: "bg-emerald-100 text-emerald-900 border-emerald-300" };
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (tag === "Нет симптомов") {
                                setFastDigestionSymptoms(active ? [] : ["Нет симптомов"]);
                              } else {
                                setFastDigestionSymptoms(prev => {
                                  let next = prev.filter(s => s !== "Нет симптомов");
                                  if (next.includes(tag)) {
                                    next = next.filter(s => s !== tag);
                                  } else {
                                    next = [...next, tag];
                                  }
                                  return next;
                                });
                              }
                            }}
                            className={`px-3 py-1.5 rounded-xl text-[11.5px] font-bold transition-all cursor-pointer border shadow-2xs ${
                              active ? colors.active : colors.inactive
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer — Отмена и Сохранить */}
            <div className="flex flex-row gap-2.5 pt-1 mt-0.5">
              <button
                type="button"
                onClick={() => setDigestionModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-extrabold rounded-2xl text-[13.5px] transition-all cursor-pointer active:scale-[0.98] text-center"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={submitFastDigestion}
                className="flex-[2] py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl text-[14px] transition-all cursor-pointer active:scale-[0.98] shadow-[0_4px_14px_rgba(4,120,87,0.22)] flex items-center justify-center gap-1.5"
              >
                <span>Сохранить</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}