import { useState, useRef, useEffect } from 'react'
import {
  X, Archive, RotateCcw, Trash2, LayoutDashboard, Coins,
} from 'lucide-react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'
import type { Transaction } from '@/types'
import { DeleteConfirmModal } from '../dashboard/DeleteConfirmModal'
import { usePermission } from '@/hooks/usePermission'
import { logUserAction } from '@/lib/auditLogger'

export interface EntityBalance {
  name: string
  depositedCents: number
  withdrawnCents: number
  netCents: number
  transactionCount: number
}

interface ArchiveDrawerProps {
  open: boolean
  onClose: () => void
  archivedDashboardRows: Transaction[]
  archivedTreasuryRows: EntityBalance[]
  onRestoreDashboardRow: (id: number) => Promise<void>
  onPermanentDeleteDashboardRow: (id: number) => Promise<void>
  onRestoreTreasuryEntity: (name: string) => Promise<void>
  onPermanentDeleteTreasuryEntity: (name: string) => Promise<void>
}

export function ArchiveDrawer({
  open,
  onClose,
  archivedDashboardRows,
  archivedTreasuryRows,
  onRestoreDashboardRow,
  onPermanentDeleteDashboardRow,
  onRestoreTreasuryEntity,
  onPermanentDeleteTreasuryEntity,
}: ArchiveDrawerProps) {
  const { hasPermission } = usePermission()
  const canDeleteItems = hasPermission('delete_items')
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'TREASURY'>('DASHBOARD')

  // Swiped row states for slide-to-reveal action bar
  const [swipedDashId, setSwipedDashId] = useState<number | null>(null)
  const [swipedTreasuryName, setSwipedTreasuryName] = useState<string | null>(null)

  // Delete confirm modal state
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'DASHBOARD' | 'TREASURY'
    idOrName: number | string
  } | null>(null)

  const drawerRef = useRef<HTMLDivElement>(null)

  const totalArchivedCount = archivedDashboardRows.length + archivedTreasuryRows.length

  // Automatically close drawer if all items are restored or deleted
  useEffect(() => {
    if (open && totalArchivedCount === 0) {
      onClose()
    }
  }, [open, totalArchivedCount, onClose])

  // Click outside & Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const handleConfirmDelete = async () => {
    if (!canDeleteItems) {
      alert('عفواً، لا تملك صلاحية حذف العناصر والعمليات')
      setPendingDelete(null)
      return
    }
    if (!pendingDelete) return
    if (pendingDelete.type === 'DASHBOARD') {
      await onPermanentDeleteDashboardRow(pendingDelete.idOrName as number)
      setSwipedDashId(null)
    } else {
      await onPermanentDeleteTreasuryEntity(pendingDelete.idOrName as string)
      setSwipedTreasuryName(null)
    }
    setPendingDelete(null)
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end font-arabic select-none">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-over Right Drawer Panel */}
          <motion.aside
            ref={drawerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 240 }}
            className="relative w-full sm:w-[640px] h-full bg-white dark:bg-zinc-900 border-l border-zinc-200/80 dark:border-zinc-800 shadow-2xl z-50 flex flex-col justify-between overflow-hidden text-zinc-900 dark:text-zinc-100"
            dir="rtl"
          >
            {/* Drawer Top Header */}
            <div className="px-6 py-4 border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shadow-xs">
                    <Archive className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <span>سجل الأرشيف والمستندات المحفوظة</span>
                      <span className="px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 text-xs font-bold ar-num">
                        {totalArchivedCount} سجل
                      </span>
                    </h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      استعادة السجلات المؤرشفة أو حذفها نهائياً من النظام
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Archive Section Navigation Tabs */}
              <div className="mt-4 flex items-center gap-2 border-b border-zinc-200/80 dark:border-zinc-800 pb-0">
                <button
                  onClick={() => setActiveTab('DASHBOARD')}
                  className={`py-2 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'DASHBOARD'
                      ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400 font-extrabold'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>أرشيف لوحة التحكم</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] ar-num">
                    {archivedDashboardRows.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('TREASURY')}
                  className={`py-2 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'TREASURY'
                      ? 'border-sky-600 text-sky-600 dark:border-sky-400 dark:text-sky-400 font-extrabold'
                      : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>أرشيف الخزينة</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[10px] ar-num">
                    {archivedTreasuryRows.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Drawer Body Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4">

              {/* TAB 1: DASHBOARD ARCHIVED TRANSACTIONS */}
              {activeTab === 'DASHBOARD' && (
                <div className="space-y-3">
                  {archivedDashboardRows.length === 0 ? (
                    <div className="text-center py-16 text-xs text-zinc-400 dark:text-zinc-500">
                      لا توجد معاملات مؤرشفة في لوحة التحكم
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
                            <th className="py-2.5 px-3">التاريخ</th>
                            <th className="py-2.5 px-3">الجهة / المستفيد</th>
                            <th className="py-2.5 px-3 text-center">نوع المعاملة</th>
                            <th className="py-2.5 px-3 text-left">المبلغ</th>
                          </tr>
                        </thead>
                        <tbody>
                          <LayoutGroup id="dashboard-archive-group">
                            <AnimatePresence mode="popLayout" initial={false}>
                              {archivedDashboardRows.map((tx) => {
                                const isSwiped = swipedDashId === tx.id
                                const isDeposit = tx.type === 'DEPOSIT'
                                return (
                                  <motion.tr
                                    layout
                                    key={tx.id}
                                    onDoubleClick={() => setSwipedDashId((prev) => (prev === tx.id ? null : tx.id))}
                                    className="border-b border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 cursor-pointer select-none relative group"
                                  >
                                    <td colSpan={4} className="p-0 relative">
                                      {/* Underlying Action Bar */}
                                      {isSwiped && (
                                        <div className="absolute left-0 inset-y-0 flex items-stretch z-10">
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation()
                                              logUserAction('RESTORE', 'سلة المهملات والأرشيف', 'استعادة معاملة من الأرشيف', `معاملة جهة: ${tx.client_name} | قيمة: ${formatCurrency(tx.amount_cents)}`)
                                              await onRestoreDashboardRow(tx.id)
                                              setSwipedDashId(null)
                                            }}
                                            className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-bold text-[11px] transition-colors"
                                            title="استعادة المعاملة"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            <span>استعادة</span>
                                          </button>
                                          {canDeleteItems && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setPendingDelete({ type: 'DASHBOARD', idOrName: tx.id })
                                              }}
                                              className="px-3 bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 font-bold text-[11px] transition-colors"
                                              title="حذف نهائي"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              <span>حذف نهائي</span>
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {/* Row Content Layer */}
                                      <motion.div
                                        animate={{ x: isSwiped ? (canDeleteItems ? 130 : 70) : 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                                        className="flex items-center w-full px-3 py-2.5 bg-inherit"
                                      >
                                        <div className="w-28 text-zinc-500 dark:text-zinc-400 text-[11px] ar-num">
                                          {new Date(tx.created_at).toLocaleDateString('ar-LY')}
                                        </div>
                                        <div className="flex-1 font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                          {tx.client_name}
                                        </div>
                                        <div className="w-24 text-center">
                                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            isDeposit
                                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                          }`}>
                                            {isDeposit ? 'إيداع' : 'سحب'}
                                          </span>
                                        </div>
                                        <div className="w-28 text-left font-bold ar-num">
                                          <span className={isDeposit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                                            {isDeposit ? '+' : '-'}{formatCurrency(tx.amount_cents)} د.ل
                                          </span>
                                        </div>
                                      </motion.div>
                                    </td>
                                  </motion.tr>
                                )
                              })}
                            </AnimatePresence>
                          </LayoutGroup>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: TREASURY ARCHIVED ENTITIES */}
              {activeTab === 'TREASURY' && (
                <div className="space-y-3">
                  {archivedTreasuryRows.length === 0 ? (
                    <div className="text-center py-16 text-xs text-zinc-400 dark:text-zinc-500">
                      لا توجد جهات مؤرشفة في الخزينة
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-bold border-b border-zinc-200 dark:border-zinc-800">
                            <th className="py-2.5 px-3">اسم الجهة</th>
                            <th className="py-2.5 px-3 text-center">المعاملات</th>
                            <th className="py-2.5 px-3 text-right">المودعات</th>
                            <th className="py-2.5 px-3 text-right">المسحوبات</th>
                            <th className="py-2.5 px-3 text-left">صافي الحساب</th>
                          </tr>
                        </thead>
                        <tbody>
                          <LayoutGroup id="treasury-archive-group">
                            <AnimatePresence mode="popLayout" initial={false}>
                              {archivedTreasuryRows.map((entity) => {
                                const isSwiped = swipedTreasuryName === entity.name
                                const isPositiveNet = entity.netCents >= 0
                                return (
                                  <motion.tr
                                    layout
                                    key={entity.name}
                                    onDoubleClick={() => setSwipedTreasuryName((prev) => (prev === entity.name ? null : entity.name))}
                                    className="border-b border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 cursor-pointer select-none relative group"
                                  >
                                    <td colSpan={5} className="p-0 relative">
                                      {/* Underlying Action Bar */}
                                      {isSwiped && (
                                        <div className="absolute left-0 inset-y-0 flex items-stretch z-10">
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation()
                                              await onRestoreTreasuryEntity(entity.name)
                                              setSwipedTreasuryName(null)
                                            }}
                                            className="px-3 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-bold text-[11px] transition-colors"
                                            title="استعادة الجهة"
                                          >
                                            <RotateCcw className="w-3.5 h-3.5" />
                                            <span>استعادة</span>
                                          </button>
                                          {canDeleteItems && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setPendingDelete({ type: 'TREASURY', idOrName: entity.name })
                                              }}
                                              className="px-3 bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 font-bold text-[11px] transition-colors"
                                              title="حذف نهائي"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              <span>حذف نهائي</span>
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {/* Row Content Layer */}
                                      <motion.div
                                        animate={{ x: isSwiped ? (canDeleteItems ? 130 : 70) : 0 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                                        className="flex items-center w-full px-3 py-2.5 bg-inherit"
                                      >
                                        <div className="flex-1 font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                          {entity.name}
                                        </div>
                                        <div className="w-20 text-center ar-num text-zinc-500">
                                          {entity.transactionCount}
                                        </div>
                                        <div className="w-28 text-right ar-num text-emerald-600 dark:text-emerald-400 font-semibold">
                                          +{formatCurrency(entity.depositedCents)}
                                        </div>
                                        <div className="w-28 text-right ar-num text-rose-600 dark:text-rose-400 font-semibold">
                                          -{formatCurrency(entity.withdrawnCents)}
                                        </div>
                                        <div className="w-32 text-left ar-num font-bold">
                                          <span className={isPositiveNet ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>
                                            {formatCurrency(entity.netCents)} د.ل
                                          </span>
                                        </div>
                                      </motion.div>
                                    </td>
                                  </motion.tr>
                                )
                              })}
                            </AnimatePresence>
                          </LayoutGroup>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </motion.aside>

          {/* Permanent Delete Confirmation Modal */}
          <DeleteConfirmModal
            open={pendingDelete !== null}
            onClose={() => setPendingDelete(null)}
            onConfirm={handleConfirmDelete}
          />
        </div>
      )}
    </AnimatePresence>
  )
}
