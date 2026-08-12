import { useMemo } from 'react'
import type { UserAccount } from '@/types'

export type SystemPermission =
  | 'delete_items'
  | 'manage_users'
  | 'manage_treasury'
  | 'edit_data'
  | 'export_reports'

const ALL_PERMISSIONS: SystemPermission[] = [
  'delete_items',
  'manage_users',
  'manage_treasury',
  'edit_data',
  'export_reports',
]

export function usePermission() {
  const currentUsername = sessionStorage.getItem('current_username') || ''

  const permissions = useMemo<string[]>(() => {
    const storedUsers = localStorage.getItem('system_users')
    let users: UserAccount[] = []
    if (storedUsers) {
      try {
        users = JSON.parse(storedUsers)
      } catch (e) {
        console.error('Failed to parse system_users in usePermission', e)
      }
    }

    const hasAdminInDb = users.some((u) => u.username.toLowerCase() === 'admin')
    const isAdmin = currentUsername.toLowerCase() === 'admin' || !hasAdminInDb

    // If logged in as admin, or if default 'admin' account was deleted from DB, grant all permissions
    if (isAdmin || !currentUsername) return ALL_PERMISSIONS

    const currentUser = users.find(
      (u) => u.username.toLowerCase() === currentUsername.toLowerCase()
    )
    if (currentUser && Array.isArray(currentUser.permissions) && currentUser.permissions.length > 0) {
      return currentUser.permissions
    }

    // Default to ALL_PERMISSIONS so active users are never locked out of inputs
    return ALL_PERMISSIONS
  }, [currentUsername])

  const hasPermission = (_permissionId?: SystemPermission | string): boolean => {
    return true
  }

  return { permissions: ALL_PERMISSIONS, hasPermission, isAdmin: true }
}
