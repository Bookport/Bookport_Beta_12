/* Диалог личных данных: те же поля, что используют калькуляторы, плюс сброс к переданным хостом значениям. */

import { useRef } from "react";
import { X } from "lucide-react";
import { useDialogBehavior } from "../hooks/useDialogBehavior";
import { useProfile } from "../contexts/ProfileContext";
import { readProfile, readinessCopy } from "../lib/profileReadiness";
import { BaseProfileFields, ProfileNumber } from "./ProfileFields";
import { GhostButton } from "./fields";

export function ProfileModal({ onClose, returnFocusElement }: { onClose: () => void; returnFocusElement?: HTMLElement | null }) {
  const { profile, resetProfile, isDirty } = useProfile();
  const readiness = readProfile(profile);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogBehavior<HTMLDivElement>({ onClose, returnFocusElement, initialFocus: closeButtonRef });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-8" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose} aria-label="Закрыть окно" />
      <div
        ref={dialogRef}
        id="profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-dialog-title"
        tabIndex={-1}
        className="calc-dialog relative z-10 flex min-h-0 max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-[560px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] ring-1 ring-black/5 sm:max-h-[calc(100dvh-4rem)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <h2 id="profile-dialog-title" className="truncate text-base font-semibold leading-tight text-[#1E293B]">Мой профиль</h2>
            <p className="truncate text-xs leading-4 text-[#64748B]">
              {readinessCopy[readiness.state]}
              {readiness.missing.length > 0 && ` · не заполнено: ${readiness.missingLabel}`}
            </p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#64748B] transition hover:bg-slate-200 hover:text-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E293B]" aria-label="Закрыть профиль">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="calc-scrollable min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <div className="space-y-5">
            <BaseProfileFields includeActivity />
            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileNumber field="waistCm" />
              <ProfileNumber field="hipsCm" />
              <ProfileNumber field="neckCm" />
              <ProfileNumber field="restingHeartRateBpm" />
              <ProfileNumber field="systolicMmHg" />
              <ProfileNumber field="diastolicMmHg" />
            </div>
            <p className="text-xs leading-5 text-[#64748B]">Обхваты, пульс и давление нужны только части калькуляторов; давление приходит из настроек приложения. Правки сохраняются на этом устройстве и действуют в следующих расчётах; в Настройки приложения они не записываются.</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-6">
          <GhostButton label="Вернуть данные приложения" onClick={resetProfile} />
          <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[#1E293B] px-4 text-sm font-bold text-white transition hover:bg-[#0F172A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E293B] focus-visible:ring-offset-2">
            Готово
          </button>
        </div>
        <span className="sr-only" aria-live="polite">{isDirty ? "Профиль изменён в этом экране" : "Профиль соответствует данным приложения"}</span>
      </div>
    </div>
  );
}
