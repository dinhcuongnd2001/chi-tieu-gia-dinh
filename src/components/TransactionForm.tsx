import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../context/CatalogContext'
import { errorMessage, receiptUrl, saveTransaction, uploadReceipt } from '../lib/api'
import { today } from '../lib/period'
import { PAYMENT_METHODS, type PaymentMethod, type Transaction } from '../lib/types'
import { MoneyInput } from './MoneyInput'
import { Chip, DirectionTag, EmptyState, Spinner, useToast } from './ui'

const LAST_CAT_KEY = 'tdct:lastCategory'
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
  onSaved,
  onCancel,
  extraActions,
}: {
  initial?: Transaction | null
  onSaved: (id: string) => void
  onCancel?: () => void
  extraActions?: React.ReactNode
}) {
  const { categories, items, badges } = useCatalog()
  const toast = useToast()
  const isEdit = Boolean(initial)

  const activeCats = categories.filter((c) => c.is_active || c.code === initial?.category_code)
  const [categoryCode, setCategoryCode] = useState<string>(
    initial?.category_code ?? safeGet(LAST_CAT_KEY) ?? activeCats[0]?.code ?? '',
  )
  const [itemId, setItemId] = useState<string>(initial?.item_id ?? '')
  const [badgeIds, setBadgeIds] = useState<string[]>(initial?.transaction_badges.map((b) => b.badge_id) ?? [])
  const [amount, setAmount] = useState<number>(initial?.amount ?? 0)
  const [date, setDate] = useState<string>(initial?.txn_date ?? today())
  const [payment, setPayment] = useState<PaymentMethod | null>(initial?.payment_method ?? null)
  const [note, setNote] = useState(initial?.note ?? '')
  const [receiptPath, setReceiptPath] = useState<string | null>(initial?.receipt_path ?? null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showMore, setShowMore] = useState(Boolean(initial?.payment_method || initial?.receipt_path))
  const fileRef = useRef<HTMLInputElement>(null)

  // nếu category đã nhớ không còn tồn tại
  useEffect(() => {
    if (!activeCats.some((c) => c.code === categoryCode) && activeCats[0]) setCategoryCode(activeCats[0].code)
  }, [categoryCode, activeCats])

  useEffect(() => {
    if (receiptPath && !receiptPreview) receiptUrl(receiptPath).then(setReceiptPreview)
  }, [receiptPath, receiptPreview])

  const catItems = useMemo(
    () => items.filter((i) => i.category_code === categoryCode && (i.is_active || i.id === initial?.item_id)),
    [items, categoryCode, initial],
  )
  const itemBadges = useMemo(
    () => badges.filter((b) => b.item_id === itemId && (b.is_active || badgeIds.includes(b.id))),
    [badges, itemId, badgeIds],
  )

  // tự chọn khoản nếu nhóm chỉ có 1 khoản
  useEffect(() => {
    if (!catItems.some((i) => i.id === itemId)) {
      setItemId(catItems.length === 1 ? catItems[0].id : '')
      setBadgeIds([])
    }
  }, [catItems, itemId])

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!itemId) return toast('Hãy chọn khoản chi tiêu', 'error')
    if (amount <= 0) return toast('Số tiền phải lớn hơn 0', 'error')
    setSaving(true)
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
      safeSet(LAST_CAT_KEY, categoryCode)
      toast(isEdit ? 'Đã cập nhật giao dịch' : 'Đã lưu giao dịch')
      if (!isEdit) {
        // giữ ngày/nhóm/khoản để nhập nhanh tiếp
        setAmount(0)
        setNote('')
        setBadgeIds([])
        setReceiptPath(null)
        setReceiptPreview(null)
      }
      onSaved(id)
    } catch (err) {
      toast(errorMessage(err), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (activeCats.length === 0) {
    return (
      <EmptyState>
        Chưa có nhóm chi tiêu nào.{' '}
        <Link to="/danh-muc" className="font-semibold text-accent underline">
          Tạo danh mục
        </Link>{' '}
        trước nhé.
      </EmptyState>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <span className="label">Nhóm</span>
        <div className="flex flex-wrap gap-2">
          {activeCats.map((c) => (
            <Chip key={c.code} active={c.code === categoryCode} onClick={() => setCategoryCode(c.code)} color={c.color}>
              {c.icon && <span>{c.icon}</span>}
              {c.name}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <span className="label">Khoản</span>
        {catItems.length === 0 ? (
          <p className="text-sm text-muted">
            Nhóm này chưa có khoản nào.{' '}
            <Link to={`/danh-muc/${categoryCode}`} className="text-accent underline">
              Thêm khoản
            </Link>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {catItems.map((i) => (
              <Chip key={i.id} active={i.id === itemId} onClick={() => setItemId(i.id)}>
                {i.name} <DirectionTag direction={i.direction} />
              </Chip>
            ))}
          </div>
        )}
      </div>

      {itemBadges.length > 0 && (
        <div>
          <span className="label">Chi tiết (badge) — chọn nhiều được</span>
          <div className="flex flex-wrap gap-2">
            {itemBadges.map((b) => (
              <Chip key={b.id} small active={badgeIds.includes(b.id)} onClick={() => toggleBadge(b.id)} color={b.color}>
                {b.name}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="label">Số tiền</span>
        <MoneyInput value={amount} onChange={setAmount} autoFocus={!isEdit} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Ngày</span>
          <input type="date" className="input" value={date} max="2100-12-31" onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="block">
          <span className="label">Ghi chú</span>
          <input className="input" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Không bắt buộc" />
        </label>
      </div>

      {!showMore ? (
        <button type="button" className="text-sm font-medium text-accent" onClick={() => setShowMore(true)}>
          + Hình thức thanh toán, ảnh hoá đơn
        </button>
      ) : (
        <div className="space-y-4">
          <div>
            <span className="label">Hình thức thanh toán</span>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((p) => (
                <Chip
                  key={p.value}
                  small
                  active={payment === p.value}
                  onClick={() => setPayment(payment === p.value ? null : p.value)}
                >
                  {p.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Ảnh hoá đơn</span>
            <div className="flex items-center gap-3">
              {receiptPreview ? (
                <a href={receiptPreview} target="_blank" rel="noreferrer">
                  <img src={receiptPreview} alt="Hoá đơn" className="h-20 w-20 rounded-lg border border-line object-cover" />
                </a>
              ) : null}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPickFile(e.target.files?.[0])}
              />
              <button type="button" className="btn-ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Spinner className="h-4 w-4" /> : '📷'} {receiptPath ? 'Đổi ảnh' : 'Chọn / chụp ảnh'}
              </button>
              {receiptPath && (
                <button
                  type="button"
                  className="text-sm text-danger"
                  onClick={() => {
                    setReceiptPath(null)
                    setReceiptPreview(null)
                  }}
                >
                  Bỏ ảnh
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button type="submit" className="btn-primary min-w-32 flex-1 sm:flex-none" disabled={saving || uploading}>
          {saving ? <Spinner className="h-4 w-4 border-white/40 border-t-white" /> : null}
          {isEdit ? 'Cập nhật' : 'Lưu giao dịch'}
        </button>
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Huỷ
          </button>
        )}
        <div className="ml-auto">{extraActions}</div>
      </div>
    </form>
  )
}
