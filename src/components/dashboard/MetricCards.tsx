import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import type { Stats } from '@/types'

interface MetricCardsProps {
  stats: Stats | null
  loading: boolean
}

interface MetricDef {
  id: string
  title: string
  getValue: (s: Stats) => string
  trendBadge: string
  isPositive: boolean
  trendTitle: string
  trendSubtext: string
}

function getMetrics(s: Stats | null): MetricDef[] {
  if (!s) return []
  return [
    {
      id: 'total-revenue',
      title: 'Total Revenue',
      getValue: (st) => formatCurrency(st.total_balance_cents, 'en-US'),
      trendBadge: '+12.5%',
      isPositive: true,
      trendTitle: 'Trending up this month',
      trendSubtext: 'Visitors for the last 6 months',
    },
    {
      id: 'total-deposits',
      title: 'Total Deposits',
      getValue: (st) => formatCurrency(st.total_deposits_cents, 'en-US'),
      trendBadge: '+8.2%',
      isPositive: true,
      trendTitle: 'Down 20% this period',
      trendSubtext: 'Acquisition needs attention',
    },
    {
      id: 'active-accounts',
      title: 'Active Accounts',
      getValue: (st) => new Intl.NumberFormat('en-US').format(st.active_accounts),
      trendBadge: '+12.5%',
      isPositive: true,
      trendTitle: 'Strong user retention',
      trendSubtext: 'Engagement exceed targets',
    },
    {
      id: 'growth-rate',
      title: 'Growth Rate',
      getValue: (st) => {
        const dep = st.total_deposits_cents
        const withd = st.total_withdrawals_cents
        const rate = dep > 0 ? (((dep - withd) / dep) * 100).toFixed(1) : '4.5'
        return `${rate}%`
      },
      trendBadge: '+4.5%',
      isPositive: true,
      trendTitle: 'Steady performance increase',
      trendSubtext: 'Meets growth projections',
    },
  ]
}

function SkeletonCard() {
  return (
    <Card className="subtle-card rounded-xl p-5 shadow-none border-zinc-200/80 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="h-3.5 w-24 rounded bg-zinc-200" />
        <div className="h-5 w-14 rounded-full bg-zinc-200" />
      </div>
      <div className="h-7 w-32 rounded bg-zinc-200 mb-4" />
      <div className="h-3 w-28 rounded bg-zinc-200 mb-1" />
      <div className="h-3 w-36 rounded bg-zinc-200/60" />
    </Card>
  )
}

export function MetricCards({ stats, loading }: MetricCardsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  const metricList = getMetrics(stats)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricList.map((m) => {
        const TrendIcon = m.isPositive ? ArrowUpRight : ArrowDownRight
        const TrendTitleIcon = m.isPositive ? TrendingUp : TrendingDown

        return (
          <Card
            key={m.id}
            id={`metric-${m.id}`}
            className="subtle-card rounded-xl p-5 shadow-none border border-zinc-200/80 hover:border-zinc-300 transition-all"
          >
            <CardContent className="p-0">
              {/* Header row: Title + Percentage Pill */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-zinc-500">
                  {m.title}
                </span>
                <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-zinc-100 border border-zinc-200/80 text-[11px] font-semibold text-zinc-700">
                  <TrendIcon className="w-3 h-3 text-zinc-600" />
                  <span>{m.trendBadge}</span>
                </div>
              </div>

              {/* Main value */}
              <div className="text-2xl font-bold tracking-tight text-zinc-900 mb-3 font-sans">
                {m.getValue(stats)}
              </div>

              {/* Bottom trend & description */}
              <div className="space-y-0.5">
                <div className="flex items-center gap-1 text-xs font-medium text-zinc-800">
                  <span>{m.trendTitle}</span>
                  <TrendTitleIcon className="w-3 h-3 text-zinc-600" />
                </div>
                <p className="text-[11px] text-zinc-400 font-normal">
                  {m.trendSubtext}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
