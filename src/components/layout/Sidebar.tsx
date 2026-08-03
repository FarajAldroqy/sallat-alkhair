import {
  LayoutDashboard,
  RefreshCw,
  BarChart2,
  FolderKanban,
  Users,
  Database,
  FileText,
  Sparkles,
  MoreHorizontal,
  Settings,
  HelpCircle,
  Search,
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
  badge?: number
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard',     label: 'Dashboard',     labelAr: 'لوحة التحكم',  icon: LayoutDashboard },
  { id: 'lifecycle',     label: 'Lifecycle',     labelAr: 'المعاملات',    icon: RefreshCw, badge: 3 },
  { id: 'analytics',     label: 'Analytics',     labelAr: 'التحليلات',    icon: BarChart2 },
  { id: 'projects',      label: 'Projects',      labelAr: 'المشاريع',     icon: FolderKanban },
  { id: 'team',          label: 'Team',          labelAr: 'الفريق',       icon: Users },
]

const documentNavItems: NavItem[] = [
  { id: 'datalibrary',   label: 'Data Library',   labelAr: 'مكتبة البيانات', icon: Database },
  { id: 'reports',       label: 'Reports',        labelAr: 'التقارير',       icon: FileText },
  { id: 'assistant',     label: 'Word Assistant', labelAr: 'مساعد النصوص',  icon: Sparkles },
  { id: 'more',          label: 'More',           labelAr: 'المزيد',         icon: MoreHorizontal },
]

const bottomNavItems: NavItem[] = [
  { id: 'settings',      label: 'Settings',       labelAr: 'الإعدادات',      icon: Settings },
  { id: 'help',          label: 'Get Help',       labelAr: 'المساعدة',       icon: HelpCircle },
  { id: 'search',        label: 'Search',         labelAr: 'البحث',          icon: Search },
]

interface SidebarProps {
  activeSection: string
  onNavigate: (id: string) => void
  onQuickCreate?: () => void
}

export function Sidebar({ activeSection, onNavigate, onQuickCreate }: SidebarProps) {
  return (
    <aside className="bg-white flex flex-col w-60 min-h-screen border-r border-zinc-200/80 shrink-0 select-none text-zinc-900">
      {/* Workspace Header */}
      <div className="flex items-center justify-between px-4 py-3.5">
        <button className="flex items-center gap-2 text-sm font-semibold text-zinc-900 hover:text-zinc-700 transition-colors">
          <Building2 className="w-4 h-4 text-zinc-800" />
          <span>Acme Inc.</span>
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>

      {/* Quick Create Button Row */}
      <div className="px-3 pb-4 flex items-center gap-1.5">
        <button
          onClick={onQuickCreate}
          className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-2 justify-start shadow-sm transition-all active:scale-[0.98]"
        >
          <div className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center">
            <Plus className="w-3 h-3 text-white" />
          </div>
          <span>Quick Create</span>
        </button>

        <button
          className="w-8 h-8 rounded-lg border border-zinc-200 hover:bg-zinc-100 flex items-center justify-center text-zinc-600 transition-colors"
          title="Inbox"
        >
          <Mail className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 space-y-5 overflow-y-auto">
        {/* Section 1 */}
        <div className="space-y-0.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id || (item.id === 'lifecycle' && activeSection === 'transactions')
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id === 'lifecycle' ? 'transactions' : item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900'
                )}
              >
                <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge != null && (
                  <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 text-[10px] font-semibold flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Section 2: Documents */}
        <div className="space-y-0.5">
          <p className="px-2.5 text-[11px] font-medium text-zinc-400 mb-1">
            Documents
          </p>
          {documentNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-100 text-zinc-900 font-semibold'
                    : 'text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900'
                )}
              >
                <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom Section */}
      <div className="px-3 py-3 border-t border-zinc-200/60 space-y-0.5">
        {bottomNavItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-zinc-100 text-zinc-900 font-semibold'
                  : 'text-zinc-600 hover:bg-zinc-100/70 hover:text-zinc-900'
              )}
            >
              <Icon className="w-4 h-4 text-zinc-500 shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
