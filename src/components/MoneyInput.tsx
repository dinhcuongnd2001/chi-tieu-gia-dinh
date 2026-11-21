import { fmtMoney, fmtNumber, parseMoney } from '../lib/format'
import type { Direction } from '../lib/types'

/** Ô nhập số tiền cỡ lớn (kiểu app chi tiêu): canh giữa, đổi màu theo Thu/Chi */
export function MoneyInput({
  value,
  onChange,
  autoFocus,
  direction = 'out',
}: {
  value: number
  onChange: (v: number) => void
  autoFocus?: boolean
  direction?: Direction
}) {
  const suggestions = value > 0 && value < 10000 ? [1e3, 1e4, 1e5].map((m) => value * m) : []
  const tone = direction === 'in' ? 'text-in' : 'text-out'
  return (
    <div className="rounded-2xl border border-line-2 bg-white px-4 pb-3 pt-3.5 transition focus-within:border-accent focus-within:shadow-[0_0_0_3px_rgba(176,132,64,.16)]">
      <div className="text-center text-[11px] font-semibold uppercase tracking-[1.2px] text-muted">
        Số tiền {direction === 'in' ? 'thu vào' : 'chi ra'}
      </div>
      <div className="flex items-baseline justify-center gap-1.5">
        <span className={`font-display text-3xl font-bold ${tone}`}>{direction === 'in' ? '+' : '−'}</span>
        <input
          className={`w-full min-w-0 bg-transparent text-center font-display text-[40px] font-bold leading-tight tabular outline-none placeholder:text-[#d3c9b4] ${tone}`}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          autoFocus={autoFocus}
          value={value ? fmtNumber(value) : ''}
          onChange={(e) => onChange(Math.min(parseMoney(e.target.value), 100_000_000_000))}
          aria-label="Số tiền"
          size={1}
        />
        <span className="font-display text-xl font-semibold text-muted">₫</span>
      </div>
      <div className="mt-1 flex min-h-8 flex-wrap justify-center gap-1.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className="rounded-full border border-line-2 bg-[rgba(176,132,64,.06)] px-3 py-1 text-[13px] font-semibold tabular text-accent-deep transition hover:border-accent hover:bg-white"
          >
            {fmtMoney(s)}
          </button>
        ))}
      </div>
    </div>
  )
}
