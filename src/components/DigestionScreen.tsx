import React, { useState } from "react";
import { ChevronLeft, Inbox } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomBar from "./BottomBar";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { getDigestionFeedback } from "../utils/digestionCoaching";
import { getMovementMinutes } from "../utils/movementUtils";
import { buildDailySummary } from "../utils/crossModuleSummary";
import { getWaterGoal } from "../utils/waterGoal";
import AnnaText from "./AnnaText";
import { BRISTOL_IMAGES, DIGESTION_SYMPTOM_COLORS } from "../utils/digestionConstants";
import ingrGreen from "../assets/ingredients/ingr_green.webp";
import iconFiber from "../assets/images/icone/2.webp";
import iconWaterBalance from "../assets/images/water/stat_care_hands.webp";
import iconMovementTime from "../assets/images/measurements/icon_time.webp";

const annaAvatarSrc = resolveAvatar({ toneGroup: 'neutral_thoughtful', intent: 'thoughtful' }).src;

export interface DigestionLogEntry {
  id: string;
  dayIndex: number;
  timestamp: number;
  timeString: string;
  timeInterval?: string;
  bristolType: number;
  comfort: "easy" | "normal" | "uncomfortable" | "scanty" | "voluminous" | "Легко" | "Нормально" | "Тяжело";
  symptoms?: string[];
  note?: string;
  linkedMeal?: string;
}

// Normalizes comfort storage (Russian labels from the new modal vs legacy ids) to legacy ids
export const normalizeComfort = (comfort: string | undefined | null): "easy" | "normal" | "uncomfortable" => {
  if (comfort === "Легко") return "easy";
  if (comfort === "Нормально") return "normal";
  if (comfort === "Тяжело") return "uncomfortable";
  return (comfort as "easy" | "normal" | "uncomfortable") || "normal";
};

// Comfort presentation meta for the new scale (scanty/normal/voluminous) with legacy fallback.
export const getComfortMeta = (
  comfort: string | undefined | null
): { label: string; badge: string; fill: string } => {
  switch (comfort) {
    case "scanty":
      return { label: "Скудно", badge: "bg-amber-100/80 text-amber-800 border border-amber-200/60", fill: "#FACC15" };
    case "voluminous":
      return { label: "Объёмно", badge: "bg-sky-100/80 text-sky-800 border border-sky-200/60", fill: "#38BDF8" };
    case "normal":
    case "Нормально":
      return { label: "Нормально", badge: "bg-emerald-100/80 text-emerald-800 border border-emerald-200/60", fill: "#34D399" };
    case "easy":
    case "Легко":
      return { label: "Легко", badge: "bg-emerald-100/80 text-emerald-800 border border-emerald-200/60", fill: "#34D399" };
    case "uncomfortable":
    case "Тяжело":
      return { label: "Тяжело", badge: "bg-rose-100/80 text-rose-800 border border-rose-200/60", fill: "#FB7185" };
    default:
      return { label: "Нормально", badge: "bg-emerald-100/80 text-emerald-800 border border-emerald-200/60", fill: "#34D399" };
  }
};

interface DigestionScreenProps {
  onBack?: () => void;
  currentDayIndex?: number;
  userName?: string;
  userGender?: "female" | "male";
  meals?: { id: string; name: string; checked: boolean }[];
  water?: number;
  totalFiber?: number;
  aggregatedIngredients?: { name: string; weight: number; status: string }[];
  screen?: string;
  onOpenCalendar?: () => void;
}

