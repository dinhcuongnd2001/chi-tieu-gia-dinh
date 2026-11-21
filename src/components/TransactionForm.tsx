import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDownLeft,
  ArrowUpRight,
  Camera,
  ChevronDown,
  CreditCard,
  NotebookPen,
  Plus,
  Save,
  Trash2,
} from 'lucide-react'
import { useCatalog } from '../context/CatalogContext'
import { useDataVersion } from '../lib/dataSync'
import { errorMessage, receiptUrl, saveTransaction, uploadReceipt } from '../lib/api'
import { fmtMoney } from '../lib/format'
import { dayjs, today, ymd } from '../lib/period'
import { PAYMENT_METHODS, type Direction, type PaymentMethod, type Transaction } from '../lib/types'
import { DatePicker } from './DatePicker'
import { MoneyInput } from './MoneyInput'
import { Chip, EmptyState, Spinner, useToast } from './ui'
import { CategoryIcon } from '../lib/categoryIcons'

const lastCatKey = (d: Direction) => `tdct:lastCategory:${d}`
const safeGet = (k: string) => {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
const safeSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v)
  } catch {
    /* ignore */
  }
}

export function TransactionForm({
  initial,
  defaultDirection = 'out',
  onSaved,
  onCancel,
  extraActions,
}: {
  initial?: Transaction | null
  defaultDirection?: Direction
  /** again = true khi bấm "Lưu & nhập tiếp" */
  onSaved: (id: string, again: boolean) => void
  onCancel?: () => void
  extraActions?: ReactNode
}) {
  const { categories, items, badges } = useCatalog()
  const { bump } = useDataVersion()
  const toast = useToast()
  const isEdit = Boolean(initial)

  const [direction, setDirection] = useState<Direction>(initial?.direction ?? defaultDirection)
  const [categoryCode, setCategoryCode] = useState<string>(initial?.category_code ?? safeGet(lastCatKey(direction)) ?? '')
  const [itemId, setItemId] = useState<string>(initial?.item_id ?? '')
  const [badgeIds, setBadgeIds] = useState<string[]>(initial?.transaction_badges.map((b) => b.badge_id) ?? [])
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0)
  const [date, setDate] = useState<string>(initial?.txn_date ?? today())
  const [payment, setPayment] = useState<PaymentMethod | null>(initial?.payment_method ?? null)
  const [note, setNote] = useState(initial?.note ?? '')
  const [receiptPath, setReceiptPath] = useState<string | null>(initial?.receipt_path ?? null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState<false | 'close' | 'again'>(false)
  const [showMore, setShowMore] = useState(Boolean(initial?.payment_method || initial?.receipt_path))
  const fileRef = useRef<HTMLInputElement>(null)

  // Khoản dùng được theo chiều Thu/Chi đang chọn
  const usableItems = useMemo(
    () => items.filter((i) => (i.is_active && i.direction === direction) || i.id === initial?.item_id),
    [items, direction, initial],
  )
  const cats = useMemo(
    () =>
      categories.filter(
        (c) => (c.is_active || c.code === initial?.category_code) && usableItems.some((i) => i.category_code === c.code),
      ),
    [categories, usableItems, initial],
  )
  const catItems = useMemo(() => usableItems.filter((i) => i.category_code === categoryCode), [usableItems, categoryCode])
  const itemBadges = useMemo(
    () => badges.filter((b) => b.item_id === itemId && (b.is_active || badgeIds.includes(b.id))),
    [badges, itemId, badgeIds],
  )

  useEffect(() => {
    if (!cats.some((c) => c.code === categoryCode)) {
      const remembered = safeGet(lastCatKey(direction))
      setCategoryCode(cats.find((c) => c.code === remembered)?.code ?? cats[0]?.code ?? '')
    }
  }, [cats, categoryCode, direction])

  useEffect(() => {
    if (!catItems.some((i) => i.id === itemId)) {
      setItemId(catItems.length === 1 ? catItems[0].id : '')
      setBadgeIds([])
    }
  }, [catItems, itemId])

  useEffect(() => {
    if (receiptPath && !receiptPreview) receiptUrl(receiptPath).then(setReceiptPreview)
  }, [receiptPath, receiptPreview])

  const toggleBadge = (id: string) =>
    setBadgeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  async function onPickFile(f: File | undefined) {
    if (!f) return
    setUploading(true)
    try {
      const path = await uploadReceipt(f)
      setReceiptPath(path)
      setReceiptPreview(URL.createObjectURL(f))
    } catch (e) {
      toast(errorMessage(e), 'error')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function submit(again: boolean) {
    if (!itemId) return toast('Hãy chọn khoản', 'error')
    if (amount <= 0) return toast('Số tiền phải lớn hơn 0', 'error')
    setSaving(again ? 'again' : 'close')
    try {
      const id = await saveTransaction({
        id: initial?.id,
        txn_date: date,
        amount,
        item_id: itemId,
        payment_method: payment,
        note,
        receipt_path: receiptPath,
        badge_ids: badgeIds.filter((b) => itemBadges.some((x) => x.id === b)),
      })
      safeSet(lastCatKey(direction), categoryCode)
      toast(isEdit ? 'Đã cập nhật giao dịch' : `Đã lưu ${direction === 'in' ? 'khoản thu' : 'khoản chi'} ${fmtMoney(amount)}`)
      bump()
      if (again) {
        // giữ Thu/Chi, nhóm, khoản, ngày để nhập nhanh tiếp
        setAmount(0)
        setNote('')
        setBadgeIds([])
        setReceiptPath(null)
        setReceiptPreview(null)
      }
      onSaved(id, again)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit(false)
  }

  if (!items.some((i) => i.is_active)) {
    return (
      <EmptyState title="Chưa có danh mục">
        Hãy{' '}
        <Link to="/danh-muc" className="font-semibold text-link underline">
          tạo nhóm và khoản
        </Link>{' '}
        trước khi ghi giao dịch.
      </EmptyState>
    )
  }

  const yesterday = ymd(dayjs().subtract(1, 'day'))
  const dirWord = direction === 'in' ? 'thu' : 'chi'

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Thu / Chi */}
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-[rgba(60,48,28,.06)] p-1" role="tablist" aria-label="Loại giao dịch">
        {(['out', 'in'] as Direction[]).map((d) => {
          const active = direction === d
          const Icon = d === 'out' ? ArrowUpRight : ArrowDownLeft
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setDirection(d)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition ${
                active ? `bg-white shadow-[0_4px_14px_rgba(74,58,30,.12)] ${d === 'out' ? 'text-out' : 'text-in'}` : 'text-muted hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4" />
              {d === 'out' ? 'Khoản chi' : 'Khoản thu'}
            </button>
          )
        })}
      </div>

      <MoneyInput value={amount} onChange={setAmount} autoFocus={!isEdit} direction={direction} />

      {/* Nhóm */}
      <Field label="Nhóm">
        {cats.length === 0 ? (
          <p className="text-sm text-muted">
            Chưa có khoản {dirWord} nào.{' '}
            <Link to="/danh-muc" className="font-semibold text-link underline">
              Thêm trong Danh mục
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2 min-[420px]:grid-cols-4 sm:grid-cols-5">
            {cats.map((c) => {
              const active = c.code === categoryCode
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCategoryCode(c.code)}
                  aria-pressed={active}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1.5 py-2.5 text-center transition ${
                    active
                      ? 'border-accent bg-white shadow-[0_0_0_3px_rgba(176,132,64,.14),0_6px_18px_rgba(176,132,64,.12)]'
                      : 'border-transparent bg-white/55 hover:border-line-2 hover:bg-white'
                  }`}
                >
                  <CategoryIcon icon={c.icon} color={c.color} size={44} />
                  <span className={`line-clamp-2 text-[12px] font-semibold leading-tight ${active ? 'text-accent-deep' : 'text-ink-2'}`}>
                    {c.name}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </Field>

      {/* Khoản */}
      {catItems.length > 0 && (
        <Field label="Khoản">
          <div className="flex flex-wrap gap-2">
            {catItems.map((i) => (
              <Chip key={i.id} active={i.id === itemId} onClick={() => setItemId(i.id)}>
                {i.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      {/* Badge */}
      {itemBadges.length > 0 && (
        <Field label="Chi tiết" hint="chọn nhiều được">
          <div className="flex flex-wrap gap-2">
            {itemBadges.map((b) => (
              <Chip key={b.id} small active={badgeIds.includes(b.id)} onClick={() => toggleBadge(b.id)} color={b.color}>
                {b.name}
              </Chip>
            ))}
          </div>
        </Field>
      )}

      {/* Ngày */}
      <Field label="Ngày">
        <div className="flex flex-wrap items-center gap-2">
          <Chip small active={date === today()} onClick={() => setDate(today())}>
            Hôm nay
          </Chip>
          <Chip small active={date === yesterday} onClick={() => setDate(yesterday)}>
            Hôm qua
          </Chip>
          <DatePicker value={date} onChange={(v) => v && setDate(v)} size="sm" ariaLabel="Chọn ngày" max="2100-12-31" />
        </div>
      </Field>

      {/* Ghi chú */}
      <label className="relative block">
        <NotebookPen className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          className="input pl-10"
          value={note}
          maxLength={500}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ghi chú (không bắt buộc)"
          aria-label="Ghi chú"
        />
      </label>

      {/* Tuỳ chọn thêm */}
      <div className="rounded-2xl border border-line-2 bg-white/55">
        <button
          type="button"
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-ink-2"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
        >
          <CreditCard className="h-4 w-4 text-muted" />
          Thanh toán & ảnh hoá đơn
          {(payment || receiptPath) && <span className="h-2 w-2 rounded-full bg-accent" />}
          <ChevronDown className={`ml-auto h-4 w-4 text-muted transition ${showMore ? 'rotate-180' : ''}`} />
        </button>
        {showMore && (
          <div className="space-y-4 border-t border-line px-4 pb-4 pt-3.5">
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((p) => (
                <Chip key={p.value} small active={payment === p.value} onClick={() => setPayment(payment === p.value ? null : p.value)}>
                  {p.label}
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {receiptPreview && (
                <a href={receiptPreview} target="_blank" rel="noreferrer">
                  <img
                    src={receiptPreview}
                    alt="Hoá đơn"
                    className="h-16 w-16 rounded-xl border border-line-2 object-cover shadow-[0_6px_18px_rgba(74,58,30,.14)]"
                  />
                </a>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
              <button type="button" className="btn-ghost px-3.5 py-2 text-[13px]" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Spinner className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                {receiptPath ? 'Đổi ảnh' : 'Chụp / chọn ảnh'}
              </button>
              {receiptPath && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-danger"
                  onClick={() => {
                    setReceiptPath(null)
                    setReceiptPreview(null)
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Bỏ ảnh
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Thanh hành động dính đáy sheet */}
      <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center gap-2 border-t border-line bg-white/95 px-5 py-3.5 backdrop-blur">
        {extraActions}
        {!isEdit && (
          <button type="button" className="btn-ghost" disabled={Boolean(saving) || uploading} onClick={() => submit(true)}>
            {saving === 'again' ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            Lưu & nhập tiếp
          </button>
        )}
        {onCancel && isEdit && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Huỷ
          </button>
        )}
        <button type="submit" className="btn-primary ml-auto flex-1 py-3 sm:flex-none sm:px-6" disabled={Boolean(saving) || uploading}>
          {saving === 'close' ? <Spinner className="h-4 w-4 text-white" /> : <Save className="h-4 w-4" />}
          {isEdit ? 'Cập nhật' : `Lưu khoản ${dirWord}`}
          {amount > 0 && !isEdit && <span className="hidden font-display tabular sm:inline">· {fmtMoney(amount)}</span>}
        </button>
      </div>
    </form>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[11.5px] font-bold uppercase tracking-[1.2px] text-muted">{label}</span>
        {hint && <span className="text-[11.5px] text-muted">· {hint}</span>}
      </div>
      {children}
    </div>
  )
}
