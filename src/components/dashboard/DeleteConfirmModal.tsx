import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteConfirmModal({ open, onClose, onConfirm }: DeleteConfirmModalProps) {
  const { hasPermission } = usePermission()
  const canDeleteItems = hasPermission('delete_items')

  const handleConfirm = () => {
    if (!canDeleteItems) {
      alert('عذراً، لا تملك صلاحية الحذف')
      onClose()
      return
    }
    onConfirm()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-2xl rounded-2xl p-6" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-arabic text-zinc-900">
                حذف المعاملة
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 font-arabic mt-1">
                هل أنت تأكد من رغبتك في حذف هذه المعاملة؟ لا يمكن التراجع عن هذا الإجراء.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogFooter className="flex-row-reverse gap-2 mt-6 font-arabic">
          <Button
            type="button"
            onClick={handleConfirm}
            className="flex-1 text-xs bg-rose-600 hover:bg-rose-500 text-white font-arabic font-bold rounded-lg shadow-sm"
          >
            تأكيد الحذف
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 text-xs bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-arabic rounded-lg"
          >
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
