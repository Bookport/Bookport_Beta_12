/* Примитивы форм экрана калькуляторов: числовое поле с черновиком, селект, radio-группа, карточка результата. */

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { formatPaceMmSs, parsePaceMmSs } from "../lib/calculatorMath";
import { getNumericFieldErrorId, paceFormatError, validateRequiredNumber, type NumericRule } from "../lib/validation";

const inputClass =
  "mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-[#1E293B] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--calc-accent)] focus:ring-2 focus:ring-[color:var(--calc-accent-ring)]";
const invalidInputClass = "border-[#B91C1C] focus:border-[#B91C1C] focus:ring-[#B91C1C]/25";

type NumericFieldProps = {
  label: string;
  unit: string;
  fieldId: string;
  value: number | undefined;
  rule: NumericRule;
  step?: number;
  onChange: (value: number | undefined) => void;
  onValidityChange?: (fieldId: string, valid: boolean) => void;
};

/**
 * Черновик отделён от значения: пока ввод невалиден, наружу уходит `undefined`,
 * но поле показывает то, что набрал пользователь, а не сбрасывается.
 */
export function NumericField({ label, unit, fieldId, value, rule, step = 1, onChange, onValidityChange }: NumericFieldProps) {
  const [draft, setDraft] = useState(value === undefined ? "" : String(value));
  const [error, setError] = useState<string | null>(null);
  const errorId = getNumericFieldErrorId(fieldId);

  useEffect(() => {
    if (value === undefined) {
      // Сброс извне (очистка профиля) не должен затирать невалидный черновик:
      // иначе сообщение об ошибке исчезает в тот же момент, когда появляется.
      if (!error) setDraft("");
      return;
    }
    if (Number(draft) !== value) setDraft(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (nextDraft: string) => {
    setDraft(nextDraft);
    if (nextDraft.trim() === "") {
      setError(null);
      onValidityChange?.(fieldId, true);
      onChange(undefined);
      return;
    }
    const nextError = validateRequiredNumber(Number(nextDraft), rule);
    setError(nextError);
    onValidityChange?.(fieldId, !nextError);
    onChange(nextError ? undefined : Number(nextDraft));
  };

  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-semibold text-[#334155]">
        <span>{label}</span>
        <span className="font-normal text-[#64748B]">{unit}</span>
      </span>
      <input
        className={`${inputClass} ${error ? invalidInputClass : ""}`}
        type="number"
        inputMode="decimal"
        min={rule.min}
        max={rule.max}
        step={step}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <span id={errorId} className="mt-1.5 block text-xs leading-4 text-[#B91C1C]">{error}</span>}
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
};

export function SelectField({ label, value, onChange, children }: SelectFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#334155]">{label}</span>
      <span className="relative block">
        <select className={`${inputClass} appearance-none pr-9`} value={value} onChange={(event) => onChange(event.target.value)}>
          {children}
        </select>
        <ChevronGlyph />
      </span>
    </label>
  );
}

function ChevronGlyph() {
  return (
    <svg className="pointer-events-none absolute right-3 top-[calc(50%+0.5rem)] -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export type RadioOption<T extends string> = { value: T; label: string; hint?: string };

export type RadioSection<T extends string> = { heading?: string; columns?: 1 | 2 | 3; options: Array<RadioOption<T>> };

/**
 * Radio-группа с секциями и клавиатурной навигацией стрелками по всем вариантам
 * сразу (как в нативной радиогруппе). Используется для пресетов КБЖУ.
 */
export function RadioCards<T extends string>({ legend, value, sections, onChange }: {
  legend: string;
  value: T;
  sections: Array<RadioSection<T>>;
  onChange: (value: T) => void;
}) {
  const legendId = `${useId()}-legend`;
  const flat = sections.flatMap((section) => section.options);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const select = (next: T, focus = false) => {
    onChange(next);
    if (focus) refs.current[flat.findIndex((option) => option.value === next)]?.focus();
  };

  let index = -1;
  return (
    <div role="radiogroup" aria-labelledby={legendId} className="min-w-0">
      <span id={legendId} className="text-xs font-semibold text-[#334155]">{legend}</span>
      <div className="mt-2 space-y-3">
        {sections.map((section) => (
          <div key={section.heading ?? section.options[0]?.value} className="min-w-0">
            {section.heading && <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">{section.heading}</p>}
            <div className={`mt-1.5 grid min-w-0 gap-2 ${section.columns === 3 ? "sm:grid-cols-3" : section.columns === 2 ? "sm:grid-cols-2" : ""}`}>
              {section.options.map((option) => {
                index += 1;
                const optionIndex = index;
                const selected = option.value === value;
                return (
                  <button
                    key={option.value}
                    ref={(element) => { refs.current[optionIndex] = element; }}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    tabIndex={selected || (!flat.some((current) => current.value === value) && optionIndex === 0) ? 0 : -1}
                    onClick={() => select(option.value)}
                    onKeyDown={(event) => {
                      if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
                        event.preventDefault();
                        const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
                        select(flat[(optionIndex + direction + flat.length) % flat.length].value, true);
                      } else if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        select(option.value);
                      }
                    }}
                    className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--calc-accent)] focus-visible:ring-offset-2 ${
                      selected ? "border-[color:var(--calc-accent)] bg-[color:var(--calc-accent-soft)] font-bold text-[#1E293B] shadow-sm" : "border-slate-200 bg-white font-medium text-[#334155] hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block break-words">{option.label}</span>
                      {option.hint && <span className="mt-1 block break-words text-[10px] font-normal leading-4 opacity-75">{option.hint}</span>}
                    </span>
                    {selected && <span className="shrink-0 text-[10px] font-bold" aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Текстовое поле темпа в строгом формате `ММ:СС`: наружу уходит значение в минутах на километр. */
export function PaceField({ label, value, onValueChange }: { label: string; value: number | undefined; onValueChange: (value: number | undefined) => void }) {
  const [draft, setDraft] = useState(() => formatPaceMmSs(value ?? 0));
  const [error, setError] = useState<string | null>(null);
  const errorId = getNumericFieldErrorId("pace");

  useEffect(() => {
    if (value === undefined) {
      // Как и в NumericField: не зтираем невалидный черновик, иначе ошибка исчезает сразу.
      if (!error) {
        setDraft("");
        setError(null);
      }
      return;
    }
    if (parsePaceMmSs(draft) !== value) {
      setDraft(formatPaceMmSs(value));
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (nextDraft: string) => {
    setDraft(nextDraft);
    const parsed = parsePaceMmSs(nextDraft);
    const nextError = nextDraft.trim() === "" || parsed !== null ? null : paceFormatError;
    setError(nextError);
    onValueChange(parsed ?? undefined);
  };

  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#334155]">{label}</span>
      <input
        className={`${inputClass} ${error ? invalidInputClass : ""}`}
        type="text"
        inputMode="numeric"
        placeholder="06:40"
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <span id={errorId} className="mt-1.5 block text-xs leading-4 text-[#B91C1C]">{error}</span>}
    </label>
  );
}


export function ResultCard({ eyebrow, value, unit, note, accent = "#334155", compact = false }: {
  eyebrow: string;
  value: string;
  unit?: string;
  note?: string;
  accent?: string;
  compact?: boolean;
}) {
  return (
    <div className="relative min-w-0 rounded-2xl p-5" style={{ backgroundColor: `${accent}15` }}>
      <p className="min-w-0 break-normal text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>{eyebrow}</p>
      <p className={`mt-2 min-w-0 leading-tight text-[#1E293B] ${compact ? "text-2xl sm:text-4xl" : "text-3xl sm:text-4xl"}`}>
        <span className="inline-flex max-w-full items-baseline whitespace-nowrap tabular-nums">
          {value}
          {unit && <span className="ml-1 font-sans text-sm font-semibold text-[#64748B]">{unit}</span>}
        </span>
      </p>
      {note && <p className="mt-2 min-w-0 break-words text-xs leading-5 text-[#64748B]">{note}</p>}
    </div>
  );
}

/** Сообщение о состоянии, когда расчёт невозможен: не хватает данных или поле заполнено неверно. */
export function StateNote({ text, hint, action }: { text: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 text-sm text-[#475569]">
      <p>{text}</p>
      {hint && <p className="mt-1.5 text-xs leading-5">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function PrimaryButton({ label, disabled, reason, onClick }: { label: string; disabled: boolean; reason: string; onClick: () => void }) {
  const reasonId = "calc-primary-disabled-reason";
  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        disabled={disabled}
        aria-disabled={disabled || undefined}
        aria-describedby={disabled ? reasonId : undefined}
        onClick={onClick}
        className={`inline-flex h-11 items-center justify-center rounded-[14px] px-4 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--calc-accent)] focus-visible:ring-offset-2 ${
          disabled ? "cursor-not-allowed bg-[#CBD5E1] text-[#8496AB]" : "bg-[color:var(--calc-accent)] text-white transition hover:brightness-95"
        }`}
      >
        {label}
      </button>
      {disabled && <span id={reasonId} className="sr-only">{reason}</span>}
    </div>
  );
}

export function GhostButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center justify-center rounded-[14px] border border-slate-200 bg-white px-4 text-sm font-semibold text-[#334155] transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--calc-accent)] focus-visible:ring-offset-2"
    >
      {label}
    </button>
  );
}
