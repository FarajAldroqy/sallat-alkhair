import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Eye, Printer, SlidersHorizontal, Plus,
  ChevronLeft, ChevronRight, Pin, Trash2, Archive,
} from 'lucide-react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction, TransactionCreate } from '@/types'
import { TransactionModal } from './TransactionModal'
import { ReceiptModal } from './ReceiptModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'

const PAGE_SIZE = 8

function sortTransactions(items: Transaction[]): Transaction[] {
  return [...items].sort((a, b) => {
    const pinA = a.is_pinned ?? 0
    const pinB = b.is_pinned ?? 0
    if (pinA !== pinB) return pinB - pinA
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

interface TransactionsTableProps {
  searchValue: string
  onStatsRefresh: () => void
}

export function TransactionsTable({ searchValue, onStatsRefresh }: TransactionsTableProps) {
  const [data, setData] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL')
  const [activeTab, setActiveTab] = useState<'all' | 'deposits' | 'withdrawals'>('all')
  const [loading, setLoading] = useState(false)

  // Swiped row state for slide-to-reveal action bar
  const [swipedRowId, setSwipedRowId] = useState<number | null>(null)
  const tableRef = useRef<HTMLDivElement>(null)

  // Exit animation & confirmation states
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [archivingId, setArchivingId] = useState<number | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  // Newly created deposit/withdrawal camera strobe flash state (~140ms)
  const [newlyCreatedId, setNewlyCreatedId] = useState<number | null>(null)

  // Audio-style pagination range slider toggle state
  const [isSliderMode, setIsSliderMode] = useState(false)

  // Transaction creation modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT')

  // Receipt viewing modal state
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const fetchData = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    try {
      const result = await window.electronAPI.getTransactions({
        page,
        pageSize: PAGE_SIZE,
        search: searchValue,
        type: typeFilter,
      })
      setData(sortTransactions(result.data))
      setTotal(result.total)
    } catch (err) {
      console.error('Failed to fetch transactions', err)
    } finally {
      setLoading(false)
    }
  }, [page, searchValue, typeFilter])

  useEffect(() => {
    setPage(1)
  }, [searchValue, typeFilter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Click-outside and Escape key listener to dismiss swiped row
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (swipedRowId !== null && tableRef.current && !tableRef.current.contains(e.target as Node)) {
        setSwipedRowId(null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && swipedRowId !== null) {
        setSwipedRowId(null)
      }
    }

    window.addEventListener('click', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('click', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [swipedRowId])

  const handleRowDoubleClick = (id: number) => {
    setSwipedRowId((prev) => (prev === id ? null : id))
  }

  // REVERTED & CLEAN PINNING: Optimistic local state update + Framer Motion Shared Layout flight motion
  const handleTogglePin = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSwipedRowId(null)

    const targetTx = data.find((t) => t.id === id)
    const isCurrentlyPinned = targetTx?.is_pinned === 1

    setData((prev) =>
      sortTransactions(
        prev.map((t) => (t.id === id ? { ...t, is_pinned: t.is_pinned === 1 ? 0 : 1 } : t))
      )
    )

    if (window.electronAPI?.togglePin) {
      window.electronAPI.togglePin(id).then(() => onStatsRefresh())
      if (!isCurrentlyPinned && page !== 1) {
        setPage(1)
      }
    }
  }

  // Trigger Delete confirmation modal
  const handleOpenDeleteConfirm = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSwipedRowId(null)
    setPendingDeleteId(id)
  }

  // OPTIMISTIC UI: Execute Delete with Red exit animation & dynamic page backfilling
  const handleConfirmDelete = () => {
    if (pendingDeleteId === null) return
    const targetId = pendingDeleteId
    setPendingDeleteId(null)
    setDeletingId(targetId)

    setTimeout(async () => {
      setData((prev) => prev.filter((item) => item.id !== targetId))
      const newTotal = Math.max(0, total - 1)
      setTotal(newTotal)
      setDeletingId(null)

      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE))
      if (page > newTotalPages) {
        setPage(newTotalPages)
      }

      if (window.electronAPI?.deleteTransaction) {
        await window.electronAPI.deleteTransaction(targetId)
        onStatsRefresh()
        fetchData()
      }
    }, 350)
  }

  // OPTIMISTIC UI: Execute Archive with Gray exit animation & dynamic page backfilling
  const handleArchive = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSwipedRowId(null)
    setArchivingId(id)

    setTimeout(async () => {
      setData((prev) => prev.filter((item) => item.id !== id))
      const newTotal = Math.max(0, total - 1)
      setTotal(newTotal)
      setArchivingId(null)

      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE))
      if (page > newTotalPages) {
        setPage(newTotalPages)
      }

      if (window.electronAPI?.archiveTransaction) {
        await window.electronAPI.archiveTransaction(id)
        onStatsRefresh()
        fetchData()
      }
    }, 350)
  }

  // NEW TRANSACTION CREATION: Resets to Page 1 and triggers ultra-fast 140ms camera strobe flash
  const handleCreate = async (payload: TransactionCreate) => {
    if (window.electronAPI?.createTransaction) {
      const newTx = await window.electronAPI.createTransaction(payload)
      setPage(1)
      await fetchData()
      onStatsRefresh()

      if (newTx && newTx.id) {
        setNewlyCreatedId(newTx.id)
        setTimeout(() => setNewlyCreatedId(null), 140)
      }
    }
  }

  const openDeposit = () => { setModalMode('DEPOSIT'); setModalOpen(true) }
  const openWithdrawal = () => { setModalMode('WITHDRAWAL'); setModalOpen(true) }

  const handleViewReceipt = (tx: Transaction) => {
    setSelectedReceipt(tx)
    setReceiptOpen(true)
  }

  const handlePrintReceipt = (tx: Transaction) => {
    setSelectedReceipt(tx)
    setReceiptOpen(true)
    setTimeout(() => {
      window.print()
    }, 300)
  }

  return (
    <>
      <div className="space-y-4" dir="rtl" ref={tableRef}>
        {/* Top Toolbar: Filters & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Right/Start filter tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => { setActiveTab('all'); setTypeFilter('ALL') }}
              className={`px-3 py-1.5 rounded-lg text-xs font-arabic transition-all whitespace-nowrap ${
                activeTab === 'all'
                  ? 'bg-zinc-200/80 text-zinc-900 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 font-medium'
              }`}
            >
              جميع العمليات
            </button>

            <button
              onClick={() => { setActiveTab('deposits'); setTypeFilter('DEPOSIT') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-arabic transition-all whitespace-nowrap ${
                activeTab === 'deposits'
                  ? 'bg-emerald-100 text-emerald-900 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 font-medium'
              }`}
            >
              <span>الإيداعات النقدية</span>
            </button>

            <button
              onClick={() => { setActiveTab('withdrawals'); setTypeFilter('WITHDRAWAL') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-arabic transition-all whitespace-nowrap ${
                activeTab === 'withdrawals'
                  ? 'bg-rose-100 text-rose-900 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 font-medium'
              }`}
            >
              <span>السحوبات النقدية</span>
            </button>
          </div>

          {/* Left/End action buttons */}
          <div className="flex items-center gap-2">
            <Button
              id="customize-columns-btn"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-50 font-arabic font-medium"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500" />
              <span>تخصيص الأعمدة</span>
            </Button>

            <Button
              id="add-deposit-btn"
              size="sm"
              onClick={openDeposit}
              className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-arabic font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إيداع جديد</span>
            </Button>

            <Button
              id="add-withdrawal-btn"
              size="sm"
              onClick={openWithdrawal}
              className="h-8 gap-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-arabic font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>سحب جديد</span>
            </Button>
          </div>
        </div>

        {/* Table Container */}
        <Card className="subtle-card rounded-xl p-0 shadow-none border border-zinc-200/80 overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table dir="rtl">
                <TableHeader>
                  <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80 border-b border-zinc-200/80">
                    <TableHead className="text-xs font-bold text-zinc-700 text-right py-3 font-arabic">
                      اسم الجهة
                    </TableHead>
                    <TableHead className="text-xs font-bold text-zinc-700 text-center py-3 font-arabic w-32">
                      نوع العملية
                    </TableHead>
                    <TableHead className="text-xs font-bold text-zinc-700 text-center py-3 font-arabic w-36">
                      اسلوب الدفع
                    </TableHead>
                    <TableHead className="text-xs font-bold text-zinc-700 text-right py-3 font-arabic w-40">
                      القيمة
                    </TableHead>
                    <TableHead className="text-xs font-bold text-zinc-700 text-right py-3 font-arabic w-44">
                      التاريخ
                    </TableHead>
                    <TableHead className="text-xs font-bold text-zinc-700 text-center py-3 font-arabic w-28">
                      الإجراء
                    </TableHead>
                  </TableRow>
                </TableHeader>
                {/* TableBody keyed by page to disable morphing jump animations across page changes */}
                <TableBody key={`page-body-${page}`} className="relative">
                  {loading ? (
                    Array.from({ length: PAGE_SIZE }).map((_, i) => (
                      <TableRow key={i} className="border-b border-zinc-200/40">
                        <TableCell colSpan={6} className="py-3 px-4">
                          <div className="h-4 w-full bg-zinc-200/50 rounded animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-xs text-zinc-400 font-arabic font-medium">
                        لا توجد معاملات مسجلة
                      </TableCell>
                    </TableRow>
                  ) : (
                    <LayoutGroup id="transactions-table">
                      <AnimatePresence mode="popLayout" initial={false}>
                        {data.map((tx) => {
                          const isDeposit = tx.type === 'DEPOSIT'
                          const isPinned = tx.is_pinned === 1
                          const isSwiped = swipedRowId === tx.id
                          const isDeleting = deletingId === tx.id
                          const isArchiving = archivingId === tx.id
                          const isNewlyCreated = newlyCreatedId === tx.id

                          return (
                            <motion.tr
                              layout="position"
                              layoutId={`tx-row-${tx.id}`}
                              key={tx.id}
                              initial={{ opacity: 0, y: 15, scale: 0.95 }}
                              animate={
                                isDeleting || isArchiving
                                  ? { opacity: 0, x: -250, scale: 0.95 }
                                  : { opacity: 1, y: 0, scale: 1 }
                              }
                              exit={{ opacity: 0, y: 15, scale: 0.95 }}
                              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                              onDoubleClick={() => handleRowDoubleClick(tx.id)}
                              className={`relative border-b border-zinc-200/60 group cursor-pointer select-none overflow-hidden ${
                                isNewlyCreated
                                  ? 'bg-white text-zinc-950 font-extrabold shadow-[0_0_30px_rgba(255,255,255,1)] ring-2 ring-zinc-900'
                                  : isDeleting
                                  ? 'bg-rose-100 text-rose-700 border-rose-300 font-medium'
                                  : isArchiving
                                  ? 'bg-slate-200 text-slate-600 border-slate-300 font-medium'
                                  : isPinned
                                  ? 'bg-zinc-100/90 font-semibold border-r-4 border-r-zinc-900 shadow-sm'
                                  : isSwiped
                                  ? 'bg-zinc-50'
                                  : 'hover:bg-zinc-50/80 bg-white'
                              }`}
                            >
                              <TableCell colSpan={6} className="p-0 border-none relative">
                                {/* Underlying Revealed Action Bar (FAR LEFT SIDE under "الإجراء") */}
                                <AnimatePresence>
                                  {isSwiped && !isDeleting && !isArchiving && (
                                    <motion.div
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -20 }}
                                      transition={{ duration: 0.2 }}
                                      className="absolute left-0 inset-y-0 flex items-stretch gap-0 z-10 h-full overflow-hidden"
                                    >
                                      {/* 📌 Pin (تثبيت) Button */}
                                      <button
                                        onClick={(e) => handleTogglePin(tx.id, e)}
                                        title={isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}
                                        className={`w-12 h-full text-white flex items-center justify-center transition-colors active:opacity-90 ${
                                          isPinned ? 'bg-amber-600 hover:bg-amber-700' : 'bg-zinc-800 hover:bg-zinc-900'
                                        }`}
                                      >
                                        <Pin className="w-4 h-4" />
                                      </button>

                                      {/* 📦 Archive (أرشفة) Button */}
                                      <button
                                        onClick={(e) => handleArchive(tx.id, e)}
                                        title="أرشفة المعاملة"
                                        className="w-12 h-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center transition-colors active:opacity-90"
                                      >
                                        <Archive className="w-4 h-4" />
                                      </button>

                                      {/* 🗑️ Delete (حذف) Button */}
                                      <button
                                        onClick={(e) => handleOpenDeleteConfirm(tx.id, e)}
                                        title="حذف المعاملة"
                                        className="w-12 h-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors active:opacity-90"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Sliding Row Content Layer (Slides to the RIGHT +144px to reveal left action bar under الإجراء) */}
                                <motion.div
                                  animate={{
                                    x: isDeleting || isArchiving ? -250 : isSwiped ? 144 : 0,
                                    opacity: isDeleting || isArchiving ? 0 : 1,
                                  }}
                                  transition={{
                                    x: { type: 'spring', stiffness: 320, damping: 28 },
                                  }}
                                  className="flex items-center w-full px-4 py-3 bg-inherit"
                                >
                                  {/* 1. اسم الجهة (Entity/Client Name + Pinned Badge) */}
                                  <div className="flex-1 min-w-0 text-right font-arabic flex items-center gap-1.5">
                                    {isPinned && (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 text-white shadow-xs shrink-0" title="مثبتة في الأعلى">
                                        <Pin className="w-3 h-3 fill-white" />
                                      </span>
                                    )}
                                    <span className={`text-xs truncate ${isNewlyCreated ? 'text-zinc-950 font-extrabold' : isPinned ? 'font-bold text-zinc-900' : 'font-semibold text-zinc-900'}`}>
                                      {tx.client_name}
                                    </span>
                                  </div>

                                  {/* 2. نوع العملية (Transaction Type: إيداع / سحب) */}
                                  <div className="w-32 text-center">
                                    <span className={`inline-flex items-center justify-center px-3 py-0.5 rounded-full border text-[11px] font-bold font-arabic ${
                                      isNewlyCreated
                                        ? 'bg-zinc-900 text-white border-zinc-900'
                                        : isDeposit
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        : 'bg-rose-50 text-rose-700 border-rose-200'
                                    }`}>
                                      {isDeposit ? 'إيداع' : 'سحب'}
                                    </span>
                                  </div>

                                  {/* 3. اسلوب الدفع (Payment Method: نقداً, تحويل مصرفي, بطاقة) */}
                                  <div className="w-36 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-medium font-arabic ${
                                      isNewlyCreated ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-zinc-100 text-zinc-700 border-zinc-200/70'
                                    }`}>
                                      {tx.payment_method || 'نقداً'}
                                    </span>
                                  </div>

                                  {/* 4. القيمة (Amount formatted in د.ل) */}
                                  <div className="w-40 text-right font-arabic ar-num">
                                    <span className={`text-xs font-semibold ${
                                      isNewlyCreated ? 'text-zinc-950 font-extrabold' : isDeposit ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                      {isDeposit ? '+' : '-'}{formatCurrency(tx.amount_cents)}
                                    </span>
                                  </div>

                                  {/* 5. التاريخ (Date) */}
                                  <div className={`w-44 text-right font-arabic ar-num text-xs ${isNewlyCreated ? 'text-zinc-800 font-bold' : 'text-zinc-500'}`} dir="ltr">
                                    {formatDate(tx.created_at)}
                                  </div>

                                  {/* 6. الإجراء (Actions: Eye & Printer Buttons) */}
                                  <div className="w-28 text-center flex items-center justify-center gap-1.5">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleViewReceipt(tx) }}
                                      className="p-1.5 rounded-md transition-colors border border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 hover:border-zinc-200"
                                      title="عرض الإيصال"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    <button
                                      onClick={(e) => { e.stopPropagation(); handlePrintReceipt(tx) }}
                                      className="p-1.5 rounded-md transition-colors border border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 hover:border-zinc-200"
                                      title="طباعة الإيصال"
                                    >
                                      <Printer className="w-4 h-4" />
                                    </button>
                                  </div>
                                </motion.div>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </AnimatePresence>
                    </LayoutGroup>
                  )}

                  {/* Fixed 8-row empty slot placeholders to keep pagination controls in 100% stable position */}
                  {!loading && data.length > 0 && data.length < PAGE_SIZE &&
                    Array.from({ length: PAGE_SIZE - data.length }).map((_, i) => (
                      <TableRow
                        key={`empty-slot-${i}`}
                        className="h-[53px] bg-zinc-50/40 border-b border-zinc-100/70 pointer-events-none select-none"
                      >
                        <TableCell colSpan={6} className="p-0 border-none">
                          <div className="flex items-center w-full px-4 py-3 text-transparent font-arabic text-xs">
                            &nbsp;
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-zinc-200/80 font-arabic">
              <span className="text-xs text-zinc-500 ar-num">
                عرض {data.length > 0 ? (page - 1) * PAGE_SIZE + 1 : 0} إلى{' '}
                {Math.min(page * PAGE_SIZE, total)} من إجمالي {total} معاملة
              </span>

              <div className="relative h-8 flex items-center justify-end">
                <AnimatePresence mode="wait">
                  {!isSliderMode ? (
                    <motion.div
                      key="standard-pagination-controls"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-1"
                    >
                      <Button
                        id="prev-page-btn"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-xs bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>

                      {/* Double-click page indicator to activate audio slider mode */}
                      <span
                        onDoubleClick={() => setIsSliderMode(true)}
                        title="انقر مرتين لتفعيل شريط التمرير الصوتي"
                        className="text-xs font-semibold px-2.5 py-1 rounded-md text-zinc-800 ar-num hover:bg-zinc-100 cursor-pointer select-none transition-colors border border-transparent hover:border-zinc-200"
                      >
                        {page} / {totalPages}
                      </span>

                      <Button
                        id="next-page-btn"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-xs bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || loading}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="audio-scrub-slider"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      onDoubleClick={() => setIsSliderMode(false)}
                      title="انقر مرتين للعودة إلى التنقل العادي"
                      className="relative flex items-center w-52 h-8 px-2.5 bg-zinc-50 rounded-lg border border-zinc-200 cursor-pointer select-none group"
                    >
                      {/* Dynamic Tooltip / Badge above thumb showing "صفحة X من Y" */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 text-white text-[10px] font-bold font-arabic shadow-md pointer-events-none whitespace-nowrap ar-num">
                        صفحة {page} من {totalPages}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-900" />
                      </div>

                      {/* Audio Player Style Range Scrub Bar */}
                      <div className="w-full flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 ar-num">1</span>
                        <input
                          type="range"
                          min={1}
                          max={totalPages}
                          step={1}
                          value={page}
                          onChange={(e) => setPage(Number(e.target.value))}
                          className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-zinc-900 focus:outline-none"
                        />
                        <span className="text-[10px] font-bold text-zinc-400 ar-num">{totalPages}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction creation modal */}
      <TransactionModal
        open={modalOpen}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />

      {/* Receipt viewing modal */}
      <ReceiptModal
        transaction={selectedReceipt}
        open={receiptOpen}
        onClose={() => setSelectedReceipt(null)}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
