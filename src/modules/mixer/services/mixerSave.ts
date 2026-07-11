import type { MixerIngredient, MixerScenarioType, MixerOutcomeType } from '../types/mixer.types'

export interface SavedMixerDish {
  id: string
  name: string
  time: string
  tag: string
  category: string
  image: string | null
  ingredients: { name: string; status: 'green' | 'red' | 'yellow' }[]
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
  annaTip: string
  annaComment: string
  nutrientsDetail: string
  mixerIngredients: MixerIngredient[]
  scenarioType: MixerScenarioType
  outcomeType: MixerOutcomeType
  chargeLevel: number
  sourceAchievementId: string
}

let savedDishes: SavedMixerDish[] = []

export function saveMixerDish(dish: SavedMixerDish): void {
  savedDishes.unshift(dish)
  savedDishes = savedDishes.slice(0, 100)
}

export function getSavedDishes(): SavedMixerDish[] {
  return savedDishes
}
