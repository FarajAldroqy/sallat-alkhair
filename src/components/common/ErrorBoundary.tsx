import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 font-arabic select-none" dir="rtl">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white">حدث خطأ غير متوقع</h2>
              <p className="text-xs text-zinc-400">
                تم احتواء الخطأ تلقائياً لمنع إغلاق المنظومة. يمكنك المتابعة أو تحديث الصفحة.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 font-mono text-left dir-ltr break-all max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                type="button"
                onClick={this.handleReset}
                variant="outline"
                className="text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-200"
              >
                تجاهل ومتابعة
              </Button>
              <Button
                type="button"
                onClick={this.handleReload}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة تحميل المنظومة</span>
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
