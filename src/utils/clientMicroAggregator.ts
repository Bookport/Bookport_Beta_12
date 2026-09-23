// Pure клиентский агрегатор 36+ (42 расширенных) — Read-Only, без мутаций сервера/стора/BD
// Гибрид: server-truth (плоские поля SavedDish) -> fallback техкарта × CLIENT_NUTRIENT_DB/100г

import { getClientProfile } from "../data/clientNutrientDB";
import { toLocalDate, todayLocalDate } from "../shared/dates";
import { getUserTimeZone } from "../shared/timeZoneStore";

// 42 расширенных поля — канонический список из DailyNutritionStore.ts:153
export const EXTENDED_MICRO_FIELDS = [
  "vitaminA","vitaminC","vitaminD","vitaminE","vitaminK",
  "thiamin","riboflavin","niacin","pantothenicAcid","vitaminB6",
  "biotin","folate","vitaminB12",
  "calcium","iron","magnesium","phosphorus","potassium","sodium",
  "zinc","copper","manganese","iodine","selenium",
  "lysine","methionine","tryptophan","threonine","isoleucine","leucine",
  "cystine","phenylalanine","tyrosine","valine","arginine","histidine",
  "alanine","asparticAcid","glutamicAcid","glycine","proline","serine",
] as const;

// Дополнительные ключи для таба "Жиры и сахара" (DishAnalysisScreen TAB_KEYS fats)
// Суммируются тем же гибридным путем, но не участвуют в hasReal гейте
export const FATS_SUGARS_FIELDS = [
  "cholesterol","saturatedFat","transFat","omega3","omega6","omega9",
  "fructose","glucose","lactose","sugarTotal","sucrose","maltose",
  "monounsaturatedFat","polyunsaturatedFat","retinol","betaCarotene","vitaminD2","vitaminD3",
] as const;

export const ALL_MICRO_KEYS = [...EXTENDED_MICRO_FIELDS, ...FATS_SUGARS_FIELDS] as const;

export type ExtendedMicroKey = typeof EXTENDED_MICRO_FIELDS[number];

export function hasRealExtendedNutrientProfile(dish: any): boolean {
  for (const f of EXTENDED_MICRO_FIELDS) {
    const v = dish?.[f];
    if (typeof v === "number" && v > 0) return true;
  }
  return false;
}

/**
 * Строгий парсер веса в граммы — только явные "г"/"кг", без эвристик шт/ложек.
 * Копия DailyNutritionStore.ts:322 parseStrictWeightGrams, без зависимости от стора.
 * - "100 г" -> 100, "182 г" ->182, "10 г" из "1 ст.л. (10 г)" ->10, "0.5 кг"->500
 * - "1 шт", "1 ст.л.", "300 мл", "" -> null
 * - несколько разных граммовок в одной строке -> null (не гадаем)
 */
