import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar, 
  ChevronLeft, 
  CheckCircle2, 
  Lock,
  MessageSquare
} from "lucide-react";
import BottomBar from "./BottomBar";
import CalendarButton from "./CalendarButton";
import BriefNoteBlock from "./BriefNoteBlock";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'thoughtful' }).src;

export interface DigestionLogEntry {
  id: string;
  dayIndex: number;
  timestamp: number;
  timeString: string;
  bristolType: number;
  comfort: "easy" | "normal" | "uncomfortable";
  note?: string;
  linkedMeal?: string;
}

interface DigestionScreenProps {
  dayNotes: Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>;
  setDayNotes?: React.Dispatch<React.SetStateAction<Record<number, { text: string; time: string; source?: string; tags?: string[]; isVoice?: boolean }[]>>>;
  currentDayIndex: number;
  onBack?: () => void;
  userName?: string;
  userGender?: "female" | "male";
  digestionLogs?: Record<number, DigestionLogEntry[]>;
  setDigestionLogs?: React.Dispatch<React.SetStateAction<Record<number, DigestionLogEntry[]>>>;
  meals?: { id: string; name: string; checked: boolean }[];
  water?: number;
  totalFiber?: number;
  aggregatedIngredients?: { name: string; weight: number; status: string }[];
  screen?: string;
  onOpenCalendar?: () => void;
}

