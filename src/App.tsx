import { useState, useEffect, useCallback } from 'react'
import './index.css'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { MetricCards } from '@/components/dashboard/MetricCards'
import { OverviewChart } from '@/components/dashboard/OverviewChart'
import { TransactionsTable } from '@/components/dashboard/TransactionsTable'
import { TreasuryView } from '@/components/dashboard/TreasuryView'
import { ArchiveDrawer, EntityBalance } from '@/components/archive/ArchiveDrawer'
import { TrashDrawer } from '@/components/trash/TrashDrawer'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { LoginPage } from '@/components/auth/LoginPage'
import { WelcomeSplash } from '@/components/auth/WelcomeSplash'
import { UserAuditModal } from '@/components/dashboard/UserAuditModal'
import { NotesModal } from '@/components/dashboard/NotesModal'
import type { Stats, DateFilter, Transaction } from '@/types'
import { filterTransactionsByDate } from '@/lib/utils'
import { initAutoBackupListener } from '@/lib/backupManager'
import {
  BarChart2, Users, Settings, Database, FileText, Sparkles,
  HelpCircle, Search, LayoutDashboard,
} from 'lucide-react'

const SECTION_TITLES: Record<string, string> = {
  dashboard:    'Dashboard',
  treasury:     'الخزينة',
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
    <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-32 bg-white dark:bg-zinc-950">
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
        <Icon className="w-6 h-6 text-zinc-500 dark:text-zinc-400" />
      </div>
      <div>
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Section under development</p>
      </div>
    </div>
  )
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('is_logged_in') === 'true'
  })

  useEffect(() => {
    initAutoBackupListener()
  }, [])

  const [activeSection, setActiveSection] = useState('dashboard')
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>({ mode: 'NONE' })
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Archive Drawer & Rows State
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [archivedDashboardRows, setArchivedDashboardRows] = useState<Transaction[]>([])
  const [archivedTreasuryRows, setArchivedTreasuryRows] = useState<EntityBalance[]>([])

  // Trash Drawer & Rows State (Recycle Bin)
  const [isTrashOpen, setIsTrashOpen] = useState(false)
  const [deletedDashboardRows, setDeletedDashboardRows] = useState<Transaction[]>([])
  const [deletedTreasuryRows, setDeletedTreasuryRows] = useState<EntityBalance[]>([])

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // User Audit Modal State (1-Week Non-Repudiation Log)
  const [isUserAuditOpen, setIsUserAuditOpen] = useState(false)

  // Compact Notes Modal State
  const [isNotesOpen, setIsNotesOpen] = useState(false)

  // Animated Welcome Splash State
  const [showSplash, setShowSplash] = useState(false)
  const [splashDisplayName, setSplashDisplayName] = useState('')

  const handleLoginSuccess = () => {
    const name = sessionStorage.getItem('current_display_name') || sessionStorage.getItem('current_username') || 'admin'
    setSplashDisplayName(name)
    setShowSplash(true)
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev)
  }

  const fetchStats = useCallback(async () => {
    if (!window.electronAPI) return
    setStatsLoading(true)
    try {
      const txResult = await window.electronAPI.getTransactions({ page: 1, pageSize: 1000 })
      const rawTxs = txResult.data || []
      const filtered = (dateFilter && dateFilter.mode !== 'NONE')
        ? filterTransactionsByDate(rawTxs, dateFilter)
        : rawTxs

      let dep = 0
      let withd = 0
      const accounts = new Set<string>()
      let depCount = 0
      let withdCount = 0
      let cashDepCount = 0
      let bankDepCount = 0
      let cashWithdCount = 0
      let bankWithdCount = 0

      filtered.forEach((tx) => {
        if (tx.client_name) accounts.add(tx.client_name.trim())
        const isCash = !tx.payment_method || tx.payment_method === 'نقداً'

        if (tx.type === 'DEPOSIT') {
          dep += tx.amount_cents
          depCount += 1
          if (isCash) cashDepCount += 1
          else bankDepCount += 1
        } else {
          withd += tx.amount_cents
          withdCount += 1
          if (isCash) cashWithdCount += 1
          else bankWithdCount += 1
        }
      })

      setStats({
        total_balance_cents: dep - withd,
        total_deposits_cents: dep,
        total_withdrawals_cents: withd,
        active_accounts: accounts.size,
        deposit_count: depCount,
        withdrawal_count: withdCount,
        cash_deposit_count: cashDepCount,
        bank_deposit_count: bankDepCount,
        cash_withdrawal_count: cashWithdCount,
        bank_withdrawal_count: bankWithdCount,
      })
    } catch (err) {
      console.error('Failed to fetch stats', err)
    } finally {
      setStatsLoading(false)
    }
  }, [dateFilter])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // --- Archive Handlers ---
  const handleRestoreDashboardRow = async (id: number) => {
    if (window.electronAPI?.archiveTransaction) {
      await window.electronAPI.archiveTransaction(id)
      await fetchStats()
    }
    setArchivedDashboardRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handlePermanentDeleteDashboardRow = async (id: number) => {
    if (window.electronAPI?.deleteTransaction) {
      await window.electronAPI.deleteTransaction(id)
      await fetchStats()
    }
    setArchivedDashboardRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handleRestoreTreasuryEntity = async (name: string) => {
    setArchivedTreasuryRows((prev) => prev.filter((r) => r.name !== name))
  }

  const handlePermanentDeleteTreasuryEntity = async (name: string) => {
    setArchivedTreasuryRows((prev) => prev.filter((r) => r.name !== name))
  }

  // --- Trash / Soft Delete Handlers ---
  const handleRestoreDashboardTrashRow = async (id: number) => {
    setDeletedDashboardRows((prev) => prev.filter((r) => r.id !== id))
    await fetchStats()
  }

  const handlePermanentDeleteDashboardTrashRow = async (id: number) => {
    if (window.electronAPI?.deleteTransaction) {
      await window.electronAPI.deleteTransaction(id)
      await fetchStats()
    }
    setDeletedDashboardRows((prev) => prev.filter((r) => r.id !== id))
  }

  const handleRestoreTreasuryTrashEntity = async (name: string) => {
    setDeletedTreasuryRows((prev) => prev.filter((r) => r.name !== name))
  }

  const handlePermanentDeleteTreasuryTrashEntity = async (name: string) => {
    setDeletedTreasuryRows((prev) => prev.filter((r) => r.name !== name))
  }

  const totalArchivedCount = archivedDashboardRows.length + archivedTreasuryRows.length
  const totalDeletedCount = deletedDashboardRows.length + deletedTreasuryRows.length

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
      case 'transactions':
      case 'lifecycle':
        return (
          <div className="flex flex-col gap-5 p-6 bg-white dark:bg-zinc-950 min-h-full transition-colors duration-300">
            {/* Top Metric Cards (Row 1) */}
            <MetricCards stats={stats} loading={statsLoading} />

            {/* Total Visitors / Overview Wave Chart (Row 2) */}
            <OverviewChart />

            {/* Main Data Table with toolbar (Row 3) */}
            <TransactionsTable
              searchValue={search}
              onStatsRefresh={fetchStats}
              dateFilter={dateFilter}
              onArchiveRow={(tx) => {
                setArchivedDashboardRows((prev) => [...prev.filter((r) => r.id !== tx.id), tx])
              }}
              onDeleteRow={(tx) => {
                setDeletedDashboardRows((prev) => [...prev.filter((r) => r.id !== tx.id), tx])
              }}
            />
          </div>
        )

      case 'treasury':
        return (
          <TreasuryView
            dateFilter={dateFilter}
            onArchiveEntity={(entity) => {
              setArchivedTreasuryRows((prev) => [...prev.filter((r) => r.name !== entity.name), entity])
            }}
            onDeleteEntity={(entity) => {
              setDeletedTreasuryRows((prev) => [...prev.filter((r) => r.name !== entity.name), entity])
            }}
          />
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

  if (showSplash) {
    return (
      <WelcomeSplash
        displayName={splashDisplayName}
        onComplete={() => {
          setShowSplash(false)
          setIsAuthenticated(true)
        }}
      />
    )
  }

  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none transition-colors duration-300">
      {/* Sidebar with embedded Calendar widget & Conditional Archive/Trash buttons */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onOpenUserAudit={() => setIsUserAuditOpen(true)}
        dateFilter={dateFilter}
        onDateFilterChange={setDateFilter}
        isOpen={isSidebarOpen}
        archivedCount={totalArchivedCount}
        onOpenArchive={() => setIsArchiveOpen(true)}
        deletedCount={totalDeletedCount}
        onOpenTrash={() => setIsTrashOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNotes={() => setIsNotesOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden bg-white dark:bg-zinc-950">
        {/* Top Header with Active Date Filter Badge & Sidebar Toggle */}
        <Header
          searchValue={search}
          onSearchChange={setSearch}
          sectionTitle={SECTION_TITLES[activeSection] ?? 'Dashboard'}
          dateFilter={dateFilter}
          onResetDateFilter={() => setDateFilter({ mode: 'NONE' })}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Scrollable Page Content */}
        <main className="flex-1 h-full overflow-y-auto bg-white dark:bg-zinc-950">
          {renderContent()}
        </main>
      </div>

      {/* Archive Drawer */}
      <ArchiveDrawer
        open={isArchiveOpen}
        onClose={() => setIsArchiveOpen(false)}
        archivedDashboardRows={archivedDashboardRows}
        archivedTreasuryRows={archivedTreasuryRows}
        onRestoreDashboardRow={handleRestoreDashboardRow}
        onPermanentDeleteDashboardRow={handlePermanentDeleteDashboardRow}
        onRestoreTreasuryEntity={handleRestoreTreasuryEntity}
        onPermanentDeleteTreasuryEntity={handlePermanentDeleteTreasuryEntity}
      />

      {/* Trash Drawer (Recycle Bin) */}
      <TrashDrawer
        open={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        deletedDashboardRows={deletedDashboardRows}
        deletedTreasuryRows={deletedTreasuryRows}
        onRestoreDashboardRow={handleRestoreDashboardTrashRow}
        onPermanentDeleteDashboardRow={handlePermanentDeleteDashboardTrashRow}
        onRestoreTreasuryEntity={handleRestoreTreasuryTrashEntity}
        onPermanentDeleteTreasuryEntity={handlePermanentDeleteTreasuryTrashEntity}
      />

      {/* Settings Modal */}
      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onLogout={() => setIsAuthenticated(false)}
      />

      {/* User 1-Week Non-Repudiation Audit Log Modal */}
      <UserAuditModal
        open={isUserAuditOpen}
        onClose={() => setIsUserAuditOpen(false)}
      />

      {/* Compact Notes Modal */}
      <NotesModal
        open={isNotesOpen}
        onClose={() => setIsNotesOpen(false)}
      />
    </div>
  )
}
