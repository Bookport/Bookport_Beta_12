export interface IntegralScoreInput {
  waterMl: number;
  waterTarget: number;
  sleepMinutes: number;
  sleepTarget?: number;
  mealCount: number;
  mealsTarget?: number;
  habitsDone: number;
  habitsTarget?: number;
  activityMinutes: number;
  activityTarget?: number;
  ratingEnergy: number;
  ratingWellbeing: number;
  ratingLightness: number;
}

const DEFAULTS = {
  sleepTarget: 480,
  mealsTarget: 4,
  habitsTarget: 20,
  activityTarget: 30,
} as const;

export function calculateIntegralScore(input: IntegralScoreInput): number {
  const sleepTarget = input.sleepTarget ?? DEFAULTS.sleepTarget;
  const mealsTarget = input.mealsTarget ?? DEFAULTS.mealsTarget;
  const habitsTarget = input.habitsTarget ?? DEFAULTS.habitsTarget;
  const activityTarget = input.activityTarget ?? DEFAULTS.activityTarget;

  const waterPct = Math.min(100, Math.round((input.waterMl / input.waterTarget) * 100));
  const sleepPct = Math.min(100, Math.round((input.sleepMinutes / sleepTarget) * 100));
  const mealsPct = Math.min(100, Math.round((input.mealCount / mealsTarget) * 100));
  const habitsPct = Math.min(100, Math.round((input.habitsDone / habitsTarget) * 100));

  const activityPercent = Math.min(100, Math.round((input.activityMinutes / activityTarget) * 100));
  const subjectiveEnergyPercent = input.ratingEnergy * 20;
  const energyPct = Math.min(100, Math.round((activityPercent + subjectiveEnergyPercent) / 2));

  const zenPct = input.ratingWellbeing * 20;
  const lightnessPct = input.ratingLightness * 20;

  return Math.min(
    100,
    Math.round(
      (waterPct * 0.2) +
      (sleepPct * 0.2) +
      (mealsPct * 0.2) +
      (habitsPct * 0.15) +
      (zenPct * 0.1) +
      (energyPct * 0.1) +
      (lightnessPct * 0.05)
    )
  );
}
