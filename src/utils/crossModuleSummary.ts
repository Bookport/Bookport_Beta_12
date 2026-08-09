import { AppState } from "../store/useAppStore";

export interface DailySummary {
  dayIndex: number;
  water: {
    amount: number;
    goal: number;
    pct: number;
    status: 'deficit' | 'normal' | 'excess';
  };
  digestion: {
    episodes: number;
    bristolAvg: number | null;
    worstBristol: number | null;
    latestBristol: number | null;
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
    weightAvg: number | null;
    weightDelta: number | null;
    tonus: 'low' | 'normal' | 'high' | 'no_data';
  };
}

export const buildDailySummary = (dayIndex: number, store: AppState): DailySummary => {
  const dayIndexNum = Number(dayIndex);
  // 1. WATER
  const waterEntries = store.waterEntries.filter(w => Number(w.dayIndex) === dayIndexNum);
  const waterAmount = waterEntries.reduce((sum, w) => sum + w.amount, 0);
  const weight = store.userProfile?.weight || 65;
  const waterGoal = Math.round(weight * 30);
  const waterPct = waterGoal > 0 ? Math.min(100, Math.round((waterAmount / waterGoal) * 100)) : 0;
  
  let waterStatus: 'deficit' | 'normal' | 'excess' = 'deficit';
  if (waterPct >= 100) waterStatus = 'normal';
  if (waterPct >= 150) waterStatus = 'excess';

  // 2. DIGESTION
  const digestionEntries = store.digestionEntries
    .filter(e => Number(e.dayIndex) === dayIndexNum)
    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)); // Descending

  let bristolAvg: number | null = null;
  let worstBristol: number | null = null;
  let latestBristol: number | null = null;
  const symptomsSet = new Set<string>();
  let comfortableCount = 0;

  if (digestionEntries.length > 0) {
    latestBristol = digestionEntries[0].bristolType;
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

  // 3. MOVEMENT
  const movementEntries = store.movementEntries.filter(m => Number(m.dayIndex) === dayIndexNum);
  const activeMin = movementEntries.reduce((sum, m) => sum + (m.durationSeconds ? Math.round(m.durationSeconds/60) : 0), 0);
  let movementStatus: 'sedentary' | 'active' | 'athletic' = 'sedentary';
  if (activeMin >= 30) movementStatus = 'active';
  if (activeMin >= 60) movementStatus = 'athletic';

// 4. MEASUREMENTS
const measurements = store.measurementEntries.filter(m => Number(m.dayIndex) === dayIndexNum);
const pulses = measurements.filter(m => m.pulse).map(m => m.pulse as number);
const weights = measurements.filter(m => m.weight).map(m => m.weight as number);

const latestPulse = pulses.length > 0 ? pulses[0] : null; // Последний (актуальный) замер пульса — отсортирован по времени (массив уже убывается по timestamp)
const pulseAvg = pulses.length > 0 ? Math.round(pulses.reduce((a,b)=>a+b,0)/pulses.length) : null;
const weightAvg = weights.length > 0 ? Number((weights.reduce((a,b)=>a+b,0)/weights.length).toFixed(1)) : null;

let tonus: 'low' | 'normal' | 'high' | 'no_data' = 'no_data';
if (measurements.length > 0) {
  const latestMeasurement = measurements[0];
  if (latestMeasurement.tonus) {
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

  return {
    dayIndex: dayIndexNum,
    water: { amount: waterAmount, goal: waterGoal, pct: waterPct, status: waterStatus },
    digestion: {
      episodes: digestionEntries.length,
      bristolAvg,
      worstBristol,
      latestBristol,
      symptoms: Array.from(symptomsSet),
      comfortRatio: digestionEntries.length ? comfortableCount / digestionEntries.length : null,
      status: digestionStatus,
    },
    movement: { activeMin, status: movementStatus },
    measurements: {
      pulseAvg,
      latestPulse,
      weightAvg,
      weightDelta: weightAvg !== null ? Number((weightAvg - (store.userProfile?.initialWeight || weightAvg)).toFixed(1)) : null,
      tonus,
    },
  };
};
