import {
  LayoutDashboard,
  Coins,
  User,
  Mail,
  Archive,
  Trash2,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DateFilter } from '@/types'
import { SidebarCalendar } from '@/components/sidebar/SidebarCalendar'
import logoImg from '@/assets/logo.png'

interface NavItem {
  id: string
  label: string
  labelAr: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', labelAr: 'لوحة التحكم', icon: LayoutDashboard },
  { id: 'treasury', label: 'Treasury', labelAr: 'الخزينة    ', icon: Coins },
]

interface SidebarProps {
  activeSection: string
  onNavigate: (id: string) => void
  onOpenUserAudit?: () => void
  dateFilter: DateFilter
  onDateFilterChange: (filter: DateFilter) => void
  isOpen?: boolean
  archivedCount?: number
  onOpenArchive?: () => void
  deletedCount?: number
  onOpenTrash?: () => void
  onOpenSettings?: () => void
  onOpenNotes?: () => void
}

export function Sidebar({
  activeSection,
  onNavigate,
  onOpenUserAudit,
  dateFilter,
  onDateFilterChange,
  isOpen = true,
  archivedCount = 0,
  onOpenArchive,
  deletedCount = 0,
  onOpenTrash,
  onOpenSettings,
  onOpenNotes,
}: SidebarProps) {
  const currentDisplayName = sessionStorage.getItem('current_display_name') || sessionStorage.getItem('current_username') || 'admin'
  const hasArchivedItems = archivedCount > 0
  const hasDeletedItems = deletedCount > 0

  return (
    <aside
      className={cn(
        'bg-white dark:bg-zinc-900 flex flex-col justify-between h-full shrink-0 border-r border-zinc-200/80 dark:border-zinc-800 select-none text-zinc-900 dark:text-zinc-100 transition-all duration-300 ease-in-out overflow-y-auto',
        isOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 border-r-0 pointer-events-none'
      )}
    >
      {/* 1. Header / Logo (سلة الخير) */}
      <div className="flex items-center justify-between px-3.5 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 font-arabic">
          <div className="relative w-14 h-14 bg-white dark:bg-zinc-300 rounded-full border-2 border-black dark:border-white shadow-md flex items-center justify-center shrink-0 overflow-hidden p-0">
            <img
              src={logoImg}
              alt="شعار سلة الخير"
              className="w-full h-full object-cover scale-[1.12]"
              style={{ imageRendering: 'crisp-edges' }}
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none'
              }}
            />
            <span className="absolute text-lg font-black text-emerald-700 font-arabic -z-10">
              س
            </span>
          </div>
          <div className="flex flex-col text-right translate-y-[7px] -mr-1">
            <span className="font-extrabold text-2xl text-zinc-900 dark:text-zinc-100 leading-none tracking-tight">
              سلة الخير
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
              إدارة السيولة والخزينة
            </span>
          </div>
        </div>
      </div>

      {/* Active Logged-In User Button Row (Black in light mode, White in dark mode) */}
      <div className="px-3 pb-3 flex items-center gap-1.5 whitespace-nowrap">
        <button
          id="sidebar-user-audit-btn"
          onClick={onOpenUserAudit}
          className="flex-1 bg-black text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-between shadow-sm transition-all active:scale-[0.98] cursor-pointer font-arabic"
          title="عرض سجل عمليات الأسبوع وسياسة عدم الإنكار"
        >
          <div className="flex items-center gap-2 truncate">
            <div className="w-4 h-4 rounded-full bg-zinc-700 dark:bg-zinc-300 flex items-center justify-center shrink-0">
              <User className="w-3 h-3 text-white dark:text-zinc-900" />
            </div>
            <span className="truncate font-bold text-xs">{currentDisplayName}</span>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="متصل الآن" />
        </button>

        <button
          type="button"
          onClick={onOpenNotes}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all border border-zinc-200 dark:border-zinc-700 relative cursor-pointer active:scale-95 shrink-0"
          title="الملاحظات والمفكرة"
        >
          <Mail className="w-4 h-4" />
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
                'w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer',
                isActive
                  ? 'bg-zinc-100 dark:bg-zinc-800'
                  : 'hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70'
              )}
            >
              {/* RIGHT GROUP (اليمين): الأيقونة والاسم العربي بالبولد */}
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5 text-zinc-700 dark:text-zinc-300 shrink-0" />
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-arabic">
                  {item.labelAr}
                </span>
              </div>

              {/* LEFT GROUP (اليسار): الاسم الإنجليزي */}
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                {item.label}
              </span>
            </button>
          )
        })}

        {/* CONDITIONAL ARCHIVE MENU ITEM (ONLY WHEN hasArchivedItems IS TRUE) */}
        {hasArchivedItems && (
          <button
            onClick={onOpenArchive}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/60 bg-sky-50/40 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40"
          >
            {/* RIGHT GROUP (اليمين): الأيقونة والاسم العربي بالبولد */}
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-sky-500 shrink-0" />
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-arabic">
                الأرشيف
              </span>
            </div>

            {/* LEFT GROUP (اليسار): الاسم الإنجليزي والعداد */}
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
              <span>Archive</span>
              <span className="px-1.5 py-0.2 bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 rounded-full text-[10px] font-bold ar-num">
                {archivedCount}
              </span>
            </span>
          </button>
        )}

        {/* CONDITIONAL TRASH / RECYCLE BIN MENU ITEM (ONLY WHEN hasDeletedItems IS TRUE) */}
        {hasDeletedItems && (
          <button
            onClick={onOpenTrash}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40"
          >
            {/* RIGHT GROUP (اليمين): الأيقونة والاسم العربي بالبولد */}
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-500 shrink-0" />
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-arabic">
                سلة المهملات
              </span>
            </div>

            {/* LEFT GROUP (اليسار): الاسم الإنجليزي والعداد */}
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1">
              <span>Trash</span>
              <span className="px-1.5 py-0.2 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300 rounded-full text-[10px] font-bold ar-num">
                {deletedCount}
              </span>
            </span>
          </button>
        )}

        {/* 3. Calendar Widget directly below menu items */}
        <SidebarCalendar dateFilter={dateFilter} onDateFilterChange={onDateFilterChange} />
      </div>

      {/* 4. Settings Button at the very bottom */}
      <div className="p-3 border-t border-zinc-200/80 dark:border-zinc-800">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
        >
          {/* Right Group: Settings Icon + Bold Text "الإعدادات" */}
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-zinc-700 dark:text-zinc-300 shrink-0" />
            <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 font-arabic">
              الإعدادات
            </span>
          </div>

          {/* Left Group: Small English label "Settings" */}
          <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
            Settings
          </span>
        </button>
      </div>
    </aside>
  )
}
