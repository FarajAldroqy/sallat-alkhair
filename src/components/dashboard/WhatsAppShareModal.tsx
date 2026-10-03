import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  MessageCircle,
  X,
  FileDown,
  ExternalLink,
  Copy,
  Check,
  FolderOpen,
  Eye,
  Loader2,
  Sparkles,
  Phone,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Transaction } from '@/types'
import { formatCurrency, formatDate, normalizeWhatsAppPhone } from '@/lib/utils'
import { playDepositSound, playClickSound } from '@/lib/soundEffects'

interface WhatsAppShareModalProps {
  open: boolean
  onClose: () => void
  mode: 'RECEIPT' | 'REPORT'
  transaction?: Transaction | null
  serialNumber?: string
  reportStats?: {
    count: number
    depositsTotal: number
    withdrawalsTotal: number
    dateFilterText?: string
  }
}

export function WhatsAppShareModal({
  open,
  onClose,
  mode,
  transaction,
  serialNumber,
  reportStats,
}: WhatsAppShareModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [countryCode, setCountryCode] = useState('218')
  const [customMessage, setCustomMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedFile, setCopiedFile] = useState(false)
  const [loading, setLoading] = useState(false)
  const [savedFilePath, setSavedFilePath] = useState<string | null>(null)
  const [savedFilename, setSavedFilename] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Construct default professional message and filename based on mode
  useEffect(() => {
    if (!open) {
      setSavedFilePath(null)
      setSavedFilename(null)
      setError(null)
      setLoading(false)
      setCopied(false)
      setCopiedFile(false)
      return
    }

    if (mode === 'RECEIPT' && transaction) {
      const isDeposit = transaction.type === 'DEPOSIT'
      const isTreasuryClearance =
        transaction.subtype === 'TREASURY_CLEARANCE' || transaction.client_name === 'تفريغ من الخزينة'
      const typeLabel = isTreasuryClearance
        ? 'تفريغ من الخزينة (لمصلحة الإدارة العليا)'
        : isDeposit
        ? (transaction.subtype === 'CUMULATIVE' ? 'إيداع تجميعي' : 'إيداع نقدي (قبض)')
        : (transaction.subtype === 'CUMULATIVE' ? 'سحب تجميعي' : 'سحب نقدي (صرف)')

      const serialText = serialNumber || `${transaction.id}`
      const clientText = isTreasuryClearance
        ? 'تفريغ من الخزينة (الإدارة العليا)'
        : transaction.client_name || 'العميل'

      const notesText = typeof transaction.notes === 'string' && transaction.notes.trim()
        ? transaction.notes.trim()
        : 'لا توجد ملاحظات'

      const dateText = transaction.created_at
        ? formatDate(transaction.created_at)
        : formatDate(new Date().toISOString())

      const msg = `*منتجع MJS للمعاملات المالية* 🌟\nالسلام عليكم ورحمة الله وبركاته،\n\nإليكم تفاصيل الإيصال المالي الرسمي الصادر من المنظومة:\n🧾 *رقم الإيصال:* #${serialText}\n👤 *الجهة / المستفيد:* ${clientText}\n📌 *نوع العملية:* ${typeLabel}\n💰 *المبلغ:* ${formatCurrency(transaction.amount_cents || 0)}\n💳 *طريقة الدفع:* ${transaction.payment_method || 'نقداً'}\n📅 *التاريخ:* ${dateText}\n📝 *البيان / الملاحظات:* ${notesText}\n\n📎 *تم تجهيز وحفظ ملف الإيصال كاملاً بصيغة PDF.*`

      setCustomMessage(msg)
    } else if (mode === 'REPORT' && reportStats) {
      const filterText = reportStats.dateFilterText || 'تقرير المعاملات الشامل'
      const totalDep = reportStats.depositsTotal || 0
      const totalWithd = reportStats.withdrawalsTotal || 0
      const net = totalDep - totalWithd

      const msg = `*منتجع MJS للمعاملات المالية* 📊\nالسلام عليكم ورحمة الله وبركاته،\n\nإليكم التقرير المالي المعتمد للمعاملات والحركات المالية:\n📅 *الفترة / التصنيف:* ${filterText}\n🔢 *إجمالي عدد المعاملات:* ${reportStats.count || 0} معاملة\n📈 *مجموع الإيداعات:* ${formatCurrency(totalDep)}\n📉 *مجموع السحوبات:* ${formatCurrency(totalWithd)}\n⚖️ *صافي الرصيد:* ${formatCurrency(net)}\n\n📎 *مرفق التقرير المالي التفصيلي المعتمد بصيغة PDF.*`

      setCustomMessage(msg)
    }
  }, [open, mode, transaction, serialNumber, reportStats])

  const defaultFilename = useMemo(() => {
    if (mode === 'RECEIPT' && transaction) {
      const isDeposit = transaction.type === 'DEPOSIT'
      const isTreasuryClearance =
        transaction.subtype === 'TREASURY_CLEARANCE' || transaction.client_name === 'تفريغ من الخزينة'
      const prefix = isTreasuryClearance ? 'تفريغ_خزينة' : isDeposit ? 'إيصال_قبض' : 'إيصال_صرف'
      const sNum = serialNumber ? serialNumber.replace(/[^a-zA-Z0-9_-]/g, '') : `${transaction.id}`
      const cName = (transaction.client_name || '').replace(/[\s/\\?%*:|"<>]/g, '_').slice(0, 25)
      return `${prefix}_${sNum}_${cName}.pdf`
    }
    const d = new Date()
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return `تقرير_معاملات_MJS_${dateStr}.pdf`
  }, [mode, transaction, serialNumber])

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(customMessage)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.warn('Failed to copy to clipboard', e)
    }
  }

  const generatePDF = async (): Promise<{ success: boolean; filePath?: string; filename?: string; error?: string }> => {
    if (window.electronAPI?.savePDF) {
      return await window.electronAPI.savePDF({
        filename: defaultFilename,
        landscape: false,
        showInFolder: false,
      })
    }
    // Web fallback
    try {
      window.print()
      return { success: true, filePath: defaultFilename, filename: defaultFilename }
    } catch (e: unknown) {
      const err = e instanceof Error ? e.message : 'فشل توليد التقرير'
      return { success: false, error: err }
    }
  }

  const handleSendToWhatsApp = async () => {
    setLoading(true)
    setError(null)
    playClickSound()

    try {
      // 1. Generate & Save PDF file to Downloads folder (automatically copied to system clipboard)
      const result = await generatePDF()
      if (!result.success) {
        setError(result.error || 'حدث خطأ أثناء تصدير ملف الـ PDF')
        setLoading(false)
        return
      }

      const filePath = result.filePath || defaultFilename
      setSavedFilePath(filePath)
      setSavedFilename(result.filename || defaultFilename)
      playDepositSound()

      // 2. Build phone number
      const cleanPhone = normalizeWhatsAppPhone(phoneNumber)

      // 3. Dispatch to Electron native WhatsApp handler (opens chat + ensures file is on clipboard + attempts auto-paste)
      if (window.electronAPI?.sendWhatsApp) {
        await window.electronAPI.sendWhatsApp({
          phone: cleanPhone,
          message: customMessage,
          filePath,
        })
      } else {
        const encodedMsg = encodeURIComponent(customMessage)
        const whatsappUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
          : `https://wa.me/?text=${encodedMsg}`
        window.open(whatsappUrl, '_blank')
      }
    } catch (err: unknown) {
      console.error('WhatsApp export error:', err)
      const msg = err instanceof Error ? err.message : 'حدث خطأ غير متوقع أثناء المعالجة'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPdfFile = async () => {
    if (savedFilePath && window.electronAPI?.copyFileToClipboard) {
      await window.electronAPI.copyFileToClipboard(savedFilePath)
      setCopiedFile(true)
      setTimeout(() => setCopiedFile(false), 2000)
    }
  }

  const handleSaveOnlyPDF = async () => {
    setLoading(true)
    setError(null)
    playClickSound()

    try {
      const result = await generatePDF()
      if (!result.success) {
        setError(result.error || 'فشل حفظ ملف الـ PDF')
        setLoading(false)
        return
      }

      setSavedFilePath(result.filePath || defaultFilename)
      setSavedFilename(result.filename || defaultFilename)
      playDepositSound()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'فشل حفظ الملف'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenFolder = () => {
    if (savedFilePath && window.electronAPI?.showItemInFolder) {
      window.electronAPI.showItemInFolder(savedFilePath)
    }
  }

  const handleOpenFile = () => {
    if (savedFilePath && window.electronAPI?.openPath) {
      window.electronAPI.openPath(savedFilePath)
    }
  }

  const handleReopenWhatsApp = () => {
    const cleanPhone = normalizeWhatsAppPhone(phoneNumber)
    const encodedMsg = encodeURIComponent(customMessage)
    const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`
    if (window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(url)
    } else {
      window.open(url, '_blank')
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm font-arabic select-none"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100 max-h-[92vh]"
      >
        {/* Header Bar with WhatsApp Brand Theme */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-sm">
              <MessageCircle className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <span>إرسال عبر واتساب (ملف PDF)</span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                  {mode === 'RECEIPT' ? 'إيصال مالي' : 'تقرير معاملات'}
                </span>
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                تصدير بجودة طباعة عالية + فتح واتساب مع ملخص جاهز
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 flex items-center justify-center text-white transition-colors"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-semibold">{error}</span>
            </div>
          )}

          {/* Success State Notification Banner */}
          {savedFilePath && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 space-y-2.5"
            >
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                    تم فتح محادثة واتساب ونسخ ملف الـ PDF إلى الحافظة تلقائياً!
                  </h4>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300 truncate mt-0.5" title={savedFilePath}>
                    الملف المحفوظ: {savedFilename}
                  </p>
                </div>
              </div>

              {/* Quick Actions after Save */}
              <div className="flex items-center gap-2 pt-1 border-t border-emerald-200/70 dark:border-emerald-800/60 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopyPdfFile}
                  className="h-7 text-[11px] gap-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg"
                  title="نسخ ملف الـ PDF مجدداً إلى الحافظة للصق الفوري"
                >
                  {copiedFile ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFile ? 'تم النسخ للحافظة!' : 'إعادة نسخ ملف PDF'}</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenFile}
                  className="h-7 text-[11px] gap-1.5 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>معاينة PDF</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleOpenFolder}
                  className="h-7 text-[11px] gap-1.5 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>فتح المجلد</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handleReopenWhatsApp}
                  className="h-7 text-[11px] gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold rounded-lg mr-auto"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>فتح واتساب</span>
                </Button>
              </div>

              <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-1.5 bg-white/70 dark:bg-zinc-900/70 p-2.5 rounded-lg border border-emerald-200/50 dark:border-emerald-800/40">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>ملف الـ PDF منسوخ في الحافظة الآن! كل ما عليك هو الضغط على <strong>(Ctrl + V أو لصق)</strong> في محادثة واتساب لإدراجه فوراً كملف مرفق.</span>
              </div>
            </motion.div>
          )}

          {/* 1. Phone Number Input */}
          <div className="space-y-1.5">
            <Label htmlFor="whatsapp-phone" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>رقم هاتف المستلم (واتساب)</span>
              </div>
              <span className="text-[10px] text-zinc-400 font-normal">اختياري - أو اتركه فارغاً لاختيار محادثة</span>
            </Label>

            <div className="flex items-center gap-2" dir="ltr">
              <div className="w-24 shrink-0 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500 pointer-events-none">
                  +
                </span>
                <Input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="218"
                  className="h-9 pl-6 pr-2 text-xs font-bold text-center bg-zinc-50 dark:bg-zinc-800 rounded-xl"
                  title="رمز الدولة (افتراضياً 218 لليبيا)"
                />
              </div>

              <Input
                id="whatsapp-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="091 234 5678"
                className="h-9 text-xs font-mono font-bold bg-white dark:bg-zinc-800 rounded-xl flex-1 text-left"
              />
            </div>
          </div>

          {/* 2. Message Preview & Edit */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="whatsapp-message" className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-500" />
                <span>نص الرسالة المرفقة مع الإيصال/التقرير</span>
              </Label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                title="نسخ النص إلى الحافظة"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>نسخ النص</span>
                  </>
                )}
              </button>
            </div>

            <textarea
              id="whatsapp-message"
              rows={6}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/80 text-xs font-arabic text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 leading-relaxed resize-none"
              placeholder="اكتب رسالتك هنا..."
            />
          </div>

          {/* 3. PDF File Card Info */}
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50/70 dark:bg-zinc-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <FileDown className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block truncate" title={defaultFilename}>
                  {defaultFilename}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  ملف PDF رسمي عالي الدقة (A4 جاهز للطباعة والمشاركة)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="px-5 py-3.5 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="text-xs font-bold text-zinc-600 dark:text-zinc-400 rounded-xl"
          >
            إغلاق
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleSaveOnlyPDF}
              disabled={loading}
              className="gap-1.5 text-xs font-bold border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              title="حفظ ملف الـ PDF فقط في جهازك داخل مجلد التنزيلات"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              <span>حفظ PDF فقط</span>
            </Button>

            <Button
              type="button"
              onClick={handleSendToWhatsApp}
              disabled={loading}
              className="gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-xs px-4 py-2 rounded-xl shadow-md transition-all active:scale-95 border border-emerald-600/30"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تجهيز PDF...</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-4 h-4 fill-current" />
                  <span>تصدير PDF وفتح واتساب</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
