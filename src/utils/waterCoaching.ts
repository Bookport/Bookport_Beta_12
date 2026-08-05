export interface WaterCoachingParams {
  userName: string;
  userGender: "female" | "male";
  waterEntries: Array<{ amount: number; time?: string; timestamp?: number }>;
  weight: number;
}

interface WaterCoachingResult {
  status: string;
  label: string;
  drank_today_ml: number;
  daily_goal_ml: number;
  last_drink_time: string | null;
  text: string;
}

export function getWaterContext(params: WaterCoachingParams): WaterCoachingResult {
  const { userName, userGender, waterEntries, weight } = params;
  const entries = Array.isArray(waterEntries) ? waterEntries : [];
  const drankToday = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const dailyGoal = Math.round((weight || 65) * 30);
  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;
  const lastDrinkTime = lastEntry?.time || null;

  const genderEnd = userGender === "male" ? "" : "а";
  const rule = "ОБЯЗАТЕЛЬНОЕ ПРАВИЛО: Все цифры объема переводи в текст прописью. Вместо '1150 мл' пиши 'один литр сто пятьдесят миллилитров'. Запрещено озвучивать числа в формате 'мл' или 'л'.";

  const text = `[Системные данные о Воде пользователя на сегодня:
- Выпито сегодня: ${drankToday} мл
- Дневная норма: ${dailyGoal} мл
- Последний приём: ${lastDrinkTime || "нет записей"}
Используй эти данные, когда пользователь спрашивает о воде, водном балансе, норме гидратации или жажде.
${rule}]`;

  if (drankToday >= dailyGoal) {
    return {
      status: "excellent",
      label: "Норма выполнена!",
      drank_today_ml: drankToday,
      daily_goal_ml: dailyGoal,
      last_drink_time: lastDrinkTime,
      text: `Отлично, ${userName}! Ты закрыл${genderEnd} дневную норму воды. ${text}`,
    };
  }

  if (drankToday === 0) {
    return {
      status: "motivate",
      label: "Готовы начать?",
      drank_today_ml: 0,
      daily_goal_ml: dailyGoal,
      last_drink_time: null,
      text: `Привет, ${userName}! Сегодня ещё не было записей о воде. ${text}`,
    };
  }

  return {
    status: "progressing",
    label: "Есть прогресс!",
    drank_today_ml: drankToday,
    daily_goal_ml: dailyGoal,
    last_drink_time: lastDrinkTime,
    text: `Хороший темп, ${userName}! ${text}`,
  };
}