// 3D realistic SVGs representing Bristol Stool Chart types
export function BristolIcon({ type }: { type: number }) {
  if (type === 1) {
    return (
      <svg width="34" height="28" viewBox="0 0 34 28" fill="none" className="drop-shadow-md">
        <defs>
          <radialGradient id="gradStool1" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#8C6239" />
            <stop offset="35%" stopColor="#5C3F21" />
            <stop offset="100%" stopColor="#301B05" />
          </radialGradient>
        </defs>
        {/* Isolated hard pebbles */}
        <ellipse cx="8" cy="8" rx="4.5" ry="4" fill="url(#gradStool1)" />
        <ellipse cx="25" cy="9" rx="5" ry="4.5" fill="url(#gradStool1)" />
        <ellipse cx="16" cy="18" rx="4.5" ry="4" fill="url(#gradStool1)" />
        <ellipse cx="26" cy="19" rx="3.5" ry="3" fill="url(#gradStool1)" />
        <ellipse cx="7" cy="20" rx="3.5" ry="3.2" fill="url(#gradStool1)" />
      </svg>
    );
  }
  if (type === 2) {
    return (
      <svg width="34" height="28" viewBox="0 0 34 28" fill="none" className="drop-shadow-md">
        <defs>
          <radialGradient id="gradStool2" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#855B33" />
            <stop offset="60%" stopColor="#54381C" />
            <stop offset="100%" stopColor="#2E1C0A" />
          </radialGradient>
        </defs>
        {/* Sausage shaped but lumpy */}
        <g>
          <rect x="5" y="10" width="24" height="10" rx="5" fill="url(#gradStool2)" />
          <circle cx="8" cy="15" r="5" fill="url(#gradStool2)" />
          <circle cx="14" cy="14.5" r="5.5" fill="url(#gradStool2)" />
          <circle cx="20" cy="15.5" r="5" fill="url(#gradStool2)" />
          <circle cx="26" cy="15" r="5.2" fill="url(#gradStool2)" />
        </g>
      </svg>
    );
  }
  if (type === 3) {
    return (
      <svg width="34" height="28" viewBox="0 0 34 28" fill="none" className="drop-shadow-md">
        <defs>
          <linearGradient id="gradStool3" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#80552D" />
            <stop offset="50%" stopColor="#523418" />
            <stop offset="100%" stopColor="#2A1604" />
          </linearGradient>
        </defs>
        {/* Sausage with surface cracks */}
        <g>
          <path d="M4,14 C6,9 28,9 30,14 C28,19 6,19 4,14 Z" fill="url(#gradStool3)" />
          {/* Surface cracks */}
          <path d="M8,11 L9,17" stroke="#2A1604" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          <path d="M14,10 L13,16" stroke="#2A1604" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
          <path d="M20,11 L21,17" stroke="#2A1604" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
          <path d="M25,10 L24,15" stroke="#2A1604" strokeWidth="1.3" strokeLinecap="round" opacity="0.8" />
        </g>
      </svg>
    );
  }
  if (type === 4) {
    return (
      <svg width="34" height="28" viewBox="0 0 34 28" fill="none" className="drop-shadow-md">
        <defs>
          <linearGradient id="gradStool4" x1="0" y1="0" x2="1" y2="0.8">
            <stop offset="0%" stopColor="#9C6B3F" />
            <stop offset="35%" stopColor="#6E4826" />
            <stop offset="100%" stopColor="#3E240D" />
          </linearGradient>
        </defs>
        {/* Smooth, soft snake/sausage */}
        <path d="M4,15 C8,9 12,9 17,14 C22,19 26,17 30,13" stroke="url(#gradStool4)" strokeWidth="8.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Soft highlight reflection */}
        <path d="M6,14 C9,11 11,11 15,14" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.15" />
      </svg>
    );
  }
  if (type === 5) {
    return (
      <svg width="34" height="28" viewBox="0 0 34 28" fill="none" className="drop-shadow-md">
        <defs>
          <radialGradient id="gradStool5" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#9E734A" />
            <stop offset="65%" stopColor="#6E4C2A" />
            <stop offset="100%" stopColor="#361F0B" />
          </radialGradient>
        </defs>
        {/* Soft blobs with clear cut edges */}
        <ellipse cx="9" cy="11" rx="5" ry="4" fill="url(#gradStool5)" />
        <ellipse cx="23" cy="11" rx="6" ry="4.5" fill="url(#gradStool5)" />
        <ellipse cx="16" cy="19" rx="5.5" ry="5" fill="url(#gradStool5)" />
      </svg>
    );
  }
  if (type === 6) {
    return (
      <svg width="34" height="28" viewBox="0 0 34 28" fill="none" className="drop-shadow-md">
        <defs>
          <radialGradient id="gradStool6" cx="30%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#A88158" />
            <stop offset="70%" stopColor="#755635" />
            <stop offset="100%" stopColor="#3D2914" />
          </radialGradient>
        </defs>
        {/* Mushy, fluffy, ragged edges */}
        <g>
          <path d="M6,13 C5,10 9,8 12,10 C15,8 18,10 17,13 C19,13 21,11 23,13 C25,15 22,19 19,18 C18,21 13,21 11,19 C8,21 4,19 6,13 Z" fill="url(#gradStool6)" />
          {/* Speckles to represent mushiness */}
          <circle cx="10" cy="14" r="1.5" fill="#3D2914" opacity="0.3" />
          <circle cx="15" cy="13" r="1.2" fill="#3D2914" opacity="0.3" />
          <circle cx="18" cy="16" r="1.5" fill="#3D2914" opacity="0.2" />
        </g>
      </svg>
    );
  }
  return (
    <svg width="34" height="28" viewBox="0 0 34 28" fill="none" className="drop-shadow-md">
      <defs>
        <linearGradient id="gradStool7" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#B38E66" />
          <stop offset="50%" stopColor="#82613D" />
          <stop offset="100%" stopColor="#543D24" />
        </linearGradient>
      </defs>
      {/* Liquid watery puddle with splashes */}
      <g>
        <ellipse cx="17" cy="18" rx="13" ry="5" fill="url(#gradStool7)" />
        <ellipse cx="12" cy="10" rx="4" ry="2.5" fill="url(#gradStool7)" />
        <ellipse cx="23" cy="11" rx="5.5" ry="3" fill="url(#gradStool7)" />
        <circle cx="6" cy="15" r="1.5" fill="url(#gradStool7)" />
        <circle cx="28" cy="17" r="1.2" fill="url(#gradStool7)" />
      </g>
    </svg>
  );
}

