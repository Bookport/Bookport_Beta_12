import {
  WaterContext,
  getRandomPhrase,
  base_zero,
  base_deficit_critical,
  base_deficit,
  base_optimum,
  base_excess,
  cross_digestion_constipation,
  cross_digestion_diarrhea,
  cross_digestion_ideal,
  cross_measurements_highPulse,
  cross_measurements_lowPulse,
  cross_measurements_highBP,
  cross_measurements_lowBP,
  cross_measurements_weightLoss,
  cross_measurements_weightGain,
  cross_measurements_tonusLow,
  cross_food_highFiber_deficit,
  cross_food_highFiber_optimum,
} from "./waterPhrases";
import { DailySummary } from "./crossModuleSummary";
import { getWaterGoal } from "./waterGoal";

const HIGH_FIBER_THRESHOLD = 25; // г — порог «богатого клетчаткой» вчерашнего рациона

export const getWaterFeedback = (
  summary: DailySummary,
  userName?: string,
  userGender?: string
): string => {
  const messageParts: string[] = [];
  const water = summary.water;
  const digestion = summary.digestion;
  const latestMeasurements = summary.latestMeasurements;

  const ctx: WaterContext = {
    userName: userName || "",
    userGender: userGender === "male" ? "male" : userGender === "female" ? "female" : undefined,
    waterStatus: water.status,
    pct: water.pct,
    amount: water.amount,
    latestBristol: digestion.latestBristol,
    yesterdayFiber: summary.food?.yesterdayFiber ?? 0,
    latestMeasurements: {
      pulseAvg: latestMeasurements.pulse,
      systolic: latestMeasurements.systolic,
      diastolic: latestMeasurements.diastolic,
      weightAvg: latestMeasurements.weight,
      weightDelta: latestMeasurements.weightDelta,
      tonus: latestMeasurements.tonus,
    },
  };

  // Аддитивный помощник: пушит блок только если словарь вернул текст
  const push = (phrases: string[]) => {
    const text = getRandomPhrase(phrases, ctx);
    if (text) messageParts.push(text);
  };

  const status = water.status;
  const percent = water.pct;
  const isLowWater = status === "zero" || status === "deficit";

  // ─────────────────────────────────────────────────────────────
  // БЛОК 1: БАЗА — оценка объёма (Zero / Deficit / Optimum / Excess)
  // ─────────────────────────────────────────────────────────────
  if (status === "zero") {
    push(base_zero);
  } else if (status === "excess") {
    push(base_excess);
  } else if (status === "optimum") {
    push(base_optimum);
  } else {
    // deficit — градация по глубине недобора
    if (percent < 50) push(base_deficit_critical);
    else push(base_deficit);
  }

  // ─────────────────────────────────────────────────────────────
  // БЛОК 2: ВОДА + ЖКТ (Бристоль)
  // ─────────────────────────────────────────────────────────────
  if (isLowWater && digestion.status === "constipation") push(cross_digestion_constipation);
  if (isLowWater && digestion.status === "diarrhea") push(cross_digestion_diarrhea);
  if (status === "optimum" && digestion.status === "ideal") push(cross_digestion_ideal);

  // ─────────────────────────────────────────────────────────────
  // БЛОК 3: ВОДА + ЗАМЕРЫ (Пульс, Давление, Тонус, Динамика веса)
  // ─────────────────────────────────────────────────────────────
  const pulse = latestMeasurements.pulse;
  const sys = latestMeasurements.systolic;
  const dia = latestMeasurements.diastolic;
  const weightDelta = latestMeasurements.weightDelta;
  const tonus = latestMeasurements.tonus;

  if (isLowWater && pulse !== null && pulse > 90) push(cross_measurements_highPulse);
  if (isLowWater && pulse !== null && pulse < 55) push(cross_measurements_lowPulse);
  if (isLowWater && ((sys !== null && sys >= 140) || (dia !== null && dia >= 90))) push(cross_measurements_highBP);
  if (isLowWater && ((sys !== null && sys < 90) || (dia !== null && dia < 60))) push(cross_measurements_lowBP);
  if (weightDelta !== null && weightDelta < 0) push(cross_measurements_weightLoss);
  if (isLowWater && weightDelta !== null && weightDelta >= 0.3) push(cross_measurements_weightGain);
  if (isLowWater && tonus === "low") push(cross_measurements_tonusLow);

  // ─────────────────────────────────────────────────────────────
  // БЛОК 4: ВОДА + ЕДА (вчерашняя клетчатка)
  // ─────────────────────────────────────────────────────────────
  const fiber = summary.food?.yesterdayFiber ?? null;
  if (fiber !== null && fiber >= HIGH_FIBER_THRESHOLD) {
    if (isLowWater) push(cross_food_highFiber_deficit);
    else if (status === "optimum") push(cross_food_highFiber_optimum);
  }

  // ─────────────────────────────────────────────────────────────
  // ВОЗВРАТ
  // ─────────────────────────────────────────────────────────────
  if (messageParts.length === 0) {
    return `${userName ? userName + ", " : ""}зафиксируй приём воды, чтобы Анна могла проанализировать твой гидробаланс.`;
  }
  return messageParts.filter(Boolean).join("\n\n");
};

// Утилита для серверной AI-инъекции (server.ts) — формирует сводку воды без привязки к UI
export function getWaterContext(params: any): any {
  const entries = params.waterEntries || [];
  const drankToday = entries.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  const goal = getWaterGoal(params.weight);
  return {
    drank_today_ml: drankToday,
    daily_goal_ml: goal,
    last_drink_time: entries.length > 0 ? entries[entries.length - 1].time : null,
    text: ""
  };
}