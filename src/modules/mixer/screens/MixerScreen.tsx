import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { motion, AnimatePresence, useAnimate } from 'motion/react'
import { X, ChevronDown } from 'lucide-react'
import type { MixerConfig, MixerOutcomeType, MixerIngredient, CookingMethod } from '../types/mixer.types'
import { useSlotAnimation } from '../hooks/useSlotAnimation'
import { useChargeMechanic } from '../hooks/useChargeMechanic'
import { useMixerLogic } from '../hooks/useMixerLogic'
import SlotMachine from '../components/SlotMachine'
import AnnaPanel from '../components/AnnaPanel'
import NutrientsBlock from '../components/NutrientsBlock'
import DishResult from '../components/DishResult'
import { isGodModeEnabled } from '../../achievements/config/achievementsGodMode'
import { getBgUrl } from '../../achievements/utils/imageMap'
import { mixerSounds } from '../services/mixerSounds'

interface MixerScreenProps {
  config: MixerConfig
  onClose: () => void
}

function GodModeChip({
  selectedIngredients,
  chargeLevel,
  onForceOutcome,
  onSkipSpin,
  onSkipAll,
}: {
  selectedIngredients: MixerIngredient[]
  chargeLevel: number
  onForceOutcome: (outcome: MixerOutcomeType) => void
  onSkipSpin: () => void
  onSkipAll: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute top-2 left-2 z-40">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-900/60 backdrop-blur-sm text-[9px] text-amber-400 font-bold hover:bg-zinc-800/80 transition cursor-pointer border border-zinc-700/40"
      >
        GM <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-1 p-2 rounded-lg bg-zinc-900/85 backdrop-blur-sm border border-zinc-700/40 min-w-[180px]"
        >
          <p className="text-[8px] text-zinc-400 mb-1 leading-tight">
            {selectedIngredients.map((i) => i.name).join(', ')}
            <br />Заряд: {chargeLevel.toFixed(1)}с
          </p>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => onForceOutcome('A')} className="text-[8px] px-1.5 py-0.5 rounded bg-emerald-700 text-white font-semibold hover:bg-emerald-600 transition cursor-pointer">A</button>
            <button onClick={() => onForceOutcome('B')} className="text-[8px] px-1.5 py-0.5 rounded bg-red-700 text-white font-semibold hover:bg-red-600 transition cursor-pointer">B</button>
            <button onClick={() => onForceOutcome('C')} className="text-[8px] px-1.5 py-0.5 rounded bg-violet-700 text-white font-semibold hover:bg-violet-600 transition cursor-pointer">C</button>
            <button onClick={onSkipSpin} className="text-[8px] px-1.5 py-0.5 rounded bg-amber-700 text-white font-semibold hover:bg-amber-600 transition cursor-pointer">Skip spin</button>
            <button onClick={onSkipAll} className="text-[8px] px-1.5 py-0.5 rounded bg-sky-700 text-white font-semibold hover:bg-sky-600 transition cursor-pointer">Skip all</button>
          </div>
        </motion.div>
      )}
    </div>
  )
}

const SCENARIO_BAR_GRADIENT: Record<string, string> = {
  positive: 'linear-gradient(90deg, #059669, #FCD34D, #059669)',
  negative: 'linear-gradient(90deg, #DC2626, #FB923C, #FCD34D)',
}

const COOKING_BUTTONS: {
  method: CookingMethod
  label: string
  baseBg: string
  borderColor: string
  glowColor: string
}[] = [
  { method: 'fry', label: '\u{1F525} Жарим', baseBg: 'linear-gradient(145deg, #e84800 0%, #b83000 60%, #8a1500 100%)', borderColor: 'rgba(255,180,100,0.5)', glowColor: '#ff4500' },
  { method: 'braise', label: '\u{1F4A7} Тушим', baseBg: 'linear-gradient(145deg, #0055e8 0%, #0033b8 60%, #001580 100%)', borderColor: 'rgba(100,160,255,0.5)', glowColor: '#0088ff' },
  { method: 'boil', label: '\u2668\uFE0F Варим', baseBg: 'linear-gradient(145deg, #00a84a 0%, #007a30 60%, #004d18 100%)', borderColor: 'rgba(100,255,160,0.5)', glowColor: '#00cc66' },
]

