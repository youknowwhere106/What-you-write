import { motion } from 'framer-motion'

export default function NotesSkeleton() {
  return (
    <div className="flex flex-wrap gap-6 justify-center p-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="w-56 h-[180px] rounded-sm bg-white/5 animate-pulse"
          style={{ transform: `rotate(${(i % 5 - 2) * 1.2}deg)` }}
        >
          <div className="p-5 space-y-3">
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/5 rounded w-full" />
            <div className="h-3 bg-white/5 rounded w-5/6" />
            <div className="h-3 bg-white/5 rounded w-2/3" />
          </div>
        </motion.div>
      ))}
    </div>
  )
}
