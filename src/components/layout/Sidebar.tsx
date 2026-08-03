import {
  LayoutDashboard,
  Coins,
  Plus,
  Mail,
  Building2,
  ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
}

export function Sidebar({ activeSection, onNavigate, onQuickCreate }: SidebarProps) {
  return (
    <aside className="bg-white dark:bg-zinc-900 flex flex-col w-60 min-h-screen border-r border-zinc-200/80 dark:border-zinc-800 shrink-0 select-none text-zinc-900 dark:text-zinc-100 transition-colors duration-300">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <button className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors">
          <Building2 className="w-4 h-4 text-zinc-800 dark:text-zinc-200" />
          <span>Acme Inc.</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
        </button>
      </div>

      {/* Quick Create Button Row */}
      <div className="px-3 pb-4 flex items-center gap-1.5">
        <button
          onClick={onQuickCreate}
          className="flex-1 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-2 justify-start shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="w-4 h-4 rounded-full bg-zinc-700 dark:bg-zinc-300 flex items-center justify-center">
            <Plus className="w-3 h-3 text-white dark:text-zinc-900" />
          </div>
          <span>Quick Create</span>
        </button>

        <button
          className="w-8 h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 transition-colors"
          title="Inbox"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Navigation (Dashboard & Treasury ONLY) */}
      <div className="flex-1 px-3 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id || (item.id === 'dashboard' && activeSection === 'transactions')
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-colors',
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
      </div>
    </aside>
  )
}
