import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Mic, Calendar } from "lucide-react";
import { NoteSpeechInputHelper } from "../utils/speechToText";

interface CalendarOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  dayNotes: Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>;
  setDayNotes: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>>>;
  currentDayIndex: number;
  viewingDayIndex: number | null;
  setViewingDayIndex: (day: number | null) => void;
  recordClick: (pts?: number) => void;
}

export default function CalendarOverlay({
  isOpen,
  onClose,
  dayNotes,
  setDayNotes,
  currentDayIndex,
  viewingDayIndex,
  setViewingDayIndex,
  recordClick
}: CalendarOverlayProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);

  // Sync temp note when editing day is changed
  useEffect(() => {
    if (editingDay !== null) {
      setTempNote(dayNotes[editingDay]?.[0]?.text || "");
    }
  }, [editingDay, dayNotes]);

  // Voice setup with continuous Speech-to-Text helper refs
  const calendarSpeechHelperRef = useRef(new NoteSpeechInputHelper());
  const calendarHoldingMicRef = useRef(false);

  useEffect(() => {
    return () => {
      calendarSpeechHelperRef.current.release();
    };
  }, []);

  const handleCalendarMicStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    recordClick(1);
    calendarHoldingMicRef.current = true;
    setIsRecording(true);

    calendarSpeechHelperRef.current.bindSession(
      calendarHoldingMicRef,
      tempNote,
      (newVal) => setTempNote(newVal),
      (state) => { setIsRecording(state === "listening"); },
    );
  };

  const handleCalendarMicEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    calendarHoldingMicRef.current = false;
    calendarSpeechHelperRef.current.release();
    setIsRecording(false);
  };

  // Soft random cohesive pastel colors for days with notes
  const getNoteDayColor = (dayNum: number) => {
    const list = [
      { bg: "bg-[#E0F2FE]", text: "text-[#0369A1]" }, // Blue
      { bg: "bg-[#ECFDF5]", text: "text-[#047857]" }, // Emerald
      { bg: "bg-[#F3E8FF]", text: "text-[#7E22CE]" }, // Violet
      { bg: "bg-[#FFF7ED]", text: "text-[#C2410C]" }, // Orange
      { bg: "bg-[#F0FDF4]", text: "text-[#15803D]" }, // Green
      { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]" }, // Red
    ];
    return list[dayNum % list.length];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-[#1F2328]/35 backdrop-blur-md z-50 flex items-center justify-center p-4 rounded-[40px] pointer-events-auto"
        >
          <motion.div 
            initial={{ scale: 0.92, y: 15 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 15 }}
            className="w-full max-w-[370px] bg-white rounded-[32px] border border-gray-100/10 shadow-[0_24px_50px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col pt-5 pb-6 px-4"
          >
            {/* Calendar Header */}
            <div className="flex justify-between items-center mb-4 px-1">
              <div className="flex flex-col text-left">
                <span className="text-[13px] font-bold text-brand-green-dark" style={{ fontFamily: '"Calibri", sans-serif' }}>
                  КАЛЕНДАРЬ КУРСА
                </span>
                <span className="text-[19px] font-bold text-text-dark leading-tight" style={{ fontFamily: '"Calibri", sans-serif' }}>
                  28 дней цикла
                </span>
              </div>
              <button 
                type="button"
                onClick={() => { recordClick(); onClose(); setEditingDay(null); }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-[#2B3137] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Days Grid — only past and current days */}
            <div className="grid grid-cols-7 gap-1.5 mb-4">
              {Array.from({ length: currentDayIndex }).map((_, i) => {
                const dayNum = i + 1;
                const hasNote = dayNotes[dayNum]?.length > 0;
                const isCurrent = dayNum === currentDayIndex;
                const isViewing = viewingDayIndex === dayNum;
                const noteColors = hasNote ? getNoteDayColor(dayNum) : null;
                
                return (
                  <button
                    key={dayNum}
                    type="button"
                    onClick={() => {
                      recordClick();
                      setEditingDay(dayNum);
                    }}
                    className={`h-[42px] rounded-xl text-[14px] sm:text-[15px] font-bold transition-all flex flex-col items-center justify-center relative cursor-pointer active:scale-95 ${
                      isViewing 
                        ? "ring-2 ring-amber-400/60 scale-105 shadow-md" 
                        : isCurrent 
                        ? "ring-2 ring-brand-green-bright/60 scale-105 shadow-md" 
                        : ""
                    } ${
                      hasNote 
                        ? `${noteColors?.bg} ${noteColors?.text} shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7)]`
                        : "bg-[#FAFAFA] text-text-sec border border-gray-100/60 hover:bg-gray-100"
                    }`}
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    <span>{dayNum}</span>
                    {isCurrent && (
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-green-bright absolute bottom-0.5" />
                    )}
                    {isViewing && !isCurrent && (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute bottom-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Inline Note Creation Block if editing a day */}
            {editingDay !== null && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#FAFAFA] rounded-2xl p-3 border border-gray-100 mt-2 text-left flex flex-col gap-2.5"
              >
                <div className="flex justify-between items-center px-0.5">
                  <span className="text-[13px] font-bold text-text-dark" style={{ fontFamily: '"Calibri", sans-serif' }}>
                    Заметка: День {editingDay}
                  </span>
                  {dayNotes[editingDay] && (
                    <span className="text-[11px] text-text-muted">
                      Уже есть записей: {dayNotes[editingDay].length}
                    </span>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value)}
                    placeholder="Напишите о своём состоянии, добавленных растительных ингредиентах..."
                    className="w-full text-[13px] p-2.5 rounded-xl border border-gray-200/80 bg-white focus:outline-hidden focus:border-brand-green-bright/60 min-h-[68px] resize-none text-text-dark font-medium placeholder:text-text-muted/70 leading-snug"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  />
                  {isRecording && (
                    <div className="absolute inset-0 bg-white/80 rounded-xl flex items-center justify-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      <span className="text-xs font-bold text-red-500">Запись...</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Voice input mic button with continuous STT */}
                  <button
                    type="button"
                    onPointerDown={handleCalendarMicStart}
                    onPointerUp={handleCalendarMicEnd}
                    onPointerCancel={handleCalendarMicEnd}
                    className={`h-11 px-3.5 rounded-xl border select-none touch-none ${
                      isRecording 
                        ? "bg-red-50 border-red-200 text-red-500 animate-pulse" 
                        : "bg-white border-gray-200 text-text-sec hover:bg-gray-100"
                    } flex items-center justify-center cursor-pointer transition-all active:scale-95`}
                    title="Голосовой ввод (Удерживайте для записи)"
                  >
                    <Mic className={`w-5 h-5 ${isRecording ? "scale-110" : ""}`} />
                  </button>

                  {/* Submit Note Button */}
                  <button
                    type="button"
                    onClick={() => {
                      recordClick(3);
                      const clean = tempNote.trim();
                      if (clean) {
                        const date = new Date();
                        const hrs = String(date.getHours()).padStart(2, "0");
                        const mins = String(date.getMinutes()).padStart(2, "0");
                        setDayNotes(prev => {
                          const dayArr = prev[editingDay] || [];
                          return {
                            ...prev,
                            // Replace or add as new item
                            [editingDay]: [{ text: clean, time: `${hrs}:${mins}` }, ...dayArr]
                          };
                        });
                      } else {
                        // Clear day notes if text cleared
                        setDayNotes(prev => {
                          const updated = { ...prev };
                          delete updated[editingDay];
                          return updated;
                        });
                      }
                      setViewingDayIndex(editingDay === currentDayIndex ? null : editingDay);
                      setEditingDay(null);
                    }}
                    className="flex-1 h-11 rounded-xl bg-linear-to-b from-[#22C55E] to-[#109F44] text-white font-bold text-[14px] sm:text-[15px] flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
                    style={{ fontFamily: '"Calibri", sans-serif' }}
                  >
                    Сохранить
                  </button>
                </div>
              </motion.div>
            )}

            {/* Cycle notes feed for the active day */}
            <div className="mt-4 border-t border-gray-100 pt-3 text-left">
              <span className="text-[13px] font-bold text-text-muted block mb-1.5">
                Хронология заметок за День {editingDay ?? viewingDayIndex ?? currentDayIndex}
              </span>
              
              {(() => {
                const feedDay = editingDay ?? viewingDayIndex ?? currentDayIndex;
                const feedNotes = dayNotes[feedDay] || [];
                if (feedNotes.length === 0) {
                  return (
                    <span className="text-[11.5px] text-text-muted mt-1 italic block">
                      У этого дня ещё нет заметок. Выберите день из сетки, чтобы добавить запись.
                    </span>
                  );
                }
                return (
                  <div className="flex flex-col gap-2 max-h-[165px] overflow-y-auto pr-1">
                    {feedNotes.map((noteItem, nIdx) => {
                    const meta = (() => {
                      switch (noteItem.source) {
                        case "water":
                          return { icon: "💧", label: "Вода", bg: "bg-sky-50 text-sky-600 border-sky-100/40" };
                        case "food":
                          return { icon: "🥗", label: "Еда", bg: "bg-emerald-50 text-emerald-600 border-emerald-100/40" };
                        case "movement":
                          return { icon: "🔥", label: "Движение", bg: "bg-indigo-50 text-indigo-600 border-indigo-100/40" };
                        case "sleep":
                          return { icon: "😴", label: "Сон", bg: "bg-violet-50 text-violet-600 border-violet-100/40" };
                        case "measurements":
                          return { icon: "📊", label: "Замеры", bg: "bg-pink-50 text-pink-600 border-pink-100/40" };
                        case "digestion":
                          return { icon: "🌱", label: "Пищеварение", bg: "bg-orange-50 text-orange-600 border-orange-100/40" };
                        default:
                          return { icon: "📝", label: "Заметка", bg: "bg-slate-50 text-slate-650 border-slate-100/40" };
                      }
                    })();

                    return (
                      <div 
                        key={nIdx} 
                        className="bg-white rounded-xl p-2.5 border border-slate-200/50 shadow-xs flex flex-col gap-1.5 text-[12px] relative transition-all hover:border-slate-350"
                      >
                        {/* Feed Card Header */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${meta.bg}`}>
                              <span>{meta.icon}</span>
                              <span>{meta.label}</span>
                            </span>
                            {noteItem.isVoice && (
                              <span className="bg-red-50 text-red-500 border border-red-100 rounded-md text-[9.5px] px-1 py-0.5 font-bold flex items-center gap-0.5">
                                🎙️ Голос
                              </span>
                            )}
                          </div>
                          
                          <span className="font-mono text-[10.5px] text-slate-400 font-extrabold">
                            {noteItem.time}
                          </span>
                        </div>

                        {/* Note Text */}
                        <p className="text-slate-700 font-semibold leading-relaxed px-0.5">
                          {noteItem.text}
                        </p>

                        {/* Note Tags */}
                        {noteItem.tags && noteItem.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 px-0.5">
                            {noteItem.tags.map((tag, tIdx) => (
                              <span 
                                key={tIdx} 
                                className="bg-slate-50 border border-slate-150/60 rounded-md text-[9.5px] px-1.5 py-0.5 font-bold text-slate-500 tracking-wide"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
