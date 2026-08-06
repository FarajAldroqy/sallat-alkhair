import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { KeyRound, Lock, User, AlertCircle, CheckCircle2, X } from 'lucide-react'

import type { UserAccount } from '@/types'

interface LoginPageProps {
  onLoginSuccess: () => void
}

const BG_IMAGES = ['/bg1.jpg', '/bg2.jpg', '/bg3.jpg', '/bg4.jpg']

const DEFAULT_USER: UserAccount = {
  id: '1',
  username: 'admin',
  password: 'admin',
  permissions: ['delete_items', 'manage_users', 'manage_treasury', 'edit_data', 'export_reports'],
  recoveryKeys: ['KEY-101', 'KEY-102', 'KEY-103', 'KEY-104', 'KEY-105'],
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  // Form State
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Recovery Key Modal State
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false)
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('')
  const [recoveryError, setRecoveryError] = useState('')
  const [recoverySuccess, setRecoverySuccess] = useState('')

  // Pick random background on mount
  const [bgImage, setBgImage] = useState('/bg1.jpg')
  useEffect(() => {
    const randomBg = BG_IMAGES[Math.floor(Math.random() * BG_IMAGES.length)]
    setBgImage(randomBg)
  }, [])

  // Helper to fetch system users from localStorage
  const getStoredUsers = (): UserAccount[] => {
    const stored = localStorage.getItem('system_users')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch {
        // Fallback to default
      }
    }
    localStorage.setItem('system_users', JSON.stringify([DEFAULT_USER]))
    return [DEFAULT_USER]
  }

  // Handle Standard Credentials Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const systemUsers = getStoredUsers()
    const trimmedUser = username.trim().toLowerCase()

    const matchedUser = systemUsers.find(
      (u) => u.username.toLowerCase() === trimmedUser && u.password === password
    )

    if (matchedUser) {
      sessionStorage.setItem('is_logged_in', 'true')
      sessionStorage.setItem('current_username', matchedUser.username)
      sessionStorage.setItem('current_display_name', matchedUser.displayName || matchedUser.username)
      onLoginSuccess()
    } else {
      setErrorMsg('اسم المستخدم أو كلمة السر غير صحيحة')
    }
  }

  // Handle Recovery Key Consumption
  const handleVerifyRecoveryKey = (e: React.FormEvent) => {
    e.preventDefault()
    setRecoveryError('')
    setRecoverySuccess('')

    const systemUsers = getStoredUsers()
    const enteredKey = recoveryKeyInput.trim().toUpperCase()

    let matchedUserIndex = -1
    let matchedKeyIndex = -1

    for (let uIdx = 0; uIdx < systemUsers.length; uIdx++) {
      const u = systemUsers[uIdx]
      const kIdx = u.recoveryKeys.findIndex((k) => k.trim().toUpperCase() === enteredKey)
      if (kIdx !== -1) {
        matchedUserIndex = uIdx
        matchedKeyIndex = kIdx
        break
      }
    }

    if (matchedUserIndex !== -1 && matchedKeyIndex !== -1) {
      const targetUser = systemUsers[matchedUserIndex]
      const updatedKeys = targetUser.recoveryKeys.filter((_, idx) => idx !== matchedKeyIndex)

      const updatedUsers = systemUsers.map((u, idx) => {
        if (idx === matchedUserIndex) {
          return { ...u, recoveryKeys: updatedKeys }
        }
        return u
      })

      // 1. Update system_users in localStorage
      localStorage.setItem('system_users', JSON.stringify(updatedUsers))

      // 2. Authenticate & set current_username and current_display_name
      sessionStorage.setItem('is_logged_in', 'true')
      sessionStorage.setItem('current_username', targetUser.username)
      sessionStorage.setItem('current_display_name', targetUser.displayName || targetUser.username)

      // 3. Show success message
      setRecoverySuccess(`تم التحقق من المفتاح واستهلاكه بنجاح لحساب (${targetUser.username}). جاري الدخول...`)

      setTimeout(() => {
        onLoginSuccess()
      }, 1000)
    } else {
      setRecoveryError('مفتاح الاستعادة غير صحيح أو تم استهلاكه سابقاً')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-100 dark:bg-zinc-950 p-4 font-arabic select-none" dir="rtl">
      {/* Outer Card Container */}
      <div className="max-w-4xl w-full h-[580px] bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200/80 dark:border-zinc-800 flex overflow-hidden">
        
        {/* RIGHT PANEL: RANDOM BACKGROUND IMAGE */}
        <div className="hidden md:block w-1/2 h-full relative overflow-hidden bg-zinc-900">
          <img
            src={bgImage}
            alt="صورة الخلفية العشوائية"
            className="object-cover h-full w-full transition-all duration-700 hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
          <div className="absolute bottom-6 right-6 left-6 text-white text-right space-y-1">
            <h3 className="font-bold text-lg drop-shadow-md">منظومة سلة الخير</h3>
            <p className="text-xs text-zinc-200 drop-shadow-sm font-medium">إدارة السيولة والخزينة والحسابات بكل دقة وأمان</p>
          </div>
        </div>

        {/* LEFT PANEL: FORM AREA (RTL ARABIC) */}
        <div className="w-full md:w-1/2 h-full p-8 md:p-10 flex flex-col justify-between overflow-y-auto bg-white dark:bg-zinc-900">
          
          {/* Header Logos & Title */}
          <div>
            {/* TOP LOGOS (SIDE-BY-SIDE) */}
            <div className="flex items-center justify-center gap-4 mb-6">
              {/* Eagle Emblem */}
              <img
                src="/eagle.png"
                alt="الشعار الوطني"
                className="w-16 h-16 object-contain mix-blend-multiply dark:brightness-125 dark:contrast-125 filter drop-shadow-md"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
              />

              {/* System Circular Logo */}
              <div className="relative w-14 h-14 bg-white dark:bg-zinc-300 rounded-full border-2 border-black dark:border-white shadow-md flex items-center justify-center shrink-0 overflow-hidden p-0">
                <img
                  src="/logo.png"
                  alt="شعار سلة الخير"
                  className="w-full h-full object-cover scale-[1.12]"
                  style={{ imageRendering: 'crisp-edges' }}
                  onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                />
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="text-center">
              <h1 className="font-bold text-2xl text-zinc-900 dark:text-zinc-100">
                مرحباً بعودتك
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                تسجيل الدخول إلى حساب منظومة سلة الخير
              </p>
            </div>
          </div>

          {/* Form Credentials Input */}
          <form onSubmit={handleLogin} className="space-y-4 my-auto">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* INPUT 1: اسم المستخدم */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                اسم المستخدم
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 absolute right-3 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم المستخدم"
                  required
                  className="w-full pr-9 pl-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                />
              </div>
            </div>

            {/* INPUT 2: كلمة السر */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  كلمة السر
                </label>
                {/* FORGOT PASSWORD LINK */}
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryError('')
                    setRecoverySuccess('')
                    setRecoveryKeyInput('')
                    setIsRecoveryOpen(true)
                  }}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  هل نسيت كلمة السر؟
                </button>
              </div>

              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute right-3 text-zinc-400 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pr-9 pl-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                />
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-sm hover:opacity-90 transition-opacity cursor-pointer mt-2 shadow-sm"
            >
              تسجيل الدخول
            </button>
          </form>

          {/* Footer Subtext */}
          <div className="text-center pt-2">
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
              الاسم الافتراضي: <span className="font-mono text-zinc-700 dark:text-zinc-300">admin</span> | السر: <span className="font-mono text-zinc-700 dark:text-zinc-300">admin</span>
            </p>
          </div>
        </div>
      </div>

      {/* RECOVERY KEY MODAL */}
      <AnimatePresence>
        {isRecoveryOpen && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 relative"
            >
              <button
                onClick={() => setIsRecoveryOpen(false)}
                className="absolute left-4 top-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    استعادة الوصول بواسطة مفتاح الأمان
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    استخدم أحد مفاتيح الاستعادة المتاحة للدخول الفوري وتخطي كلمة السر
                  </p>
                </div>
              </div>

              <form onSubmit={handleVerifyRecoveryKey} className="space-y-4">
                {recoveryError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{recoveryError}</span>
                  </div>
                )}

                {recoverySuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{recoverySuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    أدخل مفتاح الاستعادة
                  </label>
                  <div className="relative flex items-center">
                    <KeyRound className="w-4 h-4 absolute right-3 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      value={recoveryKeyInput}
                      onChange={(e) => setRecoveryKeyInput(e.target.value)}
                      placeholder="مثال: KEY-1234"
                      required
                      className="w-full pr-9 pl-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer"
                  >
                    تأكيد المفتاح والدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRecoveryOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
