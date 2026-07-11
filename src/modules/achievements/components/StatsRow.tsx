'use client'

interface StatsRowProps {
  total: number
  unlocked: number
  xp: number
  legendary: number
  epic: number
}

export default function StatsRow({ total, unlocked, xp, legendary, epic }: StatsRowProps) {
  return (
    <div className="grid grid-cols-3 gap-2.5">
      <div className="bg-white rounded-2xl border border-zinc-100 p-3.5 flex flex-col items-center gap-1 shadow-sm">
        <span className="text-2xl font-black text-zinc-800">{unlocked}/{total}</span>
        <span className="text-[11px] font-semibold text-zinc-500 leading-tight text-center">Открыто</span>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-100 p-3.5 flex flex-col items-center gap-1 shadow-sm">
        <span className="text-2xl font-black text-zinc-800">{xp}</span>
        <span className="text-[11px] font-semibold text-zinc-500 leading-tight text-center">Всего XP</span>
      </div>
      <div className="bg-white rounded-2xl border border-zinc-100 p-3.5 flex flex-col items-center gap-1 shadow-sm">
        <span className="text-2xl font-black text-zinc-800">{legendary + epic}</span>
        <span className="text-[11px] font-semibold text-zinc-500 leading-tight text-center">Легенд+Эпик</span>
      </div>
    </div>
  )
}
