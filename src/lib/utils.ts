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

/** Filter transactions array by DateFilter mode (NONE, MONTH, DAY, RANGE) */
export function filterTransactionsByDate<T extends { created_at: string }>(
  items: T[],
  filter?: { mode: string; year?: number; month?: number; date?: Date; from?: Date; to?: Date }
): T[] {
  if (!filter || filter.mode === 'NONE') return items

  return items.filter((tx) => {
    const txDate = new Date(tx.created_at)
    if (isNaN(txDate.getTime())) return true

    if (filter.mode === 'MONTH' && filter.year !== undefined && filter.month !== undefined) {
      return txDate.getFullYear() === filter.year && txDate.getMonth() === filter.month
    }

    if (filter.mode === 'DAY' && filter.date) {
      const d = filter.date
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

