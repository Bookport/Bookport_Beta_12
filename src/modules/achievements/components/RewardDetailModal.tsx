// @ts-nocheck — Legacy file, replaced by AchievementModal.tsx
'use client'

import type { Achievement } from '../types'
import { GROUP_LABELS, RARITY_COLORS } from '../types'
import { X } from 'lucide-react'

interface RewardDetailModalProps {
  achievement: Achievement
  onClose: () => void
}

export default function RewardDetailModal({ achievement, onClose }: RewardDetailModalProps) {
  const { name, group, rarity, xp, unlocked, triggerDescription, fullDescription } = achievement
  const rarityColors = RARITY_COLORS[rarity]

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] overflow-hidden shadow-2xl">
        {/* Image placeholder */}
        <div className={`w-full aspect-square flex items-center justify-center text-6xl ${unlocked ? 'bg-gradient-to-br from-emerald-50 via-emerald-100 to-emerald-50' : 'bg-zinc-100'}`}>
          {unlocked ? '🏆' : '🔒'}
        </div>

        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-1">
              <h2 className="text-xl font-black text-zinc-800">{name}</h2>
              <span className="text-sm font-semibold text-zinc-500">{GROUP_LABELS[group]}</span>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 transition-colors cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${rarityColors.bg} ${rarityColors.border} ${rarityColors.text}`}>
              {rarity}
            </span>
            {unlocked && xp > 0 && (
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                +{xp} XP
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <h4 className="text-xs font-black text-zinc-700 uppercase tracking-wider mb-1">Когда появляется:</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">{triggerDescription}</p>
            </div>
            <div>
              <h4 className="text-xs font-black text-zinc-700 uppercase tracking-wider mb-1">Описание:</h4>
              <p className="text-sm text-zinc-600 leading-relaxed">{fullDescription}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
