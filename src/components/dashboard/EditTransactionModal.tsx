import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Edit3,
  X,
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  CreditCard,
  Building2,
  FileText,
  BadgeAlert,
  Receipt,
  Plus,
  Trash2,
  Landmark,
} from 'lucide-react'
import type { Transaction, TransactionUpdate, PaymentMethod, InvoiceItem } from '@/types'
import { formatCurrency, cleanAndNormalizeAmount, getSafeInvoiceItems } from '@/lib/utils'

interface EditTransactionModalProps {
  open: boolean
  transaction: Transaction | null
  transactionsList?: Transaction[]
  onClose: () => void
  onSave: (data: TransactionUpdate) => Promise<void>
}

// Convert ISO string or SQLite timestamp to datetime-local input format (YYYY-MM-DDTHH:mm)
function toDatetimeLocal(dateStr?: string): string {
  if (!dateStr) {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    const offset = d.getTimezoneOffset()
    const localDate = new Date(d.getTime() - offset * 60 * 1000)
    return localDate.toISOString().slice(0, 16)
  } catch {
    return ''
  }
}

export function EditTransactionModal({
  open,
  transaction,
  transactionsList = [],
  onClose,
  onSave,
}: EditTransactionModalProps) {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(transaction)

  // Form Fields
  const [type, setType] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT')
  const [clientName, setClientName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | string>('نقداً')
  const [notes, setNotes] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Cumulative Invoice Rows
  const [invoiceRows, setInvoiceRows] = useState<{ id: string; name: string; amount: string }[]>([
    { id: '1', name: '', amount: '' },
  ])

  // Determine whether the currently selected transaction is a Cumulative Withdrawal/Deposit
  const isCumulativeTx = Boolean(
    selectedTx &&
      (selectedTx.subtype === 'CUMULATIVE' ||
        (selectedTx.invoice_items && selectedTx.invoice_items.length > 0))
  )

  // Determine whether the currently selected transaction is Treasury Clearance (تفريغ من الخزينة)
  const isTreasuryClearance = Boolean(
    selectedTx &&
      (selectedTx.subtype === 'TREASURY_CLEARANCE' || selectedTx.client_name === 'تفريغ من الخزينة')
  )

  // Sync state when transaction or open state changes
  useEffect(() => {
    if (open) {
      document.body.style.pointerEvents = 'auto'
      const target = transaction || (transactionsList.length > 0 ? transactionsList[0] : null)
      setSelectedTx(target)
      if (target) {
        setType(target.type)
        setClientName(target.client_name || target.person_name || '')
        setAmountStr((target.amount_cents / 100).toString())
        setPaymentMethod(target.payment_method || 'نقداً')
        setNotes(target.notes || '')
        setCreatedAt(toDatetimeLocal(target.created_at))

        const safeItems = getSafeInvoiceItems(target.invoice_items)
        if (safeItems.length > 0) {
          setInvoiceRows(
            safeItems.map((it, idx) => ({
              id: (idx + 1).toString(),
              name: it.name,
              amount: (it.amount_cents / 100).toString(),
            }))
          )
        } else {
          setInvoiceRows([{ id: '1', name: '', amount: '' }])
        }
      }
      setError('')
      setLoading(false)
    }
  }, [open, transaction, transactionsList])

  // Change selected transaction from picker
  const handleSelectTransaction = (id: number) => {
    const found = transactionsList.find((t) => t.id === id)
    if (found) {
      setSelectedTx(found)
      setType(found.type)
      setClientName(found.client_name || found.person_name || '')
      setAmountStr((found.amount_cents / 100).toString())
      setPaymentMethod(found.payment_method || 'نقداً')
      setNotes(found.notes || '')
      setCreatedAt(toDatetimeLocal(found.created_at))

      const safeItems = getSafeInvoiceItems(found.invoice_items)
      if (safeItems.length > 0) {
        setInvoiceRows(
          safeItems.map((it, idx) => ({
            id: (idx + 1).toString(),
            name: it.name,
            amount: (it.amount_cents / 100).toString(),
          }))
        )
      } else {
        setInvoiceRows([{ id: '1', name: '', amount: '' }])
      }
      setError('')
    }
  }

  // Handle escape key
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        document.body.style.pointerEvents = 'auto'
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    const validVal = cleanAndNormalizeAmount(rawVal, amountStr)
    setAmountStr(validVal)
  }

  // Cumulative Invoice row management
  const invoiceTotalCents = useMemo(() => {
    return invoiceRows.reduce((sum, row) => {
      const val = parseFloat(row.amount.replace(/,/g, ''))
      return sum + (isNaN(val) || val <= 0 ? 0 : Math.round(val * 100))
    }, 0)
  }, [invoiceRows])

  const handleAddInvoiceRow = () => {
    setInvoiceRows((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', amount: '' },
    ])
  }

  const handleUpdateInvoiceRow = (id: string, field: 'name' | 'amount', value: string) => {
    setInvoiceRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        if (field === 'amount') {
          return { ...r, amount: cleanAndNormalizeAmount(value, r.amount) }
        }
        return { ...r, [field]: value }
      })
    )
  }

  const handleRemoveInvoiceRow = (id: string) => {
    if (invoiceRows.length <= 1) return
    setInvoiceRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTx) {
      setError('يرجى اختيار معاملة لتعديلها')
      return
    }

    let finalCreatedAt = selectedTx.created_at
    if (createdAt) {
      try {
        const d = new Date(createdAt)
        if (!isNaN(d.getTime())) {
          const yyyy = d.getFullYear()
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const dd = String(d.getDate()).padStart(2, '0')
          const hh = String(d.getHours()).padStart(2, '0')
          const min = String(d.getMinutes()).padStart(2, '0')
          const ss = String(d.getSeconds()).padStart(2, '0')
          finalCreatedAt = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`
        }
      } catch {}
    }

    let payload: TransactionUpdate

    if (isCumulativeTx) {
      // 1. CUMULATIVE TRANSACTION SUBMISSION (DEPOSIT OR WITHDRAWAL)
      const isDep = selectedTx.type === 'DEPOSIT'
      if (!clientName.trim()) {
        setError(isDep ? 'يرجى إدخال اسم المصدر / بيان الإيداع' : 'يرجى إدخال عنوان الفاتورة التجميعية')
        return
      }

      const validItems: InvoiceItem[] = invoiceRows
        .filter((r) => r.name.trim() && parseFloat(r.amount.replace(/,/g, '')) > 0)
        .map((r) => ({
          name: r.name.trim(),
          amount_cents: Math.round(parseFloat(r.amount.replace(/,/g, '')) * 100),
        }))

      if (validItems.length === 0 || invoiceTotalCents <= 0) {
        setError(isDep ? 'يرجى إدخال بند واحد على الأقل مع القيمة في الإيداع التجميعي' : 'يرجى إدخال عنصر واحد على الأقل مع السعر في الفاتورة التجميعية')
        return
      }

      payload = {
        id: selectedTx.id,
        client_name: clientName.trim(),
        type: selectedTx.type,
        subtype: 'CUMULATIVE',
        person_name: clientName.trim(),
        person_names: validItems.map((it) => `${it.name} (${formatCurrency(it.amount_cents)})`),
        invoice_items: validItems,
        amount_cents: invoiceTotalCents,
        payment_method: paymentMethod,
        notes: notes.trim(),
        created_at: finalCreatedAt,
      }
    } else {
      // 2. REGULAR TRANSACTION SUBMISSION (AS ORIGINAL)
      if (!clientName.trim()) {
        setError(type === 'DEPOSIT' ? 'يرجى إدخال اسم الجهة / العميل' : 'يرجى إدخال اسم العنصر')
        return
      }

      const amount = parseFloat(amountStr.replace(/,/g, ''))
      if (isNaN(amount) || amount <= 0) {
        setError('يرجى إدخال مبلغ صحيح أكبر من الصفر')
        return
      }

      if (isTreasuryClearance) {
        payload = {
          id: selectedTx.id,
          client_name: 'تفريغ من الخزينة',
          type: 'WITHDRAWAL',
          subtype: 'TREASURY_CLEARANCE',
          person_name: 'الإدارة العليا',
          amount_cents: Math.round(amount * 100),
          payment_method: paymentMethod,
          notes: notes.trim(),
          created_at: finalCreatedAt,
        }
      } else {
        if (!clientName.trim()) {
          setError(type === 'DEPOSIT' ? 'يرجى إدخال اسم الجهة / العميل' : 'يرجى إدخال اسم العنصر')
          return
        }

        payload = {
          id: selectedTx.id,
          client_name: clientName.trim(),
          type,
          subtype: type === 'WITHDRAWAL' ? 'PERSON' : (selectedTx.subtype || 'REGULAR'),
          person_name: type === 'WITHDRAWAL' ? clientName.trim() : (selectedTx.person_name || ''),
          person_names: type === 'WITHDRAWAL' ? [clientName.trim()] : undefined,
          amount_cents: Math.round(amount * 100),
          payment_method: paymentMethod,
          notes: notes.trim(),
          created_at: finalCreatedAt,
        }
      }
    }

    setLoading(true)
    setError('')
    try {
      await onSave(payload)
      document.body.style.pointerEvents = 'auto'
      onClose()
    } catch (err: any) {
      console.error('Failed to update transaction:', err)
      setError(err?.message || 'حدث خطأ أثناء حفظ التعديلات في قاعدة البيانات')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
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
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl p-6 z-10 overflow-hidden max-h-[92vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                {isTreasuryClearance ? (
                  <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800/80 text-purple-600 dark:text-purple-400">
                    <Landmark className="w-5 h-5 stroke-[2.2]" />
                  </div>
                ) : isCumulativeTx ? (
                  <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-xs ${
                    selectedTx?.type === 'DEPOSIT'
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400'
                      : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400'
                  }`}>
                    <Receipt className="w-5 h-5 stroke-[2.2]" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                    <Edit3 className="w-5 h-5 stroke-[2.2]" />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <span>
                      {isTreasuryClearance
                        ? 'تعديل تفريغ من الخزينة'
                        : isCumulativeTx
                        ? (selectedTx?.type === 'DEPOSIT' ? 'تعديل إيداع تجميعي' : 'تعديل سحب تجميعي')
                        : 'تعديل بيانات المعاملة'
                      }
                    </span>
                    {selectedTx && (
                      <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 ar-num">
                        #{selectedTx.id}
                      </span>
                    )}
                    {isTreasuryClearance ? (
                      <span className="px-2 py-0.5 rounded-md border text-[10px] font-bold bg-purple-100 dark:bg-purple-900/60 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300">
                        تفريغ من الخزينة
                      </span>
                    ) : isCumulativeTx && (
                      <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                        selectedTx?.type === 'DEPOSIT'
                          ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-100 dark:bg-rose-900/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                      }`}>
                        {selectedTx?.type === 'DEPOSIT' ? 'إيداع تجميعي' : 'فاتورة'}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                    {isTreasuryClearance
                      ? 'تعديل قيمة السحب، أسلوب الدفع، والملاحظات لمصلحة الإدارة العليا'
                      : isCumulativeTx
                      ? (selectedTx?.type === 'DEPOSIT'
                          ? 'تعديل المصدر وبنود الإيداع وقيمها وتحديث الإجمالي تلقائياً'
                          : 'تعديل عنوان الفاتورة وبنودها وأسعارها وتحديث الإجمالي تلقائياً')
                      : 'تعديل حقول المعاملة وتحديثها مباشرة في قاعدة البيانات'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Error banner */}
            {error && (
              <div className="mb-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <BadgeAlert className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            )}

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmit} className="space-y-3.5 overflow-y-auto px-0.5 flex-1">
              {/* Optional Transaction Selector */}
              {transactionsList.length > 1 && (
                <div className="space-y-1 pb-1">
                  <Label htmlFor="edit-tx-select" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <span>اختر المعاملة المراد تعديلها:</span>
                  </Label>
                  <select
                    id="edit-tx-select"
                    value={selectedTx?.id || ''}
                    onChange={(e) => handleSelectTransaction(Number(e.target.value))}
                    className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-xs text-zinc-900 dark:text-zinc-100 font-arabic font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    {transactionsList.map((tx) => (
                      <option key={tx.id} value={tx.id}>
                        #{tx.id} — {tx.client_name} ({formatCurrency(tx.amount_cents)}) — {
                          tx.subtype === 'TREASURY_CLEARANCE' || tx.client_name === 'تفريغ من الخزينة'
                            ? 'تفريغ من الخزينة'
                            : tx.subtype === 'CUMULATIVE'
                            ? (tx.type === 'DEPOSIT' ? 'إيداع تجميعي' : 'سحب تجميعي')
                            : tx.type === 'DEPOSIT' ? 'إيداع' : 'سحب'
                        }
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* ========================================================================= */}
              {/* MODE A: CUMULATIVE FORM (DEPOSIT OR WITHDRAWAL)                           */}
              {/* ========================================================================= */}
              {isCumulativeTx ? (
                <>
                  {/* 1. Invoice Title / Source */}
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-invoice-title" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Receipt className={`w-3.5 h-3.5 ${selectedTx?.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-rose-500'}`} />
                      <span>{selectedTx?.type === 'DEPOSIT' ? 'المصدر / بيان الإيداع التجميعي' : 'عنوان الفاتورة التجميعية'}</span>
                      <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="edit-invoice-title"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={selectedTx?.type === 'DEPOSIT' ? 'مثال: منتجع MJS / إيرادات...' : 'مثال: فاتورة صيانة وإصلاحات / مشتريات عامة...'}
                      className={`h-9 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs font-medium rounded-xl text-right font-arabic ${
                        selectedTx?.type === 'DEPOSIT' ? 'focus-visible:ring-emerald-500' : 'focus-visible:ring-rose-500'
                      }`}
                      required
                      autoFocus
                    />
                  </div>

                  {/* 2. Invoice Items Builder */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-zinc-700">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Receipt className={`w-3.5 h-3.5 ${selectedTx?.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-rose-500'}`} />
                        <span>
                          {selectedTx?.type === 'DEPOSIT' ? 'بنود الإيداع وقيمها' : 'عناصر الفاتورة وأسعارها'} ({invoiceRows.length})
                        </span>
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddInvoiceRow}
                        className={`h-7 px-2.5 text-xs gap-1 font-arabic font-semibold ${
                          selectedTx?.type === 'DEPOSIT'
                            ? 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60'
                            : 'text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/60'
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        <span>{selectedTx?.type === 'DEPOSIT' ? 'إضافة بند' : 'إضافة عنصر'}</span>
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto px-0.5">
                      {invoiceRows.map((row, idx) => (
                        <div key={row.id} className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-zinc-400 w-5 text-center shrink-0">
                            {idx + 1}
                          </span>
                          <Input
                            type="text"
                            placeholder={selectedTx?.type === 'DEPOSIT' ? 'بيان بند الإيداع (مثال: إيراد مقهى)...' : 'بيان عنصر الفاتورة (مثال: قطع غيار)...'}
                            value={row.name}
                            onChange={(e) => handleUpdateInvoiceRow(row.id, 'name', e.target.value)}
                            className="flex-1 h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-lg text-right font-arabic"
                          />
                          <div className="relative w-28 sm:w-32 shrink-0">
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              value={row.amount}
                              onChange={(e) => handleUpdateInvoiceRow(row.id, 'amount', e.target.value)}
                              className="h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 rounded-lg text-left font-mono font-bold pl-7"
                              dir="ltr"
                            />
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 pointer-events-none">
                              د.ل
                            </span>
                          </div>
                          {invoiceRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveInvoiceRow(row.id)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors shrink-0 cursor-pointer"
                              title="حذف هذا العنصر"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* مجموع نهاية الفاتورة / الإيداع */}
                    <div className={`pt-2 border-t flex items-center justify-between p-2.5 rounded-lg border ${
                      selectedTx?.type === 'DEPOSIT'
                        ? 'border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/80 dark:bg-emerald-950/40'
                        : 'border-rose-200/80 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/40'
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <Receipt className={`w-4 h-4 shrink-0 ${selectedTx?.type === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} />
                        <span className={`text-xs font-bold ${selectedTx?.type === 'DEPOSIT' ? 'text-emerald-950 dark:text-emerald-200' : 'text-rose-950 dark:text-rose-200'}`}>
                          {selectedTx?.type === 'DEPOSIT' ? 'مجموع نهاية الإيداع:' : 'مجموع نهاية الفاتورة:'}
                        </span>
                      </div>
                      <span className={`text-sm font-black font-mono ar-num ${
                        selectedTx?.type === 'DEPOSIT' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'
                      }`}>
                        {formatCurrency(invoiceTotalCents)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* ========================================================================= */
                /* MODE B: REGULAR TRANSACTION FORM (AS ORIGINAL)                             */
                /* ========================================================================= */
                <>
                  {isTreasuryClearance ? (
                    <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300">
                          <Landmark className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-purple-950 dark:text-purple-100 block">
                            الجهة: تفريغ من الخزينة
                          </span>
                          <span className="text-[10px] text-purple-600 dark:text-purple-300 font-medium">
                            سحب نقدي لمصلحة الإدارة العليا
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-100 dark:bg-purple-900/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-700">
                        تفريغ من الخزينة
                      </span>
                    </div>
                  ) : (
                    <>
                      {/* 1. Transaction Type Toggle Buttons */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                          نوع المعاملة
                        </Label>
                        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/70 border border-zinc-200/80 dark:border-zinc-700/60">
                          <button
                            type="button"
                            onClick={() => setType('DEPOSIT')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                              type === 'DEPOSIT'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                          >
                            <ArrowDownCircle className="w-4 h-4" />
                            <span>إيداع (+)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setType('WITHDRAWAL')}
                            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                              type === 'WITHDRAWAL'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                            }`}
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                            <span>سحب ومصروف (-)</span>
                          </button>
                        </div>
                      </div>

                      {/* 2. Client / Item Name */}
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-client-name" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{type === 'DEPOSIT' ? 'اسم الجهة / العميل' : 'اسم العنصر / الجهة'}</span>
                          <span className="text-rose-500">*</span>
                        </Label>
                        <Input
                          id="edit-client-name"
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          placeholder={type === 'DEPOSIT' ? 'مثال: منتجع MJS / شركة النماء' : 'مثال: مشتريات صيانة / وقود مولد'}
                          className="h-9 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs font-medium rounded-xl text-right font-arabic"
                          required
                        />
                      </div>
                    </>
                  )}

                  {/* 3. Amount & Currency */}
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-amount" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">د.ل</span>
                        <span>القيمة / المبلغ</span>
                        <span className="text-rose-500">*</span>
                      </div>
                      {amountStr && !isNaN(parseFloat(amountStr)) && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono font-bold ar-num">
                          {formatCurrency(Math.round(parseFloat(amountStr.replace(/,/g, '')) * 100))}
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="edit-amount"
                        type="text"
                        inputMode="decimal"
                        value={amountStr}
                        onChange={handleAmountChange}
                        placeholder="0.00"
                        className="h-9 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-sm font-bold text-left font-mono rounded-xl pl-12"
                        dir="ltr"
                        required
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-extrabold text-zinc-400 dark:text-zinc-500 pointer-events-none">
                        د.ل
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* 4. Payment Method & Date (Common to both modes) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Payment Method */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-payment-method" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
                    <span>أسلوب الدفع</span>
                  </Label>
                  <select
                    id="edit-payment-method"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-arabic font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  >
                    <option value="نقداً">نقداً (كاش)</option>
                    <option value="بنك">بنك</option>
                    <option value="بطاقة">بطاقة مصرفية</option>
                  </select>
                </div>

                {/* Date & Time */}
                <div className="space-y-1.5">
                  <Label htmlFor="edit-created-at" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    <span>تاريخ وتوقيت المعاملة</span>
                  </Label>
                  <Input
                    id="edit-created-at"
                    type="datetime-local"
                    value={createdAt}
                    onChange={(e) => setCreatedAt(e.target.value)}
                    className="h-9 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs font-mono rounded-xl text-right"
                  />
                </div>
              </div>

              {/* 5. Notes / Reason */}
              <div className="space-y-1.5">
                <Label htmlFor="edit-notes" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-zinc-500" />
                  <span>سبب المعاملة / الملاحظات</span>
                </Label>
                <textarea
                  id="edit-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="أدخل سبب المعاملة أو أي تفاصيل إضافية..."
                  className="w-full p-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-xl font-arabic text-right focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 text-xs font-arabic font-bold rounded-xl shadow-xs py-2.5 h-auto transition-all active:scale-[0.98] ${
                    isCumulativeTx
                      ? selectedTx?.type === 'DEPOSIT'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 text-white'
                  }`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                      <span>جاري حفظ التعديلات...</span>
                    </>
                  ) : (
                    <>
                      {isCumulativeTx ? (
                        <Receipt className="w-4 h-4 ml-1.5" />
                      ) : (
                        <Edit3 className="w-4 h-4 ml-1.5" />
                      )}
                      <span>
                        {isCumulativeTx
                          ? (selectedTx?.type === 'DEPOSIT'
                              ? 'حفظ تعديلات الإيداع التجميعي'
                              : 'حفظ تعديلات الفاتورة التجميعية')
                          : 'حفظ التعديلات في قاعدة البيانات'}
                      </span>
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  className="text-xs bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 font-arabic font-medium rounded-xl py-2.5 h-auto px-5"
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
