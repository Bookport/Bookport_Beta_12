import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import BottomBar from "./BottomBar";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { getDigestionFeedback } from "../utils/digestionCoaching";
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
      .filter((e) => e.dayIndex === currentDayIndex)
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
    return digestionEntries.filter((e) => e.dayIndex >= fromDayIndex && e.dayIndex <= currentDayIndex);
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
  let daysWithDiscomfort = 0;
  const discomfortDays = new Set<number>();

  periodLogs.forEach(log => {
    const t = log.bristolType;
    if (t >= 1 && t <= 7) {
      totalBristolSum += t;
      if (t === 3 || t === 4 || t === 5) healthyBristolCount++;
      if (t === 1 || t === 2) slowTransitCount++;
      if (t === 6 || t === 7) fastTransitCount++;
    }
    if (normalizeComfort(log.comfort) === "easy" || normalizeComfort(log.comfort) === "normal") comfortableCount++;
    if (normalizeComfort(log.comfort) === "uncomfortable") discomfortDays.add(log.dayIndex);
    seenDays.add(log.dayIndex);
  });
  loggedDays = seenDays.size;
  daysWithDiscomfort = discomfortDays.size;

  const avgBristolStyle = totalEpisodes ? (totalBristolSum / totalEpisodes).toFixed(1) : null;
  const healthyBristolRatio = totalEpisodes ? Math.round((healthyBristolCount / totalEpisodes) * 100) : null;
  const slowTransitRatio = totalEpisodes ? Math.round((slowTransitCount / totalEpisodes) * 100) : null;
  const fastTransitRatio = totalEpisodes ? Math.round((fastTransitCount / totalEpisodes) * 100) : null;
  const comfortRatio = totalEpisodes ? Math.round((comfortableCount / totalEpisodes) * 100) : null;

  const stabilityDenominator = periodDays === "all"
    ? Math.max(1, currentDayIndex)
    : Math.min(Number(periodDays), currentDayIndex);
  const stabilityIndex = totalEpisodes
    ? Math.min(100, Math.round((loggedDays / stabilityDenominator) * 100))
    : null;

  // Water progress today for correlation card
  const todayWater = waterEntries
    .filter(w => w.dayIndex === currentDayIndex)
    .reduce((sum, entry) => sum + entry.amount, 0);
  const waterPct = waterGoal > 0 ? Math.min(100, Math.round((todayWater / waterGoal) * 100)) : null;
  const daysWithoutDiscomfort = loggedDays - daysWithDiscomfort;

  // ---- ANNA'S INTELLIGENCE (existing logic from utils) ----
  const annaText = React.useMemo(() => {
    const todayEntries = digestionEntries.filter(e => e.dayIndex === currentDayIndex);
    return getDigestionFeedback(
      todayEntries,
      waterEntries,
      waterGoal,
      userName || profile.name,
      userGender
    );
  }, [digestionEntries, currentDayIndex, waterEntries, waterGoal, userName, userGender, profile.name]);

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

        {/* BLOCK 2: Интеллект Анны */}
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
            {annaText}
          </div>
        </div>

        {/* Chart placeholder */}
        <div className="h-48 mb-4" />

        {/* BLOCK 5: Корреляции */}
        <div className="mb-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">КОРРЕЛЯЦИЯ С ДРУГИМИ ФАКТОРАМИ</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-row justify-between items-center shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Питьевой баланс</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Вода / цель</p>
              </div>
              <span className="text-lg font-black text-sky-600 font-mono">{waterPct === null ? "—" : `${waterPct}%`}</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-row justify-between items-center shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Клетчатка</p>
                <p className="text-[10px] text-slate-400 mt-0.5">За день</p>
              </div>
              <span className="text-lg font-black text-amber-600 font-mono">{totalFiber > 0 ? `${totalFiber} г` : "—"}</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-row justify-between items-center shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Индекс отклика</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Идеальный стул</p>
              </div>
              <span className="text-lg font-black text-emerald-600 font-mono">{healthyBristolRatio === null ? "—" : `${healthyBristolRatio}%`}</span>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-row justify-between items-center shadow-sm">
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-600">Дней без дискомфорта</p>
                <p className="text-[10px] text-slate-400 mt-0.5">За 28 дней</p>
              </div>
              <span className="text-lg font-black text-indigo-600 font-mono">{totalEpisodes ? daysWithoutDiscomfort : "—"}</span>
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