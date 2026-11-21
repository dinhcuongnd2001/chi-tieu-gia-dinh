import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DatePicker } from '../components/DatePicker'
import { PageHeader } from '../components/Layout'
import { TransactionEditModal, TransactionRow } from '../components/TransactionRow'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Scale,
  TrendingDown,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { DirectionTag, EmptyState, SkeletonList, Spinner, StatTile, useToast } from '../components/ui'
import { useCatalog } from '../context/CatalogContext'
import { useDataVersion } from '../lib/dataSync'
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
  ymd,
  type PeriodType,
} from '../lib/period'
import type { Direction, Transaction } from '../lib/types'
import { useThemeColors } from '../lib/useThemeColors'
import { CategoryIcon } from '../lib/categoryIcons'

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
  const { version } = useDataVersion()

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
  }, [range, prevRange, trend, type, toast, version])

  useEffect(() => {
    let cancelled = false
    setTop(null)
    fetchTopTransactions(range.from, range.to, topDir, 10)
      .then((r) => !cancelled && setTop(r))
      .catch((e) => toast(errorMessage(e), 'error'))
    return () => {
      cancelled = true
    }
  }, [range, topDir, toast, version])

  const isCurrent = range.from === rangeOf(type, dayjs()).from

  return (
    <>
      <PageHeader title="Thống kê" sub="So sánh thu chi theo kỳ và theo từng nhóm" />

      {/* Chọn kỳ */}
      <div className="card sticky top-[60px] z-20 mb-5 flex flex-col gap-3 p-3 lg:top-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="seg grid w-full grid-cols-4 lg:flex lg:w-auto" role="tablist">
          {(Object.keys(PERIOD_LABELS) as PeriodType[]).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={type === t}
              onClick={() => setType(t)}
            >
              {PERIOD_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 lg:min-w-[400px]">
          <button className="btn-icon" onClick={() => setAnchor((a) => shift(type, a, -1))} aria-label="Kỳ trước">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <DatePicker
              value={ymd(anchor)}
              onChange={(v) => v && setAnchor(dayjs(v))}
              renderTrigger={({ open, isOpen, ref }) => (
                <button
                  ref={ref}
                  type="button"
                  onClick={open}
                  aria-label="Chọn ngày xem thống kê"
                  aria-expanded={isOpen}
                  className={`mx-auto flex max-w-full items-center justify-center gap-2 rounded-xl px-3 py-1.5 font-display text-[15px] font-bold transition hover:bg-[rgba(176,132,64,.1)] sm:text-base ${
                    isOpen ? 'bg-[rgba(176,132,64,.1)]' : ''
                  }`}
                >
                  <CalendarDays className="h-4 w-4 shrink-0 text-accent" />
                  <span className="truncate first-letter:uppercase">{periodLabel(type, anchor)}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-muted transition ${isOpen ? 'rotate-180' : ''}`} />
                </button>
              )}
            />
            {!isCurrent && (
              <button className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-link hover:underline" onClick={() => setAnchor(dayjs())}>
                <RotateCcw className="h-3 w-3" /> Về hiện tại
              </button>
            )}
          </div>
          <button className="btn-icon" onClick={() => setAnchor((a) => shift(type, a, 1))} aria-label="Kỳ sau">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {!data ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card-solid space-y-3 p-4">
                <span className="skel h-3 w-1/3" />
                <span className="skel h-6 w-2/3" />
                <span className="skel h-2.5 w-1/2" />
              </div>
            ))}
          </div>
          <SkeletonList rows={3} />
        </div>
      ) : (
        <div className="space-y-5">
          <SummaryCards data={data} type={type} />
          <div className="grid gap-5 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <TrendChart rows={data.trend} buckets={trend.buckets} type={type} currentBucket={range.from} />
            </div>
            <div className="min-w-0 lg:col-span-2">
              <CategoryBreakdown data={data} type={type} part="share" />
            </div>
          </div>
          <div className="grid items-start gap-5 lg:grid-cols-5">
            <div className="min-w-0 lg:col-span-3">
              <CategoryBreakdown data={data} type={type} part="detail" />
            </div>
          <section className="card min-w-0 p-4 sm:p-5 lg:col-span-2">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="card-title">Top 10 giao dịch lớn</h3>
              <div className="seg">
                {(['out', 'in'] as Direction[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setTopDir(d)}
                    aria-pressed={topDir === d}
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
              <ol className="divide-y divide-line overflow-hidden rounded-2xl border border-line-2 bg-white/75">
                {top.map((t, i) => (
                  <li key={t.id} className={`flex items-center ${i === 0 ? 'bg-[linear-gradient(120deg,rgba(251,191,36,.16),rgba(207,169,106,.12))]' : ''}`}>
                    <span className="grid w-10 shrink-0 place-items-center pl-2 font-display text-sm font-bold tabular text-muted">
                      {i === 0 ? (
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-[rgba(251,191,36,.3)] text-[#b45309]">
                          <Trophy className="h-4 w-4" />
                        </span>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <TransactionRow txn={t} showDate={type !== 'day'} onClick={() => setEditing(t)} />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
          </div>
        </div>
      )}

      <TransactionEditModal txn={editing} onClose={() => setEditing(null)} onChanged={() => {}} />
    </>
  )
}

// ---------------------------------------------------------------------

function Delta({ cur, prev, direction, type }: { cur: number; prev: number; direction: Direction | 'net'; type: PeriodType }) {
  const p = pctChange(cur, prev)
  if (cur === prev) return <span className="text-xs text-muted">Không đổi so với {PREV_LABEL[type]}</span>
  if (p === null) return <span className="text-xs text-muted">Chưa có số liệu {PREV_LABEL[type]} để so sánh</span>
  const up = cur > prev
  // tiền ra tăng là xấu; tiền vào / chênh lệch tăng là tốt
  const good = direction === 'out' ? !up : up
  return (
    <span className={`text-xs font-semibold ${good ? 'text-in' : 'text-out'}`}>
      {up ? <TrendingUp className="mr-0.5 inline h-3.5 w-3.5" /> : <TrendingDown className="mr-0.5 inline h-3.5 w-3.5" />}
      {fmtPct(p)} <span className="font-normal text-muted">so với {PREV_LABEL[type]}</span>
    </span>
  )
}

function SummaryCards({ data, type }: { data: Data; type: PeriodType }) {
  const inCur = sumDir(data.cur, 'in')
  const outCur = sumDir(data.cur, 'out')
  const inPrev = sumDir(data.prev, 'in')
  const outPrev = sumDir(data.prev, 'out')
  const cards = [
    { label: 'Tiền vào', cur: inCur, prev: inPrev, dir: 'in' as const, tone: 'in' as const, icon: ArrowDownLeft },
    { label: 'Tiền ra', cur: outCur, prev: outPrev, dir: 'out' as const, tone: 'out' as const, icon: ArrowUpRight },
    { label: 'Chênh lệch', cur: inCur - outCur, prev: inPrev - outPrev, dir: 'net' as const, tone: 'neutral' as const, icon: Scale },
  ]
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map((c) => (
        <StatTile key={c.label} label={c.label} value={fmtMoney(c.cur)} tone={c.tone} icon={c.icon}>
          <div className="mt-2.5">
            <Delta cur={c.cur} prev={c.prev} direction={c.dir} type={type} />
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted tabular">
            {PREV_LABEL[type].charAt(0).toUpperCase() + PREV_LABEL[type].slice(1)}: {fmtMoney(c.prev)}
          </div>
        </StatTile>
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
    <section className="card h-full p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="card-title">So sánh {chartData.length} {PERIOD_LABELS[type].toLowerCase()} gần nhất</h3>
        <button className="text-xs font-semibold text-link hover:underline" onClick={() => setShowTable((v) => !v)}>
          {showTable ? 'Xem biểu đồ' : 'Xem bảng'}
        </button>
      </div>
      {!hasData ? (
        <EmptyState>Chưa có dữ liệu.</EmptyState>
      ) : showTable ? (
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-sm tabular">
            <thead className="sticky top-0 bg-white text-left text-xs text-muted">
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
        <div className="h-64 lg:h-[300px]">
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
                    <div className="rounded-xl border border-line-2 bg-white px-3 py-2.5 text-xs tabular shadow-[0_10px_28px_rgba(74,58,30,.18)]">
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

function CategoryBreakdown({ data, type, part }: { data: Data; type: PeriodType; part: 'share' | 'detail' }) {
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

  if (cats.length === 0)
    return part === 'share' ? <EmptyState title="Chưa có dữ liệu">Không có giao dịch trong kỳ này.</EmptyState> : null

  return (
    <>
      {part === 'share' && (
        <section className="card h-full p-4 sm:p-5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="card-title">Cơ cấu theo nhóm</h3>
            <div className="seg">
              {(['out', 'in'] as Direction[]).map((d) => (
                <button key={d} onClick={() => setShareDir(d)} aria-pressed={shareDir === d}>
                  {d === 'out' ? 'Chi' : 'Thu'}
                </button>
              ))}
            </div>
          </div>
          {shareRows.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Không có {shareDir === 'out' ? 'khoản chi' : 'khoản thu'} trong kỳ.</p>
          ) : (
            <ShareDonut rows={shareRows} total={shareTotal} label={shareDir === 'out' ? 'Tổng chi' : 'Tổng thu'} />
          )}
        </section>
      )}

      {/* Chi tiết theo nhóm */}
      {part === 'detail' && (
      <section>
        <h3 className="card-title mb-3 px-1">Chi tiết theo nhóm</h3>
        <div className="space-y-3">
          {cats.map((c) => {
            const isOpen = open.has(c.cat.code)
            const net = c.inCur - c.outCur
            const netPrev = c.inPrev - c.outPrev
            return (
              <div key={c.cat.code} className="card overflow-hidden">
                <button className="w-full p-4 text-left transition hover:bg-white/50 sm:p-5" onClick={() => toggle(c.cat.code)} aria-expanded={isOpen}>
                  <div className="mb-2 flex items-center gap-2">
                    <CategoryIcon icon={c.cat.icon} color={c.cat.color} size={36} />
                    <span className="font-display text-[15.5px] font-bold">{categoryByCode.get(c.cat.code)?.name}</span>
                    <ChevronDown className={`ml-auto h-5 w-5 text-muted transition ${isOpen ? 'rotate-180' : ''}`} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <Metric label="Vào" value={c.inCur} cls="text-in" delta={<Delta cur={c.inCur} prev={c.inPrev} direction="in" type={type} />} show={c.inCur > 0 || c.inPrev > 0} />
                    <Metric label="Ra" value={c.outCur} cls="text-out" delta={<Delta cur={c.outCur} prev={c.outPrev} direction="out" type={type} />} show={c.outCur > 0 || c.outPrev > 0} />
                    <Metric label="Chênh lệch" value={net} cls="" delta={<Delta cur={net} prev={netPrev} direction="net" type={type} />} show={c.inCur > 0 && c.outCur > 0} />
                  </div>
                </button>
                {isOpen && (
                  <div className="overflow-x-auto border-t border-line bg-white/60">
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
      )}
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
      {up ? <TrendingUp className="mr-0.5 inline h-3.5 w-3.5" /> : <TrendingDown className="mr-0.5 inline h-3.5 w-3.5" />}
      {fmtPct(p)}
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
      <tr className={expandable ? 'cursor-pointer hover:bg-[rgba(176,132,64,.05)]' : ''} onClick={expandable ? onToggle : undefined}>
        <td className="px-4 py-2">
          <span className="flex flex-wrap items-center gap-1.5">
            {expandable && <ChevronRight className={`h-3.5 w-3.5 text-muted transition ${expanded ? 'rotate-90' : ''}`} />}
            <span className="font-medium">{name}</span>
            <DirectionTag direction={direction} />
            {count > 0 && <span className="text-xs text-muted">{count} gd</span>}
          </span>
        </td>
        <td className="px-2 py-2.5 text-right font-display font-semibold">{fmtMoney(cur)}</td>
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

const OTHER_COLOR = '#a99f8c'

function ShareDonut({ rows, total, label }: { rows: { cat: { code: string; name: string; color: string; icon: string | null }; v: number }[]; total: number; label: string }) {
  const [active, setActive] = useState<number | null>(null)
  // tối đa 6 lát, phần còn lại gộp "Khác"
  const top = rows.slice(0, 6)
  const rest = rows.slice(6).reduce((s, r) => s + r.v, 0)
  const slices = [
    ...top.map((r) => ({ key: r.cat.code, name: r.cat.name, icon: r.cat.icon, color: r.cat.color, v: r.v })),
    ...(rest > 0 ? [{ key: '__other', name: 'Khác', icon: 'other', color: OTHER_COLOR, v: rest }] : []),
  ]
  const pct = (v: number) => `${Math.round((v / total) * 1000) / 10}%`
  const cur = active !== null ? slices[active] : null

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col">
      <div className="relative h-[200px] w-[200px] shrink-0" onMouseLeave={() => setActive(null)}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="v"
              nameKey="name"
              innerRadius={66}
              outerRadius={94}
              paddingAngle={slices.length > 1 ? 2 : 0}
              cornerRadius={4}
              stroke="#fff"
              strokeWidth={2}
              onMouseEnter={(_, i) => setActive(i)}
              onClick={(_, i) => setActive(active === i ? null : i)}
            >
              {slices.map((sl, i) => (
                <Cell
                  key={sl.key}
                  fill={sl.color}
                  style={{ transition: 'opacity .2s', cursor: 'pointer', outline: 'none' }}
                  opacity={active === null || active === i ? 1 : 0.35}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        {/* Nhãn giữa vòng: tổng, hoặc nhóm đang chọn */}
        <div className="pointer-events-none absolute inset-[38px] grid place-items-center text-center">
          {cur ? (
            <div className="min-w-0">
              <div className="truncate px-1 text-[11.5px] font-semibold text-ink-2">{cur.name}</div>
              <div className="font-display text-[17px] font-bold leading-tight tabular">{fmtShort(cur.v)}</div>
              <div className="text-[11.5px] font-semibold tabular text-muted">{pct(cur.v)}</div>
            </div>
          ) : (
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</div>
              <div className="font-display text-[19px] font-bold leading-tight tabular">{fmtShort(total)}</div>
              <div className="text-[11px] text-muted">{slices.length} nhóm</div>
            </div>
          )}
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1">
        {slices.map((sl, i) => (
          <li key={sl.key}>
            <button
              type="button"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left text-[13px] transition ${
                active === i ? 'bg-white shadow-[0_2px_10px_rgba(74,58,30,.08)]' : 'hover:bg-white/60'
              }`}
            >
              <CategoryIcon icon={sl.icon} color={sl.color} size={28} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{sl.name}</span>
                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-[rgba(60,48,28,.08)]">
                  <span className="block h-full rounded-full" style={{ width: pct(sl.v), background: sl.color }} />
                </span>
              </span>
              <span className="w-12 shrink-0 text-right text-[12px] font-semibold tabular text-muted">{pct(sl.v)}</span>
              <span className="w-[92px] shrink-0 text-right font-display font-bold tabular">{fmtMoney(sl.v)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
