import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { PenLine } from 'lucide-react'
import { Modal } from '../components/ui'
import { TransactionForm } from '../components/TransactionForm'
import type { Direction } from '../lib/types'

// ---------- Ghi nhanh: mở form ghi giao dịch từ bất kỳ màn nào ----------
const QuickAddContext = createContext<(d?: Direction) => void>(() => {})

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; dir: Direction; session: number }>({ open: false, dir: 'out', session: 0 })
  const open = useCallback((dir: Direction = 'out') => setState((s) => ({ open: true, dir, session: s.session + 1 })), [])
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])

  // Phím tắt "N" để ghi nhanh
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== 'n' || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable) return
      if (document.querySelector('[role="dialog"]')) return
      e.preventDefault()
      open('out')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <QuickAddContext.Provider value={open}>
      {children}
      <Modal open={state.open} title="Ghi giao dịch" icon={PenLine} onClose={close}>
        <TransactionForm key={state.session} defaultDirection={state.dir} onSaved={(_, again) => !again && close()} onCancel={close} />
      </Modal>
    </QuickAddContext.Provider>
  )
}
export const useQuickAdd = () => useContext(QuickAddContext)
