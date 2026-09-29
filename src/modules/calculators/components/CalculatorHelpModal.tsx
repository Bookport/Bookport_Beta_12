/*
 * Мини-модалка пояснения к расчёту: три абзаца — что считает, зачем нужно, как использовать.
 * Живёт слоем поверх окна калькулятора: введённые значения под ней сохраняются.
 */

import { useRef, type CSSProperties } from "react";
import { Info, X } from "lucide-react";
import { useDialogBehavior } from "../hooks/useDialogBehavior";
import type { CalculatorDefinition } from "../lib/calculatorCatalog";
import { calculatorHelpLabels, type CalculatorHelpText } from "../lib/calculatorHelpTexts";

const SECTIONS: (keyof CalculatorHelpText)[] = ["counts", "purpose", "usage"];

export function CalculatorHelpModal({ calculator, help, onClose, returnFocusElement }: {
  calculator: CalculatorDefinition;
  help: CalculatorHelpText;
  onClose: () => void;
  returnFocusElement?: HTMLElement | null;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogBehavior<HTMLDivElement>({ onClose, returnFocusElement, initialFocus: closeButtonRef });

  return (
    <div className="fixed inset-0 z-20 grid place-items-center p-4 sm:p-8" role="presentation">
      <button type="button" className="absolute inset-0 cursor-default bg-slate-900/45 backdrop-blur-[3px]" onClick={onClose} aria-label="Закрыть пояснение" />
      <div
        ref={dialogRef}
        className="calc-dialog relative z-10 flex min-h-0 max-h-[min(560px,calc(100dvh-2rem))] w-full max-w-[400px] flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_18px_48px_rgba(15,23,42,0.18)] ring-1 ring-black/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calculator-help-title"
        tabIndex={-1}
        style={{
          "--calc-accent": calculator.accent,
          "--calc-accent-soft": `${calculator.accent}1f`,
          "--calc-accent-ring": `${calculator.accent}40`,
        } as CSSProperties}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--calc-accent-soft)] text-[color:var(--calc-accent)]" aria-hidden="true">
            <Info size={18} strokeWidth={2.2} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="calculator-help-title" className="truncate text-base font-semibold leading-tight text-[#1E293B]">Как читать расчёт</h2>
            <p className="truncate text-xs leading-4 text-[#64748B]">{calculator.title}</p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#64748B] transition hover:bg-slate-200 hover:text-[#1E293B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--calc-accent)]" aria-label="Закрыть пояснение">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="calc-scrollable min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
          {SECTIONS.map((section) => (
            <p key={section} className="m-0 text-[15px] leading-6 text-[#334155]">
              <span className="font-bold text-[color:var(--calc-accent)]">{calculatorHelpLabels[section]}</span>{" "}{help[section]}
            </p>
          ))}
        </div>

        <div className="flex shrink-0 justify-end px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-[14px] bg-[color:var(--calc-accent)] px-5 text-sm font-bold text-white transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--calc-accent)] focus-visible:ring-offset-2"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
