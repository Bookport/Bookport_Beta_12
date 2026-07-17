import type { MixerIngredient, MixerScenarioType, MixerOutcomeType } from '../types/mixer.types'
import { api } from '../../../utils/api'

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

  // Persist to server — fire-and-forget
  api("/api/saved-dishes", {
    method: "POST",
    body: {
      name: dish.name,
      image: null,
      category: "Миксер",
      tag: "Миксер",
      isNew: false,
      sourceType: "mixer",
      ingredients: dish.ingredients,
      calories: dish.calories,
      protein: String(dish.protein),
      fiber: String(dish.fiber),
      fat: String(dish.fat),
      annaTip: dish.annaTip,
      annaComment: dish.annaComment,
    },
  }).then((res: any) => {
    if (res?.id) {
      // Update in-memory entry with server-assigned id for future dedup
      const idx = savedDishes.findIndex(d => d.id === dish.id);
      if (idx !== -1) {
        savedDishes[idx] = { ...savedDishes[idx], id: res.id };
      }
    }
  }).catch(() => {});
}

export function getSavedDishes(): SavedMixerDish[] {
  return savedDishes
}
