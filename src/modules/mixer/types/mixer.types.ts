export type MixerScenarioType = 'positive' | 'negative'
export type MixerOutcomeType = 'A' | 'B' | 'C'
export type SpinSpeed = 'slow' | 'medium' | 'fast' | 'max'
export type AnnaPhase = 'loading' | 'phase1' | 'phase2'
export type CookingMethod = 'fry' | 'braise' | 'boil'

export interface MixerIngredient {
  name: string
  isForbidden: boolean
  image: string | null
}

export interface MixerNutrients {
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
}

export interface MixerMicronutrient {
  name: string
  value: string
  status: 'good' | 'moderate' | 'high'
}

export interface MixerResult {
  ingredients: MixerIngredient[]
  dishName: string
  nutrients: MixerNutrients
  micronutrients: MixerMicronutrient[]
  annaWaitingSpeech: string
  annaResultSpeech: string
  scenarioType: MixerScenarioType
  outcomeType: MixerOutcomeType
  cookingMethod: CookingMethod
  chargeLevel: number
  sourceAchievementId: string
}

export interface MixerGeminiPhase {
  text: string
  emotion: string
  intensity: number
}

export interface MixerGeminiResult {
  dishName: string
  phase1: MixerGeminiPhase
  nutrition: {
    calories: number
    protein: number
    fat: number
    carbs: number
    fiber: number
  }
  micronutrients: {
    name: string
    value: string
    level: 'good' | 'moderate' | 'high'
  }[]
  phase2: MixerGeminiPhase
}

export interface MixerConfig {
  achievementId: string
  achievementName: string
  achievementCategory: string
  achievementBackground: string
  scenarioType: MixerScenarioType
  userGender: 'male' | 'female' | null
  cookingMethod?: CookingMethod
}
