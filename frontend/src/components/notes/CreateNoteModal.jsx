import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Palette } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import { useCreateNote } from '@/hooks/useNotes'
import useNoteStore from '@/store/noteStore'
import { modalBackdrop, modalContent } from '@/animations/variants'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
} from 'lucide-react'

const colors = [
  { name: 'yellow', class: 'bg-note-yellow' },
  { name: 'pink', class: 'bg-note-pink' },
  { name: 'blue', class: 'bg-note-blue' },
  { name: 'green', class: 'bg-note-green' },
  { name: 'purple', class: 'bg-note-purple' },
  { name: 'orange', class: 'bg-note-orange' },
]

export default function CreateNoteModal() {
  const { isCreateModalOpen, closeCreateModal } = useNoteStore()
  const [title, setTitle] = useState('')
  const [color, setColor] = useState('yellow')
  const createNote = useCreateNote()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Start writing your note...' }),
    ],
    content: '',
    editorProps: {
      attributes: { class: 'prose prose-sm max-w-none focus:outline-none' },
    },
  })

  const handleSubmit = () => {
    if (!title.trim() || !editor?.getHTML()) return
    createNote.mutate(
      { title: title.trim(), content: editor.getHTML(), color },
      {
        onSuccess: () => {
          setTitle('')
          setColor('yellow')
          editor?.commands.clearContent()
          closeCreateModal()
        },
      }
    )
  }

  const ToolbarBtn = ({ onClick, active, children, title: btnTitle }) => (
    <button
      type="button"
      onClick={onClick}
      title={btnTitle}
      className={`p-1.5 rounded transition-colors ${
        active ? 'bg-purple-500/20 text-purple-300' : 'text-neutral-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {children}
    </button>
  )

  return (
    <AnimatePresence>
      {isCreateModalOpen && (
        <motion.div
          variants={modalBackdrop}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeCreateModal}
        >
          <motion.div
            variants={modalContent}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl glass-strong rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/15">
              <h2 className="text-lg font-semibold text-white">Create Note</h2>
              <button
                onClick={closeCreateModal}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <input
                type="text"
                placeholder="Note title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-neutral-400 focus:outline-none focus:border-purple-500/50 text-lg font-[family-name:var(--font-handwriting)]"
              />

              {/* Color picker */}
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-neutral-500" />
                {colors.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setColor(c.name)}
                    className={`w-7 h-7 rounded-full ${c.class} transition-all ${
                      color === c.name
                        ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-neutral-900 scale-110'
                        : 'hover:scale-105'
                    }`}
                  />
                ))}
              </div>

              {/* Toolbar */}
              {editor && (
                <div className="flex items-center gap-1 p-2 bg-white/10 rounded-xl border border-white/15">
                  <ToolbarBtn
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    title="Bold"
                  >
                    <Bold className="w-4 h-4" />
                  </ToolbarBtn>
                  <ToolbarBtn
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    title="Italic"
                  >
                    <Italic className="w-4 h-4" />
                  </ToolbarBtn>
                  <ToolbarBtn
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    active={editor.isActive('underline')}
                    title="Underline"
                  >
                    <UnderlineIcon className="w-4 h-4" />
                  </ToolbarBtn>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <ToolbarBtn
                    onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                    active={editor.isActive('heading', { level: 1 })}
                    title="Heading 1"
                  >
                    <Heading1 className="w-4 h-4" />
                  </ToolbarBtn>
                  <ToolbarBtn
                    onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                    active={editor.isActive('heading', { level: 2 })}
                    title="Heading 2"
                  >
                    <Heading2 className="w-4 h-4" />
                  </ToolbarBtn>
                  <div className="w-px h-5 bg-white/10 mx-1" />
                  <ToolbarBtn
                    onClick={() => editor.chain().focus().toggleBulletList().run()}
                    active={editor.isActive('bulletList')}
                    title="Bullet List"
                  >
                    <List className="w-4 h-4" />
                  </ToolbarBtn>
                  <ToolbarBtn
                    onClick={() => editor.chain().focus().toggleOrderedList().run()}
                    active={editor.isActive('orderedList')}
                    title="Ordered List"
                  >
                    <ListOrdered className="w-4 h-4" />
                  </ToolbarBtn>
                </div>
              )}

              {/* Editor */}
              <div className="tiptap-editor bg-white/10 border border-white/20 rounded-xl min-h-[200px] text-white">
                <EditorContent editor={editor} />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-5 border-t border-white/15">
              <button
                onClick={closeCreateModal}
                className="px-5 py-2.5 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={createNote.isPending || !title.trim()}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-sm font-semibold text-white disabled:opacity-50 hover:shadow-lg hover:shadow-purple-600/25 transition-shadow"
              >
                {createNote.isPending ? 'Creating...' : 'Create Note'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
