import { Sidebar as SidebarIcon, Search, User, Calendar as CalendarIcon, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'
import type { DateFilter } from '@/types'

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

interface HeaderProps {
  searchValue: string
  onSearchChange: (v: string) => void
  sectionTitle: string
  dateFilter?: DateFilter
  onResetDateFilter?: () => void
  onToggleSidebar?: () => void
}

export function Header({
  searchValue,
  onSearchChange,
  sectionTitle,
  dateFilter,
  onResetDateFilter,
  onToggleSidebar,
}: HeaderProps) {
  let filterText = ''
  if (dateFilter && dateFilter.mode === 'MONTH') {
    filterText = `${MONTH_NAMES_AR[dateFilter.month]} ${dateFilter.year}`
  } else if (dateFilter && dateFilter.mode === 'DAY') {
    const d = dateFilter.date
    filterText = `${d.getDate()} ${MONTH_NAMES_AR[d.getMonth()]} ${d.getFullYear()}`
  } else if (dateFilter && dateFilter.mode === 'RANGE') {
    const f = dateFilter.from
    const t = dateFilter.to
    filterText = `${f.getDate()} ${MONTH_NAMES_AR[f.getMonth()]} - ${t.getDate()} ${MONTH_NAMES_AR[t.getMonth()]} ${t.getFullYear()}`
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 h-13 border-b border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-colors duration-300">
      {/* Left side: Panel icon + Dynamic Title + Active Filter Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="إخفاء / إظهار القائمة الجانبية"
        >
          <SidebarIcon className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {sectionTitle || 'Dashboard'}
        </span>

        {/* Active Filter Indicator Badge */}
        {dateFilter && dateFilter.mode !== 'NONE' && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 text-xs font-arabic text-emerald-800 dark:text-emerald-300">
            <CalendarIcon className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold ar-num">{filterText}</span>
            {onResetDateFilter && (
              <button
                onClick={onResetDateFilter}
                className="hover:bg-emerald-200/60 dark:hover:bg-emerald-900 rounded-full p-0.5 transition-colors cursor-pointer"
                title="إلغاء الفلترة"
              >
                <X className="w-3 h-3 text-emerald-700 dark:text-emerald-300" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Right side: Dark Mode Toggle, GitHub link, search & user profile */}
      <div className="flex items-center gap-3.5">
        {/* Dark Mode Toggle Button */}
        <DarkModeToggle />

        {/* Search */}
        <div className="relative hidden md:block w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          <Input
            id="header-search"
            placeholder="Search..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-8 bg-zinc-50 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-xs text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-lg focus-visible:ring-1 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500"
          />
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5 fill-current text-zinc-700 dark:text-zinc-300" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>GitHub</span>
        </a>

        {/* User avatar */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 focus:outline-none cursor-pointer">
              <Avatar className="w-6 h-6 border border-zinc-200 dark:border-zinc-700">
                <AvatarFallback className="text-[10px] bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-semibold">
                  FA
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100">
            <DropdownMenuLabel className="text-xs text-zinc-700 dark:text-zinc-300">Faraj Ali</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
            <DropdownMenuItem className="text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 gap-2 cursor-pointer">
              <User className="w-3.5 h-3.5" /> Profile
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
