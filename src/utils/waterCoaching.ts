import { WaterContext, getRandomPhrase } from "./waterPhrases";

export const generateWaterSummary = (ctx: WaterContext): string => {
  if (ctx.waterAmount === 0) return "Сделай свой первый глоток воды сегодня, чтобы запустить метаболизм!";
  
  const percent = ctx.waterGoal > 0 ? (ctx.waterAmount / ctx.waterGoal) * 100 : 0;

  if (percent < 50) {
    if (ctx.pulse !== null && ctx.pulse > 75) return getRandomPhrase("waterCritical_HighPulse", ctx);
    if (ctx.weightDelta !== null && ctx.weightDelta >= 0) return getRandomPhrase("waterCritical_WeightGain", ctx);
    return getRandomPhrase("waterCritical_Base", ctx);
  }
  
  if (percent >= 50 && percent < 100) return getRandomPhrase("waterProgress", ctx);
  
  if (ctx.weightDelta !== null && ctx.weightDelta < 0) return getRandomPhrase("waterGoalReached_WeightLoss", ctx);
  return getRandomPhrase("waterGoalReached_Base", ctx);
};

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
