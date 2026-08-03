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