export default function DigestionScreen({
  dayNotes,
  setDayNotes,
  currentDayIndex,
  onBack: propsOnBack,
  userName = "друг",
  userGender = "female",
  digestionLogs,
  setDigestionLogs,
  meals = [],
  water = 0,
  totalFiber = 0,
  aggregatedIngredients = [],
}: DigestionScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen("my-day"));
  const [noteSavedOrSkipped, setNoteSavedOrSkipped] = useState(false);

  const handleSaveDigestionNote = (noteText: string, selectedTags: string[], isVoice: boolean) => {
    if (!noteText.trim() && selectedTags.length === 0) return;
    if (!setDayNotes) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    
    const newNote = {
      text: noteText.trim() || "Зафиксировано состояние пищеварения 🍂",
      time: timeStr,
      source: "digestion",
      tags: selectedTags,
      isVoice
    };

    setDayNotes(prev => {
      const todayArr = prev[currentDayIndex] || [];
      return {
        ...prev,
        [currentDayIndex]: [newNote, ...todayArr]
      };
    });
    setNoteSavedOrSkipped(true);
  };

  // Local fallback state if digestionLogs/setDigestionLogs are not provided (e.g. from App.tsx route)
  const [localLogs, setLocalLogs] = useState<Record<number, DigestionLogEntry[]>>({});

  const currentLogsMap = (digestionLogs && typeof digestionLogs === "object") ? digestionLogs : (localLogs || {});
  const currentSetLogs = setDigestionLogs || setLocalLogs;

  // Resolve core user profile settings to stay aligned with overall profile setup
  const storeUserName = useAppStore((s) => s.userProfile.name);
  const resolvedUserName = React.useMemo(() => {
    if (userName && userName !== "друг") return userName;
    if (storeUserName && storeUserName.trim()) return storeUserName;
    return userName;
  }, [userName, storeUserName]);

  // Resolve current water dynamically to prevent 0ml blank display
  const resolvedWater = water > 0 ? water : 0;

  // Local state for adding a manual entry within the analytical view
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBristol, setNewBristol] = useState<number>(4);
  const [newComfort, setNewComfort] = useState<"easy" | "normal" | "uncomfortable">("normal");
  const [newNote, setNewNote] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");

  // Statistics calculation helper
  const allLogs = (Object.values(currentLogsMap) as DigestionLogEntry[][]).flat();
  const dayLogs = (currentLogsMap[currentDayIndex] || []) as DigestionLogEntry[];

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    (window as any).currentScreenContext = {
      screen_id: "digestion",
      screen_title: "Контроль Пищеварения и Микробиома",
      current_day: currentDayIndex,
      active_modal_or_overlay: showAddModal ? "Форма добавления новой копрограммы ЖКТ" : null,
      current_status: showAddModal ? "Пользователь заполняет параметры стула" : "Просмотр динамики и Bristol Stool Chart",
      visible_items: dayLogs.map(l => ({
        time: l.timeString,
        bristol_type: l.bristolType,
        metabolism_comfort: l.comfort,
        user_comment: l.note || ""
      })),
      user_input_values: showAddModal ? {
        new_bristol_level: newBristol,
        comfort_category: newComfort,
        note_text: newNote,
        selected_time: newTime
      } : null
    };

    return () => {
      if ((window as any).currentScreenContext?.screen_id === "digestion") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [currentDayIndex, showAddModal, dayLogs, newBristol, newComfort, newNote, newTime]);

  const handleOpenAddModal = () => {
    const d = new Date();
    setNewBristol(4);
    setNewComfort("normal");
    setNewNote("");
    setNewTime(`${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`);
    setShowAddModal(true);
  };

  const handleSaveModalEntry = () => {
    const nowStamp = Date.now();
    const timeStr = newTime || "12:00";

    let linkedMealName = "";
    const activeMeals = meals.filter(m => m.checked);
    if (activeMeals.length > 0) {
      const hours = parseInt(timeStr.split(":")[0], 10) || 12;
      if (hours < 12 && activeMeals.some(m => m.id === "breakfast")) {
        linkedMealName = activeMeals.find(m => m.id === "breakfast")?.name || "";
      } else if (hours < 17 && activeMeals.some(m => m.id === "lunch")) {
        linkedMealName = activeMeals.find(m => m.id === "lunch")?.name || "";
      } else {
        linkedMealName = activeMeals[activeMeals.length - 1].name;
      }
    }

    const newEntry: DigestionLogEntry = {
      id: `d-lvl-log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      dayIndex: currentDayIndex,
      timestamp: nowStamp,
      timeString: timeStr,
      bristolType: newBristol,
      comfort: newComfort,
      note: newNote,
      linkedMeal: linkedMealName || undefined
    };

    const updatedLogs = { ...currentLogsMap };
    if (!updatedLogs[currentDayIndex]) {
      updatedLogs[currentDayIndex] = [];
    }
    updatedLogs[currentDayIndex].push(newEntry);

    currentSetLogs(updatedLogs);

    // Persist digestion log to DB (fire-and-forget)
    api("/api/metrics/daily", {
      method: "POST",
      body: {
        date: new Date().toISOString().split("T")[0],
        dayIndex: currentDayIndex,
        digestionLog: [newEntry],
      },
    }).catch(() => {
      console.warn("Failed to save digestion log to DB");
    });

    // Sync to dayNotes calendar
    if (newNote.trim()) {
      const updatedNotes = { ...dayNotes };
      if (!updatedNotes[currentDayIndex]) {
        updatedNotes[currentDayIndex] = [];
      }
      updatedNotes[currentDayIndex].push({
        text: `🍃 Пищеварение [${timeStr}]: ${newNote}`,
        time: timeStr
      });
      if (setDayNotes) {
        setDayNotes(updatedNotes);
      }
    }

    setShowAddModal(false);
  };

  const handleDeleteEntry = (id: string) => {
    const updatedDayLogs = dayLogs.filter(log => log.id !== id);
    const updatedAllLogs = { ...currentLogsMap, [currentDayIndex]: updatedDayLogs };
    currentSetLogs(updatedAllLogs);
  };

  // ADVANCED INDICATORS MATHS
  const bristolFreq = [null, 0, 0, 0, 0, 0, 0, 0];
  let totalBristolSum = 0;
  let healthyBristolCount = 0;
  let slowTransitCount = 0; // Type 1-2 (constipation style)
  let fastTransitCount = 0; // Type 6-7 (fast stool style)
  let comfortableCount = 0;

  allLogs.forEach(log => {
    const t = log.bristolType;
    if (t >= 1 && t <= 7) {
      bristolFreq[t] = (bristolFreq[t] || 0) + 1;
      totalBristolSum += t;
      if (t === 3 || t === 4 || t === 5) {
        healthyBristolCount++;
      }
      if (t === 1 || t === 2) slowTransitCount++;
      if (t === 6 || t === 7) fastTransitCount++;
    }
    if (log.comfort === "easy" || log.comfort === "normal") {
      comfortableCount++;
    }
  });

  const totalEpisodes = allLogs.length || 1;
  const avgBristolStyle = allLogs.length ? (totalBristolSum / allLogs.length).toFixed(1) : "4.0";
  const healthyBristolRatio = Math.round((healthyBristolCount / totalEpisodes) * 100);
  const slowTransitRatio = Math.round((slowTransitCount / totalEpisodes) * 100);
  const fastTransitRatio = Math.round((fastTransitCount / totalEpisodes) * 100);
  const comfortRatio = Math.round((comfortableCount / totalEpisodes) * 100);

  // Digest stability score = function of variance & comfort
  const stabilityIndex = Math.min(100, Math.max(25, Math.round(
    100 - (slowTransitRatio * 0.4) - (fastTransitRatio * 0.4) + (comfortRatio * 0.2)
  )));

  // Food Response index = based on fiber / non-salty food & comfortable stools ratio
  const foodResponseIndex = Math.min(100, Math.max(30, Math.round(
    comfortRatio * 0.7 + (resolvedWater >= 1500 ? 30 : (resolvedWater / 1500) * 30)
  )));

  // Comfort days count (how many logged days had at least 1 entry with mostly comfort === easy or normal)
  let comfortDaysCount = 0;
  const uniqueLoggedDays = Object.keys(currentLogsMap).length;
  (Object.values(currentLogsMap) as DigestionLogEntry[][]).forEach(dayList => {
    if (dayList.length > 0) {
      const dayComfortable = dayList.filter(l => l.comfort === "easy" || l.comfort === "normal").length;
      if (dayComfortable >= dayList.length / 2) {
        comfortDaysCount++;
      }
    }
  });

  return (
    <div className="w-full flex-1 flex flex-col justify-between min-h-0" id="digestion-screen">
      
      {/* 1. Add Entry Manual Dialog overlay */}
      <AnimatePresence>
        {showAddModal && (
          <div className="absolute inset-0 bg-black/45 backdrop-blur-xs flex items-end justify-center z-50">
            <div className="absolute inset-0 z-0" onClick={() => setShowAddModal(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="bg-white rounded-t-[36px] w-full max-w-[420px] p-5.5 text-left border-t border-slate-100 shadow-[0_-15px_35px_rgba(0,0,0,0.12)] relative z-10 max-h-[92%] overflow-y-auto scrollbar-none flex flex-col gap-4 text-slate-800"
            >
              <div className="flex justify-between items-center pb-1">
                <div>
                  <span className="text-[11px] font-black text-orange-600 tracking-wider uppercase block">ОТЧЁТ НА ПАНЕЛИ</span>
                  <h3 className="text-[19px] font-black text-slate-850" style={{ fontFamily: '"Calibri", sans-serif' }}>Добавить лог стула</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Time */}
              <div className="flex justify-between items-center bg-orange-50/20 px-3 py-2 rounded-2xl border border-orange-100/30">
                <span className="text-xs font-bold text-orange-700">Время записи:</span>
                <input
                  type="text"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-2.5 py-0.5 w-[65px] text-center font-mono font-bold text-slate-800 text-xs"
                />
              </div>

              {/* Bristol */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Бристольский тип ({newBristol})</span>
                <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {[1, 2, 3, 4, 5, 6, 7].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewBristol(type)}
                      className={`min-w-[44px] h-[64px] rounded-xl border flex flex-col justify-between items-center py-1.5 cursor-pointer ${
                        newBristol === type ? "bg-orange-50 border-orange-500 scale-102 font-bold" : "bg-white border-slate-100"
                      }`}
                    >
                      <BristolIcon type={type} />
                      <span className="text-[10.5px] scale-90 font-black font-mono">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comfort */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Ощущение комфорта</span>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "easy", label: "😌 Легко" },
                    { id: "normal", label: "☀️ Нормально" },
                    { id: "uncomfortable", label: "🌧️ Тяжело" }
                  ].map(x => (
                    <button
                      key={x.id}
                      type="button"
                      onClick={() => setNewComfort(x.id as any)}
                      className={`py-2 rounded-xl text-xs font-bold text-center border transition-all ${
                        newComfort === x.id ? "bg-orange-500 text-white border-transparent" : "bg-slate-50 border-slate-200/60 text-slate-700"
                      }`}
                    >
                      {x.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-1">Заметка</span>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Вздутие, тяжесть, реакция на пищу..."
                  className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2.5 h-[55px] outline-none resize-none focus:ring-1 focus:ring-orange-400"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-slate-100 text-slate-650 font-bold rounded-2.5xl text-xs hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalEntry}
                  className="flex-[2] py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-extrabold rounded-2.5xl text-xs shadow-md active:scale-97 transition-all cursor-pointer text-center"
                >
                  Сохранить
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Analytical Scrollable Body Screen */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-3 pb-8 bg-slate-50/50 flex flex-col">
        
        {/* Header bar area */}
        <div className="flex justify-between items-center w-full mb-4 pt-1.5">
          <button 
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white border border-slate-200/50 flex items-center justify-center text-slate-700 active:scale-90 hover:bg-slate-100 transition-all shadow-2xs"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          
          <span className="text-[13px] font-black text-orange-600 tracking-widest uppercase bg-orange-50 px-3 py-1 rounded-full border border-orange-100/50 shadow-3xs">
            Аналитика ЖКТ 🍂
          </span>
        </div>

        {/* Dynamic Greeting */}
        <div className="text-left mb-4.5">
          <h1 className="text-[26px] font-black text-slate-850 leading-tight" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
            Здоровье кишечника
          </h1>
          <p className="text-[13px] tracking-tight text-slate-500 font-medium">
            Наблюдение за пищеварением на 100% цельном растительном рационе (WFPB) без соли.
          </p>
        </div>

        {/* SECTION 1: СЕГОДНЯШНЯЯ КАРТИНА (Today's dynamic summary) */}
        <div className="bg-white rounded-[26px] border border-slate-100 shadow-[0_4px_18px_rgba(15,23,42,0.03)] p-4.5 mb-4 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-orange-50/40 rounded-full blur-xl pointer-events-none" />
          
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">СОСТОЯНИЕ СЕГОДНЯ</span>
              <h2 className="text-[17px] font-bold text-slate-850" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
                Активность за день
              </h2>
            </div>
            
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="text-[11.5px] font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-105 active:scale-95 transition-all px-3 py-1.5 rounded-full shadow-[0_3px_8px_rgba(249,115,22,0.22)] flex items-center gap-1 cursor-pointer"
            >
              <span>+ Новая запись</span>
            </button>
          </div>

          {/* List of recorded episodes today */}
          {dayLogs.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {dayLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-center justify-between bg-orange-50/10 hover:bg-orange-50/20 p-2.5 rounded-2xl border border-orange-100/30 transition-all"
                >
                  <div className="flex items-center gap-2.5">
                    {/* Compact Glassy Icon representation of Bristol type */}
                    <div className="w-9 h-9 rounded-xl bg-orange-100/50 flex items-center justify-center p-0.5 relative shadow-3xs">
                      <BristolIcon type={log.bristolType} />
                      <div className="absolute -top-1 -right-1 bg-white border border-orange-200 text-[#C2410C] font-mono text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-3xs">
                        {log.bristolType}
                      </div>
                    </div>

                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12.5px] font-black font-mono text-slate-800">{log.timeString}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full select-none ${
                          log.comfort === "easy" 
                            ? "bg-emerald-50 text-emerald-700" 
                            : log.comfort === "normal" 
                              ? "bg-orange-50 text-orange-700" 
                              : "bg-red-50 text-red-600"
                        }`}>
                          {log.comfort === "easy" ? "Легко" : log.comfort === "normal" ? "Нормально" : "Дискомфорт"}
                        </span>
                      </div>
                      
                      {/* Short Notes */}
                      {log.note ? (
                        <p className="text-[11.5px] text-slate-600 mt-0.5 italic font-medium">«{log.note}»</p>
                      ) : null}

                      {/* Linked Meal metadata indicators */}
                      {log.linkedMeal ? (
                        <span className="text-[9.5px] font-semibold text-orange-700 bg-orange-500/5 px-1.5 py-0.1 rounded-md mt-1 w-max">
                          🔗 Реакция на: {log.linkedMeal.split(" ")[0]}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Remove entry tactile cross */}
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(log.id)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-400 flex items-center justify-center transition-all cursor-pointer text-xs"
                    title="Удалить запись"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <div className="bg-slate-50 rounded-xl p-2.5 text-[11.5px] text-slate-500 leading-normal border border-slate-100 mt-1">
                ☀️ <strong>Итог дня:</strong> Сегодня зафиксировано {dayLogs.length} событий. Последний эпизод в {dayLogs[dayLogs.length - 1].timeString}. Состояние пищеварения стабильное.
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 px-3 bg-orange-500/5 rounded-2.5xl border border-dashed border-orange-200/60 mt-1">
              <span className="text-[26px] mb-1 leading-none select-none">🍃</span>
              <p className="text-slate-700 text-xs font-bold font-sans">Сегодня ещё нет записей о стуле</p>
              <p className="text-slate-400 text-[10.5px] text-center mt-1 leading-tight max-w-[280px]">
                Одиночное нажатие кнопки «Пищеварение» на главном экране позволяет мгновенно добавить запись в течение дня.
              </p>
            </div>
          )}
        </div>

        {dayLogs.length > 0 && !noteSavedOrSkipped && (
          <BriefNoteBlock
            moduleKey="digestion"
            onSave={handleSaveDigestionNote}
            onSkip={() => setNoteSavedOrSkipped(true)}
          />
        )}

        {/* SECTION 2: СМЫСЛОВОЙ БЛОК АННЫ (Anna's guidance block) */}
        <div className="bg-gradient-to-b from-[#FFFBEB] to-[#FEF3C7] border border-amber-200/50 rounded-[26px] p-5 mb-4 shadow-[inset_0_2px_4px_rgba(255,255,255,0.7),_0_5px_15px_rgba(245,158,11,0.08)] text-left relative overflow-hidden">
          <div className="absolute top-1 right-3.5 text-[28px] opacity-20 pointer-events-none select-none">✨</div>
          <div className="absolute -left-12 -bottom-12 w-28 h-28 bg-amber-200/20 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-3.5">
            <div className="relative shrink-0 select-none">
              <div className="w-[45px] h-[45px] rounded-full overflow-hidden shadow-md border border-amber-200/30 relative">
                <img
                  src={annaAvatarSrc}
                  alt="Анна — Советник WFPB"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-[12px] h-[12px] bg-[#10D150] rounded-full border-2 border-white shadow-sm flex items-center justify-center">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              </span>
            </div>
            <div>
              <span className="text-[9.5px] font-black text-amber-700 uppercase tracking-widest block leading-none">РЕКОМЕНДАЦИИ</span>
              <h3 className="text-[15.5px] font-black text-slate-850 leading-none mt-0.5">Бережные подсказки Анны</h3>
            </div>
          </div>

          <div className="text-[12.8px] leading-relaxed text-slate-800 font-medium space-y-2.5">
            {(() => {
              // Anna's smart heuristics based on current tracked state
              const lastLog = dayLogs.length > 0 ? dayLogs[dayLogs.length - 1] : (allLogs.length > 0 ? allLogs[allLogs.length - 1] : null);
              
              if (!lastLog) {
                return (
                  <p>
                    Привет, <strong>{resolvedUserName}</strong>! Для того чтобы я могла проанализировать динамику ЖКТ, сделайте вашу первую отметку о стуле. 
                    Наш рацион «Всё дело в еде!» исключает продукты животного происхождения и <strong>совершенно исключает соль</strong>. 
                    Это даёт потрясающий комфорт и избавляет от скрытых отёков стенок тонкого кишечника!
                  </p>
                );
              }

              const isConstipation = lastLog.bristolType <= 2;
              const isIdeal = lastLog.bristolType === 3 || lastLog.bristolType === 4;
              const isDiarrhea = lastLog.bristolType >= 6;

              const noteText = lastLog.note || "";

              const topGreenIngredients = aggregatedIngredients.filter(i => i.status === "green").slice(0, 3).map(i => i.name.toLowerCase()).join(", ");

              return (
                <div className="space-y-2">
                  {isIdeal && (
                    <p>
                      🌿 Идеальный отклик! Последний зарегистрированный тип <strong>{lastLog.bristolType}</strong> по Бристольской шкале подтверждает великолепную моторику кишечника. 
                      Обилие растительной клетчатки (WFPB) из зелёных смузи формирует идеальный здоровый стул, предотвращая любые застойные процессы. 
                      Тот факт, что в нашей еде <strong>абсолютно нет соли</strong>, сохраняет слизистую кишечника эластичной и препятствует раздражению.
                    </p>
                  )}

                  {isConstipation && (
                    <p>
                      💧 Замечена задержка транзита (тип <strong>{lastLog.bristolType}</strong>). Сегодня вами выпито <strong>{resolvedWater} мл</strong> воды. 
                      Увеличение объёма чистой негазированной тёплой воды в промежутках между едой — первый шаг к гармонизации моторики. 
                      Также я рекомендую добавить в утреннюю овсяную кашу (без соли!) столовую ложку свежесмолотых льняных семян. Это мягко защитит стенки ЖКТ.
                    </p>
                  )}

                  {isDiarrhea && (
                    <p>
                      🥗 Быстрый транзит (тип <strong>{lastLog.bristolType}</strong>) может указывать на адаптацию к обилию сырой растительной пищи. 
                      Если это сопровождалось дискомфортом, попробуйте на время минимизировать полностью сырые салаты и отдавать предпочтение 
                      тёплой термически щадящей пище: разваренному бурому рису, тушёному кабачку без соли или нежному пюре из печёной тыквы.
                    </p>
                  )}

                  {noteText.toLowerCase().includes("вздутие") && (
                    <p>
                      🎈 Я заметила жалобы на <strong>вздутие</strong>. Обычно это признак ферментации бобовых или грубых крестоцветных овощей. 
                      При варке нута или чечевицы дольше замачивайте их со сменой воды и хорошо проваривайте. Постепенно микрофлора 
                      кишечника обновится, заселив полезные бактерии, питающиеся растительными волокнами, и газы уйдут.
                    </p>
                  )}

                  {totalFiber > 0 && (
                    <p>
                      🌾 За день накоплено <strong>{totalFiber} г клетчатки</strong>. {totalFiber >= 25 ? "Отличный объём для комфортного транзита и питания микрофлоры." : totalFiber >= 10 ? "Хорошая база — добавь к ужину порцию бобовых или зелени, чтобы достичь терапевтического уровня." : "Старайся добавлять в каждый приём пищи бобовые, цельные злаки и листовую зелень для мягкого и регулярного очищения кишечника."}
                    </p>
                  )}

                  {topGreenIngredients && (
                    <p>
                      🥬 В рационе преобладают: <strong>{topGreenIngredients}</strong>. Это богатый источник пребиотиков и полифенолов, поддерживающих рост благородной микрофлоры.
                    </p>
                  )}


                  <p className="text-[12px] text-amber-900 border-t border-amber-300/30 pt-2 mt-2 leading-snug">
                    🌻 <strong>Важно:</strong> Всегда слушайте своё тело. Мы не занимаемся диагностикой заболеваний, а бережно восстанавливаем естественный ритм организма чистым, природным WFPB рационом.
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* SECTION 3: ВЫСОКОКЛАССНАЯ СТАТИСТИКА И ПАТТЕРНЫ */}
        <div className="bg-white rounded-[26px] border border-slate-100 shadow-[0_4px_18px_rgba(15,23,42,0.03)] p-4.5 mb-4 text-left">
          <div className="mb-3 px-0.5">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">ОБЩАЯ СТАТИСТИКА</span>
            <h2 className="text-[16px] font-black text-slate-850" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
              Тренды и ритмичность ЖКТ
            </h2>
          </div>

          {/* Three Grid Advanced indicators summary */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 text-center flex flex-col justify-between h-[84px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase leading-none block">БРИСТОЛЬ</span>
              <span className="text-[20px] font-black text-[#C2410C] leading-none my-1 font-mono">{avgBristolStyle}</span>
              <span className="text-[9.5px] font-bold text-slate-500 leading-none whitespace-nowrap block">Средний тип</span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 text-center flex flex-col justify-between h-[84px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase leading-none block">СТАБИЛЬНОСТЬ</span>
              <span className="text-[20px] font-black text-emerald-600 leading-none my-1 font-mono">{stabilityIndex}%</span>
              <span className="text-[9.5px] font-bold text-slate-500 leading-none whitespace-nowrap block">Индекс ритма</span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 text-center flex flex-col justify-between h-[84px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase leading-none block">КОМФОРТ</span>
              <span className="text-[20px] font-black text-orange-600 leading-none my-1 font-mono">{comfortRatio}%</span>
              <span className="text-[9.5px] font-bold text-slate-500 leading-none whitespace-nowrap block">Доля комфорта</span>
            </div>
          </div>

          {/* Type frequencies distribution percentages */}
          <div className="space-y-3 px-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block mb-1">Распределение типов стула</span>
            
            {/* 1. Normal Comfortable Ratio Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11.5px] font-bold text-slate-650">
                <span>Идеальный стул (Типы 3, 4, 5) 🌿</span>
                <span className="font-mono text-emerald-600">{healthyBristolRatio}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${healthyBristolRatio}%` }}
                />
              </div>
            </div>

            {/* 2. Constipation Ratio Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11.5px] font-bold text-slate-650">
                <span>Замедленный транзит (Типы 1, 2) 🪨</span>
                <span className="font-mono text-orange-600">{slowTransitRatio}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-orange-400 to-amber-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${slowTransitRatio}%` }}
                />
              </div>
            </div>

            {/* 3. Fast Stool Ratio Bar */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11.5px] font-bold text-slate-650">
                <span>Ускоренный транзит (Типы 6, 7) 🌊</span>
                <span className="font-mono text-red-600">{fastTransitRatio}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-400 to-rose-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${fastTransitRatio}%` }}
                />
              </div>
            </div>
          </div>

          {/* ADVANCED ADVOCACY BOX: Correlations and patterns */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 space-y-2 px-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block mb-1">Корреляция с другими факторами</span>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase">Питьевой баланс</span>
                <span className="text-[12px] font-extrabold text-slate-700 block">
                  {resolvedWater >= 1500 ? "💧 Норма достигнута" : "⚠️ Нехватка воды"}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">Влияет на мягкость типов 1-2</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase">Клетчатка (WFPB)</span>
                <span className="text-[12px] font-extrabold text-emerald-600 block">
                  {totalFiber >= 25 ? "🥗 Отличный уровень" : totalFiber > 0 ? "⚡ Средний уровень" : "⏳ Нет данных"}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                  {totalFiber > 0 ? `${totalFiber} г из 35 г` : "Добавьте бобовые и зелень"}
                </span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase">Индекс пищевого отклика</span>
                <span className="text-[12.5px] font-black text-slate-700 block font-mono">{foodResponseIndex}%</span>
                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">Чувствительность к еде</span>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 block mb-0.5 uppercase">Дней без дискомфорта</span>
                <span className="text-[12.5px] font-black text-emerald-600 block font-mono">{comfortDaysCount} из {uniqueLoggedDays} дн.</span>
                <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">Стабильный комфорт ЖКТ</span>
              </div>
            </div>
          </div>
        </div>

        {/* DATA PERSISTENCE INFO */}
        <div className="bg-slate-100/50 rounded-2xl p-3 border border-slate-200/50 text-[11px] text-slate-500 leading-snug font-medium text-left mb-6.5">
          ℹ️ Все записи о пищеварении сохраняются в вашем дневнике. Статистика ЖКТ обновляется по мере добавления новых данных.
        </div>

        {/* Back and Confirm buttons row */}
        <div className="w-full px-2 mb-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full py-4 rounded-[28px] text-[16px] font-black text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 active:scale-95 shadow-[0_5px_15px_rgba(249,115,22,0.22)] transition-all cursor-pointer flex items-center justify-center relative select-none"
            style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}
          >
            Вернуться на главную
          </button>
        </div>

      </div>

      {/* Embedded footer */}
      <div className="w-full">
        <BottomBar onHomeClick={onBack} />
      </div>

    </div>
  );
}
