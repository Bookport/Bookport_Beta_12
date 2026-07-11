import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { resolveAvatarByState, resolveAvatarForCompliance } from '../../../utils/annaAvatarResolver'
import type { MixerOutcomeType } from '../types/mixer.types'

interface AnnaPanelProps {
  text: string
  intensity?: number
  onTypingComplete?: () => void
  outcomeType?: MixerOutcomeType
  ingredientCount?: number
}

export default function AnnaPanel({ text, intensity, onTypingComplete, outcomeType, ingredientCount = 0 }: AnnaPanelProps) {
  const [avatarError, setAvatarError] = useState(false)
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const typingRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const onCompleteRef = useRef(onTypingComplete)
  onCompleteRef.current = onTypingComplete

  const avatarConfig = outcomeType
    ? resolveAvatarForCompliance(outcomeType === 'B' ? 1 : 0, ingredientCount || 10)
    : resolveAvatarByState('Отвечаю', text, intensity)

  useEffect(() => {
    typingRef.current.forEach(clearTimeout)
    typingRef.current = []

    if (!text) {
      setDisplayedText('')
      setIsTyping(false)
      return
    }

    setIsTyping(true)
    setDisplayedText('')
    setAvatarError(false)

    const words = text.split(' ')
    let wordIdx = 0
    let current = ''

    const typeWord = () => {
      if (wordIdx < words.length) {
        current += (wordIdx === 0 ? '' : ' ') + words[wordIdx]
        setDisplayedText(current)
        wordIdx++
        const t = setTimeout(typeWord, 25)
        typingRef.current.push(t)
      } else {
        setIsTyping(false)
        onCompleteRef.current?.()
      }
    }

    const t = setTimeout(typeWord, 400)
    typingRef.current.push(t)

    return () => {
      typingRef.current.forEach(clearTimeout)
    }
  }, [text])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-start gap-3 px-4 py-2"
    >
      <div className="flex-shrink-0 w-11 h-11 rounded-full overflow-hidden bg-zinc-100 border-2 border-zinc-200/60 shadow-sm flex items-center justify-center">
        {avatarConfig?.src && !avatarError ? (
          <img
            src={avatarConfig.src}
            alt="Anna"
            className="w-full h-full object-cover"
            onError={() => setAvatarError(true)}
          />
        ) : (
          <span className="text-lg">🧑‍⚕️</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="relative rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm bg-white/90 backdrop-blur-sm text-zinc-800 border border-white/30">
          <p className="inline">
            {displayedText}
            {isTyping && <span className="inline-block w-0.5 h-4 ml-0.5 bg-current align-text-bottom animate-pulse" />}
          </p>
        </div>
      </div>
    </motion.div>
  )
}
