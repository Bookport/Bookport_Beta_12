/* Диалог одного калькулятора: заголовок над прокручиваемой формой, ловушка фокуса из общего хука. */

import { useRef, type CSSProperties } from "react";
import { X } from "lucide-react";
import { useDialogBehavior } from "../hooks/useDialogBehavior";
import { CalculatorForm } from "./CalculatorForm";
import type { CalculatorDefinition } from "../lib/calculatorCatalog";

export function CalculatorModal({ calculator, onClose, onOpenProfile, returnFocusElement }: {
  calculator: CalculatorDefinition;
  onClose: () => void;
  /** Открыть карточку личных данных — часть форм ссылается на неё прямо из расчёта. */
  onOpenProfile?: () => void;
  returnFocusElement?: HTMLElement | null;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogBehavior<HTMLDivElement>({ onClose, returnFocusElement, initialFocus: closeButtonRef });

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-8" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose} aria-label="Закрыть окно" />
      <div
        ref={dialogRef}
        className="calc-dialog relative z-10 flex min-h-0 max-h-[min(720px,calc(100dvh-2rem))] w-full max-w-[620px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] ring-1 ring-black/5 sm:max-h-[calc(100dvh-4rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calculator-dialog-title"
        tabIndex={-1}
        style={{
          "--calc-accent": calculator.accent,
          "--calc-accent-soft": `${calculator.accent}1f`,
          "--calc-accent-ring": `${calculator.accent}40`,
        } as CSSProperties}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
          <img src={calculator.thumbnail} alt="" width={36} height={36} className="size-9 shrink-0 object-contain" draggable={false} />
          <div className="min-w-0 flex-1">
            <h2 id="calculator-dialog-title" className="truncate text-base font-semibold leading-tight text-[#1E293B]">{calculator.title}</h2>
            <p className="truncate text-xs leading-4 text-[#64748B]">{calculator.description}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#64748B] transition hover:bg-slate-200 hover:text-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--calc-accent)]" aria-label="Закрыть калькулятор">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="calc-scrollable min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <CalculatorForm calculatorId={calculator.id} onOpenProfile={onOpenProfile} onDone={onClose} />
        </div>
      </div>
    </div>
  );
}
