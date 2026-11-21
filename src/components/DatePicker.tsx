import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Dayjs } from 'dayjs'
import { dayjs, ymd } from '../lib/period'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const POP_W = 296

type View = 'days' | 'months' | 'years'

export interface DatePickerProps {
  /** YYYY-MM-DD, '' = chưa chọn */
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
  placeholder?: string
  /** cho phép xoá về '' */
  clearable?: boolean
  size?: 'sm' | 'md'
  className?: string
  ariaLabel?: string
  /** định dạng hiển thị trên ô */
  display?: 'short' | 'long'
  /** tự vẽ nút mở (vd. nhãn kỳ ở Thống kê) */
  renderTrigger?: (p: { open: () => void; isOpen: boolean; ref: (el: HTMLElement | null) => void }) => ReactNode
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = 'Chọn ngày',
  clearable = false,
  size = 'md',
  className = '',
  ariaLabel,
  display = 'short',
  renderTrigger,
}: DatePickerProps) {
  const [isOpen, setOpen] = useState(false)
  const [view, setView] = useState<View>('days')
  const [cursor, setCursor] = useState(() => (value ? dayjs(value) : dayjs()).startOf('month'))
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const open = useCallback(() => {
    setCursor((value ? dayjs(value) : dayjs()).startOf('month'))
    setView('days')
    setOpen(true)
  }, [value])
  const close = useCallback(() => setOpen(false), [])

  // Định vị popover theo nút mở (fixed + portal => không bị modal/overflow cắt)
  const place = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const popH = popRef.current?.offsetHeight ?? 360
    const vw = window.innerWidth
    const vh = window.innerHeight
    const up = r.bottom + 8 + popH > vh && r.top - 8 - popH > 0
    const left = Math.max(8, Math.min(r.left, vw - POP_W - 8))
    const top = up ? r.top - 8 - popH : Math.min(r.bottom + 8, vh - popH - 8)
    setPos({ top: Math.max(8, top), left, up })
  }, [])

  useLayoutEffect(() => {
    if (!isOpen) return
    place()
  }, [isOpen, view, cursor, place])

  useEffect(() => {
    if (!isOpen) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node
      if (popRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      close()
    }
    // capture: Esc chỉ đóng lịch, không đóng modal bên dưới
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [isOpen, close, place])

  const pick = (d: string) => {
    onChange(d)
    close()
    ;(triggerRef.current as HTMLElement | null)?.focus?.()
  }

  const setTriggerRef = useCallback((el: HTMLElement | null) => {
    triggerRef.current = el
  }, [])

  const label = value ? (display === 'long' ? dayjs(value).format('dddd, DD/MM/YYYY') : dayjs(value).format('dd, DD/MM/YYYY')) : ''

  return (
    <>
      {renderTrigger ? (
        renderTrigger({ open, isOpen, ref: setTriggerRef })
      ) : (
        <button
          ref={setTriggerRef}
          type="button"
          onClick={() => (isOpen ? close() : open())}
          aria-label={ariaLabel ?? placeholder}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={`group inline-flex items-center gap-2 rounded-xl border bg-white text-left font-medium transition ${
            isOpen ? 'border-accent shadow-[0_0_0_3px_rgba(176,132,64,.16)]' : 'border-line-2 hover:border-accent/50'
          } ${size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-3.5 py-2.5 text-[14px]'} ${className}`}
        >
          <CalendarDays className={`shrink-0 text-accent ${size === 'sm' ? 'h-4 w-4' : 'h-[18px] w-[18px]'}`} />
          <span className={`min-w-0 flex-1 truncate first-letter:uppercase ${value ? 'text-ink' : 'text-[#a99f8c]'}`}>{label || placeholder}</span>
          {clearable && value && (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Xoá ngày"
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="grid h-5 w-5 place-items-center rounded-full text-muted hover:bg-[rgba(60,48,28,.08)]"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
        </button>
      )}

      {isOpen &&
        createPortal(
          <div
            ref={popRef}
            role="dialog"
            aria-label="Chọn ngày"
            className="fixed z-[70] rounded-2xl border border-line-2 bg-white p-3 shadow-[0_18px_46px_rgba(74,58,30,.22),0_2px_10px_rgba(74,58,30,.08)]"
            style={{
              width: POP_W,
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              animation: `${pos?.up ? 'fade' : 'rise'} .18s ease`,
            }}
          >
            <Calendar view={view} setView={setView} cursor={cursor} setCursor={setCursor} value={value} min={min} max={max} onPick={pick} />
          </div>,
          document.body,
        )}
    </>
  )
}

// ---------------------------------------------------------------------

function Calendar({
  view,
  setView,
  cursor,
  setCursor,
  value,
  min,
  max,
  onPick,
}: {
  view: View
  setView: (v: View) => void
  cursor: Dayjs
  setCursor: (d: Dayjs) => void
  value: string
  min?: string
  max?: string
  onPick: (d: string) => void
}) {
  const todayStr = ymd(dayjs())
  const disabled = (d: string) => (min && d < min) || (max && d > max)

  const days = useMemo(() => {
    const start = cursor.startOf('month').startOf('isoWeek')
    return Array.from({ length: 42 }, (_, i) => start.add(i, 'day'))
  }, [cursor])

  const yearStart = Math.floor(cursor.year() / 12) * 12

  const step = (n: number) => {
    if (view === 'days') setCursor(cursor.add(n, 'month'))
    else if (view === 'months') setCursor(cursor.add(n, 'year'))
    else setCursor(cursor.add(n * 12, 'year'))
  }

  const title =
    view === 'days' ? `Tháng ${cursor.month() + 1}, ${cursor.year()}` : view === 'months' ? `Năm ${cursor.year()}` : `${yearStart} – ${yearStart + 11}`

  return (
    <div>
      {/* Header */}
      <div className="mb-2 flex items-center gap-1">
        <NavBtn label="Trước" onClick={() => step(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </NavBtn>
        <button
          type="button"
          onClick={() => setView(view === 'days' ? 'months' : view === 'months' ? 'years' : 'days')}
          className="flex-1 rounded-lg py-1.5 text-center font-display text-[14px] font-bold transition hover:bg-[rgba(176,132,64,.1)] hover:text-accent-deep"
        >
          {title}
        </button>
        <NavBtn label="Sau" onClick={() => step(1)}>
          <ChevronRight className="h-4 w-4" />
        </NavBtn>
      </div>

      {view === 'days' && (
        <>
          <div className="grid grid-cols-7 justify-items-center">
            {WEEKDAYS.map((w, i) => (
              <span key={w} className={`py-1.5 text-[10.5px] font-bold uppercase tracking-wide ${i === 6 ? 'text-out/80' : 'text-muted'}`}>
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 justify-items-center gap-y-0.5">
            {days.map((d) => {
              const s = ymd(d)
              const inMonth = d.month() === cursor.month()
              const sel = s === value
              const isToday = s === todayStr
              const dis = disabled(s)
              return (
                <button
                  key={s}
                  type="button"
                  disabled={Boolean(dis)}
                  onClick={() => onPick(s)}
                  aria-label={d.format('dddd, DD/MM/YYYY')}
                  aria-pressed={sel}
                  className={`grid h-9 w-9 place-items-center rounded-[10px] text-[13px] tabular transition ${
                    sel
                      ? 'bg-grad font-bold text-white shadow-[0_4px_12px_rgba(176,132,64,.35)]'
                      : isToday
                        ? 'font-bold text-accent-deep shadow-[inset_0_0_0_1.5px_rgba(176,132,64,.6)] hover:bg-[rgba(176,132,64,.12)]'
                        : inMonth
                          ? 'text-ink hover:bg-[rgba(176,132,64,.12)]'
                          : 'text-[#c9bea6] hover:bg-[rgba(176,132,64,.08)]'
                  } disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent`}
                >
                  {d.date()}
                </button>
              )
            })}
          </div>
        </>
      )}

      {view === 'months' && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, m) => {
            const active = value && dayjs(value).year() === cursor.year() && dayjs(value).month() === m
            const isNow = dayjs().year() === cursor.year() && dayjs().month() === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setCursor(cursor.month(m))
                  setView('days')
                }}
                className={`rounded-xl py-3 text-[13px] font-semibold transition ${
                  active ? 'bg-grad text-white shadow-glow' : isNow ? 'text-accent-deep ring-1 ring-accent/60 hover:bg-[rgba(176,132,64,.1)]' : 'hover:bg-[rgba(176,132,64,.1)]'
                }`}
              >
                Th {m + 1}
              </button>
            )
          })}
        </div>
      )}

      {view === 'years' && (
        <div className="grid grid-cols-3 gap-1.5 py-1">
          {Array.from({ length: 12 }, (_, i) => {
            const y = yearStart + i
            const active = value && dayjs(value).year() === y
            const isNow = dayjs().year() === y
            return (
              <button
                key={y}
                type="button"
                onClick={() => {
                  setCursor(cursor.year(y))
                  setView('months')
                }}
                className={`rounded-xl py-3 font-display text-[13px] font-semibold tabular transition ${
                  active ? 'bg-grad text-white shadow-glow' : isNow ? 'text-accent-deep ring-1 ring-accent/60 hover:bg-[rgba(176,132,64,.1)]' : 'hover:bg-[rgba(176,132,64,.1)]'
                }`}
              >
                {y}
              </button>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
        <button
          type="button"
          className="rounded-lg px-2.5 py-1 text-[12.5px] font-semibold text-link transition hover:bg-[rgba(47,74,122,.08)]"
          onClick={() => {
            setCursor(dayjs().startOf('month'))
            setView('days')
          }}
        >
          Tháng này
        </button>
        <button
          type="button"
          disabled={Boolean(disabled(todayStr))}
          className="rounded-lg bg-[rgba(176,132,64,.12)] px-3 py-1 text-[12.5px] font-bold text-accent-deep transition hover:bg-[rgba(176,132,64,.2)] disabled:opacity-40"
          onClick={() => onPick(todayStr)}
        >
          Hôm nay
        </button>
      </div>
    </div>
  )
}

function NavBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-[rgba(176,132,64,.1)] hover:text-accent-deep"
    >
      {children}
    </button>
  )
}
