import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X } from 'lucide-react'
import type { Achievement } from '../types'
import { RARITY_COLORS } from '../types'
import { getDaysSinceCourseStart } from '../config/AchievementsMixerStore'
import { getArtUrl, getBgUrl } from '../utils/imageMap'

interface AchievementModalProps {
  achievement: Achievement
  userGender: 'male' | 'female'
  isGodMode: boolean
  onClose: () => void
  onMixer?: (achievement: Achievement) => void
}

export default function AchievementModal({
  achievement,
  userGender,
  isGodMode,
  onClose,
  onMixer,
}: AchievementModalProps) {
  const [visible, setVisible] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [bgError, setBgError] = useState(false)

  useEffect(() => {
    setVisible(true)
  }, [])

  const {
    name,
    category,
    type,
    rarity,
    xp,
    background,
    image,
    isSecret,
    isUnlocked,
    isFreshUnlock,
    isMixerConsumed,
    descriptionMale,
    descriptionFemale,
  } = achievement

  const rarityColors = RARITY_COLORS[rarity]
  const description = userGender === 'male' ? descriptionMale : descriptionFemale
  const artUrl = image && !imgError ? getArtUrl(image) : undefined
  const bgUrl = background && !bgError ? getBgUrl(background) : undefined

  const showMixer = isGodMode || getDaysSinceCourseStart() >= 3
  const showLocked = !isUnlocked && !isGodMode
  const isPositive = type === 'positive'

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

          <motion.div
            className="relative w-full max-w-sm mx-4 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            style={{
              maxHeight: 'calc(100vh - 80px)',
              marginTop: 'env(safe-area-inset-top, 0px)',
            }}
            initial={{ y: 200, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 200, opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 250, damping: 22 }}
          >
            {/* Art area with group background */}
            <div className="relative w-full shrink-0" style={{ minHeight: 200 }}>
              {bgUrl ? (
                <img
                  src={bgUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setBgError(true)}
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{
                    background: isPositive
                      ? 'linear-gradient(135deg, #065f46, #047857, #059669)'
                      : 'linear-gradient(135deg, #7f1d1d, #991b1b, #b91c1c)',
                  }}
                />
              )}

              <div className="absolute inset-0 bg-black/20" />

              <div className="absolute inset-0 flex items-center justify-center p-4">
                {artUrl ? (
                  <img
                    src={artUrl}
                    alt={name}
                    className="w-40 h-40 object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400 flex items-center justify-center text-5xl shadow-lg">
                    {showLocked ? '🔒' : '🏆'}
                  </div>
                )}
              </div>

              {/* Close button — always visible */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors cursor-pointer active:scale-90 z-10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content area */}
            <div className="bg-white px-5 pt-4 pb-5 overflow-y-auto" style={{ maxHeight: '45vh' }}>
              {/* Title */}
              <h2 className="text-xl font-black text-zinc-800 leading-tight">{name}</h2>

              {/* Pills row */}
              <div className="flex items-center gap-2 flex-wrap mt-3">
                {category && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200">
                    {category}
                  </span>
                )}
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                    isPositive
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                      : 'bg-red-100 text-red-700 border-red-300'
                  }`}
                >
                  {isPositive ? 'Позитивная' : 'Негативная'}
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${rarityColors.bg} ${rarityColors.border} ${rarityColors.text}`}
                >
                  {rarity}
                </span>
                {xp > 0 && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                    +{xp} XP
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-zinc-600 leading-relaxed mt-3">{description}</p>

              {/* Buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-100 text-zinc-700 font-bold text-sm hover:bg-zinc-200 transition-colors cursor-pointer active:scale-98"
                >
                  Закрыть
                </button>
                {showMixer && (
                  <button
                    onClick={() => {
                      onMixer?.(achievement)
                      handleClose()
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold text-sm hover:from-violet-600 hover:to-purple-700 transition-all cursor-pointer active:scale-98 shadow-md"
                  >
                    Миксер
                  </button>
                )}
              </div>

              {/* God Mode badge */}
              {isGodMode && (
                <p className="text-[10px] text-center text-zinc-400 font-semibold mt-3">
                  Режим Бога — все ачивки открыты для предпросмотра
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
