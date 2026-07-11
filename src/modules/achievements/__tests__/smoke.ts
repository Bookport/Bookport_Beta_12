// Smoke test — tests engine init/dispose/re-init, unlock persistence, queue lifecycle
// Import engine directly (avoids Vite-specific import.meta.glob from host services)

function mockWindow(): void {
  const store: Record<string, string> = {}
  const mockStorage: Storage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { for (const k of Object.keys(store)) delete store[k] },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }

  const listeners: Record<string, EventListenerOrEventListenerObject[]> = {}
  ;(globalThis as any).window = {
    localStorage: mockStorage,
    addEventListener: (t: string, h: EventListenerOrEventListenerObject) => {
      if (!listeners[t]) listeners[t] = []
      listeners[t].push(h)
    },
    removeEventListener: (t: string, h: EventListenerOrEventListenerObject) => {
      if (!listeners[t]) return
      listeners[t] = listeners[t].filter(e => e !== h)
    },
    dispatchEvent: (e: Event) => {
      const handlers = listeners[e.type] || []
      for (const h of handlers) {
        if (typeof h === 'function') h(e)
        else h.handleEvent(e)
      }
      return true
    },
  } as any
  ;(globalThis as any).localStorage = mockStorage
  ;(globalThis as any).CustomEvent = class CustomEvent {
    type: string
    detail: any
    constructor(type: string, opts?: any) { this.type = type; this.detail = opts?.detail }
  } as any

  // Avoid Vite's import.meta.glob error in unrelated modules that may get parsed
  ;(globalThis as any).import = { meta: { glob: () => ({}) } }
}

mockWindow()

// Dynamic import so mocks are in place first
const { achievementEngine, initAchievementEngine } = await import('../engine/AchievementEngine')

let passed = 0
let failed = 0

function assert(label: string, ok: boolean): void {
  if (ok) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.error(`  ❌ ${label}`)
    failed++
  }
}

// Onboarding check now always returns true; no localStorage setup needed

console.log('\n--- Smoke: engine init → event → unlock → dispose → re-init ---\n')

// Step 1: init
initAchievementEngine()
assert('getUnlockedIds returns empty', achievementEngine.getUnlockedIds().length === 0)
assert('queue empty after init', achievementEngine.getQueueLength() === 0)

// Step 2: evaluate trigger — processQueue shifts immediately into display mode
achievementEngine.evaluateTrigger('ach-001', true)
assert('ach-001 moved to display mode', achievementEngine.isDisplaying() === true)
assert('queue now empty (item dequeued for display)', achievementEngine.getQueueLength() === 0)

// Step 3: confirm unlock + complete display
achievementEngine.confirmUnlock('ach-001')
assert('ach-001 isUnlocked', achievementEngine.isUnlocked('ach-001'))
achievementEngine.completeDisplay()
assert('isDisplaying reset after completeDisplay', achievementEngine.isDisplaying() === false)
assert('queue empty after display', achievementEngine.getQueueLength() === 0)

// Step 4: duplicate trigger does not queue again
achievementEngine.evaluateTrigger('ach-001', true)
assert('already-unlocked not re-queued', achievementEngine.getQueueLength() === 0)

// Step 5: find achievement by id
const ach = achievementEngine.findAchievement('ach-080')
assert('findAchievement returns ach-080', ach?.id === 'ach-080')

// Step 6: dispose
achievementEngine.destroy()
assert('isDisplaying reset after destroy', achievementEngine.isDisplaying() === false)
assert('queue cleared after destroy', achievementEngine.getQueueLength() === 0)

// Step 7: re-init — unlocked ids no longer persist (server-driven)
initAchievementEngine()
assert('unlocked ids do not survive re-init without server', !achievementEngine.isUnlocked('ach-001'))

// Step 8: re-init is idempotent (second call does not throw)
initAchievementEngine()

console.log(`\n--- Result: ${passed} passed, ${failed} failed ---\n`)
process.exit(failed > 0 ? 1 : 0)
