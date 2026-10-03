import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Eye, Printer, Plus, CheckSquare, Filter,
  ChevronLeft, ChevronRight, ChevronDown, Pin, Trash2, Archive, FileText, Edit3, Loader2, Download, Receipt, Landmark, MessageCircle,
} from 'lucide-react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { formatCurrency, formatDate, filterTransactionsByDate, getSafePersonNames, getSafeInvoiceItems } from '@/lib/utils'
import type { Transaction, TransactionCreate, TransactionUpdate, DateFilter } from '@/types'
import { TransactionModal } from './TransactionModal'
import { EditTransactionModal } from './EditTransactionModal'
import { ReceiptModal } from './ReceiptModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { PrintReceipt } from './PrintReceipt'
import { TransactionsReportModal } from './TransactionsReportModal'
import {
  DashboardFilterModal,
  DashboardFilterState,
  defaultDashboardFilter,
} from './DashboardFilterModal'
import { usePermission } from '@/hooks/usePermission'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { logUserAction } from '@/lib/auditLogger'
import {
  playDepositSound, playWithdrawalSound, playDeleteSound, playClickSound
} from '@/lib/soundEffects'

import { initMockElectronAPI } from '@/lib/mockApi'
import { exportTransactionsToCsv } from '@/lib/exportUtils'

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
  paymentCategory?: 'ALL' | 'CASH' | 'BANK'
  onStatsRefresh: () => void
  dateFilter?: DateFilter
  onArchiveRow?: (tx: Transaction) => void
  onDeleteRow?: (tx: Transaction) => void
  refreshTrigger?: number
}

