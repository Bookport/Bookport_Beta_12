interface FilterChipsProps {
  labels: { value: string; label: string }[]
  selected: string
  onSelect: (value: string) => void
}

const ACTIVE_BG: Record<string, string> = {
  'Анна и ты': 'bg-rose-500/30 border-rose-400/60 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.3)]',
  'Гидрация': 'bg-sky-500/30 border-sky-400/60 text-sky-200 shadow-[0_0_12px_rgba(14,165,233,0.3)]',
  'Дисциплина': 'bg-amber-500/30 border-amber-400/60 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
  'Ежедневные': 'bg-teal-500/30 border-teal-400/60 text-teal-200 shadow-[0_0_12px_rgba(20,184,166,0.3)]',
  'Злодей': 'bg-fuchsia-500/30 border-fuchsia-400/60 text-fuchsia-200 shadow-[0_0_12px_rgba(217,70,239,0.3)]',
  'Знаток': 'bg-indigo-500/30 border-indigo-400/60 text-indigo-200 shadow-[0_0_12px_rgba(99,102,241,0.3)]',
  'Мастерство': 'bg-yellow-500/30 border-yellow-400/60 text-yellow-200 shadow-[0_0_12px_rgba(234,179,8,0.3)]',
  'Первые шаги': 'bg-emerald-500/30 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.3)]',
  'Питание': 'bg-lime-500/30 border-lime-400/60 text-lime-200 shadow-[0_0_12px_rgba(101,163,13,0.3)]',
  'Показатели': 'bg-cyan-500/30 border-cyan-400/60 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.3)]',
  'Секретные': 'bg-violet-500/30 border-violet-400/60 text-violet-200 shadow-[0_0_12px_rgba(139,92,246,0.3)]',
  'Сон': 'bg-slate-500/30 border-slate-400/60 text-slate-200 shadow-[0_0_12px_rgba(100,116,139,0.3)]',
  'Социальный': 'bg-pink-500/30 border-pink-400/60 text-pink-200 shadow-[0_0_12px_rgba(236,72,153,0.3)]',
  'Активность': 'bg-orange-500/30 border-orange-400/60 text-orange-200 shadow-[0_0_12px_rgba(249,115,22,0.3)]',
}

export default function FilterChips({ labels, selected, onSelect }: FilterChipsProps) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin -mx-4 px-4">
      {labels.map((item) => {
        const isAll = item.value === '__all_categories__'
        const isSelected = selected === item.value

        return (
          <button
            key={item.value}
            onClick={() => onSelect(item.value)}
            className={`shrink-0 text-xs font-bold px-3.5 py-2 rounded-xl border transition-all duration-200 cursor-pointer active:scale-95 whitespace-nowrap ${
              isSelected
                ? isAll
                  ? 'bg-white/20 border-white/30 text-white shadow-[0_0_10px_rgba(255,255,255,0.15)]'
                  : ACTIVE_BG[item.label] || 'bg-white/20 border-white/30 text-white'
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
