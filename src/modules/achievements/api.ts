import type { AchievementEvent, AchievementStateSnapshot } from './events'
import type { Achievement } from './types'
import { clientLogger } from '../../utils/clientLogger'

let pendingAchievements: string[] = []

export function initializeAchievementSystem(): void {
  clientLogger.info('Achievement system initialized (server-driven)')
}

export async function ingestAchievementEvent(event: AchievementEvent): Promise<void> {
  const action = actionFromEvent(event)
  if (!action) return

  try {
    const resp = await fetch('/api/achievements/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Device-Id': localStorage.getItem('wfpb_device_id') || '' },
      body: JSON.stringify({ action, payload: buildPayload(event) }),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const data = await resp.json()
    if (data.unlocked?.length > 0) {
      pendingAchievements.push(...data.unlocked)
      if (typeof window !== 'undefined') {
        for (const id of data.unlocked) {
          window.dispatchEvent(new CustomEvent('show-achievement-overlay', { detail: { id } }))
        }
      }
    }
  } catch (err: any) {
    clientLogger.error('Achievement check failed', err, { source: 'achievements' })
  }
}

export function getUnlockedAchievementIds(): string[] {
  return [...pendingAchievements]
}

export function isAchievementUnlocked(_id: string): boolean {
  return false
}

export function findAchievement(_id: string): Achievement | undefined {
  return undefined
}

export function getAchievementQueueLength(): number {
  return pendingAchievements.length
}

export function disposeAchievementSystem(): void {
  pendingAchievements = []
}

function actionFromEvent(event: AchievementEvent): string | null {
  switch (event.type) {
    case 'course:started': return 'course:started'
    case 'state:updated': return 'state:updated'
    case 'ingredient:card_viewed': return 'ingredient:card_viewed'
    case 'anna:interrupted': return 'anna:interrupted'
    case 'anna:speaking_completed': return null
    case 'social:shared': return 'social:shared'
    case 'mixer:jackpot_won': return 'mixer:jackpot_won'
    default: return null
  }
}

function buildPayload(event: AchievementEvent): Record<string, any> {
  if (event.type === 'state:updated') {
    const s = event.snapshot as AchievementStateSnapshot
    return {
      savedDishes: s.savedDishes || [],
      water: s.water || 0,
      sleep: s.sleep || 0,
      mealCount: s.mealCount || 0,
      currentDayIndex: s.currentDayIndex || 1,
      dayNotes: s.dayNotes || {},
      weight: s.weight || 0,
      systolic: s.systolic || 0,
      initialWeight: s.initialWeight || 0,
      initialSystolic: s.initialSystolic || 0,
      waterEntries: s.waterEntries || [],
      clickCount: s.clickCount || 0,
    }
  }
  return {}
}
