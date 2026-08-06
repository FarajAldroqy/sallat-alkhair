import { useState } from 'react'
import { X, User, Database } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AccountSettings } from './AccountSettings'
import { DataManagementSettings } from './DataManagementSettings'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  onLogout: () => void
}

export function SettingsModal({ open, onClose, onLogout }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'account' | 'data'>('account')

  if (!open) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="max-w-2xl w-full h-[550px] bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex overflow-hidden relative font-arabic"
          dir="rtl"
        >
          {/* Close Button (X icon) in top corner */}
          <button
            onClick={onClose}
            className="absolute left-4 top-4 z-10 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>

          {/* INTERNAL SUB-SIDEBAR (RTL Layout) */}
          <div className="w-52 border-l border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col gap-1.5 shrink-0">
            <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-4 px-2">
              الإعدادات
            </h2>

            {/* Tab 1: الحساب */}
            <button
              onClick={() => setActiveTab('account')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-2 text-xs transition-colors cursor-pointer ${
                activeTab === 'account'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold border border-emerald-200/60 dark:border-emerald-900/60'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium'
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>الحساب</span>
            </button>

            {/* Tab 2: إدارة البيانات */}
            <button
              onClick={() => setActiveTab('data')}
              className={`w-full p-2.5 rounded-xl flex items-center gap-2 text-xs transition-colors cursor-pointer ${
                activeTab === 'data'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold border border-emerald-200/60 dark:border-emerald-900/60'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium'
              }`}
            >
              <Database className="w-4 h-4 shrink-0" />
              <span>إدارة البيانات</span>
            </button>
          </div>

          {/* CONTENT PANEL */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'account' ? (
              <AccountSettings onLogout={() => { onClose(); onLogout(); }} />
            ) : (
              <DataManagementSettings />
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
