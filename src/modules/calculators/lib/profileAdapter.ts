/**
 * Адаптер профиля хоста → профиль калькуляторов.
 *
 * Единственное место, которое знает про форму данных приложения-хоста.
 * Bookport хранит профиль в настройках как `gender/age/height/weight` без единиц
 * плюс `systolic/diastolic` — давление; `activity`/`goal` в его модели нет.
 * Здесь нормализуются типы, диапазоны и строковые значения пола, а недостающие
 * поля остаются `undefined` и не попадают в объект.
 */

import { activityOptions, type ActivityLevel, type CalorieGoal, type CalculatorProfile, type Gender } from "../types";
import { profileRules, validateNumeric } from "./validation";

/** То, что хост может отдать как есть: поля шире строгих типов модуля. */
export type HostProfile = {
  gender?: string | null;
  age?: number | string | null;
  height?: number | string | null;
  weight?: number | string | null;
  activity?: number | string | null;
  goal?: string | null;
  waistCm?: number | string | null;
  hipsCm?: number | string | null;
  neckCm?: number | string | null;
  restingHeartRateBpm?: number | string | null;
  /** Как давление лежит в настройках Bookport: верхнее и нижнее. */
  systolic?: number | string | null;
  diastolic?: number | string | null;
};

const genderAliases: Record<string, Gender> = {
  male: "male", m: "male", man: "male", "мужской": "male", "муж": "male", "м": "male",
  female: "female", f: "female", woman: "female", "женский": "female", "жен": "female", "ж": "female",
};

const goalAliases: Record<string, CalorieGoal> = {
  loss: "loss", lower: "loss", reduce: "loss", "снижение": "loss", "похудение": "loss",
  gain: "gain", bulk: "gain", "набор": "gain", "рост": "gain",
  maintain: "maintain", maintenance: "maintain", "поддержание": "maintain", "норма": "maintain",
};

function toNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Принимается только то, что проходит то же правило, что и ручной ввод в UI. */
function toMeasured(value: number | string | null | undefined, field: keyof typeof profileRules): number | undefined {
  const parsed = toNumber(value);
  return parsed !== undefined && validateNumeric(parsed, profileRules[field]) === null ? parsed : undefined;
}

/** Хост может отдать 1.5 или "1,55": берём ближайший допустимый множитель. */
function toActivity(value: number | string | null | undefined): ActivityLevel | undefined {
  const parsed = toNumber(value);
  if (parsed === undefined) return undefined;
  const nearest = activityOptions.reduce((best, option) =>
    Math.abs(option.value - parsed) < Math.abs(best.value - parsed) ? option : best,
  );
  // Дальше 0,05 угадывать нечего: пусть пользователь выберет активность сам.
  // Умножение на 1000 убирает шум вида 1.55 - 1.5 = 0.050000000000000044.
  return Math.round(Math.abs(nearest.value - parsed) * 1000) <= 50 ? nearest.value : undefined;
}

/** Собирает профиль хоста, отбрасывая поля вне допустимых диапазонов. */
export function toCalculatorProfile(host: HostProfile | null | undefined): CalculatorProfile {
  if (!host) return {};

  const candidates: CalculatorProfile = {
    gender: host.gender ? genderAliases[host.gender.trim().toLowerCase()] : undefined,
    ageYears: toMeasured(host.age, "ageYears"),
    heightCm: toMeasured(host.height, "heightCm"),
    weightKg: toMeasured(host.weight, "weightKg"),
    activity: toActivity(host.activity),
    goal: host.goal ? goalAliases[host.goal.trim().toLowerCase()] : undefined,
    waistCm: toMeasured(host.waistCm, "waistCm"),
    hipsCm: toMeasured(host.hipsCm, "hipsCm"),
    neckCm: toMeasured(host.neckCm, "neckCm"),
    restingHeartRateBpm: toMeasured(host.restingHeartRateBpm, "restingHeartRateBpm"),
    systolicMmHg: toMeasured(host.systolic, "systolicMmHg"),
    diastolicMmHg: toMeasured(host.diastolic, "diastolicMmHg"),
  };

  return Object.fromEntries(Object.entries(candidates).filter(([, value]) => value !== undefined)) as CalculatorProfile;
}
