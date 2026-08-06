import { useEffect } from 'react'
import { playClickSound } from '@/lib/soundEffects'

interface UseKeyboardShortcutsProps {
  onOpenDeposit: () => void
  onOpenWithdrawal: () => void
}

export function useKeyboardShortcuts({
  onOpenDeposit,
  onOpenWithdrawal,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey

      if (isCtrlOrCmd) {
        const isPlus =
          e.key === '+' ||
          e.key === '=' ||
          e.code === 'NumpadAdd' ||
          (e.code === 'Equal' && e.shiftKey)

        const isMinus =
          e.key === '-' ||
          e.code === 'NumpadSubtract' ||
          e.code === 'Minus'

        if (isPlus) {
          e.preventDefault()
          e.stopPropagation()
          playClickSound()
          onOpenDeposit()
        } else if (isMinus) {
          e.preventDefault()
          e.stopPropagation()
          playClickSound()
          onOpenWithdrawal()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [onOpenDeposit, onOpenWithdrawal])
}
