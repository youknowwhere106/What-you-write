import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'
import { authAPI } from '@/services/api'
import useAuthStore from '@/store/authStore'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = isLogin
        ? await authAPI.login({ email, password })
        : await authAPI.register({ email, password })
      login(res.data.access_token, res.data.user)
      toast.success(isLogin ? 'Welcome back!' : 'Account created!')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-neutral-950">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: [0, 100, -50, 0], y: [0, -80, 60, 0], scale: [1, 1.2, 0.9, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-purple-600/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -80, 60, 0], y: [0, 100, -60, 0], scale: [1, 0.8, 1.1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-blue-600/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, 60, -80, 0], y: [0, -40, 80, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-pink-600/15 blur-3xl"
        />
      </div>

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-strong rounded-2xl p-8 shadow-2xl">
          {/* Branding */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="inline-flex items-center gap-2 mb-4"
            >
              <Sparkles className="w-8 h-8 text-purple-400" />
            </motion.div>
            <h1 className="text-3xl font-bold text-white font-[family-name:var(--font-handwriting)]">
              What-you-write ?
            </h1>
            <p className="text-sm text-neutral-400 mt-2">
              Your AI-powered sticky notes wall
            </p>
          </div>

          {/* Tab switch */}
          <div className="flex mb-6 bg-white/5 rounded-xl p-1">
            {['Login', 'Sign Up'].map((tab, i) => (
              <button
                key={tab}
                onClick={() => setIsLogin(i === 0)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                  (i === 0 ? isLogin : !isLogin)
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Form */}
          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? 'login' : 'signup'}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all"
                />
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-600/25 transition-shadow disabled:opacity-50"
              >
                {loading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </motion.button>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-sm text-neutral-500 mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
