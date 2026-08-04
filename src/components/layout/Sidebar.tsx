import {
  LayoutDashboard,
  Coins,
  Plus,
  Mail,
  Building2,
  ChevronDown,
  Archive,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DateFilter } from '@/types'
import { SidebarCalendar } from '@/components/sidebar/SidebarCalendar'

interface NavItem {
  id: string
  label: string
  labelAr: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', labelAr: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'treasury', label: 'Treasury', labelAr: 'الخزينة', icon: Coins },
]

interface SidebarProps {
  activeSection: string
  onNavigate: (id: string) => void
  onQuickCreate?: () => void
  dateFilter: DateFilter
  onDateFilterChange: (filter: DateFilter) => void
  isOpen?: boolean
  archivedCount?: number
  onOpenArchive?: () => void
  deletedCount?: number
  onOpenTrash?: () => void
}

export function Sidebar({
  activeSection,
  onNavigate,
  onQuickCreate,
  dateFilter,
  onDateFilterChange,
  isOpen = true,
  archivedCount = 0,
  onOpenArchive,
  deletedCount = 0,
  onOpenTrash,
}: SidebarProps) {
  const hasArchivedItems = archivedCount > 0
  const hasDeletedItems = deletedCount > 0

  return (
    <aside
      className={cn(
        'bg-white dark:bg-zinc-900 flex flex-col min-h-screen border-r border-zinc-200/80 dark:border-zinc-800 shrink-0 select-none text-zinc-900 dark:text-zinc-100 transition-all duration-300 ease-in-out overflow-hidden',
        isOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 border-r-0 pointer-events-none'
      )}
    >
      {/* 1. Header / Logo (Acme Inc.) */}
      <div className="flex items-center justify-between px-4 py-3.5 whitespace-nowrap">
        <button className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer">
          <Building2 className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
          <span>Acme Inc.</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        </button>
      </div>

      {/* Quick Create Button Row */}
      <div className="px-3 pb-3 flex items-center gap-1.5 whitespace-nowrap">
        <button
          onClick={onQuickCreate}
          className="flex-1 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-2 justify-start shadow-sm transition-all active:scale-[0.98] cursor-pointer"
        >
          <div className="w-4 h-4 rounded-full bg-zinc-700 dark:bg-zinc-300 flex items-center justify-center">
            <Plus className="w-3 h-3 text-white dark:text-zinc-900" />
          </div>
          <span>Quick Create</span>
        </button>

        <button
          className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 transition-colors cursor-pointer"
          title="Inbox"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 2. Main Navigation: Dashboard, Treasury, Archive, & Trash */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto whitespace-nowrap">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id || (item.id === 'dashboard' && activeSection === 'transactions')
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70 hover:text-zinc-900 dark:hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-arabic">{item.labelAr}</span>
            </button>
          )
        })}

        {/* CONDITIONAL ARCHIVE MENU ITEM (ONLY WHEN hasArchivedItems IS TRUE) */}
        {hasArchivedItems && (
          <button
            onClick={onOpenArchive}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/60 bg-sky-50/40 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40"
          >
            <Archive className="w-4 h-4 text-sky-500 shrink-0" />
            <span className="flex-1 text-left font-semibold">Archive</span>
            <span className="flex items-center gap-1.5 text-[11px] font-arabic font-bold">
              <span>الأرشيف</span>
              <span className="px-1.5 py-0.2 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 rounded-full text-[10px] ar-num">
                {archivedCount}
              </span>
            </span>
          </button>
        )}

        {/* CONDITIONAL TRASH / RECYCLE BIN MENU ITEM (ONLY WHEN hasDeletedItems IS TRUE) */}
        {hasDeletedItems && (
          <button
            onClick={onOpenTrash}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40"
          >
            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="flex-1 text-left font-semibold">Recycle Bin</span>
            <span className="flex items-center gap-1.5 text-[11px] font-arabic font-bold">
              <span>سلة المهملات</span>
              <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-full text-[10px] ar-num">
                {deletedCount}
              </span>
            </span>
          </button>
        )}

        {/* 3. Calendar Widget directly below menu items */}
        <SidebarCalendar dateFilter={dateFilter} onDateFilterChange={onDateFilterChange} />
      </div>
    </aside>
  )
}
