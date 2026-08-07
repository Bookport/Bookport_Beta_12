export interface MovementContext {
  userName: string;
  userGender: 'male' | 'female';
  activeMinutes: number;
  dailyGoal: number; // Обычно 30
  pulse: number | null;
  weightDelta: number | null; // Отрицательное = отвес
}

export const t = (gender: 'male' | 'female', m: string, f: string) => gender === 'male' ? m : f;

// Пока делаем заглушки для осей, полный словарь я дам следующим промптом
export const MOVEMENT_PHRASES = {
  movementCritical_Base: [(ctx: MovementContext) => `Мало движения. Всего ${ctx.activeMinutes} мин.`],
  movementCritical_HighPulse: [(ctx: MovementContext) => `Мало движения и высокий пульс.`],
  movementCritical_WeightGain: [(ctx: MovementContext) => `Мало движения и привес.`],
  movementProgress: [(ctx: MovementContext) => `Хороший темп, ${ctx.activeMinutes} мин.`],
  movementGoalReached_Base: [(ctx: MovementContext) => `Цель ${ctx.dailyGoal} мин выполнена!`],
  movementGoalReached_WeightLoss: [(ctx: MovementContext) => `Цель выполнена и есть отвес!`]
};

export const getRandomPhrase = (category: keyof typeof MOVEMENT_PHRASES, ctx: MovementContext): string => {
  const phrases = MOVEMENT_PHRASES[category];
  if (!phrases || phrases.length === 0) return "";
  return phrases[Math.floor(Math.random() * phrases.length)](ctx);
};
