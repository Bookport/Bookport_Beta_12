import type { Achievement } from '../types'
import { RARITY_COLORS } from '../types'
import { CATEGORY_COLORS, ALL_CATEGORY_COLORS } from '../config/filterConfig'
import { getArtUrl } from '../utils/imageMap'
import { useState } from 'react'

interface RewardCardProps {
  achievement: Achievement
  onSelect: (achievement: Achievement) => void
}

export default function RewardCard({ achievement, onSelect }: RewardCardProps) {
  const { name, category, type, rarity, xp, isUnlocked, image } = achievement
  const rarityColors = RARITY_COLORS[rarity]
  const [imgError, setImgError] = useState(false)
  const artUrl = image && !imgError ? getArtUrl(image) : undefined

  const colorScheme = CATEGORY_COLORS[category] || ALL_CATEGORY_COLORS
  const isNegative = type === 'negative'

  return (
    <button
      onClick={() => onSelect(achievement)}
      className={`relative flex flex-col rounded-2xl border overflow-hidden text-left transition-all duration-200 cursor-pointer active:scale-[0.97] ${
        isNegative
          ? `${colorScheme.bg} border-red-200 shadow-sm`
          : isUnlocked
            ? `${colorScheme.bg} ${colorScheme.border} shadow-sm hover:shadow-md`
            : 'bg-zinc-50 border-zinc-100 opacity-75'
      }`}
    >
      <div className={`w-full aspect-square flex items-center justify-center overflow-hidden relative ${
        isNegative
          ? 'bg-gradient-to-br from-red-50 via-red-100 to-red-50'
          : 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50'
      }`}>
        {artUrl ? (
          <img
            src={artUrl}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-3xl">{isUnlocked ? '🏆' : '🔒'}</span>
        )}
        {isNegative && (
          <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
        )}
      </div>

      <div className="p-2.5 flex flex-col gap-1.5">
        <span className={`text-[11px] font-bold leading-tight line-clamp-1 ${colorScheme.text}`}>
          {category}
        </span>
        <span className="text-sm font-black text-zinc-800 leading-tight line-clamp-2">{name}</span>

        <div className="flex items-center justify-between mt-0.5">
          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full border ${rarityColors.bg} ${rarityColors.border} ${rarityColors.text}`}>
            {rarity}
          </span>
          {isUnlocked && xp > 0 && (
            <span className="text-[10px] font-black text-emerald-600">+{xp}</span>
          )}
        </div>
      </div>
    </button>
  )
}
