import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { achievementEngine } from '../engine/AchievementEngine'
import AchievementModal from '../components/AchievementModal'
import type { Achievement } from '../types'
import { getArtUrl } from '../utils/imageMap'

import { api } from '../../../utils/api'

function playSound(type: 'positive' | 'negative'): void {
  try {
    const ctx = new AudioContext()
    if (type === 'positive') {
      const notes = [523.25, 659.25, 783.99]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.12)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.5)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + i * 0.12)
        osc.stop(ctx.currentTime + i * 0.12 + 0.5)
      })
    } else {
      const notes = [400, 350, 300]
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.18)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.18 + 0.4)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(ctx.currentTime + i * 0.18)
        osc.stop(ctx.currentTime + i * 0.18 + 0.4)
      })
    }
  } catch {}
}

function Particles({ type }: { type: 'positive' | 'negative' }) {
  const items = useMemo(() => {
    const count = type === 'positive' ? 60 : 20
    const isPos = type === 'positive'
    return Array.from({ length: count }, () => ({
      x: 20 + Math.random() * 60,
      angle: isPos ? -80 + Math.random() * 160 : -90 + Math.random() * 180,
      distance: isPos ? 60 + Math.random() * 220 : 30 + Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: isPos ? 0.6 + Math.random() * 1.2 : 0.4 + Math.random() * 0.6,
      color: isPos
        ? ['#fbbf24', '#f472b6', '#34d399', '#60a5fa', '#a78bfa', '#fb923c', '#ffffff'][Math.floor(Math.random() * 7)]
        : ['#450a0a', '#7f1d1d', '#991b1b', '#292524', '#44403c'][Math.floor(Math.random() * 5)],
      size: isPos ? 3 + Math.random() * 8 : 2 + Math.random() * 4,
      rotation: Math.random() * 720 - 360,
    }))
  }, [type])

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {items.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${p.x}%`,
            bottom: '40%',
            width: p.size,
            height: p.size * (type === 'positive' ? 0.6 : 1),
            backgroundColor: p.color,
            borderRadius: type === 'positive' ? '2px' : '50%',
            opacity: type === 'positive' ? undefined : 0.6,
          }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: type === 'positive' ? 1 : 0.6 }}
          animate={{
            x: Math.cos(p.angle * Math.PI / 180) * p.distance,
            y: -Math.sin(p.angle * Math.PI / 180) * p.distance + (type === 'positive' ? 60 : 20),
            rotate: p.rotation,
            opacity: [type === 'positive' ? 1 : 0.6, type === 'positive' ? 1 : 0.6, 0],
          }}
          transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

interface AchievementOverlayProps {
  userGender?: 'male' | 'female'
}

export default function AchievementOverlay({ userGender = 'male' }: AchievementOverlayProps) {
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null)
  const [showPopup, setShowPopup] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [artError, setArtError] = useState(false)
  const lastAchievementIdRef = useRef<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const { id } = (e as CustomEvent).detail
      if (lastAchievementIdRef.current === id) return
      lastAchievementIdRef.current = id

      const achievement = achievementEngine.findAchievement(id)
      if (!achievement) return

      setArtError(false)
      setPendingAchievement(achievement)

      setTimeout(() => {
        setShowPopup(true)
        playSound(achievement.type)
      }, 2000)
    }

    window.addEventListener('show-achievement-overlay', handler)
    return () => window.removeEventListener('show-achievement-overlay', handler)
  }, [])

  const handlePopupClick = useCallback(() => {
    if (!pendingAchievement) return
    achievementEngine.confirmUnlock(pendingAchievement.id)
    setShowPopup(false)
    setTimeout(() => setShowModal(true), 200)
  }, [pendingAchievement])

  const handleModalClose = useCallback(() => {
    if (pendingAchievement) {
      api('/api/achievements/mark-shown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pendingAchievement.id })
      }).catch(e => console.error("Failed to mark achievement as shown", e))
    }
    setShowModal(false)
    setPendingAchievement(null)
    lastAchievementIdRef.current = null
    achievementEngine.completeDisplay()
  }, [pendingAchievement])

  const achievement = pendingAchievement
  const isPositive = achievement?.type === 'positive'
  const artUrl = achievement?.image && !artError ? getArtUrl(achievement.image) : undefined

  return (
    <>
      <AnimatePresence>
        {showPopup && achievement && !showModal && (
          <motion.div
            className="fixed inset-0 z-[55] flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute inset-0 bg-black/40" />

            <Particles type={achievement.type} />

            <motion.div
              className="relative cursor-pointer"
              style={{
                width: 240,
                height: 240,
                background: `radial-gradient(circle at center, ${
                  isPositive ? 'rgba(34,197,94,0.35) 0%, rgba(34,197,94,0.12) 40%, transparent 65%'
                  : 'rgba(239,68,68,0.3) 0%, rgba(239,68,68,0.1) 40%, transparent 65%'
                })`,
              }}
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 150, damping: 12, mass: 0.8 }}
              onClick={handlePopupClick}
            >
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                  filter: `drop-shadow(0 0 30px ${isPositive ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.5)'}) drop-shadow(0 0 60px ${isPositive ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'})`,
                }}
              >
                {artUrl ? (
                  <img
                    src={artUrl}
                    alt=""
                    className="w-full h-full object-contain"
                    onError={() => setArtError(true)}
                    draggable={false}
                  />
                ) : (
                  <span className="text-7xl">{'\u{1F3C6}'}</span>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showModal && achievement && (
        <AchievementModal
          achievement={achievement}
          userGender={userGender}
          isGodMode={false}
          onClose={handleModalClose}
        />
      )}
    </>
  )
}
