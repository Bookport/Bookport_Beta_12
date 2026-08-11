import {
  WaterContext,
  getRandomPhrase,
  base_zero,
  base_deficit_critical,
  base_behind,
  base_mild,
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

  // Нормализованный показатель: для текущего дня — время-скорректированный % (timePct),
  // для истории — абсолютный % от суточной нормы.
  const coachingPct = water.timePct ?? water.pct;
  const isToday = water.timePct !== null;

  const ctx: WaterContext = {
    userName: userName || "",
    userGender: userGender === "male" ? "male" : userGender === "female" ? "female" : undefined,
    waterStatus: water.status,
    pct: coachingPct,
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

  // Шкала коучинга для текущего дня (Time-adjusted Goal):
  //   zero → critical (0 < coachingPct < 50) → behind (50–69) → mild (70–99)
  //   → optimum (100–149) → excess (≥150).
  // Для истории — прежние абсолютные границы (0 / 50 / 100 / 150).
  let tier:
    | 'zero'
    | 'critical'
    | 'behind'
    | 'mild'
    | 'deficit'
    | 'optimum'
    | 'excess';
  if (water.amount === 0) {
    tier = 'zero';
  } else if (isToday) {
    tier = coachingPct >= 150 ? 'excess'
      : coachingPct >= 100 ? 'optimum'
      : coachingPct >= 70 ? 'mild'
      : coachingPct >= 50 ? 'behind'
      : 'critical';
  } else {
    tier = coachingPct >= 150 ? 'excess'
      : coachingPct >= 100 ? 'optimum'
      : coachingPct >= 50 ? 'deficit'
      : 'critical';
  }

  // Кросс-модульные блоки активны только при реальном дефиците к текущему часу.
  // Для текущего дня — только критический темп (< 50% от ожидаемого): при behind/mild
  // (50–69 / 70–99) работает только базовая ветка. Для истории — прежняя логика isLowWater.
  const showCross = isToday
    ? tier === 'critical'
    : tier === 'zero' || tier === 'deficit' || tier === 'critical';

  // ─────────────────────────────────────────────────────────────
  // БЛОК 1: БАЗА — шкала zero → critical → behind → mild → optimum → excess
  // ─────────────────────────────────────────────────────────────
  switch (tier) {
    case 'zero':
      push(base_zero);
      break;
    case 'critical':
      push(base_deficit_critical);
      break;
    case 'behind':
      push(base_behind);
      break;
    case 'mild':
      push(base_mild);
      break;
    case 'deficit':
      push(base_deficit);
      break;
    case 'optimum':
      push(base_optimum);
      break;
    case 'excess':
      push(base_excess);
      break;
  }

  // ─────────────────────────────────────────────────────────────
  // БЛОК 2: ВОДА + ЖКТ (Бристоль)
  // ─────────────────────────────────────────────────────────────
  if (showCross && digestion.status === "constipation") push(cross_digestion_constipation);
  if (showCross && digestion.status === "diarrhea") push(cross_digestion_diarrhea);
  if (tier === "optimum" && digestion.status === "ideal") push(cross_digestion_ideal);

  // ─────────────────────────────────────────────────────────────
  // БЛОК 3: ВОДА + ЗАМЕРЫ (Пульс, Давление, Тонус, Динамика веса)
  // ─────────────────────────────────────────────────────────────
  const pulse = latestMeasurements.pulse;
  const sys = latestMeasurements.systolic;
  const dia = latestMeasurements.diastolic;
  const weightDelta = latestMeasurements.weightDelta;
  const tonus = latestMeasurements.tonus;

  if (showCross && pulse !== null && pulse > 90) push(cross_measurements_highPulse);
  if (showCross && pulse !== null && pulse < 55) push(cross_measurements_lowPulse);
  if (showCross && ((sys !== null && sys >= 140) || (dia !== null && dia >= 90))) push(cross_measurements_highBP);
  if (showCross && ((sys !== null && sys < 90) || (dia !== null && dia < 60))) push(cross_measurements_lowBP);
  if (weightDelta !== null && weightDelta < 0) push(cross_measurements_weightLoss);
  if (showCross && weightDelta !== null && weightDelta >= 0.3) push(cross_measurements_weightGain);
  if (showCross && tonus === "low") push(cross_measurements_tonusLow);

  // ─────────────────────────────────────────────────────────────
  // БЛОК 4: ВОДА + ЕДА (вчерашняя клетчатка)
  // ─────────────────────────────────────────────────────────────
  const fiber = summary.food?.yesterdayFiber ?? null;
  if (fiber !== null && fiber >= HIGH_FIBER_THRESHOLD) {
    // Блок клетчатки — только при ненулевом объёме воды и заметном отставании от темпа;
    // при нулевом объёме работает только мягкая базовая ветка base_zero.
    if (showCross && water.amount > 0 && coachingPct < 60) push(cross_food_highFiber_deficit);
    else if (tier === "optimum") push(cross_food_highFiber_optimum);
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