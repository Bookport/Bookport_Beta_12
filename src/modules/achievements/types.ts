export type Rarity = 'Обычная' | 'Необычная' | 'Редкая' | 'Эпическая' | 'Легендарная'

export type AchievementType = 'positive' | 'negative'

export interface Achievement {
  id: string
  name: string
  category: string
  type: AchievementType
  rarity: Rarity
  xp: number
  background: string
  image: string
  isSecret: boolean
  supportsMixer: boolean
  isUnlocked: boolean
  isFreshUnlock: boolean
  isMixerConsumed: boolean
  descriptionMale: string
  descriptionFemale: string
}

export const RARITY_COLORS: Record<Rarity, { bg: string; border: string; text: string }> = {
  'Обычная':     { bg: 'bg-zinc-100',       border: 'border-zinc-300',     text: 'text-zinc-600' },
  'Необычная':   { bg: 'bg-emerald-100',     border: 'border-emerald-300',  text: 'text-emerald-700' },
  'Редкая':      { bg: 'bg-sky-100',         border: 'border-sky-300',      text: 'text-sky-700' },
  'Эпическая':   { bg: 'bg-violet-100',      border: 'border-violet-300',   text: 'text-violet-700' },
  'Легендарная': { bg: 'bg-amber-100',       border: 'border-amber-300',    text: 'text-amber-700' },
}
