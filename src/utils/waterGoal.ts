// Единый источник истины для расчёта нормы воды (30 мл на 1 кг веса).
// Используется в: crossModuleSummary.ts, WaterDetailsScreen.tsx, MyDayScreen.tsx,
// digestionCoaching.ts, waterCoaching.ts (getWaterContext), StateNowScreen.tsx.
export const WATER_ML_PER_KG = 30;
export const WATER_GOAL_FALLBACK_KG = 65;

export const getWaterGoal = (weight: number | null | undefined): number => {
  const kg = weight && weight > 0 ? weight : WATER_GOAL_FALLBACK_KG;
  return Math.round(kg * WATER_ML_PER_KG);
};