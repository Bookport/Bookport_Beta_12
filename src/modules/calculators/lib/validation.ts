/* Чистые guardrail-проверки числовых полей; общие для личных данных и форм калькуляторов. */

export type NumericFieldError = string | null;

export type NumericRule = {
  label: string;
  min?: number;
  max?: number;
  integer?: boolean;
  positive?: boolean;
};

export function validateNumeric(value: number, rule: NumericRule): NumericFieldError {
  if (!Number.isFinite(value)) return `${rule.label}: введите число.`;
  if (rule.integer && !Number.isInteger(value)) return `${rule.label}: используйте целое число.`;
  if (rule.positive && value <= 0) return `${rule.label}: значение должно быть больше нуля.`;
  if (rule.min !== undefined && value < rule.min) return `${rule.label}: минимум ${rule.min}.`;
  if (rule.max !== undefined && value > rule.max) return `${rule.label}: максимум ${rule.max}.`;
  return null;
}

/** Пустое поле даёт NaN у `Number("")`, поэтому отдельная ветка «заполните». */
export function validateRequiredNumber(value: number, rule: NumericRule): NumericFieldError {
  if (Number.isNaN(value)) return `${rule.label}: заполните поле.`;
  return validateNumeric(value, rule);
}

export function getNumericFieldErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

/** Копирайт единый: и видимая подсказка поля, и причина неактивной кнопки «Готово». */
export const disabledReason = "Введите корректные значения для расчёта";

export const paceFormatError = "Введите темп в формате ММ:СС, например 06:40.";

/** Правила личных данных совпадают с правилами форм — один источник истины. */
export const profileRules = {
  ageYears: { label: "Возраст", min: 14, max: 100, integer: true, positive: true },
  heightCm: { label: "Рост", min: 120, max: 230, integer: true, positive: true },
  weightKg: { label: "Вес", min: 30, max: 300, positive: true },
  waistCm: { label: "Талия", min: 40, max: 250, positive: true },
  hipsCm: { label: "Бёдра", min: 50, max: 250, positive: true },
  neckCm: { label: "Шея", min: 20, max: 100, positive: true },
  restingHeartRateBpm: { label: "Пульс в покое", min: 30, max: 150, integer: true, positive: true },
  systolicMmHg: { label: "Верхнее давление", min: 70, max: 250, integer: true, positive: true },
  diastolicMmHg: { label: "Нижнее давление", min: 40, max: 150, integer: true, positive: true },
} satisfies Record<string, NumericRule>;
