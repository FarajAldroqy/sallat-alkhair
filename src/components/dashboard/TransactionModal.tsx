import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react'
import type { TransactionCreate, PaymentMethod } from '@/types'

interface TransactionModalProps {
  open: boolean
  mode: 'DEPOSIT' | 'WITHDRAWAL'
  onClose: () => void
  onSubmit: (data: TransactionCreate) => Promise<void>
}

export function TransactionModal({ open, mode, onClose, onSubmit }: TransactionModalProps) {
  const [clientName, setClientName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('نقداً')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isDeposit = mode === 'DEPOSIT'

  const reset = () => {
    setClientName('')
    setAmountStr('')
    setPaymentMethod('نقداً')
    setError('')
    setLoading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const amount = parseFloat(amountStr.replace(/,/g, ''))
    if (!clientName.trim()) return setError('يرجى إدخال اسم الجهة / العميل')
    if (isNaN(amount) || amount <= 0) return setError('يرجى إدخال مبلغ صحيح أكبر من الصفر')

    setLoading(true)
    try {
      await onSubmit({
        client_name: clientName.trim(),
        type: mode,
        amount_cents: Math.round(amount * 100),
        payment_method: paymentMethod,
        status: 'COMPLETED',
      })
      reset()
      onClose()
    } catch {
      setError('حدث خطأ أثناء حفظ المعاملة، يرجى المحاولة مرة أخرى')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white border-zinc-200 text-zinc-900 shadow-2xl rounded-2xl p-6" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                isDeposit ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {isDeposit
                ? <ArrowDownCircle className="w-5 h-5" />
                : <ArrowUpCircle className="w-5 h-5" />
              }
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-arabic text-zinc-900">
                {isDeposit ? 'تسجيل إيداع جديد' : 'تسجيل سحب جديد'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 font-arabic">
                {isDeposit
                  ? 'أدخل بيانات المعاملة المالية للإيداع أدناه'
                  : 'أدخل بيانات المعاملة المالية للسحب أدناه'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2 font-arabic">
          {/* اسم الجهة */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-client" className="text-xs font-semibold text-zinc-700 block text-right">
              اسم الجهة / العميل
            </Label>
            <Input
              id="modal-client"
              placeholder="مثال: شركة المدار الجديد"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="bg-white border-zinc-200 text-xs text-zinc-900 rounded-lg focus-visible:ring-zinc-400 font-arabic text-right"
              autoComplete="off"
            />
          </div>

          {/* القيمة (د.ل) */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-amount" className="text-xs font-semibold text-zinc-700 block text-right">
              القيمة (بالدينار الليبي د.ل)
            </Label>
            <div className="relative">
              <Input
                id="modal-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="bg-white border-zinc-200 text-xs text-zinc-900 rounded-lg pl-14 font-sans text-left ar-num"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold font-arabic">
                د.ل
              </span>
            </div>
          </div>

          {/* اسلوب الدفع */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-payment-method" className="text-xs font-semibold text-zinc-700 block text-right">
              اسلوب الدفع
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger id="modal-payment-method" className="bg-white border-zinc-200 text-xs text-zinc-900 rounded-lg font-arabic" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200" dir="rtl">
                <SelectItem value="نقداً" className="text-xs text-zinc-800 font-arabic">نقداً (Cash)</SelectItem>
                <SelectItem value="تحويل مصرفي" className="text-xs text-zinc-800 font-arabic">تحويل مصرفي (Bank Transfer)</SelectItem>
                <SelectItem value="بطاقة" className="text-xs text-zinc-800 font-arabic">بطاقة (Card)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-rose-600 font-medium font-arabic text-right">{error}</p>
          )}

          <DialogFooter className="flex-row-reverse gap-2 mt-6">
            <Button
              id="modal-submit-btn"
              type="submit"
              disabled={loading}
              className={`flex-1 text-xs font-arabic font-bold text-white rounded-lg ${
                isDeposit
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-rose-600 hover:bg-rose-500'
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
              {isDeposit ? 'تأكيد الإيداع' : 'تأكيد السحب'}
            </Button>

            <Button
              id="modal-cancel-btn"
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 text-xs bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-arabic rounded-lg"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
