/* Плашка калькулятора: «парящая» карточка — миниатюра 40×40, название и пояснение в одну строку. */

import type { CalculatorDefinition } from "../lib/calculatorCatalog";

export function CalculatorCard({ calculator, onOpen }: { calculator: CalculatorDefinition; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 overflow-hidden rounded-[18px] border-[1.5px] border-white py-[3px] pl-2 pr-3.5 text-left shadow-[0_4px_14px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.03)] transition duration-150 ease-out active:scale-[0.995] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E293B]"
      style={{ backgroundColor: calculator.tint }}
      aria-label={`Открыть калькулятор «${calculator.title}»`}
      aria-describedby={`calculator-card-description-${calculator.id}`}
    >
      <img src={calculator.thumbnail} alt="" width={40} height={40} className="size-10 shrink-0 object-contain" draggable={false} />

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold leading-[1.2] text-[#1E293B]">{calculator.title}</span>
        <span id={`calculator-card-description-${calculator.id}`} className="block truncate text-[11.5px] font-normal leading-[1.2] text-[#64748B]">{calculator.description}</span>
      </span>
    </button>
  );
}
