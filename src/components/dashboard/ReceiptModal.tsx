import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Printer, CheckCircle2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types'

interface ReceiptModalProps {
  transaction: Transaction | null
  open: boolean
  onClose: () => void
}

export function ReceiptModal({ transaction, open, onClose }: ReceiptModalProps) {
  if (!transaction) return null

  const isDeposit = transaction.type === 'DEPOSIT'

  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-2xl rounded-2xl p-6" dir="rtl">
        <DialogHeader className="text-right pb-4 border-b border-zinc-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">
                S
              </div>
              <div>
                <DialogTitle className="text-base font-bold font-arabic text-zinc-900">
                  إيصال معاملة مالية
                </DialogTitle>
                <p className="text-[11px] text-zinc-400 font-mono">
                  #REC-2026-{String(transaction.id).padStart(4, '0')}
                </p>
              </div>
            </div>

            <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
              isDeposit
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-rose-50 text-rose-700 border-rose-200'
            }`}>
              {isDeposit ? 'إيداع نقدي / المصرف' : 'سحب نقدي / المصرف'}
            </div>
          </div>
        </DialogHeader>

        {/* Receipt details content */}
        <div className="py-4 space-y-4 font-arabic">
          {/* Amount Hero */}
          <div className="text-center py-4 bg-zinc-50 rounded-xl border border-zinc-200/60">
            <p className="text-xs text-zinc-500 mb-1">المبلغ الإجمالي</p>
            <p className={`text-3xl font-extrabold ar-num ${
              isDeposit ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {isDeposit ? '+' : '-'}{formatCurrency(transaction.amount_cents)}
            </p>
          </div>

          {/* Details Table */}
          <div className="space-y-2.5 text-xs text-zinc-700">
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">اسم الجهة / العميل:</span>
              <span className="font-semibold text-zinc-900">{transaction.client_name}</span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">نوع العملية:</span>
              <span className="font-semibold text-zinc-900">
                {isDeposit ? 'إيداع' : 'سحب'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">اسلوب الدفع:</span>
              <span className="font-semibold text-zinc-900">
                {transaction.payment_method || 'نقداً'}
              </span>
            </div>

            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500 font-medium">تاريخ ووقت العملية:</span>
              <span className="font-medium text-zinc-800 ar-num" dir="ltr">
                {formatDate(transaction.created_at)}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500 font-medium">حالة الإيصال:</span>
              <span className="font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                مكتمد ومعتمد
              </span>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <DialogFooter className="flex-row-reverse gap-2 pt-3 border-t border-zinc-100">
          <Button
            type="button"
            onClick={handlePrint}
            className="flex-1 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-arabic font-semibold rounded-lg"
          >
            <Printer className="w-3.5 h-3.5" />
            طباعة الإيصال
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 text-xs bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-arabic rounded-lg"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
