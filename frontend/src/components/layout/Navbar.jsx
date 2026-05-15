import { motion } from 'framer-motion'
import { Sparkles, LogOut, Search, X } from 'lucide-react'
import useAuthStore from '@/store/authStore'
import useNoteStore from '@/store/noteStore'
import { useState } from 'react'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const { searchQuery, setSearchQuery } = useNoteStore()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-0 left-0 right-0 z-50 glass"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <span className="text-lg font-bold text-white font-[family-name:var(--font-handwriting)]">
            What-you-write ?
          </span>
        </div>

        {/* Search + Actions */}
        <div className="flex items-center gap-3">
          {searchOpen ? (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 250, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="relative"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                autoFocus
                type="text"
                placeholder="Search notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchQuery('') }}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-neutral-500 hover:text-white" />
              </button>
            </motion.div>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Search className="w-5 h-5 text-neutral-400" />
            </button>
          )}

          <span className="text-sm text-neutral-500 hidden sm:block">
            {user?.email}
          </span>

          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors group"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-neutral-400 group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      </div>
    </motion.nav>
  )
}
