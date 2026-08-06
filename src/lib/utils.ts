import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format amount_cents into Libyan Dinar string ("د.ل") */
export function formatCurrency(cents: number, _locale = 'ar-LY'): string {
  const amount = cents / 100
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
  return `${formatted} د.ل`
}

/** Convert Eastern Arabic (٠-٩) and Persian (۰-۹) numerals into standard Western (0-9) digits */
export function normalizeArabicNumerals(input: string): string {
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

  return input
    .replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString())
    .replace(/[۰-۹]/g, (w) => persianDigits.indexOf(w).toString())
}

/** Format date into Arabic/Standard date string */
export function formatDate(dateStr: string, locale = 'ar-LY'): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr))
  } catch {
    return dateStr
  }
}

/** Short number formatter for metric cards with Libyan Dinar ("د.ل") */
export function formatShort(cents: number): string {
  const amount = cents / 100
  if (amount >= 1_000_000) {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(amount / 1_000_000)}M د.ل`
  }
  if (amount >= 1_000) {
    return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(amount / 1_000)}K د.ل`
  }
  return formatCurrency(cents)
}

/** Filter transactions array by DateFilter mode (NONE, YEAR, MONTH, DAY, RANGE) */
export function filterTransactionsByDate<T extends { created_at: string }>(
  items: T[],
  filter?: { mode: string; year?: number | string; month?: number | string; date?: Date | string; from?: Date | string; to?: Date | string }
): T[] {
  if (!filter || filter.mode === 'NONE') return items

  return items.filter((tx) => {
    const txDate = new Date(tx.created_at)
    if (isNaN(txDate.getTime())) return true

    if (filter.mode === 'YEAR' && filter.year !== undefined && filter.year !== null) {
      return txDate.getFullYear() === Number(filter.year)
    }

    if (filter.mode === 'MONTH' && filter.year !== undefined && filter.month !== undefined && filter.year !== null && filter.month !== null) {
      return (
        txDate.getFullYear() === Number(filter.year) &&
        txDate.getMonth() === Number(filter.month)
      )
    }

    if (filter.mode === 'DAY' && filter.date) {
      const d = new Date(filter.date)
      if (isNaN(d.getTime())) return true
      return (
        txDate.getFullYear() === d.getFullYear() &&
        txDate.getMonth() === d.getMonth() &&
        txDate.getDate() === d.getDate()
      )
    }

    if (filter.mode === 'RANGE' && filter.from && filter.to) {
      const start = new Date(filter.from).setHours(0, 0, 0, 0)
      const end = new Date(filter.to).setHours(23, 59, 59, 999)
      const txTime = txDate.getTime()
      return txTime >= start && txTime <= end
    }

    return true
  })
}

/** Helper to format DateFilter into clean Arabic text string */
export function getDateFilterText(filter?: any): string {
  if (!filter || filter.mode === 'NONE') {
    return 'تقرير شامل لجميع الفترات'
  }

  if (filter.mode === 'YEAR' && filter.year) {
    return `الفترة: سنة ${filter.year}`
  }

  if (filter.mode === 'MONTH' && filter.year !== undefined && filter.month !== undefined) {
    const monthsList = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
    ]
    return `الفترة: شهر ${monthsList[filter.month]} ${filter.year}`
  }

  if (filter.mode === 'DAY' && filter.date) {
    try {
      const d = new Date(filter.date)
      const formatted = new Intl.DateTimeFormat('ar-LY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).format(d)
      return `الفترة: يوم ${formatted}`
    } catch {
      return 'تقرير يومي'
    }
  }

  if (filter.mode === 'RANGE' && filter.from && filter.to) {
    try {
      const fromStr = new Intl.DateTimeFormat('ar-LY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(filter.from))

      const toStr = new Intl.DateTimeFormat('ar-LY', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(new Date(filter.to))

      return `الفترة: من ${fromStr} إلى ${toStr}`
    } catch {
      return 'تقرير فترة محددة'
    }
  }

  return 'تقرير شامل لجميع الفترات'
}

