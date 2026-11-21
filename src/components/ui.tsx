import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, CheckCircle2, Inbox, Loader2, X, type LucideIcon } from 'lucide-react'
import { fmtMoney } from '../lib/format'
import type { Direction } from '../lib/types'

export function Spinner({ className = '' }: { className?: string }) {
  return <Loader2 className={`h-6 w-6 animate-spin text-accent ${className}`} role="status" aria-label="Đang tải" />
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  )
}

/** Khung xương khi đang tải danh sách */
export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="card divide-y divide-line overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <span className="skel h-10 w-10 shrink-0 rounded-full" />
          <span className="flex-1 space-y-2">
            <span className="skel h-3 w-2/5" />
            <span className="skel h-2.5 w-3/5" />
          </span>
          <span className="skel h-3.5 w-20" />
        </div>
      ))}
    </div>
  )
}

export function Modal({
  open,
  title,
  icon: Icon,
  onClose,
  children,
  wide = false,
}: {
  open: boolean
  title: string
  icon?: LucideIcon
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(40,32,20,.45)] backdrop-blur-md sm:items-center sm:p-5"
      style={{ animation: 'fade .2s ease' }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-white/90 bg-white/96 shadow-[0_24px_70px_rgba(74,58,30,.28),0_0_46px_rgba(176,132,64,.14)] sm:rounded-3xl ${
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'
        }`}
        style={{ animation: 'pop .35s cubic-bezier(.2,.9,.3,1.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,rgba(207,169,106,.2),transparent_65%)]" />
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-white/90 px-5 py-4 backdrop-blur">
          <span className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-[rgba(60,48,28,.18)] sm:hidden" aria-hidden />
          {Icon && (
            <span className="bg-grad shadow-glow grid h-9 w-9 place-items-center rounded-full text-white">
              <Icon className="h-[18px] w-[18px]" />
            </span>
          )}
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="btn-icon ml-auto h-9 w-9 border-transparent bg-transparent" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="relative p-5">{children}</div>
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
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-all ${
        small ? 'px-3 py-1 text-[13px]' : 'px-3.5 py-2 text-sm'
      } ${
        active
          ? 'border-accent bg-white text-accent-deep shadow-[0_0_0_3px_rgba(176,132,64,.14),0_6px_18px_rgba(176,132,64,.12)]'
          : 'border-line-2 bg-white/60 text-ink-2 hover:border-accent/40 hover:bg-white'
      }`}
    >
      {color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />}
      {children}
    </button>
  )
}

export function BadgeTag({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(60,48,28,.06)] px-2 py-0.5 text-[11px] font-semibold text-ink-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      {name}
    </span>
  )
}

export function Money({ amount, direction, className = '' }: { amount: number; direction: Direction; className?: string }) {
  return (
    <span className={`font-display tabular font-bold ${direction === 'in' ? 'text-in' : 'text-out'} ${className}`}>
      {direction === 'in' ? '+' : '−'}
      {fmtMoney(amount)}
    </span>
  )
}

export function DirectionTag({ direction }: { direction: Direction }) {
  const isIn = direction === 'in'
  const Icon = isIn ? ArrowDownLeft : ArrowUpRight
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
        isIn ? 'bg-[rgba(4,120,87,.1)] text-in' : 'bg-[rgba(220,38,38,.08)] text-out'
      }`}
    >
      <Icon className="h-3 w-3" />
      {isIn ? 'Vào' : 'Ra'}
    </span>
  )
}

export function EmptyState({ children, title, icon: Icon = Inbox }: { children?: ReactNode; title?: string; icon?: LucideIcon }) {
  return (
    <div className="grid place-items-center gap-1.5 rounded-2xl border-[1.5px] border-dashed border-line-2 bg-white/55 px-5 py-11 text-center">
      <span className="mb-1 grid h-13 w-13 place-items-center rounded-full bg-[rgba(60,48,28,.06)] text-muted">
        <Icon className="h-6 w-6" />
      </span>
      {title && <div className="text-[14.5px] font-bold">{title}</div>}
      {children && <div className="max-w-md text-[13px] text-muted">{children}</div>}
    </div>
  )
}

const AVATAR_GRADS = [
  'linear-gradient(135deg,#b8864a,#a5773f)',
  'linear-gradient(135deg,#5d7aa8,#2f4a7a)',
  'linear-gradient(135deg,#059669,#0d9488)',
  'linear-gradient(135deg,#7c3aed,#c026d3)',
  'linear-gradient(135deg,#d97706,#ca8a04)',
]
export function Avatar({ name, seed, size = 28 }: { name: string; seed?: string; size?: number }) {
  const key = seed ?? name
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return (
    <span
      title={name}
      className="inline-grid shrink-0 place-items-center rounded-full font-bold uppercase text-white shadow-[0_2px_6px_rgba(74,58,30,.18)]"
      style={{ width: size, height: size, fontSize: size * 0.45, background: AVATAR_GRADS[h % AVATAR_GRADS.length] }}
    >
      {name.trim().charAt(0) || '?'}
    </span>
  )
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
          className={`fixed left-1/2 top-5 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border bg-white/95 px-4 py-2.5 text-sm font-semibold shadow-[0_14px_38px_rgba(74,58,30,.2)] backdrop-blur ${
            toast.kind === 'ok' ? 'border-[rgba(4,120,87,.28)] text-in' : 'border-[rgba(220,38,38,.25)] text-out'
          }`}
          style={{ animation: 'rise .25s ease' }}
        >
          {toast.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

/** Ô số liệu (Tiền vào / Tiền ra / Chênh lệch) */
export function StatTile({
  label,
  value,
  tone = 'neutral',
  icon: Icon,
  children,
  compact = false,
}: {
  label: string
  value: string
  tone?: 'in' | 'out' | 'neutral'
  icon?: LucideIcon
  children?: ReactNode
  compact?: boolean
}) {
  const toneCls = tone === 'in' ? 'text-in' : tone === 'out' ? 'text-out' : 'text-link'
  const iconBg =
    tone === 'in' ? 'bg-[rgba(4,120,87,.1)] text-in' : tone === 'out' ? 'bg-[rgba(220,38,38,.08)] text-out' : 'bg-[rgba(47,74,122,.08)] text-link'
  return (
    <div className={`card-solid min-w-0 ${compact ? 'px-3 py-2.5' : 'p-4'}`}>
      <div className="flex items-center gap-2">
        {Icon && !compact && (
          <span className={`grid h-7 w-7 place-items-center rounded-full ${iconBg}`}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <span className="text-[11px] font-semibold uppercase tracking-[.8px] text-muted">{label}</span>
      </div>
      <div
        className={`truncate font-display font-bold tabular tracking-tight ${toneCls} ${compact ? 'mt-0.5 text-base sm:text-xl' : 'mt-2 text-[26px] leading-none'}`}
      >
        {value}
      </div>
      {children}
    </div>
  )
}
