/* Чистые детерминированные формулы: явные единицы, никаких побочных эффектов и обращений к UI. */

import type { ActivityLevel, CalorieGoal, CalculatorProfile, Gender } from "../types";

/** Личные данные, которые запрашивает большинство формул. */
export type BodyInputs = {
  gender: Gender;
  age: number;
  weight: number;
  height: number;
};

/** Расчёт энергии: те же данные плюс выбранный уровень активности. */
export type EnergyInputs = BodyInputs & { activity: ActivityLevel };

export type BmiResult = {
  value: number;
  category: "Дефицит" | "Норма" | "Предожирение" | "Ожирение";
};

export type CalorieGoalResult = { goalCalories: number; lower: number; upper: number };

/** Mifflin-St Jeor. */
export function calculateBmr({ gender, age, weight, height }: BodyInputs): number {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === "male" ? base + 5 : base - 161);
}

export function calculateTdee({ gender, age, weight, height, activity }: EnergyInputs): number {
  return Math.round(calculateBmr({ gender, age, weight, height }) * activity);
}

/**
 * Сборка личных данных из профиля. Вместо вымышленных значений по умолчанию
 * возвращает `null` — экран честно сообщает, каких полей не хватает.
 */
export function bodyInputsFrom(profile: CalculatorProfile): BodyInputs | null {
  const { gender, ageYears: age, weightKg: weight, heightCm: height } = profile;
  if (gender === undefined || age === undefined || weight === undefined || height === undefined) return null;
  if (![age, weight, height].every(isPositiveFinite)) return null;
  return { gender, age, weight, height };
}

export function withActivity(inputs: BodyInputs | null, activity: ActivityLevel | undefined): EnergyInputs | null {
  if (inputs === null || activity === undefined) return null;
  return { ...inputs, activity };
}

export function calculateBmi(weight: number, height: number): BmiResult | null {
  if (!isPositiveFinite(weight) || !isPositiveFinite(height)) return null;
  const value = weight / (height / 100) ** 2;
  const rounded = round(value, 1);
  const category = value < 18.5 ? "Дефицит" : value < 25 ? "Норма" : value < 30 ? "Предожирение" : "Ожирение";
  return { value: rounded, category };
}

/** При снижении не даём уйти ниже базового обмена. */
export function calculateCalorieGoal(inputs: EnergyInputs, goal: CalorieGoal): CalorieGoalResult {
  const tdee = calculateTdee(inputs);
  const rawTarget = goal === "loss" ? Math.max(tdee - 500, calculateBmr(inputs)) : goal === "gain" ? tdee + 300 : tdee;
  const goalCalories = Math.round(rawTarget);
  return { goalCalories, lower: goalCalories - 50, upper: goalCalories + 50 };
}
/** Горизонт планирования: свыше 5 лет срок перестаёт быть осмысленным ориентиром. */
export const MAX_TIMELINE_WEEKS = 260;

export type WeightTimelineResult = { weeks: number; completionDate: Date; distanceKg: number; capped: boolean };

export function calculateWeightTimeline(weight: number, targetWeight: number, ratePerWeekKg: number, from = new Date()): WeightTimelineResult | null {
  if (![weight, targetWeight, ratePerWeekKg].every(isPositiveFinite)) return null;
  const distanceKg = Math.abs(weight - targetWeight);
  const exactWeeks = distanceKg / ratePerWeekKg;
  const capped = exactWeeks > MAX_TIMELINE_WEEKS;
  const weeks = Math.min(MAX_TIMELINE_WEEKS, Math.round(exactWeeks));
  const completionDate = new Date(from);
  completionDate.setDate(completionDate.getDate() + weeks * 7);
  return { weeks, completionDate, distanceKg: round(distanceKg, 1), capped };
}

export type MacroSplit = { protein: number; fat: number; carbs: number };

export type MacroPresetId = "balanced" | "lowCarb" | "highProtein" | "food-matters-therapeutic" | "food-matters-preventive";

export const macroSplits: Record<MacroPresetId, { label: string; percentages: MacroSplit }> = {
  balanced: { label: "Сбалансированная", percentages: { protein: 30, fat: 30, carbs: 40 } },
  lowCarb: { label: "Низкоуглеводная", percentages: { protein: 40, fat: 40, carbs: 20 } },
  highProtein: { label: "Высокобелковая", percentages: { protein: 35, fat: 25, carbs: 40 } },
  "food-matters-therapeutic": { label: "Всё дело в еде! Терапевтическая", percentages: { protein: 10, fat: 10, carbs: 80 } },
  "food-matters-preventive": { label: "Всё дело в еде! Профилактическая", percentages: { protein: 15, fat: 20, carbs: 65 } },
};

