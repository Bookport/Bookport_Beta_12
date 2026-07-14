import { useState } from 'react'
import type { Achievement, Rarity } from '../types'
import { getArtUrl } from '../utils/imageMap'

interface RewardCardProps {
  achievement: Achievement
  onSelect: (achievement: Achievement) => void
}

const RARITY_GLOW: Record<Rarity, { gradient: string; blur: string; animate?: string; border: string }> = {
  'Обычная':     { gradient: 'from-slate-400/15 to-slate-500/15', blur: 'blur-xl',       border: 'border-white/10' },
  'Необычная':   { gradient: 'from-emerald-400/20 to-emerald-500/20', blur: 'blur-xl',      border: 'border-emerald-500/20' },
  'Редкая':      { gradient: 'from-blue-400/25 to-blue-500/25',   blur: 'blur-2xl',     border: 'border-blue-500/25' },
  'Эпическая':   { gradient: 'from-purple-400/30 to-purple-500/30', blur: 'blur-2xl',     border: 'border-purple-500/30' },
  'Легендарная': { gradient: 'from-amber-400/35 to-amber-500/35', blur: 'blur-3xl',     border: 'border-amber-500/35', animate: 'animate-pulse' },
}

const RARITY_BORDER_HOVER: Record<string, string> = {
  'Обычная':     'hover:shadow-[0_0_20px_rgba(148,163,184,0.3)]',
  'Необычная':   'hover:shadow-[0_0_20px_rgba(52,211,153,0.3)]',
  'Редкая':      'hover:shadow-[0_0_25px_rgba(56,189,248,0.35)]',
  'Эпическая':   'hover:shadow-[0_0_30px_rgba(167,139,250,0.4)]',
  'Легендарная': 'hover:shadow-[0_0_40px_rgba(251,191,36,0.5)]',
}

export default function RewardCard({ achievement, onSelect }: RewardCardProps) {
  const { name, category, type, rarity, xp, isUnlocked, isSecret, image } = achievement
  const [imgError, setImgError] = useState(false)
  const artUrl = image && !imgError ? getArtUrl(image) : undefined
  const glow = RARITY_GLOW[rarity]
  const hoverGlow = RARITY_BORDER_HOVER[rarity] || ''

  const isLocked = !isUnlocked
  const showCard = !isLocked || !isSecret

  if (!showCard) return null

  return (
    <button
      onClick={() => onSelect(achievement)}
      className={`
        relative flex flex-col rounded-3xl overflow-hidden text-left
        transition-all duration-300 cursor-pointer group
        bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-lg
        border ${glow.border}
        ${hoverGlow}
        hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]
        active:scale-[0.97]
        ${isLocked ? 'opacity-80' : ''}
      `}
    >
      {/* Rarity glow circle behind the image */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 aspect-square rounded-full pointer-events-none z-0 transition-all duration-500 group-hover:scale-125 group-hover:opacity-100">
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${glow.gradient} ${glow.blur} ${glow.animate || ''}`} />
      </div>

      {/* Art area */}
      <div className="relative w-full aspect-square flex items-center justify-center overflow-hidden z-10">
        {artUrl ? (
          <img
            src={artUrl}
            alt={name}
            className={`w-full h-full object-cover transition-all duration-300 ${
              isLocked ? 'grayscale contrast-125 opacity-40 blur-sm' : ''
            }`}
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={`text-4xl transition-all duration-300 ${isLocked ? 'opacity-40' : ''}`}>
            {isUnlocked ? '🏆' : '🔒'}
          </span>
        )}

        {/* Lock overlay */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/10">
            <div className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Info area */}
      <div className="relative z-10 p-3 flex flex-col gap-1.5">
        <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-400">
          {category}
        </span>
        <span className={`text-sm font-black leading-tight line-clamp-2 transition-colors duration-200 ${
          isLocked ? 'text-zinc-400' : 'text-white'
        }`}>
          {name}
        </span>

        <div className="flex items-center justify-between mt-1">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${
            rarity === 'Обычная' ? 'border-zinc-500/40 text-zinc-300' :
            rarity === 'Необычная' ? 'border-emerald-500/40 text-emerald-300' :
            rarity === 'Редкая' ? 'border-sky-500/40 text-sky-300' :
            rarity === 'Эпическая' ? 'border-violet-500/40 text-violet-300' :
            'border-amber-500/40 text-amber-300'
          }`}>
            {rarity}
          </span>
          {isUnlocked && xp > 0 && (
            <span className="text-[10px] font-black text-amber-400">+{xp}</span>
          )}
        </div>
      </div>
    </button>
  )
}
