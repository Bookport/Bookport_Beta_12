import { useState, useCallback, useRef } from 'react'
import type { MixerConfig, MixerIngredient, MixerOutcomeType, MixerGeminiResult, MixerNutrients, MixerMicronutrient, CookingMethod } from '../types/mixer.types'
import { selectIngredients, generateMixerResult } from '../services/mixerAI'
import { saveMixerDish, type SavedMixerDish } from '../services/mixerSave'

export function useMixerLogic(config: MixerConfig) {
  const initialSelected = useRef(selectIngredients(config.scenarioType))
  const [ingredients, setIngredients] = useState<MixerIngredient[]>(initialSelected.current.ingredients)
  const [outcomeType, setOutcomeType] = useState<MixerOutcomeType>(initialSelected.current.outcomeType)
  const [geminiResult, setGeminiResult] = useState<MixerGeminiResult | null>(null)
  const [isGeminiLoading, setIsGeminiLoading] = useState(false)
  const [savedDish, setSavedDish] = useState<SavedMixerDish | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeRef = useRef(true)

  const doSave = useCallback((
    result: MixerGeminiResult,
    outcome: MixerOutcomeType,
    charge: number,
  ) => {
    const dish: SavedMixerDish = {
      id: `mixer_${Date.now()}`,
      name: result.dishName,
      time: new Date().toLocaleString('ru-RU'),
      tag: 'Миксер',
      category: 'Миксер',
      image: null,
      ingredients: ingredients.map(i => ({
        name: i.name,
        status: i.isForbidden ? 'red' as const : 'green' as const,
      })),
      calories: result.nutrition.calories,
      protein: result.nutrition.protein,
      fat: result.nutrition.fat,
      carbs: result.nutrition.carbs,
      fiber: result.nutrition.fiber,
      annaTip: result.phase2.text,
      annaComment: result.phase1.text,
      nutrientsDetail: result.micronutrients.map(m => `${m.name}: ${m.value}`).join(', '),
      mixerIngredients: ingredients,
      scenarioType: config.scenarioType,
      outcomeType: outcome,
      chargeLevel: charge,
      sourceAchievementId: config.achievementId,
    }
    saveMixerDish(dish)
    setSavedDish(dish)
  }, [ingredients, config])

  const triggerSpin = useCallback(async (chargeLevel: number, cookingMethod: CookingMethod) => {
    if (isGeminiLoading) return
    setIsGeminiLoading(true)
    setGeminiResult(null)
    setError(null)
    setSavedDish(null)

    try {
      const result = await generateMixerResult({
        ingredients,
        outcomeType,
        scenarioType: config.scenarioType,
        userGender: config.userGender,
        chargeLevel,
        cookingMethod,
        achievementName: config.achievementName || '',
        achievementCategory: config.achievementCategory,
      })
      if (!activeRef.current) return
      setGeminiResult(result)
      doSave(result, outcomeType, chargeLevel)
    } catch (e: any) {
      if (!activeRef.current) return
      setError(e.message || 'Ошибка генерации')
    } finally {
      if (activeRef.current) setIsGeminiLoading(false)
    }
  }, [ingredients, outcomeType, config, isGeminiLoading, doSave])

  const forceResult = useCallback(async (
    forcedOutcome: MixerOutcomeType,
    chargeLevel: number = 5,
    cookingMethod: CookingMethod = 'braise',
  ) => {
    setOutcomeType(forcedOutcome)
    setIsGeminiLoading(true)
    setGeminiResult(null)
    setError(null)
    setSavedDish(null)

    try {
      const result = await generateMixerResult({
        ingredients,
        outcomeType: forcedOutcome,
        scenarioType: config.scenarioType,
        userGender: config.userGender,
        chargeLevel,
        cookingMethod,
        achievementName: config.achievementName || '',
        achievementCategory: config.achievementCategory,
      })
      if (!activeRef.current) return
      setGeminiResult(result)
      doSave(result, forcedOutcome, chargeLevel)
    } catch (e: any) {
      if (!activeRef.current) return
      setError(e.message || 'Ошибка генерации')
    } finally {
      if (activeRef.current) setIsGeminiLoading(false)
    }
  }, [ingredients, config, doSave])

  const reset = useCallback(() => {
    const s = selectIngredients(config.scenarioType)
    setIngredients(s.ingredients)
    setOutcomeType(s.outcomeType)
    setGeminiResult(null)
    setIsGeminiLoading(false)
    setSavedDish(null)
    setError(null)
  }, [config.scenarioType])

  const nutrients: MixerNutrients | null = geminiResult ? geminiResult.nutrition : null
  const micronutrients: MixerMicronutrient[] = geminiResult
    ? geminiResult.micronutrients.map(m => ({
        name: m.name,
        value: m.value,
        status: m.level as MixerMicronutrient['status'],
      }))
    : []

  return {
    ingredients,
    outcomeType,
    geminiResult,
    isGeminiLoading,
    savedDish,
    error,
    nutrients,
    micronutrients,
    triggerSpin,
    forceResult,
    reset,
  }
}
