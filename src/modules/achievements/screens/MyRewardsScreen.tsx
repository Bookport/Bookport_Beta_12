import { useState, useMemo, useEffect } from 'react'
import { useAppStore } from "../../../store/useAppStore"
import { ACHIEVEMENTS } from '../config/achievementContent'
import { CATEGORY_FILTER_LABELS, RARITY_FILTER_LABELS, ALL_CATEGORY_FILTER, ALL_RARITY_FILTER } from '../config/filterConfig'
import type { Achievement } from '../types'
import StatsRow from '../components/StatsRow'
import FilterChips from '../components/FilterChips'
import RarityFilter from '../components/RarityFilter'
import ShowUnearnedToggle from '../components/ShowUnearnedToggle'
import RewardCard from '../components/RewardCard'
import AchievementModal from '../components/AchievementModal'
import { achievementEngine } from '../engine/AchievementEngine'

import type { MixerConfig } from '../../mixer/types/mixer.types'

interface MyRewardsScreenProps {
  onBack?: () => void
  userGender?: 'male' | 'female'
  isGodMode?: boolean
  onMixerLaunch?: (config: any) => void
}

export default function MyRewardsScreen({
  onBack: propsOnBack,
  userGender = 'female',
  isGodMode: _isGodModeProp = false,
  onMixerLaunch = () => {},
}: MyRewardsScreenProps) {
  const setScreen = useAppStore((s) => s.setScreen)
  const onBack = propsOnBack || (() => setScreen('my-day'))
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL_CATEGORY_FILTER)
  const [rarityFilter, setRarityFilter] = useState<string>(ALL_RARITY_FILTER)
  const [showUnearned, setShowUnearned] = useState<boolean>(true)
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null)
  const [updateTrigger, setUpdateTrigger] = useState(0)

  useEffect(() => {
    const handler = () => setUpdateTrigger(t => t + 1)
    window.addEventListener('show-achievement-overlay', handler)
    return () => window.removeEventListener('show-achievement-overlay', handler)
  }, [])

  const unlockedIds = achievementEngine.getUnlockedIds()

  const achievements = useMemo(() => {
    return ACHIEVEMENTS.map((a) => {
      const isUnlocked = unlockedIds.includes(a.id)
      return {
        ...a,
        isUnlocked,
        isFreshUnlock: false,
      }
    })
  }, [unlockedIds, updateTrigger])

  const filtered = useMemo(() => {
    return achievements.filter((a) => {
      if (categoryFilter !== ALL_CATEGORY_FILTER && a.category !== categoryFilter) return false
      if (rarityFilter !== ALL_RARITY_FILTER && a.rarity !== rarityFilter) return false
      if (!showUnearned && !a.isUnlocked) return false
      return true
    })
  }, [achievements, categoryFilter, rarityFilter, showUnearned])

  const unlockedCount = achievements.filter((a) => a.isUnlocked).length
  const legendaryCount = achievements.filter((a) => a.rarity === 'Легендарная' && a.isUnlocked).length
  const epicCount = achievements.filter((a) => a.rarity === 'Эпическая' && a.isUnlocked).length
  const totalXp = achievements.filter((a) => a.isUnlocked).reduce((sum, a) => sum + a.xp, 0)

  function handleMixer(achievement: Achievement) {
    onMixerLaunch?.({
      achievementId: achievement.id,
      achievementName: achievement.name,
      achievementCategory: achievement.category || '',
      achievementBackground: achievement.background || '',
      scenarioType: (achievement.type === 'positive' ? 'positive' : 'negative'),
      userGender,
    })
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-gradient-to-b from-[#0f111a] via-[#151824] to-[#0f111a] text-white">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 pt-3 pb-1">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Назад
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 pb-6 min-h-0 scrollbar-thin space-y-4">

        {/* Title section */}
        <div className="pt-1">
          <h1 className="text-[26px] font-black tracking-tight">
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
              Зал Славы
            </span>
          </h1>
          <p className="text-sm font-medium text-zinc-500 mt-0.5">
            Твоя коллекция трофеев за 28 дней курса
          </p>
        </div>

        {/* Stats */}
        <StatsRow
          total={achievements.length}
          unlocked={unlockedCount}
          xp={totalXp}
          legendary={legendaryCount}
          epic={epicCount}
        />

        {/* Filters */}
        <div className="space-y-2.5">
          <FilterChips labels={CATEGORY_FILTER_LABELS} selected={categoryFilter} onSelect={setCategoryFilter} />
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <RarityFilter labels={RARITY_FILTER_LABELS} selected={rarityFilter} onSelect={setRarityFilter} />
            </div>
            <div className="shrink-0">
              <ShowUnearnedToggle value={showUnearned} onChange={setShowUnearned} />
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((achievement) => (
            <RewardCard
              key={achievement.id}
              achievement={achievement}
              onSelect={setSelectedAchievement}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-sm text-zinc-500 font-semibold mt-12">
            Нет ачивок по выбранным фильтрам
          </p>
        )}
      </div>

      {/* Detail modal */}
      {selectedAchievement && (
        <AchievementModal
          achievement={selectedAchievement}
          userGender={userGender}
          onClose={() => setSelectedAchievement(null)}
          onMixer={handleMixer}
        />
      )}
    </div>
  )
}