/** Ккал на грамм: белки 4, жиры 9, углеводы 4. */
export function calculateMacroGrams(targetKcal: number, split: MacroSplit): MacroSplit {
  return {
    protein: Math.round((targetKcal * (split.protein / 100)) / 4),
    fat: Math.round((targetKcal * (split.fat / 100)) / 9),
    carbs: Math.round((targetKcal * (split.carbs / 100)) / 4),
  };
}

export type ProteinGoal = CalorieGoal;

export function calculateProteinRange(weight: number, goal: ProteinGoal, activity: number): { min: number; max: number } | null {
  if (!isPositiveFinite(weight) || !isPositiveFinite(activity)) return null;
  const isHighActivity = activity >= 1.55;
  const [low, high] = goal === "loss" ? [1.8, 2.2] : goal === "gain" ? [1.6, 2.0] : isHighActivity ? [1.2, 1.6] : [0.8, 1.2];
  return { min: Math.round(weight * low), max: Math.round(weight * high) };
}

export type MealPlan = "three" | "threePlusSnack";

export const mealPlans: Record<MealPlan, Array<{ label: string; percentage: number }>> = {
  three: [{ label: "Завтрак", percentage: 30 }, { label: "Обед", percentage: 40 }, { label: "Ужин", percentage: 30 }],
  threePlusSnack: [{ label: "Завтрак", percentage: 25 }, { label: "Обед", percentage: 35 }, { label: "Ужин", percentage: 25 }, { label: "Перекус", percentage: 15 }],
};

export function distributeMacros(macros: MacroSplit, plan: MealPlan): Array<MacroSplit & { label: string; percentage: number }> {
  return mealPlans[plan].map(({ label, percentage }) => ({
    label,
    percentage,
    protein: Math.round((macros.protein * percentage) / 100),
    fat: Math.round((macros.fat * percentage) / 100),
    carbs: Math.round((macros.carbs * percentage) / 100),
  }));
}

export type IdealWeightRange = { reference: number; min: number; max: number; formulaLabel: string };

/** Формула Devine: применима к взрослым, от 18 лет — возрастной фильтр остаётся за UI. */
export function calculateIdealWeightRange(gender: Gender, heightCm: number): IdealWeightRange | null {
  if (!isPositiveFinite(heightCm)) return null;
  const inchesOverFiveFeet = heightCm / 2.54 - 60;
  const reference = (gender === "male" ? 50 : 45.5) + 2.3 * inchesOverFiveFeet;
  if (reference <= 0) return null;
  return {
    reference: round(reference, 1),
    min: round(reference * 0.9, 1),
    max: round(reference * 1.1, 1),
    formulaLabel: "Devine: базовый вес + 2,3 кг за каждый дюйм выше 152,4 см",
  };
}

export type RatioStatus = { value: number; status: string; interpretation: string };

export function calculateWaistToHeight(waistCm: number, heightCm: number): RatioStatus | null {
  if (!isPositiveFinite(waistCm) || !isPositiveFinite(heightCm)) return null;
  const value = waistCm / heightCm;
  const rounded = round(value, 2);
  if (value < 0.4) return { value: rounded, status: "Ниже обычного диапазона", interpretation: "Показатель ниже ориентировочного диапазона; учитывайте контекст измерения." };
  if (value < 0.5) return { value: rounded, status: "Ориентир", interpretation: "Соотношение ниже порога 0,5 — используйте его для наблюдения за динамикой." };
  if (value < 0.6) return { value: rounded, status: "Повышенный ориентир", interpretation: "Показатель выше порога 0,5; полезно отслеживать изменение обхвата во времени." };
  return { value: rounded, status: "Высокий ориентир", interpretation: "Показатель выше 0,6; это справочный сигнал для обсуждения образа жизни со специалистом при необходимости." };
}