const BULB_COLORS = ['#FFD700', '#FF4500', '#FFE800', '#00C851']
const BULB_SPACING = 12
const BULB_SIZE = 10
const TOP_BULBS = 24
const SIDE_BULBS = 10

export default function MixerScreen({ config, onClose }: MixerScreenProps) {
  const charge = useChargeMechanic()
  const slotAnim = useSlotAnimation()
  const mixer = useMixerLogic(config)
  const [shakeRef, animate] = useAnimate()

  const [bgError, setBgError] = useState(false)
  const [showPostContent, setShowPostContent] = useState(false)
  const [showAnna, setShowAnna] = useState(false)
  const [showNutrients, setShowNutrients] = useState(false)
  const [showClose, setShowClose] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<CookingMethod | null>(null)
  const [activeBulbIndex, setActiveBulbIndex] = useState(0)
  const [bulkBurst, setBulkBurst] = useState<CookingMethod | null>(null)
  const [blinkSlot, setBlinkSlot] = useState(0)
  const [pressedBtn, setPressedBtn] = useState<CookingMethod | null>(null)
  const spinStartRef = useRef(0)
  const hasTriggeredSpin = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const totalBulbs = TOP_BULBS + SIDE_BULBS * 2

  const bgUrl = useMemo(
    () => (config.achievementBackground && !bgError ? getBgUrl(config.achievementBackground) : undefined),
    [config.achievementBackground, bgError],
  )

  const [entrancePhase, setEntrancePhase] = useState<'entering' | 'landed'>('entering')

  const phaseOrder = ['ready', 'spinning', 'stopping_0', 'stopping_1', 'stopping_2', 'stopping_3', 'bomb', 'reveal']
  const phaseIdx = phaseOrder.indexOf(slotAnim.phase)
  const reelStopped = [phaseIdx >= 2, phaseIdx >= 3, phaseIdx >= 4, phaseIdx >= 5]
  const isSpinning = slotAnim.phase === 'spinning'
  const isPostSpin = (slotAnim.phase === 'bomb' || slotAnim.phase === 'reveal')
  const isRevealed = slotAnim.phase === 'reveal' && mixer.geminiResult !== null
  const chargeDisabled = slotAnim.phase !== 'ready' || hasTriggeredSpin.current || mixer.isGeminiLoading || !selectedMethod

  const handleLeverRelease = useCallback(
    (seconds: number) => {
      if (seconds <= 0.15 || hasTriggeredSpin.current || slotAnim.phase !== 'ready') return
      const method = selectedMethod
      if (!method) return
      mixerSounds.stopChargeHum()
      hasTriggeredSpin.current = true
      setShowPostContent(false)
      setShowAnna(false)
      setShowNutrients(false)
      setShowClose(false)
      spinStartRef.current = Date.now()
      mixerSounds.startReelSpin()
      slotAnim.startSpin(seconds)
      mixer.triggerSpin(seconds, method)
    },
    [slotAnim, mixer, selectedMethod],
  )

  useEffect(() => {
    charge.onPull(handleLeverRelease)
  }, [charge, handleLeverRelease])

  // Bulb running marquee
  useEffect(() => {
    if (bulkBurst) return
    const speed = selectedMethod ? 50 : 80
    const interval = setInterval(() => {
      setActiveBulbIndex(i => (i + 1) % totalBulbs)
    }, speed)
    return () => clearInterval(interval)
  }, [bulkBurst, selectedMethod, totalBulbs])

  // Bulb burst on method selection
  useEffect(() => {
    if (!selectedMethod) return
    setBulkBurst(selectedMethod)
    const t = setTimeout(() => setBulkBurst(null), 800)
    return () => clearTimeout(t)
  }, [selectedMethod])

  // Blink slot for idle button animation
  useEffect(() => {
    if (selectedMethod) return
    const interval = setInterval(() => setBlinkSlot(i => (i + 1) % 3), 600)
    return () => clearInterval(interval)
  }, [selectedMethod])

  // Hold bulb pulse — re-triggered each frame while holding
  const isHolding = !chargeDisabled && charge.isHeld

  // Update charge hum frequency as charge builds
  useEffect(() => {
    if (charge.isHeld) {
      mixerSounds.updateChargeHum(charge.chargeProgress)
    }
  }, [charge.chargeProgress, charge.isHeld])
  const holdBulbColor = isHolding && selectedMethod
    ? COOKING_BUTTONS.find(b => b.method === selectedMethod)!.glowColor
    : null

  // Background music on mount
  useEffect(() => {
    mixerSounds.preloadAll()
    mixerSounds.startBgMusic()
    return () => {
      mixerSounds.stopBgMusic()
      mixerSounds.dispose()
    }
  }, [])

  // Screen shake — whole phone frame rattles on bomb
  useEffect(() => {
    if (slotAnim.phase === 'bomb') {
      animate(
        shakeRef.current,
        { x: [0, 5, -4, 3, -2, 1, 0] },
        { duration: 0.2, ease: 'easeOut' },
      )
    }
  }, [slotAnim.phase, animate, shakeRef])

  // Stop reel spin + center-line thunk when last reel locks
  useEffect(() => {
    if (slotAnim.phase === 'stopping_3') {
      mixerSounds.stopReelSpin()
      mixerSounds.playReelStop()
    }
  }, [slotAnim.phase])

  // Safety net: stop reel spin on reveal (catches skipToReveal path)
  useEffect(() => {
    if (slotAnim.phase === 'reveal') {
      mixerSounds.stopReelSpin()
    }
  }, [slotAnim.phase])

  // Line-complete arpeggio + values reveal on bomb (confetti moment)
  useEffect(() => {
    if (slotAnim.phase === 'bomb') {
      mixerSounds.playLineComplete()
      mixerSounds.playValuesReveal()
    }
  }, [slotAnim.phase])

  // Anna appear sound + values collected sound
  useEffect(() => {
    if (showPostContent) {
      mixerSounds.playAnnaAppear()
      mixerSounds.playValuesDone()
    }
  }, [showPostContent])

  // Auto-skip slot when Gemini data arrives (minimum 2s spin)
  useEffect(() => {
    if (!mixer.geminiResult || slotAnim.phase === 'reveal' || slotAnim.phase === 'ready') return
    const elapsed = Date.now() - spinStartRef.current
    const minSpin = 2000
    if (elapsed >= minSpin) {
      slotAnim.skipToReveal()
    } else {
      const t = setTimeout(() => slotAnim.skipToReveal(), minSpin - elapsed)
      timersRef.current.push(t)
      return () => {
        clearTimeout(t)
        timersRef.current = timersRef.current.filter((x) => x !== t)
      }
    }
  }, [mixer.geminiResult, slotAnim])

  // Show post-spin content when both slot and AI are ready
  useEffect(() => {
    if (!isRevealed) {
      setShowPostContent(false)
      setShowAnna(false)
      setShowNutrients(false)
      return
    }
    // Jackpot detection: outcome 'C' = highest tier (all lucky clover) 💎
    if (mixer.outcomeType === 'C') {
      window.dispatchEvent(new CustomEvent('mixer-jackpot-won'))
    }
    if (showPostContent) return
    const t = setTimeout(() => {
      setShowPostContent(true)
      setShowAnna(true)
    }, 500)
    timersRef.current.push(t)
    const t2 = setTimeout(() => setShowNutrients(true), 700)
    timersRef.current.push(t2)
    return () => {
      clearTimeout(t)
      clearTimeout(t2)
      timersRef.current = timersRef.current.filter(x => x !== t && x !== t2)
    }
  }, [isRevealed])

  const handleReelStop = useCallback((_index: number) => {}, [])

  // Anna typing complete → show close button after delay
  const annaDoneRef = useRef(false)
  const handleAnnaTypingComplete = useCallback(() => {
    if (annaDoneRef.current) return
    annaDoneRef.current = true
    const t = setTimeout(() => {
      setShowClose(true)
    }, 1500)
    timersRef.current.push(t)
  }, [])

  const handleForceOutcome = useCallback(
    (outcome: MixerOutcomeType) => {
      mixerSounds.playLineComplete()
      slotAnim.skipToReveal()
      mixer.forceResult(outcome, 5)
      hasTriggeredSpin.current = true
      annaDoneRef.current = false
      setShowPostContent(false)
      setShowAnna(false)
      setShowNutrients(false)
      setShowClose(false)
      spinStartRef.current = Date.now()
    },
    [slotAnim, mixer],
  )

  const showGodMode = isGodModeEnabled()

  // Cleanup timers
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout)
    }
  }, [])

  function renderBulb(active: boolean, color: string, idx: number) {
    const c = holdBulbColor && isHolding
      ? holdBulbColor
      : bulkBurst
        ? COOKING_BUTTONS.find(b => b.method === bulkBurst)!.glowColor
        : active ? color : '#222'
    const on = bulkBurst !== null || (holdBulbColor !== null && isHolding) || active
    return (
      <div key={idx}
        className="rounded-full transition-all"
        style={{
          width: BULB_SIZE, height: BULB_SIZE,
          background: on ? c : '#222',
          boxShadow: on ? `0 0 8px 2px ${c}, 0 0 16px ${c}` : 'none',
          transitionDuration: '80ms',
        }}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
      {/* Casino Cabinet */}
      <div className="relative w-full max-w-[460px] flex flex-col"
        style={{ maxHeight: 'calc(100dvh - 1.5rem)' }}
      >
        {/* Gold border outer shell */}
        <div className="rounded-[44px] p-[3px] flex flex-col flex-1 min-h-0"
          style={{
            background: 'linear-gradient(180deg, #ffd700, #b8860b, #ffd700)',
            boxShadow: '0 24px 54px -10px rgba(0,0,0,0.5), 0 0 40px rgba(255,215,0,0.15)',
          }}
        >
          {/* Dark cabinet body */}
          <div className="rounded-[41px] flex flex-col flex-1 min-h-0 overflow-hidden"
            style={{ background: '#0d0d1a' }}
          >
            {/* Top marquee strip */}
            <div className="flex justify-center gap-[6px] pt-3 pb-1 px-3 shrink-0">
              {Array.from({ length: TOP_BULBS }, (_, i) =>
                renderBulb(activeBulbIndex === i, BULB_COLORS[i % BULB_COLORS.length], i)
              )}
            </div>

            {/* Content row: side bulbs + phone frame */}
            <div className="flex items-stretch gap-[6px] px-3 pb-3 flex-1 min-h-0">
              {/* Left side bulbs */}
              <div className="flex flex-col gap-[6px] justify-center shrink-0">
                {Array.from({ length: SIDE_BULBS }, (_, i) =>
                  renderBulb(activeBulbIndex === TOP_BULBS + i, BULB_COLORS[(TOP_BULBS + i) % BULB_COLORS.length], TOP_BULBS + i)
                )}
              </div>

              {/* Phone frame */}
              <div
                ref={shakeRef}
                className="relative flex-1 rounded-[38px] overflow-hidden bg-zinc-900 flex flex-col"
                style={{ aspectRatio: '9 / 16', maxWidth: 420 }}
              >
                {/* Cabinet inner glow overlay */}
                <div className="absolute inset-0 pointer-events-none z-[5] rounded-[38px]"
                  style={{ boxShadow: 'inset 0 0 60px rgba(255,100,0,0.12)' }}
                />

                {/* Background — fills the frame */}
                <div className="absolute inset-0 overflow-hidden">
                  {bgUrl ? (
                    <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                      <img
                        src={bgUrl}
                        alt=""
                        className="h-full w-auto object-contain"
                        onError={() => setBgError(true)}
                      />
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 via-zinc-900 to-black" />
                  )}
                  {/* Light vignette for readability */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />
                </div>

              {/* God Mode — compact top-left */}
              {showGodMode && (
                <GodModeChip
                  selectedIngredients={mixer.ingredients}
                  chargeLevel={charge.chargeLevel}
                  onForceOutcome={handleForceOutcome}
                  onSkipSpin={() => slotAnim.skipToReveal()}
                  onSkipAll={() => {
                    mixerSounds.playLineComplete()
                    slotAnim.skipToReveal()
                    mixer.triggerSpin(8, selectedMethod || 'braise')
                    hasTriggeredSpin.current = true
                    annaDoneRef.current = false
                    setShowPostContent(false)
                    setShowClose(false)
                  }}
                />
              )}

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition cursor-pointer active:scale-90 z-30"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Ambient sparkle particles */}
              <div className="absolute inset-0 pointer-events-none z-[3] overflow-hidden">
                {Array.from({ length: 6 }, (_, i) => (
                  <motion.span
                    key={i}
                    className="absolute text-[8px] text-yellow-400"
                    initial={{ opacity: 0.3, y: '110%' }}
                    animate={{ opacity: [0.3, 0.6, 0], y: '-10%' }}
                    transition={{
                      duration: 5 + Math.random() * 3,
                      repeat: Infinity,
                      delay: i * 1.8 + Math.random() * 0.5,
                      ease: 'linear',
                    }}
                    style={{ left: `${8 + Math.random() * 84}%` }}
                  >
                    ✦
                  </motion.span>
                ))}
              </div>

              {/* Scrollable content area */}
              {/* Scrollable content area */}
              <div className="relative z-10 flex-1 flex flex-col min-h-0 overflow-y-auto mixer-scroll"
                style={{
                  msOverflowStyle: 'none',
                  scrollbarWidth: 'none',
                }}
              >
                <style>{`.mixer-scroll::-webkit-scrollbar { display: none; }`}</style>
                {/* Neon title — Las Vegas sign */}
                <motion.h1
                  initial={{ y: -50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="text-center pt-4 pb-1"
                >
                  <motion.span
                    className="text-lg font-black tracking-[4px] uppercase inline-block"
                    animate={{ opacity: [1, 0.75, 1, 0.65, 1] }}
                    transition={{ duration: 4, repeat: Infinity, times: [0, 0.96, 0.97, 0.98, 1], ease: 'easeInOut' }}
                    style={{
                      color: '#fff',
                      textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 20px #FFD700, 0 0 40px #FFD700, 0 0 80px #FF8C00',
                    }}
                  >
                    ✦ УДАЧНАЯ КУХНЯ ✦
                  </motion.span>
                </motion.h1>

                {/* Dish name — WOW moment at bomb phase */}
                <AnimatePresence>
                  {(slotAnim.phase === 'bomb' || slotAnim.phase === 'reveal') && mixer.geminiResult && (
                    <motion.div
                      key="dish-wow"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <DishResult
                        dishName={mixer.geminiResult.dishName}
                        outcomeType={mixer.outcomeType}
                        isVisible={true}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Slot machine body */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  onAnimationComplete={() => setEntrancePhase('landed')}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 20,
                    mass: 1,
                  }}
                  className="flex-shrink-0"
                >
                  <SlotMachine
                    ingredients={mixer.ingredients}
                    isSpinning={isSpinning}
                    reelStopped={reelStopped}
                    showConfetti={slotAnim.showConfetti}
                    bombFlash={slotAnim.bombFlash}
                    scenarioType={config.scenarioType}
                    spinSpeed={charge.spinSpeed}
                    onReelStop={handleReelStop}
                    disabled={slotAnim.phase !== 'ready'}
                    showCenterLine={slotAnim.phase === 'bomb' || slotAnim.phase === 'reveal'}
                  />
                </motion.div>

                {/* Cooking method buttons + Charge control — below machine */}
                {!isPostSpin && entrancePhase === 'landed' && !hasTriggeredSpin.current && (
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.3 }}
                    className="mx-4 mb-2 flex flex-col items-center gap-3"
                  >
                    {/* Three glass cooking method buttons */}
                    <div className="flex gap-3 w-full">
                      {COOKING_BUTTONS.map((btn, idx) => {
                        const isSelected = selectedMethod === btn.method
                        const isBlinkActive = selectedMethod === null && blinkSlot === idx
                        const isPressed = pressedBtn === btn.method
                        const isDimmed = selectedMethod !== null && !isSelected

                        let scale = 0.95
                        let opacity = 0.55
                        let borderColor = 'rgba(255,255,255,0.35)'
                        let boxShadow = '0 4px 12px rgba(0,0,0,0.5), 0 2px 0 rgba(255,255,255,0.2) inset, 0 -2px 0 rgba(0,0,0,0.4) inset'
                        let filter = 'none'

                        if (isDimmed) {
                          opacity = 0.35
                          filter = 'grayscale(40%)'
                        } else if (isSelected) {
                          scale = 1.07
                          opacity = 1
                          borderColor = 'rgba(255,255,255,0.7)'
                          boxShadow = `0 0 36px ${btn.glowColor}, 0 0 72px ${btn.glowColor}20, 0 4px 12px rgba(0,0,0,0.5), 0 2px 0 rgba(255,255,255,0.2) inset, 0 -2px 0 rgba(0,0,0,0.4) inset`
                        } else if (isBlinkActive) {
                          scale = 1.04
                          opacity = 1
                          borderColor = btn.borderColor
                          boxShadow = `0 0 18px ${btn.glowColor}, 0 4px 12px rgba(0,0,0,0.5), 0 2px 0 rgba(255,255,255,0.2) inset, 0 -2px 0 rgba(0,0,0,0.4) inset`
                        }

                        if (isPressed && !isDimmed) scale = 0.95

                        return (
                          <motion.button
                            key={btn.method}
                            disabled={isDimmed}
                            onClick={() => { if (selectedMethod === null) { setSelectedMethod(btn.method); mixerSounds.playMethodSelect() } }}
                            onPointerDown={() => setPressedBtn(btn.method)}
                            onPointerUp={() => setPressedBtn(null)}
                            onPointerLeave={() => setPressedBtn(null)}
                            className="relative flex-1 rounded-2xl overflow-hidden cursor-pointer select-none outline-none border-2"
                            animate={{ scale, opacity, borderColor, boxShadow, filter }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            style={{
                              touchAction: 'manipulation',
                              padding: '10px 8px',
                              background: btn.baseBg,
                            }}
                          >
                            {/* Glass shine streak */}
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                top: '8%', left: '10%', width: '55%', height: '36%',
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.12) 55%, transparent 100%)',
                                borderRadius: '6px',
                                transform: isPressed ? 'translateY(2px)' : 'none',
                                transition: 'transform 0.15s',
                              }}
                            />
                            {/* Brief flash on press */}
                            {isPressed && (
                              <div className="absolute inset-0 pointer-events-none"
                                style={{ background: 'rgba(255,255,255,0.15)' }}
                              />
                            )}
                            <span className="relative z-10 text-sm font-bold text-white leading-tight"
                              style={{ letterSpacing: '0.5px', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                            >
                              {btn.label}
                            </span>
                          </motion.button>
                        )
                      })}
                    </div>

                    {/* Glass triangle hold button — SVG with rounded corners */}
                    <div className="flex flex-col items-center">
                      <motion.div
                        className={`relative select-none ${!chargeDisabled ? 'cursor-pointer' : ''}`}
                        style={{ width: 180, height: 160, touchAction: 'none' }}
                        animate={
                          chargeDisabled
                            ? { opacity: 0.3, filter: 'drop-shadow(0 0 0px transparent)' }
                            : {
                                opacity: 1,
                                scale: isHolding ? [1, 1.04, 1] : selectedMethod ? [1, 1.03, 1] : 1,
                                filter: isHolding
                                  ? [
                                      'drop-shadow(0 0 20px rgba(0,255,100,0.6))',
                                      'drop-shadow(0 0 40px rgba(0,255,100,0.9))',
                                      'drop-shadow(0 0 20px rgba(0,255,100,0.6))',
                                    ]
                                  : selectedMethod
                                    ? [
                                        'drop-shadow(0 0 10px rgba(0,255,80,0.5))',
                                        'drop-shadow(0 0 28px rgba(0,255,80,0.8))',
                                        'drop-shadow(0 0 10px rgba(0,255,80,0.5))',
                                      ]
                                    : 'drop-shadow(0 0 6px rgba(255,255,255,0.15))',
                              }
                        }
                        transition={
                          isHolding
                            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                            : selectedMethod
                              ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                              : { duration: 0.3 }
                        }
                        onPointerDown={(e) => {
                          e.preventDefault()
                          if (!chargeDisabled) {
                            charge.startHold()
                            mixerSounds.startChargeHum()
                          }
                        }}
                        onPointerUp={() => {
                          if (charge.isHeld) {
                            const secs = charge.endHold()
                            mixerSounds.stopChargeHum()
                            if (secs > 0) handleLeverRelease(secs)
                          }
                        }}
                        onPointerLeave={() => {
                          if (charge.isHeld) {
                            const secs = charge.endHold()
                            mixerSounds.stopChargeHum()
                            if (secs > 0) handleLeverRelease(secs)
                          }
                        }}
                      >
                        <svg viewBox="0 0 170 148" className="absolute inset-0 w-full h-full pointer-events-none">
                          <defs>
                            <linearGradient id="tri-inactive" x1="85" y1="0" x2="85" y2="148" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="#2a2a4e" />
                              <stop offset="60%" stopColor="#1a1a3e" />
                              <stop offset="100%" stopColor="#0d0d1a" />
                            </linearGradient>
                            <linearGradient id="tri-active" x1="85" y1="0" x2="85" y2="148" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="rgba(0,200,70,0.95)" />
                              <stop offset="60%" stopColor="rgba(0,140,40,0.9)" />
                              <stop offset="100%" stopColor="rgba(0,80,20,0.95)" />
                            </linearGradient>
                            <linearGradient id="tri-charge" x1="85" y1="148" x2="85" y2="0" gradientUnits="userSpaceOnUse">
                              <stop offset="0%" stopColor="rgba(0,255,100,0.7)" />
                              <stop offset="100%" stopColor="rgba(0,255,100,0.1)" />
                            </linearGradient>
                            <clipPath id="tri-clip">
                              <path d="M40 6 Q10 6 25 22 L50 120 Q85 148 120 120 L145 22 Q160 6 130 6 Z" />
                            </clipPath>
                          </defs>

                          {/* Bottom shadow edge (behind body) */}
                          <path d="M40 6 Q10 6 25 22 L50 120 Q85 148 120 120 L145 22 Q160 6 130 6 Z"
                            fill="none"
                            stroke="rgba(0,0,0,0.4)"
                            strokeWidth={2.5}
                            transform="translate(0, 2)"
                          />

                          {/* Body */}
                          <path d="M40 6 Q10 6 25 22 L50 120 Q85 148 120 120 L145 22 Q160 6 130 6 Z"
                            fill={selectedMethod ? 'url(#tri-active)' : 'url(#tri-inactive)'}
                            stroke={selectedMethod ? 'rgba(100,255,140,0.6)' : 'rgba(255,255,255,0.35)'}
                            strokeWidth={2.5}
                          />

                          {/* Inner edge highlight — volumetric bevel */}
                          <g transform="translate(85, 52) scale(0.87) translate(-85, -52)">
                            <path d="M40 6 Q10 6 25 22 L50 120 Q85 148 120 120 L145 22 Q160 6 130 6 Z"
                              fill="none"
                              stroke={selectedMethod ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}
                              strokeWidth={1}
                            />
                          </g>

                          {/* Charge fill — rises from bottom */}
                          {charge.chargeProgress > 0 && (
                            <g clipPath="url(#tri-clip)">
                              <rect
                                x={0}
                                y={148 * (1 - charge.chargeProgress)}
                                width={170}
                                height={148 * charge.chargeProgress}
                                fill="url(#tri-charge)"
                                style={{ mixBlendMode: 'screen' }}
                              />
                            </g>
                          )}

                          {/* Glass shine */}
                          <path d="M85 20 L35 75 L135 75 Z" fill="rgba(255,255,255,0.12)" />
                          <path d="M85 32 L48 68 L122 68 Z" fill="rgba(255,255,255,0.08)" />
                        </svg>

                        {/* Center text */}
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white z-10 leading-tight text-center"
                          style={{ paddingTop: 24, whiteSpace: 'pre-line' }}
                        >
                          {charge.isAtMax
                            ? '\u26A1 МАКСИМУМ!'
                            : charge.isHeld
                              ? `${Math.round(charge.chargeProgress * 100)}%`
                              : ''}
                        </span>
                      </motion.div>
                      {/* Label below triangle */}
                      {!charge.isHeld && !charge.isAtMax && (
                        <span className="text-sm font-bold text-center mt-2"
                          style={{
                            color: selectedMethod ? '#00ff88' : 'rgba(255,255,255,0.4)',
                            textShadow: selectedMethod ? '0 0 10px #00ff88' : 'none',
                            letterSpacing: '1px',
                          }}
                        >
                          Нажми и держи
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Post-spin content */}
                {isPostSpin && (
                  <div className="flex flex-col pb-4">
                    {/* Anna — slides up first */}
                    {showAnna && mixer.geminiResult && (
                      <AnnaPanel
                        text={mixer.geminiResult.phase2.text}
                        intensity={mixer.geminiResult.phase2.intensity}
                        outcomeType={mixer.outcomeType}
                        ingredientCount={mixer.ingredients.length}
                        onTypingComplete={handleAnnaTypingComplete}
                      />
                    )}

                    {/* Nutrients block — 200ms after Anna */}
                    {showNutrients && mixer.geminiResult && (
                      <NutrientsBlock
                        nutrients={mixer.nutrients!}
                        micronutrients={mixer.micronutrients}
                      />
                    )}

                    {/* Close button */}
                    {showClose && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-1.5 px-4 pt-2"
                      >
                        {mixer.savedDish && (
                          <p className="text-[10px] text-emerald-400 font-semibold" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                            Сохранено в «Миксер» ✓
                          </p>
                        )}
                        <button
                          onClick={onClose}
                          className="px-6 py-2 rounded-xl bg-white/10 backdrop-blur-sm text-white font-bold text-sm hover:bg-white/20 transition-all cursor-pointer active:scale-98 border border-white/20"
                        >
                          Закрыть
                        </button>
                      </motion.div>
                    )}
                </div>
              )}
              </div>
              </div>

              {/* Right side bulbs */}
              <div className="flex flex-col gap-[6px] justify-center shrink-0">
                {Array.from({ length: SIDE_BULBS }, (_, i) =>
                  renderBulb(activeBulbIndex === TOP_BULBS + SIDE_BULBS + i, BULB_COLORS[(TOP_BULBS + SIDE_BULBS + i) % BULB_COLORS.length], TOP_BULBS + SIDE_BULBS + i)
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
