import { useState, useEffect, useRef, useMemo } from 'react'
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
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  Bookmark,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  Receipt,
  Landmark,
} from 'lucide-react'
import type { TransactionCreate, PaymentMethod, InvoiceItem } from '@/types'
import { cleanAndNormalizeAmount, formatCurrency } from '@/lib/utils'
import { usePermission } from '@/hooks/usePermission'

interface TransactionModalProps {
  open: boolean
  mode: 'DEPOSIT' | 'WITHDRAWAL'
  onClose: () => void
  onSubmit: (data: TransactionCreate) => Promise<void>
  entities?: string[]
}

interface InvoiceItemRow {
  id: string
  name: string
  amount: string
}

const DEFAULT_SOURCES = ['منتجع MJS', 'إيرادات عامة', 'مبيعات نقدية', 'اشتراكات']

export function TransactionModal({ open, mode, onClose, onSubmit, entities = [] }: TransactionModalProps) {
  const { hasPermission } = usePermission()
  const canEditData = hasPermission('edit_data')

  const isDeposit = mode === 'DEPOSIT'

  // Single Deposit / Single Withdrawal state
  const [clientName, setClientName] = useState(isDeposit ? 'منتجع MJS' : '')
  const [itemName, setItemName] = useState('')
  const [amountStr, setAmountStr] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('نقداً')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Special State: تفريغ من الخزينة (سحب لمصلحة الإدارة العليا)
  const [isTreasuryClearance, setIsTreasuryClearance] = useState(false)

  // Cumulative State (سحب تجميعي / إيداع تجميعي)
  const [isCumulative, setIsCumulative] = useState(false)
  const [invoiceTitle, setInvoiceTitle] = useState('')
  const [invoiceRows, setInvoiceRows] = useState<InvoiceItemRow[]>([
    { id: '1', name: '', amount: '' },
    { id: '2', name: '', amount: '' },
  ])

  // Saved Sources State (for Deposit "مصادر محفوظة")
  const [savedSources, setSavedSources] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('salla_saved_deposit_sources')
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return Array.from(new Set(['منتجع MJS', ...parsed]))
        }
      }
    } catch {}
    const validPassed = entities.filter((e) => e && e !== 'الخزينة' && e !== 'الخزينة الكلية')
    return Array.from(new Set(['منتجع MJS', ...DEFAULT_SOURCES, ...validPassed]))
  })
  const [showSavedSources, setShowSavedSources] = useState(false)
  const [newSourceInput, setNewSourceInput] = useState('')
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0)

  const formRef = useRef<HTMLFormElement>(null)

  // Dynamically calculate cumulative invoice total
  const invoiceTotalCents = useMemo(() => {
    return invoiceRows.reduce((sum, row) => {
      const val = parseFloat(row.amount.replace(/,/g, ''))
      return sum + (isNaN(val) || val <= 0 ? 0 : Math.round(val * 100))
    }, 0)
  }, [invoiceRows])

  // Reset form when modal opens and focus initial field
  useEffect(() => {
    if (open) {
      reset()
      setTimeout(() => {
        const initialId = mode === 'DEPOSIT'
          ? 'modal-source'
          : isCumulative
          ? 'modal-invoice-title'
          : 'modal-item-name'
        const el = document.getElementById(initialId)
        if (el) {
          el.focus()
          if (el instanceof HTMLInputElement) {
            el.select()
          }
        }
      }, 60)
    }
  }, [open, mode])

  const reset = () => {
    setClientName(mode === 'DEPOSIT' ? 'منتجع MJS' : '')
    setItemName('')
    setAmountStr('')
    setPaymentMethod('نقداً')
    setNotes('')
    setError('')
    setLoading(false)
    setShowSavedSources(false)
    setNewSourceInput('')
    setSelectedSourceIndex(0)
    setIsCumulative(false)
    setIsTreasuryClearance(false)
    setInvoiceTitle('')
    setInvoiceRows([
      { id: '1', name: '', amount: '' },
      { id: '2', name: '', amount: '' },
    ])
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const saveSourcesList = (newList: string[]) => {
    setSavedSources(newList)
    try {
      localStorage.setItem('salla_saved_deposit_sources', JSON.stringify(newList))
    } catch (e) {
      console.error('Failed to save deposit sources:', e)
    }
  }

  const handleAddSource = (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (!savedSources.includes(trimmed)) {
      const updated = [trimmed, ...savedSources]
      saveSourcesList(updated)
    }
    setClientName(trimmed)
    setNewSourceInput('')
    setShowSavedSources(false)
    document.getElementById(isCumulative ? 'modal-notes' : 'modal-amount')?.focus()
  }

  const handleDeleteSource = (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = savedSources.filter((s) => s !== name)
    saveSourcesList(updated)
  }

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value
    const validVal = cleanAndNormalizeAmount(rawVal, amountStr)
    setAmountStr(validVal)
  }

  // Cumulative Invoice row managers
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

  // Keyboard navigation order
  const fieldOrder = isDeposit
    ? isCumulative
      ? ['modal-source', 'modal-payment-method', 'modal-notes', 'modal-submit-btn']
      : ['modal-source', 'modal-amount', 'modal-payment-method', 'modal-notes', 'modal-submit-btn']
    : isTreasuryClearance
    ? ['modal-amount', 'modal-payment-method', 'modal-notes', 'modal-submit-btn']
    : isCumulative
    ? ['modal-invoice-title', 'modal-payment-method', 'modal-notes', 'modal-submit-btn']
    : ['modal-item-name', 'modal-amount', 'modal-payment-method', 'modal-notes', 'modal-submit-btn']

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    const target = e.target as HTMLElement
    const currentId = target.id

    // If dropdown of saved sources is open and focused inside it
    if (showSavedSources && target.closest('#saved-sources-menu')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedSourceIndex((prev) => (prev + 1) % savedSources.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedSourceIndex((prev) => (prev - 1 + savedSources.length) % savedSources.length)
        return
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (target.id === 'new-source-input') return
        e.preventDefault()
        if (savedSources[selectedSourceIndex]) {
          setClientName(savedSources[selectedSourceIndex])
          setShowSavedSources(false)
          document.getElementById(isCumulative ? 'modal-notes' : 'modal-amount')?.focus()
        }
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setShowSavedSources(false)
        document.getElementById('modal-source')?.focus()
        return
      }
    }

    // 1. ENTER KEY: submit the transaction unless inside an invoice items row or add source
    if (e.key === 'Enter') {
      if (target.id === 'new-source-input') return
      // If pressing enter on an invoice row amount, add another row or focus next
      if (target.getAttribute('data-invoice-field') === 'amount') {
        e.preventDefault()
        handleAddInvoiceRow()
        return
      }
      e.preventDefault()
      formRef.current?.requestSubmit()
      return
    }

    // 2. ARROW DOWN: move to the next field in sequence
    if (e.key === 'ArrowDown') {
      if (target.getAttribute('data-invoice-field')) return // let user navigate table rows naturally
      const currentIndex = fieldOrder.indexOf(currentId)
      if (currentIndex !== -1 && currentIndex < fieldOrder.length - 1) {
        e.preventDefault()
        const nextId = fieldOrder[currentIndex + 1]
        const nextEl = document.getElementById(nextId)
        if (nextEl) {
          nextEl.focus()
          if (nextEl instanceof HTMLInputElement) {
            nextEl.select()
          }
        }
      }
      return
    }

    // 3. ARROW UP: move to the previous field in sequence
    if (e.key === 'ArrowUp') {
      if (target.getAttribute('data-invoice-field')) return
      const currentIndex = fieldOrder.indexOf(currentId)
      if (currentIndex > 0) {
        e.preventDefault()
        const prevId = fieldOrder[currentIndex - 1]
        const prevEl = document.getElementById(prevId)
        if (prevEl) {
          prevEl.focus()
          if (prevEl instanceof HTMLInputElement) {
            prevEl.select()
          }
        }
      }
      return
    }

    // 4. SPACE KEY: for toggling / selecting values
    if (e.key === ' ') {
      if (currentId === 'modal-payment-method') {
        e.preventDefault()
        setPaymentMethod((prev) => (prev === 'نقداً' ? 'بنك' : 'نقداً'))
        return
      }
      if (currentId === 'modal-saved-sources-btn') {
        e.preventDefault()
        setShowSavedSources((prev) => !prev)
        return
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!canEditData) {
      setError('عذراً، لا تملك صلاحية إضافة وتعديل البيانات')
      return
    }

    let payload: TransactionCreate

    if (isDeposit) {
      if (!clientName.trim()) {
        return setError('يرجى إدخال أو اختيار المصدر')
      }

      const trimmedSource = clientName.trim()
      if (!savedSources.includes(trimmedSource)) {
        saveSourcesList([trimmedSource, ...savedSources])
      }

      if (isCumulative) {
        // Cumulative Deposit (إيداع تجميعي)
        const validItems: InvoiceItem[] = invoiceRows
          .filter((r) => r.name.trim() && parseFloat(r.amount.replace(/,/g, '')) > 0)
          .map((r) => ({
            name: r.name.trim(),
            amount_cents: Math.round(parseFloat(r.amount.replace(/,/g, '')) * 100),
          }))

        if (validItems.length === 0 || invoiceTotalCents <= 0) {
          return setError('يرجى إدخال بند واحد على الأقل مع القيمة')
        }

        payload = {
          client_name: trimmedSource,
          type: 'DEPOSIT',
          subtype: 'CUMULATIVE',
          person_name: trimmedSource,
          person_names: validItems.map((it) => `${it.name} (${formatCurrency(it.amount_cents)})`),
          invoice_items: validItems,
          amount_cents: invoiceTotalCents,
          payment_method: paymentMethod,
          notes: notes.trim(),
          status: 'COMPLETED',
        }
      } else {
        // Standard Single Deposit
        const amount = parseFloat(amountStr.replace(/,/g, ''))
        if (isNaN(amount) || amount <= 0) {
          return setError('يرجى إدخال مبلغ صحيح أكبر من الصفر')
        }

        payload = {
          client_name: trimmedSource,
          type: 'DEPOSIT',
          subtype: 'REGULAR',
          amount_cents: Math.round(amount * 100),
          payment_method: paymentMethod,
          notes: notes.trim(),
          status: 'COMPLETED',
        }
      }
    } else if (isTreasuryClearance) {
      // Treasury Clearance (تفريغ من الخزينة لمصلحة الإدارة العليا)
      const amount = parseFloat(amountStr.replace(/,/g, ''))
      if (isNaN(amount) || amount <= 0) {
        return setError('يرجى إدخال مبلغ صحيح أكبر من الصفر للتفريغ من الخزينة')
      }

      payload = {
        client_name: 'تفريغ من الخزينة',
        type: 'WITHDRAWAL',
        subtype: 'TREASURY_CLEARANCE',
        person_name: 'الإدارة العليا',
        person_names: ['تفريغ من الخزينة'],
        amount_cents: Math.round(amount * 100),
        payment_method: paymentMethod,
        notes: notes.trim(),
        status: 'COMPLETED',
      }
    } else if (isCumulative) {
      // Cumulative Withdrawal (سحب تجميعي)
      if (!invoiceTitle.trim()) {
        return setError('يرجى إدخال عنوان الفاتورة')
      }

      const validItems: InvoiceItem[] = invoiceRows
        .filter((r) => r.name.trim() && parseFloat(r.amount.replace(/,/g, '')) > 0)
        .map((r) => ({
          name: r.name.trim(),
          amount_cents: Math.round(parseFloat(r.amount.replace(/,/g, '')) * 100),
        }))

      if (validItems.length === 0 || invoiceTotalCents <= 0) {
        return setError('يرجى إدخال عنصر واحد على الأقل مع السعر')
      }

      payload = {
        client_name: invoiceTitle.trim(),
        type: 'WITHDRAWAL',
        subtype: 'CUMULATIVE',
        person_name: invoiceTitle.trim(),
        person_names: validItems.map((it) => `${it.name} (${formatCurrency(it.amount_cents)})`),
        invoice_items: validItems,
        amount_cents: invoiceTotalCents,
        payment_method: paymentMethod,
        notes: notes.trim(),
        status: 'COMPLETED',
      }
    } else {
      // Standard Single Withdrawal
      if (!itemName.trim()) {
        return setError('يرجى إدخال اسم العنصر')
      }
      const amount = parseFloat(amountStr.replace(/,/g, ''))
      if (isNaN(amount) || amount <= 0) {
        return setError('يرجى إدخال مبلغ صحيح أكبر من الصفر')
      }

      payload = {
        client_name: itemName.trim(),
        type: 'WITHDRAWAL',
        subtype: 'PERSON',
        person_name: itemName.trim(),
        person_names: [itemName.trim()],
        amount_cents: Math.round(amount * 100),
        payment_method: paymentMethod,
        notes: notes.trim(),
        status: 'COMPLETED',
      }
    }

    setLoading(true)
    try {
      await onSubmit(payload)
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
      <DialogContent className="sm:max-w-lg bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl p-6 overflow-hidden max-h-[92vh] flex flex-col" dir="rtl">
        <DialogHeader className="text-right pb-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                isDeposit
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                  : isTreasuryClearance
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                  : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
              }`}
            >
              {isDeposit ? <ArrowDownCircle className="w-5 h-5" /> : isTreasuryClearance ? <Landmark className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold font-arabic text-zinc-900 dark:text-zinc-100">
                {isDeposit
                  ? isCumulative
                    ? 'تسجيل إيداع تجميعي (بنود متعددة)'
                    : 'تسجيل إيداع جديد'
                  : isTreasuryClearance
                  ? 'تسجيل تفريغ من الخزينة (الإدارة العليا)'
                  : isCumulative
                  ? 'تسجيل سحب تجميعي (فاتورة مجمعة)'
                  : 'تسجيل سحب جديد'
                }
              </DialogTitle>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 font-arabic flex items-center gap-2">
                <span>
                  {isDeposit
                    ? isCumulative
                      ? 'أدخل بيانات المصدر وبنود الإيداع وقيمها'
                      : 'أدخل بيانات المصدر والمبلغ'
                    : isTreasuryClearance
                    ? 'أدخل قيمة المبلغ المراد تفريغه من الخزينة والملاحظات'
                    : isCumulative
                    ? 'أدخل عنوان الفاتورة وبنود العناصر وأسعارها'
                    : 'أدخل بيانات المصروف وسحب الخزينة'}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                  (تنقل بالأسهم ↑↓ | مسافة للاختيار | Enter للإتمام)
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onKeyDown={handleFormKeyDown}
          className="space-y-4 font-arabic mt-3 overflow-y-auto pr-1 flex-1"
        >
          {/* FIELD 1: المصدر (DEPOSIT) OR اسم العنصر / سحب تجميعي (WITHDRAWAL) */}
          {isDeposit ? (
            <div className="space-y-3 relative">
              <div className="flex items-center justify-between">
                <Label htmlFor="modal-source" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right">
                  {isCumulative ? 'المصدر / بيان الإيداع التجميعي' : 'المصدر'} <span className="text-rose-500">*</span>
                </Label>

                <div className="flex items-center gap-2">
                  {/* زر إيداع تجميعي */}
                  <button
                    type="button"
                    onClick={() => setIsCumulative((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-arabic transition-all cursor-pointer border ${
                      isCumulative
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80'
                    }`}
                    title="التبديل بين إيداع مفرد أو إيداع تجميعي لبنود متعددة"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{isCumulative ? 'إيداع تجميعي (نشط)' : 'إيداع تجميعي'}</span>
                  </button>

                  {/* Button: مصادر محفوظة */}
                  <button
                    id="modal-saved-sources-btn"
                    type="button"
                    onClick={() => setShowSavedSources((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold font-arabic transition-all cursor-pointer border ${
                      showSavedSources
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>مصادر محفوظة</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showSavedSources ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Saved Sources Dropdown Menu */}
              {showSavedSources && (
                <div
                  id="saved-sources-menu"
                  tabIndex={0}
                  className="p-3 bg-zinc-50 dark:bg-zinc-800/95 rounded-xl border border-emerald-200 dark:border-emerald-800/80 shadow-xl space-y-2.5 animate-in fade-in slide-in-from-top-2 duration-150 focus:outline-none"
                >
                  <div className="flex items-center justify-between text-xs pb-1.5 border-b border-zinc-200 dark:border-zinc-700">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200">
                      قائمة المصادر المحفوظة ({savedSources.length})
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      الأسهم ↑↓ للتنقل | مسافة للاختيار
                    </span>
                  </div>

                  {/* Quick Add New Source */}
                  <div className="flex items-center gap-1.5">
                    <Input
                      id="new-source-input"
                      type="text"
                      placeholder="أدخل اسم مصدر جديد لإضافته..."
                      value={newSourceInput}
                      onChange={(e) => setNewSourceInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSource(newSourceInput)
                        }
                      }}
                      className="h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-right font-arabic"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleAddSource(newSourceInput)}
                      disabled={!newSourceInput.trim()}
                      className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-500 text-white shrink-0 font-arabic font-semibold"
                    >
                      <Plus className="w-3.5 h-3.5 ml-1" />
                      <span>إضافة</span>
                    </Button>
                  </div>

                  {/* Quick save button for current text if not saved yet */}
                  {clientName.trim() && !savedSources.includes(clientName.trim()) && (
                    <button
                      type="button"
                      onClick={() => handleAddSource(clientName)}
                      className="w-full py-1.5 px-2.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-100/70 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-950 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-300 dark:border-emerald-800 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>حفظ «{clientName}» في قائمة المصادر المحفوظة</span>
                    </button>
                  )}

                  {/* List of saved sources */}
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
                    {savedSources.length === 0 ? (
                      <p className="text-xs text-center text-zinc-400 py-3">لا توجد مصادر محفوظة بعد</p>
                    ) : (
                      savedSources.map((source, index) => {
                        const isHighlighted = selectedSourceIndex === index
                        const isCurrent = clientName === source
                        return (
                          <div
                            key={source}
                            onClick={() => {
                              setClientName(source)
                              setShowSavedSources(false)
                              document.getElementById(isCumulative ? 'modal-notes' : 'modal-amount')?.focus()
                            }}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors group ${
                              isCurrent
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 font-bold border border-emerald-200 dark:border-emerald-800'
                                : isHighlighted
                                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white font-semibold'
                                : 'hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              <span className="truncate">{source}</span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSource(source, e)}
                              title="حذف من المحفوظات"
                              className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-500 p-1 rounded transition-all shrink-0 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              )}

              <Input
                id="modal-source"
                type="text"
                list="saved-sources-datalist"
                placeholder="منتجع MJS"
                value={clientName}
                onFocus={(e) => {
                  if (clientName === 'منتجع MJS') {
                    e.target.select()
                  }
                }}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg font-arabic text-right focus-visible:ring-emerald-500"
                autoComplete="off"
              />
              <datalist id="saved-sources-datalist">
                {savedSources.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>

              {/* CUMULATIVE DEPOSIT ITEMS BUILDER */}
              {isCumulative && (
                <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2.5 animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-zinc-700">
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      بنود الإيداع وقيمها
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddInvoiceRow}
                      className="h-7 px-2.5 text-xs text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 gap-1 font-arabic font-semibold"
                    >
                      <Plus className="w-3 h-3" />
                      <span>إضافة بند</span>
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                    {invoiceRows.map((row, idx) => (
                      <div key={row.id} className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-zinc-400 w-5 text-center shrink-0">
                          {idx + 1}
                        </span>
                        <Input
                          type="text"
                          data-invoice-field="name"
                          placeholder="بيان بند الإيداع (مثال: إيراد مقهى / اشتراك...)"
                          value={row.name}
                          onChange={(e) => handleUpdateInvoiceRow(row.id, 'name', e.target.value)}
                          className="flex-1 h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-right font-arabic"
                        />
                        <div className="relative w-28 sm:w-32 shrink-0">
                          <Input
                            type="text"
                            inputMode="decimal"
                            data-invoice-field="amount"
                            placeholder="0.00"
                            value={row.amount}
                            onChange={(e) => handleUpdateInvoiceRow(row.id, 'amount', e.target.value)}
                            className="h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-7 text-left ar-num font-sans"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 pointer-events-none">
                            د.ل
                          </span>
                        </div>
                        {invoiceRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveInvoiceRow(row.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors shrink-0 cursor-pointer"
                            title="حذف هذا البند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* مجموع نهاية الإيداع */}
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between bg-emerald-50/80 dark:bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-200/80 dark:border-emerald-900/60">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        مجموع نهاية الإيداع:
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        ({invoiceRows.filter((r) => r.name.trim()).length} بنود)
                      </span>
                    </div>
                    <span className="text-base font-black text-emerald-700 dark:text-emerald-300 ar-num">
                      {formatCurrency(invoiceTotalCents)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* WITHDRAWAL: Single, Cumulative Bill, or Treasury Clearance */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={isCumulative ? 'modal-invoice-title' : isTreasuryClearance ? 'modal-amount' : 'modal-item-name'}
                  className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right"
                >
                  {isCumulative ? 'عنوان الفاتورة التجميعية' : isTreasuryClearance ? 'نوع السحب: تفريغ من الخزينة' : 'اسم العنصر'} <span className="text-rose-500">*</span>
                </Label>

                <div className="flex items-center gap-2">
                  {/* زر تفريغ من الخزينة */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isTreasuryClearance) {
                        setIsTreasuryClearance(false)
                        setItemName('')
                      } else {
                        setIsTreasuryClearance(true)
                        setIsCumulative(false)
                        setItemName('تفريغ من الخزينة')
                        setTimeout(() => document.getElementById('modal-amount')?.focus(), 50)
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-arabic transition-all cursor-pointer border ${
                      isTreasuryClearance
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/80'
                    }`}
                    title="سحب المال من الخزينة لمصلحة الإدارة العليا"
                  >
                    <Landmark className="w-3.5 h-3.5" />
                    <span>{isTreasuryClearance ? 'تفريغ من الخزينة (نشط)' : 'تفريغ من الخزينة'}</span>
                  </button>

                  {/* زر سحب تجميعي بجانب اسم العنصر */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isCumulative) {
                        setIsCumulative(false)
                      } else {
                        setIsCumulative(true)
                        setIsTreasuryClearance(false)
                        setItemName('')
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold font-arabic transition-all cursor-pointer border ${
                      isCumulative
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/80'
                    }`}
                    title="التبديل بين سحب مفرد لعنصر واحد أو سحب تجميعي لفاتورة متعددة العناصر"
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{isCumulative ? 'سحب تجميعي (نشط)' : 'سحب تجميعي'}</span>
                  </button>
                </div>
              </div>

              {isTreasuryClearance ? (
                /* TREASURY CLEARANCE INFO BOX */
                <div className="p-3 bg-purple-50/90 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/80 flex items-center justify-between animate-in fade-in-50 duration-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-extrabold text-purple-950 dark:text-purple-100 font-arabic">
                        الجهة: تفريغ من الخزينة
                      </div>
                      <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium font-arabic">
                        سحب مالي لمصلحة الإدارة العليا
                      </div>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-200/80 dark:bg-purple-900/80 text-purple-900 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                    خاص بالإدارة العليا
                  </span>
                </div>
              ) : isCumulative ? (
                /* CUMULATIVE WITHDRAWAL FORM */
                <div className="space-y-3 animate-in fade-in-50 duration-200">
                  {/* عنوان الفاتورة */}
                  <Input
                    id="modal-invoice-title"
                    type="text"
                    placeholder="مثال: فاتورة صيانة وإصلاحات / مشتريات عامة..."
                    value={invoiceTitle}
                    onChange={(e) => setInvoiceTitle(e.target.value)}
                    className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg font-arabic text-right focus-visible:ring-rose-500"
                    autoComplete="off"
                    autoFocus
                  />

                  {/* عناصر الفاتورة والأسعار */}
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-850 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-2.5">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-zinc-700">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        عناصر الفاتورة وأسعارها
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddInvoiceRow}
                        className="h-7 px-2.5 text-xs text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/60 gap-1 font-arabic font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        <span>إضافة عنصر</span>
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-0.5">
                      {invoiceRows.map((row, idx) => (
                        <div key={row.id} className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-zinc-400 w-5 text-center shrink-0">
                            {idx + 1}
                          </span>
                          <Input
                            type="text"
                            data-invoice-field="name"
                            placeholder="اسم العنصر (مثال: قطع غيار)"
                            value={row.name}
                            onChange={(e) => handleUpdateInvoiceRow(row.id, 'name', e.target.value)}
                            className="flex-1 h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-right font-arabic"
                          />
                          <div className="relative w-28 sm:w-32 shrink-0">
                            <Input
                              type="text"
                              inputMode="decimal"
                              data-invoice-field="amount"
                              placeholder="0.00"
                              value={row.amount}
                              onChange={(e) => handleUpdateInvoiceRow(row.id, 'amount', e.target.value)}
                              className="h-8 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 pl-7 text-left ar-num font-sans"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 pointer-events-none">
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

                    {/* مجموع نهاية الفاتورة */}
                    <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700 flex items-center justify-between bg-rose-50/80 dark:bg-rose-950/40 p-2.5 rounded-lg border border-rose-200/80 dark:border-rose-900/60">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          مجموع نهاية الفاتورة:
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          ({invoiceRows.filter((r) => r.name.trim()).length} عناصر)
                        </span>
                      </div>
                      <span className="text-base font-black text-rose-700 dark:text-rose-300 ar-num">
                        {formatCurrency(invoiceTotalCents)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* SINGLE WITHDRAWAL FORM */
                <Input
                  id="modal-item-name"
                  type="text"
                  placeholder="مثال: قرطاسية / صيانة / مشتريات..."
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg font-arabic text-right focus-visible:ring-rose-500"
                  autoComplete="off"
                />
              )}
            </div>
          )}

          {/* FIELD 2: القيمة بالدينار الليبي (Only shown for Single Deposit and Single Withdrawal / Treasury Clearance) */}
          {!isCumulative && (
            <div className="space-y-1.5">
              <Label htmlFor="modal-amount" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right">
                {isTreasuryClearance ? 'قيمة المبلغ المراد تفريغه من الخزينة بالدينار الليبي' : 'القيمة بالدينار الليبي'} <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="modal-amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountStr}
                  onChange={handleAmountChange}
                  className={`bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg pl-14 font-sans text-left ar-num ${
                    isTreasuryClearance ? 'focus-visible:ring-purple-500' : 'focus-visible:ring-emerald-500'
                  }`}
                  autoFocus={isTreasuryClearance}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold font-arabic pointer-events-none">
                  د.ل
                </span>
              </div>
            </div>
          )}

          {/* FIELD 3: اسلوب الدفع (Segmented Control with Space / Arrow keys support) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="modal-payment-method" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right">
                اسلوب الدفع
              </Label>
              <span className="text-[10px] text-zinc-400 font-arabic">
                اضغط مسافة للتبديل بين نقداً وبنك
              </span>
            </div>

            <div
              id="modal-payment-method"
              tabIndex={0}
              role="radiogroup"
              aria-label="اسلوب الدفع"
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setPaymentMethod((prev) => (prev === 'نقداً' ? 'بنك' : 'نقداً'))
                } else if (e.key === 'ArrowRight') {
                  e.preventDefault()
                  setPaymentMethod('نقداً')
                } else if (e.key === 'ArrowLeft') {
                  e.preventDefault()
                  setPaymentMethod('بنك')
                }
              }}
              className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 transition-all"
            >
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setPaymentMethod('نقداً')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold font-arabic transition-all cursor-pointer ${
                  paymentMethod === 'نقداً'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span>نقداً (Cash)</span>
              </button>

              <button
                type="button"
                tabIndex={-1}
                onClick={() => setPaymentMethod('بنك')}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold font-arabic transition-all cursor-pointer ${
                  paymentMethod === 'بنك'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                <span>بنك (Bank)</span>
              </button>
            </div>
          </div>

          {/* FIELD 4: سبب الايداع (ملاحظات) / سبب السحب */}
          <div className="space-y-1.5">
            <Label htmlFor="modal-notes" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right">
              {isDeposit
                ? 'سبب الايداع (ملاحظات)'
                : isTreasuryClearance
                ? 'ملاحظات وتفاصيل التفريغ'
                : 'سبب السحب (ملاحظات)'}
            </Label>
            <Input
              id="modal-notes"
              type="text"
              placeholder={
                isDeposit
                  ? 'أدخل سبب الإيداع أو أي ملاحظات...'
                  : isTreasuryClearance
                  ? 'أدخل ملاحظات التفريغ (مثال: تسليم مالي للإدارة العليا)...'
                  : 'أدخل سبب السحب أو أي ملاحظات...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg font-arabic text-right ${
                isTreasuryClearance ? 'focus-visible:ring-purple-500' : 'focus-visible:ring-emerald-500'
              }`}
              autoComplete="off"
            />
          </div>

          {/* Error Message Display */}
          {error && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-bold font-arabic text-right bg-rose-50 dark:bg-rose-950/40 p-2 rounded-lg border border-rose-200 dark:border-rose-900">
              {error}
            </p>
          )}

          <DialogFooter className="flex-row-reverse gap-2 mt-6 shrink-0">
            <Button
              id="modal-submit-btn"
              type="submit"
              disabled={loading}
              className={`flex-1 text-xs font-arabic font-bold text-white rounded-lg transition-all cursor-pointer ${
                isDeposit
                  ? 'bg-emerald-600 hover:bg-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-400'
                  : isTreasuryClearance
                  ? 'bg-purple-600 hover:bg-purple-500 focus-visible:ring-2 focus-visible:ring-purple-400'
                  : 'bg-rose-600 hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-400'
              }`}
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
              {isDeposit
                ? isCumulative
                  ? `تأكيد الإيداع التجميعي (${formatCurrency(invoiceTotalCents)})`
                  : 'تأكيد تسجيل الإيداع (Enter)'
                : isTreasuryClearance
                ? 'تأكيد التفريغ من الخزينة (Enter)'
                : isCumulative
                ? `تأكيد السحب التجميعي (${formatCurrency(invoiceTotalCents)})`
                : 'تأكيد السحب (Enter)'
              }
            </Button>

            <Button
              id="modal-cancel-btn"
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 text-xs bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-arabic rounded-lg cursor-pointer"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
