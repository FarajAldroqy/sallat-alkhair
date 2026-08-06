import { useState, useEffect, useRef } from 'react'
import {
  ShieldCheck, Download, Upload, RotateCcw, Trash2, Plus,
  AlertTriangle, Clock, HardDrive, CheckCircle2,
} from 'lucide-react'
import {
  getRollingBackups, createBackup, deleteBackupItem,
  decryptPayload, restoreSystemState, RollingBackupItem, BackupPayload,
  collectSystemPayload, encryptPayload
} from '@/lib/backupManager'
import { formatDate } from '@/lib/utils'
import { logUserAction } from '@/lib/auditLogger'
import { playClickSound, playDeleteSound } from '@/lib/soundEffects'

export function DataManagementSettings() {
  const [backups, setBackups] = useState<RollingBackupItem[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<{
    item?: RollingBackupItem
    payload: BackupPayload
  } | null>(null)

  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reloadBackups = () => {
    setBackups(getRollingBackups().reverse()) // Show latest first
  }

  useEffect(() => {
    reloadBackups()
  }, [])

  // Manual Backup Creation Trigger
  const handleManualBackup = async () => {
    setLoading(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      playClickSound()
      const newItem = await createBackup('MANUAL')
      logUserAction('BACKUP_CREATE', 'نظام', 'إنشاء نسخة احتياطية يدوية جديدة', `ملف: ${newItem.filename}`)
      setSuccessMsg('تم إنشاء النسخة الاحتياطية بنجاح وحفظها في السجل')
      reloadBackups()
    } catch (err: any) {
      setErrorMsg(`حدث خطأ أثناء حفظ النسخة: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Delete Backup Version
  const handleDeleteBackup = (item: RollingBackupItem) => {
    if (!confirm(`هل أنت تأكد من حذف النسخة الاحتياطية (${item.filename})؟`)) return
    playDeleteSound()
    deleteBackupItem(item.id)
    logUserAction('BACKUP_DELETE', 'نظام', 'حذف نسخة احتياطية من السجل', `ملف: ${item.filename}`)
    reloadBackups()
  }

  // Export Specific Backup File (.enc)
  const handleExportBackup = (item: RollingBackupItem) => {
    playClickSound()
    const blob = new Blob([item.encryptedData], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.filename
    a.click()
    URL.revokeObjectURL(url)
    logUserAction('BACKUP_EXPORT', 'نظام', 'تصدير ملف نسخة احتياطية مشفرة', `ملف: ${item.filename}`)
  }

  // Export Current Full System Backup Now
  const handleExportCurrent = async () => {
    setLoading(true)
    try {
      playClickSound()
      const payload = await collectSystemPayload()
      const encrypted = await encryptPayload(payload)
      const d = new Date()
      const filename = `salla_backup_${d.toISOString().slice(0, 10)}.enc`

      const blob = new Blob([encrypted], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      logUserAction('BACKUP_EXPORT', 'نظام', 'تصدير نسخة مشفرة كاملة من المنظومة', `ملف: ${filename}`)
    } catch (err: any) {
      setErrorMsg(`فشل التصدير: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // Request Restore from Rolling Item
  const handleRequestRestore = async (item: RollingBackupItem) => {
    setErrorMsg('')
    setSuccessMsg('')
    try {
      playClickSound()
      const payload = await decryptPayload(item.encryptedData)
      setSelectedBackupForRestore({ item, payload })
    } catch (err: any) {
      setErrorMsg(err.message)
    }
  }

  // Request Restore from Uploaded External (.enc) File
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const text = await file.text()
      const payload = await decryptPayload(text)
      setSelectedBackupForRestore({
        item: {
          id: 'imported',
          filename: file.name,
          timestamp: payload.timestamp || new Date().toISOString(),
          sizeBytes: file.size,
          encryptedData: text,
          type: 'MANUAL',
        },
        payload,
      })
    } catch (err: any) {
      setErrorMsg(err.message)
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Execute Confirmed System Restoration
  const handleExecuteRestore = async () => {
    if (!selectedBackupForRestore) return
    setLoading(true)
    try {
      logUserAction('SYSTEM_RESTORE', 'نظام', 'استرجاع واستبدال بيانات المنظومة بالكامل', `تاريخ النسخة: ${selectedBackupForRestore.payload.timestamp}`)
      await restoreSystemState(selectedBackupForRestore.payload)
    } catch (err: any) {
      setErrorMsg(`فشل الاسترجاع: ${err.message}`)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 font-arabic select-none text-zinc-900 dark:text-zinc-100" dir="rtl">
      {/* Header Info Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              نظام النسخ الاحتياطي التلقائي والمشفر (AES-256)
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              يحتفظ النظام تلقائياً بآخر 7 نسخ احتياطية عند الخروج لحماية البيانات من الضياع
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualBackup}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>نسخة احتياطية الآن</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Export & Import Action Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Export Card */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">تصدير ملف النسخة الحالية</div>
              <div className="text-[10px] text-zinc-400">تحميل ملف مشفر (.enc) للحفظ خارجيًا</div>
            </div>
          </div>
          <button
            onClick={handleExportCurrent}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-xs font-bold text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            تصدير (.enc)
          </button>
        </div>

        {/* Import Card */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Upload className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">استيراد ملف نسخة خارجية</div>
              <div className="text-[10px] text-zinc-400">استرجاع بيانات من ملف (.enc) جديد</div>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".enc,.json"
            onChange={handleFileImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900 text-xs font-bold text-sky-700 dark:text-sky-300 transition-colors cursor-pointer"
          >
            استيراد ملف
          </button>
        </div>
      </div>

      {/* Rolling 7 Backups List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-emerald-500" />
            <span>سجل النسخ التلقائية واليدوية (الحد الأقصى 7 نسخ)</span>
          </h3>
          <span className="text-[10px] font-bold text-zinc-500 ar-num">
            {backups.length} من أصل 7 نسخ محفوظة
          </span>
        </div>

        {backups.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-400">
            لا توجد نسخ احتياطية محفوظة حالياً في السجل
          </div>
        ) : (
          <div className="space-y-2">
            {backups.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono dir-ltr">
                        {item.filename}
                      </span>
                      <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold ${
                        item.type === 'AUTO'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                          : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                      }`}>
                        {item.type === 'AUTO' ? 'تلقائي النظام' : 'إنشاء يدوي'}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex items-center gap-3 ar-num">
                      <span>تاريخ الحفظ: {formatDate(item.timestamp)}</span>
                      <span>الحجم: {(item.sizeBytes / 1024).toFixed(1)} ك.بايل</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRequestRestore(item)}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold flex items-center gap-1 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all cursor-pointer active:scale-95 shadow-xs"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>استرجاع</span>
                  </button>

                  <button
                    onClick={() => handleExportBackup(item)}
                    className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title="تنزيل الملف"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDeleteBackup(item)}
                    className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors cursor-pointer"
                    title="حذف النسخة"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RESTORATION CONFIRMATION MODAL */}
      {selectedBackupForRestore && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-5 text-right font-arabic">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">تأكيد استرجاع النسخة الاحتياطية</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">تحذير أمان واستبدال البيانات</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 space-y-2">
              <p className="font-bold">هل أنت متأكد من استرجاع البيانات التالية؟</p>
              <p className="text-[11px] leading-relaxed">
                سيتم استبدال جميع بيانات المنظومة الحالية بالكامل بالبيانات المسترجعة من النسخة المؤرخة في:
              </p>
              <div className="font-mono text-[11px] font-bold text-amber-800 dark:text-amber-200 bg-amber-100/60 dark:bg-amber-900/40 p-2 rounded-lg ar-num">
                {formatDate(selectedBackupForRestore.payload.timestamp)}
              </div>
            </div>

            <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 ar-num bg-zinc-50 dark:bg-zinc-800/60 p-3 rounded-xl">
              <div>• المستخدمين: {selectedBackupForRestore.payload.users?.length ?? 0} مستخدم</div>
              <div>• الملاحظات والرسائل: {selectedBackupForRestore.payload.notes?.length ?? 0} ملاحظة</div>
              <div>• المعاملات والعمليات: {selectedBackupForRestore.payload.transactions?.length ?? 0} معاملة</div>
              <div>• سجل الأنشطة: {selectedBackupForRestore.payload.audit_logs?.length ?? 0} سجل</div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleExecuteRestore}
                disabled={loading}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{loading ? 'جاري الاسترجاع...' : 'تأكيد واستبدال البيانات'}</span>
              </button>
              <button
                onClick={() => setSelectedBackupForRestore(null)}
                disabled={loading}
                className="px-4 h-10 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
