import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { fmtMoney } from '../lib/format'
import type { Direction } from '../lib/types'

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent ${className}`}
      role="status"
      aria-label="Đang tải"
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner />
    </div>
  )
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide = false,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-surface shadow-xl sm:rounded-2xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-xl leading-none text-muted hover:bg-surface-2" aria-label="Đóng">
            ×
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}

export function Chip({
  active,
  onClick,
  children,
  color,
  small = false,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  color?: string
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium transition ${
        small ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      } ${active ? 'border-accent bg-accent/12 text-ink ring-1 ring-accent' : 'border-line bg-surface text-ink-2 hover:bg-surface-2'}`}
    >
      {color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  )
}

export function BadgeTag({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium text-ink-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  )
}

export function Money({ amount, direction, className = '' }: { amount: number; direction: Direction; className?: string }) {
  return (
    <span className={`tabular font-semibold ${direction === 'in' ? 'text-in' : 'text-out'} ${className}`}>
      {direction === 'in' ? '+' : '−'}
      {fmtMoney(amount)}
    </span>
  )
}

export function DirectionTag({ direction }: { direction: Direction }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
        direction === 'in' ? 'bg-[var(--series-in)]/15 text-in' : 'bg-[var(--series-out)]/15 text-out'
      }`}
    >
      {direction === 'in' ? '↓ Vào' : '↑ Ra'}
    </span>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">{children}</div>
}

// ---------- Toast ----------
type ToastKind = 'ok' | 'error'
const ToastContext = createContext<(msg: string, kind?: ToastKind) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ msg: string; kind: ToastKind; id: number } | null>(null)
  const show = useCallback((msg: string, kind: ToastKind = 'ok') => setToast({ msg, kind, id: Date.now() }), [])
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])
  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div
          key={toast.id}
          role="status"
          className={`fixed left-1/2 top-4 z-[60] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${
            toast.kind === 'ok' ? 'bg-[#0b7a3e]' : 'bg-[#b42318]'
          }`}
        >
          {toast.kind === 'ok' ? '✓ ' : '⚠ '}
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
