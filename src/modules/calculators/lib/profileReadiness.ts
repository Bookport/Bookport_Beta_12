/**
 * Готовность профиля к расчётам: единый ответ на вопрос «каких полей не хватает».
 * Используется и сводкой на экране, и формой калькулятора, чтобы они не
 * расходились в трактовке.
 */

import { requiredProfileFields, type CalculatorProfile } from "../types";

export const profileFieldLabels: Record<keyof CalculatorProfile, string> = {
  gender: "пол",
  ageYears: "возраст",
  heightCm: "рост",
  weightKg: "вес",
  activity: "активность",
  goal: "цель",
  waistCm: "талия",
  hipsCm: "бёдра",
  neckCm: "шея",
  restingHeartRateBpm: "пульс в покое",
  systolicMmHg: "верхнее давление",
  diastolicMmHg: "нижнее давление",
};

/** Канонический порядок полей: он же порядок подписей выше, по нему сортируются подсказки. */
export const profileFieldOrder = Object.keys(profileFieldLabels) as Array<keyof CalculatorProfile>;

export type ProfileReadiness = {
  missing: Array<keyof CalculatorProfile>;
  /** Название отсутствующих полей через запятую — для сообщения в UI. */
  missingLabel: string;
  state: "empty" | "partial" | "ready";
};

export function readProfile(profile: CalculatorProfile): ProfileReadiness {
  const missing = requiredProfileFields.filter((field) => profile[field] === undefined);
  const filledRequired = requiredProfileFields.length - missing.length;
  return {
    missing,
    missingLabel: missing.map((field) => profileFieldLabels[field]).join(", "),
    state: filledRequired === 0 ? "empty" : missing.length === 0 ? "ready" : "partial",
  };
}

export const readinessCopy: Record<ProfileReadiness["state"], string> = {
  empty: "Не заполнено",
  partial: "Заполнено частично",
  ready: "Готово к расчётам",
};
