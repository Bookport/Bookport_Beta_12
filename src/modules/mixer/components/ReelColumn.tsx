import { useMemo, useEffect, useRef } from 'react'
import { motion, useMotionValue, animate } from 'motion/react'
import { getIngredientImage } from '../../../utils/ingredientMapper'
import type { SpinSpeed } from '../types/mixer.types'

interface ReelColumnProps {
  poolImages: string[]
  selectedName: string
  isForbidden: boolean
  isSpinning: boolean
  isStopping: boolean
  spinSpeed: SpinSpeed
  onStopComplete: () => void
  showCenterLine?: boolean
}

const CELL_H = 88
const GAP = 4
const ITEM_H = CELL_H + GAP
const VISIBLE_CELLS = 3
const REPEATS = 5

const SPEED_MAP: Record<SpinSpeed, number> = {
  slow: 0.4,
  medium: 0.6,
  fast: 0.8,
  max: 1.0,
}

export default function ReelColumn({
  poolImages,
  selectedName,
  isForbidden,
  isSpinning,
  isStopping,
  spinSpeed,
  onStopComplete,
  showCenterLine,
}: ReelColumnProps) {
  const rafRef = useRef(0)
  const completedRef = useRef(false)

    const { strip, targetIndex, initialY } = useMemo(() => {
    const shuffled = [...poolImages].sort(() => Math.random() - 0.5)
    const firstPart = Array.from({ length: REPEATS }, () => [...shuffled]).flat()
    const midPart = [...shuffled]
    const endPart = Array.from({ length: REPEATS }, () => [...shuffled]).flat()
    const selectedImg = getIngredientImage(selectedName) || poolImages[0] || ''

    const s = [...firstPart, selectedImg, ...midPart, selectedImg, ...endPart]
    const tIdx = firstPart.length + 1 + midPart.length
    return { strip: s, targetIndex: tIdx, initialY: -(tIdx - 1) * ITEM_H }
  }, [poolImages, selectedName])

  const totalH = strip.length * ITEM_H
  const maxY = -(strip.length - VISIBLE_CELLS) * ITEM_H
  const y = useMotionValue(initialY)

  useEffect(() => {
    if (!isSpinning) return
    completedRef.current = false
    const pxPerMs = SPEED_MAP[spinSpeed] || 0.1

    let lastTime = performance.now()
    const update = (time: number) => {
      if (!isSpinning) return
      const dt = time - lastTime
      lastTime = time
      const currentY = y.get()
      let newY = currentY - dt * pxPerMs
      if (newY < maxY) {
        newY = initialY
      }
      y.set(newY)
      rafRef.current = requestAnimationFrame(update)
    }
    rafRef.current = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isSpinning, spinSpeed, y, initialY, maxY])

  useEffect(() => {
    if (!isStopping || completedRef.current) return
    completedRef.current = true
    cancelAnimationFrame(rafRef.current)

    const currentY = y.get()
    const dist = Math.abs(currentY - initialY)
    const stiffness = dist > 500 ? 150 : 300

    animate(y, initialY, {
      type: 'spring',
      stiffness,
      damping: 18,
      onComplete: onStopComplete,
    })
  }, [isStopping, y, initialY, onStopComplete])

  const containerH = VISIBLE_CELLS * CELL_H + (VISIBLE_CELLS - 1) * GAP

  return (
    <div
      className="relative overflow-hidden rounded-lg"
      style={{ width: CELL_H, height: containerH }}
    >
      {isForbidden && (
        <div className="absolute inset-0 z-10 pointer-events-none rounded-lg border-2 border-red-400/60 shadow-[inset_0_0_16px_rgba(239,68,68,0.2)]" />
      )}

      <motion.div className="flex flex-col" style={{ y }}>
        {strip.map((img, i) => (
          <div
            key={i}
            className="flex-shrink-0 overflow-hidden rounded-sm bg-white"
            style={{ width: CELL_H, height: CELL_H, marginBottom: GAP }}
          >
            {img ? (
              <img
                src={img}
                alt=""
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="w-full h-full bg-zinc-200" />
            )}
          </div>
        ))}
      </motion.div>

      {/* Winning center line — appears on stop */}
      {showCenterLine && (
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 250, damping: 18, mass: 0.6 }}
          className="absolute left-0 right-0 z-20 pointer-events-none overflow-hidden"
          style={{
            top: CELL_H + GAP,
            height: CELL_H,
            transformOrigin: 'center center',
          }}
        >
          {/* Glow background — pure gold gradient, no darkening */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.35), transparent)',
            }}
          />
          {/* Gold borders */}
          <div
            className="absolute left-0 right-0 top-0 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
              boxShadow: '0 0 8px rgba(255,215,0,0.5)',
            }}
          />
          <div
            className="absolute left-0 right-0 bottom-0 h-[2px]"
            style={{
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
              boxShadow: '0 0 8px rgba(255,215,0,0.5)',
            }}
          />
          {/* Pulsing shimmer */}
          <motion.div
            className="absolute inset-0"
            animate={{
              opacity: [0.3, 0.7, 0.3],
            }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255,215,0,0.15), transparent)',
            }}
          />
        </motion.div>
      )}

      {/* Forbidden mark on center cell when stopped */}
      {isForbidden && showCenterLine && (
        <div
          className="absolute z-30 flex items-center justify-center pointer-events-none"
          style={{
            top: CELL_H + GAP + 4,
            right: 4,
            width: 20,
            height: 20,
          }}
        >
          <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center shadow-lg">
            <span className="text-white text-[11px] font-black leading-none">!</span>
          </div>
        </div>
      )}
    </div>
  )
}
