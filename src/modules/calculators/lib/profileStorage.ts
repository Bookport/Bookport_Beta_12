/**
 * Кэш личных данных.
 *
 * Правки в плашке «Личные данные» и в полях профиля внутри калькуляторов
 * переживают закрытие окна и перезагрузку приложения. Модуль держит их в
 * собственном ключе `localStorage` и по-прежнему ничего не пишет в стор хоста.
 *
 * Храним не профиль целиком, а пару «значение + что отдал хост на момент
 * правки»: если приложение позже отдаёт другое значение, оно свежее и
 * перекрывает кэш — правки в Настройках не прячутся за старым кэшем.
 */

import type { CalculatorProfile } from "../types";

export const PROFILE_STORAGE_KEY = "calculators.profile.v1";

type ProfileValue = CalculatorProfile[keyof CalculatorProfile];

export type ProfileOverride = { value: ProfileValue; hostValue: ProfileValue | undefined };

export type ProfileOverrides = Partial<Record<keyof CalculatorProfile, ProfileOverride>>;

/** Хранилище может быть недоступно: приватный режим, запрет WebView. */
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readOverrides(): ProfileOverrides {
  const store = storage();
  if (!store) return {};
  try {
    const raw = store.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { version?: number; overrides?: ProfileOverrides };
    return parsed && parsed.version === 1 && parsed.overrides ? parsed.overrides : {};
  } catch {
    return {};
  }
}

export function writeOverrides(overrides: ProfileOverrides): void {
  const store = storage();
  if (!store) return;
  try {
    if (Object.keys(overrides).length === 0) store.removeItem(PROFILE_STORAGE_KEY);
    else store.setItem(PROFILE_STORAGE_KEY, JSON.stringify({ version: 1, overrides }));
  } catch {
    // запрет записи или переполнение: правки останутся живыми только в экране
  }
}

type ProfileMap = Record<string, ProfileValue | undefined>;

export function toOverrides(base: CalculatorProfile, profile: CalculatorProfile): ProfileOverrides {
  const [host, current] = [base, profile] as [ProfileMap, ProfileMap];
  const keys = new Set([...Object.keys(base), ...Object.keys(profile)]);
  const overrides: ProfileOverrides = {};
  for (const key of keys) {
    if (current[key] === host[key]) continue;
    overrides[key as keyof CalculatorProfile] = { value: current[key], hostValue: host[key] };
  }
  return overrides;
}

export function applyOverrides(base: CalculatorProfile, overrides: ProfileOverrides): CalculatorProfile {
  const profile = { ...base } as ProfileMap;
  for (const [key, entry] of Object.entries(overrides) as Array<[string, ProfileOverride | undefined]>) {
    if (!entry || (base as ProfileMap)[key] !== entry.hostValue) continue;
    if (entry.value === undefined) delete profile[key];
    else profile[key] = entry.value;
  }
  return profile as CalculatorProfile;
}
