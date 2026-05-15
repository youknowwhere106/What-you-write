import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Edit3,
  Share2,
  MessageCircle,
  Sparkles,
  Trash2,
  Save,
  X,
  Palette,
  Loader2,
} from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
} from 'lucide-react'
import { useNote, useUpdateNote, useDeleteNote, useShareNote } from '@/hooks/useNotes'
import { useNoteSummary } from '@/hooks/useAI'
import { useDictionary } from '@/hooks/useDictionary'
import useNoteStore from '@/store/noteStore'
import AIChatPanel from '@/components/ai/AIChatPanel'
import SynonymToolbar from '@/components/editor/SynonymToolbar'
import FloatingMeaningPopup from '@/components/editor/FloatingMeaningPopup'

const colorMap = {
  yellow: { bg: 'bg-note-yellow', text: 'text-note-yellow-dark' },
  pink: { bg: 'bg-note-pink', text: 'text-note-pink-dark' },
  blue: { bg: 'bg-note-blue', text: 'text-note-blue-dark' },
  green: { bg: 'bg-note-green', text: 'text-note-green-dark' },
  purple: { bg: 'bg-note-purple', text: 'text-note-purple-dark' },
  orange: { bg: 'bg-note-orange', text: 'text-note-orange-dark' },
}

const colorOptions = [
  { name: 'yellow', class: 'bg-note-yellow' },
  { name: 'pink', class: 'bg-note-pink' },
  { name: 'blue', class: 'bg-note-blue' },
  { name: 'green', class: 'bg-note-green' },
  { name: 'purple', class: 'bg-note-purple' },
  { name: 'orange', class: 'bg-note-orange' },
]

// Extract a clean single word from a text selection
function extractWord(text) {
  if (!text) return ''
  const cleaned = text.trim().replace(/[^a-zA-Z]/g, '')
  if (cleaned.length < 2 || cleaned.length > 50) return ''
  // Only single words
  if (/\s/.test(text.trim())) return ''
  return cleaned.toLowerCase()
}

