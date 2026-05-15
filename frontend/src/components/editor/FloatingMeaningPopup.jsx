import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, Loader2 } from 'lucide-react'

export default function FloatingMeaningPopup({ data, isLoading, position, visible, onClose }) {
  return (
    <AnimatePresence>
      {visible && position && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="meaning-popup"
          style={{
            position: 'absolute',
            left: `${position.x}px`,
            top: `${position.y}px`,
            zIndex: 110,
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
    </AnimatePresence>
  )
}
