import { useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Vault, ShieldCheck, Layers, Coins, Landmark } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Stats } from '@/types'

export type PaymentCategory = 'ALL' | 'CASH' | 'BANK'

interface MetricCardsProps {
  stats: Stats | null
  loading: boolean
  selectedCategory?: PaymentCategory
  onSelectCategory?: (category: PaymentCategory) => void
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <Card className={`subtle-card rounded-2xl p-5 shadow-xs border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 animate-pulse ${className || ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-28 rounded-md bg-zinc-200 dark:bg-zinc-800" />
        <div className="h-9 w-9 rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
      <div className="h-8 w-36 rounded-lg bg-zinc-200 dark:bg-zinc-800 mb-4" />
      <div className="h-4 w-32 rounded-md bg-zinc-200/60 dark:bg-zinc-800/60" />
    </Card>
  )
}

const DEFAULT_STATS: Stats = {
  total_balance_cents: 0,
  total_deposits_cents: 0,
  total_withdrawals_cents: 0,
  active_accounts: 0,
  deposit_count: 0,
  withdrawal_count: 0,
  cash_deposit_count: 0,
  bank_deposit_count: 0,
  cash_withdrawal_count: 0,
  bank_withdrawal_count: 0,
  cash_balance_cents: 0,
  cash_deposits_cents: 0,
  cash_withdrawals_cents: 0,
  bank_balance_cents: 0,
  bank_deposits_cents: 0,
  bank_withdrawals_cents: 0,
}

export function MetricCards({ stats, loading, selectedCategory, onSelectCategory }: MetricCardsProps) {
  const [internalCategory, setInternalCategory] = useState<PaymentCategory>('ALL')
  const activeCat = selectedCategory ?? internalCategory

  const handleSelectCategory = (cat: PaymentCategory) => {
    setInternalCategory(cat)
    onSelectCategory?.(cat)
  }

  if (loading && !stats) {
    return (
      <div className="space-y-2.5 font-arabic" dir="rtl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-0">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard className="col-span-1 sm:col-span-2 lg:col-span-2" />
        </div>
      </div>
    )
  }

  const currentStats = stats || DEFAULT_STATS

  // Dynamically calculate metrics based on the active category
  let displayWithdrawals = currentStats.total_withdrawals_cents
  let displayDeposits = currentStats.total_deposits_cents
  let displayBalance = currentStats.total_balance_cents
  let displayCount = currentStats.deposit_count + currentStats.withdrawal_count

  let withdrawalsTitle = 'مجموع السحوبات'
  let withdrawalsSubtitle = 'إجمالي المبالغ المسحوبة بالكامل'
  let depositsTitle = 'مجموع الإيداعات'
  let depositsSubtitle = 'إجمالي المقبوضات والمودعات بالكامل'
  let treasuryTitle = 'القيمة الحالية للخزينة'
  let treasuryBadge = 'السيولة المتاحة'
  let treasurySubtitle = 'الصافي المباشر المتوفر بالخزينة (الإيداعات - المصروفات)'
  let countLabel = `${displayCount} عملية مسجلة`

  if (activeCat === 'CASH') {
    displayWithdrawals = currentStats.cash_withdrawals_cents ?? 0
    displayDeposits = currentStats.cash_deposits_cents ?? 0
    displayBalance = currentStats.cash_balance_cents ?? (displayDeposits - displayWithdrawals)
    const cDepCount = currentStats.cash_deposit_count ?? 0
    const cWithdCount = currentStats.cash_withdrawal_count ?? 0
    displayCount = cDepCount + cWithdCount

    withdrawalsTitle = 'سحوبات نقداً'
    withdrawalsSubtitle = 'إجمالي المصروفات النقدية المسحوبة (كاش)'
    depositsTitle = 'إيداعات نقداً'
    depositsSubtitle = 'إجمالي المقبوضات النقدية المودعة (كاش)'
    treasuryTitle = 'الرصيد النقدي بالخزينة'
    treasuryBadge = 'نقدية الخزينة (كاش)'
    treasurySubtitle = 'الصافي النقدي الفعلي المتوفر بخزينة الكاش'
    countLabel = `${displayCount} عملية نقدية`
  } else if (activeCat === 'BANK') {
    displayWithdrawals = currentStats.bank_withdrawals_cents ?? 0
    displayDeposits = currentStats.bank_deposits_cents ?? 0
    displayBalance = currentStats.bank_balance_cents ?? (displayDeposits - displayWithdrawals)
    const bDepCount = currentStats.bank_deposit_count ?? 0
    const bWithdCount = currentStats.bank_withdrawal_count ?? 0
    displayCount = bDepCount + bWithdCount

    withdrawalsTitle = 'سحوبات بنك'
    withdrawalsSubtitle = 'إجمالي التحويلات والمصروفات المصرفية'
    depositsTitle = 'إيداعات بنك'
    depositsSubtitle = 'إجمالي التحويلات والمقبوضات المصرفية'
    treasuryTitle = 'الرصيد المتاح بالحساب المصرفي'
    treasuryBadge = 'الأرصدة المصرفية (بنك)'
    treasurySubtitle = 'الصافي المتوفر في الحسابات المصرفية بالبنك'
    countLabel = `${displayCount} عملية مصرفية`
  }

  const isPositive = displayBalance >= 0

  return (
    <div className="font-arabic space-y-2.5" dir="rtl">
      {/* Category selector row: بنك | نقداً | الكل */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            تصنيف العمليات:
          </span>
          <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
            {activeCat === 'ALL'
              ? 'عرض الكل (نقداً + بنك)'
              : activeCat === 'CASH'
              ? 'التعاملات النقدية فقط (كاش)'
              : 'التعاملات المصرفية فقط (بنك)'}
          </span>
        </div>

        {/* 3 Options: الكل | نقداً | بنك */}
        <div
          id="metric-category-selector"
          className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => handleSelectCategory('ALL')}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCat === 'ALL'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>الكل</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectCategory('CASH')}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCat === 'CASH'
                ? 'bg-emerald-600 text-white shadow-xs dark:bg-emerald-600'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>نقداً</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectCategory('BANK')}
            className={`flex items-center gap-1.5 px-3.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeCat === 'BANK'
                ? 'bg-blue-600 text-white shadow-xs dark:bg-blue-600'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>بنك</span>
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-0">
        {/* CARD 1: WITHDRAWALS */}
        <Card
          id="metric-total-withdrawals"
          className="subtle-card rounded-2xl p-5 shadow-xs border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/90 hover:border-rose-300 dark:hover:border-rose-800 transition-all group"
        >
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
                {withdrawalsTitle}
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            <div className="text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400 mb-3 ar-num">
              {formatCurrency(displayWithdrawals)}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              <span>{withdrawalsSubtitle}</span>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: DEPOSITS */}
        <Card
          id="metric-total-deposits"
          className="subtle-card rounded-2xl p-5 shadow-xs border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#0d1322] hover:border-cyan-400 dark:hover:border-cyan-600 transition-all group"
        >
          <CardContent className="p-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                {depositsTitle}
              </span>
              <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 border border-cyan-200 dark:border-cyan-800/80 flex items-center justify-center text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition-transform">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            <div className="text-2xl font-black tracking-tight text-cyan-600 dark:text-cyan-400 mb-3 ar-num">
              {formatCurrency(displayDeposits)}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <span>{depositsSubtitle}</span>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3 & 4 (FEATURED): TREASURY / BALANCE */}
        <Card
          id="metric-treasury-balance"
          className={`col-span-1 sm:col-span-2 lg:col-span-2 relative overflow-hidden rounded-2xl p-5 shadow-xs border transition-all group ${
            activeCat === 'BANK'
              ? 'border-blue-200/90 dark:border-blue-800/60 bg-gradient-to-br from-white via-white to-blue-50/40 dark:from-zinc-900/95 dark:via-zinc-900/90 dark:to-blue-950/25 border-r-4 border-r-blue-500 dark:border-r-blue-400 hover:border-blue-300 dark:hover:border-blue-500/60'
              : 'border-emerald-200/90 dark:border-emerald-800/60 bg-gradient-to-br from-white via-white to-emerald-50/40 dark:from-zinc-900/95 dark:via-zinc-900/90 dark:to-emerald-950/25 border-r-4 border-r-emerald-500 dark:border-r-emerald-400 hover:border-emerald-300 dark:hover:border-emerald-500/60'
          }`}
        >
          {/* Subtle Watermark Motif */}
          {activeCat === 'BANK' ? (
            <Landmark className="absolute -left-3 -bottom-3 w-28 h-28 text-blue-600/5 dark:text-blue-400/5 pointer-events-none transition-transform group-hover:scale-105 duration-300" />
          ) : (
            <Vault className="absolute -left-3 -bottom-3 w-28 h-28 text-emerald-600/5 dark:text-emerald-400/5 pointer-events-none transition-transform group-hover:scale-105 duration-300" />
          )}

          <CardContent className="p-0 relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {treasuryTitle}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  activeCat === 'BANK'
                    ? 'bg-blue-100/70 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300/60 dark:border-blue-800/80'
                    : 'bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300/60 dark:border-emerald-800/80'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    activeCat === 'BANK'
                      ? 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]'
                      : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                  }`} />
                  {treasuryBadge}
                </span>
              </div>

              {/* Distinctive Icon */}
              <div
                className={`w-9 h-9 rounded-xl border flex items-center justify-center group-hover:scale-105 transition-transform shadow-xs shrink-0 ${
                  activeCat === 'BANK'
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200/80 dark:border-blue-800/80 text-blue-600 dark:text-blue-400'
                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200/80 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400'
                }`}
                title={treasuryTitle}
              >
                {activeCat === 'BANK' ? (
                  <Landmark className="w-5 h-5 stroke-[2.2]" />
                ) : (
                  <Vault className="w-5 h-5 stroke-[2.2]" />
                )}
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2.5">
              <span className={`text-2xl sm:text-3xl font-black tracking-tight ar-num ${
                isPositive
                  ? activeCat === 'BANK' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {formatCurrency(displayBalance)}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-zinc-400 dark:text-zinc-500">
                د.ل
              </span>
            </div>

            {/* Bottom quick details row */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-xs flex-wrap gap-2">
              <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-medium flex items-center gap-1.5">
                <ShieldCheck className={`w-3.5 h-3.5 shrink-0 ${activeCat === 'BANK' ? 'text-blue-500 dark:text-blue-400' : 'text-emerald-500 dark:text-emerald-400'}`} />
                <span>{treasurySubtitle}</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/90 text-zinc-600 dark:text-zinc-300 border border-zinc-200/70 dark:border-zinc-700/80 text-[10px] font-bold font-mono ar-num">
                {countLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
