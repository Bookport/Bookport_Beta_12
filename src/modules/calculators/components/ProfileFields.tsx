/* Поля личных данных: единственная запись идёт в профиль экрана, отсюда их берут все калькуляторы. */

import { useProfile } from "../contexts/ProfileContext";
import { activityOptions, goalOptions, type ActivityLevel, type CalorieGoal, type Gender } from "../types";
import { profileRules, type NumericRule } from "../lib/validation";
import { NumericField, SelectField } from "./fields";

/** Числовые поля профиля — подмножество `CalculatorProfile`, правила взяты из `profileRules`. */
export type ProfileNumberFieldKey = keyof typeof profileRules;

const numberFieldMeta: Record<ProfileNumberFieldKey, { label: string; unit: string; step?: number }> = {
  ageYears: { label: "Возраст", unit: "лет" },
  heightCm: { label: "Рост", unit: "см" },
  weightKg: { label: "Вес", unit: "кг", step: 0.1 },
  waistCm: { label: "Талия", unit: "см", step: 0.1 },
  hipsCm: { label: "Бёдра", unit: "см", step: 0.1 },
  neckCm: { label: "Шея", unit: "см", step: 0.1 },
  restingHeartRateBpm: { label: "Пульс в покое", unit: "уд/мин" },
  systolicMmHg: { label: "Верхнее давление", unit: "мм рт. ст." },
  diastolicMmHg: { label: "Нижнее давление", unit: "мм рт. ст." },
};

const genderOptions: Array<{ value: string; label: string }> = [
  { value: "", label: "Не указан" },
  { value: "female", label: "Женский" },
  { value: "male", label: "Мужской" },
];

const notSelected = { value: "", label: "Не выбран" };

export function ProfileNumber({ field, label, rule }: { field: ProfileNumberFieldKey; label?: string; rule?: NumericRule }) {
  const { profile, updateProfile } = useProfile();
  const meta = numberFieldMeta[field];
  return (
    <NumericField
      label={label ?? meta.label}
      unit={meta.unit}
      step={meta.step}
      fieldId={`profile-${field}`}
      value={profile[field]}
      rule={rule ?? profileRules[field]}
      onChange={(value) => updateProfile(field, value)}
    />
  );
}

export function ProfileGender() {
  const { profile, updateProfile } = useProfile();
  return (
    <SelectField label="Пол" value={profile.gender ?? ""} onChange={(value) => updateProfile("gender", value === "" ? undefined : (value as Gender))}>
      {genderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </SelectField>
  );
}

export function ProfileActivity() {
  const { profile, updateProfile } = useProfile();
  return (
    <SelectField label="Уровень активности" value={profile.activity === undefined ? notSelected.value : String(profile.activity)} onChange={(value) => updateProfile("activity", value === "" ? undefined : (Number(value) as ActivityLevel))}>
      <option value="">{notSelected.label}</option>
      {activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </SelectField>
  );
}

export function ProfileGoal() {
  const { profile, updateProfile } = useProfile();
  return (
    <SelectField label="Цель" value={profile.goal ?? notSelected.value} onChange={(value) => updateProfile("goal", value === "" ? undefined : (value as CalorieGoal))}>
      <option value="">{notSelected.label}</option>
      {goalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </SelectField>
  );
}

/** Блок базовых данных: используется и карточкой профиля, и формами калькуляторов, чтобы они не расходились. */
export function BaseProfileFields({ includeActivity = false, includeGoal = false }: { includeActivity?: boolean; includeGoal?: boolean }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ProfileGender />
      <ProfileNumber field="ageYears" />
      <ProfileNumber field="weightKg" />
      <ProfileNumber field="heightCm" />
      {includeActivity && <div className="sm:col-span-2"><ProfileActivity /></div>}
      {includeGoal && <div className="sm:col-span-2"><ProfileGoal /></div>}
    </div>
  );
}
