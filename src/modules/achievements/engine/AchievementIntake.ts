import { achievementEngine } from './AchievementEngine'
import type { AchievementStateSnapshot } from '../events'
import { SystemKeysStore } from '../../../services/SystemKeysStore'

let morningWaterStreak = 0
let morningWaterLastDay = 0
let viewedIngredientCards: string[] = []
let annaInterruptionStreak = 0

function evaluateGroup1(snapshot: AchievementStateSnapshot): void {
  const { savedDishes, currentDayIndex } = snapshot
  const nonMixerDishes = savedDishes.filter(d => !d.isMixerGenerated)

  achievementEngine.evaluateTrigger('ach-081', savedDishes.length === 1)

  const firstClean = nonMixerDishes.some(d => d.ingredients.every(i => i.status === 'green'))
  achievementEngine.evaluateTrigger('ach-082', firstClean)

  achievementEngine.evaluateTrigger('ach-083', currentDayIndex === 7)

  if (savedDishes.length === 0) return

  const distinctTypes = new Set(nonMixerDishes.map(d => d.tag))
  achievementEngine.evaluateTrigger('ach-026', distinctTypes.size >= 4)

  let broccoliCount = 0
  for (const dish of nonMixerDishes) {
    for (const ing of dish.ingredients) {
      if (ing.name.toLowerCase().includes('броккол')) broccoliCount++
    }
  }
  achievementEngine.evaluateTrigger('ach-019', broccoliCount >= 10)

  const latest = nonMixerDishes[0]
  if (latest) {
    const proteinVal = parseFloat(latest.protein) || 0
    achievementEngine.evaluateTrigger('ach-017', proteinVal >= 30)
  }

  achievementEngine.evaluateTrigger('ach-032', savedDishes.length >= 50)

  const chronological = [...nonMixerDishes].reverse()
  let violationStreak = 0
  let perfectStreak = 0
  let totalViolationsCount = 0
  for (const dish of chronological) {
    const isClean = dish.ingredients.every(i => i.status === 'green')
    if (isClean) {
      perfectStreak++
      violationStreak = 0
    } else {
      violationStreak++
      totalViolationsCount++
      perfectStreak = 0
    }
  }

  achievementEngine.evaluateTrigger('ach-002', violationStreak >= 10)
  achievementEngine.evaluateTrigger('ach-003', perfectStreak >= 3)
  achievementEngine.evaluateTrigger('ach-024', perfectStreak >= 10)
  achievementEngine.evaluateTrigger('ach-004', currentDayIndex >= 30 && totalViolationsCount === 0)

  const uniqueDays = [...new Set(nonMixerDishes.map(d => d.dayIndex).filter(Boolean))].sort((a, b) => a - b)
  const last7Days = uniqueDays.slice(-7)

  if (last7Days.length >= 7) {
    let meatFree = true
    let sugarFree = true

    for (const day of last7Days) {
      const dayDishes = nonMixerDishes.filter(d => d.dayIndex === day)
      for (const dish of dayDishes) {
        for (const ing of dish.ingredients) {
          const lower = ing.name.toLowerCase()
          if (lower.includes('мяс') || lower.includes('кур') || lower.includes('говяд') ||
              lower.includes('свинин') || lower.includes('баранин') || lower.includes('индейк') ||
              lower.includes('утк') || lower.includes('рыб') || lower.includes('кревет')) {
            meatFree = false
          }
          if ((lower.includes('сахар') && !lower.includes('сахарозам')) ||
              lower.includes('фруктоз') || lower.includes('глюкоз') || lower.includes('сироп')) {
            sugarFree = false
          }
        }
      }
    }

    achievementEngine.evaluateTrigger('ach-015', meatFree)
    achievementEngine.evaluateTrigger('ach-016', sugarFree)
  }
}

