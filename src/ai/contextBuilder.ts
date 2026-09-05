export interface UserState {
  userName: string;
  waterIntakeMl?: number;
  waterTargetMl?: number;
  sleepHours?: number;
  stepsCount?: number;
  lastWeightKg?: number;
  currentGoal?: 'weight_loss' | 'maintenance' | 'health';
}

/**
 * Формирует сжатый контекст о пользователе для системного промпта Анны.
 * Передается в LLM только при наличии данных, экономя токены.
 */
export function buildUserContext(state: UserState): string {
  const lines: string[] = [];

  lines.push(`Имя пользователя: ${state.userName}`);

  if (state.currentGoal) {
    const goals = { 
      weight_loss: 'Снижение веса за счет внутриклеточного жира', 
      maintenance: 'Поддержание формы и уровня энергии', 
      health: 'Восстановление ЖКТ и нутритивного баланса' 
    };
    lines.push(`Цель: ${goals[state.currentGoal]}`);
  }

  if (state.waterIntakeMl !== undefined && state.waterTargetMl !== undefined) {
    const progress = Math.round((state.waterIntakeMl / state.waterTargetMl) * 100);
    lines.push(`Вода за сегодня: ${state.waterIntakeMl} мл из ${state.waterTargetMl} мл (${progress}%)`);
  }

  if (state.sleepHours !== undefined) {
    lines.push(`Сон прошлой ночью: ${state.sleepHours} ч.`);
  }

  if (state.stepsCount !== undefined) {
    lines.push(`Активность (шаги): ${state.stepsCount}`);
  }

  if (state.lastWeightKg !== undefined) {
    lines.push(`Текущий вес: ${state.lastWeightKg} кг`);
  }

  // Если кроме имени ничего нет, отдаем заглушку
  if (lines.length === 1) {
    return `[ДАННЫЕ ПОЛЬЗОВАТЕЛЯ]: Пользователь ${state.userName} (метрики за сегодня не заполнены).`;
  }

  return `[ФИЗИОЛОГИЧЕСКИЙ СЛЕПОК ЗА 24 ЧАСА]:\n${lines.join('\n')}\n*Инструкция: используй эти данные нативно. Если человек спал 4 часа, учитывай это при обсуждении тяги к сладкому или энергии.*`;
}