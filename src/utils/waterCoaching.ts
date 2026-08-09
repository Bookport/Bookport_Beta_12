import { WaterContext, getRandomPhrase } from "./waterPhrases";
import { DailySummary } from "./crossModuleSummary";

export const getWaterFeedback = (
  summary: DailySummary,
  userName?: string,
  userGender?: string
): string => {
  const water = summary.water;
  const ctx: WaterContext = {
    userName,
    userGender: userGender as 'male' | 'female',
    summary,
    waterAmount: water.amount,
    waterGoal: water.goal,
    pulse: summary.measurements.latestPulse,
    weightDelta: summary.measurements.weightDelta,
  };

  // ============ КРОСС-ТРИГГЕРЫ ============
  // 1. Дефицит воды + запор в ЖКТ -> тревога: вода спровоцировала остановку ЖКТ
  if (water.status === "deficit" && summary.digestion.status === "constipation") {
    return getRandomPhrase("waterDeficitConstipation", ctx);
  }

  // 2. Норма воды выполнена, но тонус низкий -> вода не заменит сон и углеводы
  if (water.status === "normal" && summary.measurements.tonus === "low") {
    return getRandomPhrase("waterOKTonusLow", ctx);
  }

  // 3. Водная баланс в норме + ЖКТ идеален -> похвала идеальной гидратации
  if (water.status === "normal" && summary.digestion.status === "ideal") {
    return getRandomPhrase("waterNormalDigestionIdeal", ctx);
  }

  // Нет данных о воде (проверяется после кросс-триггеров: «запор + 0 выпитой воды» — это связка,
  // а не просто предложение сделать первый глоток)
  if (water.amount === 0) {
    return "Сделай свой первый глоток воды сегодня, чтобы запустить метаболизм!";
  }

  // ============ СТАНДАРТНЫЕ ВЕТКИ ============
  const percent = water.pct;

  if (percent < 50) {
    if (ctx.pulse !== null && ctx.pulse > 75) return getRandomPhrase("waterCritical_HighPulse", ctx);
    if (ctx.weightDelta !== null && ctx.weightDelta >= 0) return getRandomPhrase("waterCritical_WeightGain", ctx);
    return getRandomPhrase("waterCritical_Base", ctx);
  }

  if (percent >= 50 && percent < 100) return getRandomPhrase("waterProgress", ctx);

  if (ctx.weightDelta !== null && ctx.weightDelta < 0) return getRandomPhrase("waterGoalReached_WeightLoss", ctx);
  return getRandomPhrase("waterGoalReached_Base", ctx);
};

// Утилита для серверной AI-инъекции (server.ts) — формирует сводку воды без привязки к UI
export function getWaterContext(params: any): any {
  const entries = params.waterEntries || [];
  const drankToday = entries.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
  const goal = (params.weight || 70) * 30;
  return {
    drank_today_ml: drankToday,
    daily_goal_ml: goal,
    last_drink_time: entries.length > 0 ? entries[entries.length - 1].time : null,
    text: ""
  };
}