function evaluateGroup2(snapshot: AchievementStateSnapshot): void {
  const { water, currentDayIndex, weight } = snapshot
  const goal = SystemKeysStore.getDailyWaterGoal()

  const logs: Record<number, { amount: number; time: string; timestamp: number }[]> = {}
  const todayEntries = logs[currentDayIndex] || []
  const allEntries = Object.values(logs).flat()

  const dailySums: Record<number, number> = {}
  for (const [day, entries] of Object.entries(logs)) {
    dailySums[Number(day)] = entries.reduce((sum, e) => sum + e.amount, 0)
  }

  achievementEngine.evaluateTrigger('ach-008', allEntries.length === 1)

  const latest = todayEntries[todayEntries.length - 1]
  if (latest) {
    const hour = parseInt(latest.time.split(':')[0], 10)
    achievementEngine.evaluateTrigger('ach-009', !isNaN(hour) && hour < 9)
  }

  const todayBefore8 = todayEntries.some(e => {
    const h = parseInt(e.time.split(':')[0], 10)
    return !isNaN(h) && h < 8
  })
  if (todayBefore8 && morningWaterLastDay !== currentDayIndex) {
    morningWaterStreak++
    morningWaterLastDay = currentDayIndex
    achievementEngine.evaluateTrigger('ach-010', morningWaterStreak >= 5)
  } else if (!todayBefore8 && morningWaterLastDay !== currentDayIndex) {
    morningWaterStreak = 0
    morningWaterLastDay = currentDayIndex
  }

  achievementEngine.evaluateTrigger('ach-011', water >= goal)

  let goalStreak = 0
  for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 6); day--) {
    if ((dailySums[day] || 0) >= goal) {
      goalStreak++
    } else {
      break
    }
  }
  achievementEngine.evaluateTrigger('ach-012', goalStreak >= 7)

  achievementEngine.evaluateTrigger('ach-013', water >= goal + 1000)

  let zeroStreak = 0
  for (let day = currentDayIndex; day >= Math.max(1, currentDayIndex - 3); day--) {
    if ((dailySums[day] || 0) === 0) {
      zeroStreak++
    } else {
      break
    }
  }
  achievementEngine.evaluateTrigger('ach-014', zeroStreak >= 4)
}

function evaluateGroup3(snapshot: AchievementStateSnapshot): void {
  const { weight, initialWeight, systolic, initialSystolic } = snapshot
  achievementEngine.evaluateTrigger('ach-076', weight !== initialWeight || systolic !== initialSystolic)
}

function evaluateGroup4(snapshot: AchievementStateSnapshot): void {
  const { savedDishes } = snapshot
  if (savedDishes.length === 0) return
  const nonMixerDishes = savedDishes.filter(d => !d.isMixerGenerated)

  const hasManualOverride = nonMixerDishes.some(d =>
    d.ingredients.some(i => i.manuallyAllowed === true)
  )
  achievementEngine.evaluateTrigger('ach-064', hasManualOverride)

  const hasShockDish = nonMixerDishes.some(d => {
    const categories: string[] = []
    const lowerNames = d.ingredients.map(i => i.name.toLowerCase())

    const hasAnimal = lowerNames.some(n =>
      n.includes('мяс') || n.includes('кур') || n.includes('говяд') ||
      n.includes('свинин') || n.includes('баранин') || n.includes('утк') ||
      n.includes('индейк') || n.includes('рыб') || n.includes('кревет')
    )
    if (hasAnimal) categories.push('animal')

    const hasDairy = lowerNames.some(n =>
      n.includes('молок') || n.includes('сливк') || n.includes('сыр') ||
      n.includes('творог') || n.includes('масл')
    )
    if (hasDairy) categories.push('dairy')

    const hasEgg = lowerNames.some(n =>
      n.includes('яйц') || n.includes('яич')
    )
    if (hasEgg) categories.push('egg')

    return categories.length >= 2
  })
  achievementEngine.evaluateTrigger('ach-001', hasShockDish)

  let meatDishCount = 0
  for (const dish of nonMixerDishes) {
    const hasMeat = dish.ingredients.some(i => {
      const lower = i.name.toLowerCase()
      return lower.includes('мяс') || lower.includes('птиц') || lower.includes('куриц') || lower.includes('говяд') || lower.includes('свинин') || lower.includes('баранин') || lower.includes('индейк') || lower.includes('утк')
    })
    if (hasMeat) meatDishCount++
  }
  achievementEngine.evaluateTrigger('ach-023', meatDishCount >= 5)

  const hasMayo = nonMixerDishes.some(d =>
    d.ingredients.some(i => {
      const lower = i.name.toLowerCase()
      return lower.includes('майонез') || lower.includes('кетчуп') || lower.includes('соус')
    })
  )
  achievementEngine.evaluateTrigger('ach-022', hasMayo)
}

function evaluateGroup5(snapshot: AchievementStateSnapshot): void {
  const { sleep } = snapshot
  const logs: { sleepTime: string; duration: number }[] = []
  const sorted = [...logs].sort((a, b) => a.sleepTime.localeCompare(b.sleepTime))

  achievementEngine.evaluateTrigger('ach-041', sorted.length === 1)

  if (sorted.length > 0) {
    const latest = sorted[sorted.length - 1]

    achievementEngine.evaluateTrigger('ach-039', latest.sleepTime <= "22:00")

    const sleepParts = latest.sleepTime.split(':')
    const sleepHour = parseInt(sleepParts[0], 10)
    achievementEngine.evaluateTrigger('ach-040', !isNaN(sleepHour) && sleepHour >= 2 && sleepHour <= 4)

    const last3 = sorted.slice(-3)
    achievementEngine.evaluateTrigger('ach-037', last3.length >= 3 && last3.every(e => e.duration >= 480))
    achievementEngine.evaluateTrigger('ach-043', last3.length >= 3 && last3.every(e => e.duration < 300))
  }
}