export default function DigestionScreen({
  onBack: propsOnBack,
  currentDayIndex: propDayIndex,
  userName = "друг",
  userGender = "male",
  meals = [],
  water = 0,
  totalFiber = 0,
  aggregatedIngredients = [],
}: DigestionScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen);
  const onBack = propsOnBack || (() => setScreen("my-day"));

  const digestionEntries = useAppStore((s) => s.digestionEntries);
  const setDigestionEntries = useAppStore((s) => s.setDigestionEntries);
  const savedDishesStore = useAppStore((s) => s.savedDishes);
  const foodCache = useAppStore((s) => s.foodCache);
  const currentDayIndex = propDayIndex ?? (useAppStore((s) => s.userProfile.currentDayIndex) ?? 1);

  // Period selector state: 7 days, 14 days, or the whole history
  const [periodDays, setPeriodDays] = useState<"7" | "14" | "all">("7");

  // Chart metric tabs and selected graph day (history journal target)
  const [activeChartTab, setActiveChartTab] = useState<"stool" | "symptoms" | "comfort">("stool");
  const selectedGraphDay = useAppStore((s) => s.selectedGraphDay);
  const setSelectedGraphDay = useAppStore((s) => s.setSelectedGraphDay);

  // Keep the journal's selected day in sync with the active course day
  React.useEffect(() => {
    setSelectedGraphDay(currentDayIndex);
  }, [currentDayIndex, setSelectedGraphDay]);

  const waterEntries = useAppStore((s) => s.waterEntries);
  const movementEntries = useAppStore((s) => s.movementEntries);
  const measurementEntries = useAppStore((s) => s.measurementEntries);
  const profile = useAppStore((s) => s.userProfile);
  const waterGoal = React.useMemo(() => {
    return getWaterGoal(profile.weight);
  }, [profile.weight]);

  const fromDayIndex = periodDays === "all"
    ? 0
    : Math.max(0, currentDayIndex - Number(periodDays) + 1);

  const dayLogs = React.useMemo(() => {
    return digestionEntries
      .filter((e) => Number(e.dayIndex) === Number(currentDayIndex))
      .map((e) => ({
        id: e.id || `srv-${e.dayIndex}-${e.timestamp}`,
        dayIndex: e.dayIndex,
        timestamp: e.timestamp,
        timeString: e.timeString || "",
        timeInterval: e.timeInterval,
        bristolType: e.bristolType,
        comfort: e.comfort as DigestionLogEntry["comfort"],
        symptoms: e.symptoms || [],
        note: e.note || "",
      }));
  }, [digestionEntries, currentDayIndex]);

  const periodLogs = React.useMemo(() => {
    return digestionEntries.filter((e) => Number(e.dayIndex) >= fromDayIndex && Number(e.dayIndex) <= Number(currentDayIndex));
  }, [digestionEntries, fromDayIndex, currentDayIndex]);

  // Fetch historical digestion logs from server on mount
  React.useEffect(() => {
    api<Record<string, any>[]>("/api/metrics/daily")
      .then(records => {
        if (!records || !Array.isArray(records)) return;
        const serverEntries: { id: string; dayIndex: number; timestamp: number; timeString: string; timeInterval?: string; bristolType: number; comfort: any; symptoms: string[]; note: string; type: string }[] = [];
        for (const r of records) {
          const rawLogs = r.digestionLog;
          let logs: any[] = [];
          if (typeof rawLogs === 'string') { try { logs = JSON.parse(rawLogs); } catch {} }
          else if (Array.isArray(rawLogs)) { logs = rawLogs; }
          for (const entry of logs) {
            if (entry && entry.id && entry.dayIndex !== undefined) {
              serverEntries.push({
                id: entry.id,
                dayIndex: Number(entry.dayIndex),
                timestamp: entry.timestamp || Date.now(),
                timeString: entry.timeString || "",
                timeInterval: entry.timeInterval || undefined,
                bristolType: entry.bristolType ?? 4,
                comfort: entry.comfort || "normal",
                symptoms: Array.isArray(entry.symptoms) ? entry.symptoms : [],
                note: entry.note || "",
                type: entry.type || "stool",
              });
            }
          }
        }
        if (serverEntries.length > 0) {
          const prevEntries = useAppStore.getState().digestionEntries;
          const byId = new Map(prevEntries.map(pe => [pe.id, pe]));
          for (const se of serverEntries) byId.set(se.id, se);
          setDigestionEntries(Array.from(byId.values()));
          setSelectedGraphDay(currentDayIndex);
        }
      })
      .catch((err) => console.warn("[Digestion] failed to load history:", err));
  }, [setDigestionEntries]);

  // ---- STATISTICS OVER THE 28-DAY PERIOD ----
  const totalEpisodes = periodLogs.length;

  let healthyBristolCount = 0;
  let slowTransitCount = 0;
  let fastTransitCount = 0;

  periodLogs.forEach(log => {
    const t = log.bristolType;
    if (t >= 1 && t <= 7) {
      if (t === 3 || t === 4 || t === 5) healthyBristolCount++;
      if (t === 1 || t === 2) slowTransitCount++;
      if (t === 6 || t === 7) fastTransitCount++;
    }
  });

  const healthyBristolRatio = totalEpisodes ? Math.round((healthyBristolCount / totalEpisodes) * 100) : null;
  const slowTransitRatio = totalEpisodes ? Math.round((slowTransitCount / totalEpisodes) * 100) : null;
  const fastTransitRatio = totalEpisodes ? Math.round((fastTransitCount / totalEpisodes) * 100) : null;

  const firstLogDay = digestionEntries.length > 0 ? Math.min(...digestionEntries.map(e => Number(e.dayIndex))) : currentDayIndex;

  // ---- DASHBOARD METRICS ----
  const dashboard = React.useMemo(() => {
    const periodStart = periodDays === "all"
      ? Math.max(1, firstLogDay)
      : Math.max(1, currentDayIndex - Number(periodDays) + 1);
    const totalDays = Math.max(0, currentDayIndex - periodStart + 1);

    const freq: Record<number, number> = {};
    periodLogs.forEach((l) => {
      const t = Number(l.bristolType);
      if (t >= 1 && t <= 7) freq[t] = (freq[t] || 0) + 1;
    });

    let modeType: number | null = null;
    let modeCount = 0;
    for (let t = 1; t <= 7; t++) {
      const c = freq[t] || 0;
      if (c > modeCount) {
        modeCount = c;
        modeType = t;
      }
    }
    const constipationCount = (freq[1] || 0) + (freq[2] || 0);
    const diarrheaCount = (freq[6] || 0) + (freq[7] || 0);

    const isSwing =
      periodLogs.length > 0 &&
      constipationCount > 0 &&
      diarrheaCount > 0 &&
      Math.abs(constipationCount - diarrheaCount) <= 1;

    let statusLabel = "—";
    let statusColor = "text-slate-400";
    if (modeType !== null) {
      if (isSwing) {
        statusLabel = "Качели";
        statusColor = "text-amber-500";
      } else if (modeType >= 3 && modeType <= 5) {
        statusLabel = "Норма";
        statusColor = "text-emerald-600";
      } else if (modeType <= 2) {
        statusLabel = "Запор";
        statusColor = "text-amber-500";
      } else {
        statusLabel = "Диарея";
        statusColor = "text-rose-500";
      }
    }

    const perDayCount: Record<number, number> = {};
    const perDayHasSymptom: Record<number, boolean> = {};
    for (let d = periodStart; d <= currentDayIndex; d++) {
      perDayCount[d] = 0;
      perDayHasSymptom[d] = false;
    }
    periodLogs.forEach((l) => {
      const d = Number(l.dayIndex);
      if (d < periodStart || d > currentDayIndex) return;
      perDayCount[d] = (perDayCount[d] || 0) + 1;
      const syms = (l.symptoms || []).filter((s) => s !== "Нет симптомов");
      if (syms.length > 0) perDayHasSymptom[d] = true;
    });

    let emptyDays = 0;
    let spikeDays = 0;
    let maxPerDay = 0;
    for (let d = periodStart; d <= currentDayIndex; d++) {
      const c = perDayCount[d] || 0;
      if (c === 0) emptyDays++;
      if (c > 3) spikeDays++;
      if (c > maxPerDay) maxPerDay = c;
    }

    let rhythmLabel = "—";
    let rhythmColor = "text-slate-400";
    if (periodLogs.length > 0 && totalDays > 0) {
      if (emptyDays > 2 || spikeDays > 2) {
        rhythmLabel = "Хаос";
        rhythmColor = "text-rose-500";
      } else if (emptyDays >= 1 || spikeDays >= 1) {
        rhythmLabel = "Сбои";
        rhythmColor = "text-amber-500";
      } else {
        rhythmLabel = "Норма";
        rhythmColor = "text-emerald-600";
      }
    }

    let daysWithSymptoms = 0;
    let daysWithout = 0;
    for (let d = periodStart; d <= currentDayIndex; d++) {
      if ((perDayCount[d] || 0) === 0) continue;
      if (perDayHasSymptom[d]) daysWithSymptoms++;
      else daysWithout++;
    }

    let stableDays = 0;
    for (let d = periodStart; d <= currentDayIndex; d++) {
      const dayEntries = periodLogs.filter((l) => Number(l.dayIndex) === d);
      if (dayEntries.length === 0) continue;
      const allGood = dayEntries.every((l) => {
        const t = Number(l.bristolType);
        const syms = (l.symptoms || []).filter((s) => s !== "Нет симптомов");
        return t >= 3 && t <= 5 && syms.length === 0;
      });
      if (allGood) stableDays++;
    }
    const stabilityPct = totalDays > 0 ? Math.round((stableDays / totalDays) * 100) : null;

    let stabilityBadge = "bg-slate-100 text-slate-500 border border-slate-200/50";
    if (stabilityPct !== null) {
      if (stabilityPct >= 80) stabilityBadge = "bg-emerald-50 text-emerald-700 border border-emerald-200/60";
      else if (stabilityPct >= 50) stabilityBadge = "bg-amber-50 text-amber-700 border border-amber-200/60";
      else stabilityBadge = "bg-rose-50 text-rose-700 border border-rose-200/60";
    }

    return {
      statusLabel,
      statusColor,
      modeType,
      rhythmLabel,
      rhythmColor,
      daysWithSymptoms,
      daysWithout,
      stabilityPct,
      stabilityBadge,
    };
  }, [periodLogs, periodDays, firstLogDay, currentDayIndex]);

  // ---- ANNA'S INTELLIGENCE ----
  const todayLogs = React.useMemo(() => {
    return digestionEntries.filter(e => Number(e.dayIndex) === Number(currentDayIndex));
  }, [digestionEntries, currentDayIndex]);

  const annaFeedback = React.useMemo(() => {
    const summary = buildDailySummary(selectedGraphDay ?? currentDayIndex, useAppStore.getState(), currentDayIndex);
    return getDigestionFeedback(
      summary,
      userName || profile.name,
      userGender
    );
  }, [selectedGraphDay, currentDayIndex, digestionEntries, waterEntries, movementEntries, measurementEntries, savedDishesStore, userName, userGender, profile.name]);

  const latestLog = todayLogs.length > 0 ? [...todayLogs].sort((a, b) => b.timestamp - a.timestamp)[0] : null;

  // ---- 28-DAY CHART DATA ----
  const { chartData, maxBars } = React.useMemo(() => {
    let max = 0;
    const data: any[] = [];
    
    for (let d = 1; d <= 28; d++) {
      const logs = periodLogs
        .filter((l) => Number(l.dayIndex) === d)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        
      if (logs.length > max) max = logs.length;
      
      const point: any = { day: d, logs, hitboxVal: 0.1 };
      
      logs.forEach((log, i) => {
         point[`log${i}`] = 1;
      });
      data.push(point);
    }
    
    return { chartData: data, maxBars: Math.max(1, max) };
  }, [periodLogs]);

  const getFillColor = (log: any, tab: string): string => {
    if (!log) return "transparent";
    if (tab === "stool") {
      const t = log.bristolType;
      if (t === 3 || t === 4 || t === 5) return "#10B981"; // emerald-500
      if (t === 1 || t === 2) return "#F59E0B"; // amber-500
      if (t === 6 || t === 7) return "#F43F5E"; // rose-500
      return "#CBD5E1";
    }
    if (tab === "symptoms") {
      const n = (log.symptoms || []).filter((s: string) => s !== "Нет симптомов").length;
      if (n === 0) return "#10B981";
      if (n === 1) return "#F59E0B";
      return "#F43F5E";
    }
    if (tab === "comfort") {
      return getComfortMeta(log.comfort).fill;
    }
    return "transparent";
  };

  // ---- HISTORY JOURNAL DATA ----
  const selectedDayHist = React.useMemo(() => {
    return periodLogs
      .filter((l) => Number(l.dayIndex) === Number(selectedGraphDay))
      .filter((l) => l && l.bristolType && Number(l.bristolType) >= 1 && Number(l.bristolType) <= 7)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [periodLogs, selectedGraphDay]);

  // ---- CORRELATION LOGIC ----
  const periodWaterAvgPct = React.useMemo(() => {
    const dailyGoal = waterGoal;
    const drankToday = waterEntries
      .filter((w) => Number(w.dayIndex) === Number(currentDayIndex))
      .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    return Math.min(100, Math.round((drankToday / dailyGoal) * 100));
  }, [waterEntries, waterGoal, currentDayIndex]);
  const waterNormMet = periodWaterAvgPct >= 100;

  const isMixerDish = (d: any): boolean => d?.sourceType === "mixer" || d?.category === "Миксер";
  const dayFiber = React.useMemo(() => {
    const targetDay = selectedGraphDay ?? currentDayIndex;
    const dishes = (savedDishesStore || []).filter(
      (d) => d.dayIndex !== undefined && Number(d.dayIndex) === Number(targetDay) && !isMixerDish(d)
    );
    let sum = 0;
    for (const dish of dishes) {
      const raw = dish.computedNutrients?.fiber ?? dish.fiber;
      const direct = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      if (!Number.isNaN(direct) && direct > 0) {
        sum += direct;
        continue;
      }
      for (const ing of dish.ingredients || []) {
        const cacheItem = foodCache.find(
          (fc) => fc.nameRu && ing.name && fc.nameRu.toLowerCase() === String(ing.name).toLowerCase()
        );
        if (cacheItem && cacheItem.fiber) {
          const weight = parseFloat(String(ing.weight)) || 0;
          sum += (cacheItem.fiber * weight) / 100;
        }
      }
    }
    return Math.round(sum * 10) / 10;
  }, [savedDishesStore, foodCache, selectedGraphDay, currentDayIndex]);

  const todayMovementMin = React.useMemo(() => {
    const todayEntries = movementEntries.filter((m) => Number(m.dayIndex) === Number(currentDayIndex));
    return getMovementMinutes(todayEntries);
  }, [movementEntries, currentDayIndex]);

  // ---- CUSTOM SHAPES FOR CHART ----
  const HitboxShape = (props: any) => {
    const { x, y, width, height, payload, background } = props;
    const fullHeight = background ? background.height : (height > 0 ? height : 200);
    const bottomY = background ? background.y + background.height : y + height;
    const topY = bottomY - fullHeight;
    return (
      <rect
        x={x}
        y={topY}
        width={width}
        height={fullHeight || 200}
        fill="transparent"
        cursor="pointer"
        style={{ outline: 'none', border: 'none' }}
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (payload && payload.day) {
            setSelectedGraphDay(Number(payload.day));
          }
        }}
      />
    );
  };

  const StackedBlockShape = (props: any) => {
    const { x, y, width, height, fill } = props;
    if (!height || height === 0) return null;
    const gap = 2;
    return (
      <rect 
         x={x} 
         y={y + gap/2} 
         width={width} 
         height={Math.max(0, height - gap)} 
         rx={3} 
         ry={3} 
         fill={fill} 
      />
    );
  };

  const CustomDigestionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0].payload;
      const { day, logs } = p;
      
      if (!logs || logs.length === 0) {
        return (
          <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(15,23,42,0.08)] border border-white rounded-2xl p-3 text-[13px] font-bold text-slate-800 z-[100]">
            <div>День {day}</div>
            <div className="text-slate-400 font-medium text-xs mt-0.5">Нет записей</div>
          </div>
        );
      }

      return (
        <div className="bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(15,23,42,0.08)] border border-white rounded-2xl p-3 text-[13px] font-bold text-slate-800 z-[100] max-w-[220px]">
          <div className="mb-2 border-b border-slate-100 pb-1.5 flex justify-between items-center gap-3">
            <span className="font-black text-slate-800">День {day}</span>
            <span className="text-[10px] text-slate-500 font-bold bg-slate-100/70 px-2 py-0.5 rounded-full">
              Записей: {logs.length}
            </span>
          </div>
          
          <div className="flex flex-col gap-2">
            {[...logs].map((log: any, idx: number) => {
               const cLabel = getComfortMeta(log.comfort).label;
               const negSyms = (log.symptoms || []).filter((s: string) => s !== "Нет симптомов");
               const symText = negSyms.length > 0 ? negSyms.join(", ") : "Нет симптомов";
               
               let mainText = "";
               let subText = "";
               
               if (activeChartTab === "stool") {
                 mainText = `Тип ${log.bristolType}`;
                 subText = `(${cLabel})`;
               } else if (activeChartTab === "symptoms") {
                 mainText = symText;
                 subText = `(Тип ${log.bristolType})`;
               } else if (activeChartTab === "comfort") {
                 mainText = cLabel;
                 subText = `(Тип ${log.bristolType})`;
               }
               
               const color = getFillColor(log, activeChartTab);
               
               return (
                 <div key={log.id || idx} className="flex items-start gap-2 leading-tight">
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 w-8 shrink-0">{log.timeString || "—"}</span>
                    <div className="w-2.5 h-2.5 rounded-full mt-[3px] shrink-0 shadow-xs" style={{ backgroundColor: color }} />
                    <div className="flex flex-col min-w-0">
                       <span className="text-slate-700 text-xs font-semibold truncate">{mainText}</span>
                       <span className="text-[10px] text-slate-400 font-medium">{subText}</span>
                    </div>
                 </div>
               );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between min-h-0 bg-[#FAFBFB]" id="digestion-screen">

      {/* Main Analytical Scrollable Body Screen */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4.5 pt-3 pb-5 flex flex-col">

        {/* Global header bar */}
        <div className="relative w-full flex items-center justify-center mb-5 pt-1">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] flex items-center justify-center text-slate-700 active:scale-95 hover:bg-slate-50 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="flex flex-col items-center text-center">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Дневник</span>
            <span className="text-[18px] font-black text-slate-800 tracking-tight mt-1">Здоровье кишечника</span>
          </div>
        </div>

        {/* BLOCK 1: Тренды и ритмичность ЖКТ */}
        <div className="bg-white/90 backdrop-blur-xs rounded-[28px] border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] p-4.5 mb-3.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-slate-400 block">ОБЩАЯ СТАТИСТИКА</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-800 mt-0.5">Тренды и ритм ЖКТ</h2>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-tight whitespace-nowrap shrink-0 ${dashboard.stabilityBadge}`}>
              {dashboard.stabilityPct === null ? "—%" : `${dashboard.stabilityPct}%`} стабильности
            </span>
          </div>

          {/* Period selector tabs */}
          <div className="flex flex-row gap-1 w-full mt-3.5 bg-slate-100/70 p-1 rounded-2xl">
            {(["7", "14", "all"] as const).map(p => {
              const isActive = periodDays === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodDays(p)}
                  className={`flex-1 py-1.5 rounded-xl text-[11.5px] font-bold transition-all cursor-pointer ${
                    isActive 
                      ? "bg-white text-emerald-700 shadow-xs border border-white" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {p === "7" ? "7 дней" : p === "14" ? "14 дней" : "Весь период"}
                </button>
              );
            })}
          </div>

          {/* Empty state over period */}
          {totalEpisodes === 0 && (
            <div className="flex flex-col items-center justify-center py-5 px-3 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200/80 mt-3.5">
              <Inbox className="w-5 h-5 text-slate-300 mb-1" strokeWidth={2} />
              <p className="text-slate-700 text-xs font-bold">Нет записей за период</p>
              <p className="text-slate-400 text-[10.5px] text-center mt-1 leading-tight max-w-[260px]">
                Добавьте первую запись, чтобы появилась статистика.
              </p>
            </div>
          )}

          {/* Top three metric tiles with fixed overflow and scaling font */}
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5 mt-3.5">
            <div className="bg-slate-50/60 border border-slate-100/80 rounded-2xl p-2.5 flex flex-col items-center justify-center min-w-0">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">СТАТУС</span>
              <span className={`text-base sm:text-lg font-black font-mono tracking-tight truncate max-w-full mb-0.5 ${dashboard.statusColor}`}>
                {dashboard.statusLabel}
              </span>
              <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap shrink-0">
                {dashboard.modeType === null ? "Нет данных" : `Тип ${dashboard.modeType}`}
              </span>
            </div>

            <div className="bg-slate-50/60 border border-slate-100/80 rounded-2xl p-2.5 flex flex-col items-center justify-center min-w-0">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">РИТМ</span>
              <span className={`text-base sm:text-lg font-black font-mono tracking-tight truncate max-w-full mb-0.5 ${dashboard.rhythmColor}`}>
                {dashboard.rhythmLabel}
              </span>
              <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap shrink-0">Частота стула</span>
            </div>

            <div className="bg-slate-50/60 border border-slate-100/80 rounded-2xl p-2.5 flex flex-col items-center justify-center min-w-0">
              <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider mb-1">КОМФОРТ</span>
              <span className="text-base sm:text-lg font-black font-mono tracking-tight mb-0.5 whitespace-nowrap shrink-0">
                <span className={dashboard.daysWithSymptoms > 2 ? "text-amber-500" : "text-slate-800"}>{dashboard.daysWithSymptoms}</span>
                <span className="text-slate-300 mx-1 font-normal">|</span>
                <span className="text-emerald-600">{dashboard.daysWithout}</span>
              </span>
              <span className="text-[9px] font-semibold text-slate-500 whitespace-nowrap shrink-0">Симптоматика</span>
            </div>
          </div>

          {/* Progress bars: ideal / delayed / fast */}
          <div className="space-y-3.5 mt-4 pt-1">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Идеальный (Типы 3, 4, 5)</span>
                <span className="text-emerald-600 font-mono font-black">{healthyBristolRatio === null ? "—" : `${healthyBristolRatio}%`}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-700" style={{ width: `${healthyBristolRatio ?? 0}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Замедленный (Типы 1, 2)</span>
                <span className="text-amber-500 font-mono font-black">{slowTransitRatio === null ? "—" : `${slowTransitRatio}%`}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full transition-all duration-700" style={{ width: `${slowTransitRatio ?? 0}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11px] font-bold text-slate-600">
                <span>Ускоренный (Типы 6, 7)</span>
                <span className="text-rose-500 font-mono font-black">{fastTransitRatio === null ? "—" : `${fastTransitRatio}%`}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full transition-all duration-700" style={{ width: `${fastTransitRatio ?? 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK 2: Последний замер & Интеллект Анны */}
        {latestLog && (
          <div className="bg-amber-50/80 border border-amber-200/60 rounded-2xl px-3.5 py-2.5 mb-2.5 flex items-center justify-between relative z-30 shadow-xs">
            {/* Left part: Time, Type Circle, Image */}
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="text-[13px] font-black font-mono text-slate-700 shrink-0 leading-none">
                {latestLog.timeString || "—"}
              </div>
              <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-slate-700 shadow-xs border border-amber-200/50">
                {latestLog.bristolType || 4}
              </div>
              <img 
                src={BRISTOL_IMAGES[Math.min(6, Math.max(0, (latestLog.bristolType || 4) - 1))]} 
                alt={`Бристоль ${latestLog.bristolType}`} 
                className="h-7 w-auto object-contain shrink-0" 
              />
            </div>

            {/* Middle part: Symptoms (centered) with white upward tooltips */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 flex-1 px-2">
              {(latestLog.symptoms || []).filter(s => s !== "Нет симптомов").map(s => {
                const color = DIGESTION_SYMPTOM_COLORS[s]?.active?.split(" ")[0] || "bg-slate-300";
                return (
                  <div key={s} className="group relative flex items-center justify-center cursor-pointer">
                    <span className={`w-3.5 h-3.5 rounded-full ${color} shadow-xs border border-white transition-transform group-hover:scale-110`} />
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border border-slate-100/90 text-slate-800 text-[11px] font-extrabold px-3 py-1.5 rounded-xl shadow-[0_8px_25px_rgba(15,23,42,0.12)] opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[100] flex flex-col items-center">
                      <span>{s}</span>
                      <div className="w-2 h-2 bg-white border-r border-b border-slate-100/90 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                    </div>
                  </div>
                );
              })}
              {(!latestLog.symptoms || latestLog.symptoms.filter(s => s !== "Нет симптомов").length === 0) && (
                <div className="group relative flex items-center justify-center cursor-pointer">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-xs border border-white transition-transform group-hover:scale-110" />
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white border border-slate-100/90 text-slate-800 text-[11px] font-extrabold px-3 py-1.5 rounded-xl shadow-[0_8px_25px_rgba(15,23,42,0.12)] opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-[100] flex flex-col items-center">
                    <span>Нет симптомов</span>
                    <div className="w-2 h-2 bg-white border-r border-b border-slate-100/90 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
                  </div>
                </div>
              )}
            </div>

            {/* Right part: Comfort badge */}
            <div className="shrink-0 flex items-center">
              <span className={`px-2 py-0.5 flex items-center justify-center rounded-lg text-[10px] font-black ${getComfortMeta(latestLog.comfort).badge}`}>
                {getComfortMeta(latestLog.comfort).label}
              </span>
            </div>
          </div>
        )}

        {/* Карточка Анны в каноническом стиле */}
        <div className="bg-white/95 rounded-[28px] border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] p-4.5 text-left flex flex-col gap-3 relative z-10 mb-3.5" id="anna-digestion-advice-box">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-emerald-200/60 shadow-xs">
                  <img
                    src={annaAvatarSrc}
                    alt="Анна советует"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-[15px] font-black text-slate-900 leading-none">Анна</span>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-1.5 py-0.5 rounded-md">
                    ЖКТ
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 leading-none">Советник WFPB</span>
              </div>
            </div>

            <img src={ingrGreen} alt="Логотип WFPB" className="w-6 h-6 object-contain opacity-80" />
          </div>

          <div className="bg-slate-50/70 border border-slate-100/70 p-3.5 rounded-2xl text-[13px] leading-relaxed font-normal text-slate-600">
            <AnnaText text={annaFeedback} userName={userName} />
          </div>
        </div>

        {/* BLOCK 3: Динамика пищеварения (Recharts) */}
        <div className="bg-white/90 backdrop-blur-xs rounded-[28px] border border-white shadow-[0_4px_20px_rgba(15,23,42,0.05)] p-4.5 mb-3.5 min-h-[350px]">
          <div className="flex justify-between items-start gap-2">
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-emerald-700 block">СТАТИСТИКА КУРСА</span>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-800 mt-0.5">Динамика пищеварения за 28 дней</h2>
            </div>
            <span className="text-[11px] text-slate-600 font-bold bg-slate-100/70 px-2.5 py-0.5 rounded-lg border border-slate-200/50 whitespace-nowrap shrink-0">
              День: <span className="text-emerald-700 font-mono font-black">{selectedGraphDay}</span>
            </span>
          </div>

          {/* Metric selector pill bar */}
          <div className="flex flex-row justify-between gap-1 w-full bg-slate-100/70 p-1 rounded-2xl mt-3.5">
            {([
              { id: "stool", label: "Тип стула" },
              { id: "symptoms", label: "Симптомы" },
              { id: "comfort", label: "Комфорт" }
            ] as const).map(tab => {
              const isActive = activeChartTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveChartTab(tab.id)}
                  className={`flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-center py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    isActive 
                      ? "bg-white text-emerald-800 shadow-xs border border-white" 
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative pt-4 pb-2 px-1 h-44 outline-none border-none focus:outline-none focus:ring-0">
            <style>{`
              .recharts-wrapper *:focus,
              .recharts-surface:focus,
              .recharts-layer:focus,
              .recharts-bar-rect:focus,
              .recharts-line-curve:focus {
                outline: none !important;
              }
            `}</style>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis hide type="number" allowDecimals={false} domain={[0, 'dataMax']} />
                <Tooltip content={<CustomDigestionTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.5, rx: 4, ry: 4 }} wrapperStyle={{ outline: 'none', border: 'none', pointerEvents: 'none', zIndex: 100 }} />
                
                {Array.from({ length: maxBars }).map((_, i) => (
                  <Bar
                    key={`bar-${i}`}
                    dataKey={`log${i}`}
                    stackId="a"
                    isAnimationActive={false}
                    shape={<StackedBlockShape />}
                    maxBarSize={16}
                    style={{ outline: 'none', stroke: 'none' }}
                  >
                    {chartData.map((entry, index) => {
                      const logData = entry.logs[i];
                      return (
                        <Cell
                          key={`cell-${index}-${i}`}
                          fill={getFillColor(logData, activeChartTab)}
                          stroke="transparent"
                          strokeWidth={0}
                        />
                      );
                    })}
                  </Bar>
                ))}

                <Bar 
                  dataKey="hitboxVal" 
                  stackId="a"
                  fill="transparent" 
                  shape={<HitboxShape />} 
                  background={{ fill: 'transparent' }} 
                  isAnimationActive={false} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* BLOCK 4: История дня (Журнал) */}
          <div className="bg-slate-50/80 border border-slate-100 rounded-2xl p-3.5 mt-2">
            <div className="flex justify-between items-baseline mb-2.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">ИСТОРИЯ ЗАМЕРОВ • ДЕНЬ {selectedGraphDay}</span>
              <span className="text-[10px] font-bold text-slate-400">Записей: {selectedDayHist.length}</span>
            </div>

            {selectedDayHist.length > 0 ? (
              <div className="flex flex-col max-h-[160px] overflow-y-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none] overscroll-contain">
                {selectedDayHist
                  .filter((log) => log?.bristolType && log.bristolType >= 1 && log.bristolType <= 7)
                  .map((log, idx) => {
                  const cLabel = getComfortMeta(log.comfort).label;
                  const cBadge = getComfortMeta(log.comfort).badge;
                  const negSymptoms = (log.symptoms || []).filter((s) => s !== "Нет симптомов");
                  return (
                    <div
                      key={log.id || idx}
                      className="grid grid-cols-3 items-center w-full py-2 border-b border-slate-200/50 last:border-0"
                    >
                      {/* 1. Левая колонка */}
                      <div className="flex items-center justify-start gap-2">
                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center text-[10px] font-black text-slate-700 shadow-xs border border-slate-200/50 shrink-0">
                          {log.bristolType || 4}
                        </div>
                        <img
                          src={BRISTOL_IMAGES[Math.min(6, Math.max(0, (log.bristolType || 4) - 1))]}
                          alt={`Бристоль ${log.bristolType}`}
                          className="h-7 w-auto object-contain shrink-0"
                        />
                        <span className="text-xs font-bold font-mono text-slate-700">{log.timeString || "—"}</span>
                      </div>

                      {/* 2. Центральная колонка */}
                      <div className="flex items-center justify-center">
                        {negSymptoms.length > 0 ? (
                          negSymptoms.map((s) => {
                            const color = DIGESTION_SYMPTOM_COLORS[s]?.active?.split(" ")[0] || "bg-slate-300";
                            return (
                              <div key={s} className="group relative flex items-center justify-center mx-0.5">
                                <span className={`w-3 h-3 rounded-full ${color} shadow-xs border border-white`} />
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-xl border border-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                                  {s}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="group relative flex items-center justify-center">
                            <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-xs border border-white" />
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-xl border border-slate-100 text-slate-800 text-[11px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                              Нет симптомов
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. Правая колонка */}
                      <div className="flex items-center justify-end">
                        <span className={`px-2 py-0.5 flex items-center justify-center rounded-lg text-[10px] font-black ${cBadge}`}>
                          {cLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400 font-medium italic mt-0.5">
                {selectedGraphDay > currentDayIndex ? "Данные из будущего скрыты" : "Замеры в этот день отсутствуют"}
              </p>
            )}
          </div>
        </div>

        {/* BLOCK 5: Корреляция с другими факторами (максимально плотная компоновка) */}
        <div className="mb-2">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-wider mb-2 text-center">
            КОРРЕЛЯЦИЯ С ДРУГИМИ ФАКТОРАМИ
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Вода */}
            <div 
              className="rounded-[22px] px-3.5 py-[3px] flex flex-col shadow-[0_4px_16px_rgba(0,0,0,0.02)]"
              style={{ backgroundColor: '#E8F6F8', border: '1.5px solid #D0EEF3' }}
            >
              <span className="text-[15px] font-black text-slate-800 tracking-tight leading-none text-left">
                Вода
              </span>

              <div className="flex items-center justify-between gap-1 -mt-0.5">
                <div className="flex items-baseline leading-none">
                  <span 
                    className="text-[26px] font-black font-mono tracking-tight leading-none"
                    style={{ color: waterNormMet ? '#0D9488' : '#FF3366' }}
                  >
                    {periodWaterAvgPct}
                  </span>
                  <span className="text-[13px] font-extrabold ml-0.5" style={{ color: waterNormMet ? '#0D9488' : '#FF3366' }}>
                    %
                  </span>
                </div>

                <img 
                  src={iconWaterBalance} 
                  alt="Вода" 
                  className="w-10 h-10 object-contain shrink-0 ml-auto" 
                />
              </div>

              <span className="text-[11px] font-bold text-slate-400 leading-none -mt-1 block">
                Баланс нормы
              </span>
            </div>

            {/* 2. Клетчатка */}
            <div 
              className="rounded-[22px] px-3.5 py-[3px] flex flex-col shadow-[0_4px_16px_rgba(0,0,0,0.02)]"
              style={{ backgroundColor: '#F0F7EB', border: '1.5px solid #DCEFD4' }}
            >
              <span className="text-[15px] font-black text-slate-800 tracking-tight leading-none text-left">
                Клетчатка
              </span>

              <div className="flex items-center justify-between gap-1 -mt-0.5">
                <div className="flex items-baseline leading-none">
                  <span className="text-[26px] font-black font-mono tracking-tight leading-none text-[#2D5A27]">
                    {dayFiber}
                  </span>
                  <span className="text-[13px] font-extrabold text-[#2D5A27] ml-1">
                    г
                  </span>
                </div>

                <img 
                  src={iconFiber} 
                  alt="Клетчатка" 
                  className="w-10 h-10 object-contain shrink-0 ml-auto" 
                />
              </div>

              <span className="text-[11px] font-bold text-slate-400 leading-none -mt-1 block">
                За день
              </span>
            </div>

            {/* 3. Движение (на всю ширину) */}
            <div 
              className="col-span-2 rounded-[22px] px-4 py-[3px] flex items-center justify-between shadow-[0_4px_16px_rgba(0,0,0,0.02)]"
              style={{ backgroundColor: '#FFF6E9', border: '1.5px solid #FFE8CD' }}
            >
              {/* Слева тексты */}
              <div className="flex flex-col text-left">
                <span className="text-[15px] font-black text-slate-800 tracking-tight leading-tight">
                  Движение
                </span>
                <span className="text-[11px] font-bold text-amber-700/60 leading-tight mt-0.5">
                  Активность за день
                </span>
              </div>

              {/* Справа метрика и миниатюра */}
              <div className="flex items-center gap-3">
                <div className="flex items-baseline leading-none">
                  <span className="text-[26px] font-black font-mono tracking-tight leading-none text-[#A04E15]">
                    {todayMovementMin}
                  </span>
                  <span className="text-[13px] font-extrabold text-[#A04E15]/80 ml-1">
                    мин
                  </span>
                </div>

                <img 
                  src={iconMovementTime} 
                  alt="Движение" 
                  className="w-11 h-11 object-contain shrink-0" 
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Embedded footer */}
      <div className="w-full">
        <BottomBar onHomeClick={onBack} />
      </div>

    </div>
  );
}