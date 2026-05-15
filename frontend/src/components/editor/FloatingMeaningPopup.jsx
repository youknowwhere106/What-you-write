import { useRef, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, Loader2 } from 'lucide-react'

export default function FloatingMeaningPopup({ data, isLoading, position, visible, onClose }) {
  const ref = useRef(null)
  const [style, setStyle] = useState({})

  useLayoutEffect(() => {
    if (!visible || !position || !ref.current) return
    const el = ref.current
    const rect = el.getBoundingClientRect()
    const margin = 10
    const vw = window.innerWidth
    const vh = window.innerHeight

    // position.vx / position.vy are viewport coordinates (center-x, top-y)
    let left = position.vx - rect.width / 2
    let top = position.vy

    // Clamp horizontally
    if (left < margin) left = margin
    if (left + rect.width > vw - margin) left = vw - margin - rect.width

    // Clamp vertically: if overflowing bottom, flip above the word
    if (top + rect.height > vh - margin) {
      // Flip above: toolbarGap (40px from word to popup) + popup height + extra gap
      top = position.wordVy - rect.height - 8
      // If flipped also overflows top, clamp to top margin
      if (top < margin) top = margin
    }
    if (top < margin) top = margin

    setStyle({ left: `${left}px`, top: `${top}px` })
  }, [visible, position, data, isLoading])

  return createPortal(
    <AnimatePresence>
      {visible && position && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="meaning-popup"
          style={{
            position: 'fixed',
            left: style.left || `${position.vx}px`,
            top: style.top || `${position.vy}px`,
            zIndex: 10001,
          }}
        >
          <div className="meaning-popup-inner">
            {/* Header */}
            <div className="meaning-popup-header">
              <div className="flex items-center gap-2">
                <div className="meaning-popup-icon">
                  <BookOpen className="w-3.5 h-3.5 text-purple-300" />
                </div>
                {data && (
                  <div>
                    <span className="meaning-popup-word">{data.word}</span>
                    {data.part_of_speech && (
                      <span className="meaning-popup-pos">{data.part_of_speech}</span>
                    )}
                  </div>
                )}
              </div>
              <motion.button
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="meaning-popup-close"
              >
                <X className="w-3.5 h-3.5" />
              </motion.button>
            </div>

            {/* Content */}
            <div className="meaning-popup-body">
              {isLoading ? (
                <div className="flex items-center gap-2 py-3 justify-center">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-xs text-purple-300/70">Looking up...</span>
                </div>
              ) : data?.definition ? (
                <p className="meaning-popup-definition">{data.definition}</p>
              ) : (
                <p className="meaning-popup-empty">No definition found.</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
