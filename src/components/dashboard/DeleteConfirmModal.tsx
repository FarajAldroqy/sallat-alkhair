import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { AlertTriangle, X } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConfirmModal({ open, onClose, onConfirm }: DeleteConfirmModalProps) {
  const { hasPermission } = usePermission()
  const canDeleteItems = hasPermission('delete_items')

  // Always ensure pointer-events are enabled on body
  useEffect(() => {
    document.body.style.pointerEvents = 'auto'
    return () => {
      document.body.style.pointerEvents = 'auto'
    }
  }, [open])

  // Escape key support
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const handleConfirm = () => {
    if (!canDeleteItems) {
      alert('عذراً، لا تملك صلاحية الحذف')
      onClose()
      return
    }
    document.body.style.pointerEvents = 'auto'
    onConfirm()
    onClose()
  }

  const handleCancel = () => {
    document.body.style.pointerEvents = 'auto'
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-arabic select-none" dir="rtl">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl p-6 z-10 overflow-hidden"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={handleCancel}
              className="absolute left-4 top-4 p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3.5 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60 shadow-xs">
                <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-extrabold font-arabic text-zinc-900 dark:text-zinc-100 leading-tight">
                  نقل المعاملة لسلة المهملات
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-arabic mt-1.5 leading-relaxed">
                  هل أنت متأكد من رغبتك في حذف هذه المعاملة؟ سيتم نقلها إلى سلة المهملات ويمكن استعادتها لاحقاً في أي وقت.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
              <Button
                type="button"
                onClick={handleConfirm}
                className="flex-1 text-xs bg-rose-600 hover:bg-rose-500 text-white font-arabic font-bold rounded-xl shadow-xs py-2.5 h-auto transition-all active:scale-[0.98]"
              >
                تأكيد الحذف
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="flex-1 text-xs bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-arabic font-medium rounded-xl py-2.5 h-auto"
              >
                إلغاء
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
