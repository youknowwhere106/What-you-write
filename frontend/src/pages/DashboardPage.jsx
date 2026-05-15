import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, StickyNote, Search } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import StickyNoteCard from '@/components/notes/StickyNote'
import CreateNoteModal from '@/components/notes/CreateNoteModal'
import AIChatPanel from '@/components/ai/AIChatPanel'
import NotesSkeleton from '@/components/notes/NotesSkeleton'
import { useNotes, useSearchNotes } from '@/hooks/useNotes'
import useNoteStore from '@/store/noteStore'
import { noteStagger } from '@/animations/variants'

export default function DashboardPage() {
  const [page, setPage] = useState(1)
  const { searchQuery, openCreateModal } = useNoteStore()

  const { data, isLoading } = useNotes(page)
  const { data: searchData, isLoading: searchLoading } = useSearchNotes(searchQuery)

  const isSearching = searchQuery.length > 0
  const notes = isSearching ? searchData?.notes || [] : data?.notes || []
  const total = isSearching ? searchData?.total || 0 : data?.total || 0
  const loading = isSearching ? searchLoading : isLoading

  return (
    <div className="min-h-screen wall-texture">
      <Navbar />

      {/* Main content */}
      <main className="relative pt-24 pb-12 px-4 sm:px-6 max-w-7xl mx-auto z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-between mb-10"
        >
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white font-[family-name:var(--font-handwriting)]">
              {isSearching ? 'Search Results' : 'Your Wall'}
            </h1>
            <p className="text-neutral-500 text-sm mt-1">
              {isSearching
                ? `${total} note${total !== 1 ? 's' : ''} found`
                : `${total} note${total !== 1 ? 's' : ''} on your wall`}
            </p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05, rotate: 2 }}
            whileTap={{ scale: 0.95 }}
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 transition-shadow"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Note</span>
          </motion.button>
        </motion.div>

        {/* Notes grid */}
        {loading ? (
          <NotesSkeleton />
        ) : notes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-24"
          >
            <StickyNote className="w-16 h-16 text-neutral-700 mb-4" />
            <h2 className="text-xl font-semibold text-neutral-400 mb-2">
              {isSearching ? 'No notes found' : 'Your wall is empty'}
            </h2>
            <p className="text-neutral-600 text-sm mb-6">
              {isSearching
                ? 'Try different search terms'
                : 'Create your first sticky note!'}
            </p>
            {!isSearching && (
              <button
                onClick={openCreateModal}
                className="px-6 py-3 bg-purple-600/20 text-purple-400 rounded-xl font-medium hover:bg-purple-600/30 transition-colors"
              >
                Create Note
              </button>
            )}
          </motion.div>
        ) : (
          <>
            <motion.div
              variants={noteStagger}
              initial="hidden"
              animate="visible"
              className="flex flex-wrap gap-6 justify-center"
            >
              <AnimatePresence>
                {notes.map((note, i) => (
                  <StickyNoteCard key={note.id} note={note} index={i} />
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Pagination */}
            {!isSearching && total > 20 && (
              <div className="flex items-center justify-center gap-3 mt-12">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg bg-white/5 text-sm text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-neutral-500">
                  Page {page} of {Math.ceil(total / 20)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= total}
                  className="px-4 py-2 rounded-lg bg-white/5 text-sm text-neutral-400 hover:text-white disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <CreateNoteModal />
      <AIChatPanel />
    </div>
  )
}
