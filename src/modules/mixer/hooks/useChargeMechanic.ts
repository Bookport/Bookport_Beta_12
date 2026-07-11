import { useState, useCallback, useRef, useEffect } from 'react'
import type { SpinSpeed } from '../types/mixer.types'

export interface UseChargeMechanicReturn {
  isHeld: boolean
  chargeLevel: number
  chargeProgress: number
  isAtMax: boolean
  spinSpeed: SpinSpeed
  spinDurationMs: number
  startHold: () => void
  endHold: () => number
  onPull: (fn: (seconds: number) => void) => void
  hasAutoReleased: boolean
}

function getSpeedFromCharge(seconds: number): { speed: SpinSpeed; durationMs: number } {
  if (seconds <= 0.6) return { speed: 'slow', durationMs: 2500 }
  if (seconds <= 2) return { speed: 'medium', durationMs: 4000 }
  if (seconds <= 3.5) return { speed: 'fast', durationMs: 6000 }
  return { speed: 'max', durationMs: 8000 }
}

export function useChargeMechanic(): UseChargeMechanicReturn {
  const [isHeld, setIsHeld] = useState(false)
  const [chargeLevel, setChargeLevel] = useState(0)
  const [chargeProgress, setChargeProgress] = useState(0)
  const [isAtMax, setIsAtMax] = useState(false)
  const [hasAutoReleased, setHasAutoReleased] = useState(false)
  const holdStartRef = useRef(0)
  const rafRef = useRef(0)
  const onPullRef = useRef<(seconds: number) => void>(() => {})

  const updateCharge = useCallback(() => {
    if (!holdStartRef.current) return
    const elapsed = (performance.now() - holdStartRef.current) / 1000
    const clamped = Math.min(elapsed, 5)
    setChargeLevel(clamped)
    setChargeProgress(clamped / 5)
    setIsAtMax(clamped >= 5)

    if (clamped >= 5) {
      setIsHeld(false)
      setHasAutoReleased(true)
      holdStartRef.current = 0
      onPullRef.current(5)
      return
    }

    rafRef.current = requestAnimationFrame(updateCharge)
  }, [])

  const startHold = useCallback(() => {
    setIsHeld(true)
    setHasAutoReleased(false)
    holdStartRef.current = performance.now()
    rafRef.current = requestAnimationFrame(updateCharge)
  }, [updateCharge])

  const endHold = useCallback(() => {
    if (!holdStartRef.current) return 0
    cancelAnimationFrame(rafRef.current)
    const elapsed = (performance.now() - holdStartRef.current) / 1000
    const clamped = Math.min(elapsed, 5)
    setIsHeld(false)
    holdStartRef.current = 0
    setChargeLevel(0)
    setChargeProgress(0)
    setIsAtMax(false)
    return clamped
  }, [])

  const onPull = useCallback((fn: (seconds: number) => void) => {
    onPullRef.current = fn
  }, [])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const { speed, durationMs } = getSpeedFromCharge(chargeLevel)

  return {
    isHeld,
    chargeLevel,
    chargeProgress,
    isAtMax,
    spinSpeed: speed,
    spinDurationMs: durationMs,
    startHold,
    endHold,
    onPull,
    hasAutoReleased,
  }
}
