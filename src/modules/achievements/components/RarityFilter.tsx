interface RarityFilterProps {
  labels: { value: string; label: string; color: string }[]
  selected: string
  onSelect: (value: string) => void
}

const ACTIVE_STYLES: Record<string, string> = {
  zinc: 'bg-zinc-400/20 border-zinc-400/50 text-zinc-200 shadow-[0_0_10px_rgba(161,161,170,0.25)]',
  emerald: 'bg-emerald-400/20 border-emerald-400/50 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.25)]',
  sky: 'bg-sky-400/20 border-sky-400/50 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.25)]',
  violet: 'bg-violet-400/20 border-violet-400/50 text-violet-200 shadow-[0_0_10px_rgba(167,139,250,0.25)]',
  amber: 'bg-amber-400/20 border-amber-400/50 text-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.25)]',
  slate: 'bg-white/20 border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.15)]',
}

export default function RarityFilter({ labels, selected, onSelect }: RarityFilterProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {labels.map((item) => {
        const isSelected = selected === item.value
        return (
          <button
            key={item.value}
            onClick={() => onSelect(item.value)}
            className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all duration-200 cursor-pointer active:scale-95 ${
              isSelected
                ? ACTIVE_STYLES[item.color] || 'bg-white/20 border-white/30 text-white'
                : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10 hover:text-zinc-300'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
