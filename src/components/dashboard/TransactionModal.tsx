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
import { cleanAndNormalizeAmount } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'

interface TransactionModalProps {
  open: boolean
  mode: 'DEPOSIT' | 'WITHDRAWAL'
  onClose: () => void
  onSubmit: (data: TransactionCreate) => Promise<void>
  entities?: string[]
}

export function TransactionModal({ open, mode, onClose, onSubmit, entities = [] }: TransactionModalProps) {
  const { hasPermission } = usePermission()
  const canEditData = hasPermission('edit_data')

  const [clientName, setClientName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('نقداً')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [customEntityMode, setCustomEntityMode] = useState(false)

  const isDeposit = mode === 'DEPOSIT'

  const reset = () => {
    setClientName('')
    setAmountStr('')
    setPaymentMethod('نقداً')
    setNotes('')
    setError('')
    setLoading(false)
    setCustomEntityMode(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    const validVal = cleanAndNormalizeAmount(rawVal, amountStr)
    setAmountStr(validVal)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!canEditData) {
      setError('عذراً، لا تملك صلاحية إضافة وتعديل البيانات')
      return
    }

    const amount = parseFloat(amountStr.replace(/,/g, ''))
    if (!clientName.trim()) return setError('يرجى اختيار أو إدخال اسم الجهة / العميل')
    if (isNaN(amount) || amount <= 0) return setError('يرجى إدخال مبلغ صحيح أكبر من الصفر')

    setLoading(true)
    try {
      await onSubmit({
        client_name: clientName.trim(),
        type: mode,
        amount_cents: Math.round(amount * 100),
        payment_method: paymentMethod,
        notes: notes.trim(),
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

  const hasSavedEntities = entities.length > 0

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl p-6" dir="rtl">
        <DialogHeader className="text-right">
          <div className="flex items-center gap-3 mb-1">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl ${
                isDeposit
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
              }`}
            >
              {isDeposit
                ? <ArrowDownCircle className="w-5 h-5" />
                : <ArrowUpCircle className="w-5 h-5" />
              }
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-arabic text-zinc-900 dark:text-zinc-100">
                {isDeposit ? 'تسجيل إيداع جديد' : 'تسجيل سحب جديد'}
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 font-arabic">
                {isDeposit
                  ? 'أدخل بيانات المعاملة المالية للإيداع أدناه'
                  : 'أدخل بيانات المعاملة المالية للسحب أدناه'
                }
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2 font-arabic">

          {/* 1. اسم الجهة (Dropdown or Custom Input) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="modal-client" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right">
                اسم الجهة / العميل
              </Label>
              {hasSavedEntities && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomEntityMode((prev) => !prev)
                    setClientName('')
                  }}
                  className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  {customEntityMode ? 'اختيار من الخزينة' : '+ جهة جديدة غير قائمة'}
                </button>
              )}
            </div>

            {!customEntityMode && hasSavedEntities ? (
              /* Styled Select Dropdown for saved entities */
              <div className="relative">
                <select
                  id="modal-client"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full h-9 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-900 dark:text-zinc-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-arabic text-right cursor-pointer"
                >
                  <option value="" disabled>-- اختر الجهة --</option>
                  {entities.map((ent) => (
                    <option key={ent} value={ent} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                      {ent}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              /* Manual Input if customEntityMode or no saved entities */
              <div className="space-y-1">
                <Input
                  id="modal-client"
                  placeholder="مثال: شركة المدار الجديد"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg focus-visible:ring-zinc-400 font-arabic text-right"
                  autoComplete="off"
                />
                {!hasSavedEntities && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    لا توجد جهات مضافة بعد (أضف جهة من الخزينة)
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 2. القيمة (د.ل) مع تحويل الأرقام العربية تلقائياً */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-amount" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right">
              القيمة (بالدينار الليبي د.ل)
            </Label>
            <div className="relative">
              <Input
                id="modal-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amountStr}
                onChange={handleAmountChange}
                className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg pl-14 font-sans text-left ar-num"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold font-arabic pointer-events-none">
                د.ل
              </span>
            </div>
          </div>

          {/* 3. اسلوب الدفع */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-payment-method" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right">
              اسلوب الدفع
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
            >
              <SelectTrigger id="modal-payment-method" className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg font-arabic" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700" dir="rtl">
                <SelectItem value="نقداً" className="text-xs text-zinc-800 dark:text-zinc-200 font-arabic">نقداً (Cash)</SelectItem>
                <SelectItem value="تحويل مصرفي" className="text-xs text-zinc-800 dark:text-zinc-200 font-arabic">تحويل مصرفي (Bank Transfer)</SelectItem>
                <SelectItem value="بطاقة" className="text-xs text-zinc-800 dark:text-zinc-200 font-arabic">بطاقة (Card)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 4. سبب الإيداع/السحب (ملاحظات) */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-notes" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right">
              سبب الإيداع/السحب (ملاحظات - اختياري)
            </Label>
            <Input
              id="modal-notes"
              type="text"
              placeholder="أدخل سبب المعاملة أو أي ملاحظة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg font-arabic text-right"
              autoComplete="off"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium font-arabic text-right">{error}</p>
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
              className="flex-1 text-xs bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-arabic rounded-lg"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