export function calculateWaistToHip(waistCm: number, hipsCm: number, gender: Gender): RatioStatus | null {
  if (!isPositiveFinite(waistCm) || !isPositiveFinite(hipsCm)) return null;
  const value = waistCm / hipsCm;
  const threshold = gender === "male" ? 0.9 : 0.85;
  const below = value < threshold;
  return {
    value: round(value, 2),
    status: below ? "Ниже порога" : "Выше порога",
    interpretation: below
      ? `Ниже справочного порога ${threshold.toFixed(2)} для выбранного пола.`
      : `Выше справочного порога ${threshold.toFixed(2)} для выбранного пола; оценивайте только динамику замеров.`,
  };
}

/** Метод US Navy за пределами правдоподобия не показываем: физиологический диапазон 3–70 %. */
export const BODY_FAT_RANGE = { min: 3, max: 70 } as const;

export type BodyFatResult = { percentage: number; category: string; formulaLabel: string };

export function calculateUSNavyBodyFat(gender: Gender, heightCm: number, waistCm: number, neckCm: number, hipsCm?: number): BodyFatResult | null {
  if (![heightCm, waistCm, neckCm].every(isPositiveFinite)) return null;
  if (gender === "male" && waistCm <= neckCm) return null;
  if (gender === "female" && (hipsCm === undefined || !isPositiveFinite(hipsCm) || waistCm + hipsCm <= neckCm)) return null;

  const inches = (centimeters: number) => centimeters / 2.54;
  const heightIn = inches(heightCm);
  const waistIn = inches(waistCm);
  const neckIn = inches(neckCm);
  const hipsIn = inches(hipsCm ?? 0);

  const raw = gender === "male"
    ? 86.010 * Math.log10(waistIn - neckIn) - 70.041 * Math.log10(heightIn) + 36.76
    : 163.205 * Math.log10(waistIn + hipsIn - neckIn) - 97.684 * Math.log10(heightIn) - 78.387;

  const percentage = round(raw, 1);
  if (!Number.isFinite(percentage) || percentage < BODY_FAT_RANGE.min || percentage > BODY_FAT_RANGE.max) return null;

  const category = gender === "male"
    ? percentage < 6 ? "Минимальный диапазон" : percentage < 14 ? "Атлетичный диапазон" : percentage < 18 ? "Фитнес-диапазон" : percentage < 25 ? "Средний диапазон" : "Высокий диапазон"
    : percentage < 14 ? "Минимальный диапазон" : percentage < 21 ? "Атлетичный диапазон" : percentage < 25 ? "Фитнес-диапазон" : percentage < 32 ? "Средний диапазон" : "Высокий диапазон";

  return { percentage, category, formulaLabel: "US Navy: рост, талия, шея и для женщин бёдра; замеры переводятся в дюймы" };
}

export type WalkingPace = "calm" | "usual" | "brisk";
export type RunningPace = "easy" | "steady" | "fast";

export const walkingPaces: Record<WalkingPace, { label: string; met: number }> = {
  calm: { label: "Спокойный · около 3 км/ч", met: 2.5 },
  usual: { label: "Обычный · около 4,5 км/ч", met: 3.3 },
  brisk: { label: "Быстрый · около 6 км/ч", met: 4.3 },
};

export const runningPaces: Record<RunningPace, { label: string; met: number }> = {
  easy: { label: "Лёгкий · около 8 км/ч", met: 7 },
  steady: { label: "Устойчивый · около 10 км/ч", met: 9.8 },
  fast: { label: "Быстрый · около 12 км/ч", met: 11.5 },
};

/** MET: ккал = MET × 3,5 × кг / 200 × минуты. */
export function calculateActivityCalories(weight: number, durationMinutes: number, met: number): number | null {
  if (![weight, durationMinutes, met].every(isPositiveFinite)) return null;
  return Math.round(((met * 3.5 * weight) / 200) * durationMinutes);
}

export function calculateStepsDistance(steps: number, strideCm: number): number | null {
  if (!Number.isFinite(steps) || steps < 0 || !isPositiveFinite(strideCm)) return null;
  return round((steps * strideCm) / 100000, 2);
}

export type StepGoalResult = { remaining: number; percentage: number; status: "Цель достигнута" | "Почти у цели" | "В процессе" };

