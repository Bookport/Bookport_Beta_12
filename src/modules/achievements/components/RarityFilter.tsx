'use client'

interface RarityFilterProps {
  labels: { value: string; label: string; color: string }[]
  selected: string
  onSelect: (value: string) => void
}

function chipStyle(color: string, isSelected: boolean): string {
  if (isSelected) {
    switch (color) {
      case 'zinc':    return 'bg-zinc-100 text-zinc-700 border-zinc-400'
      case 'emerald': return 'bg-emerald-100 text-emerald-700 border-emerald-400'
      case 'sky':     return 'bg-sky-100 text-sky-700 border-sky-400'
      case 'violet':  return 'bg-violet-100 text-violet-700 border-violet-400'
      case 'amber':   return 'bg-amber-100 text-amber-700 border-amber-400'
      default:        return 'bg-zinc-800 text-white border-zinc-800 shadow-sm'
    }
  }
  return 'bg-white text-zinc-500 border-zinc-200 hover:bg-zinc-50'
}

export default function RarityFilter({ labels, selected, onSelect }: RarityFilterProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {labels.map((item) => (
        <button
          key={item.value}
          onClick={() => onSelect(item.value)}
          className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer active:scale-95 ${chipStyle(item.color, selected === item.value)}`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
