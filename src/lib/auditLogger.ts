export interface SystemAuditLogEntry {
  id: string
  username: string
  actionType: string
  category: 'مالية' | 'سلة المهملات والأرشيف' | 'الخزينة والجهات' | 'تقارير وطباعة' | 'المستخدمين' | 'نظام'
  title: string
  details?: string
  timestamp: string
}

const STORAGE_KEY = 'system_audit_logs'

/** Records a system user audit log entry with non-repudiation timestamp */
export function logUserAction(
  actionType: string,
  category: SystemAuditLogEntry['category'],
  title: string,
  details?: string
) {
  try {
    const currentUsername = sessionStorage.getItem('current_username') || 'admin'
    const newEntry: SystemAuditLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      username: currentUsername,
      actionType,
      category,
      title,
      details,
      timestamp: new Date().toISOString(),
    }

    const existingStr = localStorage.getItem(STORAGE_KEY)
    const existing: SystemAuditLogEntry[] = existingStr ? JSON.parse(existingStr) : []

    // Keep logs for up to 14 days to enforce strict 1-week reset view
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const filtered = existing.filter((e) => new Date(e.timestamp) >= fourteenDaysAgo)

    filtered.unshift(newEntry)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (err) {
    console.error('Failed to record audit log entry:', err)
  }
}

/** Fetches stored audit logs from localStorage */
export function getSystemAuditLogs(): SystemAuditLogEntry[] {
  try {
    const existingStr = localStorage.getItem(STORAGE_KEY)
    return existingStr ? JSON.parse(existingStr) : []
  } catch {
    return []
  }
}
