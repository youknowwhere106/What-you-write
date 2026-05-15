import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Send,
  Sparkles,
  Trash2,
  MessageCircle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useAskAI, useChatHistory, useClearChat } from '@/hooks/useAI'
import useNoteStore from '@/store/noteStore'
import { chatMessage, modalBackdrop } from '@/animations/variants'

const SUGGESTED_PROMPTS = [
  'Summarize this note',
  'Extract action items',
  'Find deadlines',
  'Explain simply',
]

export default function AIChatPanel() {
  const { isChatOpen, selectedNote, closeChat } = useNoteStore()
  const noteId = selectedNote?.id
  const [input, setInput] = useState('')
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const messagesEndRef = useRef(null)

  const askAI = useAskAI(noteId)
  const { data: chatData } = useChatHistory(noteId)
  const clearChat = useClearChat(noteId)

  const messages = chatData?.messages || []

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingAnswer])

  const handleSend = async (text) => {
    const question = text || input.trim()
    if (!question || !noteId) return
    setInput('')
    setStreamingAnswer('')

    askAI.mutate(question, {
      onSuccess: (data) => {
        setStreamingAnswer('')
        // The chat history will be refetched via invalidation
      },
      onError: () => setStreamingAnswer(''),
    })
  }

  if (!isChatOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        variants={modalBackdrop}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 z-50 flex items-center justify-end p-4 bg-black/40 backdrop-blur-sm"
        onClick={closeChat}
      >
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg h-[85vh] glass-strong rounded-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/20 rounded-lg">
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Ask AI</h3>
                <p className="text-xs text-neutral-500 truncate max-w-[200px]">
                  {selectedNote?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => clearChat.mutate()}
                className="p-1.5 rounded-lg hover:bg-white/5 text-neutral-500 hover:text-red-400 transition-colors"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={closeChat}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && !askAI.isPending && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-10 h-10 text-neutral-700 mb-3" />
                <p className="text-sm text-neutral-500 mb-4">
                  Ask anything about your note
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSend(prompt)}
                      className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-full text-neutral-400 hover:text-white hover:border-purple-500/30 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <motion.div
                key={i}
                variants={chatMessage}
                initial="hidden"
                animate="visible"
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-purple-600/80 text-white rounded-br-sm'
                      : 'bg-white/5 text-neutral-300 rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {askAI.isPending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex items-center gap-1.5">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                      className="w-2 h-2 bg-purple-400 rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
                      className="w-2 h-2 bg-purple-400 rounded-full"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
                      className="w-2 h-2 bg-purple-400 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ask about this note..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                disabled={askAI.isPending}
                className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 disabled:opacity-50"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSend()}
                disabled={!input.trim() || askAI.isPending}
                className="p-2.5 bg-purple-600 rounded-xl text-white disabled:opacity-30 hover:bg-purple-500 transition-colors"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
