import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'

export function DarkModeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme')
      if (savedTheme) {
        return savedTheme === 'dark'
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches
    }
    return false
  })

  useEffect(() => {
    const root = document.documentElement
    if (isDark) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDark])

  const toggleDarkMode = () => {
    setIsDark((prev) => !prev)
  }

  return (
    <motion.button
      onClick={toggleDarkMode}
      whileTap={{ scale: 0.95 }}
      aria-label={isDark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      title={isDark ? 'الوضع النهاري (Light Mode)' : 'الوضع الليلي (Dark Mode)'}
      className="w-14 h-8 rounded-full p-1 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 relative cursor-pointer flex items-center justify-between px-1.5 transition-colors duration-300 select-none shrink-0"
    >
      {/* Background Track Icons */}
      <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0 opacity-70" />
      <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0 opacity-70" />

      {/* Sliding Thumb */}
      <motion.div
        animate={{ x: isDark ? 24 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white dark:bg-zinc-950 shadow-md flex items-center justify-center border border-zinc-200/80 dark:border-zinc-800"
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-indigo-400" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </motion.div>
    </motion.button>
  )
}
