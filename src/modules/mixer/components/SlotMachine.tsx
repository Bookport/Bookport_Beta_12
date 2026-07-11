import { useMemo } from 'react'
import { motion } from 'motion/react'
import type { MixerIngredient, SpinSpeed, MixerScenarioType } from '../types/mixer.types'
import { getPoolForReel } from '../services/mixerAI'
import { getIngredientImage } from '../../../utils/ingredientMapper'
import ReelColumn from './ReelColumn'

interface SlotMachineProps {
  ingredients: MixerIngredient[]
  isSpinning: boolean
  reelStopped: boolean[]
  showConfetti: boolean
  bombFlash: boolean
  scenarioType: MixerScenarioType
  spinSpeed: SpinSpeed
  onReelStop: (index: number) => void
  disabled: boolean
  showCenterLine?: boolean
}

const FRAME_GRADIENT: Record<MixerScenarioType, { outer: string; header: string; inner: string }> = {
  positive: {
    outer: 'from-amber-600 via-yellow-400 to-amber-700',
    header: 'from-amber-800 via-amber-500 to-amber-800',
    inner: 'from-zinc-800/95 to-zinc-900/95',
  },
  negative: {
    outer: 'from-red-800 via-red-500 to-red-900',
    header: 'from-red-900 via-red-600 to-red-900',
    inner: 'from-zinc-800/95 to-zinc-900/95',
  },
}

function ConfettiBurst({ isMaxCharge }: { isMaxCharge: boolean }) {
  const count = isMaxCharge ? 60 : 30
  const particles = useMemo(() => {
    const shapes = ['rounded-sm', 'rounded-full']
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 50 + (Math.random() - 0.5) * 30,
      y: 40 + (Math.random() - 0.5) * 20,
      color: [isMaxCharge ? '#FCD34D' : '#FFD700', '#FCA5A5', '#6EE7B7', '#FFF', '#FCD34D', '#FCA5A5'][
        Math.floor(Math.random() * 6)
      ],
      size: Math.random() * 10 + 4,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotation: Math.random() * 360,
      delay: Math.random() * 0.25,
      duration: Math.random() * 0.7 + 0.5,
      radius: isMaxCharge ? 130 : 80,
    }))
  }, [isMaxCharge])

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute ${p.shape}`}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            rotate: p.rotation,
          }}
          initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            scale: [0, 1.5, 1.1, 0],
            x: (Math.random() - 0.5) * p.radius,
            y: -Math.random() * p.radius - 20,
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

export default function SlotMachine({
  ingredients,
  isSpinning,
  reelStopped,
  showConfetti,
  bombFlash,
  scenarioType,
  spinSpeed,
  onReelStop,
  disabled,
  showCenterLine,
}: SlotMachineProps) {
  const poolForReels = useMemo(() => getPoolForReel(scenarioType), [scenarioType])
  const poolImages = useMemo(() => {
    const valid = poolForReels.map((n) => getIngredientImage(n)).filter((x): x is string => !!x)
    if (valid.length === 0) valid.push('')
    return valid
  }, [poolForReels])
  const colors = FRAME_GRADIENT[scenarioType]

  return (
    <div className="relative px-2 py-2">
      {/* Machine outer frame */}
      <div
        className={`relative rounded-xl bg-gradient-to-b ${colors.outer} p-[2px] shadow-xl`}
        style={{
          boxShadow: bombFlash
            ? '0 0 80px rgba(255,215,0,0.6), 0 0 150px rgba(255,215,0,0.3), 0 0 250px rgba(255,215,0,0.15)'
            : '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        {/* Screen flash overlay */}
        {bombFlash && (
          <motion.div
            className="absolute inset-0 rounded-xl z-10 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            transition={{ duration: 0.45 }}
            style={{
              background: scenarioType === 'positive'
                ? 'radial-gradient(circle, rgba(255,215,0,0.5) 0%, rgba(255,215,0,0.2) 50%, transparent 80%)'
                : 'radial-gradient(circle, rgba(239,68,68,0.5) 0%, rgba(239,68,68,0.2) 50%, transparent 80%)',
            }}
          />
        )}

        {/* Minimal top border */}
        <div className={`rounded-t-[10px] bg-gradient-to-r ${colors.header} h-[3px]`} />

        {/* Inner body — reels with light frames */}
        <div className={`bg-gradient-to-b ${colors.inner} px-2 py-2 flex items-center gap-0.5 justify-center`}>
          {ingredients.map((ing, idx) => (
            <div
              key={idx}
              className="rounded-md bg-black/30 p-[3px] shadow-inner"
              style={{ boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.4)' }}
            >
              <div className="rounded overflow-hidden bg-white">
                <ReelColumn
                  poolImages={poolImages}
                  selectedName={ing.name}
                  isForbidden={ing.isForbidden}
                  isSpinning={isSpinning && !reelStopped[idx]}
                  isStopping={reelStopped[idx]}
                  spinSpeed={spinSpeed}
                  onStopComplete={() => onReelStop(idx)}
                  showCenterLine={showCenterLine}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Bottom accent bar */}
        <div className={`rounded-b-[10px] bg-gradient-to-r ${colors.header} h-4 flex items-center justify-center`}>
          <span className="text-[6px] text-amber-300/40 font-bold tracking-[0.3em] uppercase">WFPB</span>
        </div>
      </div>

      {/* Confetti */}
      {showConfetti && <ConfettiBurst isMaxCharge={false} />}
    </div>
  )
}
