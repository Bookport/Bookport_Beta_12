import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import BottomBar from "./BottomBar";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { getDigestionFeedback } from "../utils/digestionCoaching";
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
  comfort: "easy" | "normal" | "uncomfortable" | "Легко" | "Нормально" | "Тяжело";
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
  const currentDayIndex = propDayIndex ?? (useAppStore((s) => s.userProfile.currentDayIndex) ?? 1);

  // Period selector state: 7 days, 14 days, or the whole history
  const [periodDays, setPeriodDays] = useState<"7" | "14" | "all">("7");

  // Chart metric tabs and selected graph day (history journal target)
  const [activeChartTab, setActiveChartTab] = useState<"stool" | "symptoms" | "comfort">("stool");
  const [selectedGraphDay, setSelectedGraphDay] = useState<number>(currentDayIndex);

  // Keep the journal's selected day in sync with the active course day (reactivity for new logs)
  React.useEffect(() => {
    setSelectedGraphDay(currentDayIndex);
  }, [currentDayIndex]);

  const waterEntries = useAppStore((s) => s.waterEntries);
  const profile = useAppStore((s) => s.userProfile);
  const waterGoal = React.useMemo(() => {
    const weight = profile.weight || 65;
    return Math.round(weight * 30);
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
        }
      })
      .catch((err) => console.warn("[Digestion] failed to load history:", err));
  }, [setDigestionEntries]);

  // ---- STATISTICS OVER THE 28-DAY PERIOD ----
  const totalEpisodes = periodLogs.length;

  let totalBristolSum = 0;
  let healthyBristolCount = 0;
  let slowTransitCount = 0;
  let fastTransitCount = 0;
  let comfortableCount = 0;
  let loggedDays = 0;
  const seenDays = new Set<number>();

  periodLogs.forEach(log => {
    const t = log.bristolType;
    if (t >= 1 && t <= 7) {
      totalBristolSum += t;
      if (t === 3 || t === 4 || t === 5) healthyBristolCount++;
      if (t === 1 || t === 2) slowTransitCount++;
      if (t === 6 || t === 7) fastTransitCount++;
    }
    if (normalizeComfort(log.comfort) === "easy" || normalizeComfort(log.comfort) === "normal") comfortableCount++;
    seenDays.add(Number(log.dayIndex));
  });
  loggedDays = seenDays.size;

  const avgBristolStyle = totalEpisodes ? (totalBristolSum / totalEpisodes).toFixed(1) : null;
  const healthyBristolRatio = totalEpisodes ? Math.round((healthyBristolCount / totalEpisodes) * 100) : null;
  const slowTransitRatio = totalEpisodes ? Math.round((slowTransitCount / totalEpisodes) * 100) : null;
  const fastTransitRatio = totalEpisodes ? Math.round((fastTransitCount / totalEpisodes) * 100) : null;
  const comfortRatio = totalEpisodes ? Math.round((comfortableCount / totalEpisodes) * 100) : null;

  const firstLogDay = digestionEntries.length > 0 ? Math.min(...digestionEntries.map(e => Number(e.dayIndex))) : currentDayIndex;
  const actualAppDays = Math.max(1, currentDayIndex - firstLogDay + 1);

  const stabilityDenominator = periodDays === "all"
    ? Math.min(28, actualAppDays)
    : Math.min(Number(periodDays), actualAppDays);
  const stabilityIndex = totalEpisodes
    ? Math.min(100, Math.round((loggedDays / stabilityDenominator) * 100))
    : null;
  const todayWater = waterEntries
    .filter(w => Number(w.dayIndex) === Number(currentDayIndex))
    .reduce((sum, entry) => sum + entry.amount, 0);
  const waterPct = waterGoal > 0 ? Math.min(100, Math.round((todayWater / waterGoal) * 100)) : null;

  // ---- ANNA'S INTELLIGENCE (existing logic from utils) ----
  const todayLogs = React.useMemo(() => {
    return digestionEntries.filter(e => Number(e.dayIndex) === Number(currentDayIndex));
  }, [digestionEntries, currentDayIndex]);

  const periodAvgBristol = avgBristolStyle ? parseFloat(avgBristolStyle) : undefined;

  const annaFeedback = React.useMemo(() => {
    return getDigestionFeedback(
      todayLogs,
      waterEntries,
      waterGoal,
      userName || profile.name,
      userGender,
      periodAvgBristol
    );
  }, [todayLogs, waterEntries, waterGoal, userName, userGender, profile.name, periodAvgBristol]);

  const latestLog = todayLogs.length > 0 ? [...todayLogs].sort((a, b) => b.timestamp - a.timestamp)[0] : null;

  // ---- 28-DAY CHART DATA (Динамика пищеварения) ----
  const chartData = React.useMemo(() => {
    const data: { day: number; bristol: number | null; symptoms: string[]; comfort: string | null; time: string }[] = [];
    for (let d = 1; d <= 28; d++) {
      const logs = periodLogs.filter((l) => Number(l.dayIndex) === d);
      let point: { day: number; bristol: number | null; symptoms: string[]; comfort: string | null; time: string } = {
        day: d,
        bristol: null,
        symptoms: [],
        comfort: null,
        time: "",
      };
      if (logs.length > 0) {
        // pick the log with MAX deviation from norm (type 4) — the most alarming episode
        let worst = logs[0];
        let maxDev = -1;
        for (const log of logs) {
          const dev = Math.abs(log.bristolType - 4);
          if (dev > maxDev) {
            maxDev = dev;
            worst = log;
          }
        }
        // aggregate symptoms from ALL logs of the day (deduped via Set) for honest statistics
        const daySymptoms = new Set<string>();
        logs.forEach((log) => (log.symptoms || []).forEach((s) => daySymptoms.add(s)));
        point = {
          day: d,
          bristol: worst.bristolType,
          symptoms: Array.from(daySymptoms),
          comfort: worst.comfort ?? null,
          time: worst.timeString || "",
        };
      }
      data.push(point);
    }
    return data;
  }, [periodLogs]);

  const chartMetricValue = (point: { bristol: number | null; symptoms: string[]; comfort: string | null }): number | null => {
    if (point.bristol === null) return null;
    if (activeChartTab === "stool") return point.bristol;
    if (activeChartTab === "symptoms") {
      const negCount = point.symptoms.filter((s) => s !== "Нет симптомов").length;
      return negCount > 0 ? negCount : null;
    }
    // comfort: map Легко/Нормально/Тяжело to score 3/2/1
    const c = normalizeComfort(point.comfort);
    return c === "easy" ? 3 : c === "normal" ? 2 : c === "uncomfortable" ? 1 : null;
  };

  const chartPoints = React.useMemo(() => {
    return chartData.map((p) => ({ ...p, value: chartMetricValue(p) }));
  }, [chartData, activeChartTab]);

  const barFillFor = (point: { bristol: number | null; symptoms: string[]; comfort: string | null }): string => {
    if (point.bristol === null) return "transparent";
    if (activeChartTab === "stool") {
      const t = point.bristol;
      if (t === 3 || t === 4 || t === 5) return "#34D399"; // emerald-400
      if (t === 1 || t === 2) return "#FB923C"; // orange-400
      if (t === 6 || t === 7) return "#FB7185"; // rose-400
      return "transparent";
    }
    if (activeChartTab === "symptoms") {
      const n = point.symptoms.filter((s) => s !== "Нет симптомов").length;
      if (n === 0) return "transparent";
      if (n === 1) return "#FB923C"; // orange-400
      return "#FB7185"; // rose-400
    }
    // comfort
    const c = normalizeComfort(point.comfort);
    if (c === "easy") return "#34D399";
    if (c === "normal") return "#FB923C";
    if (c === "uncomfortable") return "#FB7185";
    return "transparent";
  };

  // ---- HISTORY JOURNAL DATA (selected day) ----
  const selectedDayHist = React.useMemo(() => {
    const sorted = periodLogs
      .filter((l) => Number(l.dayIndex) === Number(selectedGraphDay))
      .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return sorted;
  }, [periodLogs, selectedGraphDay]);

  // ---- CORRELATION LOGIC (Block 5) ----
  // Water balance: green when norm fulfilled, red on deficit
  const waterNormMet = waterPct !== null && waterPct >= 100;
  // Response index: % of logs in period WITHOUT negative symptoms
  const logsWithNoSymptoms = periodLogs.filter((l) => {
    const syms = l.symptoms || [];
    return syms.length === 0 || (syms.length === 1 && syms[0] === "Нет симптомов");
  }).length;
  const responseIndex = totalEpisodes ? Math.round((logsWithNoSymptoms / totalEpisodes) * 100) : null;
  // Comfort streak: consecutive days without "Тяжело" status and pain/spasms, back from today
  const comfortStreak = React.useMemo(() => {
    let streak = 0;
    for (let d = currentDayIndex; d >= 1; d--) {
      const logList = digestionEntries.filter((e) => Number(e.dayIndex) === d);
      if (logList.length === 0) {
        if (d === currentDayIndex) continue; // today without logs — not a leading streak yet
        break;
      }
      const hasBad = logList.some((e) => {
        const c = normalizeComfort(e.comfort);
        const syms = e.symptoms || [];
        const hasPain = syms.includes("Боль") || syms.includes("Спазмы");
        return c === "uncomfortable" || hasPain;
      });
      if (hasBad) break;
      streak++;
    }
    return streak;
  }, [digestionEntries, currentDayIndex]);

  // ---- CUSTOM CHART SHAPE with pointer-down hitbox (reference from Замеры) ----
  const CustomMetricBarShape = (props: any) => {
    const { x, y, width, height, fill, stroke, strokeWidth, payload, background } = props;
    const fullHeight = background ? background.height : height;
    const bottomY = background ? background.y + background.height : y + height;
    const topY = bottomY - fullHeight;
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={4}
          ry={4}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          style={{ outline: 'none' }}
        />
        <rect
          x={x - width / 2}
          y={topY}
          width={width * 2}
          height={fullHeight}
          fill="transparent"
          stroke="transparent"
          strokeWidth={0}
          strokeOpacity={0}
          cursor="pointer"
          style={{ outline: 'none' }}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (payload && payload.day) {
              setSelectedGraphDay(Number(payload.day));
            }
          }}
        />
      </g>
    );
  };

  const CustomDigestionTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      const point = p.payload as { day: number; bristol: number | null; symptoms: string[]; comfort: string | null; time: string };
      if (point.bristol === null) return (
        <div className="bg-white shadow-lg border border-slate-100 rounded-xl p-3 text-xs font-bold text-slate-800">
          <div>День {point.day}</div>
          <div className="text-slate-400">Нет записей</div>
        </div>
      );
      const c = normalizeComfort(point.comfort);
      const cLabel = c === "easy" ? "Легко" : c === "normal" ? "Нормально" : c === "uncomfortable" ? "Тяжело" : "—";
      const negSymptoms = point.symptoms.filter((s) => s !== "Нет симптомов");
      let content: React.ReactNode = null;
      switch (activeChartTab) {
        case "stool":
          content = (
            <div style={{ color: barFillFor(point) !== "transparent" ? barFillFor(point) : "#94a3b8" }}>
              Тип стула: {point.bristol}
            </div>
          );
          break;
        case "symptoms":
          content = negSymptoms.length > 0
            ? <div className="text-slate-500 font-medium">{negSymptoms.join(", ")}</div>
            : <div className="text-slate-400 font-medium">Нет симптомов</div>;
          break;
        case "comfort":
          content = (
            <div style={{ color: barFillFor(point) !== "transparent" ? barFillFor(point) : "#94a3b8" }}>
              Комфорт: {cLabel}
            </div>
          );
          break;
      }
      return (
        <div className="bg-white shadow-lg border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800">
          <div>День {point.day} · {point.time || "—"}</div>
          {content}
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

          <div className="flex flex-col items-center text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ДНЕВНИК</span>
            <span className="text-2xl font-extrabold text-slate-800 mt-1">Здоровье кишечника</span>
          </div>
        </div>

        {/* BLOCK 1: Тренды и ритмичность ЖКТ */}
        <div className="bg-white rounded-[32px] p-5 shadow-sm mb-4">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">ОБЩАЯ СТАТИСТИКА</span>
              <h2 className="text-lg font-bold text-slate-800 mt-0.5">Тренды и ритмичность ЖКТ</h2>
            </div>

            <span className="text-slate-800 bg-orange-100/50 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
              {stabilityIndex === null ? "—%" : `${stabilityIndex}%`} стабильности
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
            <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">БРИСТОЛЬ</span>
              <span className="text-2xl font-black text-orange-500 font-mono mb-1">{avgBristolStyle ?? "—"}</span>
              <span className="text-[9.5px] font-bold text-slate-500">Средний тип</span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">СТАБИЛЬНОСТЬ</span>
              <span className="text-2xl font-black text-emerald-500 font-mono mb-1">{stabilityIndex === null ? "—" : `${stabilityIndex}%`}</span>
              <span className="text-[9.5px] font-bold text-slate-500">Индекс ритма</span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3 flex flex-col items-center justify-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">КОМФОРТ</span>
              <span className="text-2xl font-black text-orange-500 font-mono mb-1">{comfortRatio === null ? "—" : `${comfortRatio}%`}</span>
              <span className="text-[9.5px] font-bold text-slate-500">Доля комфорта</span>
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
          <div className="bg-[#FFF5ED] rounded-2xl p-4 mb-2 flex items-center gap-4 relative z-10 shadow-sm">
            <div className="text-sm font-bold text-slate-700 w-12 text-center shrink-0 leading-none">
              {latestLog.timeString || "—"}
            </div>
            <img 
              src={BRISTOL_IMAGES[Math.min(6, Math.max(0, (latestLog.bristolType || 4) - 1))]} 
              alt={`Бристоль ${latestLog.bristolType}`} 
              className="h-10 w-auto object-contain shrink-0" 
            />
            <div className="flex flex-col gap-1.5 flex-1 items-start">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                normalizeComfort(latestLog.comfort) === "easy" ? "bg-emerald-100 text-emerald-700" :
                normalizeComfort(latestLog.comfort) === "normal" ? "bg-slate-200 text-slate-700" :
                "bg-rose-100 text-rose-700"
              }`}>
                {normalizeComfort(latestLog.comfort) === "easy" ? "Легко" : normalizeComfort(latestLog.comfort) === "normal" ? "Нормально" : "Тяжело"}
              </span>
              <div className="flex flex-wrap gap-1">
                {(latestLog.symptoms || []).filter(s => s !== "Нет симптомов").map(s => {
                  const color = DIGESTION_SYMPTOM_COLORS[s]?.active?.split(" ")[0] || "bg-slate-300";
                  return (
                    <div key={s} className="group relative flex items-center justify-center">
                      <span className={`w-3 h-3 rounded-full ${color}`} />
                      <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                        {s}
                      </div>
                    </div>
                  );
                })}
                {(!latestLog.symptoms || latestLog.symptoms.filter(s => s !== "Нет симптомов").length === 0) && (
                  <div className="group relative flex items-center justify-center">
                    <span className="w-3 h-3 rounded-full bg-emerald-300" />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                      Нет симптомов
                    </div>
                  </div>
                )}
              </div>
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
            {annaFeedback}
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
              <BarChart data={chartPoints} margin={{ top: 5, right: 10, left: 10, bottom: 0 }} className="outline-none border-none focus:outline-none focus:ring-0" style={{ outline: 'none', border: 'none' }}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis hide type="number" />
                <Tooltip content={<CustomDigestionTooltip />} cursor={{ fill: 'transparent' }} wrapperStyle={{ outline: 'none', border: 'none', pointerEvents: 'none' }} />
                <Bar isAnimationActive={false}
                  dataKey="value"
                  shape={<CustomMetricBarShape />}
                  background={{ fill: 'transparent', stroke: 'transparent', strokeWidth: 0, strokeOpacity: 0 }}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                  style={{ outline: 'none', stroke: 'none' }}
                >
                  {chartPoints.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={barFillFor(entry)}
                      stroke="transparent"
                      strokeWidth={0}
                    />
                  ))}
                </Bar>
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
              <div className="flex flex-col max-h-[300px] overflow-y-auto scrollbar-none">
                {selectedDayHist.map((log) => {
                  const c = normalizeComfort(log.comfort);
                  const cLabel = c === "easy" ? "Легко" : c === "normal" ? "Нормально" : c === "uncomfortable" ? "Тяжело" : "—";
                  const negSymptoms = (log.symptoms || []).filter((s) => s !== "Нет симптомов");
                  return (
                    <div
                      key={log.id}
                      className="flex flex-row items-center justify-between py-2 border-b border-slate-200/50 last:border-0"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={BRISTOL_IMAGES[Math.min(6, Math.max(0, (log.bristolType || 4) - 1))]}
                          alt={`Бристоль ${log.bristolType}`}
                          className="h-8 w-8 object-contain shrink-0"
                        />
                        <span className="text-sm font-semibold text-slate-700">{log.timeString || "—"}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {negSymptoms.length > 0 ? (
                          negSymptoms.map((s) => {
                            const color = DIGESTION_SYMPTOM_COLORS[s]?.active || "bg-slate-200 text-slate-900";
                            return (
                              <span
                                key={s}
                                title={s}
                                className={`w-2.5 h-2.5 rounded-full ${color.split(" ")[0]}`}
                              />
                            );
                          })
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-200" />
                        )}
                      </div>

                      <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-xs font-bold">{cLabel}</span>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-row justify-between items-center shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Питьевой баланс</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Вода / цель</p>
              </div>
              <span className={`text-lg font-black font-mono ${waterNormMet ? "text-emerald-500" : "text-rose-500"}`}>
                {waterPct === null ? "—" : `${waterPct}%`}
              </span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-row justify-between items-center shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Клетчатка</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Добавьте бобовые и зелень</p>
              </div>
              <span className="text-sm font-bold text-emerald-500 whitespace-nowrap">Нет данных</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-row justify-between items-center shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Индекс отклика</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Без негативных симптомов</p>
              </div>
              <span className="text-lg font-black text-slate-700 font-mono">{responseIndex === null ? "—" : `${responseIndex}%`}</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-row justify-between items-center shadow-sm">
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