import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../components/Layout'
import { TransactionEditModal, TransactionRow } from '../components/TransactionRow'
import { DirectionTag, EmptyState, Spinner, useToast } from '../components/ui'
import { useCatalog } from '../context/CatalogContext'
import {
  errorMessage,
  fetchBadgeStats,
  fetchBreakdown,
  fetchTopTransactions,
  fetchTrend,
  type BadgeRow,
  type BreakdownRow,
  type TrendRow,
} from '../lib/api'
import { fmtMoney, fmtPct, fmtShort, pctChange } from '../lib/format'
import {
  bucketLabel,
  dayjs,
  PERIOD_LABELS,
  periodLabel,
  PREV_LABEL,
  rangeOf,
  shift,
  trendRange,
  type PeriodType,
} from '../lib/period'
import type { Direction, Transaction } from '../lib/types'
import { useThemeColors } from '../lib/useThemeColors'

interface Data {
  cur: BreakdownRow[]
  prev: BreakdownRow[]
  badgesCur: BadgeRow[]
  badgesPrev: BadgeRow[]
  trend: TrendRow[]
}

const sumDir = (rows: BreakdownRow[], d: Direction) => rows.filter((r) => r.direction === d).reduce((s, r) => s + Number(r.total), 0)

export function Stats() {
  const toast = useToast()
  const [type, setType] = useState<PeriodType>('month')
  const [anchor, setAnchor] = useState(dayjs())
  const [data, setData] = useState<Data | null>(null)
  const [topDir, setTopDir] = useState<Direction>('out')
  const [top, setTop] = useState<Transaction[] | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const range = useMemo(() => rangeOf(type, anchor), [type, anchor])
  const prevRange = useMemo(() => rangeOf(type, shift(type, anchor, -1)), [type, anchor])
  const trend = useMemo(() => trendRange(type, anchor), [type, anchor])

  useEffect(() => {
    let cancelled = false
    setData(null)
    Promise.all([
      fetchBreakdown(range.from, range.to),
      fetchBreakdown(prevRange.from, prevRange.to),
      fetchBadgeStats(range.from, range.to),
      fetchBadgeStats(prevRange.from, prevRange.to),
      fetchTrend(trend.from, trend.to, type),
    ])
      .then(([cur, prev, badgesCur, badgesPrev, tr]) => {
        if (!cancelled) setData({ cur, prev, badgesCur, badgesPrev, trend: tr })
      })
      .catch((e) => toast(errorMessage(e), 'error'))
    return () => {
      cancelled = true
    }
  }, [range, prevRange, trend, type, toast, reloadKey])

  useEffect(() => {
    let cancelled = false
    setTop(null)
    fetchTopTransactions(range.from, range.to, topDir, 10)
      .then((r) => !cancelled && setTop(r))
      .catch((e) => toast(errorMessage(e), 'error'))
    return () => {
      cancelled = true
    }
  }, [range, topDir, toast, reloadKey])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const isCurrent = range.from === rangeOf(type, dayjs()).from

  return (
    <>
      <PageHeader title="Thống kê" />

      {/* Chọn kỳ */}
      <div className="card mb-4 p-3">
        <div className="mb-3 grid grid-cols-4 gap-1 rounded-lg bg-surface-2 p-1" role="tablist">
          {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={type === t}
              onClick={() => setType(t)}
              className={`rounded-md py-1.5 text-sm font-semibold ${type === t ? 'bg-surface text-ink shadow-sm' : 'text-muted'}`}
            >
              {PERIOD_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost px-3" onClick={() => setAnchor((a) => shift(type, a, -1))} aria-label="Kỳ trước">
            ◀
          </button>
          <div className="min-w-0 flex-1 text-center">
            <div className="truncate font-semibold first-letter:uppercase">{periodLabel(type, anchor)}</div>
            {!isCurrent && (
              <button className="text-xs text-accent" onClick={() => setAnchor(dayjs())}>
                Về hiện tại
              </button>
            )}
          </div>
          <button className="btn-ghost px-3" onClick={() => setAnchor((a) => shift(type, a, 1))} aria-label="Kỳ sau">
            ▶
          </button>
        </div>
      </div>

      {!data ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          <SummaryCards data={data} type={type} />
          <TrendChart rows={data.trend} buckets={trend.buckets} type={type} currentBucket={range.from} />
          <CategoryBreakdown data={data} type={type} />
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-semibold">Top 10 giao dịch lớn</h2>
              <div className="flex rounded-lg bg-surface-2 p-1 text-sm">
                {(['out', 'in'] as Direction[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setTopDir(d)}
                    className={`rounded-md px-3 py-1 font-medium ${topDir === d ? 'bg-surface shadow-sm' : 'text-muted'}`}
                  >
                    {d === 'out' ? 'Tiền ra' : 'Tiền vào'}
                  </button>
                ))}
              </div>
            </div>
            {top === null ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : top.length === 0 ? (
              <EmptyState>Không có giao dịch trong kỳ.</EmptyState>
            ) : (
              <ol className="card divide-y divide-line overflow-hidden">
                {top.map((t, i) => (
                  <li key={t.id} className="flex items-center">
                    <span className="w-8 shrink-0 pl-3 text-sm font-bold text-muted tabular">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <TransactionRow txn={t} showDate={type !== 'day'} onClick={() => setEditing(t)} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}

      <TransactionEditModal txn={editing} onClose={() => setEditing(null)} onChanged={reload} />
    </>
  )
}

// ---------------------------------------------------------------------

function Delta({ cur, prev, direction, type }: { cur: number; prev: number; direction: Direction | 'net'; type: PeriodType }) {
  const p = pctChange(cur, prev)
  if (cur === prev) return <span className="text-xs text-muted">= {PREV_LABEL[type]}</span>
  if (p === null) return <span className="text-xs text-muted">{PREV_LABEL[type]}: 0 ₫</span>
  const up = cur > prev
  // tiền ra tăng là xấu; tiền vào / chênh lệch tăng là tốt
  const good = direction === 'out' ? !up : up
  return (
    <span className={`text-xs font-medium ${good ? 'text-in' : 'text-out'}`}>
      {up ? '▲' : '▼'} {fmtPct(p)} <span className="font-normal text-muted">so với {PREV_LABEL[type]}</span>
    </span>
  )
}

function SummaryCards({ data, type }: { data: Data; type: PeriodType }) {
  const inCur = sumDir(data.cur, 'in')
  const outCur = sumDir(data.cur, 'out')
  const inPrev = sumDir(data.prev, 'in')
  const outPrev = sumDir(data.prev, 'out')
  const cards = [
    { label: 'Tiền vào', cur: inCur, prev: inPrev, dir: 'in' as const, cls: 'text-in' },
    { label: 'Tiền ra', cur: outCur, prev: outPrev, dir: 'out' as const, cls: 'text-out' },
    { label: 'Chênh lệch', cur: inCur - outCur, prev: inPrev - outPrev, dir: 'net' as const, cls: '' },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="card p-4">
          <div className="text-sm text-muted">{c.label}</div>
          <div className={`my-1 text-2xl font-bold ${c.cls}`}>{fmtMoney(c.cur)}</div>
          <Delta cur={c.cur} prev={c.prev} direction={c.dir} type={type} />
          <div className="mt-0.5 text-xs text-muted tabular">
            {PREV_LABEL[type].charAt(0).toUpperCase() + PREV_LABEL[type].slice(1)}: {fmtMoney(c.prev)}
          </div>
        </div>
      ))}
    </div>
  )
}

function TrendChart({
  rows,
  buckets,
  type,
  currentBucket,
}: {
  rows: TrendRow[]
  buckets: string[]
  type: PeriodType
  currentBucket: string
}) {
  const c = useThemeColors()
  const chartData = buckets.map((b) => {
    const inV = rows.filter((r) => r.bucket === b && r.direction === 'in').reduce((s, r) => s + Number(r.total), 0)
    const outV = rows.filter((r) => r.bucket === b && r.direction === 'out').reduce((s, r) => s + Number(r.total), 0)
    return { bucket: b, label: bucketLabel(type, b), in: inV, out: outV }
  })
  const hasData = chartData.some((d) => d.in || d.out)
  const [showTable, setShowTable] = useState(false)

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">So sánh {chartData.length} {PERIOD_LABELS[type].toLowerCase()} gần nhất</h2>
        <button className="text-xs text-accent" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Xem biểu đồ' : 'Xem bảng'}
        </button>
      </div>
      {!hasData ? (
        <EmptyState>Chưa có dữ liệu.</EmptyState>
      ) : showTable ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm tabular">
            <thead className="sticky top-0 bg-surface text-left text-xs text-muted">
              <tr>
                <th className="py-1.5 font-medium">Kỳ</th>
                <th className="py-1.5 text-right font-medium">Tiền vào</th>
                <th className="py-1.5 text-right font-medium">Tiền ra</th>
                <th className="py-1.5 text-right font-medium">Chênh lệch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...chartData].reverse().map((d) => (
                <tr key={d.bucket} className={d.bucket === currentBucket ? 'font-semibold' : ''}>
                  <td className="py-1.5">{d.label}</td>
                  <td className="py-1.5 text-right text-in">{fmtMoney(d.in)}</td>
                  <td className="py-1.5 text-right text-out">{fmtMoney(d.out)}</td>
                  <td className="py-1.5 text-right">{fmtMoney(d.in - d.out)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={2} barCategoryGap="20%" margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={c.line} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={{ stroke: c.line }}
                tick={{ fill: c.muted, fontSize: 11 }}
                interval="preserveStartEnd"
                minTickGap={8}
              />
              <YAxis
                tickFormatter={(v) => fmtShort(v)}
                tickLine={false}
                axisLine={false}
                tick={{ fill: c.muted, fontSize: 11 }}
                width={52}
              />
              <Tooltip
                cursor={{ fill: c.line, opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as (typeof chartData)[number]
                  return (
                    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg tabular">
                      <div className="mb-1 font-semibold text-ink">{d.label}</div>
                      <Row color={c.in} label="Tiền vào" value={fmtMoney(d.in)} />
                      <Row color={c.out} label="Tiền ra" value={fmtMoney(d.out)} />
                      <div className="mt-1 border-t border-line pt-1 text-ink-2">Chênh lệch: {fmtMoney(d.in - d.out)}</div>
                    </div>
                  )
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v) => <span style={{ color: c.ink2, fontSize: 12 }}>{v}</span>}
              />
              <Bar dataKey="in" name="Tiền vào" fill={c.in} radius={[4, 4, 0, 0]} maxBarSize={28} />
              <Bar dataKey="out" name="Tiền ra" fill={c.out} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

function Row({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-2">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="flex-1">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  )
}

// ---------------------------------------------------------------------

function CategoryBreakdown({ data, type }: { data: Data; type: PeriodType }) {
  const { categories, categoryByCode, itemById, badges } = useCatalog()
  const [shareDir, setShareDir] = useState<Direction>('out')
  const [open, setOpen] = useState<Set<string>>(new Set())

  const toggle = (k: string) =>
    setOpen((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })

  const byItem = (rows: BreakdownRow[]) => {
    const m = new Map<string, { total: number; count: number }>()
    for (const r of rows) m.set(r.item_id, { total: Number(r.total), count: Number(r.txn_count) })
    return m
  }
  const curItem = byItem(data.cur)
  const prevItem = byItem(data.prev)
  const badgeCur = new Map(data.badgesCur.map((b) => [b.badge_id, Number(b.total)]))
  const badgePrev = new Map(data.badgesPrev.map((b) => [b.badge_id, Number(b.total)]))

  // gom theo nhóm (kể cả nhóm đã ẩn nếu có giao dịch)
  const codes = new Set([...data.cur.map((r) => r.category_code), ...data.prev.map((r) => r.category_code)])
  const cats = categories
    .filter((c) => codes.has(c.code))
    .map((c) => {
      const cur = data.cur.filter((r) => r.category_code === c.code)
      const prev = data.prev.filter((r) => r.category_code === c.code)
      const itemIds = [...new Set([...cur, ...prev].map((r) => r.item_id))]
      return {
        cat: c,
        inCur: sumDir(cur, 'in'),
        outCur: sumDir(cur, 'out'),
        inPrev: sumDir(prev, 'in'),
        outPrev: sumDir(prev, 'out'),
        items: itemIds
          .map((id) => ({
            item: itemById.get(id),
            id,
            cur: curItem.get(id)?.total ?? 0,
            count: curItem.get(id)?.count ?? 0,
            prev: prevItem.get(id)?.total ?? 0,
          }))
          .sort((a, b) => b.cur - a.cur || b.prev - a.prev),
      }
    })
    .sort((a, b) => b.outCur + b.inCur - (a.outCur + a.inCur))

  const shareTotal = cats.reduce((s, c) => s + (shareDir === 'in' ? c.inCur : c.outCur), 0)
  const shareRows = cats
    .map((c) => ({ cat: c.cat, v: shareDir === 'in' ? c.inCur : c.outCur }))
    .filter((r) => r.v > 0)
    .sort((a, b) => b.v - a.v)

  if (cats.length === 0) return <EmptyState>Không có giao dịch trong kỳ này.</EmptyState>

  return (
    <>
      {/* Cơ cấu */}
      <section className="card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">Cơ cấu theo nhóm</h2>
          <div className="flex rounded-lg bg-surface-2 p-1 text-sm">
            {(['out', 'in'] as Direction[]).map((d) => (
              <button
                key={d}
                onClick={() => setShareDir(d)}
                className={`rounded-md px-3 py-1 font-medium ${shareDir === d ? 'bg-surface shadow-sm' : 'text-muted'}`}
              >
                {d === 'out' ? 'Tiền ra' : 'Tiền vào'}
              </button>
            ))}
          </div>
        </div>
        {shareRows.length === 0 ? (
          <p className="text-sm text-muted">Không có {shareDir === 'out' ? 'khoản chi' : 'khoản thu'} trong kỳ.</p>
        ) : (
          <ul className="space-y-3">
            {shareRows.map((r) => (
              <li key={r.cat.code}>
                <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.cat.color }} />
                    {r.cat.icon} {r.cat.name}
                  </span>
                  <span className="tabular text-ink-2">
                    <b className="text-ink">{fmtMoney(r.v)}</b> · {fmtPct(r.v / shareTotal).replace('+', '')}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${(r.v / shareTotal) * 100}%`, background: r.cat.color }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Chi tiết theo nhóm */}
      <section>
        <h2 className="mb-2 font-semibold">Chi tiết theo nhóm</h2>
        <div className="space-y-3">
          {cats.map((c) => {
            const isOpen = open.has(c.cat.code)
            const net = c.inCur - c.outCur
            const netPrev = c.inPrev - c.outPrev
            return (
              <div key={c.cat.code} className="card overflow-hidden">
                <button className="w-full p-4 text-left hover:bg-surface-2" onClick={() => toggle(c.cat.code)} aria-expanded={isOpen}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ background: c.cat.color }} />
                    <span className="font-semibold">
                      {c.cat.icon} {categoryByCode.get(c.cat.code)?.name}
                    </span>
                    <span className="ml-auto text-muted">{isOpen ? '▴' : '▾'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <Metric label="Vào" value={c.inCur} cls="text-in" delta={<Delta cur={c.inCur} prev={c.inPrev} direction="in" type={type} />} show={c.inCur > 0 || c.inPrev > 0} />
                    <Metric label="Ra" value={c.outCur} cls="text-out" delta={<Delta cur={c.outCur} prev={c.outPrev} direction="out" type={type} />} show={c.outCur > 0 || c.outPrev > 0} />
                    <Metric label="Chênh lệch" value={net} cls="" delta={<Delta cur={net} prev={netPrev} direction="net" type={type} />} show={c.inCur > 0 && c.outCur > 0} />
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-line bg-surface-2/50">
                    <table className="w-full text-sm tabular">
                      <thead className="text-left text-xs text-muted">
                        <tr>
                          <th className="px-4 py-2 font-medium">Khoản</th>
                          <th className="px-2 py-2 text-right font-medium">Kỳ này</th>
                          <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">{PREV_LABEL[type]}</th>
                          <th className="px-4 py-2 text-right font-medium">Thay đổi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {c.items.map((it) => {
                          const itemBadges = badges.filter((b) => b.item_id === it.id && (badgeCur.has(b.id) || badgePrev.has(b.id)))
                          const key = `${c.cat.code}:${it.id}`
                          const bOpen = open.has(key)
                          return (
                            <ItemRows
                              key={it.id}
                              name={it.item?.name ?? '?'}
                              direction={it.item?.direction ?? 'out'}
                              cur={it.cur}
                              prev={it.prev}
                              count={it.count}
                              type={type}
                              expandable={itemBadges.length > 0}
                              expanded={bOpen}
                              onToggle={() => toggle(key)}
                              badges={itemBadges.map((b) => ({
                                id: b.id,
                                name: b.name,
                                color: b.color,
                                cur: badgeCur.get(b.id) ?? 0,
                                prev: badgePrev.get(b.id) ?? 0,
                              }))}
                            />
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </>
  )
}

function Metric({ label, value, cls, delta, show }: { label: string; value: number; cls: string; delta: React.ReactNode; show: boolean }) {
  if (!show) return <div />
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted">{label}</div>
      <div className={`truncate font-semibold tabular ${cls}`}>{fmtMoney(value)}</div>
      <div className="hidden truncate sm:block">{delta}</div>
    </div>
  )
}

function ChangeCell({ cur, prev, direction }: { cur: number; prev: number; direction: Direction }) {
  const p = pctChange(cur, prev)
  if (cur === prev) return <span className="text-muted">—</span>
  if (p === null) return <span className="text-muted">mới</span>
  const up = cur > prev
  const good = direction === 'out' ? !up : up
  return (
    <span className={good ? 'text-in' : 'text-out'}>
      {up ? '▲' : '▼'} {fmtPct(p)}
    </span>
  )
}

function ItemRows(props: {
  name: string
  direction: Direction
  cur: number
  prev: number
  count: number
  type: PeriodType
  expandable: boolean
  expanded: boolean
  onToggle: () => void
  badges: { id: string; name: string; color: string; cur: number; prev: number }[]
}) {
  const { name, direction, cur, prev, count, expandable, expanded, onToggle, badges } = props
  return (
    <>
      <tr className={expandable ? 'cursor-pointer hover:bg-surface-2' : ''} onClick={expandable ? onToggle : undefined}>
        <td className="px-4 py-2">
          <span className="flex flex-wrap items-center gap-1.5">
            {expandable && <span className="text-xs text-muted">{expanded ? '▾' : '▸'}</span>}
            <span className="font-medium">{name}</span>
            <DirectionTag direction={direction} />
            {count > 0 && <span className="text-xs text-muted">{count} gd</span>}
          </span>
        </td>
        <td className="px-2 py-2 text-right font-semibold">{fmtMoney(cur)}</td>
        <td className="hidden px-2 py-2 text-right text-muted sm:table-cell">{fmtMoney(prev)}</td>
        <td className="px-4 py-2 text-right text-xs">
          <ChangeCell cur={cur} prev={prev} direction={direction} />
        </td>
      </tr>
      {expanded &&
        badges.map((b) => (
          <tr key={b.id} className="bg-surface/60 text-xs">
            <td className="py-1.5 pl-10 pr-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                {b.name}
              </span>
            </td>
            <td className="px-2 py-1.5 text-right">{fmtMoney(b.cur)}</td>
            <td className="hidden px-2 py-1.5 text-right text-muted sm:table-cell">{fmtMoney(b.prev)}</td>
            <td className="px-4 py-1.5 text-right">
              <ChangeCell cur={b.cur} prev={b.prev} direction={direction} />
            </td>
          </tr>
        ))}
    </>
  )
}
