/*
 * Экран калькуляторов как модуль приложения.
 *
 * Профиль приходит извне через `profile` (подойдёт и сырой объект пользователя
 * хоста), правки уходят обратно через `onProfileChange`. Сам экран ничего не
 * читает из стора и не ходит в сеть. Правки профиля он сохраняет в собственный
 * кэш (`lib/profileStorage`) — они переживают перезагрузку приложения, но в
 * данные хоста не попадают.
 */

import { useMemo, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import "../styles/calculators.css";
import { ProfileProvider, useProfile } from "../contexts/ProfileContext";
import { toCalculatorProfile, type HostProfile } from "../lib/profileAdapter";
import { readProfile, readinessCopy } from "../lib/profileReadiness";
import { calculators, categoryMeta, categoryOrder, screenIcon } from "../lib/calculatorCatalog";
import { CalculatorCard } from "../components/CalculatorCard";
import { CalculatorModal } from "../components/CalculatorModal";
import { ProfileModal } from "../components/ProfileModal";
import type { CalculatorDefinition } from "../lib/calculatorCatalog";
import type { CalculatorProfile } from "../types";

export interface CalculatorsScreenProps {
  /** Данные пользователя из приложения: имя не нужно, достаточно измерений. */
  profile?: HostProfile | null;
  /** Точечная отдача правок профиля хосту — например, для записи в базу. */
  onProfileChange?: (profile: CalculatorProfile) => void;
  /** Закрытие экрана: хост возвращает пользователя на главный экран приложения (`my-day`). */
  onClose: () => void;
}

export default function CalculatorsScreen({ profile, onProfileChange, onClose }: CalculatorsScreenProps) {
  const initialProfile = useMemo(() => toCalculatorProfile(profile), [profile]);

  return (
    <ProfileProvider initialProfile={initialProfile} onProfileChange={onProfileChange}>
      <CalculatorsView onClose={onClose} />
    </ProfileProvider>
  );
}

function CalculatorsView({ onClose }: { onClose: () => void }) {
  const { profile } = useProfile();
  const readiness = readProfile(profile);
  const [selected, setSelected] = useState<CalculatorDefinition | null>(null);
  const [trigger, setTrigger] = useState<HTMLElement | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileTrigger, setProfileTrigger] = useState<HTMLElement | null>(null);

  const groups = useMemo(
    () => categoryOrder.map((category) => ({ category, items: calculators.filter((calculator) => calculator.category === category) })),
    [],
  );

  const openCalculator = (calculator: CalculatorDefinition, element: HTMLElement | null) => {
    setTrigger(element);
    setSelected(calculator);
  };

  return (
    <main className="calc-screen h-dvh overflow-y-auto overscroll-contain overflow-x-hidden text-[#1E293B]">
      <div className="relative z-10 mx-auto w-full max-w-[440px] px-4 pb-6">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200/80 pb-4 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <img src={screenIcon} alt="" width={42} height={42} className="size-[42px] shrink-0 object-contain" draggable={false} />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold leading-none tracking-tight text-[#1E293B] sm:text-2xl">Калькуляторы</h1>
              <p className="mt-1.5 text-[11px] leading-4 text-[#64748B]">Ориентиры для питания, тела и движения</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть калькуляторы" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#64748B] shadow-[0_4px_14px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] ring-1 ring-black/5 transition hover:text-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E293B]">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <section className="mt-5">
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={profileOpen}
            aria-controls="profile-dialog"
            onClick={(event) => { setProfileTrigger(event.currentTarget); setProfileOpen(true); }}
            className="flex w-full items-center justify-between gap-3 rounded-[18px] border-[1.5px] border-white bg-[#F1F5F9] px-4 py-3 text-left shadow-[0_4px_14px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] transition hover:bg-[#E9EFF6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E293B] focus-visible:ring-offset-2"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="h-6 w-px shrink-0 bg-[#94A3B8]" aria-hidden="true" />
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#334155]">Личные данные</span>
                <span aria-live="polite" className="text-xs leading-4 text-[#64748B]">
                  {readinessCopy[readiness.state]}
                  {readiness.missing.length > 0 && ` · ${readiness.missingLabel}`}
                </span>
              </span>
            </span>
            <ChevronRight size={18} className="shrink-0 text-[#94A3B8]" aria-hidden="true" />
          </button>
        </section>

        <div className="mt-6 space-y-6">
          {groups.map(({ category, items }, groupIndex) => (
            <section key={category} aria-labelledby={`${category}-heading`}>
              <div className="mb-2 flex items-center gap-2">
                <img src={categoryMeta[category].icon} alt="" width={24} height={24} className="size-6 shrink-0 object-contain" draggable={false} />
                <h2 id={`${category}-heading`} className="min-w-0 truncate text-[12px] font-bold uppercase tracking-[0.05em]" style={{ color: categoryMeta[category].headingColor }}>
                  {`${String(groupIndex + 1).padStart(2, "0")} · ${categoryMeta[category].label}`}
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((calculator) => (
                  <CalculatorCard
                    key={calculator.id}
                    calculator={calculator}
                    onOpen={() => openCalculator(calculator, document.activeElement instanceof HTMLElement ? document.activeElement : null)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-3 border-t border-slate-200/80 pt-3 text-center text-[11px] leading-4 text-[#94A3B8]">
          Калькуляторы дают ориентировочные значения по распространённым формулам и не заменяют консультацию специалиста.
        </p>
      </div>

      {selected && <CalculatorModal calculator={selected} returnFocusElement={trigger} onClose={() => { setSelected(null); setTrigger(null); }} onOpenProfile={() => { setProfileTrigger(document.activeElement instanceof HTMLElement ? document.activeElement : null); setProfileOpen(true); }} />}
      {profileOpen && <ProfileModal returnFocusElement={profileTrigger} onClose={() => { setProfileOpen(false); setProfileTrigger(null); }} />}
    </main>
  );
}
