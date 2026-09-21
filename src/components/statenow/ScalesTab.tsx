// src/components/statenow/ScalesTab.tsx
import React from "react";
import { motion } from "motion/react";
import AnnaTabSpoiler from "./AnnaTabSpoiler";
import { NextStepRecommendation } from "../../utils/nextStepEngine";
import { useAppStore } from "../../store/useAppStore";
import { getMovementAssetPath } from "../../utils/movementAssets";
import { BRISTOL_IMAGES } from "../../utils/digestionConstants";

// Импорт 3D-миниатюр
import iconSleep from "../../assets/images/SOST/balance/1.webp";
import iconWater from "../../assets/images/SOST/balance/2.webp";
import iconApple from "../../assets/images/SOST/balance/3.webp";
import iconSneaker from "../../assets/images/SOST/balance/4.webp";
import iconLightning from "../../assets/images/SOST/balance/5.webp";
import iconCloche from "../../assets/images/SOST/balance/6.webp";
import iconBooks from "../../assets/images/SOST/balance/7.webp";
import iconMedal from "../../assets/images/SOST/balance/8.webp";
import iconHeader from "../../assets/images/SOST/balance/13.webp"; // Золотые весы для заголовка
import iconDigestion from "../../assets/images/SOST/balance/14.webp"; // Горошек для моторики ЖКТ

export interface DigestionEntryProp {
  dayIndex: number;
  type?: string;
  note?: string;
  timestamp?: number;
  bristolType: number;
  comfort?: string;
  symptoms?: string[];
  timeString?: string;
  timeInterval?: string;
  id?: string;
}

interface ScalesTabProps {
  key?: any;
  sleep: number;
  sleepPct: number;
  water: number;
  waterPct: number;
  waterTarget: number;
  mealCount: number;
  mealsPct: number;
  mealsTarget: number;
  habitsDone: number;
  habitsPct: number;
  habitsTarget: number;
  energyPct: number;
  activityLogs?: any[];
  todayWaterEntries?: { amount: number; time?: string; timestamp: number }[];
  currentDayIndex: number;
  todayCookedBookCount: number;
  todayTotalBookMenuCount?: number;
  totalCookedBookRecipesCount: number;
  annaAnalysisText?: string;
  recommendedAction?: NextStepRecommendation;
  digestionLogs?: DigestionEntryProp[];
  // Опциональные поля обратной совместимости
  ratingEnergy?: number;
  ratingWellbeing?: number;
  ratingLightness?: number;
  wellbeingLog?: { time: string; val: number }[];
  energyLog?: { time: string; val: number }[];
  lightnessLog?: { time: string; val: number }[];
  handleRatingChange?: (type: "zen" | "energy" | "lightness", val: number) => void;
}

// Метаданные Бристольской шкалы для ЖКТ
const getBristolMeta = (type: number) => {
  switch (type) {
    case 3:
      return { label: "Норма", score: 100, color: "text-teal-700", bg: "bg-teal-500" };
    case 4:
      return { label: "Идеал", score: 100, color: "text-emerald-700", bg: "bg-emerald-500" };
    case 5:
      return { label: "Мягкий", score: 80, color: "text-sky-700", bg: "bg-sky-500" };
    case 1:
    case 2:
      return { label: "Замедлен", score: 40, color: "text-amber-700", bg: "bg-amber-500" };
    case 6:
    case 7:
      return { label: "Ускорен", score: 35, color: "text-rose-700", bg: "bg-rose-500" };
    default:
      return { label: "Норма", score: 70, color: "text-teal-700", bg: "bg-teal-500" };
  }
};

