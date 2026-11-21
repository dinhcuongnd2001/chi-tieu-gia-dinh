import { useCallback, useEffect, useMemo, useState } from 'react'
import { DatePicker } from '../components/DatePicker'
import { PageHeader } from '../components/Layout'
import { TransactionEditModal, TransactionRow } from '../components/TransactionRow'
import { ArrowDownLeft, ArrowUpRight, ChevronDown, Download, Scale, Search, SearchX, SlidersHorizontal } from 'lucide-react'
import { EmptyState, SkeletonList, StatTile, useToast } from '../components/ui'
import { useCatalog } from '../context/CatalogContext'
import { useDataVersion } from '../lib/dataSync'
import { errorMessage, fetchTransactions } from '../lib/api'
import { fmtMoney } from '../lib/format'
import { dateHeading, dayjs, ymd } from '../lib/period'
import { PAYMENT_METHODS, paymentLabel, type Transaction } from '../lib/types'

const PRESETS = [
  { key: 'this_month', label: 'Tháng này', range: () => [dayjs().startOf('month'), dayjs().endOf('month')] },
  { key: 'last_month', label: 'Tháng trước', range: () => [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  { key: '7d', label: '7 ngày', range: () => [dayjs().subtract(6, 'day'), dayjs()] },
  { key: '30d', label: '30 ngày', range: () => [dayjs().subtract(29, 'day'), dayjs()] },
  { key: 'this_year', label: 'Năm nay', range: () => [dayjs().startOf('year'), dayjs().endOf('year')] },
] as const

const PAGE_DAYS = 30

export function History() {
  const { categories, items, badges, members, categoryByCode, itemById, badgeById, memberNameByUserId } = useCatalog()
  const toast = useToast()
  const { version } = useDataVersion()

  const [from, setFrom] = useState(ymd(dayjs().startOf('month')))
  const [to, setTo] = useState(ymd(dayjs().endOf('month')))
  const [category, setCategory] = useState('')
  const [itemId, setItemId] = useState('')
  const [badgeId, setBadgeId] = useState('')
  const [direction, setDirection] = useState<'' | 'in' | 'out'>('')
  const [payment, setPayment] = useState('')
  const [memberId, setMemberId] = useState('')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const [rows, setRows] = useState<Transaction[] | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [daysShown, setDaysShown] = useState(PAGE_DAYS)

  const load = useCallback(async () => {
    try {
      setRows(await fetchTransactions(from, to))
    } catch (e) {
      toast(errorMessage(e), 'error')
      setRows([])
    }
  }, [from, to, toast, version])

  useEffect(() => {
    setRows(null)
    setDaysShown(PAGE_DAYS)
  }, [from, to])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    if (!rows) return []
    const q = search.trim().toLowerCase()
    return rows.filter(
      (t) =>
        (!category || t.category_code === category) &&
        (!itemId || t.item_id === itemId) &&
        (!badgeId || t.transaction_badges.some((b) => b.badge_id === badgeId)) &&
        (!direction || t.direction === direction) &&
        (!payment || t.payment_method === payment) &&
        (!memberId || t.created_by === memberId) &&
        (!q || (t.note ?? '').toLowerCase().includes(q) || (itemById.get(t.item_id)?.name ?? '').toLowerCase().includes(q)),
    )
  }, [rows, category, itemId, badgeId, direction, payment, memberId, search, itemById])

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of filtered) {
      const arr = map.get(t.txn_date) ?? []
      arr.push(t)
      map.set(t.txn_date, arr)
    }
    return [...map.entries()]
  }, [filtered])

  const totalIn = filtered.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
  const totalOut = filtered.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
  const activeFilterCount = [category, itemId, badgeId, direction, payment, memberId, search].filter(Boolean).length

  const itemOptions = items.filter((i) => !category || i.category_code === category)
  const badgeOptions = badges.filter((b) => (itemId ? b.item_id === itemId : itemOptions.some((i) => i.id === b.item_id)))

  async function exportExcel() {
    const XLSX = await import('xlsx')
    const data = filtered.map((t) => ({
      'Ngày': dayjs(t.txn_date).format('DD/MM/YYYY'),
      'Nhóm': categoryByCode.get(t.category_code)?.name ?? '',
      'Khoản': itemById.get(t.item_id)?.name ?? '',
      'Badge': t.transaction_badges.map((b) => badgeById.get(b.badge_id)?.name).filter(Boolean).join(', '),
      'Loại': t.direction === 'in' ? 'Tiền vào' : 'Tiền ra',
      'Số tiền': t.direction === 'in' ? t.amount : -t.amount,
      'Thanh toán': paymentLabel(t.payment_method),
      'Ghi chú': t.note ?? '',
      'Người nhập': memberNameByUserId.get(t.created_by) ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    ws['!cols'] = [12, 20, 20, 18, 10, 14, 14, 30, 14].map((wch) => ({ wch }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Giao dịch')
    XLSX.writeFile(wb, `chi-tieu_${from}_${to}.xlsx`)
  }

  const resetFilters = () => {
    setCategory('')
    setItemId('')
    setBadgeId('')
    setDirection('')
    setPayment('')
    setMemberId('')
    setSearch('')
  }

  return (
    <>
      <PageHeader title="Lịch sử" sub="Tra cứu, lọc và chỉnh sửa giao dịch">
        <button className="btn-ghost" onClick={exportExcel} disabled={!filtered.length}>
          <Download className="h-4 w-4" /> Xuất Excel
        </button>
      </PageHeader>

      <div className="card mb-4 space-y-3 p-3.5 sm:p-5">
        <div className="seg max-w-full flex-wrap">
          {PRESETS.map((p) => {
            const [a, b] = p.range()
            const active = ymd(a) === from && ymd(b) === to
            return (
              <button
                key={p.key}
                onClick={() => {
                  setFrom(ymd(a))
                  setTo(ymd(b))
                }}
                aria-pressed={active}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_2fr_auto]">
          <DatePicker
            value={from}
            max={to}
            ariaLabel="Từ ngày"
            className="w-full py-2"
            onChange={(v) => v && setFrom(v)}
          />
          <DatePicker
            value={to}
            min={from}
            ariaLabel="Đến ngày"
            className="w-full py-2"
            onChange={(v) => v && setTo(v)}
          />
          <div className="relative col-span-2 flex items-center sm:col-span-1">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted" />
            <input className="input py-2 pl-10 text-sm" placeholder="Tìm theo ghi chú, tên khoản…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn-ghost col-span-2 py-2 sm:col-span-1" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal className="h-4 w-4" />
            Bộ lọc
            {activeFilterCount > 0 && (
              <span className="bg-grad grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] text-white">{activeFilterCount}</span>
            )}
            <ChevronDown className={`h-4 w-4 transition ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-3 lg:grid-cols-6">
            <select className="input py-2 text-sm" value={direction} onChange={(e) => setDirection(e.target.value as '' | 'in' | 'out')} aria-label="Loại">
              <option value="">Vào & ra</option>
              <option value="in">Tiền vào</option>
              <option value="out">Tiền ra</option>
            </select>
            <select
              className="input py-2 text-sm"
              value={category}
              aria-label="Nhóm"
              onChange={(e) => {
                setCategory(e.target.value)
                setItemId('')
                setBadgeId('')
              }}
            >
              <option value="">Tất cả nhóm</option>
              {categories.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="input py-2 text-sm"
              value={itemId}
              aria-label="Khoản"
              onChange={(e) => {
                setItemId(e.target.value)
                setBadgeId('')
              }}
            >
              <option value="">Tất cả khoản</option>
              {itemOptions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <select className="input py-2 text-sm" value={badgeId} onChange={(e) => setBadgeId(e.target.value)} aria-label="Badge">
              <option value="">Tất cả badge</option>
              {badgeOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {itemById.get(b.item_id)?.name} · {b.name}
                </option>
              ))}
            </select>
            <select className="input py-2 text-sm" value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Thanh toán">
              <option value="">Mọi hình thức</option>
              {PAYMENT_METHODS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select className="input py-2 text-sm" value={memberId} onChange={(e) => setMemberId(e.target.value)} aria-label="Người nhập">
              <option value="">Mọi người</option>
              {members
                .filter((m) => m.user_id)
                .map((m) => (
                  <option key={m.id} value={m.user_id!}>
                    {m.display_name}
                  </option>
                ))}
            </select>
            {activeFilterCount > 0 && (
              <button className="col-span-2 text-left text-sm font-semibold text-link hover:underline sm:col-span-3 lg:col-span-6" onClick={resetFilters}>
                Xoá bộ lọc
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <StatTile compact label="Tiền vào" value={fmtMoney(totalIn)} tone="in" icon={ArrowDownLeft} />
        <StatTile compact label="Tiền ra" value={fmtMoney(totalOut)} tone="out" icon={ArrowUpRight} />
        <StatTile compact label="Chênh lệch" value={fmtMoney(totalIn - totalOut)} icon={Scale} />
      </div>

      {rows === null ? (
        <SkeletonList rows={5} />
      ) : groups.length === 0 ? (
        <EmptyState icon={SearchX} title="Không có giao dịch">
          Không tìm thấy giao dịch nào trong khoảng ngày / bộ lọc đã chọn.
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{filtered.length} giao dịch</p>
          {groups.slice(0, daysShown).map(([date, list]) => {
            const dIn = list.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0)
            const dOut = list.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0)
            return (
              <section key={date}>
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 px-1">
                  <h3 className="text-[13.5px] font-bold">{dateHeading(date)}</h3>
                  <span className="font-display tabular text-xs font-semibold text-muted">
                    {dIn > 0 && <span className="text-in">+{fmtMoney(dIn)}</span>}
                    {dIn > 0 && dOut > 0 && ' · '}
                    {dOut > 0 && <span className="text-out">−{fmtMoney(dOut)}</span>}
                  </span>
                </div>
                <div className="card divide-y divide-line overflow-hidden">
                  {list.map((t) => (
                    <TransactionRow key={t.id} txn={t} onClick={() => setEditing(t)} />
                  ))}
                </div>
              </section>
            )
          })}
          {groups.length > daysShown && (
            <button className="btn-ghost w-full" onClick={() => setDaysShown((n) => n + PAGE_DAYS)}>
              Xem thêm
            </button>
          )}
        </div>
      )}

      <TransactionEditModal txn={editing} onClose={() => setEditing(null)} onChanged={() => {}} />
    </>
  )
}

