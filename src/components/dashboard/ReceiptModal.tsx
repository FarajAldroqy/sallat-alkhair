import { useState, useEffect } from 'react'
import { Printer, X, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Transaction } from '@/types'
import { usePermission } from '@/hooks/usePermission'
import { PrintReceipt, getReceiptSerial } from './PrintReceipt'
import { WhatsAppShareModal } from './WhatsAppShareModal'

interface ReceiptModalProps {
  transaction: Transaction | null
  open: boolean
  onClose: () => void
  initialOpenWhatsApp?: boolean
}

export function ReceiptModal({ transaction, open, onClose, initialOpenWhatsApp = false }: ReceiptModalProps) {
  const { hasPermission } = usePermission()
  const canExportReports = hasPermission('export_reports')
  const [whatsAppOpen, setWhatsAppOpen] = useState(false)

  useEffect(() => {
    if (open && initialOpenWhatsApp) {
      setWhatsAppOpen(true)
    } else if (!open) {
      setWhatsAppOpen(false)
    }
  }, [open, initialOpenWhatsApp])

  if (!open || !transaction) return null

  const serial = getReceiptSerial(transaction)

  const handlePrint = () => {
    if (!canExportReports) {
      alert('عذراً، لا تملك صلاحية تصدير وطباعة التقارير')
      return
    }
    window.print()
  }

  return (
    <>
      {/* Hidden Print Container for Printer/PDF */}
      <PrintReceipt transaction={transaction} serialNumber={serial} isPreview={false} />

      {/* On-Screen Modal Overlay for Previewing Single Receipt */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto font-arabic select-none"
        dir="rtl"
      >
        <div className="w-full max-w-xl bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200/80 flex flex-col my-auto">
          {/* Top Sticky Header Bar (Pure White) */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-zinc-900 flex items-center gap-2">
                  <span>معاينة الإيصال قبل الطباعة</span>
                  <span className="px-2 py-0.5 rounded-md border border-zinc-200 bg-zinc-100 text-[11px] font-mono font-black text-emerald-700">
                    #{serial}
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-500 font-medium">
                  معاينة الإيصال (تطبَع إيصالان بنسختين على ورقة A4 واحدة)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => setWhatsAppOpen(true)}
                className="gap-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition-all active:scale-95 border border-emerald-600/30"
                title="إرسال الإيصال كملف PDF عبر تطبيق واتساب"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>إرسال واتساب (PDF)</span>
              </Button>

              {canExportReports && (
                <Button
                  type="button"
                  onClick={handlePrint}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-sm transition-all active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>طباعة الإيصال</span>
                </Button>
              )}

              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="w-8 h-8 p-0 rounded-xl hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 border border-zinc-200 transition-colors"
                title="إغلاق المعاينة"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Modal Body: Single Receipt Preview on Light Background */}
          <div className="p-3 sm:p-4 bg-zinc-100/60 flex justify-center items-center overflow-x-auto">
            <div className="w-full bg-white rounded-xl shadow-xl overflow-hidden border border-zinc-200">
              <PrintReceipt transaction={transaction} serialNumber={serial} isPreview={true} />
            </div>
          </div>
        </div>
      </div>

      {/* WhatsApp Sharing Dialog */}
      <WhatsAppShareModal
        open={whatsAppOpen}
        onClose={() => setWhatsAppOpen(false)}
        mode="RECEIPT"
        transaction={transaction}
        serialNumber={serial}
      />
    </>
  )
}
