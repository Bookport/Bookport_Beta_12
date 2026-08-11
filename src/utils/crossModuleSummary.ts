import { AppState } from "../store/useAppStore";
import { getWaterGoal, WATER_ACTIVE_START_MIN, WATER_ACTIVE_WINDOW_MIN } from "./waterGoal";

// Единый набор статусов воды для всех модулей (WaterContext, digestionContext и т.д.)
export type WaterStatus = 'zero' | 'deficit' | 'optimum' | 'excess';

export interface DailySummary {
  dayIndex: number;
  water: {
    amount: number;
    goal: number;
    pct: number;
    status: WaterStatus;
    /** Ожидаемая норма к текущей минуте (Time-adjusted Goal) — только для текущего дня. */
    expectedGoalOnNow: number | null;
    /** % выполнения ожидаемой нормы к текущей минуте — только для текущего дня. */
    timePct: number | null;
  };
  food: {
    yesterdayFiber: number | null;
  };
  digestion: {
    episodes: number;
    bristolAvg: number | null;
    worstBristol: number | null;
    latestBristol: number | null;
    latestComfort: 'easy' | 'normal' | 'hard' | null;
    latestSymptoms: string[];
    symptoms: string[];
    comfortRatio: number | null;
    status: 'constipation' | 'ideal' | 'diarrhea' | 'no_data';
  };
  movement: {
    activeMin: number;
    status: 'sedentary' | 'active' | 'athletic';
  };
  measurements: {
    pulseAvg: number | null;
    latestPulse: number | null;
    systolic: number | null;
    diastolic: number | null;
    weightAvg: number | null;
    weightDelta: number | null;
    tonus: 'low' | 'normal' | 'high' | 'no_data';
    rawTonus: string | null;
  };
  /** Самые свежие замеры вообще (независимо от дня) — для физиологических связок с инерцией. */
  latestMeasurements: {
    pulse: number | null;
    systolic: number | null;
    diastolic: number | null;
    weight: number | null;
    weightDelta: number | null;
    tonus: 'low' | 'normal' | 'high' | 'no_data';
    rawTonus: string | null;
  };
}