export default function ScalesTab({
  sleep,
  sleepPct,
  water,
  waterPct,
  waterTarget,
  mealCount,
  mealsPct,
  mealsTarget,
  habitsDone,
  habitsPct,
  habitsTarget,
  energyPct,
  activityLogs = [],
  todayWaterEntries = [],
  currentDayIndex,
  todayCookedBookCount,
  totalCookedBookRecipesCount,
  annaAnalysisText,
  recommendedAction,
  digestionLogs = [],
}: ScalesTabProps) {
  // Получение гендера пользователя для 3D-ассетов движения
  const storeGender = useAppStore((s) => s.userProfile?.gender);
  const userGender: "female" | "male" = storeGender === "male" ? "male" : "female";

  // Расчёт метрик моторики ЖКТ с учётом множественных фиксаций за день
  const validDigestionLogs = digestionLogs.filter(
    (e) => e && Number(e.bristolType) >= 1 && Number(e.bristolType) <= 7
  );
  const digestionCount = validDigestionLogs.length;
  const latestDigestion = digestionCount > 0 ? validDigestionLogs[0] : null;
  const latestBristolMeta = latestDigestion ? getBristolMeta(latestDigestion.bristolType) : null;

  // Итоговый процент моторики дня (средний балл всех походов)
  const digestionPct = digestionCount > 0
    ? Math.round(
        validDigestionLogs.reduce((acc, log) => acc + getBristolMeta(log.bristolType).score, 0) / digestionCount
      )
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-4 pb-5 sm:pb-24 w-full overflow-x-hidden"
    >
      {/* 0. Карточка аналитики Анны */}
      {annaAnalysisText && recommendedAction && (
        <AnnaTabSpoiler 
          tabId="scales"
          tabName="Шкалы состояния"
          analysisText={annaAnalysisText}
          recommendedAction={recommendedAction}
        />
      )}

      {/* ОСНОВНЫЕ ШКАЛЫ (Без внешней подложки, каждая плашка независима) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1 mb-1">
          <img src={iconHeader} alt="Шкалы" className="w-6 h-6 object-contain drop-shadow-xs shrink-0" />
          <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-wider">
            ОСНОВНЫЕ ШКАЛЫ СОСТОЯНИЯ ОРГАНИЗМА
          </h2>
        </div>

        {/* Шкала 1: Сон */}
        <div className="bg-indigo-50/60 rounded-[20px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] px-3 py-[2.5px] flex flex-col justify-center gap-1.5 w-full min-h-[58px]">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2.5">
              <img src={iconSleep} alt="Сон" className="w-8 h-8 object-contain drop-shadow-sm shrink-0" />
              <div className="flex flex-col">
                <span className="text-[12.5px] font-bold text-slate-800 leading-tight">Сон</span>
                <span className="text-[11px] font-semibold text-slate-500 leading-tight">восстановительный</span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[13px] font-black text-slate-800 leading-tight">{Math.round(sleep / 60)} ч</span>
              <span className="text-[11px] font-bold text-slate-400 leading-tight">({sleepPct}%)</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-indigo-500/15 overflow-hidden w-full mb-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${sleepPct > 0 ? Math.max(4, Math.min(100, sleepPct)) : 0}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-indigo-500"
            />
          </div>
        </div>

        {/* Шкала 2: Вода */}
        <div className="bg-sky-50/60 rounded-[20px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] px-3 py-[2.5px] flex flex-col justify-center gap-1.5 w-full min-h-[58px]">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2.5">
              <img src={iconWater} alt="Вода" className="w-8 h-8 object-contain drop-shadow-sm shrink-0" />
              <div className="flex flex-col">
                <span className="text-[12.5px] font-bold text-slate-800 leading-tight">Водный баланс</span>
                <span className="text-[11px] font-semibold text-slate-500 leading-tight">клетки</span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[13px] font-black text-slate-800 leading-tight">{water} / {waterTarget} мл</span>
              <span className="text-[11px] font-bold text-slate-400 leading-tight">({waterPct}%)</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-sky-500/15 overflow-hidden w-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${waterPct > 0 ? Math.max(4, Math.min(100, waterPct)) : 0}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-sky-500"
            />
          </div>
          {todayWaterEntries && todayWaterEntries.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 pt-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {todayWaterEntries.map((entry, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[11px] font-bold bg-white/95 text-sky-700 px-2 py-0.5 rounded-full border border-sky-100 shadow-[0_2px_4px_rgba(2,132,199,0.05)] shrink-0">
                  <span className="text-sky-500 text-xs leading-none">💧</span> +{entry.amount} мл 
                  {entry.time && <span className="text-[10px] font-black text-slate-400 opacity-80"> • {entry.time}</span>}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Шкала 3: Рацион растительный */}
        <div className="bg-emerald-50/60 rounded-[20px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] px-3 py-[2.5px] flex flex-col justify-center gap-1.5 w-full min-h-[58px]">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2.5">
              <img src={iconApple} alt="Рацион" className="w-8 h-8 object-contain drop-shadow-sm shrink-0" />
              <div className="flex flex-col">
                <span className="text-[12.5px] font-bold text-slate-800 leading-tight">Накопленный WFPB-</span>
                <span className="text-[12.5px] font-bold text-slate-800 leading-tight">рацион</span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[13px] font-black text-slate-800 leading-tight">{mealCount} / {mealsTarget}</span>
              <span className="text-[11px] font-bold text-slate-400 leading-tight">({mealsPct}%)</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-emerald-500/15 overflow-hidden w-full mb-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mealsPct > 0 ? Math.max(4, Math.min(100, mealsPct)) : 0}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-emerald-500"
            />
          </div>
        </div>

        {/* Шкала 4: Ключи системы (Молния) */}
        <div className="bg-orange-50/60 rounded-[20px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] px-3 py-[2.5px] flex flex-col justify-center gap-1.5 w-full min-h-[58px]">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2.5">
              <img src={iconLightning} alt="Ключи" className="w-8 h-8 object-contain drop-shadow-sm shrink-0" />
              <div className="flex flex-col">
                <span className="text-[12.5px] font-bold text-slate-800 leading-tight">Ключи системы</span>
                <span className="text-[11px] font-semibold text-slate-500 leading-tight">(формируем привычки)</span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[13px] font-black text-slate-800 leading-tight">{habitsDone} / {habitsTarget}</span>
              <span className="text-[11px] font-bold text-slate-400 leading-tight">({habitsPct}%)</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-orange-500/15 overflow-hidden w-full mb-1">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${habitsPct > 0 ? Math.max(4, Math.min(100, habitsPct)) : 0}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-orange-500"
            />
          </div>
        </div>

        {/* Шкала 5: Движение (Кроссовок) с фирменными 3D-ассетами */}
        <div className="bg-amber-50/60 rounded-[20px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] px-3 py-[2.5px] flex flex-col justify-center gap-1.5 w-full min-h-[58px]">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2.5">
              <img src={iconSneaker} alt="Движение" className="w-8 h-8 object-contain drop-shadow-sm shrink-0" />
              <div className="flex flex-col justify-center">
                <span className="text-[12.5px] font-bold text-slate-800 leading-tight whitespace-nowrap">Движение / Активность</span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[13px] font-black text-slate-800 leading-tight">{energyPct}%</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-amber-500/15 overflow-hidden w-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${energyPct > 0 ? Math.max(4, Math.min(100, energyPct)) : 0}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="h-full rounded-full bg-amber-500"
            />
          </div>
          {(activityLogs || []).length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 pt-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {(activityLogs || []).map((log: any, i: number) => {
                const rawType = log.activityType || log.type || "Walk";
                const imgSrc = getMovementAssetPath(rawType, userGender);
                const durationMin = Math.round((log.durationSeconds || log.duration || 0) / 60);

                return (
                  <span
                    key={log.id || i}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/95 text-amber-800 px-2 py-0.5 rounded-full border border-amber-100 shadow-[0_2px_4px_rgba(245,158,11,0.05)] shrink-0"
                  >
                    <img
                      src={imgSrc}
                      alt={rawType}
                      className="w-5 h-5 object-contain shrink-0"
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = "none";
                      }}
                    />
                    <span>{rawType} ({durationMin} мин)</span>
                    {log.timeString && (
                      <span className="text-[10px] font-black text-slate-400 opacity-80"> • {log.timeString}</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Шкала 6: Моторика ЖКТ / Очищение (Горошек) с миниатюрами Бристольской шкалы */}
        <div className="bg-teal-50/60 rounded-[20px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.08)] px-3 py-[2.5px] flex flex-col justify-center gap-1.5 w-full min-h-[58px]">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2.5">
              <img src={iconDigestion} alt="ЖКТ" className="w-8 h-8 object-contain drop-shadow-sm shrink-0" />
              <div className="flex flex-col">
                <span className="text-[12.5px] font-bold text-slate-800 leading-tight">Моторика ЖКТ</span>
                <span className="text-[11px] font-semibold text-slate-500 leading-tight">
                  {latestDigestion
                    ? `Бристоль ${latestDigestion.bristolType} (${latestBristolMeta?.label})`
                    : "очищение / стул"}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className="text-[13px] font-black text-slate-800 leading-tight">
                {digestionCount > 0 ? `${digestionCount} фикс.` : "0"}
              </span>
              <span className="text-[11px] font-bold text-slate-400 leading-tight">
                ({digestionPct}%)
              </span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-teal-500/15 overflow-hidden w-full">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${digestionPct > 0 ? Math.max(4, Math.min(100, digestionPct)) : 0}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
              className={`h-full rounded-full ${latestBristolMeta ? latestBristolMeta.bg : "bg-teal-500"}`}
            />
          </div>
          {validDigestionLogs.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap pb-1 pt-0.5" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {validDigestionLogs.map((entry, i) => {
                const meta = getBristolMeta(entry.bristolType);
                const safeTypeIndex = Math.min(6, Math.max(0, (entry.bristolType || 4) - 1));
                const bristolThumb = BRISTOL_IMAGES[safeTypeIndex];

                return (
                  <span
                    key={entry.id || i}
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/95 text-teal-800 px-2 py-0.5 rounded-full border border-teal-100 shadow-[0_2px_4px_rgba(13,148,136,0.05)] shrink-0"
                  >
                    {bristolThumb && (
                      <img
                        src={bristolThumb}
                        alt={`Бристоль ${entry.bristolType}`}
                        className="w-5 h-5 object-contain shrink-0"
                        loading="lazy"
                      />
                    )}
                    <span>Тип {entry.bristolType} ({meta.label})</span>
                    {entry.timeString && (
                      <span className="text-[10px] font-black text-slate-400 opacity-80"> • {entry.timeString}</span>
                    )}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ПРОГРЕСС ПО КУРСУ КНИГИ РЕЦЕПТОВ */}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-wider">
            ПРОГРЕСС ПО КУРСУ КНИГИ РЕЦЕПТОВ
          </h2>
          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100 uppercase tracking-wider shrink-0">
            ДЕНЬ {currentDayIndex} ИЗ 28
          </span>
        </div>

        <div className="bg-white rounded-[28px] border border-white shadow-[0_4px_16px_rgba(15,23,42,0.05)] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2.5">
            {/* Меню дня */}
            <div className="bg-emerald-50/40 rounded-2xl p-3 border border-emerald-50 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2 gap-1">
                  <span className="text-[12px] font-bold text-slate-700 leading-tight">Кулинарное<br/>меню дня</span>
                  <img src={iconCloche} alt="Меню" className="w-11 h-11 object-contain drop-shadow-sm shrink-0" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 leading-none">{todayCookedBookCount}</span>
                  <span className="text-[11px] font-bold text-slate-400">/ 4 блюда</span>
                </div>
              </div>
              <p className="text-[10px] font-medium text-slate-400 mt-2.5 leading-snug">
                Рецептов из меню Дня {currentDayIndex} отмечено как приготовлено за сегодня.
              </p>
            </div>

            {/* Всего по книге */}
            <div className="bg-indigo-50/40 rounded-2xl p-3 border border-indigo-50 relative overflow-hidden flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2 gap-1">
                  <span className="text-[12px] font-bold text-slate-700 leading-tight">Всего по<br/>книге курса</span>
                  <img src={iconBooks} alt="Книга" className="w-11 h-11 object-contain drop-shadow-sm shrink-0" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-slate-800 leading-none">{totalCookedBookRecipesCount}</span>
                  <span className="text-[11px] font-bold text-slate-400">приготовлено</span>
                </div>
              </div>
              <p className="text-[10px] font-medium text-slate-400 mt-2.5 leading-snug">
                Суммарное количество приготовленных вами рецептов за все дни.
              </p>
            </div>
          </div>

          {/* Общий прогресс (из 166) */}
          <div className="bg-amber-50/40 rounded-2xl p-3 border border-amber-50 flex items-center gap-3">
            <img src={iconMedal} alt="Прогресс" className="w-9 h-9 object-contain drop-shadow-sm shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[12px] font-bold text-slate-700">Приготовлено по книге (из 166)</span>
                <span className="text-[13px] font-black text-slate-800">{Math.round((totalCookedBookRecipesCount / 166) * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-amber-500/15 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (totalCookedBookRecipesCount / 166) * 100)}%` }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                  className="h-full rounded-full bg-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}