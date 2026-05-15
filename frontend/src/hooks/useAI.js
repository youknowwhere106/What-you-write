import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { aiAPI } from '@/services/api'

export function useAskAI(noteId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (question) => aiAPI.ask(noteId, question).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-history', noteId] })
    },
  })
}

export function useChatHistory(noteId) {
  return useQuery({
    queryKey: ['chat-history', noteId],
    queryFn: () => aiAPI.getChatHistory(noteId).then((r) => r.data),
    enabled: !!noteId,
  })
}

export function useNoteSummary(noteId) {
  return useQuery({
    queryKey: ['summary', noteId],
    queryFn: () => aiAPI.getSummary(noteId).then((r) => r.data),
    enabled: !!noteId,
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.ai_status === 'pending' || data?.ai_status === 'processing') return 3000
      return false
    },
  })
}

export function useClearChat(noteId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => aiAPI.clearChatHistory(noteId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['chat-history', noteId] }),
  })
}
