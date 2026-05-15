import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notesAPI } from '@/services/api'
import toast from 'react-hot-toast'

export function useNotes(page = 1) {
  return useQuery({
    queryKey: ['notes', page],
    queryFn: () =>
      notesAPI.getAll(page).then((r) => ({
        notes: r.data,
        total: parseInt(r.headers['x-total-count'] || '0', 10),
        page: parseInt(r.headers['x-page'] || '1', 10),
        page_size: parseInt(r.headers['x-page-size'] || '10', 10),
      })),
    staleTime: 30_000,
  })
}

export function useNote(id) {
  return useQuery({
    queryKey: ['note', id],
    queryFn: () => notesAPI.getById(id).then((r) => r.data),
    enabled: !!id,
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data) => notesAPI.create(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note created!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create note'),
  })
}

export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }) => notesAPI.update(id, data).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      qc.invalidateQueries({ queryKey: ['note', data.id] })
      toast.success('Note updated!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to update note'),
  })
}

export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => notesAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] })
      toast.success('Note deleted!')
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to delete note'),
  })
}

export function useShareNote() {
  return useMutation({
    mutationFn: ({ id, email }) => notesAPI.share(id, email).then((r) => r.data),
    onSuccess: () => toast.success('Note shared!'),
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to share note'),
  })
}

export function useSearchNotes(query) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () =>
      notesAPI.search(query).then((r) => ({
        notes: r.data,
        total: parseInt(r.headers['x-total-count'] || '0', 10),
        page: parseInt(r.headers['x-page'] || '1', 10),
        page_size: parseInt(r.headers['x-page-size'] || '10', 10),
      })),
    enabled: !!query && query.length > 0,
    staleTime: 10_000,
  })
}
