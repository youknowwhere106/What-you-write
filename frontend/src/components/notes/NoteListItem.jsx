import { motion } from 'framer-motion'
import { MessageCircle, Sparkles, Share2, Trash2, ChevronRight, Clock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useNoteStore from '@/store/noteStore'
import { useDeleteNote } from '@/hooks/useNotes'

const colorMap = {
  yellow: { bg: 'bg-note-yellow/40', dot: 'bg-yellow-400', text: 'text-note-yellow-dark' },
  pink: { bg: 'bg-note-pink/40', dot: 'bg-pink-400', text: 'text-note-pink-dark' },
  blue: { bg: 'bg-note-blue/40', dot: 'bg-blue-400', text: 'text-note-blue-dark' },
  green: { bg: 'bg-note-green/40', dot: 'bg-green-400', text: 'text-note-green-dark' },
  purple: { bg: 'bg-note-purple/40', dot: 'bg-purple-400', text: 'text-note-purple-dark' },
  orange: { bg: 'bg-note-orange/40', dot: 'bg-orange-400', text: 'text-note-orange-dark' },
}

function stripHtml(html) {
  return html?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || ''
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NoteListItem({ note, index }) {
  const navigate = useNavigate()
  const { openChat } = useNoteStore()
  const deleteMutation = useDeleteNote()

  const colors = colorMap[note.color] || colorMap.yellow
  const preview = stripHtml(note.content).slice(0, 200)

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={() => navigate(`/note/${note.id}`)}
      className="group flex items-center gap-4 px-4 py-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] hover:border-white/[0.1] cursor-pointer transition-all duration-200"
    >
      {/* Color dot */}
      <div className={`w-2.5 h-2.5 rounded-full ${colors.dot} shrink-0`} />

      {/* Title & preview */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white truncate">
            {note.title}
          </h3>
          {note.is_shared && (
            <Share2 className="w-3 h-3 text-neutral-500 shrink-0" />
          )}
          {note.ai_status === 'ready' && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded-full shrink-0">
              <Sparkles className="w-2.5 h-2.5" />
              AI
            </span>
          )}
          {note.ai_status === 'processing' && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="w-2.5 h-2.5 border border-amber-400 border-t-transparent rounded-full"
              />
              Processing
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-500 truncate mt-0.5">
          {preview || 'No content'}
        </p>
      </div>

      {/* Date */}
      <div className="hidden sm:flex items-center gap-1 text-xs text-neutral-600 shrink-0">
        <Clock className="w-3 h-3" />
        {formatDate(note.updated_at || note.created_at)}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            openChat(note)
          }}
          className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-500 hover:text-purple-400 transition-colors"
          title="Ask AI"
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (confirm('Delete this note?')) deleteMutation.mutate(note.id)
          }}
          className="p-1.5 rounded-lg hover:bg-red-500/10 text-neutral-500 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-neutral-700 group-hover:text-neutral-400 transition-colors shrink-0" />
    </motion.div>
  )
}