export default function NotePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: note, isLoading } = useNote(id)
  const { data: summaryData } = useNoteSummary(id)
  const updateNote = useUpdateNote()
  const deleteNote = useDeleteNote()
  const shareNote = useShareNote()
  const { openChat, setSelectedNote } = useNoteStore()

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editColor, setEditColor] = useState('yellow')
  const [shareEmail, setShareEmail] = useState('')
  const [showShare, setShowShare] = useState(false)

  // Word lookup feature state
  const [selectedWord, setSelectedWord] = useState('')
  const [lookupWord, setLookupWord] = useState('')
  const [toolbarPos, setToolbarPos] = useState(null)
  const [showToolbar, setShowToolbar] = useState(false)
  const [showMeaning, setShowMeaning] = useState(false)
  const [meaningPos, setMeaningPos] = useState(null)
  const editorWrapperRef = useRef(null)

  const { data: dictData, isLoading: dictLoading } = useDictionary(lookupWord)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Write something...' }),
    ],
    content: '',
    editable: false,
  })

  useEffect(() => {
    if (note) {
      setEditTitle(note.title)
      setEditColor(note.color)
      editor?.commands.setContent(note.content)
      setSelectedNote(note)
    }
  }, [note, editor])

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing)
    }
  }, [isEditing, editor])

  // ─── Double-click word detection ───
  // We use native dblclick instead of TipTap's selectionUpdate because:
  // 1. dblclick reliably selects exactly one word
  // 2. selectionUpdate fires on drags/multi-word which causes wrong behavior
  useEffect(() => {
    if (!editor) return

    const editorEl = editorWrapperRef.current?.querySelector('.ProseMirror')
    if (!editorEl) return

    const handleDoubleClick = () => {
      // Small delay to let the browser finalize the double-click selection
      requestAnimationFrame(() => {
        const domSelection = window.getSelection()
        if (!domSelection || domSelection.rangeCount === 0) return

        const text = domSelection.toString()
        const word = extractWord(text)
        if (!word) return

        setSelectedWord(word)

        // Calculate viewport coordinates for the toolbar
        const range = domSelection.getRangeAt(0)
        const rect = range.getBoundingClientRect()

        // vx = center of the word, vy = just above the word
        const vx = rect.left + rect.width / 2
        const vy = rect.top - 10

        setToolbarPos({ vx, vy })
        setShowToolbar(true)
      })
    }

    // Hide toolbar on single click / cursor move (but not when popups are open)
    const handleClick = () => {
      if (!showMeaning) {
        setShowToolbar(false)
      }
    }

    editorEl.addEventListener('dblclick', handleDoubleClick)
    editorEl.addEventListener('click', handleClick)
    return () => {
      editorEl.removeEventListener('dblclick', handleDoubleClick)
      editorEl.removeEventListener('click', handleClick)
    }
  }, [editor, showMeaning])

  // ─── Dismiss on outside click ───
  useEffect(() => {
    const handleClick = (e) => {
      if (!editorWrapperRef.current) return
      const target = e.target
      // Don't dismiss if clicking inside toolbar or meaning popup
      if (
        target.closest('.synonym-toolbar') ||
        target.closest('.meaning-popup')
      ) return

      // Dismiss meaning UI if clicking elsewhere
      if (showMeaning) {
        setShowMeaning(false)
        setShowToolbar(false)
        setLookupWord('')
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showMeaning])

  // ─── Auto-dismiss meaning popup after 2 seconds ───
  useEffect(() => {
    if (!showMeaning || dictLoading) return
    const timer = setTimeout(() => {
      setShowMeaning(false)
      setLookupWord('')
    }, 2000)
    return () => clearTimeout(timer)
  }, [showMeaning, dictLoading, dictData])

  const handleMeaning = useCallback(() => {
    if (!selectedWord) return
    setLookupWord(selectedWord)
    setShowToolbar(false)

    // Position popup below toolbar in viewport coordinates
    if (toolbarPos) {
      setMeaningPos({
        vx: toolbarPos.vx,
        vy: toolbarPos.vy + 40,
        wordVy: toolbarPos.vy,
      })
    }
    setShowMeaning(true)
  }, [selectedWord, toolbarPos])

  const handleSave = () => {
    updateNote.mutate(
      { id, data: { title: editTitle, content: editor.getHTML(), color: editColor } },
      { onSuccess: () => setIsEditing(false) }
    )
  }

  const handleDelete = () => {
    if (!confirm('Delete this note permanently?')) return
    deleteNote.mutate(id, { onSuccess: () => navigate('/') })
  }

  const handleShareSubmit = () => {
    if (!shareEmail.trim()) return
    shareNote.mutate(
      { id, email: shareEmail },
      { onSuccess: () => { setShareEmail(''); setShowShare(false) } }
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen wall-texture flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    )
  }

  if (!note) {
    return (
      <div className="min-h-screen wall-texture flex items-center justify-center">
        <p className="text-neutral-500">Note not found</p>
      </div>
    )
  }

  const colors = colorMap[note.color] || colorMap.yellow

  const ToolbarBtn = ({ onClick, active, children, title: t }) => (
    <button
      type="button"
      onClick={onClick}
      title={t}
      className={`p-1.5 rounded transition-colors ${
        active
          ? `bg-black/10 ${colors.text}`
          : `${colors.text} opacity-50 hover:opacity-100`
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="min-h-screen wall-texture">
      <AIChatPanel />

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen flex items-start justify-center pt-8 pb-12 px-4"
      >
        <div className="w-full max-w-3xl">
          {/* Top bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between mb-6"
          >
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Wall
            </button>

            <div className="flex items-center gap-2">
              {/* AI Status */}
              {summaryData?.ai_status === 'ready' && (
                <span className="flex items-center gap-1 bg-green-500/10 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  AI Ready
                </span>
              )}
              {summaryData?.ai_status === 'processing' && (
                <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 text-xs font-medium px-2.5 py-1 rounded-full">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processing
                </span>
              )}

              <button
                onClick={() => openChat(note)}
                className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-purple-400 transition-colors"
                title="Ask AI"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowShare(!showShare)}
                className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-blue-400 transition-colors"
                title="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-white transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={() => { setIsEditing(false); editor?.commands.setContent(note.content); setEditTitle(note.title) }}
                    className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={updateNote.isPending}
                    className="p-2 rounded-lg bg-purple-600 text-white hover:bg-purple-500 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                </div>
              )}
              <button
                onClick={handleDelete}
                className="p-2 rounded-lg hover:bg-white/5 text-neutral-400 hover:text-red-400 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* Share bar */}
          {showShare && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 flex gap-2"
            >
              <input
                type="email"
                placeholder="Enter email to share with..."
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500/50"
              />
              <button
                onClick={handleShareSubmit}
                disabled={shareNote.isPending}
                className="px-4 py-2 bg-blue-600 text-sm text-white rounded-xl hover:bg-blue-500 disabled:opacity-50"
              >
                {shareNote.isPending ? 'Sharing...' : 'Share'}
              </button>
            </motion.div>
          )}

          {/* Note card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className={`${colors.bg} rounded-xl shadow-2xl overflow-hidden note-paper`}
          >
            {/* Color picker (edit mode) */}
            {isEditing && (
              <div className="flex items-center gap-2 p-4 border-b border-black/5">
                <Palette className="w-4 h-4 opacity-50" />
                {colorOptions.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setEditColor(c.name)}
                    className={`w-6 h-6 rounded-full ${c.class} ${
                      editColor === c.name ? 'ring-2 ring-purple-500 ring-offset-1' : ''
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Title */}
            <div className="p-6 pb-0">
              {isEditing ? (
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={`w-full text-2xl font-bold ${colors.text} bg-transparent border-b border-black/10 pb-2 focus:outline-none font-[family-name:var(--font-handwriting)] text-3xl`}
                />
              ) : (
                <h1 className={`text-3xl font-bold ${colors.text} font-[family-name:var(--font-handwriting)]`}>
                  {note.title}
                </h1>
              )}
              <p className="text-xs opacity-40 mt-2">
                {new Date(note.created_at).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>

            {/* Toolbar (edit mode) */}
            {isEditing && editor && (
              <div className="flex items-center gap-1 px-6 pt-4">
                <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
                  <Bold className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
                  <Italic className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
                  <UnderlineIcon className="w-4 h-4" />
                </ToolbarBtn>
                <div className="w-px h-5 bg-black/10 mx-1" />
                <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="H1">
                  <Heading1 className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="H2">
                  <Heading2 className="w-4 h-4" />
                </ToolbarBtn>
                <div className="w-px h-5 bg-black/10 mx-1" />
                <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
                  <List className="w-4 h-4" />
                </ToolbarBtn>
                <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Ordered List">
                  <ListOrdered className="w-4 h-4" />
                </ToolbarBtn>
              </div>
            )}

            {/* Content + Word Lookup */}
            <div ref={editorWrapperRef} className={`tiptap-editor p-6 ${colors.text} min-h-[300px] synonym-feature-wrapper`}>
              <EditorContent editor={editor} />

              {/* Meaning Toolbar — floats near selection */}
              <SynonymToolbar
                position={toolbarPos}
                visible={showToolbar && !showMeaning}
                onMeaning={handleMeaning}
              />

              {/* Meaning Popup */}
              <FloatingMeaningPopup
                data={dictData}
                isLoading={dictLoading}
                position={meaningPos}
                visible={showMeaning}
                onClose={() => { setShowMeaning(false); setLookupWord('') }}
              />
            </div>

            {/* AI Summary */}
            {summaryData?.summary && (
              <div className="mx-6 mb-6 p-4 bg-purple-50 border border-purple-100 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                    AI Summary
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {summaryData.summary}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
