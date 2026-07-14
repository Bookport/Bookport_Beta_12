interface StatsRowProps {
  total: number
  unlocked: number
  xp: number
  legendary: number
  epic: number
}

export default function StatsRow({ total, unlocked, xp, legendary, epic }: StatsRowProps) {
  const pct = total > 0 ? (unlocked / total) * 100 : 0

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-2xl font-black text-white">{unlocked}</span>
            <span className="text-sm font-semibold text-zinc-400 ml-1">/ {total}</span>
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-0.5">Открыто</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <span className="text-2xl font-black text-amber-400">{xp}</span>
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-0.5">Всего XP</div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <span className="text-2xl font-black text-purple-400">{legendary + epic}</span>
            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mt-0.5">Легенд+Эпик</div>
          </div>
        </div>
      </div>

      <div className="relative h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(pct, 100)}%`,
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)',
            boxShadow: '0 0 8px #fbbf24, 0 0 20px #f59e0b66',
          }}
        />
      </div>
    </div>
  )
}