export function calculateStepGoal(currentSteps: number, targetSteps: number): StepGoalResult | null {
  if (![currentSteps, targetSteps].every((value) => Number.isFinite(value) && value >= 0) || targetSteps <= 0) return null;
  const percentage = Math.min(100, Math.round((currentSteps / targetSteps) * 100));
  const remaining = Math.max(0, Math.ceil(targetSteps - currentSteps));
  const status = currentSteps >= targetSteps ? "Цель достигнута" : percentage >= 80 ? "Почти у цели" : "В процессе";
  return { remaining, percentage, status };
}

export type HeartRateZone = { label: string; low: number; high: number; intensity: [number, number] };

/** Карвонен с оценкой максимального пульса 220 − возраст; формула даёт разброс ±10–12 уд/мин. */
export function calculateHeartRateZones(age: number, restingHeartRate: number): HeartRateZone[] | null {
  if (![age, restingHeartRate].every(isPositiveFinite) || age > 120) return null;
  const maxHeartRate = 220 - age;
  if (restingHeartRate >= maxHeartRate) return null;
  const reserve = maxHeartRate - restingHeartRate;
  const bands: Array<[label: string, low: number, high: number]> = [
    ["Разминка", 0.5, 0.6],
    ["Лёгкая", 0.6, 0.7],
    ["Аэробная", 0.7, 0.8],
    ["Интенсивная", 0.8, 0.9],
    ["Максимальная", 0.9, 1],
  ];
  return bands.map(([label, low, high]) => ({
    label,
    low: Math.round(restingHeartRate + reserve * low),
    high: Math.round(restingHeartRate + reserve * high),
    intensity: [low, high] as [number, number],
  }));
}

export type PaceDistanceMode = "time" | "distance" | "pace";
export type PaceDistanceResult = { distanceKm: number; timeMinutes: number; paceMinutesPerKm: number };

/** Из двух известных величин восстанавливается третья. */
export function calculatePaceDistance(mode: PaceDistanceMode, distanceKm?: number, timeMinutes?: number, paceMinutesPerKm?: number): PaceDistanceResult | null {
  const provided = [distanceKm, timeMinutes, paceMinutesPerKm];
  if (provided.some((value) => value !== undefined && (!Number.isFinite(value) || value <= 0))) return null;

  let distance = distanceKm;
  let time = timeMinutes;
  let pace = paceMinutesPerKm;
  if (mode === "time" && distance !== undefined && pace !== undefined) time = distance * pace;
  if (mode === "distance" && time !== undefined && pace !== undefined) distance = time / pace;
  if (mode === "pace" && distance !== undefined && time !== undefined) pace = time / distance;
  if ([distance, time, pace].some((value) => value === undefined || !Number.isFinite(value) || value <= 0)) return null;

  return { distanceKm: round(distance!, 2), timeMinutes: round(time!, 2), paceMinutesPerKm: round(pace!, 2) };
}

/** Строгий формат `ММ:СС` → минуты. Принимает «6:40» и «06:40», отвергает «6,4» и «06:60». */
export function parsePaceMmSs(value: string): number | null {
  const match = /^(\d+):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (seconds > 59) return null;
  const total = minutes + seconds / 60;
  return total > 0 ? total : null;
}

export function formatPaceMmSs(minutesPerKm: number): string {
  if (!Number.isFinite(minutesPerKm) || minutesPerKm <= 0) return "";
  const totalSeconds = Math.max(1, Math.round(minutesPerKm * 60));
  return `${String(Math.floor(totalSeconds / 60)).padStart(2, "0")}:${String(totalSeconds % 60).padStart(2, "0")}`;
}

export function formatPace(minutesPerKm: number): string {
  const formatted = formatPaceMmSs(minutesPerKm);
  return formatted ? `${formatted} / км` : "—";
}

/** Минуты наружу: целые без дробей, дробные — до сотых и без хвостовых нулей. */
export function formatMinutes(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

export function calculateWalkingPace(distanceKm: number, timeMinutes: number): { paceMinutesPerKm: number; speedKmh: number } | null {
  if (![distanceKm, timeMinutes].every(isPositiveFinite)) return null;
  return { paceMinutesPerKm: round(timeMinutes / distanceKm, 2), speedKmh: round(distanceKm / (timeMinutes / 60), 2) };
}

export function calculateMovementSpeed(distanceKm: number, timeMinutes: number): number | null {
  if (![distanceKm, timeMinutes].every(isPositiveFinite)) return null;
  return round(distanceKm / (timeMinutes / 60), 2);
}

/** Значение «темп» в 0 минут тоже технически положительно, но бессмысленно. */
function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
