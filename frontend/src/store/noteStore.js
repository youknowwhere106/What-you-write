import { create } from 'zustand'

const useNoteStore = create((set) => ({
  selectedNote: null,
  isCreateModalOpen: false,
  isDetailOpen: false,
  isChatOpen: false,
  searchQuery: '',
  viewMode: 'cards', // 'cards' or 'list'

  setSelectedNote: (note) => set({ selectedNote: note }),
  openCreateModal: () => set({ isCreateModalOpen: true }),
  closeCreateModal: () => set({ isCreateModalOpen: false }),
  openDetail: (note) => set({ selectedNote: note, isDetailOpen: true }),
  closeDetail: () => set({ isDetailOpen: false, selectedNote: null }),
  openChat: (note) => set({ selectedNote: note, isChatOpen: true }),
  closeChat: () => set({ isChatOpen: false }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setViewMode: (mode) => set({ viewMode: mode }),
}))

export default useNoteStore
