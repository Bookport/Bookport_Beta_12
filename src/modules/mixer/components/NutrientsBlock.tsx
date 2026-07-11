import { motion, useMotionValue, animate, useTransform } from 'motion/react'
import { useEffect } from 'react'
import type { MixerNutrients, MixerMicronutrient } from '../types/mixer.types'

interface NutrientsBlockProps {
  nutrients: MixerNutrients
  micronutrients: MixerMicronutrient[]
}

const STATUS_COLORS: Record<string, string> = {
  good: 'bg-emerald-400',
  moderate: 'bg-amber-400',
  high: 'bg-red-400',
}

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (v) => Math.round(v))

  useEffect(() => {
    animate(motionValue, value, { duration: 0.6, ease: 'easeOut' })
  }, [value, motionValue])

  return (
    <motion.span className="text-sm font-black text-white">
      <motion.span>{rounded}</motion.span>
      <span className="text-[10px] text-zinc-400 ml-0.5">{suffix}</span>
    </motion.span>
  )
}

export default function NutrientsBlock({ nutrients, micronutrients }: NutrientsBlockProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
      className="mx-4 mb-1 rounded-xl bg-zinc-800 px-4 py-3"
    >
      {/* Калории — prominent */}
      <div className="flex items-center justify-center gap-1.5 mb-2">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Калории</span>
        <AnimatedNumber value={nutrients.calories} suffix="ккал" />
      </div>

      {/* Белки / Жиры / Углеводы row */}
      <div className="flex gap-2 justify-center mb-2">
        {[
          { label: 'Белки', value: nutrients.protein, unit: 'г' },
          { label: 'Жиры', value: nutrients.fat, unit: 'г' },
          { label: 'Углеводы', value: nutrients.carbs, unit: 'г' },
          { label: 'Клетчатка', value: nutrients.fiber, unit: 'г' },
        ].map((m) => (
          <div key={m.label} className="flex flex-col items-center">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{m.label}</span>
            <AnimatedNumber value={m.value} suffix={m.unit} />
          </div>
        ))}
      </div>

      {/* Micronutrients */}
      <div className="flex gap-2 justify-center flex-wrap">
        {micronutrients.map((m, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[m.status] || 'bg-zinc-300'}`}
            />
            <span className="text-[10px] font-semibold text-zinc-400">{m.name}</span>
            <span className="text-[10px] font-bold text-zinc-200">{m.value}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
