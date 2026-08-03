import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { ChartDataPoint } from '@/types'

// Mock fallback data for demo if backend is empty
function generateFallbackData(timeframe: '7d' | '30d' | '3m'): ChartDataPoint[] {
  const count = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 45
  const result: ChartDataPoint[] = []
  const now = new Date()

  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)

    const dateKey = d.toISOString().slice(0, 10)
    const dateLabel = new Intl.DateTimeFormat('ar-LY', { day: 'numeric', month: 'short' }).format(d)

    // Generate smooth wave pattern
    const baseWave = Math.sin((count - i) * 0.4) * 1200 + 2500
    const subWave = Math.cos((count - i) * 0.8) * 600
    const deposits = Math.max(500, Math.round(baseWave + subWave))
    const withdrawals = Math.max(200, Math.round(deposits * 0.45 + Math.sin((count - i) * 0.6) * 400))

    result.push({
      date: dateKey,
      dateLabel,
      deposits,
      withdrawals,
      deposits_cents: deposits * 100,
      withdrawals_cents: withdrawals * 100,
    })
  }

  return result
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    dataKey: string
    name: string
    value: number
    color: string
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null

  const depositsVal = payload.find((p) => p.dataKey === 'deposits')?.value ?? 0
  const withdrawalsVal = payload.find((p) => p.dataKey === 'withdrawals')?.value ?? 0

  return (
    <div className="bg-white/95 backdrop-blur-md border border-zinc-200/90 rounded-xl p-3 shadow-xl text-right font-arabic text-xs space-y-2 min-w-40 z-50">
      {/* Date Header */}
      <p className="font-bold text-zinc-900 border-b border-zinc-100 pb-1 text-center font-sans ar-num">
        {label}
      </p>

      {/* Deposits Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-900" />
          <span className="text-zinc-600 font-medium">الإيداعات</span>
        </div>
        <span className="font-bold text-emerald-600 ar-num font-sans" dir="ltr">
          +{formatCurrency(Math.round(depositsVal * 100))}
        </span>
      </div>

      {/* Withdrawals Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-zinc-400" />
          <span className="text-zinc-600 font-medium">المسحوبات</span>
        </div>
        <span className="font-bold text-rose-600 ar-num font-sans" dir="ltr">
          -{formatCurrency(Math.round(withdrawalsVal * 100))}
        </span>
      </div>
    </div>
  )
}

export function OverviewChart() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '3m'>('3m')
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [loading, setLoading] = useState(false)

  const fetchChartData = useCallback(async () => {
    setLoading(true)
    try {
      if (window.electronAPI?.getChartData) {
        const res = await window.electronAPI.getChartData({ timeframe })
        if (res && res.length > 0 && res.some((r) => r.deposits > 0 || r.withdrawals > 0)) {
          setChartData(res)
        } else {
          setChartData(generateFallbackData(timeframe))
        }
      } else {
        setChartData(generateFallbackData(timeframe))
      }
    } catch {
      setChartData(generateFallbackData(timeframe))
    } finally {
      setLoading(false)
    }
  }, [timeframe])

  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])

  return (
    <Card className="subtle-card rounded-xl p-5 shadow-none border border-zinc-200/80 bg-white" dir="rtl">
      <CardContent className="p-0 space-y-4">
        {/* Header row matching specifications */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-right">
            <h3 className="text-base font-bold text-zinc-900 font-arabic">
              التحليلات المالية
            </h3>
            <p className="text-xs text-zinc-400 font-arabic mt-0.5">
              نظرة عامة على الإيداعات والمسحوبات خلال الفترة المحددة
            </p>
          </div>

          {/* Timeframe pill selector buttons */}
          <div className="flex items-center p-0.5 rounded-lg bg-zinc-100/80 border border-zinc-200/60 self-start sm:self-auto font-arabic">
            <button
              onClick={() => setTimeframe('3m')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                timeframe === '3m'
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/80'
                  : 'text-zinc-500 hover:text-zinc-900 font-medium'
              }`}
            >
              آخر 3 أشهر
            </button>
            <button
              onClick={() => setTimeframe('30d')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                timeframe === '30d'
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/80'
                  : 'text-zinc-500 hover:text-zinc-900 font-medium'
              }`}
            >
              آخر 30 يومًا
            </button>
            <button
              onClick={() => setTimeframe('7d')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                timeframe === '7d'
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200/80'
                  : 'text-zinc-500 hover:text-zinc-900 font-medium'
              }`}
            >
              آخر 7 أيام
            </button>
          </div>
        </div>

        {/* Recharts AreaChart Wave Container */}
        <div className="w-full pt-3 h-52 relative">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center text-xs text-zinc-400 font-arabic">
              جاري تحديث الرسوم البيانية...
            </div>
          )}

          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 5, left: 5, bottom: 0 }}
            >
              <defs>
                {/* Gradient for Deposits Curve (Top Stream) */}
                <linearGradient id="fillDeposits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#18181b" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#71717a" stopOpacity={0.03} />
                </linearGradient>

                {/* Gradient for Withdrawals Curve (Bottom Stream) */}
                <linearGradient id="fillWithdrawals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#71717a" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              {/* X Axis date labels */}
              <XAxis
                dataKey="dateLabel"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#a1a1aa' }}
                interval="preserveStartEnd"
                dy={6}
              />

              {/* Interactive Custom Arabic Tooltip */}
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: '#e4e4e7',
                  strokeWidth: 1,
                  strokeDasharray: '4 4',
                }}
              />

              {/* Area Stream 1: Deposits (الإيداعات) */}
              <Area
                type="monotone"
                dataKey="deposits"
                name="الإيداعات"
                stroke="#18181b"
                strokeWidth={2}
                fill="url(#fillDeposits)"
                isAnimationActive={true}
                animationDuration={750}
                animationEasing="ease-in-out"
                activeDot={{
                  r: 4.5,
                  fill: '#18181b',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />

              {/* Area Stream 2: Withdrawals (المسحوبات) */}
              <Area
                type="monotone"
                dataKey="withdrawals"
                name="المسحوبات"
                stroke="#71717a"
                strokeWidth={1.5}
                fill="url(#fillWithdrawals)"
                isAnimationActive={true}
                animationDuration={750}
                animationEasing="ease-in-out"
                activeDot={{
                  r: 4.5,
                  fill: '#52525b',
                  stroke: '#ffffff',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
