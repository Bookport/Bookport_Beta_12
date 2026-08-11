// Единый источник истины для расчёта нормы воды (30 мл на 1 кг веса).
// Используется в: crossModuleSummary.ts, WaterDetailsScreen.tsx, MyDayScreen.tsx,
// digestionCoaching.ts, waterCoaching.ts (getWaterContext), StateNowScreen.tsx.
export const WATER_ML_PER_KG = 30;
export const WATER_GOAL_FALLBACK_KG = 65;

// Активное окно гидратации: норма распределяется на 14 часов с 08:00 до 22:00.
// Используется в crossModuleSummary.ts для Time-adjusted Goal (оценка статуса для Анны
// по ожидаемой норме к текущему часу, а не по полной суточной норме).
export const WATER_ACTIVE_START_MIN = 8 * 60;       // 08:00
export const WATER_ACTIVE_WINDOW_MIN = 14 * 60;     // 840 минут (14 часов)

export const getWaterGoal = (weight: number | null | undefined): number => {
  const kg = weight && weight > 0 ? weight : WATER_GOAL_FALLBACK_KG;
  return Math.round(kg * WATER_ML_PER_KG);
};