import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2 } from 'lucide-react'

// Pastel gradient palette that matches sticky note aesthetic
const CLOUD_GRADIENTS = [
  'linear-gradient(135deg, #c4b5fd 0%, #a78bfa 100%)',  // purple
  'linear-gradient(135deg, #93c5fd 0%, #60a5fa 100%)',  // blue
  'linear-gradient(135deg, #fda4af 0%, #fb7185 100%)',  // pink
  'linear-gradient(135deg, #86efac 0%, #4ade80 100%)',  // green
  'linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%)',  // yellow
  'linear-gradient(135deg, #fdba74 0%, #fb923c 100%)',  // orange
  'linear-gradient(135deg, #d8b4fe 0%, #c084fc 100%)',  // violet
  'linear-gradient(135deg, #67e8f9 0%, #22d3ee 100%)',  // cyan
  'linear-gradient(135deg, #fca5a5 0%, #f87171 100%)',  // red
  'linear-gradient(135deg, #a5f3fc 0%, #06b6d4 100%)',  // teal
]

// Generate organic-feeling positions in a cloud around center
function generatePositions(count, centerX, centerY) {
  const positions = []
  const baseRadius = 80
  const angleStep = (2 * Math.PI) / Math.max(count, 1)

  for (let i = 0; i < count; i++) {
    // Spiral outward with some randomness
    const ring = Math.floor(i / 6)
    const radius = baseRadius + ring * 55 + (Math.random() * 30 - 15)
    const angle = angleStep * i + (Math.random() * 0.5 - 0.25)

    const x = centerX + Math.cos(angle) * radius
    const y = centerY + Math.sin(angle) * radius

    positions.push({ x, y })
  }
  return positions
}

function SynonymCloud({ synonym, index, position, gradient, onReplace, onDismiss }) {
  const floatOffset = useMemo(() => ({
    x: Math.random() * 6 - 3,
    y: Math.random() * 8 - 4,
  }), [])

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0,
        x: 0,
        y: 0,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        x: [0, floatOffset.x, -floatOffset.x, floatOffset.x * 0.5, 0],
        y: [0, floatOffset.y, -floatOffset.y * 0.7, floatOffset.y * 0.3, 0],
      }}
      exit={{
        opacity: 0,
        scale: 0.3,
        transition: { duration: 0.4, ease: 'easeIn' },
      }}
      transition={{
        opacity: { duration: 0.3, delay: index * 0.06 },
        scale: {
          type: 'spring',
          stiffness: 350,
          damping: 20,
          delay: index * 0.06,
        },
        x: {
          duration: 3 + Math.random() * 2,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
          delay: index * 0.06,
        },
        y: {
          duration: 2.5 + Math.random() * 2,
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
          delay: index * 0.06,
        },
      }}
      whileHover={{
        scale: 1.18,
        transition: { type: 'spring', stiffness: 400, damping: 15 },
      }}
      whileTap={{ scale: 0.92 }}
      onClick={() => onReplace?.(synonym)}
      className="synonym-cloud"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        background: gradient,
        cursor: 'pointer',
      }}
      title={`Replace with "${synonym}"`}
    >
      <span className="synonym-cloud-text">{synonym}</span>
      <div className="synonym-cloud-glow" style={{ background: gradient }} />
    </motion.div>
  )
}

export default function SynonymClouds({
  synonyms = [],
  isLoading,
  position,
  visible,
  onReplace,
  onDismiss,
}) {
  const [showClouds, setShowClouds] = useState(false)

  // Dynamic auto-hide: >4 synonyms → n seconds so reader can read all
  //                     ≤4 synonyms → 2 seconds
  const autoHideDelay = useMemo(() => {
    const n = synonyms.length
    return n > 4 ? n * 1000 : 2000
  }, [synonyms.length])

  // Stagger the cloud reveal
  useEffect(() => {
    if (visible && synonyms.length > 0) {
      setShowClouds(true)
    }
    return () => setShowClouds(false)
  }, [visible, synonyms])

  // Auto-dismiss after delay
  useEffect(() => {
    if (!showClouds || !visible) return
    const timer = setTimeout(() => {
      setShowClouds(false)
      // Give exit animation time, then dismiss
      setTimeout(() => onDismiss?.(), 350)
    }, autoHideDelay)
    return () => clearTimeout(timer)
  }, [showClouds, visible, autoHideDelay, onDismiss])

  const cloudPositions = useMemo(() => {
    if (!position) return []
    return generatePositions(synonyms.length, 0, 0)
  }, [synonyms.length, position])

  if (!visible || !position) return null

  return (
    <div
      className="synonym-clouds-container"
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 105,
        pointerEvents: 'none',
      }}
    >
      {/* Sparkle/glow backdrop */}
      <AnimatePresence>
        {showClouds && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="synonym-clouds-glow-ring"
          />
        )}
      </AnimatePresence>

      {/* Loading state */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="synonym-clouds-loading"
        >
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
        </motion.div>
      )}

      {/* Synonym clouds */}
      <AnimatePresence>
        {showClouds &&
          synonyms.map((syn, i) => (
            <SynonymCloud
              key={syn}
              synonym={syn}
              index={i}
              position={cloudPositions[i] || { x: 0, y: 0 }}
              gradient={CLOUD_GRADIENTS[i % CLOUD_GRADIENTS.length]}
              onReplace={onReplace}
              onDismiss={onDismiss}
            />
          ))}
      </AnimatePresence>
    </div>
  )
}
