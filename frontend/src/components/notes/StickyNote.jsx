import { motion } from 'framer-motion'
import { MessageCircle, Sparkles, Share2, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useNoteStore from '@/store/noteStore'
import { useDeleteNote } from '@/hooks/useNotes'
import { useMemo } from 'react'

const colorMap = {
  yellow: { bg: 'bg-note-yellow', text: 'text-note-yellow-dark', shadow: 'shadow-yellow-900/20' },
  pink: { bg: 'bg-note-pink', text: 'text-note-pink-dark', shadow: 'shadow-pink-900/20' },
  blue: { bg: 'bg-note-blue', text: 'text-note-blue-dark', shadow: 'shadow-blue-900/20' },
  green: { bg: 'bg-note-green', text: 'text-note-green-dark', shadow: 'shadow-green-900/20' },
  purple: { bg: 'bg-note-purple', text: 'text-note-purple-dark', shadow: 'shadow-purple-900/20' },
  orange: { bg: 'bg-note-orange', text: 'text-note-orange-dark', shadow: 'shadow-orange-900/20' },
}

function stripHtml(html) {
  return html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''
}

export default function StickyNote({ note, index }) {
  const navigate = useNavigate()
  const { openChat } = useNoteStore()
  const deleteMutation = useDeleteNote()

  const rotation = useMemo(() => {
    const seed = note.id.charCodeAt(0) + note.id.charCodeAt(note.id.length - 1)
    return ((seed % 7) - 3) * 0.8
  }, [note.id])

  const colors = colorMap[note.color] || colorMap.yellow
  const preview = stripHtml(note.content).slice(0, 120)

  return (
    <motion.div
      layout
      custom={rotation}
      initial={{ opacity: 0, y: 30, rotate: 0 }}
      animate={{ opacity: 1, y: 0, rotate: rotation }}
      exit={{ opacity: 0, scale: 0.8, rotate: rotation + 5 }}
      whileHover={{
        scale: 1.05,
        rotate: 0,
        y: -8,
        zIndex: 20,
        transition: { duration: 0.2 },
      }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="relative cursor-pointer group"
      onClick={() => navigate(`/note/${note.id}`)}
    >
      <div
        className={`note-pin relative ${colors.bg} ${colors.shadow} rounded-sm p-5 pb-4 shadow-lg w-56 min-h-[180px] flex flex-col note-paper`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* AI Status badge */}
        {note.ai_status === 'ready' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 flex items-center gap-1 bg-green-500/20 text-green-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
          >
            <Sparkles className="w-2.5 h-2.5" />
            AI Ready
          </motion.div>
        )}
        {note.ai_status === 'processing' && (
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500/20 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-2.5 h-2.5 border border-amber-600 border-t-transparent rounded-full"
            />
            Processing
          </div>
        )}

        {/* Shared badge */}
        {note.is_shared && (
          <div className="absolute top-2 left-2">
            <Share2 className="w-3.5 h-3.5 text-neutral-500/60" />
          </div>
        )}

        {/* Title */}
        <h3 className={`font-bold text-sm mb-2 ${colors.text} line-clamp-2 font-[family-name:var(--font-handwriting)] text-lg`}>
          {note.title}
        </h3>

        {/* Preview */}
        <p className={`text-xs ${colors.text} opacity-70 line-clamp-5 flex-1 leading-relaxed`}>
          {preview}
        </p>

        {/* Bottom actions (show on hover) */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation()
              openChat(note)
            }}
            className={`p-1 rounded hover:bg-black/5 ${colors.text}`}
            title="Ask AI"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (confirm('Delete this note?')) deleteMutation.mutate(note.id)
            }}
            className="p-1 rounded hover:bg-red-100 text-red-400"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Shadow underneath */}
      <div className="absolute -bottom-1 left-2 right-2 h-3 bg-black/10 rounded-full blur-md -z-10" />
    </motion.div>
  )
}
