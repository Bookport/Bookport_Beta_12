/**
 * Профиль калькуляторов: данные хоста + правки пользователя.
 *
 * Правки кладутся в собственный кэш модуля (`lib/profileStorage`) и переживают
 * закрытие окна и перезагрузку приложения; в стор хоста модуль не пишет. Если
 * хост после правки отдаёт другое значение — оно свежее и перекрывает кэш.
 * Если хост подтягивает профиль асинхронно и передаёт новое содержимое,
 * черновик пересевается по нему (сравнение по содержимому, а не по ссылке).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CalculatorProfile } from "../types";
import { applyOverrides, readOverrides, toOverrides, writeOverrides } from "../lib/profileStorage";

type ProfileContextValue = {
  profile: CalculatorProfile;
  /** Исходный профиль хоста — нужен, чтобы показать «сброшено к данным приложения». */
  baseProfile: CalculatorProfile;
  updateProfile: <K extends keyof CalculatorProfile>(key: K, value: CalculatorProfile[K]) => void;
  resetProfile: () => void;
  isDirty: boolean;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ initialProfile, onProfileChange, children }: { initialProfile?: CalculatorProfile; onProfileChange?: (profile: CalculatorProfile) => void; children: ReactNode }) {
  const baseProfile = useMemo<CalculatorProfile>(() => initialProfile ?? {}, [initialProfile]);
  const baseKey = JSON.stringify(baseProfile);
  const [profile, setProfile] = useState<CalculatorProfile>(() => applyOverrides(baseProfile, readOverrides()));
  const lastBaseKey = useRef(baseKey);
  const baseRef = useRef(baseProfile);
  baseRef.current = baseProfile;

  useEffect(() => {
    if (lastBaseKey.current === baseKey) return;
    lastBaseKey.current = baseKey;
    setProfile(applyOverrides(baseProfile, readOverrides()));
  }, [baseKey, baseProfile]);

  // Кэш пишем только в ответ на действие пользователя: профиль хоста может
  // приехать асинхронно, и запись «на пустой базе» стёрла бы сохранённые правки.
  const commit = useCallback((next: CalculatorProfile) => {
    setProfile(next);
    writeOverrides(toOverrides(baseRef.current, next));
  }, []);

  // Отдаём хосту только правки пользователя, а не первичную раздачу профиля.
  const handedBase = useRef(false);
  useEffect(() => {
    if (!onProfileChange) return;
    if (!handedBase.current) {
      handedBase.current = true;
      if (JSON.stringify(profile) === baseKey) return;
    }
    onProfileChange(profile);
  }, [profile, baseKey, onProfileChange]);

  const updateProfile = useCallback<ProfileContextValue["updateProfile"]>((key, value) => {
    if (profile[key] === value) return;
    const next = { ...profile };
    if (value === undefined) delete next[key];
    else next[key] = value;
    commit(next);
  }, [commit, profile]);

  const resetProfile = useCallback(() => commit(baseProfile), [baseProfile, commit]);

  const value = useMemo<ProfileContextValue>(() => {
    const keys = new Set([...Object.keys(profile), ...Object.keys(baseProfile)] as Array<keyof CalculatorProfile>);
    return {
      profile,
      baseProfile,
      updateProfile,
      resetProfile,
      isDirty: [...keys].some((key) => profile[key] !== baseProfile[key]),
    };
  }, [profile, baseProfile, updateProfile, resetProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within ProfileProvider");
  return context;
}
