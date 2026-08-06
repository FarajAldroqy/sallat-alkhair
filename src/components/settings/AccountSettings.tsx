import { useState, useEffect } from 'react'
import {
  User, Lock, Eye, EyeOff, KeyRound, Plus, Trash2, Check,
  LogOut, AlertCircle, Copy, CheckCircle2, Shield
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { UserAccount } from '@/types'
import { usePermission } from '@/hooks/usePermission'
import { logUserAction } from '@/lib/auditLogger'

interface AccountSettingsProps {
  onLogout: () => void
}

const DEFAULT_USER: UserAccount = {
  id: '1',
  username: 'admin',
  password: 'admin',
  permissions: ['delete_items', 'manage_users', 'manage_treasury', 'edit_data', 'export_reports'],
  recoveryKeys: ['KEY-101', 'KEY-102', 'KEY-103', 'KEY-104', 'KEY-105'],
}

const PERMISSION_OPTIONS = [
  { id: 'delete_items', label: 'حذف العناصر والعمليات' },
  { id: 'manage_users', label: 'إدارة المستخدمين والتعديل عليهم' },
  { id: 'manage_treasury', label: 'الوصول والتعديل على الخزينة' },
  { id: 'edit_data', label: 'إضافة وتعديل البيانات' },
  { id: 'export_reports', label: 'تصدير واستيراد التقارير' },
]

export function AccountSettings({ onLogout }: AccountSettingsProps) {
  const { hasPermission } = usePermission()
  const canManageUsers = hasPermission('manage_users')

  // 1. Storage Helper
  const getStoredUsers = (): UserAccount[] => {
    const stored = localStorage.getItem('system_users')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch (e) {
        console.error('Failed to parse system_users', e)
      }
    }
    localStorage.setItem('system_users', JSON.stringify([DEFAULT_USER]))
    return [DEFAULT_USER]
  }

  const [users, setUsers] = useState<UserAccount[]>(getStoredUsers)
  const currentUsername = sessionStorage.getItem('current_username') || 'admin'

  // Current Logged-in User Account
  const currentUser = users.find((u) => u.username === currentUsername) || users[0] || DEFAULT_USER

  // Section A State: Edit Profile
  const [usernameInput, setUsernameInput] = useState(currentUser.username)
  const [displayNameInput, setDisplayNameInput] = useState(currentUser.displayName || '')
  const [passwordInput, setPasswordInput] = useState(currentUser.password || 'admin')
  const [showPassword, setShowPassword] = useState(false)
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('')

  // Section B State: Recovery Keys
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [keysSuccessMsg, setKeysSuccessMsg] = useState('')

  // Section C State: Add New User Modal
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPermissions, setNewPermissions] = useState<string[]>([
    'delete_items', 'manage_treasury', 'edit_data'
  ])
  const [addUserError, setAddUserError] = useState('')

  // Sync profile form inputs if active user changes
  useEffect(() => {
    if (currentUser) {
      setUsernameInput(currentUser.username)
      setDisplayNameInput(currentUser.displayName || '')
      setPasswordInput(currentUser.password || 'admin')
    }
  }, [currentUser])

  // Save users array to localStorage
  const saveUsersToStorage = (updatedUsers: UserAccount[]) => {
    setUsers(updatedUsers)
    localStorage.setItem('system_users', JSON.stringify(updatedUsers))
  }

  // --- SECTION A: Save Profile Changes ---
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSuccessMsg('')

    if (!usernameInput.trim() || !passwordInput.trim()) return

    const trimmedDisplay = displayNameInput.trim()
    const updatedUsers = users.map((u) => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          username: usernameInput.trim(),
          displayName: trimmedDisplay,
          password: passwordInput.trim(),
        }
      }
      return u
    })

    saveUsersToStorage(updatedUsers)
    sessionStorage.setItem('current_username', usernameInput.trim())
    sessionStorage.setItem('current_display_name', trimmedDisplay || usernameInput.trim())
    setProfileSuccessMsg('تم حفظ البيانات وتحديث الاسم المعروض وكلمة السر بنجاح')
    setTimeout(() => setProfileSuccessMsg(''), 3000)
  }

  // --- SECTION B: Generate 5 New Recovery Keys ---
  const handleGenerateNewKeys = () => {
    const newKeys = Array.from({ length: 5 }, () => {
      const rand = Math.floor(1000 + Math.random() * 9000)
      return `SK-${rand}`
    })

    const updatedUsers = users.map((u) => {
      if (u.id === currentUser.id) {
        return { ...u, recoveryKeys: newKeys }
      }
      return u
    })

    saveUsersToStorage(updatedUsers)
    localStorage.setItem('recovery_keys', JSON.stringify(newKeys))
    setKeysSuccessMsg('تم إنشاء 5 مفاتيح جديدة وتحديث مفاتيح الاستعادة بنجاح')
    setTimeout(() => setKeysSuccessMsg(''), 3000)
  }

  const handleCopyKey = (keyText: string, index: number) => {
    navigator.clipboard.writeText(keyText)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  // --- SECTION C: Add & Delete Accounts ---
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    setAddUserError('')

    if (!canManageUsers) {
      setAddUserError('عفواً، لا تملك صلاحية إدارة المستخدمين والتعديل عليهم')
      return
    }

    if (!newUsername.trim() || !newPassword.trim()) {
      setAddUserError('يرجى كتابة اسم المستخدم وكلمة السر')
      return
    }

    if (users.some((u) => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      setAddUserError('اسم المستخدم موجود بالفعل، يرجى اختيار اسم آخر')
      return
    }

    const newUser: UserAccount = {
      id: Date.now().toString(),
      username: newUsername.trim(),
      displayName: newDisplayName.trim(),
      password: newPassword.trim(),
      permissions: newPermissions,
      recoveryKeys: ['KEY-201', 'KEY-202', 'KEY-203', 'KEY-204', 'KEY-205'],
    }

    logUserAction('ADD_USER', 'المستخدمين', 'إضافة مستخدم جديد للنظام', `اسم المستخدم: ${newUser.username}`)
    saveUsersToStorage([...users, newUser])
    setNewUsername('')
    setNewDisplayName('')
    setNewPassword('')
    setNewPermissions(['delete_items', 'manage_treasury', 'edit_data'])
    setIsAddUserOpen(false)
  }

  const handleDeleteUser = (userId: string) => {
    if (!canManageUsers) {
      alert('عفواً، لا تملك صلاحية إدارة المستخدمين والتعديل عليهم')
      return
    }

    if (users.length <= 1) {
      alert('لا يمكن حذف الحساب الوحيد في المنظومة')
      return
    }

    const targetUser = users.find((u) => u.id === userId)
    if (targetUser?.username === currentUsername) {
      alert('لا يمكنك حذف الحساب النشط حالياً الذي تستخدمه لتسجيل الدخول')
      return
    }
    
    if (targetUser && targetUser.username.toLowerCase() === 'admin') {
      alert('لا يمكن حذف حساب المسؤول الرئيسي admin')
      return
    }

    if (confirm(`هل أنت تأكد من رغبتك في حذف الحساب (${targetUser?.username})؟`)) {
      if (targetUser) {
        logUserAction('DELETE_USER', 'المستخدمين', 'حذف حساب مستخدم من المنظومة', `اسم المستخدم: ${targetUser.username}`)
      }
      const updated = users.filter((u) => u.id !== userId)
      saveUsersToStorage(updated)
    }
  }

  const togglePermission = (permId: string) => {
    setNewPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    )
  }

  // --- SECTION D: Logout ---
  const handleLogoutAction = () => {
    sessionStorage.clear()
    onLogout()
  }

  return (
    <div className="space-y-6 select-none font-arabic text-right">
      
      {/* SECTION A: CURRENT USER PROFILE & CREDENTIALS */}
      <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400">
            <User className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
              بيانات الحساب الشخصي
            </h3>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              تعديل اسم المستخدم وكلمة السر للحساب الحالي
            </p>
          </div>
        </div>

        {profileSuccessMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profileSuccessMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-3 pt-1">
          <div className="flex flex-col space-y-3">
            {/* Display Name */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                الاسم المستعار
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 absolute right-3 text-emerald-500 pointer-events-none" />
                <input
                  type="text"
                  value={displayNameInput}
                  onChange={(e) => setDisplayNameInput(e.target.value)}
                  placeholder="أدخل الاسم المستعار"
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                اسم المستخدم
              </label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 absolute right-3 text-zinc-400 pointer-events-none" />
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  required
                  className="w-full pr-9 pl-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                كلمة السر
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute right-3 text-zinc-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  required
                  className="w-full pr-9 pl-9 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute left-2.5 p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-black text-white dark:bg-white dark:text-black font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              حفظ التغييرات
            </button>
          </div>
        </form>
      </div>

      {/* SECTION B: RECOVERY KEYS MANAGEMENT */}
      <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 text-sky-600 dark:text-sky-400">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                مفاتيح الاستعادة الطارئة
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                تستخدم لاستعادة الحساب والدخول عند نسيان كلمة السر
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 ar-num">
            المفاتيح المتبقية: {currentUser.recoveryKeys?.length || 0} / 5
          </span>
        </div>

        {keysSuccessMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{keysSuccessMsg}</span>
          </div>
        )}

        {/* Keys List */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-1">
          {currentUser.recoveryKeys?.map((k, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
            >
              <span className="font-mono text-xs font-bold text-zinc-800 dark:text-zinc-200 tracking-wider">
                {k}
              </span>
              <button
                onClick={() => handleCopyKey(k, idx)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="نسخ المفتاح"
              >
                {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={handleGenerateNewKeys}
            className="px-3.5 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>تحديث وإنشاء 5 مفاتيح جديدة</span>
          </button>
        </div>
      </div>

      {/* SECTION C: SYSTEM ACCOUNTS CONTROL */}
      <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                إدارة حسابات وصلاحيات المنظومة
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                إضافة وحذف الحسابات وتحديد الصلاحيات المتاحة بكل مستخدم
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddUserOpen(true)}
            disabled={!canManageUsers}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 ${
              !canManageUsers
                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 cursor-pointer shadow-xs'
            }`}
            title={!canManageUsers ? 'لا تملك صلاحية إدارة المستخدمين والتعديل عليهم' : undefined}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حساب جديد</span>
          </button>
        </div>

        {/* Users Accounts List Table / Cards */}
        <div className="space-y-2 pt-1">
          {users.map((u) => {
            const isSelf = u.username === currentUsername
            const isOnlyUser = users.length === 1

            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-700 dark:text-zinc-300">
                    {u.username.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                        {u.username}
                      </span>
                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold">
                          الحساب الحالي
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {u.permissions?.map((p) => (
                        <span
                          key={p}
                          className="px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[9px] font-medium"
                        >
                          {PERMISSION_OPTIONS.find((opt) => opt.id === p)?.label || p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteUser(u.id)}
                  disabled={isOnlyUser || isSelf || !canManageUsers}
                  className={`p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    isOnlyUser || isSelf || !canManageUsers
                      ? 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
                      : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
                  }`}
                  title={
                    !canManageUsers
                      ? 'لا تملك صلاحية إدارة المستخدمين'
                      : isOnlyUser
                      ? 'لا يمكن حذف الحساب الوحيد في المنظومة'
                      : isSelf
                      ? 'لا يمكنك حذف حسابك الحالي النشط'
                      : 'حذف الحساب'
                  }
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECTION D: LOGOUT */}
      <div className="pt-2">
        <button
          onClick={handleLogoutAction}
          className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج من المنظومة</span>
        </button>
      </div>

      {/* SUB-MODAL: ADD NEW USER */}
      <AnimatePresence>
        {isAddUserOpen && (
          <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                    إنشاء حساب جديد
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    إدخال اسم المستخدم، كلمة السر، وتعيين الصلاحيات المتاحة
                  </p>
                </div>
              </div>

              {addUserError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{addUserError}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    الاسم المستعار
                  </label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="أدخل الاسم المستعار"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    اسم المستخدم
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="مثال: accountant_libya"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    كلمة السر
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    صلاحيات الحساب في المنظومة:
                  </label>
                  <div className="space-y-1.5 bg-zinc-50/50 dark:bg-zinc-950 p-2.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                    {PERMISSION_OPTIONS.map((opt) => {
                      const isChecked = newPermissions.includes(opt.id)
                      return (
                        <label
                          key={opt.id}
                          onClick={() => togglePermission(opt.id)}
                          className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>{opt.label}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors cursor-pointer"
                  >
                    إنشاء الحساب الآن
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddUserOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
