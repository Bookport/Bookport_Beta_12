import { useState, useCallback, useRef, useEffect } from 'react'
import type { SpinSpeed } from '../types/mixer.types'

export type SlotPhase =
  | 'ready'
  | 'spinning'
  | 'stopping_0'
  | 'stopping_1'
  | 'stopping_2'
  | 'stopping_3'
  | 'bomb'
  | 'reveal'

export interface UseSlotAnimationReturn {
  phase: SlotPhase
  showConfetti: boolean
  bombFlash: boolean
  startSpin: (chargeSeconds: number) => void
  skipToReveal: () => void
  reset: () => void
  getReelStopIndex: () => number
}

function getParams(seconds: number): { spinMs: number; speed: SpinSpeed } {
  if (seconds <= 1) return { spinMs: 800, speed: 'slow' }
  if (seconds <= 3) return { spinMs: 1500, speed: 'medium' }
  if (seconds <= 5) return { spinMs: 2500, speed: 'fast' }
  return { spinMs: 4000, speed: 'max' }
}

export function useSlotAnimation(): UseSlotAnimationReturn {
  const [phase, setPhase] = useState<SlotPhase>('ready')
  const [showConfetti, setShowConfetti] = useState(false)
  const [bombFlash, setBombFlash] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const reelStopIndex = useRef(-1)

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  useEffect(() => {
    return clearTimers
  }, [clearTimers])

  const reset = useCallback(() => {
    clearTimers()
    setPhase('ready')
    setShowConfetti(false)
    setBombFlash(false)
    reelStopIndex.current = -1
  }, [clearTimers])

  const skipToReveal = useCallback(() => {
    clearTimers()
    setPhase('reveal')
    setShowConfetti(true)
    setBombFlash(true)
    reelStopIndex.current = 3
  }, [clearTimers])

  const startSpin = useCallback(
    (chargeSeconds: number) => {
      reset()
      const { spinMs } = getParams(chargeSeconds)
      const t: ReturnType<typeof setTimeout>[] = []
      const staggerMs = 300

      t.push(setTimeout(() => setPhase('spinning'), 50))

      t.push(setTimeout(() => {
        setPhase('stopping_0')
        reelStopIndex.current = 0
      }, spinMs))

      t.push(setTimeout(() => {
        setPhase('stopping_1')
        reelStopIndex.current = 1
      }, spinMs + staggerMs))

      t.push(setTimeout(() => {
        setPhase('stopping_2')
        reelStopIndex.current = 2
      }, spinMs + staggerMs * 2))

      t.push(setTimeout(() => {
        setPhase('stopping_3')
        reelStopIndex.current = 3
      }, spinMs + staggerMs * 3))

      t.push(setTimeout(() => {
        setPhase('bomb')
        setBombFlash(true)
        setShowConfetti(true)
      }, spinMs + staggerMs * 3 + 300))

      t.push(setTimeout(() => {
        setPhase('reveal')
      }, spinMs + staggerMs * 3 + 500))

      timers.current = t
    },
    [reset],
  )

  const getReelStopIndex = useCallback(() => reelStopIndex.current, [])

  return { phase, showConfetti, bombFlash, startSpin, skipToReveal, reset, getReelStopIndex }
}
