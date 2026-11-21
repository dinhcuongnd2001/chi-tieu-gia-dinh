import { CATEGORY_COLORS } from '../lib/types'

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORY_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={`Màu ${c}`}
          aria-pressed={value === c}
          className={`h-8 w-8 rounded-full border-2 ${value === c ? 'border-ink ring-2 ring-surface' : 'border-transparent'}`}
          style={{ background: c }}
        />
      ))}
    </div>
  )
}