export const buildDailySummary = (dayIndex: number, store: AppState, currentDayIndex: number): DailySummary => {
  const dayIndexNum = Number(dayIndex);
  // 1. WATER
  const waterEntries = store.waterEntries.filter(w => Number(w.dayIndex) === dayIndexNum);
  const waterAmount = waterEntries.reduce((sum, w) => sum + w.amount, 0);
  const waterGoal = getWaterGoal(store.userProfile?.weight);
  // Процент НЕ обрезается на 100 — иначе недостижим статус 'excess' (> 150%)
  const waterPct = waterGoal > 0 ? Math.round((waterAmount / waterGoal) * 100) : 0;

  // Time-adjusted Goal: для текущего дня суточная норма распределяется на активное окно
  // (14 часов, 08:00–22:00). Ожидаемая норма к текущей минуте — только для оценки статуса
  // коучинга Анны. UI и абсолютные цифры (вода/цель 2400 мл) не зависят от этого.
  const isToday = dayIndexNum === Number(currentDayIndex);
  let expectedGoalOnNow: number | null = null;
  let timePct: number | null = null;

  if (isToday) {
    const now = new Date();
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const elapsedMin = Math.max(0, Math.min(nowMin - WATER_ACTIVE_START_MIN, WATER_ACTIVE_WINDOW_MIN));
    // min 1 мл — защита от деления на 0 до старта окна (до 08:00)
    expectedGoalOnNow = Math.max(1, Math.round((waterGoal * elapsedMin) / WATER_ACTIVE_WINDOW_MIN));
    timePct = elapsedMin <= 0 && waterAmount > 0
      ? 100 // до 08:00 выпитый объём — уже опережение графика
      : Math.round((waterAmount / expectedGoalOnNow) * 100);
  }

  let waterStatus: WaterStatus = 'zero';
  if (waterAmount > 0) {
    const refPct = isToday && timePct !== null ? timePct : waterPct;
    if (refPct >= 150) waterStatus = 'excess';
    else if (refPct >= 100) waterStatus = 'optimum';
    else waterStatus = 'deficit';
  }

  // 2. DIGESTION
  const digestionEntries = store.digestionEntries
    .filter(e => Number(e.dayIndex) === dayIndexNum)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Descending

  let bristolAvg: number | null = null;
  let worstBristol: number | null = null;
  let latestBristol: number | null = null;
  let latestComfort: 'easy' | 'normal' | 'hard' | null = null;
  let latestSymptoms: string[] = [];
  const symptomsSet = new Set<string>();
  let comfortableCount = 0;

  if (digestionEntries.length > 0) {
    latestBristol = digestionEntries[0].bristolType;
    latestComfort = digestionEntries[0].comfort === "Легко" || digestionEntries[0].comfort === "easy"
      ? "easy"
      : digestionEntries[0].comfort === "Тяжело" || digestionEntries[0].comfort === "uncomfortable"
        ? "hard"
        : "normal";
    latestSymptoms = (digestionEntries[0].symptoms || []).filter(s => s !== "Нет симптомов");
    let bristolSum = 0;
    let maxDev = -1;
    for (const log of digestionEntries) {
      if (log.bristolType) {
        bristolSum += log.bristolType;
        const dev = Math.abs(log.bristolType - 4);
        if (dev > maxDev) {
          maxDev = dev;
          worstBristol = log.bristolType;
        }
      }
      if (log.symptoms) {
        log.symptoms.forEach(s => {
          if (s !== "Нет симптомов") symptomsSet.add(s);
        });
      }
      const c = log.comfort ? (log.comfort === "Легко" || log.comfort === "easy" ? "easy" : log.comfort === "Нормально" || log.comfort === "normal" ? "normal" : "uncomfortable") : "normal";
      if (c === "easy" || c === "normal") comfortableCount++;
    }
    bristolAvg = bristolSum / digestionEntries.length;
  }

  let digestionStatus: 'constipation' | 'ideal' | 'diarrhea' | 'no_data' = 'no_data';
  if (latestBristol !== null) {
    if (latestBristol <= 2) digestionStatus = 'constipation';
    else if (latestBristol >= 6) digestionStatus = 'diarrhea';
    else digestionStatus = 'ideal';
  }

  // 1b. FOOD — вчерашняя клетчатка (для кросс-связки «вода + клетчатка»)
  const yesterdayIndex = dayIndexNum - 1;
  let yesterdayFiber: number | null = null;
  const yesterdayDishes = store.savedDishes.filter(
    d => d.dayIndex !== undefined && Number(d.dayIndex) === yesterdayIndex
  );
  if (yesterdayDishes.length > 0) {
    let fiberSum = 0;
    for (const dish of yesterdayDishes) {
      const raw = dish.computedNutrients?.fiber ?? dish.fiber;
      const num = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""));
      if (!Number.isNaN(num)) fiberSum += num;
    }
    yesterdayFiber = Number(fiberSum.toFixed(1));
  }

  // 3. MOVEMENT
  // Суммируем в СЕКУНДАХ (duration || durationSeconds), затем переводим в минуты —
  // идентично MovementDetailsScreen и карточке «Движение», иначе при первом рендере
  // (когда durationSeconds ещё не нормализован) activeMin=0 и Анна выдаёт «на нуле».
  const movementEntries = store.movementEntries.filter(m => Number(m.dayIndex) === dayIndexNum);
  const activeSeconds = movementEntries.reduce((sum, m) => sum + (Number(m.duration) || Number(m.durationSeconds) || 0), 0);
  const activeMin = Math.round(activeSeconds / 60);
  let movementStatus: 'sedentary' | 'active' | 'athletic' = 'sedentary';
  if (activeMin >= 30) movementStatus = 'active';
  if (activeMin >= 60) movementStatus = 'athletic';

// 4. MEASUREMENTS
const measurements = store.measurementEntries
  .filter(m => Number(m.dayIndex) === dayIndexNum)
  .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Descending (самые новые первые)

const allMeasurements = [...store.measurementEntries]
  .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Descending (самые новые вообще)

const pulses = measurements.filter(m => m.pulse).map(m => m.pulse as number);
const weights = measurements.filter(m => m.weight).map(m => m.weight as number);
const systolics = measurements.filter(m => m.systolic).map(m => m.systolic as number);
const diastolics = measurements.filter(m => m.diastolic).map(m => m.diastolic as number);

