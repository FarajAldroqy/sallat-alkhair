import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Coins, Search, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Wallet,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'
import type { Transaction, Stats } from '@/types'

interface EntityBalance {
  name: string
  depositedCents: number
  withdrawnCents: number
  netCents: number
  transactionCount: number
}

export function KryptoniteFishbowl({ totalAmount = "456,851,795.00" }: { totalAmount?: string }) {
  // تنظيف رمز العملة لتجنب التكرار
  const cleanAmount = totalAmount.replace(/د\.ل/g, "").trim();

  return (
    <div className="flex flex-col items-center justify-center my-6 select-none">
      {/* Container الرئيسي مع أنيميشن التكبير عند مرور الماوس (Hover Zoom) */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative w-80 h-80 rounded-full border-[5px] border-white/80 shadow-[inset_0_0_35px_rgba(255,255,255,0.7),0_20px_40px_rgba(16,185,129,0.3)] bg-gradient-to-b from-white/40 via-emerald-50/10 to-emerald-950/50 backdrop-blur-md overflow-hidden cursor-pointer"
      >
        {/* 1. الفوهة العلوية البارزة والعمق الزجاجي الـ 3D */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[75%] h-9 rounded-[100%] border-[3px] border-white/90 bg-gradient-to-b from-white/40 to-transparent shadow-[inset_0_8px_16px_rgba(0,0,0,0.3)] z-30 pointer-events-none" />

        {/* تجويف انعكاس الضوء الداخلي أعلى الماء */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[60%] h-6 rounded-[100%] bg-white/10 blur-[2px] z-20 pointer-events-none" />

        {/* 2. منطقة سائل الكريبتونيت (الجزء السفلي 55%) */}
        <div className="absolute bottom-0 left-0 w-full h-[55%] bg-gradient-to-b from-emerald-500 via-emerald-600 to-emerald-900 z-10">

          {/* --- طبقة الأمواج المتحركة الأولى (Front Wave) --- */}
          <div className="absolute -top-6 left-0 w-[200%] h-8 pointer-events-none overflow-hidden">
            <motion.div
              className="flex w-full h-full"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            >
              <svg viewBox="0 0 600 60" preserveAspectRatio="none" className="w-1/2 h-full fill-emerald-500">
                <path d="M0 20 Q 150 40 300 20 T 600 20 V 60 H 0 Z" />
              </svg>
              <svg viewBox="0 0 600 60" preserveAspectRatio="none" className="w-1/2 h-full fill-emerald-500">
                <path d="M0 20 Q 150 40 300 20 T 600 20 V 60 H 0 Z" />
              </svg>
            </motion.div>
          </div>

          {/* --- طبقة الأمواج المتحركة الثانية (Back Translucent Wave) --- */}
          <div className="absolute -top-5 left-0 w-[200%] h-8 pointer-events-none overflow-hidden opacity-50">
            <motion.div
              className="flex w-full h-full"
              animate={{ x: ["-50%", "0%"] }}
              transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            >
              <svg viewBox="0 0 600 60" preserveAspectRatio="none" className="w-1/2 h-full fill-emerald-300">
                <path d="M0 20 Q 150 0 300 20 T 600 20 V 60 H 0 Z" />
              </svg>
              <svg viewBox="0 0 600 60" preserveAspectRatio="none" className="w-1/2 h-full fill-emerald-300">
                <path d="M0 20 Q 150 0 300 20 T 600 20 V 60 H 0 Z" />
              </svg>
            </motion.div>
          </div>

          {/* فقاعات غازية متصاعدة */}
          <motion.div
            animate={{ y: [20, -50], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="absolute bottom-4 left-1/4 w-2 h-2 rounded-full bg-emerald-200/80 blur-[0.5px]"
          />
          <motion.div
            animate={{ y: [30, -45], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 4.5, delay: 1, ease: "easeInOut" }}
            className="absolute bottom-2 right-1/3 w-3 h-3 rounded-full bg-emerald-100/70 blur-[0.5px]"
          />
        </div>

        {/* 3. الرقم الغارق المائل للطفو (Dead Center) */}
        <motion.div
          className="absolute z-30 top-[60%] inset-x-0 -translate-y-1/2 flex flex-col items-center justify-center text-center w-full px-2 pointer-events-none"
          animate={{ y: [-4, 4, -4] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <span className="text-xs text-emerald-100 font-medium mb-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            إجمالي أصول الخزينة
          </span>
          <div className="flex items-center justify-center gap-1.5 text-white font-extrabold text-2xl sm:text-3xl tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)] ar-num">
            <span>{cleanAmount}</span>
            <span className="text-lg font-bold text-emerald-200">د.ل</span>
          </div>
        </motion.div>

        {/* انعكاس الضوء الكريستالي الخارجي */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-white/30 pointer-events-none z-40" />
      </motion.div>

      {/* ظل الحوض السفلي الـ 3D */}
      <div className="w-52 h-4 bg-emerald-950/20 blur-md rounded-full mt-3" />
    </div>
  );
}

export function TreasuryView() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const loadTreasuryData = useCallback(async () => {
    if (!window.electronAPI) return
    setLoading(true)
    try {
      const [s, txResult] = await Promise.all([
        window.electronAPI.getStats(),
        window.electronAPI.getTransactions({ page: 1, pageSize: 1000 }),
      ])
      setStats(s)
      setTransactions(txResult.data)
    } catch (err) {
      console.error('Failed to load treasury data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTreasuryData()
  }, [loadTreasuryData])

  // Group transactions by entity name (client_name)
  const entityBalances = useMemo(() => {
    const map = new Map<string, EntityBalance>()

    transactions.forEach((tx) => {
      const name = tx.client_name.trim() || 'جهة غير معرفة'
      const existing = map.get(name) || {
        name,
        depositedCents: 0,
        withdrawnCents: 0,
        netCents: 0,
        transactionCount: 0,
      }

      if (tx.type === 'DEPOSIT') {
        existing.depositedCents += tx.amount_cents
      } else if (tx.type === 'WITHDRAWAL') {
        existing.withdrawnCents += tx.amount_cents
      }
      existing.netCents = existing.depositedCents - existing.withdrawnCents
      existing.transactionCount += 1

      map.set(name, existing)
    })

    return Array.from(map.values()).sort((a, b) => Math.abs(b.netCents) - Math.abs(a.netCents))
  }, [transactions])

  // Filtered entity balances based on search query
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entityBalances
    const q = searchQuery.toLowerCase()
    return entityBalances.filter((e) => e.name.toLowerCase().includes(q))
  }, [entityBalances, searchQuery])

  const totalBalanceCents = stats?.total_balance_cents ?? 0
  const totalDepositsCents = stats?.total_deposits_cents ?? 0
  const totalWithdrawalsCents = stats?.total_withdrawals_cents ?? 0

  return (
    <div className="flex flex-col gap-8 p-6 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 min-h-full font-arabic transition-colors duration-300" dir="rtl">
      {/* Top Header Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 shadow-xs">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">خزينة السيولة والمستحقات</h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              متابعة حركة الأصول، السيولة النقدية، وصافي التزامات وحسابات الجهات
            </p>
          </div>
        </div>
      </div>

      {/* CENTERED HERO SECTION: HUGE 3D KRYPTONITE GLASS FISHBOWL */}
      <div className="flex flex-col items-center justify-center py-2 relative">
        {/* Background Ambient Kryptonite Neon Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] bg-emerald-400/20 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* 3D KRYPTONITE FISHBOWL HERO WIDGET */}
        <KryptoniteFishbowl totalAmount={formatCurrency(totalBalanceCents)} />

        {/* 3 SUMMARY METRIC CARDS ROW BELOW FISHBOWL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full mt-4">
          <Card className="subtle-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">إجمالي المودعات</span>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white ar-num">
                {formatCurrency(totalDepositsCents)}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">د.ل</span>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-500" />
              <span>مجموع المبالغ المودعة المسجلة</span>
            </p>
          </Card>

          <Card className="subtle-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">إجمالي المسحوبات</span>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white ar-num">
                {formatCurrency(totalWithdrawalsCents)}
              </span>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">د.ل</span>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-rose-500" />
              <span>مجموع المبالغ المسحوبة الصادرة</span>
            </p>
          </Card>

          <Card className="subtle-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xs transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">عدد الجهات الفعالة</span>
              <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-2xl font-bold text-zinc-900 dark:text-white ar-num">
                {entityBalances.length}
              </span>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">جهة</span>
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              إجمالي المتعاملين ذوي الأرصدة القائمة
            </p>
          </Card>
        </div>
      </div>

      {/* Bottom Section: Entity Balances Table (جدول المستحقات للجهات) */}
      <Card className="subtle-card rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-0 shadow-xs overflow-hidden transition-colors">
        {/* Table Header Controls */}
        <div className="p-4 border-b border-zinc-200/80 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">جدول المستحقات للجهات</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              ملخص إجمالي الإيداعات، السحوبات، وصافي الحساب لكل جهة يتعامل معها النظام
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="البحث باسم الجهة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pr-9 pl-3 text-xs bg-white dark:bg-zinc-800/90 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-900 dark:focus-visible:ring-zinc-500 font-arabic"
            />
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table dir="rtl">
              <TableHeader>
                <TableRow className="bg-zinc-50 dark:bg-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 border-b border-zinc-200/80 dark:border-zinc-800">
                  <TableHead className="text-xs font-bold text-zinc-700 dark:text-zinc-300 text-right py-3 font-arabic">
                    اسم الجهة
                  </TableHead>
                  <TableHead className="text-xs font-bold text-zinc-700 dark:text-zinc-300 text-center py-3 font-arabic w-32">
                    عدد المعاملات
                  </TableHead>
                  <TableHead className="text-xs font-bold text-zinc-700 dark:text-zinc-300 text-right py-3 font-arabic w-44">
                    إجمالي المودعات
                  </TableHead>
                  <TableHead className="text-xs font-bold text-zinc-700 dark:text-zinc-300 text-right py-3 font-arabic w-44">
                    إجمالي المسحوبات
                  </TableHead>
                  <TableHead className="text-xs font-bold text-zinc-700 dark:text-zinc-300 text-right py-3 font-arabic w-48">
                    صافي الحساب
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-b border-zinc-200/40 dark:border-zinc-800/40">
                      <TableCell colSpan={5} className="py-3 px-4">
                        <div className="h-4 w-full bg-zinc-200/50 dark:bg-zinc-800/50 rounded animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredEntities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-xs text-zinc-400 dark:text-zinc-500 font-arabic font-medium">
                      لا توجد نتائج مطابقة للبحث
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntities.map((entity) => {
                    const isPositiveNet = entity.netCents >= 0
                    return (
                      <TableRow
                        key={entity.name}
                        className="border-b border-zinc-200/60 dark:border-zinc-800/60 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        {/* Entity Name */}
                        <TableCell className="py-3 px-4 font-arabic">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                            {entity.name}
                          </span>
                        </TableCell>

                        {/* Transaction Count */}
                        <TableCell className="py-3 px-4 text-center font-arabic ar-num">
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {entity.transactionCount} معاملة
                          </span>
                        </TableCell>

                        {/* Total Deposited */}
                        <TableCell className="py-3 px-4 text-right font-arabic ar-num">
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            +{formatCurrency(entity.depositedCents)} د.ل
                          </span>
                        </TableCell>

                        {/* Total Withdrawn */}
                        <TableCell className="py-3 px-4 text-right font-arabic ar-num">
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                            -{formatCurrency(entity.withdrawnCents)} د.ل
                          </span>
                        </TableCell>

                        {/* Net Balance */}
                        <TableCell className="py-3 px-4 text-right font-arabic ar-num">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-md inline-block border ${isPositiveNet
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}>
                            {isPositiveNet ? '+' : ''}{formatCurrency(entity.netCents)} د.ل
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
