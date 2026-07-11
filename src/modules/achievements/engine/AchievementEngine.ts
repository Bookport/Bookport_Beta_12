import { ACHIEVEMENTS } from '../config/achievementContent'
import type { Achievement } from '../types'

class AchievementEngine {
  private unlockedAchievementIds: string[] = []
  private achievementQueue: string[] = []
  private isDisplayingAchievement: boolean = false
  private initialized: boolean = false

  initialize(): void {
    if (this.initialized) return
    this.initialized = true
    this.loadFromStorage()
  }

  destroy(): void {
    this.initialized = false
    this.isDisplayingAchievement = false
    this.achievementQueue = []
  }

  private loadFromStorage(): void {
    this.unlockedAchievementIds = []
  }

  private saveToStorage(): void {
    // no-op: achievements are now server-driven
  }

  getUnlockedIds(): string[] {
    return [...this.unlockedAchievementIds]
  }

  isUnlocked(id: string): boolean {
    return this.unlockedAchievementIds.includes(id)
  }

  getQueueLength(): number {
    return this.achievementQueue.length
  }

  isDisplaying(): boolean {
    return this.isDisplayingAchievement
  }

  private isOnboardingComplete(): boolean {
    return true
  }

  evaluateTrigger(achievementId: string, condition: boolean): void {
    if (!condition) return
    if (!this.isOnboardingComplete()) return
    if (this.unlockedAchievementIds.includes(achievementId)) return
    if (this.achievementQueue.includes(achievementId)) return

    this.achievementQueue.push(achievementId)
    this.processQueue()
  }

  processQueue(): void {
    if (this.isDisplayingAchievement) return
    if (this.achievementQueue.length === 0) return

    const id = this.achievementQueue.shift()!
    this.isDisplayingAchievement = true

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('show-achievement-overlay', { detail: { id } }))
    }
  }

  completeDisplay(): void {
    this.isDisplayingAchievement = false
    this.processQueue()
  }

  confirmUnlock(achievementId: string): void {
    if (this.unlockedAchievementIds.includes(achievementId)) return
    this.unlockedAchievementIds.push(achievementId)
    this.saveToStorage()
  }

  findAchievement(id: string): Achievement | undefined {
    return ACHIEVEMENTS.find(a => a.id === id)
  }
}

export const achievementEngine = new AchievementEngine()

export function initAchievementEngine(): void {
  achievementEngine.initialize()
}
