import { fmtMoney, fmtNumber, parseMoney } from '../lib/format'

export function MoneyInput({
  value,
  onChange,
  autoFocus,
}: {
  value: number
  onChange: (v: number) => void
  autoFocus?: boolean
}) {
  const suggestions = value > 0 && value < 10000 ? [1e3, 1e4, 1e5].map((m) => value * m) : []
  return (
    <div>
      <div className="relative">
        <input
          className="input pr-10 text-right text-2xl font-bold tabular"
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          autoFocus={autoFocus}
          value={value ? fmtNumber(value) : ''}
          onChange={(e) => onChange(Math.min(parseMoney(e.target.value), 100_000_000_000))}
          aria-label="Số tiền"
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted">₫</span>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(s)}
              className="rounded-full border border-line bg-surface-2 px-3 py-1 text-sm font-medium tabular hover:border-accent"
            >
              {fmtMoney(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
