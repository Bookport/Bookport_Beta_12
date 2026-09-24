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

  // Нормализованный показатель: для текущего дня — время-скорректированный % (timePct),
  // для истории — абсолютный % от суточной нормы.
  const coachingPct = water.timePct ?? water.pct;
  const isToday = water.timePct !== null;

  // Для комментария используем только замеры выбранного дня — и сегодня, и в истории.
  // Глобальный последний замер может относиться к другой дате.
  const measurements = {
    pulseAvg: summary.measurements.latestPulse ?? summary.measurements.pulseAvg,
    systolic: summary.measurements.systolic,
    diastolic: summary.measurements.diastolic,
    weightAvg: summary.measurements.weightAvg,
    weightDelta: summary.measurements.weightDelta,
    tonus: summary.measurements.tonus,
  };

  const ctx: WaterContext = {
    dayIndex: summary.dayIndex,
    isToday,
    goal: water.goal,
    dailyPct: water.pct,
    expectedGoalOnNow: water.expectedGoalOnNow,
    userName: userName || "",
    userGender: userGender === "male" ? "male" : userGender === "female" ? "female" : undefined,
    waterStatus: water.status,
    pct: coachingPct,
    amount: water.amount,
    latestBristol: digestion.latestBristol,
    yesterdayFiber: summary.food?.yesterdayFiber ?? 0,
    latestMeasurements: measurements,
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
    tier = (coachingPct >= 150 && water.pct >= 50) ? 'excess'
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

  // Ноль всегда получает только базовую фразу. При ненулевом объёме расширенный
  // кросс-контекст доступен сегодня для critical, в истории — для deficit/critical.
  // Позитивные ветки optimum и наблюдение снижения веса остаются исключениями.
  const showCross = isToday
    ? tier === 'critical'
    : tier === 'deficit' || tier === 'critical';

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
  // БЛОК 2: КРОСС-МОДУЛЬНЫЕ ФРАЗЫ (ЖКТ, Замеры, Клетчатка, Вес)
  // Кандидаты собираются в порядке приоритета: самочувствие → активный ЖКТ →
  // клетчатка → наблюдение веса → нейтральный позитивный ЖКТ. Push только первого.
  // ─────────────────────────────────────────────────────────────
  const pulse = measurements.pulseAvg;
  const sys = measurements.systolic;
  const dia = measurements.diastolic;
  const weightDelta = measurements.weightDelta;
  const tonus = measurements.tonus;

  const crossCandidates: string[][] = [];

  // 1. Самочувствие: пульс, давление, тонус
  if (showCross && pulse !== null && pulse > 90) crossCandidates.push(cross_measurements_highPulse);
  if (showCross && pulse !== null && pulse < 55) crossCandidates.push(cross_measurements_lowPulse);
  if (showCross && ((sys !== null && sys >= 140) || (dia !== null && dia >= 90))) crossCandidates.push(cross_measurements_highBP);
  if (showCross && ((sys !== null && sys < 90) || (dia !== null && dia < 60))) crossCandidates.push(cross_measurements_lowBP);
  if (showCross && tonus === "low") crossCandidates.push(cross_measurements_tonusLow);

  // 2. ЖКТ с активным контекстом
  if (showCross && digestion.status === "diarrhea") crossCandidates.push(cross_digestion_diarrhea);
  if (showCross && digestion.status === "constipation") crossCandidates.push(cross_digestion_constipation);

  // 3. Клетчатка (вчерашняя): при ненулевом объёме воды и заметном отставании от темпа;
  // при нулевом объёме работает только мягкая базовая ветка base_zero.
  const fiber = summary.food?.yesterdayFiber ?? null;
  if (fiber !== null && fiber >= HIGH_FIBER_THRESHOLD) {
    if (showCross && water.amount > 0 && coachingPct < 60) crossCandidates.push(cross_food_highFiber_deficit);
    else if (tier === "optimum") crossCandidates.push(cross_food_highFiber_optimum);
  }

  // 4. Наблюдение веса: нулевой объём воды не сопровождаем кросс-блоком.
  if (tier !== 'zero' && weightDelta !== null && weightDelta < 0) crossCandidates.push(cross_measurements_weightLoss);
  if (showCross && weightDelta !== null && weightDelta >= 0.3) crossCandidates.push(cross_measurements_weightGain);

  // 5. Нейтральный позитивный ЖКТ-контекст
  if (tier === "optimum" && digestion.status === "ideal") crossCandidates.push(cross_digestion_ideal);

  if (crossCandidates.length > 0) push(crossCandidates[0]);

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
