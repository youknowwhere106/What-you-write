import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/auth'
    }
    return Promise.reject(err)
  }
)

// ─── Auth ───
export const authAPI = {
  register: (data) => api.post('/register', data),
  login: (data) => api.post('/login', data),
}

// ─── Notes ───
export const notesAPI = {
  getAll: (page = 1, pageSize = 20) =>
    api.get('/notes', { params: { page, page_size: pageSize } }),
  getById: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  share: (id, email) => api.post(`/notes/${id}/share`, { email }),
  search: (q, page = 1) => api.get('/search', { params: { q, page } }),
}

// ─── AI ───
export const aiAPI = {
  ask: (noteId, question) => api.post(`/notes/${noteId}/ask`, { question }),
  getSummary: (noteId) => api.get(`/notes/${noteId}/summary`),
  getChatHistory: (noteId) => api.get(`/notes/${noteId}/chat-history`),
  clearChatHistory: (noteId) => api.delete(`/notes/${noteId}/chat-history`),
}

// ─── Dictionary ───
export const dictionaryAPI = {
  lookup: (word) => api.get(`/dictionary/${encodeURIComponent(word)}`),
}

export default api
