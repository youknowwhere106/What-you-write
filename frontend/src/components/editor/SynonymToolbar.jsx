import { useRef, useLayoutEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen } from 'lucide-react'

export default function SynonymToolbar({ position, onMeaning, visible }) {
  const ref = useRef(null)
  const [style, setStyle] = useState({})

  useLayoutEffect(() => {
    if (!visible || !position || !ref.current) return
    const el = ref.current
    const rect = el.getBoundingClientRect()
    const margin = 10
    const vw = window.innerWidth
    const vh = window.innerHeight

    // position.vx / position.vy are viewport coordinates
    let left = position.vx - rect.width / 2
    let top = position.vy

    // Clamp horizontally
    if (left < margin) left = margin
    if (left + rect.width > vw - margin) left = vw - margin - rect.width
    // Clamp vertically
    if (top < margin) top = margin
    if (top + rect.height > vh - margin) top = vh - margin - rect.height

    setStyle({ left: `${left}px`, top: `${top}px` })
  }, [visible, position])

  return createPortal(
    <AnimatePresence>
      {visible && position && (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 6 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="synonym-toolbar"
          style={{
            position: 'fixed',
            left: style.left || `${position.vx}px`,
            top: style.top || `${position.vy}px`,
            zIndex: 10000,
          }}
        >
          <div className="synonym-toolbar-inner">
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={onMeaning}
              className="synonym-toolbar-btn"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Meaning</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
