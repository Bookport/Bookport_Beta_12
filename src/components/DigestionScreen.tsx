import React, { useState } from "react";
import { ChevronLeft } from "lucide-react";
import BottomBar from "./BottomBar";
import { resolveAvatar } from "../utils/annaAvatarResolver";
import { useAppStore } from "../store/useAppStore";
import { api } from "../utils/api";
import { BRISTOL_IMAGES } from "../utils/digestionConstants";

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
export const normalizeComfort = (comfort: DigestionLogEntry["comfort"] | undefined | null): "easy" | "normal" | "uncomfortable" => {
  if (comfort === "Легко") return "easy";
  if (comfort === "Нормально") return "normal";
  if (comfort === "Тяжело") return "uncomfortable";
  return comfort || "normal";
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

  // Global digestionLogs grouped by day (single source of truth = store)
  const currentLogsMap = React.useMemo(() => {
    const map: Record<number, DigestionLogEntry[]> = {};
    for (const e of digestionEntries) {
      const arr = map[e.dayIndex] || (map[e.dayIndex] = []);
      arr.push({
        id: e.id || `srv-${e.dayIndex}-${e.timestamp}`,
        dayIndex: e.dayIndex,
        timestamp: e.timestamp,
        timeString: e.timeString || "",
        timeInterval: e.timeInterval,
        bristolType: e.bristolType,
        comfort: e.comfort as DigestionLogEntry["comfort"],
        symptoms: e.symptoms || [],
        note: e.note || "",
      });
    }
    return map;
  }, [digestionEntries]);

  // Resolve core user profile settings to stay aligned with overall profile setup
  const storeUserName = useAppStore((s) => s.userProfile.name);
  const resolvedUserName = React.useMemo(() => {
    if (userName && userName !== "друг") return userName;
    if (storeUserName && storeUserName.trim()) return storeUserName;
    return userName;
  }, [userName, storeUserName]);

  // Resolve current water dynamically to prevent 0ml blank display
  const resolvedWater = water > 0 ? water : 0;

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

  const allLogs = (Object.values(currentLogsMap) as DigestionLogEntry[][]).flat();
  const dayLogs = (currentLogsMap[currentDayIndex] || []) as DigestionLogEntry[];

  const handleDeleteEntry = (id: string) => {
    setDigestionEntries(digestionEntries.filter(e => e.id !== id));
  };

  // ---- PERIOD SELECTOR (Фазия B) ----
  const [periodDays, setPeriodDays] = useState<"7" | "28" | "all">("28");
  const periodLogs = React.useMemo(() => {
    if (periodDays === "all") return allLogs;
    const fromDay = Math.max(0, currentDayIndex - Number(periodDays) + 1);
    return allLogs.filter(l => l.dayIndex >= fromDay && l.dayIndex <= currentDayIndex);
  }, [allLogs, periodDays, currentDayIndex]);

  // ---- STATISTICS OVER PERIOD (Фаза D) ----
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
    seenDays.add(log.dayIndex);
  });
  loggedDays = seenDays.size;

  const avgBristolStyle = totalEpisodes ? (totalBristolSum / totalEpisodes).toFixed(1) : null;
  const healthyBristolRatio = totalEpisodes ? Math.round((healthyBristolCount / totalEpisodes) * 100) : null;
  const slowTransitRatio = totalEpisodes ? Math.round((slowTransitCount / totalEpisodes) * 100) : null;
  const fastTransitRatio = totalEpisodes ? Math.round((fastTransitCount / totalEpisodes) * 100) : null;
  const comfortRatio = totalEpisodes ? Math.round((comfortableCount / totalEpisodes) * 100) : null;

  const periodDenominator = periodDays === "all"
    ? Math.max(1, Math.min(totalEpisodes, currentDayIndex))
    : Math.min(Number(periodDays), currentDayIndex);
  const stabilityIndex = totalEpisodes
    ? Math.min(100, Math.round((loggedDays / periodDenominator) * 100))
    : null;

  // Comfort color: 3 green, 2 gray, 1 orange/red (no adjacent yellow+blue ever used)
  const comfortColorClass = comfortRatio === null ? "text-slate-300"
    : comfortRatio >= 75 ? "text-emerald-600"
    : comfortRatio >= 40 ? "text-slate-500"
    : "text-orange-600";

  // ---- TODAY'S current screen context (for Anna overlays) ----
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    (window as any).currentScreenContext = {
      screen_id: "digestion",
      screen_title: "Контроль Пищеварения и Микробиома",
      current_day: currentDayIndex,
      active_modal_or_overlay: null,
      current_status: "Просмотр динамики и Bristol Stool Chart",
      visible_items: dayLogs.map(l => ({
        time: l.timeString,
        bristol_type: l.bristolType,
        metabolism_comfort: l.comfort,
        user_comment: l.note || ""
      })),
      user_input_values: null
    };
    return () => {
      if ((window as any).currentScreenContext?.screen_id === "digestion") {
        delete (window as any).currentScreenContext;
      }
    };
  }, [currentDayIndex, dayLogs]);

  const openAddModal = () => {
    useAppStore.getState().setDigestionModalOpen(true);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-between min-h-0" id="digestion-screen">

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
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4.5 mb-4 text-left relative overflow-hidden">
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
              onClick={openAddModal}
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
                    {/* Compact Image representation of Bristol type */}
                    <div className="w-10 h-10 rounded-xl bg-orange-100/50 flex items-center justify-center overflow-hidden relative shadow-3xs">
                      <img
                        src={BRISTOL_IMAGES[Math.min(6, Math.max(0, (log.bristolType || 4) - 1))]}
                        alt={`Бристоль ${log.bristolType}`}
                        className="w-full h-full object-contain select-none pointer-events-none"
                        draggable={false}
                      />
                      <div className="absolute -top-1 -right-1 bg-white border border-orange-200 text-[#C2410C] font-mono text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-3xs">
                        {log.bristolType}
                      </div>
                    </div>

                    <div className="flex flex-col text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12.5px] font-black font-mono text-slate-800">{log.timeString}</span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full select-none ${
                          normalizeComfort(log.comfort) === "easy"
                            ? "bg-emerald-50 text-emerald-700"
                            : normalizeComfort(log.comfort) === "normal"
                              ? "bg-orange-50 text-orange-700"
                              : "bg-red-50 text-red-600"
                        }`}>
                          {normalizeComfort(log.comfort) === "easy" ? "Легко" : normalizeComfort(log.comfort) === "normal" ? "Нормально" : "Дискомфорт"}
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
                ☀️ <strong>Итог дня:</strong> Сегодня зафиксировано {dayLogs.length} событи{dayLogs.length === 1 ? "е" : dayLogs.length < 5 ? "я" : "й"}. Последний эпизод в {dayLogs[dayLogs.length - 1].timeString}.
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-5 px-3 bg-orange-500/5 rounded-2.5xl border border-dashed border-orange-200/60 mt-1">
              <span className="text-[26px] mb-1 leading-none select-none">🍃</span>
              <p className="text-slate-700 text-xs font-bold font-sans">Сегодня ещё нет записей о стуле</p>
              <p className="text-slate-400 text-[10.5px] text-center mt-1 leading-tight max-w-[280px]">
                Нажмите «Новая запись», чтобы мгновенно добавить замер стула в течение дня.
              </p>
            </div>
          )}
        </div>

        {/* SECTION 2: СМЫСЛОВОЙ БЛОК АННЫ (Anna's guidance block) */}
        <div className="bg-gradient-to-b from-[#FFFBEB] to-[#FEF3C7] border border-amber-200/50 rounded-3xl p-5 mb-4 shadow-sm text-left relative overflow-hidden">
          <div className="absolute top-1 right-3.5 text-[28px] opacity-20 pointer-events-none select-none">✨</div>
          <div className="absolute -left-12 -bottom-12 w-28 h-28 bg-amber-200/20 rounded-full blur-xl pointer-events-none" />

          <div className="flex items-center gap-2 mb-3.5">
            <div className="relative shrink-0 select-none">
              <div className="w-[45px] h-[45px] rounded-full overflow-hidden shadow-sm border border-amber-200/30 relative">
                <img
                  src={annaAvatarSrc}
                  alt="Анна — Советник WFPB"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <span className="text-[9.5px] font-black text-amber-700 uppercase tracking-widest block leading-none">РЕКОМЕНДАЦИИ</span>
              <h3 className="text-[15.5px] font-black text-slate-850 leading-none mt-0.5">Бережные подсказки Анны</h3>
            </div>
          </div>

          <div className="text-[12.8px] leading-relaxed text-slate-800 font-medium space-y-2.5">
            {(() => {
              const lastLog = dayLogs.length > 0 ? dayLogs[dayLogs.length - 1] : (allLogs.length > 0 ? allLogs[allLogs.length - 1] : null);

              if (!lastLog) {
                return (
                  <p>
                    Привет, <strong>{resolvedUserName}</strong>! Для того чтобы я мог проанализировать динамику ЖКТ, сделайте вашу первую отметку о стуле.
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
                      💧 Замечена задержка транзита (тип <strong>{lastLog.bristolType}</strong>). Сегодня выпито <strong>{resolvedWater} мл</strong> воды.
                      Увеличение объёма чистой негазированной тёплой воды в промежутках между едой — первый шаг к гармонизации моторики.
                      Я рекомендую к утренней овсяной каше (без соли!) добавить столовую ложку молотых льняных семян.
                    </p>
                  )}

                  {isDiarrhea && (
                    <p>
                      🥗 Быстрый транзит (тип <strong>{lastLog.bristolType}</strong>) может указывать на адаптацию к обильным сыроедам.
                      Если это сопровождалось дискомфортом, попробуйте на время минимизировать сырые салаты и отдавать предпочтение
                      тёплой термически щадящей пище: разваренному бурму рису, тушёному кабачку без соли или нежному пюре из печёной тыквы.
                    </p>
                  )}

                  {noteText.toLowerCase().includes("вздутие") && (
                    <p>
                      🎈 Я заметил жалобы на <strong>вздутие</strong>. Обычно это признак ферментации бобовых или грубых крестоцветних овощей.
                      При варке нута или чечевицы дольше замачивайте их со смен воды и хорошо проваривайте. Постепенно микрофлора
                      обновится, заселив полезные бактерии, и газы уйдут.
                    </p>
                  )}

                  {totalFiber > 0 && (
                    <p>
                      🌾 За день накоплено <strong>{totalFiber} г клетчатки</strong>. {totalFiber >= 25 ? "Отличный объём для комфортного транзита и питания микрофлоры." : totalFiber >= 10 ? "Хорошая база — добавь к ужину порцию бобовых или зелени." : "Старайся добавлять в каждый приём пищи бобовые, цельные злаки и листовую зелень."}
                    </p>
                  )}

                  {topGreenIngredients && (
                    <p>
                      🥬 В рационе преобладают: <strong>{topGreenIngredients}</strong>. Это богат источник пребиотиков и полифенов,
                      поддерживающих рост благородной микрофлоры.
                    </p>
                  )}

                  <p className="text-[12px] text-amber-900 border-t border-amber-300/30 pt-2 mt-2 leading-snug">
                    🌻 <strong>Важно:</strong> Всегда слушайте своё тело. Мы не занимаемся диагностикой болезней, а бережн восстанавливаем природный ритм организма чистым, природным WFPB рационом.
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* SECTION 3: ВЫСОКОКЛАССНАЯ СТАТИСТИКА И ПАТТЕРНЫ (Фаза D) */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4.5 mb-4 text-left">
          <div className="mb-3 px-0.5">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">ОБЩАЯ СТАТИСТИКА</span>
                <h2 className="text-[16px] font-black text-slate-850" style={{ fontFamily: '"Calibri", "Candara", sans-serif' }}>
                  Тренды и ритмичность ЖКТ
                </h2>
              </div>
            </div>

            {/* Period selector pill */}
            <div className="flex flex-row gap-1 w-full mt-3 bg-slate-50 p-1 rounded-2xl border border-slate-100">
              {(["7", "28", "all"] as const).map(p => {
                const isActive = periodDays === p;
                const label = p === "7" ? "7 дней" : p === "28" ? "28 дней" : "Все время";
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriodDays(p)}
                    className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold transition-colors cursor-pointer ${
                      isActive ? "bg-[#D1FAE5] text-[#14532D]" : "text-slate-500"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* EMPTY STATE over period */}
          {totalEpisodes === 0 && (
            <div className="flex flex-col items-center justify-center py-6 px-3 bg-slate-50 rounded-2.5xl border border-dashed border-slate-200/80 mb-4">
              <span className="text-[24px] mb-1 leading-none select-none">📭</span>
              <p className="text-slate-700 text-xs font-bold font-sans">Нет записей за период</p>
              <p className="text-slate-400 text-[10.5px] text-center mt-1 leading-tight max-w-[260px]">
                Добавьте первую запись, чтобы появилась статистика.
              </p>
            </div>
          )}

          {/* Top three stat cards */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 text-center flex flex-col justify-between h-[84px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase leading-none block">БРИСТОЛЬ</span>
              <span className="text-[20px] font-black text-[#C2410C] leading-none my-1 font-mono">{avgBristolStyle ?? "—"}</span>
              <span className="text-[9.5px] font-bold text-slate-500 leading-none whitespace-nowrap block">Средний тип</span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 text-center flex flex-col justify-between h-[84px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase leading-none block">СТАБИЛЬНОСТЬ</span>
              <span className="text-[20px] font-black text-emerald-600 leading-none my-1 font-mono">{totalEpisodes ? `${stabilityIndex}%` : "—"}</span>
              <span className="text-[9.5px] font-bold text-slate-500 leading-none whitespace-nowrap block">Индекс ритма</span>
            </div>

            <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-100 text-center flex flex-col justify-between h-[84px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase leading-none block">КОМФОРТ</span>
              <span className={`text-[20px] font-black leading-none my-1 font-mono ${comfortColorClass}`}>{comfortRatio === null ? "—" : `${comfortRatio}%`}</span>
              <span className="text-[9.5px] font-bold text-slate-500 leading-none whitespace-nowrap block">Доля комфорта</span>
            </div>
          </div>

          {/* Type frequencies distribution percentages */}
          <div className="space-y-3 px-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest leading-none block mb-1">Распределение типов стула</span>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11.5px] font-bold text-slate-650">
                <span>Идеальный стул (Типы 3, 4, 5) 🌿</span>
                <span className="font-mono text-emerald-600">{healthyBristolRatio === null ? "—" : `${healthyBristolRatio}%`}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${healthyBristolRatio ?? 0}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11.5px] font-bold text-slate-650">
                <span>Замедленный транзит (Типы 1, 2) 🪨</span>
                <span className="font-mono text-orange-600">{slowTransitRatio === null ? "—" : `${slowTransitRatio}%`}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-400 to-amber-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${slowTransitRatio ?? 0}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[11.5px] font-bold text-slate-650">
                <span>Ускоренный транзит (Типы 6, 7) 🌊</span>
                <span className="font-mono text-red-600">{fastTransitRatio === null ? "—" : `${fastTransitRatio}%`}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-red-400 to-rose-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${fastTransitRatio ?? 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* DATA PERSISTENCE INFO */}
        <div className="bg-slate-100/50 rounded-2xl p-3 border border-slate-200/50 text-[11px] text-slate-500 leading-snug font-medium text-left mb-6.5">
          ℹ️ Все записи о пищеварении сохраняются в вашем дневнике. Статистика ЖКТ обновляется по мере добавления данных.
        </div>

      </div>

      {/* Embedded footer */}
      <div className="w-full">
        <BottomBar onHomeClick={onBack} />
      </div>

    </div>
  );
}