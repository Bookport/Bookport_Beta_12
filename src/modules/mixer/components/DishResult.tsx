import { motion } from 'motion/react'

interface DishResultProps {
  dishName: string
  outcomeType: 'A' | 'B' | 'C'
  isVisible: boolean
}

const OUTCOME_EMBLEM: Record<string, string> = {
  A: '\u{1F31F}',
  B: '\u26A1',
  C: '\u{1F340}',
}

const GOLD = '#FFD700'

export default function DishResult({ dishName, outcomeType, isVisible }: DishResultProps) {
  if (!isVisible || !dishName) return null

  return (
    <div className="relative px-6 py-2 flex flex-col items-center overflow-visible min-h-[64px]">
      {/* Full-screen gold flash overlay — washes everything */}
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: 'radial-gradient(circle at center, rgba(255,215,0,0.35) 0%, rgba(255,215,0,0.1) 50%, transparent 80%)',
        }}
      />

      {/* Dark vignette behind text for readability */}
      <motion.div
        className="absolute inset-0 z-0 pointer-events-none rounded-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
      />

      {/* Title that slams down with explosive energy */}
      <div className="relative z-10 text-center overflow-visible">
        <motion.h3
          initial={{ y: -160, opacity: 0, scale: 0.3 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: [0.3, 1.15, 0.95, 1.05, 1],
            filter: [
              'brightness(2)',
              'brightness(1.6)',
              'brightness(1.2)',
              'brightness(1.4)',
              'brightness(1)',
            ],
          }}
          transition={{
            y: { type: 'spring', stiffness: 500, damping: 12, mass: 0.6 },
            opacity: { duration: 0.15 },
            scale: { duration: 0.6, ease: 'easeOut' },
            filter: { duration: 1.8, ease: 'easeInOut' },
          }}
          className="text-2xl font-black leading-tight text-white max-w-[300px] mx-auto"
          style={{
            textShadow:
              '0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.4), 0 0 100px rgba(255,215,0,0.2), 0 2px 12px rgba(0,0,0,0.6)',
          }}
        >
          <span className="mr-1.5 inline-block">{OUTCOME_EMBLEM[outcomeType]}</span>
          {dishName}
        </motion.h3>

        {/* Gold particle burst — larger, more dramatic */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.7, delay: 0.05 }}
        >
          {Array.from({ length: 30 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                backgroundColor: i % 3 === 0 ? '#FFF' : GOLD,
                left: `${35 + Math.random() * 30}%`,
                top: '50%',
                width: Math.random() * 10 + 4,
                height: Math.random() * 10 + 4,
                boxShadow: `0 0 ${Math.random() * 8 + 4}px rgba(255,215,0,0.8)`,
              }}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0.8, 0],
                scale: [0, 3, 2, 0],
                x: (Math.random() - 0.5) * 120,
                y: -Math.random() * 80 - 20,
              }}
              transition={{ duration: Math.random() * 0.5 + 0.4, delay: Math.random() * 0.2 }}
            />
          ))}
        </motion.div>

        {/* Golden shimmer sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.3, 0] }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,215,0,0.4) 50%, transparent 100%)',
          }}
        />
      </div>
    </div>
  )
}
