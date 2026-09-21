export interface CalorieCalculationInput {
  gender?: string; // "male" | "female" | "m" | "f" | "мужской" | "женский"
  age?: number;
  height?: number; // в см
  weight?: number; // в кг (актуальный вес effWeight)
  activityMinutes?: number; // зафиксированные минуты движения
  healthGoals?: string[]; // массив целей пользователя ("Снизить вес", "Набрать вес" и т.д.)
  chronicConditions?: string[]; // массив хронических состояний (щитовидная железа и т.д.)
}

export interface CalorieGoalResult {
  bmr: number; // Базовый метаболизм
  tdee: number; // Суточный расход с учетом активности
  targetCalories: number; // Индивидуальная норма ккал
  targetProtein: number; // Норма белка (г)
  targetFat: number; // Норма жиров (г)
  targetCarbs: number; // Норма углеводов (г)
  targetFiber: number; // Норма клетчатки (г)
  goalType: "deficit" | "maintain" | "surplus";
  goalLabel: string; // "Бережное снижение" | "Поддержание" | "Набор массы"
}

export function calculateDailyCalorieGoal(input: CalorieCalculationInput): CalorieGoalResult {
  const gender = (input.gender || "female").toLowerCase();
  const isMale = gender.includes("m") || gender.includes("муж");

  // Безопасные фолбэки при неполном профиле
  const weight = input.weight && input.weight > 30 ? input.weight : 70;
  const height = input.height && input.height > 100 ? input.height : 170;
  const age = input.age && input.age > 10 ? input.age : 35;

  // 1. Формула Миффлина — Сан-Жеора (BMR)
  let bmr = 10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161);

  // Клинический предохранитель: заболевания щитовидной железы
  const conditions = input.chronicConditions || [];
  const hasThyroid = conditions.some((c) =>
    c.toLowerCase().includes("щитовид")
  );
  if (hasThyroid) {
    bmr *= 0.95; // мягкая поправка на сниженный метаболизм
  }

  // 2. Коэффициент физической активности (PAL) по фактически зафиксированному движению — динамический с 1-й минуты
  const actMin = Math.max(0, input.activityMinutes || 0);
  // Базовый сидячий минимум 1.20, каждые 30 мин умеренной активности добавляют ~0.15 к коэффициенту
  const pal = Math.min(1.75, Number((1.20 + (actMin / 30) * 0.15).toFixed(3)));
  const tdee = Math.round(bmr * pal);

  // 3. Коррекция под вектор целей (healthGoals)
  const goals = input.healthGoals || [];
  const wantsWeightLoss = goals.some((g) => {
    const s = g.toLowerCase();
    return s.includes("снизить вес") || s.includes("похудеть") || s.includes("сброс");
  });
  const wantsWeightGain = goals.some((g) => {
    const s = g.toLowerCase();
    return s.includes("набрать") || s.includes("масс");
  });

  let targetCalories = tdee;
  let goalType: "deficit" | "maintain" | "surplus" = "maintain";
  let goalLabel = "Поддержание";

  if (wantsWeightLoss) {
    targetCalories = Math.round(tdee * 0.85); // мягкий WFPB-дефицит 15%
    goalType = "deficit";
    goalLabel = "Бережное снижение";
  } else if (wantsWeightGain) {
    targetCalories = Math.round(tdee * 1.15); // физиологический профицит 15%
    goalType = "surplus";
    goalLabel = "Набор массы";
  }

  // Абсолютный физиологический минимум (предохранитель от голодания)
  const safeFloor = isMale ? 1500 : 1200;
  if (targetCalories < safeFloor) {
    targetCalories = safeFloor;
  }

  // 4. WFPB-таргеты макронутриентов под рассчитанный калораж:
  // Белки: 1.0-1.1 г на кг веса
  const targetProtein = Math.round(Math.max(60, weight * 1.05));
  // Жиры: ~20% калорийности для WFPB (1 г жира = 9 ккал)
  const targetFat = Math.round((targetCalories * 0.2) / 9);
  // Клетчатка: физиологический ориентир WFPB (от 30 г)
  const targetFiber = Math.round(Math.max(30, (targetCalories / 1000) * 16));
  // Углеводы: остаток калоража (1 г углеводов = 4 ккал)
  const carbCalories = targetCalories - (targetProtein * 4 + targetFat * 9);
  const targetCarbs = Math.round(Math.max(150, carbCalories / 4));

  return {
    bmr: Math.round(bmr),
    tdee,
    targetCalories,
    targetProtein,
    targetFat,
    targetCarbs,
    targetFiber,
    goalType,
    goalLabel,
  };
}