const latestPulse = pulses.length > 0 ? pulses[0] : null; // Последний (актуальный) замер пульса — отсортирован по времени (массив уже убывается по timestamp)
const systolic = systolics.length > 0 ? systolics[0] : null;
const diastolic = diastolics.length > 0 ? diastolics[0] : null;
const pulseAvg = pulses.length > 0 ? Math.round(pulses.reduce((a,b)=>a+b,0)/pulses.length) : null;
const weightAvg = weights.length > 0 ? Number((weights.reduce((a,b)=>a+b,0)/weights.length).toFixed(1)) : null;

let tonus: 'low' | 'normal' | 'high' | 'no_data' = 'no_data';
let rawTonus: string | null = null;
if (measurements.length > 0) {
  const latestMeasurement = measurements[0];
  if (latestMeasurement.tonus) {
    rawTonus = latestMeasurement.tonus;
    const tStr = latestMeasurement.tonus.toLowerCase();
    if (tStr.includes("плохое") || tStr.includes("сниженная") || tStr.includes("тяжёлое")) {
      tonus = 'low';
    } else if (tStr.includes("хорошее") || tStr.includes("высокая") || tStr.includes("отличное") || tStr.includes("лёгкое")) {
      tonus = 'high';
    } else {
      tonus = 'normal';
    }
  }
}

// 4b. LATEST-ANY-DAY MEASUREMENTS (самые свежие замеры вообще, независимо от дня)
const latestMeasurementAnyDay = allMeasurements.length > 0 ? allMeasurements[0] : null;
const latestPulseAnyDay = latestMeasurementAnyDay?.pulse ?? null;
const latestSystolicAnyDay = latestMeasurementAnyDay?.systolic ?? null;
const latestDiastolicAnyDay = latestMeasurementAnyDay?.diastolic ?? null;
const latestWeightAnyDay = latestMeasurementAnyDay?.weight ?? null;
let latestTonusAnyDay: 'low' | 'normal' | 'high' | 'no_data' = 'no_data';
let latestRawTonusAnyDay: string | null = null;
if (latestMeasurementAnyDay?.tonus) {
  latestRawTonusAnyDay = latestMeasurementAnyDay.tonus;
  const tStr = latestMeasurementAnyDay.tonus.toLowerCase();
  if (tStr.includes("плохое") || tStr.includes("сниженная") || tStr.includes("тяжёлое")) {
    latestTonusAnyDay = 'low';
  } else if (tStr.includes("хорошее") || tStr.includes("высокая") || tStr.includes("отличное") || tStr.includes("лёгкое")) {
    latestTonusAnyDay = 'high';
  } else {
    latestTonusAnyDay = 'normal';
  }
}
const latestWeightDeltaAnyDay = latestWeightAnyDay !== null && store.userProfile?.initialWeight
  ? Number((latestWeightAnyDay - store.userProfile.initialWeight).toFixed(1))
  : null;

  return {
    dayIndex: dayIndexNum,
    water: { amount: waterAmount, goal: waterGoal, pct: waterPct, status: waterStatus, expectedGoalOnNow, timePct },
    food: { yesterdayFiber },
    digestion: {
      episodes: digestionEntries.length,
      bristolAvg,
      worstBristol,
      latestBristol,
      latestComfort,
      latestSymptoms,
      symptoms: Array.from(symptomsSet),
      comfortRatio: digestionEntries.length ? comfortableCount / digestionEntries.length : null,
      status: digestionStatus,
    },
    movement: { activeMin, status: movementStatus },
    measurements: {
      pulseAvg,
      latestPulse,
      systolic,
      diastolic,
      weightAvg,
      weightDelta: weightAvg !== null ? Number((weightAvg - (store.userProfile?.initialWeight || weightAvg)).toFixed(1)) : null,
      tonus,
      rawTonus,
    },
    latestMeasurements: {
      pulse: latestPulseAnyDay,
      systolic: latestSystolicAnyDay,
      diastolic: latestDiastolicAnyDay,
      weight: latestWeightAnyDay,
      weightDelta: latestWeightDeltaAnyDay,
      tonus: latestTonusAnyDay,
      rawTonus: latestRawTonusAnyDay,
    },
  };
};
