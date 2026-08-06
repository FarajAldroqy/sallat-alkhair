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
  const currentUsername = sessionStorage.getItem('current_username') || 'admin'
  const isAdmin = currentUsername.toLowerCase() === 'admin'

  const permissions = useMemo<string[]>(() => {
    if (isAdmin) return ALL_PERMISSIONS

    const storedUsers = localStorage.getItem('system_users')
    if (storedUsers) {
      try {
        const users: UserAccount[] = JSON.parse(storedUsers)
        const currentUser = users.find(
          (u) => u.username.toLowerCase() === currentUsername.toLowerCase()
        )
        if (currentUser && Array.isArray(currentUser.permissions)) {
          return currentUser.permissions
        }
      } catch (e) {
        console.error('Failed to parse system_users in usePermission', e)
      }
    }

    return []
  }, [currentUsername, isAdmin])

  const hasPermission = (permissionId: SystemPermission | string): boolean => {
    if (isAdmin) return true
    return permissions.includes(permissionId)
  }

  return { permissions, hasPermission, isAdmin }
}