export function TransactionsTable({
  searchValue,
  paymentCategory = 'ALL',
  onStatsRefresh,
  dateFilter,
  onArchiveRow,
  onDeleteRow,
  refreshTrigger,
}: TransactionsTableProps) {
  const { hasPermission } = usePermission()
  const canEditData = hasPermission('edit_data')
  const canDeleteItems = hasPermission('delete_items')

  const [data, setData] = useState<Transaction[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'DEPOSIT' | 'WITHDRAWAL'>('ALL')
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
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<number>>(new Set())

  // Transaction creation modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'DEPOSIT' | 'WITHDRAWAL'>('DEPOSIT')

  // Funnel Filter Modal State
  const [dashboardFilter, setDashboardFilter] = useState<DashboardFilterState>(defaultDashboardFilter)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  // Receipt viewing modal state
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null)
  const [receiptOpen, setReceiptOpen] = useState(false)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (dashboardFilter.type !== 'ALL') count++
    if (dashboardFilter.paymentMethod !== 'ALL') count++
    if (dashboardFilter.minAmount.trim() !== '') count++
    if (dashboardFilter.maxAmount.trim() !== '') count++
    if (dashboardFilter.sortDateOrder !== 'desc') count++
    if (dashboardFilter.sortByAmount !== 'none') count++
    return count
  }, [dashboardFilter])

  const fetchData = useCallback(async () => {
    initMockElectronAPI()
    if (!window.electronAPI) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const effectivePaymentCategory = paymentCategory !== 'ALL' ? paymentCategory : (
        dashboardFilter.paymentMethod !== 'ALL'
          ? (dashboardFilter.paymentMethod === 'نقداً' ? 'CASH' : 'BANK')
          : 'ALL'
      )

      const hasCustomFilters =
        (dateFilter && dateFilter.mode !== 'NONE') ||
        effectivePaymentCategory !== 'ALL' ||
        dashboardFilter.paymentMethod !== 'ALL' ||
        dashboardFilter.minAmount.trim() !== '' ||
        dashboardFilter.maxAmount.trim() !== '' ||
        dashboardFilter.sortDateOrder !== 'desc' ||
        dashboardFilter.sortByAmount !== 'none' ||
        typeFilter !== 'ALL' ||
        dashboardFilter.type !== 'ALL'

      const effectiveType = typeFilter !== 'ALL' ? typeFilter : dashboardFilter.type

      if (hasCustomFilters) {
        const result = await window.electronAPI.getTransactions({
          page: 1,
          pageSize: 1000,
          search: searchValue,
          type: effectiveType,
          status: 'ACTIVE',
        })
        let items = result.data || []

        // Apply date filter
        if (dateFilter && dateFilter.mode !== 'NONE') {
          items = filterTransactionsByDate(items, dateFilter)
        }

        // Apply payment category filter
        if (effectivePaymentCategory !== 'ALL') {
          if (effectivePaymentCategory === 'CASH') {
            items = items.filter((t) => !t.payment_method || t.payment_method === 'نقداً' || t.payment_method === 'CASH')
          } else if (effectivePaymentCategory === 'BANK') {
            items = items.filter((t) => t.payment_method === 'بنك' || t.payment_method === 'تحويل مصرفي' || t.payment_method === 'BANK_TRANSFER' || t.payment_method === 'BANK')
          }
        } else if (dashboardFilter.paymentMethod !== 'ALL') {
          if (dashboardFilter.paymentMethod === 'بنك' || (dashboardFilter.paymentMethod as any) === 'تحويل مصرفي') {
            items = items.filter((t) => t.payment_method === 'بنك' || t.payment_method === 'تحويل مصرفي' || t.payment_method === 'BANK_TRANSFER')
          } else {
            items = items.filter((t) => t.payment_method === dashboardFilter.paymentMethod)
          }
        }

        // Apply min amount filter
        if (dashboardFilter.minAmount.trim() !== '') {
          const minCents = parseFloat(dashboardFilter.minAmount) * 100
          items = items.filter((t) => t.amount_cents >= minCents)
        }

        // Apply max amount filter
        if (dashboardFilter.maxAmount.trim() !== '') {
          const maxCents = parseFloat(dashboardFilter.maxAmount) * 100
          items = items.filter((t) => t.amount_cents <= maxCents)
        }

        // Apply custom sorting
        items.sort((a, b) => {
          const pinA = a.is_pinned ?? 0
          const pinB = b.is_pinned ?? 0
          if (pinA !== pinB) return pinB - pinA

          if (dashboardFilter.sortByAmount === 'desc') {
            return b.amount_cents - a.amount_cents
          }
          if (dashboardFilter.sortByAmount === 'asc') {
            return a.amount_cents - b.amount_cents
          }

          if (dashboardFilter.sortDateOrder === 'asc') {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          }
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        setTotal(items.length)
        const start = (page - 1) * PAGE_SIZE
        setData(items.slice(start, start + PAGE_SIZE))
      } else {
        const result = await window.electronAPI.getTransactions({
          page,
          pageSize: PAGE_SIZE,
          search: searchValue,
          type: 'ALL',
          status: 'ACTIVE',
        })
        setData(sortTransactions(result.data))
        setTotal(result.total)
      }
    } catch (err) {
      console.error('Failed to fetch transactions', err)
    } finally {
      setLoading(false)
    }
  }, [page, searchValue, typeFilter, dateFilter, dashboardFilter, paymentCategory])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    setPage(1)
  }, [searchValue, typeFilter, dateFilter, dashboardFilter, paymentCategory])

  useEffect(() => {
    fetchData()
  }, [fetchData, refreshTrigger])

  // Reactive listener: automatically update table whenever any transaction is restored or deleted
  useEffect(() => {
    const handleTransactionsUpdated = () => {
      fetchData()
      onStatsRefresh()
    }
    window.addEventListener('mjs:transactions-updated', handleTransactionsUpdated)
    return () => {
      window.removeEventListener('mjs:transactions-updated', handleTransactionsUpdated)
    }
  }, [fetchData, onStatsRefresh])

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
    if (!canDeleteItems) {
      alert('عفواً، لا تملك صلاحية حذف العناصر والعمليات')
      setPendingDeleteId(null)
      return
    }

    if (pendingDeleteId === null) return
    const targetId = pendingDeleteId
    setPendingDeleteId(null)
    setDeletingId(targetId)

    const targetTx = data.find((t) => t.id === targetId)
    if (targetTx) {
      playDeleteSound()
      logUserAction(
        'DELETE',
        'سلة المهملات والأرشيف',
        'نقل معاملة لسلة المهملات',
        `جهة: ${targetTx.client_name} | قيمة: ${formatCurrency(targetTx.amount_cents)}`
      )
      onDeleteRow?.(targetTx)
    }

    // Immediately remove from UI for fluid non-blocking feel
    setData((prev) => prev.filter((item) => item.id !== targetId))
    const newTotal = Math.max(0, total - 1)
    setTotal(newTotal)

    setTimeout(async () => {
      setDeletingId(null)

      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE))
      if (page > newTotalPages) {
        setPage(newTotalPages)
      }

      try {
        if (window.electronAPI?.deleteTransaction) {
          await window.electronAPI.deleteTransaction(targetId)
          onStatsRefresh()
          fetchData()
        }
      } catch (err) {
        console.error('Failed to delete transaction:', err)
      } finally {
        document.body.style.pointerEvents = 'auto'
        window.dispatchEvent(new CustomEvent('mjs:transactions-updated'))
      }
    }, 120)
  }

  // OPTIMISTIC UI: Execute Archive with Gray exit animation & dynamic page backfilling
  const handleArchive = (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setSwipedRowId(null)
    setArchivingId(id)

    const targetTx = data.find((t) => t.id === id)
    if (targetTx) {
      playDeleteSound()
      logUserAction(
        'ARCHIVE',
        'سلة المهملات والأرشيف',
        'أرشفة معاملة مالية',
        `جهة: ${targetTx.client_name} | قيمة: ${formatCurrency(targetTx.amount_cents)}`
      )
      onArchiveRow?.({ ...targetTx, is_archived: 1 })
    }

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
    initMockElectronAPI()
    if (payload.type === 'DEPOSIT') playDepositSound()
    else if (payload.type === 'WITHDRAWAL') playWithdrawalSound()

    logUserAction(
      payload.type,
      'مالية',
      payload.type === 'DEPOSIT' ? 'تسجيل عملية إيداع جديدة' : 'تسجيل عملية سحب جديدة',
      `جهة: ${payload.client_name} | قيمة: ${formatCurrency(payload.amount_cents)} | طريقة الدفع: ${payload.payment_method}`
    )
    if (window.electronAPI?.createTransaction) {
      const newTx = await window.electronAPI.createTransaction(payload)
      if ((newTx as any)?.error) {
        throw new Error((newTx as any).error)
      }
      setPage(1)
      await fetchData()
      onStatsRefresh()

      if (newTx && newTx.id) {
        setNewlyCreatedId(newTx.id)
        setTimeout(() => setNewlyCreatedId(null), 140)
        setSelectedReceipt(newTx)
        setReceiptOpen(true)
      }
    }
  }

  const openDeposit = () => { setModalMode('DEPOSIT'); setModalOpen(true) }
  const openWithdrawal = () => { setModalMode('WITHDRAWAL'); setModalOpen(true) }

  // Global Keyboard Shortcuts (Ctrl+ / Cmd+ for Deposit, Ctrl- / Cmd- for Withdrawal)
  useKeyboardShortcuts({
    onOpenDeposit: openDeposit,
    onOpenWithdrawal: openWithdrawal,
  })

  // Custom Report Modal State
  const [reportModalOpen, setReportModalOpen] = useState(false)

  // Full Edit Transaction Modal State & Handlers
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const handleOpenEditModal = (tx?: Transaction) => {
    if (!canEditData) {
      alert('عذراً، لا تملك صلاحية تعديل المعاملات')
      return
    }
    if (tx) {
      setEditingTransaction(tx)
    } else if (selectedIds.length === 1) {
      const found = data.find((t) => t.id === selectedIds[0])
      setEditingTransaction(found || null)
    } else if (selectedIds.length > 1) {
      const found = data.find((t) => t.id === selectedIds[0])
      setEditingTransaction(found || null)
    } else {
      setEditingTransaction(data.length > 0 ? data[0] : null)
    }
    setEditModalOpen(true)
  }

  const handleSaveEdit = async (payload: TransactionUpdate) => {
    initMockElectronAPI()
    if (window.electronAPI?.updateTransaction) {
      const res = await window.electronAPI.updateTransaction(payload)
      if (!res.success) {
        throw new Error(res.error || 'فشل تحديث المعاملة في قاعدة البيانات')
      }
    }

    playClickSound()
    logUserAction(
      'EDIT',
      'مالية',
      'تعديل بيانات معاملة في قاعدة البيانات',
      `معاملة رقم #${payload.id} | جهة/عنصر: ${payload.client_name} | قيمة: ${formatCurrency(payload.amount_cents || 0)}`
    )

    onStatsRefresh()
    await fetchData()
    window.dispatchEvent(new CustomEvent('mjs:transactions-updated'))
    document.body.style.pointerEvents = 'auto'
  }

  // Direct printable receipt state (for printer icon button direct print without preview modal)
  const [directPrintReceipt, setDirectPrintReceipt] = useState<Transaction | null>(null)

  // Receipt viewing modal state
  const [receiptOpenWhatsApp, setReceiptOpenWhatsApp] = useState(false)

  const handleViewReceipt = (tx: Transaction) => {
    setSelectedReceipt(tx)
    setReceiptOpenWhatsApp(false)
    setReceiptOpen(true)
  }

  const handleShareWhatsApp = (tx: Transaction) => {
    setSelectedReceipt(tx)
    setReceiptOpenWhatsApp(true)
    setReceiptOpen(true)
  }

  const handlePrintReceipt = (tx: Transaction) => {
    logUserAction(
      'PRINT_RECEIPT',
      'تقارير وطباعة',
      'طباعة إيصال استلام/صرف',
      `إيصال جهة: ${tx.client_name} | مبلغ: ${formatCurrency(tx.amount_cents)}`
    )
    setDirectPrintReceipt(tx)
    setTimeout(() => {
      window.print()
    }, 50)
  }

  // Edit Transaction Notes State & Handler
  const [editingNotesTx, setEditingNotesTx] = useState<Transaction | null>(null)
  const [editingNotesText, setEditingNotesText] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)

  const handleOpenEditNotes = (tx: Transaction, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setEditingNotesTx(tx)
    setEditingNotesText(tx.notes || '')
  }

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNotesTx) return
    const newNotes = editingNotesText.trim()
    setSavingNotes(true)
    try {
      if (window.electronAPI?.updateTransactionNotes) {
        await window.electronAPI.updateTransactionNotes({ id: editingNotesTx.id, notes: newNotes })
      }
      setData((prev) => prev.map((t) => (t.id === editingNotesTx.id ? { ...t, notes: newNotes } : t)))
      logUserAction('EDIT_TRANSACTION', 'مالية', 'تعديل سبب/ملاحظات المعاملة', `جهة: ${editingNotesTx.client_name} | ملاحظة جديدة: ${newNotes}`)
      setEditingNotesTx(null)
    } catch (err) {
      console.error('Failed to update notes:', err)
    } finally {
      setSavingNotes(false)
    }
  }

  // Multi-Row Selection & Bulk Actions State
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const handleToggleRowSelect = (id: number) => {
    playClickSound()
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAll = () => {
    playClickSound()
    const visibleIds = data.map((t) => t.id)
    const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id))
    if (isAllVisibleSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])))
    }
  }

  // Available Entities list for TransactionModal dropdown (combining custom Treasury entities + transactions + system entities)
  const availableEntities = useMemo(() => {
    let custom: string[] = []
    try {
      const saved = localStorage.getItem('salla_treasury_custom_entities')
      if (saved) custom = JSON.parse(saved)
    } catch {
      custom = []
    }

    const txEntities = data.filter((t) => t.type === 'DEPOSIT').map((t) => t.client_name?.trim()).filter(Boolean) as string[]
    const combined = Array.from(new Set([...custom, ...txEntities, 'منتجع MJS'])).filter((n) => n && n !== 'الخزينة الكلية' && n !== 'الخزينة')
    return combined.sort((a, b) => a.localeCompare(b, 'ar'))
  }, [data, modalOpen])

  const handleBulkArchive = async () => {
    if (selectedIds.length === 0) return
    const idsToArchive = [...selectedIds]
    setSelectedIds([])

    idsToArchive.forEach((id) => {
      const targetTx = data.find((t) => t.id === id)
      if (targetTx) onArchiveRow?.(targetTx)
    })

    if (window.electronAPI?.archiveTransactionsBatch) {
      await window.electronAPI.archiveTransactionsBatch(idsToArchive)
    } else if (window.electronAPI?.archiveTransaction) {
      for (const id of idsToArchive) {
        await window.electronAPI.archiveTransaction(id)
      }
    }
    onStatsRefresh()
    fetchData()
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`هل أنت متأكد من نقل ${selectedIds.length} عنصر إلى سلة المحذوفات؟`)) return

    const idsToDelete = [...selectedIds]
    setSelectedIds([])

    // Immediate optimistic UI update so interface never blocks
    setData((prev) => prev.filter((item) => !idsToDelete.includes(item.id)))
    const newTotal = Math.max(0, total - idsToDelete.length)
    setTotal(newTotal)

    idsToDelete.forEach((id) => {
      const targetTx = data.find((t) => t.id === id)
      if (targetTx) onDeleteRow?.(targetTx)
    })

    try {
      if (window.electronAPI?.deleteTransactionsBatch) {
        await window.electronAPI.deleteTransactionsBatch(idsToDelete, false)
      } else if (window.electronAPI?.deleteTransaction) {
        for (const id of idsToDelete) {
          await window.electronAPI.deleteTransaction(id, false)
        }
      }
    } catch (err) {
      console.error('Failed bulk delete transactions:', err)
    } finally {
      document.body.style.pointerEvents = 'auto'
      onStatsRefresh()
      await fetchData()
      window.dispatchEvent(new CustomEvent('mjs:transactions-updated'))
    }
  }

  return (
    <>
      <div className="space-y-4" dir="rtl" ref={tableRef}>
        {/* Top Toolbar: Filters & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Right/Start title */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-arabic">
              {paymentCategory === 'CASH'
                ? 'العمليات النقدية (نقداً)'
                : paymentCategory === 'BANK'
                ? 'العمليات المصرفية (بنك)'
                : 'جميع العمليات'}
            </h3>
          </div>

          {/* Left/End action buttons */}
          <div className="flex items-center gap-2">
            <Button
              id="dashboard-funnel-filter-btn"
              variant={activeFilterCount > 0 ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsFilterModalOpen(true)}
              className={`h-8 gap-1.5 text-xs font-arabic font-semibold shadow-xs transition-all cursor-pointer ${
                activeFilterCount > 0
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600'
                  : 'text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>تصفية وفلترة</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-4 h-4 text-[10px] font-bold rounded-full bg-white text-emerald-800 ar-num mr-0.5">
                  {activeFilterCount}
                </span>
              )}
            </Button>

            <Button
              id="toggle-selection-btn"
              variant={isSelectionMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setIsSelectionMode((prev) => !prev)
                setSelectedIds([])
              }}
              className={`h-8 gap-1.5 text-xs font-arabic font-medium shadow-xs ${
                isSelectionMode
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                  : 'text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>{isSelectionMode ? 'إلغاء التحديد' : 'تحديد الصفوف'}</span>
            </Button>

            <Button
              id="print-report-btn"
              variant="outline"
              size="sm"
              onClick={() => setReportModalOpen(true)}
              className="h-8 gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-arabic font-medium shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>{selectedIds.length > 0 ? `طباعة المحدد (${selectedIds.length})` : 'طباعة تقرير'}</span>
            </Button>

            <Button
              id="export-csv-btn"
              variant="outline"
              size="sm"
              onClick={() => {
                logUserAction('EXPORT_CSV', 'تقارير وطباعة', 'تصدير معاملات CSV من جدول المعاملات', `عدد السجلات: ${total}`)
                // Export all currently loaded data
                if (window.electronAPI?.getTransactions) {
                  window.electronAPI.getTransactions({ page: 1, pageSize: 10000, status: 'ACTIVE', search: searchValue, type: typeFilter === 'ALL' ? 'ALL' : typeFilter })
                    .then((res) => exportTransactionsToCsv(res.data || []))
                    .catch(() => exportTransactionsToCsv(data))
                } else {
                  exportTransactionsToCsv(data)
                }
              }}
              className="h-8 gap-1.5 text-xs text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 font-arabic font-medium shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تصدير CSV</span>
            </Button>

            {canEditData && (
              <>
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
              </>
            )}
          </div>
        </div>

        {/* Floating Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border border-zinc-800 dark:border-zinc-200 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 font-arabic">
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 dark:text-emerald-700 border border-emerald-500/40 ar-num">
                تم تحديد {selectedIds.length} عنصر
              </span>
              <span className="text-zinc-400 dark:text-zinc-600 font-medium hidden sm:inline">
                يمكنك تنفيذ إجراء جماعي على المعاملات المحددة
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                type="button"
                onClick={handleBulkArchive}
                className="h-7 px-3 gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-300 text-zinc-100 dark:text-zinc-900 font-bold rounded-lg transition-all"
              >
                <Archive className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                <span>أرشفة المحدد</span>
              </Button>

              {canDeleteItems && (
                <Button
                  size="sm"
                  type="button"
                  onClick={handleBulkDelete}
                  className="h-7 px-3 gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المحدد</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Table Container */}
        <Card className="subtle-card rounded-xl p-0 shadow-none border border-zinc-200/80 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900/90 transition-colors">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table dir="rtl" className="w-full border-collapse">
                <TableHeader>
                  <TableRow className="flex items-center w-full px-4 py-3 bg-zinc-50/80 dark:bg-zinc-800/80 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/80 border-b border-zinc-200/80 dark:border-zinc-800 font-arabic text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    {isSelectionMode && (
                      <TableHead className="w-8 text-center p-0 flex items-center justify-center shrink-0 ml-2">
                        <input
                          type="checkbox"
                          checked={data.length > 0 && data.every((t) => selectedIds.includes(t.id))}
                          onChange={handleToggleSelectAll}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          title="تحديد الكل"
                        />
                      </TableHead>
                    )}
                    <TableHead className="flex-1 min-w-0 text-right p-0 font-bold">
                      اسم العنصر / الجهة
                    </TableHead>
                    <TableHead className="w-28 text-center p-0 font-bold shrink-0">
                      نوع العملية
                    </TableHead>
                    <TableHead className="w-28 text-center p-0 font-bold shrink-0">
                      اسلوب الدفع
                    </TableHead>
                    <TableHead className="w-44 text-right p-0 font-bold shrink-0">
                      سبب المعاملة / الملاحظات
                    </TableHead>
                    <TableHead className="w-36 text-right p-0 font-bold shrink-0">
                      القيمة
                    </TableHead>
                    <TableHead className="w-44 text-right p-0 font-bold shrink-0">
                      التاريخ
                    </TableHead>
                    <TableHead className="w-24 text-center p-0 font-bold shrink-0">
                      الإجراء
                    </TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody key={`page-body-${page}`} className="relative">
                  {loading ? (
                    Array.from({ length: PAGE_SIZE }).map((_, i) => (
                      <TableRow key={i} className="border-b border-zinc-200/40 dark:border-zinc-800/40">
                        <TableCell colSpan={isSelectionMode ? 8 : 7} className="py-3 px-4">
                          <div className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded animate-pulse" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isSelectionMode ? 8 : 7} className="text-center py-12 text-xs text-zinc-400 dark:text-zinc-500 font-arabic font-medium">
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
                          const isTreasuryClearance = tx.subtype === 'TREASURY_CLEARANCE' || tx.client_name === 'تفريغ من الخزينة'

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
                              className={`relative border-b border-zinc-200/60 dark:border-zinc-800/60 group cursor-pointer select-none overflow-hidden transition-colors ${
                                isNewlyCreated
                                  ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white font-extrabold shadow-[0_0_30px_rgba(255,255,255,1)] ring-2 ring-zinc-900 dark:ring-zinc-100'
                                  : isDeleting
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-medium'
                                  : isArchiving
                                  ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-medium'
                                  : isPinned
                                  ? 'bg-zinc-100/90 dark:bg-zinc-800/90 font-semibold border-r-4 border-r-zinc-900 dark:border-r-zinc-100 shadow-sm'
                                  : isSwiped
                                  ? 'bg-zinc-50 dark:bg-zinc-800/70'
                                  : isTreasuryClearance
                                  ? 'bg-purple-50/70 hover:bg-purple-100/70 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 border-purple-200/70 dark:border-purple-800/40 text-purple-950 dark:text-purple-100'
                                  : 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/60 bg-white dark:bg-zinc-900'
                              }`}
                            >
                              <TableCell colSpan={isSelectionMode ? 7 : 6} className="p-0 border-none relative">
                                {/* Underlying Revealed Action Bar */}
                                <AnimatePresence>
                                  {isSwiped && !isDeleting && !isArchiving && (
                                    <motion.div
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: -20 }}
                                      transition={{ duration: 0.2 }}
                                      className="absolute left-0 inset-y-0 flex items-stretch gap-0 z-10 h-full overflow-hidden"
                                    >
                                      {/* Pin Button */}
                                      <button
                                        onClick={(e) => handleTogglePin(tx.id, e)}
                                        title={isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}
                                        className={`w-12 h-full text-white flex items-center justify-center transition-colors active:opacity-90 ${
                                          isPinned ? 'bg-amber-600 hover:bg-amber-700' : 'bg-zinc-800 hover:bg-zinc-900'
                                        }`}
                                      >
                                        <Pin className="w-4 h-4" />
                                      </button>

                                      {/* Edit Button */}
                                      {canEditData && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setSwipedRowId(null)
                                            handleOpenEditModal(tx)
                                          }}
                                          title="تعديل كافة بيانات المعاملة"
                                          className="w-12 h-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors active:opacity-90"
                                        >
                                          <Edit3 className="w-4 h-4" />
                                        </button>
                                      )}

                                      {/* Archive Button */}
                                      <button
                                        onClick={(e) => handleArchive(tx.id, e)}
                                        title="أرشفة المعاملة"
                                        className="w-12 h-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center transition-colors active:opacity-90"
                                      >
                                        <Archive className="w-4 h-4" />
                                      </button>

                                      {/* Delete Button */}
                                      {canDeleteItems && (
                                        <button
                                          onClick={(e) => handleOpenDeleteConfirm(tx.id, e)}
                                          title="حذف المعاملة"
                                          className="w-12 h-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center transition-colors active:opacity-90"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>

                                {/* Sliding Row Content Layer */}
                                <motion.div
                                  animate={{
                                    x: isDeleting || isArchiving ? -250 : isSwiped ? (canDeleteItems ? 192 : 144) : 0,
                                    opacity: isDeleting || isArchiving ? 0 : 1,
                                  }}
                                  transition={{
                                    x: { type: 'spring', stiffness: 320, damping: 28 },
                                  }}
                                  className="flex items-center w-full px-4 py-3 bg-inherit"
                                >
                                  {/* Selection Checkbox */}
                                  {isSelectionMode && (
                                    <div className="w-8 text-center flex items-center justify-center shrink-0 ml-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedIds.includes(tx.id)}
                                        onChange={(e) => {
                                          e.stopPropagation()
                                          handleToggleRowSelect(tx.id)
                                        }}
                                        className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                    </div>
                                  )}

                                  {/* 1. اسم الجهة */}
                                  <div className="flex-1 min-w-0 text-right font-arabic flex items-center gap-1.5">
                                    {isPinned && (
                                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 shadow-xs shrink-0" title="مثبتة في الأعلى">
                                        <Pin className="w-3 h-3 fill-current" />
                                      </span>
                                    )}
                                    <div className="flex flex-col min-w-0">
                                      {(() => {
                                        if (isTreasuryClearance) {
                                          return (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <span className="p-1 rounded bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
                                                <Landmark className="w-3.5 h-3.5" />
                                              </span>
                                              <div className="flex flex-col min-w-0">
                                                <span className={`text-xs truncate font-bold ${isNewlyCreated ? 'text-zinc-950 dark:text-white font-extrabold' : 'text-purple-950 dark:text-purple-200'}`}>
                                                  تفريغ من الخزينة
                                                </span>
                                                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-medium truncate">
                                                  سحب لمصلحة الإدارة العليا
                                                </span>
                                              </div>
                                            </div>
                                          )
                                        }

                                        const txInvoiceItems = getSafeInvoiceItems(tx.invoice_items)
                                        const txPersonNames = getSafePersonNames(tx.person_names)
                                        const isCumulative = tx.subtype === 'CUMULATIVE' || txInvoiceItems.length > 0

                                        if (isCumulative) {
                                          return (
                                            <div className="flex flex-col min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <Receipt className={`w-3.5 h-3.5 shrink-0 ${isDeposit ? 'text-emerald-500' : 'text-rose-500'}`} />
                                                <span className={`text-xs font-bold ${isNewlyCreated ? 'text-zinc-950 dark:text-white font-extrabold' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                                  {tx.client_name}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setExpandedInvoiceIds((prev) => {
                                                      const next = new Set(prev)
                                                      if (next.has(tx.id)) next.delete(tx.id)
                                                      else next.add(tx.id)
                                                      return next
                                                    })
                                                  }}
                                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                                                    isDeposit
                                                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/80'
                                                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/80'
                                                  }`}
                                                  title={isDeposit ? 'عرض/إخفاء بنود الإيداع' : 'عرض/إخفاء بنود الفاتورة'}
                                                >
                                                  <span>
                                                    {isDeposit ? 'إيداع تجميعي' : 'فاتورة'} ({txInvoiceItems.length || txPersonNames.length || 0} {isDeposit ? 'بنود' : 'عناصر'})
                                                  </span>
                                                  <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${expandedInvoiceIds.has(tx.id) ? 'rotate-180' : ''}`} />
                                                </button>
                                              </div>

                                              {/* Expandable Breakdown of Items */}
                                              {expandedInvoiceIds.has(tx.id) && (
                                                <div className="flex flex-wrap gap-1 mt-1.5 p-1.5 bg-zinc-50 dark:bg-zinc-800/80 rounded-lg border border-zinc-200 dark:border-zinc-700/80 max-w-md animate-in fade-in-50 duration-150">
                                                  {txInvoiceItems.length > 0 ? (
                                                    txInvoiceItems.map((it, idx) => (
                                                      <span
                                                        key={idx}
                                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700 text-[10px] text-zinc-700 dark:text-zinc-300 shadow-2xs"
                                                      >
                                                        <span className="font-semibold">{it.name}:</span>
                                                        <span className={`font-bold ar-num ${isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                                          {formatCurrency(it.amount_cents)}
                                                        </span>
                                                      </span>
                                                    ))
                                                  ) : (
                                                    txPersonNames.map((n, idx) => (
                                                      <span
                                                        key={idx}
                                                        className="inline-flex items-center px-1.5 py-0.5 rounded bg-white dark:bg-zinc-900 border border-zinc-200 text-[10px] text-zinc-700 dark:text-zinc-300"
                                                      >
                                                        {n}
                                                      </span>
                                                    ))
                                                  )}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        }

                                        if (!isDeposit) {
                                          return (
                                            <span className={`text-xs truncate font-bold ${isNewlyCreated ? 'text-zinc-950 dark:text-white font-extrabold' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                              {tx.person_name || (txPersonNames.length > 0 ? txPersonNames.join(' ، ') : tx.client_name)}
                                            </span>
                                          )
                                        }

                                        return (
                                          <>
                                            <span className={`text-xs truncate ${isNewlyCreated ? 'text-zinc-950 dark:text-white font-extrabold' : isPinned ? 'font-bold text-zinc-900 dark:text-white' : 'font-semibold text-zinc-900 dark:text-zinc-100'}`}>
                                              {tx.client_name}
                                            </span>
                                            {tx.subtype === 'PERSON' && (
                                              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium truncate">
                                                بواسطة المودِع: {tx.person_name || 'شخص'}
                                              </span>
                                            )}
                                          </>
                                        )
                                      })()}
                                    </div>
                                  </div>

                                  {/* 2. نوع العملية */}
                                  <div className="w-28 text-center shrink-0">
                                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-bold font-arabic ${
                                      isNewlyCreated
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                                        : isTreasuryClearance
                                        ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                                        : isDeposit
                                        ? (tx.subtype === 'CUMULATIVE'
                                            ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800'
                                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800')
                                        : tx.subtype === 'CUMULATIVE'
                                        ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                        : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                    }`}>
                                      {isTreasuryClearance
                                        ? 'تفريغ من الخزينة'
                                        : isDeposit
                                        ? (tx.subtype === 'CUMULATIVE' ? 'إيداع تجميعي' : tx.subtype === 'PERSON' ? 'إيداع من شخص' : 'إيداع')
                                        : tx.subtype === 'CUMULATIVE'
                                        ? 'سحب تجميعي'
                                        : 'سحب'
                                      }
                                    </span>
                                  </div>

                                  {/* 3. اسلوب الدفع */}
                                  <div className="w-28 text-center shrink-0">
                                    <span className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-medium font-arabic ${
                                      isNewlyCreated
                                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100'
                                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/70 dark:border-zinc-700'
                                    }`}>
                                      {tx.payment_method === 'تحويل مصرفي' || tx.payment_method === 'BANK_TRANSFER' ? 'بنك' : (tx.payment_method || 'نقداً')}
                                    </span>
                                  </div>

                                  {/* 4. سبب المعاملة / الملاحظات */}
                                  <div className="w-44 text-right font-arabic shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => handleOpenEditNotes(tx, e)}
                                      className="inline-flex items-center gap-1.5 max-w-full text-right text-xs rounded-lg px-2 py-1 transition-all border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 group/note"
                                      title="اضغط لتعديل سبب/ملاحظات المعاملة"
                                    >
                                      <FileText className="w-3.5 h-3.5 text-zinc-400 group-hover/note:text-emerald-500 shrink-0" />
                                      <span className="truncate max-w-[130px]">
                                        {tx.notes?.trim() ? (
                                          tx.notes.trim()
                                        ) : (
                                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 italic">+ إضافة سبب</span>
                                        )}
                                      </span>
                                    </button>
                                  </div>

                                  {/* 5. القيمة */}
                                  <div className="w-36 text-right font-arabic ar-num shrink-0">
                                    <span className={`text-xs font-semibold ${
                                      isNewlyCreated
                                        ? 'text-zinc-950 dark:text-white font-extrabold'
                                        : isTreasuryClearance
                                        ? 'text-purple-700 dark:text-purple-400 font-bold'
                                        : isDeposit
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                      {isDeposit ? '+' : '-'}{formatCurrency(tx.amount_cents)}
                                    </span>
                                  </div>

                                  {/* 6. التاريخ */}
                                  <div className={`w-44 text-right font-arabic ar-num text-xs shrink-0 ${isNewlyCreated ? 'text-zinc-800 dark:text-zinc-200 font-bold' : 'text-zinc-500 dark:text-zinc-400'}`} dir="ltr">
                                    {formatDate(tx.created_at)}
                                  </div>

                                  {/* 7. الإجراء */}
                                  <div className="w-28 text-center flex items-center justify-center gap-1 shrink-0">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(tx) }}
                                      className="p-1.5 rounded-md transition-colors border border-transparent text-[#25D366] hover:text-[#20ba5a] hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:border-emerald-200 dark:hover:border-emerald-800"
                                      title="إرسال الإيصال كملف PDF على واتساب"
                                    >
                                      <MessageCircle className="w-4 h-4 fill-current" />
                                    </button>

                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleViewReceipt(tx) }}
                                      className="p-1.5 rounded-md transition-colors border border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                                      title="عرض الإيصال"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>

                                    {hasPermission('export_reports') && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handlePrintReceipt(tx) }}
                                        className="p-1.5 rounded-md transition-colors border border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700"
                                        title="طباعة الإيصال"
                                      >
                                        <Printer className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </motion.div>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </AnimatePresence>
                    </LayoutGroup>
                  )}

                  {/* Fixed 8-row empty slot placeholders */}
                  {!loading && data.length > 0 && data.length < PAGE_SIZE &&
                    Array.from({ length: PAGE_SIZE - data.length }).map((_, i) => (
                      <TableRow
                        key={`empty-slot-${i}`}
                        className="h-[53px] bg-zinc-50/40 dark:bg-zinc-900/30 border-b border-zinc-100/70 dark:border-zinc-800/50 pointer-events-none select-none"
                      >
                        <TableCell colSpan={isSelectionMode ? 7 : 6} className="p-0 border-none">
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
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 border-t border-zinc-200/80 dark:border-zinc-800 font-arabic">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 ar-num">
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
                        className="h-7 w-7 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>

                      {/* Double-click page indicator */}
                      <span
                        onDoubleClick={() => setIsSliderMode(true)}
                        title="انقر مرتين لتفعيل شريط التمرير الصوتي"
                        className="text-xs font-semibold px-2.5 py-1 rounded-md text-zinc-800 dark:text-zinc-200 ar-num hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer select-none transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                      >
                        {page} / {totalPages}
                      </span>

                      <Button
                        id="next-page-btn"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 text-xs bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
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
                      className="relative flex items-center w-52 h-8 px-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer select-none group"
                    >
                      {/* Badge showing "صفحة X من Y" */}
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-bold font-arabic shadow-md pointer-events-none whitespace-nowrap ar-num">
                        صفحة {page} من {totalPages}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-zinc-900 dark:border-t-zinc-100" />
                      </div>

                      {/* Range Scrub Bar */}
                      <div className="w-full flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 ar-num">1</span>
                        <input
                          type="range"
                          min={1}
                          max={totalPages}
                          step={1}
                          value={page}
                          onChange={(e) => setPage(Number(e.target.value))}
                          className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100 focus:outline-none"
                        />
                        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 ar-num">{totalPages}</span>
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
        entities={availableEntities}
      />

      {/* Direct print element (prints immediately without modal) */}
      <PrintReceipt transaction={directPrintReceipt} isPreview={false} />

      {/* Receipt viewing modal */}
      <ReceiptModal
        transaction={selectedReceipt}
        open={receiptOpen}
        onClose={() => {
          setSelectedReceipt(null)
          setReceiptOpenWhatsApp(false)
          setReceiptOpen(false)
        }}
        initialOpenWhatsApp={receiptOpenWhatsApp}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmModal
        open={pendingDeleteId !== null}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Edit Full Transaction Modal */}
      <EditTransactionModal
        open={editModalOpen}
        transaction={editingTransaction}
        transactionsList={data}
        onClose={() => {
          setEditModalOpen(false)
          setEditingTransaction(null)
        }}
        onSave={handleSaveEdit}
      />

      {/* Interactive Report Customization & Live Preview Modal */}
      <TransactionsReportModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        transactions={selectedIds.length > 0 ? data.filter((t) => selectedIds.includes(t.id)) : data}
        stats={null}
        dateFilter={dateFilter}
      />

      {/* Advanced Funnel Filter Modal */}
      <DashboardFilterModal
        open={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filterState={dashboardFilter}
        onApplyFilter={(newFilter) => setDashboardFilter(newFilter)}
        onResetFilter={() => setDashboardFilter(defaultDashboardFilter)}
      />

      {/* Edit / Add Notes Modal for Existing & New Transactions */}
      <Dialog open={editingNotesTx !== null} onOpenChange={(open) => !open && setEditingNotesTx(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 font-arabic p-5 rounded-2xl shadow-xl" dir="rtl">
          <DialogHeader className="text-right">
            <DialogTitle className="text-sm font-extrabold flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Edit3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>تعديل سبب / ملاحظات المعاملة</span>
            </DialogTitle>
            {editingNotesTx && (
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                جهة المعاملة: <span className="font-bold text-zinc-800 dark:text-zinc-200">{editingNotesTx.client_name}</span> | المبلغ: <span className="font-bold text-emerald-600 dark:text-emerald-400 ar-num">{formatCurrency(editingNotesTx.amount_cents)}</span>
              </p>
            )}
          </DialogHeader>

          <form onSubmit={handleSaveNotes} className="space-y-4 mt-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-notes-input" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block text-right">
                سبب الإيداع/السحب (الملاحظات)
              </Label>
              <Input
                id="edit-notes-input"
                type="text"
                placeholder="أدخل سبب المعاملة أو أي ملاحظة إضافية..."
                value={editingNotesText}
                onChange={(e) => setEditingNotesText(e.target.value)}
                className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-900 dark:text-zinc-100 rounded-lg font-arabic text-right"
                autoFocus
                autoComplete="off"
              />
            </div>

            <DialogFooter className="flex-row-reverse gap-2 mt-5">
              <Button
                type="submit"
                disabled={savingNotes}
                className="flex-1 text-xs font-arabic font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
              >
                {savingNotes && <Loader2 className="w-3.5 h-3.5 animate-spin ml-1.5" />}
                حفظ الملاحظات
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingNotesTx(null)}
                className="flex-1 text-xs bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 font-arabic rounded-lg"
              >
                إلغاء
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
