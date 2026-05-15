import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, StickyNote, Search, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react'
import Navbar from '@/components/layout/Navbar'
import StickyNoteCard from '@/components/notes/StickyNote'
import NoteListItem from '@/components/notes/NoteListItem'
import CreateNoteModal from '@/components/notes/CreateNoteModal'
import AIChatPanel from '@/components/ai/AIChatPanel'
import NotesSkeleton from '@/components/notes/NotesSkeleton'
import { useNotes, useSearchNotes } from '@/hooks/useNotes'
import useNoteStore from '@/store/noteStore'
import { noteStagger } from '@/animations/variants'

const PAGE_SIZE = 10

export default function DashboardPage() {
  const [page, setPage] = useState(1)
  const { searchQuery, openCreateModal, viewMode, setViewMode } = useNoteStore()

  const { data, isLoading } = useNotes(page)
  const { data: searchData, isLoading: searchLoading } = useSearchNotes(searchQuery)

  const isSearching = searchQuery.length > 0
  const notes = isSearching ? searchData?.notes || [] : data?.notes || []
  const total = isSearching ? searchData?.total || 0 : data?.total || 0
  const loading = isSearching ? searchLoading : isLoading
  const totalPages = Math.ceil(total / PAGE_SIZE)

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

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center bg-white/[0.05] rounded-lg p-1 border border-white/[0.08]">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'cards'
                    ? 'bg-purple-600/30 text-purple-300 shadow-sm shadow-purple-600/10'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Card view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-purple-600/30 text-purple-300 shadow-sm shadow-purple-600/10'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* New Note button */}
            <motion.button
              whileHover={{ scale: 1.05, rotate: 2 }}
              whileTap={{ scale: 0.95 }}
              onClick={openCreateModal}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-sm font-semibold text-white shadow-lg shadow-purple-600/20 hover:shadow-purple-600/40 transition-shadow"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Note</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Notes content */}
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
            {/* Cards View */}
            {viewMode === 'cards' && (
              <motion.div
                key="cards"
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
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-2 max-w-4xl mx-auto"
              >
                {/* List header */}
                <div className="flex items-center gap-4 px-4 py-2 text-[11px] font-medium uppercase tracking-wider text-neutral-600">
                  <div className="w-2.5" />
                  <div className="flex-1">Title</div>
                  <div className="hidden sm:block w-20 text-right">Updated</div>
                  <div className="w-20" />
                  <div className="w-4" />
                </div>

                <AnimatePresence>
                  {notes.map((note, i) => (
                    <NoteListItem key={note.id} note={note} index={i} />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Pagination */}
            {!isSearching && totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-2 mt-12"
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-neutral-400 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                      p === page
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                        : 'bg-white/5 text-neutral-500 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {p}
                  </button>
                ))}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 disabled:hover:text-neutral-400 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <span className="text-xs text-neutral-600 ml-3">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </span>
              </motion.div>
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
