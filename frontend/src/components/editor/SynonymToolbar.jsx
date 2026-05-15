import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Cloud } from 'lucide-react'

export default function SynonymToolbar({ position, onMeaning, onSynonyms, visible }) {
  return (
    <AnimatePresence>
      {visible && position && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 6 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="synonym-toolbar"
          style={{
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 100,
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

            <div className="synonym-toolbar-divider" />

            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSynonyms}
              className="synonym-toolbar-btn"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>Synonyms</span>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
