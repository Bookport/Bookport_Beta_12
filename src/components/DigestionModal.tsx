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

    const d = new Date();
    const hr = d.getHours().toString().padStart(2, "0");
    const mn = d.getMinutes().toString().padStart(2, "0");
    setFastDigestionTime(`${hr}:${mn}`);

    const hour = d.getHours();
    const intervalIdx = Math.min(5, Math.floor(hour / 4));
    setFastDigestionInterval(DIGESTION_TIME_INTERVALS[intervalIdx]);
  }, [isDigestionModalOpen]);

  const submitFastDigestion = () => {
    const nowStamp = Date.now();
    const timeStr = fastDigestionTime || (() => {
      const hr = new Date().getHours().toString().padStart(2, "0");
      const mn = new Date().getMinutes().toString().padStart(2, "0");
      return `${hr}:${mn}`;
    })();

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
        date: new Date().toISOString().split("T")[0],
        dayIndex,
        digestionLog: [newLogEntry],
      },
    }).catch(() => {
      console.warn("Failed to save digestion log to DB");
    });

    setIsSymptomsOpen(false);
    setDigestionModalOpen(false);
  };

  return (
    <AnimatePresence>
      {isDigestionModalOpen && (
        <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-center justify-center z-[65]" id="digestion-modal-overlay">
          {/* Backdrop click to dismiss */}
          <div className="absolute inset-0 z-0" onClick={() => setDigestionModalOpen(false)} />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="bg-[#FFFFFF] rounded-[32px] w-full max-w-[420px] m-4 p-5 text-left relative z-10 max-h-[90vh] overflow-y-auto scrollbar-none flex flex-col gap-3 text-slate-800"
          >
            <div className="flex justify-between items-center pb-1">
              <div>
                <h3 className="text-[20px] font-black text-slate-850" style={{ fontFamily: '"Calibri", sans-serif' }}>Регистрация стула</h3>
              </div>
              <button
                type="button"
                onClick={() => setDigestionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 active:scale-90 transition-all text-xs font-bold font-mono"
              >
                ✕
              </button>
            </div>

            {/* A. ВРЕМЯ — точное время + сетка интервалов */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <img src={digestionTimeIcon} alt="Время" className="w-6 h-6 object-contain select-none pointer-events-none" draggable={false} />
                  <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">ВРЕМЯ</span>
                  <span className="bg-[#FFF7ED] px-3 py-1 rounded-xl text-[14px] font-mono font-black text-slate-800 shadow-sm">{fastDigestionTime}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    const hr = d.getHours().toString().padStart(2, "0");
                    const mn = d.getMinutes().toString().padStart(2, "0");
                    setFastDigestionTime(`${hr}:${mn}`);
                    const intervalIdx = Math.min(5, Math.floor(d.getHours() / 4));
                    setFastDigestionInterval(DIGESTION_TIME_INTERVALS[intervalIdx]);
                  }}
                  className="bg-[#34D399] text-white text-[12px] font-extrabold px-4 py-1.5 rounded-xl shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  Сейчас
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DIGESTION_TIME_INTERVALS.map(interval => {
                  const active = fastDigestionInterval === interval;
                  return (
                    <button
                      key={interval}
                      type="button"
                      onClick={() => setFastDigestionInterval(interval)}
                      className={`py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer shadow-sm ${
                        active ? "bg-[#D1FAE5] text-slate-900" : "bg-[#FFF7ED] text-slate-600"
                      }`}
                    >
                      {interval}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. БРИСТОЛЬСКАЯ ШКАЛА — 7 огромных картинок-баночек */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-baseline px-1">
                <div className="flex items-center gap-2">
                  <img src={digestionScaleIcon} alt="Шкала" className="w-6 h-6 object-contain select-none pointer-events-none" draggable={false} />
                  <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Бристольская шкала</span>
                </div>
                <span className="text-[11px] font-black text-slate-600 uppercase">Тип {fastDigestionBristol}</span>
              </div>

              <div className="flex flex-row justify-between items-end gap-2">
                {[1, 2, 3, 4, 5, 6, 7].map((type) => {
                  const active = fastDigestionBristol === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFastDigestionBristol(type)}
                      className={`w-fit flex flex-col items-center justify-end rounded-xl transition-all cursor-pointer ${
                        active ? "bg-[#D1FAE5] shadow-md p-1" : "p-0"
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

              <div className="min-h-[36px] text-slate-600 text-center text-sm font-medium leading-snug px-1">
                {BRISTOL_DESCRIPTIONS[fastDigestionBristol]}
              </div>
            </div>

            {/* C. ОЩУЩЕНИЕ КОМФОРТА — 3 кнопки в горизонтальный ряд */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 px-1">
                <img src={digestionComfortIcon} alt="Комфорт" className="w-6 h-6 object-contain select-none pointer-events-none" draggable={false} />
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">Ощущение комфорта</span>
              </div>
              <div className="flex flex-row justify-between space-x-3">
                {[
                  { id: "scanty", label: "Скудно", bg: "bg-[#FEF9C3]" },
                  { id: "normal", label: "Нормально", bg: "bg-[#D1FAE5]" },
                  { id: "voluminous", label: "Объёмно", bg: "bg-[#DBEAFE]" }
                ].map((x) => {
                  const active = fastDigestionComfort === x.id;
                  return (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setFastDigestionComfort(x.id)}
                      className={`flex-1 py-2.5 rounded-2xl text-[13px] font-bold text-center transition-all cursor-pointer shadow-sm ${
                        active ? `${x.bg} text-slate-900` : "bg-[#FFF7ED] text-slate-600"
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
                className="w-fit mx-auto px-5 py-2 bg-[#34D399] text-white font-extrabold rounded-2xl text-[13px] flex items-center justify-center gap-2 shadow-sm active:scale-97 transition-all cursor-pointer"
              >
                <img src={digestionSymptomsIcon} alt="Симптомы" className="w-5 h-5 object-contain select-none pointer-events-none" draggable={false} />
                <span>Симптомы</span>
                <svg
                  className={`w-4 h-4 transition-transform duration-300 ${isSymptomsOpen ? "rotate-180" : ""}`}
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
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-wrap gap-2 pt-1">
                      {DIGESTION_SYMPTOMS.map(tag => {
                        const active = fastDigestionSymptoms.includes(tag);
                        const colors = DIGESTION_SYMPTOM_COLORS[tag] || { inactive: "bg-[#FFF7ED] text-slate-700", active: "bg-[#D1FAE5] text-slate-900" };
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
                            className={`px-3.5 py-2 rounded-2xl text-[12px] font-bold transition-all cursor-pointer shadow-sm ${
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

            {/* Footer — только две кнопки */}
            <div className="flex flex-row gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDigestionModalOpen(false)}
                className="flex-1 py-3.5 bg-[#E2E8F0] text-slate-700 font-extrabold rounded-2xl text-[14px] transition-all cursor-pointer active:scale-97 text-center"
              >
                Отмена
              </button>

              <button
                type="button"
                onClick={submitFastDigestion}
                className="flex-[2] py-3.5 bg-[#34D399] text-white font-black rounded-2xl text-[15px] transition-all cursor-pointer active:scale-97 flex items-center justify-center gap-1.5"
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