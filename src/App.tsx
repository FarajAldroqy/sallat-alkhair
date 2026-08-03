import { useState, useEffect, useCallback } from 'react'
import './index.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MetricCards } from '@/components/dashboard/MetricCards'
import { OverviewChart } from '@/components/dashboard/OverviewChart'
import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import type { Stats } from '@/types'
import {
  BarChart2, Users, Settings, Database, FileText, Sparkles,
  HelpCircle, Search, LayoutDashboard,
} from 'lucide-react'

const SECTION_TITLES: Record<string, string> = {
  dashboard:    'Documents',
  transactions: 'Transactions',
  analytics:    'Analytics',
  projects:     'Projects',
  team:         'Team',
  datalibrary:  'Data Library',
  reports:      'Reports',
  assistant:    'Word Assistant',
  more:         'More',
  settings:     'Settings',
  help:         'Get Help',
  search:       'Search',
}

// Placeholder view for secondary sections
function PlaceholderSection({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-32 bg-white">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-100 border border-zinc-200/80">
        <Icon className="w-6 h-6 text-zinc-500" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-400 mt-0.5">Section under development</p>
      </div>
    </div>
  )
}

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchStats = useCallback(async () => {
    if (!window.electronAPI) return
    setStatsLoading(true)
    try {
      const s = await window.electronAPI.getStats()
      setStats(s)
    } catch (err) {
      console.error('Failed to fetch stats', err)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
      case 'transactions':
      case 'lifecycle':
        return (
          <div className="flex flex-col gap-5 p-6 bg-white min-h-full">
            {/* Top Metric Cards (Row 1) */}
            <MetricCards stats={stats} loading={statsLoading} />

            {/* Total Visitors / Overview Wave Chart (Row 2) */}
            <OverviewChart />

            {/* Main Data Table with toolbar (Row 3) */}
            <TransactionsTable
              searchValue={search}
              onStatsRefresh={fetchStats}
            />
          </div>
        )

      case 'analytics':
        return <PlaceholderSection icon={BarChart2} title="Analytics" />
      case 'team':
        return <PlaceholderSection icon={Users} title="Team" />
      case 'datalibrary':
        return <PlaceholderSection icon={Database} title="Data Library" />
      case 'reports':
        return <PlaceholderSection icon={FileText} title="Reports" />
      case 'assistant':
        return <PlaceholderSection icon={Sparkles} title="Word Assistant" />
      case 'settings':
        return <PlaceholderSection icon={Settings} title="Settings" />
      case 'help':
        return <PlaceholderSection icon={HelpCircle} title="Get Help" />
      case 'search':
        return <PlaceholderSection icon={Search} title="Search" />
      default:
        return <PlaceholderSection icon={LayoutDashboard} title={SECTION_TITLES[activeSection] ?? activeSection} />
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-white select-none">
      {/* White Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onQuickCreate={() => setActiveSection('dashboard')}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 bg-white">
        {/* White Top Header */}
        <Header
          searchValue={search}
          onSearchChange={setSearch}
          sectionTitle={SECTION_TITLES[activeSection] ?? 'Documents'}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto bg-white">
          {renderContent()}
        </main>
      </div>
    </div>
  )
}