export function parseStrictWeightGrams(weightStr: unknown): number | null {
  if (typeof weightStr === "number") {
    return Number.isFinite(weightStr) && weightStr > 0 ? weightStr : null;
  }
  if (typeof weightStr !== "string") return null;
  const cleaned = weightStr.trim().toLowerCase();
  if (!cleaned) return null;

  const toNum = (raw: string): number | null => {
    const n = parseFloat(raw.replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const collect = (re: RegExp): number[] => {
    const out: number[] = [];
    for (const m of cleaned.matchAll(re)) {
      const n = toNum(m[1]);
      if (n !== null) out.push(n);
    }
    return out;
  };
  // кг до граммов, чтобы "кг" не захватилось как "г"
  const kgValues = collect(/(-?\d+[\d.,]*)\s*(?:кг|kg)/gi);
  if (kgValues.length === 1) return kgValues[0] * 1000;
  if (kgValues.length > 1) return null;
  const gramValues = collect(/(-?\d+[\d.,]*)\s*г(?![а-яa-z])/gi);
  if (gramValues.length === 1) return gramValues[0];
  if (gramValues.length > 1) return null;
  return null;
}

function isRealMixerDish(dish: any): boolean {
  return dish?.sourceType === "mixer" || dish?.category === "Миксер";
}

function isSameDay(dish: any, currentDayIndex: number, todayStr: string): boolean {
  if (dish.dayIndex !== undefined && dish.dayIndex !== null) {
    return dish.dayIndex === currentDayIndex || (dish as any).current_day === currentDayIndex;
  }
  if (!dish.dayIndex && currentDayIndex === 1) {
    const dishDate = dish.createdAt ? toLocalDate(new Date(dish.createdAt), getUserTimeZone()) : null;
    return dishDate === todayStr;
  }
  return false;
}

export interface DayMicrosResult {
  sums: Record<string, number>;
  meta: {
    total: number;
    valid: number;
    partial: number;
    hasValid: boolean;
    hasPartial: boolean;
    // для отладки/баннера
    validIds: string[];
    partialIds: string[];
  };
}

/**
 * Гибридный агрегатор дня.
 * @param effSavedDishes — полный массив SavedDish (нефильтрованный, как в StateNowScreen:207)
 * @param currentDayIndex — день 1..28
 * Сутки определяются как в DailyNutritionStore: по dayIndex/current_day, fallback на todayStr для дня 1.
 * - hasReal ? суммируем плоские поля dish[field] (server-truth)
 * - !hasReal ? парсим dish.ingredients (name + weight "N г") и считаем профиль×вес/100 из CLIENT_NUTRIENT_DB
 * Миксер исключается, как в StateNow.
 */
export function computeDayMicros(effSavedDishes: any[], currentDayIndex: number): DayMicrosResult {
  const sums: Record<string, number> = {};
  for (const k of ALL_MICRO_KEYS) sums[k] = 0;
  // also keep legacy 42 for compat, but ensure ALL keys present

  const tz = getUserTimeZone();
  const todayStr = todayLocalDate(tz);

  const dayDishes = (effSavedDishes || []).filter((dish) => {
    if (isRealMixerDish(dish)) return false;
    return isSameDay(dish, currentDayIndex, todayStr);
  });

  let valid = 0;
  let partial = 0;
  const validIds: string[] = [];
  const partialIds: string[] = [];

  for (const dish of dayDishes) {
    const hasReal = hasRealExtendedNutrientProfile(dish);
    if (hasReal) {
      for (const k of ALL_MICRO_KEYS) {
        const v = Number((dish as any)[k]);
        if (Number.isFinite(v) && v !== 0) sums[k] += v;
      }
      valid++;
      validIds.push(String(dish.id || dish.name));
      continue;
    }

    // fallback: техкарта — честный перерасчет из ингредиентов
    let rawIngs: any[] = [];
    const ingSrc = (dish as any).ingredients;
    if (typeof ingSrc === "string") {
      try { const parsed = JSON.parse(ingSrc); if (Array.isArray(parsed)) rawIngs = parsed; } catch { rawIngs = []; }
    } else if (Array.isArray(ingSrc)) {
      rawIngs = ingSrc;
    }

    if (rawIngs.length === 0) {
      partial++;
      partialIds.push(String(dish.id || dish.name));
      continue;
    }

    let contributed = false;
    for (const ing of rawIngs) {
      if (!ing?.name) continue;
      const w = parseStrictWeightGrams(ing.weight);
      if (w == null) continue;
      const prof = getClientProfile(String(ing.name));
      if (!prof) continue;
      for (const k of ALL_MICRO_KEYS) {
        const per100 = (prof as any)[k] as number;
        if (typeof per100 === "number" && Number.isFinite(per100) && per100 !== 0) {
          sums[k] += per100 * w / 100;
        }
      }
      contributed = true;
    }

    if (contributed) {
      valid++;
      validIds.push(String(dish.id || dish.name));
    } else {
      partial++;
      partialIds.push(String(dish.id || dish.name));
    }
  }

  return {
    sums,
    meta: {
      total: dayDishes.length,
      valid,
      partial,
      hasValid: valid > 0,
      hasPartial: partial > 0,
      validIds,
      partialIds,
    },
  };
}

/**
 * Упрощенный агрегатор для уже отфильтрованных dayDishes (без dayIndex логики).
 * Полезен для тестов/CompositionTab.
 */
export function computeMicrosForDishes(dayDishes: any[]): DayMicrosResult {
  const sums: Record<string, number> = {};
  for (const k of ALL_MICRO_KEYS) sums[k] = 0;
  let valid = 0;
  let partial = 0;
  const validIds: string[] = [];
  const partialIds: string[] = [];
  for (const dish of dayDishes) {
    if (isRealMixerDish(dish)) continue;
    const hasReal = hasRealExtendedNutrientProfile(dish);
    if (hasReal) {
      for (const k of ALL_MICRO_KEYS) {
        const v = Number((dish as any)[k]);
        if (Number.isFinite(v) && v !== 0) sums[k] += v;
      }
      valid++; validIds.push(String(dish.id||dish.name));
      continue;
    }
    let rawIngs: any[] = [];
    const ingSrc = (dish as any).ingredients;
    if (typeof ingSrc === "string") { try { rawIngs = JSON.parse(ingSrc); } catch { rawIngs=[]; } }
    else if (Array.isArray(ingSrc)) rawIngs = ingSrc;
    let contributed=false;
    for (const ing of rawIngs) {
      const w = parseStrictWeightGrams(ing.weight);
      if (w==null) continue;
      const prof = getClientProfile(String(ing.name));
      if (!prof) continue;
      for (const k of ALL_MICRO_KEYS) sums[k]+= (prof as any)[k]*w/100;
      contributed=true;
    }
    if (contributed) { valid++; validIds.push(String(dish.id||dish.name)); } else { partial++; partialIds.push(String(dish.id||dish.name)); }
  }
  return { sums, meta:{ total: dayDishes.length, valid, partial, hasValid: valid>0, hasPartial: partial>0, validIds, partialIds } };
}
