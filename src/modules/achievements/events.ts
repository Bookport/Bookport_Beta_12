export interface IngredientSnapshot {
  name: string
  status: string
  manuallyAllowed?: boolean
}

export interface SavedDishSnapshot {
  id: string
  tag: string
  protein: string
  isMixerGenerated?: boolean
  dayIndex?: number
  ingredients: IngredientSnapshot[]
}

export interface AchievementStateSnapshot {
  savedDishes: SavedDishSnapshot[]
  water: number
  sleep: number
  mealCount: number
  clickCount: number
  habitsDone: number
  currentDayIndex: number
  dayNotes: Record<number, unknown[]>
  weight: number
  systolic: number
  initialWeight: number
  initialSystolic: number
  overlayState: string | null
}

export type AchievementEvent =
  | { type: 'app:initialized' }
  | { type: 'course:started' }
  | { type: 'state:updated'; snapshot: AchievementStateSnapshot }
  | { type: 'ingredient:card_viewed' }
  | { type: 'anna:interrupted'; overlayState: string }
  | { type: 'anna:speaking_completed' }
  | { type: 'social:shared' }
  | { type: 'mixer:jackpot_won' }
