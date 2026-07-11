import { CATEGORY_COLORS, ALL_CATEGORY_COLORS } from '../config/filterConfig'

interface FilterChipsProps {
  labels: { value: string; label: string }[]
  selected: string
  onSelect: (value: string) => void
}

export default function FilterChips({ labels, selected, onSelect }: FilterChipsProps) {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin -mx-4 px-4">
      {labels.map((item) => {
        const isAll = item.value === '__all_categories__'
        const colors = isAll ? ALL_CATEGORY_COLORS : CATEGORY_COLORS[item.label]
        const isSelected = selected === item.value

        return (
          <button
            key={item.value}
            onClick={() => onSelect(item.value)}
            className={`shrink-0 text-xs font-bold px-4 py-2 rounded-lg border transition-all duration-200 cursor-pointer active:scale-95 ${
              isSelected
                ? `${colors.tabBg} text-white ${colors.tabBorder} shadow-sm`
                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
