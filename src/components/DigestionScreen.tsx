import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomBar from "./BottomBar";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { getDigestionFeedback } from "../utils/digestionCoaching";
import { buildDailySummary } from "../utils/crossModuleSummary";
import { getWaterGoal } from "../utils/waterGoal";
import AnnaText from "./AnnaText";
import { BRISTOL_IMAGES, DIGESTION_SYMPTOM_COLORS } from "../utils/digestionConstants";
import ingrGreen from "../assets/ingredients/ingr_green.webp";

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
// scanty — жёлтый, normal — зелёный, voluminous — голубой.
export const getComfortMeta = (
  comfort: string | undefined | null
): { label: string; badge: string; fill: string } => {
  switch (comfort) {
    case "scanty":
      return { label: "Скудно", badge: "bg-yellow-100 text-yellow-700", fill: "#FACC15" };
    case "voluminous":
      return { label: "Объёмно", badge: "bg-sky-100 text-sky-700", fill: "#38BDF8" };
    case "normal":
    case "Нормально":
      return { label: "Нормально", badge: "bg-emerald-100 text-emerald-700", fill: "#34D399" };
    // legacy values kept for backward compatibility with older records
    case "easy":
    case "Легко":
      return { label: "Легко", badge: "bg-emerald-100 text-emerald-700", fill: "#34D399" };
    case "uncomfortable":
    case "Тяжело":
      return { label: "Тяжело", badge: "bg-rose-100 text-rose-700", fill: "#FB7185" };
    default:
      return { label: "Нормально", badge: "bg-emerald-100 text-emerald-700", fill: "#34D399" };
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

  // Keep the journal's selected day in sync with the active course day (reactivity for new logs)
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

  // Period window ending at current day: 7 days, 14 days, or whole history
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

  // Fetch historical digestion logs from server on mount and merge into global store
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

  // ---- DASHBOARD METRICS (СТАТУС / РИТМ / КОМФОРТ + % стабильности) ----
  // Все расчёты — на лету из periodLogs за выбранный период.
  const dashboard = React.useMemo(() => {
    // Границы периода в днях (для "all" — от первого лога до текущего дня)
    const periodStart = periodDays === "all"
      ? Math.max(1, firstLogDay)
      : Math.max(1, currentDayIndex - Number(periodDays) + 1);
    const totalDays = Math.max(0, currentDayIndex - periodStart + 1);

    // Частота по типам Бристоля
    const freq: Record<number, number> = {};
    periodLogs.forEach((l) => {
      const t = Number(l.bristolType);
      if (t >= 1 && t <= 7) freq[t] = (freq[t] || 0) + 1;
    });

    // Мода (самый частый тип)
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

    // «Качели»: типы 1-2 и 6-7 с одинаково высокой частотой, либо нет явного лидера
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
        statusColor = "text-orange-500";
      } else if (modeType >= 3 && modeType <= 5) {
        statusLabel = "Норма";
        statusColor = "text-emerald-500";
      } else if (modeType <= 2) {
        statusLabel = "Запор";
        statusColor = "text-orange-500";
      } else {
        statusLabel = "Диарея";
        statusColor = "text-rose-500";
      }
    }

    // Частота записей по дням
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
    let spikeDays = 0; // > 3 записей в день
    let maxPerDay = 0;
    for (let d = periodStart; d <= currentDayIndex; d++) {
      const c = perDayCount[d] || 0;
      if (c === 0) emptyDays++;
      if (c > 3) spikeDays++;
      if (c > maxPerDay) maxPerDay = c;
    }

    // РИТМ
    let rhythmLabel = "—";
    let rhythmColor = "text-slate-400";
    if (periodLogs.length > 0 && totalDays > 0) {
      if (emptyDays > 2 || spikeDays > 2) {
        rhythmLabel = "Хаотично";
        rhythmColor = "text-rose-500";
      } else if (emptyDays >= 1 || spikeDays >= 1) {
        rhythmLabel = "Сбои";
        rhythmColor = "text-orange-500";
      } else {
        rhythmLabel = "Регулярно";
        rhythmColor = "text-emerald-500";
      }
    }

    // КОМФОРТ: дни с симптомами | дни со стулом без симптомов
    let daysWithSymptoms = 0;
    let daysWithout = 0;
    for (let d = periodStart; d <= currentDayIndex; d++) {
      if ((perDayCount[d] || 0) === 0) continue; // только дни со стулом
      if (perDayHasSymptom[d]) daysWithSymptoms++;
      else daysWithout++;
    }

    // % стабильности: доля дней, где ЕСТЬ стул и все записи (bristol 3-5 И без симптомов)
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

    let stabilityBadge = "bg-slate-100 text-slate-500";
    if (stabilityPct !== null) {
      if (stabilityPct >= 80) stabilityBadge = "bg-emerald-100 text-emerald-700";
      else if (stabilityPct >= 50) stabilityBadge = "bg-yellow-100 text-yellow-700";
      else stabilityBadge = "bg-rose-100 text-rose-700";
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

  // ---- ANNA'S INTELLIGENCE (existing logic from utils) ----
  const todayLogs = React.useMemo(() => {
    return digestionEntries.filter(e => Number(e.dayIndex) === Number(currentDayIndex));
  }, [digestionEntries, currentDayIndex]);

  const annaFeedback = React.useMemo(() => {
    const summary = buildDailySummary(selectedGraphDay ?? currentDayIndex, useAppStore.getState());
    return getDigestionFeedback(
      summary,
      userName || profile.name,
      userGender
    );
  }, [selectedGraphDay, currentDayIndex, digestionEntries, waterEntries, movementEntries, measurementEntries, savedDishesStore, userName, userGender, profile.name]);

  const latestLog = todayLogs.length > 0 ? [...todayLogs].sort((a, b) => b.timestamp - a.timestamp)[0] : null;

  // ---- 28-DAY CHART DATA (Stacked Bar Chart Logic) ----
  const { chartData, maxBars } = React.useMemo(() => {
    let max = 0;
    const data: any[] = [];
    
    for (let d = 1; d <= 28; d++) {
      const logs = periodLogs
        .filter((l) => Number(l.dayIndex) === d)
        .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0)); // Bottom to top
        
      if (logs.length > max) max = logs.length;
      
      const point: any = { day: d, logs, hitboxVal: 0.1 }; // 0.1 ensures shape renders
      
      logs.forEach((log, i) => {
         point[`log${i}`] = 1; // Each episode adds 1 unit of height
      });
      data.push(point);
    }
    
    return { chartData: data, maxBars: Math.max(1, max) };
  }, [periodLogs]);

  const getFillColor = (log: any, tab: string): string => {
    if (!log) return "transparent";
    if (tab === "stool") {
      const t = log.bristolType;
      if (t === 3 || t === 4 || t === 5) return "#34D399"; // emerald-400
      if (t === 1 || t === 2) return "#FB923C"; // orange-400
      if (t === 6 || t === 7) return "#FB7185"; // rose-400
      return "#cbd5e1";
    }
    if (tab === "symptoms") {
      const n = (log.symptoms || []).filter((s: string) => s !== "Нет симптомов").length;
      if (n === 0) return "#34D399"; // Green if no symptoms
      if (n === 1) return "#FB923C";
      return "#FB7185";
    }
    if (tab === "comfort") {
      return getComfortMeta(log.comfort).fill;
    }
    return "transparent";
  };

  // ---- HISTORY JOURNAL DATA (selected day) ----
  const selectedDayHist = React.useMemo(() => {
    const sorted = periodLogs
      .filter((l) => Number(l.dayIndex) === Number(selectedGraphDay))
      // Отсекаем «призрачные» строки без валидных данных для отображения
      .filter((l) => l && l.bristolType && Number(l.bristolType) >= 1 && Number(l.bristolType) <= 7)
      .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return sorted;
  }, [periodLogs, selectedGraphDay]);

  // ---- CORRELATION LOGIC (Block 5) — 3 карточки, расчёт на лету ----
  const WATER_GOAL_FALLBACK_ML = 2000;

  // Плашка 1: средний % выполнения нормы воды за выбранный период
  const periodWaterAvgPct = React.useMemo(() => {
    const periodStart = periodDays === "all"
      ? Math.max(1, firstLogDay)
      : Math.max(1, currentDayIndex - Number(periodDays) + 1);
    const totalDays = Math.max(1, currentDayIndex - periodStart + 1);
    const dailyGoal = waterGoal > 0 ? waterGoal : WATER_GOAL_FALLBACK_ML;
    const totalDrank = waterEntries
      .filter((w) => Number(w.dayIndex) >= periodStart && Number(w.dayIndex) <= currentDayIndex)
      .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    return Math.min(100, Math.round((totalDrank / (totalDays * dailyGoal)) * 100));
  }, [waterEntries, waterGoal, periodDays, firstLogDay, currentDayIndex]);
  const waterNormMet = periodWaterAvgPct >= 100;

  // Плашка 2: суммарная клетчатка за последний выбранный день (или сегодня)
  const dayFiber = React.useMemo(() => {
    const targetDay = selectedGraphDay ?? currentDayIndex;
    const dishes = (savedDishesStore || []).filter(
      (d) => d.dayIndex !== undefined && Number(d.dayIndex) === Number(targetDay)
    );
    let sum = 0;
    for (const dish of dishes) {
      // 1) Клетчатка хранится прямо в блюде
      const raw = dish.computedNutrients?.fiber ?? dish.fiber;
      const direct = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      if (!Number.isNaN(direct) && direct > 0) {
        sum += direct;
        continue;
      }
      // 2) Фолбэк: собираем из foodCache по ингредиентам (на 100 г)
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

  // Плашка 3: стрик дней без дискомфорта — назад от последнего дня периода.
  // День засчитывается, если есть запись со стулом типа 3-5 И symptoms пустое.
  const comfortStreak = React.useMemo(() => {
    let streak = 0;
    for (let d = currentDayIndex; d >= 1; d--) {
      const logList = digestionEntries.filter((e) => Number(e.dayIndex) === d);
      if (logList.length === 0) {
        if (d === currentDayIndex) continue; // сегодня без записей — ещё не прерывает
        break;
      }
      const qualifies = logList.some((e) => {
        const t = Number(e.bristolType);
        const syms = (e.symptoms || []).filter((s) => s !== "Нет симптомов");
        return t >= 3 && t <= 5 && syms.length === 0;
      });
      if (!qualifies) break;
      streak++;
    }
    return streak;
  }, [digestionEntries, currentDayIndex]);

  // ---- CUSTOM SHAPES FOR STACKED CHART ----
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
    const gap = 2; // Gap between stacked blocks
    return (
      <rect 
         x={x} 
         y={y + gap/2} 
         width={width} 
         height={Math.max(0, height - gap)} 
         rx={4} 
         ry={4} 
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
          <div className="bg-white shadow-xl border border-slate-100 rounded-xl p-3 text-[13px] font-bold text-slate-800 z-[100]">
            <div>День {day}</div>
            <div className="text-slate-400 font-medium mt-0.5">Нет записей</div>
          </div>
        );
      }

      return (
        <div className="bg-white shadow-xl border border-slate-100 rounded-xl p-3 text-[13px] font-bold text-slate-800 z-[100] max-w-[220px]">
          <div className="mb-2 border-b border-slate-100 pb-1.5 flex justify-between items-center gap-3">
            <span>День {day}</span>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-50 px-1.5 py-0.5 rounded-md">Записей: {logs.length}</span>
          </div>
          
          <div className="flex flex-col gap-2.5">
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
                    <div className="w-2.5 h-2.5 rounded-full mt-[3px] shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                    <div className="flex flex-col">
                       <span className="text-slate-700">{mainText}</span>
                       <span className="text-[10.5px] text-slate-400 font-semibold">{subText}</span>
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
    <div className="w-full flex-1 flex flex-col justify-between min-h-0" id="digestion-screen">

      {/* Main Analytical Scrollable Body Screen */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-4 pb-8 bg-slate-50 flex flex-col">

        {/* Global header bar with absolutely positioned back button */}
        <div className="relative w-full flex items-center justify-center mb-8 pt-3">
          <button
            type="button"
            onClick={onBack}
            className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-slate-200/50 flex items-center justify-center text-slate-700 active:scale-90 hover:bg-slate-100 transition-all shadow-2xs"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="flex flex-col items-center text-center mt-1">
            <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none">Дневник</span>
            <span className="text-[18px] font-black text-slate-800 mt-1" style={{ fontFamily: '"Calibri", sans-serif' }}>Здоровье кишечника</span>
          </div>
        </div>

        {/* BLOCK 1: Тренды и ритмичность ЖКТ */}
        <div className="bg-white rounded-[32px] p-5 shadow-sm mb-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">ОБЩАЯ СТАТИСТИКА</span>
              <h2 className="text-lg font-bold text-slate-800 mt-0.5">Тренды и ритмичность ЖКТ</h2>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${dashboard.stabilityBadge}`}>
              {dashboard.stabilityPct === null ? "—%" : `${dashboard.stabilityPct}%`} стабильности
            </span>
          </div>

          {/* Period selector tabs */}
          <div className="flex flex-row gap-1 w-full mt-3 bg-slate-100/60 p-1 rounded-2xl">
            {(["7", "14", "all"] as const).map(p => {
              const isActive = periodDays === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriodDays(p)}
                  className={`flex-1 py-1.5 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer ${
                    isActive ? "bg-emerald-100 text-emerald-700" : "text-slate-500 hover:bg-white/60"
                  }`}
                >
                  {p === "7" ? "7 дней" : p === "14" ? "14 дней" : "Весь период"}
                </button>
              );
            })}
          </div>

          {/* Empty state over period */}
          {totalEpisodes === 0 && (
            <div className="flex flex-col items-center justify-center py-5 px-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200/80 mt-4">
              <span className="text-[22px] mb-1 leading-none select-none">📭</span>
              <p className="text-slate-700 text-xs font-bold font-sans">Нет записей за период</p>
              <p className="text-slate-400 text-[10.5px] text-center mt-1 leading-tight max-w-[260px]">
                Добавьте первую запись, чтобы появилась статистика.
              </p>
            </div>
          )}

          {/* Top three metric tiles */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white border border-slate-50 shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">СТАТУС</span>
              <span className={`text-xl font-black font-mono mb-1 ${dashboard.statusColor}`}>{dashboard.statusLabel}</span>
              <span className="text-[9.5px] font-bold text-slate-500">
                {dashboard.modeType === null ? "Нет данных" : `Основной тип ${dashboard.modeType}`}
              </span>
            </div>

            <div className="bg-white border border-slate-50 shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">РИТМ</span>
              <span className={`text-xl font-black font-mono mb-1 ${dashboard.rhythmColor}`}>{dashboard.rhythmLabel}</span>
              <span className="text-[9.5px] font-bold text-slate-500">Частота стула</span>
            </div>

            <div className="bg-white border border-slate-50 shadow-sm rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">КОМФОРТ</span>
              <span className="text-xl font-black font-mono mb-1">
                <span className={dashboard.daysWithSymptoms > 2 ? "text-orange-500" : "text-slate-700"}>{dashboard.daysWithSymptoms}</span>
                <span className="text-slate-300 mx-1">|</span>
                <span className="text-emerald-500">{dashboard.daysWithout}</span>
              </span>
              <span className="text-[9.5px] font-bold text-slate-500">Симптоматика</span>
            </div>
          </div>

          {/* Progress bars: ideal / delayed / fast */}
          <div className="space-y-4 mt-6">
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11.5px] font-bold text-slate-600">
                <span>Идеальный (Типы 3, 4, 5)</span>
                <span className="text-emerald-500 font-mono">{healthyBristolRatio === null ? "—" : `${healthyBristolRatio}%`}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${healthyBristolRatio ?? 0}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11.5px] font-bold text-slate-600">
                <span>Замедленный (Типы 1, 2)</span>
                <span className="text-orange-500 font-mono">{slowTransitRatio === null ? "—" : `${slowTransitRatio}%`}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${slowTransitRatio ?? 0}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11.5px] font-bold text-slate-600">
                <span>Ускоренный (Типы 6, 7)</span>
                <span className="text-rose-500 font-mono">{fastTransitRatio === null ? "—" : `${fastTransitRatio}%`}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${fastTransitRatio ?? 0}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* BLOCK 2: Последний замер & Интеллект Анны */}
        {latestLog && (
          <div className="bg-[#FFF5ED] rounded-2xl px-4 py-[2px] mb-2 flex items-center justify-between relative z-10 shadow-sm">
            {/* Left part: Time, Type Circle, Image */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="text-sm font-bold text-slate-700 w-11 text-center shrink-0 leading-none">
                {latestLog.timeString || "—"}
              </div>
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[11px] font-black text-slate-700 shadow-sm">
                {latestLog.bristolType || 4}
              </div>
              <img 
                src={BRISTOL_IMAGES[Math.min(6, Math.max(0, (latestLog.bristolType || 4) - 1))]} 
                alt={`Бристоль ${latestLog.bristolType}`} 
                className="h-10 w-auto object-contain shrink-0" 
              />
            </div>

            {/* Middle part: Symptoms (centered) */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 flex-1 px-2">
                {(latestLog.symptoms || []).filter(s => s !== "Нет симптомов").map(s => {
                  const color = DIGESTION_SYMPTOM_COLORS[s]?.active?.split(" ")[0] || "bg-slate-300";
                  return (
                    <div key={s} className="group relative flex items-center justify-center">
                      <span className={`w-4 h-4 rounded-full ${color} shadow-sm`} />
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-xl border border-slate-100 text-slate-800 text-[13px] font-extrabold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                        {s}
                      </div>
                    </div>
                  );
                })}
                {(!latestLog.symptoms || latestLog.symptoms.filter(s => s !== "Нет симптомов").length === 0) && (
                  <div className="group relative flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-emerald-300 shadow-sm" />
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-xl border border-slate-100 text-slate-800 text-[13px] font-extrabold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                      Нет симптомов
                    </div>
                  </div>
                )}
            </div>

            {/* Right part: Comfort badge */}
            <div className="shrink-0 flex items-center">
              <span className={`px-2.5 flex items-center justify-center h-6 rounded-lg text-[10.5px] font-bold shadow-sm ${getComfortMeta(latestLog.comfort).badge}`}>
                {getComfortMeta(latestLog.comfort).label}
              </span>
            </div>
          </div>
        )}

        <div className="bg-orange-50/50 shadow-sm rounded-[28px] p-4 text-left flex flex-col gap-3 relative z-10 mb-5" id="anna-digestion-advice-box">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-emerald-100/60 shadow-md">
                  <img
                    src={annaAvatarSrc}
                    alt="Анна советует"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[15px] font-black text-slate-900 leading-none">Анна</span>
                <span className="text-[11px] font-bold text-slate-500 mt-0.5 leading-none">Советник WFPB</span>
              </div>
            </div>

            <img src={ingrGreen} alt="Логотип WFPB" className="w-6 h-6 object-contain" />
          </div>

          <div className="bg-white p-3.5 rounded-2xl text-[13.5px] leading-relaxed font-semibold text-slate-800">
            <AnnaText text={annaFeedback} userName={userName} />
          </div>
        </div>

        {/* BLOCK 3: Динамика пищеварения (Recharts) */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-5 shadow-sm mb-4">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-emerald-600 uppercase block">СТАТИСТИКА КУРСА</span>
              <h2 className="text-lg font-bold text-slate-800 mt-0.5">Динамика пищеварения за 28 дней</h2>
            </div>
            <span className="text-[11px] text-slate-500 font-bold bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-100">
              Выбран День: <span className="text-emerald-600 font-mono font-black">{selectedGraphDay}</span>
            </span>
          </div>

          {/* Metric selector pill bar */}
          <div className="flex flex-row justify-between gap-1 w-full bg-slate-50 p-1 rounded-2xl mt-3">
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
                  className={`flex-1 whitespace-nowrap overflow-hidden text-ellipsis text-center py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                    isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="relative pt-4 pb-2 px-1 h-44 outline-none border-none focus:outline-none focus:ring-0" style={{ outline: 'none', border: 'none' }}>
            <style>{`
              .recharts-wrapper *:focus,
              .recharts-surface:focus,
              .recharts-layer:focus,
              .recharts-bar-rect:focus,
              .recharts-line-curve:focus {
                outline: none !important;
              }
            `}</style>
            <ResponsiveContainer width="100%" height="100%" className="outline-none border-none focus:outline-none focus:ring-0" style={{ outline: 'none', border: 'none' }}>
              <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }} className="outline-none border-none focus:outline-none focus:ring-0" style={{ outline: 'none', border: 'none' }}>
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
                    maxBarSize={20}
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
          <div className="bg-slate-50 border border-slate-100 rounded-3xl p-5 mt-2">
            <div className="flex justify-between items-baseline mb-3">
              <span className="text-xs font-bold text-slate-400 uppercase">ИСТОРИЯ ЗАМЕРОВ • ДЕНЬ {selectedGraphDay}</span>
              <span className="text-[10.5px] font-bold text-slate-400">Записей: {selectedDayHist.length}</span>
            </div>

            {selectedDayHist.length > 0 ? (
              <div className="flex flex-col max-h-[150px] overflow-y-auto scrollbar-none">
                {selectedDayHist.map((log) => {
                  const cLabel = getComfortMeta(log.comfort).label;
                  const cBadge = getComfortMeta(log.comfort).badge;
                  const negSymptoms = (log.symptoms || []).filter((s) => s !== "Нет симптомов");
                  return (
                    <div
                      key={log.id}
                      className="flex flex-row items-center justify-between py-[2px] border-b border-slate-200/50 last:border-0"
                    >
                      {/* Left part: White circle, Image, Time */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-8 flex-shrink-0 flex items-center justify-center">
                          <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center text-[11px] font-black text-slate-700 shadow-sm">
                            {log.bristolType || 4}
                          </div>
                        </div>
                        <img
                          src={BRISTOL_IMAGES[Math.min(6, Math.max(0, (log.bristolType || 4) - 1))]}
                          alt={`Бристоль ${log.bristolType}`}
                          className="h-8 w-auto object-contain shrink-0"
                        />
                        <span className="text-sm font-bold text-slate-700 w-11">{log.timeString || "—"}</span>
                      </div>

                      {/* Middle part: Symptoms */}
                      <div className="flex flex-wrap items-center justify-center gap-1.5 flex-1 px-2">
                        {negSymptoms.length > 0 ? (
                          negSymptoms.map((s) => {
                            const color = DIGESTION_SYMPTOM_COLORS[s]?.active?.split(" ")[0] || "bg-slate-300";
                            return (
                              <div key={s} className="group relative flex items-center justify-center">
                                <span className={`w-3.5 h-3.5 rounded-full ${color} shadow-sm`} />
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-xl border border-slate-100 text-slate-800 text-[13px] font-extrabold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                                  {s}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="group relative flex items-center justify-center">
                            <span className="w-3.5 h-3.5 rounded-full bg-emerald-300 shadow-sm" />
                            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white shadow-xl border border-slate-100 text-slate-800 text-[13px] font-extrabold px-4 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[60]">
                              Нет симптомов
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right part: Comfort badge */}
                      <div className="shrink-0 flex items-center">
                        <span className={`px-2.5 flex items-center justify-center h-6 rounded-lg text-[10.5px] font-bold shadow-sm ${cBadge}`}>
                          {cLabel}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11.5px] text-slate-400 font-medium italic mt-0.5">
                {selectedGraphDay > currentDayIndex ? "Данные из будущего скрыты" : "Замеры в этот день отсутствуют"}
              </p>
            )}
          </div>
        </div>

        {/* BLOCK 5: Корреляции */}
        <div className="mb-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">КОРРЕЛЯЦИЯ С ДРУГИМИ ФАКТОРАМИ</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between gap-2 shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Питьевой баланс</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Вода / цель</p>
              </div>
              <span className={`text-lg font-black font-mono ${waterNormMet ? "text-emerald-500" : "text-rose-500"}`}>
                {`${periodWaterAvgPct}%`}
              </span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between gap-2 shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Клетчатка</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Съедено за день</p>
              </div>
              <span className={`text-lg font-black font-mono ${dayFiber > 0 ? "text-emerald-500" : "text-slate-400"}`}>
                {`${dayFiber} г`}
              </span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col justify-between gap-2 shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Дней без дискомфорта</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Подряд</p>
              </div>
              <span className="text-lg font-black text-emerald-500 font-mono">{comfortStreak}</span>
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