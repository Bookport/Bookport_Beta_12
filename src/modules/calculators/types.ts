/**
 * Публичный тип профиля калькуляторов.
 *
 * Все поля опциональны: приложение-хост может не знать часть значений
 * (например `activity` отсутствует в модели Bookport). Форма калькулятора
 * сама сообщает, каких полей не хватает для расчёта.
 */

export type Gender = "male" | "female";

/** Множитель уровня активности (Mifflin-St Jeor). */
export type ActivityLevel = 1.2 | 1.375 | 1.55 | 1.725 | 1.9;

export type CalorieGoal = "loss" | "maintain" | "gain";

export type CalculatorProfile = {
  gender?: Gender;
  ageYears?: number;
  heightCm?: number;
  weightKg?: number;
  activity?: ActivityLevel;
  goal?: CalorieGoal;
  waistCm?: number;
  hipsCm?: number;
  neckCm?: number;
  restingHeartRateBpm?: number;
  /** Давление приходит из настроек приложения; ни один расчёт его не требует. */
  systolicMmHg?: number;
  diastolicMmHg?: number;
};

/** Поля, без которых не работает ни один расчёт энергии. */
export const requiredProfileFields = ["gender", "ageYears", "heightCm", "weightKg"] as const satisfies readonly (keyof CalculatorProfile)[];

export type RequiredProfileField = (typeof requiredProfileFields)[number];

export const activityOptions: Array<{ value: ActivityLevel; label: string }> = [
  { value: 1.2, label: "Сидячий образ жизни" },
  { value: 1.375, label: "Лёгкая активность" },
  { value: 1.55, label: "Средняя активность" },
  { value: 1.725, label: "Высокая активность" },
  { value: 1.9, label: "Экстремальная активность" },
];

export const goalOptions: Array<{ value: CalorieGoal; label: string }> = [
  { value: "loss", label: "Снижение веса" },
  { value: "maintain", label: "Поддержание" },
  { value: "gain", label: "Набор" },
];
