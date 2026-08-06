import { Sidebar as SidebarIcon, Search, Calendar as CalendarIcon, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  if (dateFilter && dateFilter.mode === 'YEAR') {
    filterText = `كامل سنة ${dateFilter.year}`
  } else if (dateFilter && dateFilter.mode === 'MONTH') {
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

        <span className="text-sm font-bold font-arabic text-zinc-900 dark:text-zinc-100">
          {sectionTitle === 'Dashboard' || !sectionTitle ? 'لوحة التحكم' : sectionTitle}
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

      {/* Right side: Dark Mode Toggle & Search */}
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
      </div>
    </header>
  )
}