function evaluateGroup6(snapshot: AchievementStateSnapshot): void {
  const { currentDayIndex } = snapshot
  const logs: Record<number, unknown[]> = {}
  const todayEntries = logs[currentDayIndex] || []
  const todayTotalSec = (todayEntries as any[]).reduce((sum: number, e: any) => sum + (e.duration || 0), 0) as number

  achievementEngine.evaluateTrigger('ach-048', todayTotalSec >= 1800)
  achievementEngine.evaluateTrigger('ach-049', todayTotalSec >= 3600)

  let consecutiveZeroDays = 0
  for (let i = currentDayIndex; i >= Math.max(1, currentDayIndex - 10); i--) {
    const dayEntries = logs[i] || []
    if (dayEntries.length === 0) {
      consecutiveZeroDays++
    } else {
      consecutiveZeroDays = 0
    }
  }
  achievementEngine.evaluateTrigger('ach-044', consecutiveZeroDays >= 5)
}

function evaluateGroup7(snapshot: AchievementStateSnapshot): void {
  const { water, mealCount, sleep, dayNotes, currentDayIndex } = snapshot
  const movementLogs: Record<number, unknown[]> = {}
  const hasActivityToday = (movementLogs[currentDayIndex] || []).length > 0

  achievementEngine.evaluateTrigger('ach-062', water > 0 && mealCount > 0 && sleep > 0 && hasActivityToday)

  let streak3 = 0
  for (let i = currentDayIndex - 1; i >= currentDayIndex - 5; i--) {
    if (dayNotes[i] && (dayNotes[i] as unknown[]).length > 0) {
      streak3++
    } else {
      break
    }
  }
  achievementEngine.evaluateTrigger('ach-060', streak3 >= 3)

  let streak14 = 0
  for (let i = currentDayIndex - 1; i >= currentDayIndex - 20; i--) {
    if (dayNotes[i] && (dayNotes[i] as unknown[]).length > 0) {
      streak14++
    } else {
      break
    }
  }
  achievementEngine.evaluateTrigger('ach-056', streak14 >= 14)
}

function evaluateGroup8(): void {
  achievementEngine.evaluateTrigger('ach-077', viewedIngredientCards.length === 1)
  achievementEngine.evaluateTrigger('ach-079', viewedIngredientCards.length >= 10)
}

export class AchievementIntake {
  private initialized = false
  private boundHandlers: { target: EventTarget; type: string; handler: EventListenerOrEventListenerObject }[] = []

  init(): void {
    if (this.initialized) return
    this.initialized = true
    this.registerEventListeners()
  }

  destroy(): void {
    this.initialized = false
    for (const { target, type, handler } of this.boundHandlers) {
      target.removeEventListener(type, handler)
    }
    this.boundHandlers = []
  }

  ingestSnapshot(rawSnapshot: AchievementStateSnapshot): void {
    if (typeof window === 'undefined') return
    const snapshot = JSON.parse(JSON.stringify(rawSnapshot)) as AchievementStateSnapshot
    Object.freeze(snapshot)
    evaluateGroup1(snapshot)
    evaluateGroup2(snapshot)
    evaluateGroup3(snapshot)
    evaluateGroup4(snapshot)
    evaluateGroup5(snapshot)
    evaluateGroup6(snapshot)
    evaluateGroup7(snapshot)
  }

  triggerCourseStarted(): void {
    achievementEngine.evaluateTrigger('ach-080', true)
  }

  private handleIngredientCardViewed = (): void => {
    viewedIngredientCards.push('card')
    evaluateGroup8()
  }

  private handleAnnaInterrupted = (): void => {
    annaInterruptionStreak++
    achievementEngine.evaluateTrigger('ach-067', annaInterruptionStreak >= 5)
  }

  private handleAnnaSpeakingCompleted = (): void => {
    annaInterruptionStreak = 0
  }

  private handleShare = (): void => {
    achievementEngine.evaluateTrigger('ach-073', true)
  }

  private handleMixerJackpot = (): void => {
    achievementEngine.evaluateTrigger('ach-068', true)
  }

  private registerEventListeners(): void {
    if (typeof window === 'undefined') return

    const add = (type: string, handler: EventListenerOrEventListenerObject) => {
      window.addEventListener(type, handler)
      this.boundHandlers.push({ target: window, type, handler })
    }

    add('ingredient-card-viewed', this.handleIngredientCardViewed)
    add('anna-overlay-start-press', this.handleAnnaInterrupted)
    add('anna-overlay-speaking-completed', this.handleAnnaSpeakingCompleted)
    add('share-action', this.handleShare)
    add('mixer-jackpot-won', this.handleMixerJackpot)
  }
}

export const achievementIntake = new AchievementIntake()
