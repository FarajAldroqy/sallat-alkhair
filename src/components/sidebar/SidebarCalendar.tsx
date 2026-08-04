import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, RotateCcw, Calendar as CalendarIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DateFilter } from '@/types'

interface SidebarCalendarProps {
  dateFilter: DateFilter
  onDateFilterChange: (filter: DateFilter) => void
}

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
]

const MONTH_EN_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const WEEKDAY_NAMES_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

export function SidebarCalendar({ dateFilter, onDateFilterChange }: SidebarCalendarProps) {
  // View date state for navigating month/year
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (dateFilter.mode === 'DAY') return new Date(dateFilter.date)
    if (dateFilter.mode === 'MONTH') return new Date(dateFilter.year, dateFilter.month, 1)
    if (dateFilter.mode === 'RANGE') return new Date(dateFilter.from)
    return new Date()
  })

  // Pending start date for cross-month range selection
  const [pendingFromDate, setPendingFromDate] = useState<Date | null>(null)
  // Hovered day for prospective range preview
  const [hoverDate, setHoverDate] = useState<Date | null>(null)

  // Sync view date if filter changes externally or resets
  useEffect(() => {
    if (dateFilter.mode === 'DAY') {
      setViewDate(new Date(dateFilter.date))
      setPendingFromDate(new Date(dateFilter.date))
    } else if (dateFilter.mode === 'MONTH') {
      setViewDate(new Date(dateFilter.year, dateFilter.month, 1))
      setPendingFromDate(null)
    } else if (dateFilter.mode === 'RANGE') {
      setViewDate(new Date(dateFilter.from))
      setPendingFromDate(null)
    } else if (dateFilter.mode === 'NONE') {
      setViewDate(new Date())
      setPendingFromDate(null)
    }
  }, [dateFilter])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() // 0-11

  // Arrow navigation MUST ONLY update viewDate, preserving range selection!
  const handlePrevMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleSelectMonth = () => {
    setPendingFromDate(null)
    onDateFilterChange({ mode: 'MONTH', year, month })
  }

  const handleSelectDay = (dayNum: number, event: React.MouseEvent) => {
    const clickedDate = new Date(year, month, dayNum)

    if (event.shiftKey || pendingFromDate !== null) {
      // Range selection mode across months
      const anchor = pendingFromDate ?? (dateFilter.mode === 'DAY' ? dateFilter.date : clickedDate)
      let from = anchor
      let to = clickedDate

      if (clickedDate < anchor) {
        from = clickedDate
        to = anchor
      }

      if (isSameDay(from, to)) {
        onDateFilterChange({ mode: 'DAY', date: from })
        setPendingFromDate(from)
      } else {
        onDateFilterChange({ mode: 'RANGE', from, to })
        setPendingFromDate(null)
      }
    } else {
      // Single day / First range click mode
      onDateFilterChange({ mode: 'DAY', date: clickedDate })
      setPendingFromDate(clickedDate)
    }
  }

  const handleResetFilter = () => {
    setViewDate(new Date())
    setPendingFromDate(null)
    setHoverDate(null)
    onDateFilterChange({ mode: 'NONE' })
  }

  // Days calculations
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  // Active filter text label
  let filterBadgeLabel = ''
  if (dateFilter.mode === 'MONTH') {
    filterBadgeLabel = `${MONTH_NAMES_AR[dateFilter.month]} ${dateFilter.year}`
  } else if (dateFilter.mode === 'DAY') {
    const d = dateFilter.date
    filterBadgeLabel = `${d.getDate()} ${MONTH_NAMES_AR[d.getMonth()]} ${d.getFullYear()}`
  } else if (dateFilter.mode === 'RANGE') {
    const f = dateFilter.from
    const t = dateFilter.to
    filterBadgeLabel = `من: ${f.getDate()} ${MONTH_NAMES_AR[f.getMonth()]} إلى: ${t.getDate()} ${MONTH_NAMES_AR[t.getMonth()]} ${t.getFullYear()}`
  }

  return (
    <div className="mt-2.5 p-2 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 transition-colors select-none">
      {/* Month & Year Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          onClick={handlePrevMonth}
          className="p-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="الشهر السابق"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={handleSelectMonth}
          className={`text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
            dateFilter.mode === 'MONTH' && dateFilter.year === year && dateFilter.month === month
              ? 'bg-zinc-100 dark:bg-zinc-800 font-bold text-emerald-600 dark:text-emerald-400'
              : ''
          }`}
          title="فلترة حسب هذا الشهر"
        >
          {MONTH_EN_FULL[month]} {year}
        </button>

        <button
          onClick={handleNextMonth}
          className="p-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="الشهر التالي"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAY_NAMES_EN.map((day) => (
          <span key={day} className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div
        className="grid grid-cols-7 gap-y-1 gap-x-0 text-center"
        onMouseLeave={() => setHoverDate(null)}
      >
        {/* Previous Month Days */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => {
          const prevDay = daysInPrevMonth - firstDayOfWeek + i + 1
          return (
            <div
              key={`prev-${i}`}
              className="h-7 text-xs flex items-center justify-center text-zinc-300 dark:text-zinc-700 pointer-events-none"
            >
              {prevDay}
            </div>
          )
        })}

        {/* Current Month Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const isToday = isCurrentMonth && today.getDate() === dayNum
          const dayDate = new Date(year, month, dayNum)
          const currentDayTime = new Date(year, month, dayNum, 0, 0, 0, 0).getTime()

          let isSelectedDay = false
          let isRangeStart = false
          let isRangeEnd = false
          let isRangeBetween = false

          if (dateFilter.mode === 'DAY') {
            isSelectedDay = isSameDay(dateFilter.date, dayDate)
          } else if (dateFilter.mode === 'RANGE') {
            const fromTime = new Date(dateFilter.from).setHours(0, 0, 0, 0)
            const toTime = new Date(dateFilter.to).setHours(23, 59, 59, 999)

            const isFrom = isSameDay(dateFilter.from, dayDate)
            const isTo = isSameDay(dateFilter.to, dayDate)

            if (isFrom && isTo) {
              isSelectedDay = true
            } else if (isFrom) {
              isRangeStart = true
            } else if (isTo) {
              isRangeEnd = true
            } else if (currentDayTime >= fromTime && currentDayTime <= toTime) {
              isRangeBetween = true
            }
          }

          // Prospective Hover Range Highlighting
          if (pendingFromDate !== null && hoverDate !== null && dateFilter.mode !== 'RANGE') {
            let pFrom = pendingFromDate
            let pTo = hoverDate
            if (hoverDate < pendingFromDate) {
              pFrom = hoverDate
              pTo = pendingFromDate
            }
            const pFromTime = new Date(pFrom).setHours(0, 0, 0, 0)
            const pToTime = new Date(pTo).setHours(23, 59, 59, 999)

            if (currentDayTime >= pFromTime && currentDayTime <= pToTime) {
              if (isSameDay(dayDate, pFrom)) isRangeStart = true
              else if (isSameDay(dayDate, pTo)) isRangeEnd = true
              else isRangeBetween = true
            }
          }

          let dayClasses = 'h-7 text-xs flex items-center justify-center font-medium transition-all cursor-pointer '

          if (isSelectedDay) {
            dayClasses += 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold rounded-lg shadow-xs'
          } else if (isRangeStart) {
            dayClasses += 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold rounded-l-lg shadow-xs'
          } else if (isRangeEnd) {
            dayClasses += 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-bold shadow-xs rounded-r-lg'
          } else if (isRangeBetween) {
            dayClasses += 'bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold rounded-none'
          } else if (isToday) {
            dayClasses += 'border border-zinc-400 dark:border-zinc-500 text-zinc-900 dark:text-zinc-100 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg'
          } else {
            dayClasses += 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg'
          }

          return (
            <button
              key={`day-${dayNum}`}
              onClick={(e) => handleSelectDay(dayNum, e)}
              onMouseEnter={() => setHoverDate(dayDate)}
              className={dayClasses}
              title="انقر لتحديد بداية المجال، وانتقل بين الأشهر لتحديد النهاية"
            >
              {dayNum}
            </button>
          )
        })}
      </div>

      {/* Clear Filter / Active Badge Footer */}
      <AnimatePresence>
        {dateFilter.mode !== 'NONE' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-2.5 border-t border-zinc-200/60 dark:border-zinc-800 flex flex-col gap-1.5"
          >
            <div className="flex flex-col gap-0.5 text-[11px] font-arabic">
              <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-emerald-500" />
                <span>نطاق الفلترة:</span>
              </span>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 ar-num text-right leading-relaxed">
                {filterBadgeLabel}
              </span>
            </div>

            <button
              onClick={handleResetFilter}
              className="w-full py-1.5 px-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold font-arabic flex items-center justify-center gap-1.5 transition-colors border border-rose-200/80 dark:border-rose-900/60 cursor-pointer mt-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إلغاء الفلترة ✕</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
