export interface WaterContext {
  userName: string;
  userGender: 'male' | 'female';
  waterAmount: number;
  waterGoal: number;
  pulse: number | null;
  weightDelta: number | null; // Отрицательное = отвес
}

export const t = (gender: 'male' | 'female', m: string, f: string) => gender === 'male' ? m : f;

// Пока делаем заглушки для осей, полный словарь я дам следующим промптом
export const WATER_PHRASES = {
  waterCritical_Base: [(ctx: WaterContext) => `Мало воды. Выпито ${ctx.waterAmount} мл.`],
  waterCritical_HighPulse: [(ctx: WaterContext) => `Мало воды и высокий пульс.`],
  waterCritical_WeightGain: [(ctx: WaterContext) => `Мало воды и привес.`],
  waterProgress: [(ctx: WaterContext) => `Хороший темп, выпито ${ctx.waterAmount} мл.`],
  waterGoalReached_Base: [(ctx: WaterContext) => `Цель ${ctx.waterGoal} мл выполнена!`],
  waterGoalReached_WeightLoss: [(ctx: WaterContext) => `Цель выполнена и есть отвес!`]
};

export const getRandomPhrase = (category: keyof typeof WATER_PHRASES, ctx: WaterContext): string => {
  const phrases = WATER_PHRASES[category];
  if (!phrases || phrases.length === 0) return "";
  return phrases[Math.floor(Math.random() * phrases.length)](ctx);
};
