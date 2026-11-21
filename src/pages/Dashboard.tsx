import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { ArrowDownLeft, ArrowUpRight, ChevronRight, PieChart, Sparkles, TrendingDown, TrendingUp, Wallet } from 'lucide-react'
import { TransactionEditModal, TransactionRow } from '../components/TransactionRow'
import { EmptyState, SkeletonList, useToast } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { useQuickAdd } from '../context/QuickAddContext'
import { useDataVersion } from '../lib/dataSync'
import { errorMessage, fetchBreakdown, fetchRecent, fetchTrend, type BreakdownRow, type TrendRow } from '../lib/api'
import { fmtMoney, fmtPct, pctChange } from '../lib/format'
import { dateHeading, dayjs, rangeOf, today, ymd } from '../lib/period'
import type { Direction, Transaction } from '../lib/types'
import { CategoryIcon } from '../lib/categoryIcons'

interface Data {
  month: BreakdownRow[]
  prevMonth: BreakdownRow[]
  today: BreakdownRow[]
  week: TrendRow[]
  recent: Transaction[]
}

const sum = (rows: BreakdownRow[], d: Direction) => rows.filter((r) => r.direction === d).reduce((s, r) => s + Number(r.total), 0)

function greeting() {
  const h = dayjs().hour()
  if (h < 11) return 'Chào buổi sáng'
  if (h < 14) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export function Dashboard() {
  const { member } = useAuth()
  const openAdd = useQuickAdd()
  const { version } = useDataVersion()
  const toast = useToast()
  const [data, setData] = useState<Data | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)

  useEffect(() => {
    let cancelled = false
    const now = dayjs()
    const m = rangeOf('month', now)
    const pm = rangeOf('month', now.subtract(1, 'month'))
    const t = today()
    Promise.all([
      fetchBreakdown(m.from, m.to),
      fetchBreakdown(pm.from, pm.to),
      fetchBreakdown(t, t),
      fetchTrend(ymd(now.subtract(6, 'day')), t, 'day'),
      fetchRecent(8),
    ])
      .then(([month, prevMonth, td, week, recent]) => !cancelled && setData({ month, prevMonth, today: td, week, recent }))
      .catch((e) => toast(errorMessage(e), 'error'))
    return () => {
      cancelled = true
    }
  }, [version, toast])

  return (
    <>
      <div className="mb-5">
        <p className="text-[13px] capitalize text-muted">{dayjs().format('dddd, DD/MM/YYYY')}</p>
        <h1 className="font-display text-[22px] font-bold tracking-tight lg:text-[26px]">
          {greeting()}, {member?.display_name} <span aria-hidden>👋</span>
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
        <div className="lg:col-span-2">
          <BalanceHero data={data} />
        </div>
        <TodayCard data={data} onAdd={openAdd} />

        <div className="lg:col-span-2">
          <WeekChart rows={data?.week ?? null} />
        </div>
        <TopCategories data={data} />

        <section className="lg:col-span-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="card-title">Giao dịch gần đây</h2>
            <Link to="/lich-su" className="flex items-center gap-0.5 text-[13px] font-semibold text-link hover:underline">
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {!data ? (
            <SkeletonList rows={4} />
          ) : data.recent.length === 0 ? (
            <EmptyState icon={Sparkles} title="Bắt đầu ghi chép thôi!">
              Bấm nút <b>+</b> để ghi giao dịch đầu tiên.
            </EmptyState>
          ) : (
            <RecentList list={data.recent} onPick={setEditing} />
          )}
        </section>
      </div>

      <TransactionEditModal txn={editing} onClose={() => setEditing(null)} onChanged={() => {}} />
    </>
  )
}

// ---------------------------------------------------------------------

function BalanceHero({ data }: { data: Data | null }) {
  const inM = data ? sum(data.month, 'in') : 0
  const outM = data ? sum(data.month, 'out') : 0
  const outPrev = data ? sum(data.prevMonth, 'out') : 0
  const net = inM - outM
  const outDelta = pctChange(outM, outPrev)
  const ratio = inM > 0 ? Math.min(outM / inM, 1) : outM > 0 ? 1 : 0

  return (
    <section className="bg-grad relative h-full overflow-hidden rounded-[22px] p-5 text-white shadow-[0_18px_40px_rgba(138,100,48,.35)] sm:p-6">
      {/* hoạ tiết */}
      <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
      <span className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/[.07]" />

      <div className="relative">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[1.2px] text-white/80">
          <Wallet className="h-4 w-4" /> Số dư tháng {dayjs().format('MM/YYYY')}
        </div>
        {data ? (
          <div className="mt-1.5 font-display text-[34px] font-bold leading-tight tabular tracking-tight sm:text-[40px]">
            {net < 0 ? '−' : ''}
            {fmtMoney(Math.abs(net))}
          </div>
        ) : (
          <span className="mt-3 block h-10 w-56 animate-pulse rounded-lg bg-white/20" />
        )}

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <HeroPill icon={ArrowDownLeft} label="Tổng thu" value={data ? fmtMoney(inM) : '—'} />
          <HeroPill icon={ArrowUpRight} label="Tổng chi" value={data ? fmtMoney(outM) : '—'} />
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-[12px] text-white/85">
            <span>{inM > 0 ? `Đã chi ${Math.round((outM / inM) * 100)}% số thu` : 'Chưa có khoản thu tháng này'}</span>
            {outDelta !== null && (
              <span className="inline-flex items-center gap-1 font-semibold">
                {outDelta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                Chi {fmtPct(outDelta)} so với tháng trước
              </span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/25">
            <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${ratio * 100}%` }} />
          </div>
        </div>
      </div>
    </section>
  )
}

function HeroPill({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/15 px-3.5 py-2.5 backdrop-blur-sm ring-1 ring-white/20">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white/80">
        <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20">
          <Icon className="h-3 w-3" />
        </span>
        {label}
      </div>
      <div className="mt-1 truncate font-display text-[17px] font-bold tabular sm:text-lg">{value}</div>
    </div>
  )
}

function TodayCard({ data, onAdd }: { data: Data | null; onAdd: (d: Direction) => void }) {
  const tIn = data ? sum(data.today, 'in') : 0
  const tOut = data ? sum(data.today, 'out') : 0
  return (
    <section className="card flex flex-col p-5">
      <h2 className="card-title mb-4">Hôm nay</h2>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="text-[11.5px] font-semibold text-muted">Đã thu</div>
          <div className="truncate font-display text-xl font-bold tabular text-in">{fmtMoney(tIn)}</div>
        </div>
        <div>
          <div className="text-[11.5px] font-semibold text-muted">Đã chi</div>
          <div className="truncate font-display text-xl font-bold tabular text-out">{fmtMoney(tOut)}</div>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2.5 pt-5">
        <button
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-[rgba(220,38,38,.2)] bg-[rgba(220,38,38,.06)] px-2 py-3 text-[13px] font-bold text-out transition hover:bg-[rgba(220,38,38,.1)] active:scale-[.98]"
          onClick={() => onAdd('out')}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-out shadow-sm">
            <ArrowUpRight className="h-5 w-5" />
          </span>
          Ghi khoản chi
        </button>
        <button
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-[rgba(4,120,87,.22)] bg-[rgba(4,120,87,.07)] px-2 py-3 text-[13px] font-bold text-in transition hover:bg-[rgba(4,120,87,.12)] active:scale-[.98]"
          onClick={() => onAdd('in')}
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-white text-in shadow-sm">
            <ArrowDownLeft className="h-5 w-5" />
          </span>
          Ghi khoản thu
        </button>
      </div>
    </section>
  )
}

function WeekChart({ rows }: { rows: TrendRow[] | null }) {
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => ymd(dayjs().subtract(6 - i, 'day'))), [])
  const chart = days.map((d) => ({
    day: d,
    label: d === today() ? 'Hôm nay' : dayjs(d).format('dd'),
    full: dayjs(d).format('dddd, DD/MM'),
    out: (rows ?? []).filter((r) => r.bucket === d && r.direction === 'out').reduce((s, r) => s + Number(r.total), 0),
  }))
  const total = chart.reduce((s, c) => s + c.out, 0)
  const avg = total / 7

  return (
    <section className="card h-full p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <div>
          <h2 className="card-title">Chi tiêu 7 ngày qua</h2>
          <div className="mt-2 font-display text-2xl font-bold tabular">{rows ? fmtMoney(total) : '—'}</div>
          <div className="text-[12px] text-muted">Trung bình {fmtMoney(avg)}/ngày</div>
        </div>
        <Link to="/thong-ke" className="btn-icon h-9 w-9" aria-label="Xem thống kê">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="h-40">
        {rows === null ? (
          <div className="flex h-full items-end gap-3 px-2 pb-6">
            {[40, 70, 30, 85, 55, 45, 65].map((h, i) => (
              <span key={i} className="skel flex-1" style={{ height: `${h}%` }} />
            ))}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 12, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#7a705f', fontSize: 11.5, fontWeight: 600 }} />
              <Tooltip
                cursor={{ fill: 'rgba(176,132,64,.08)', radius: 8 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0].payload as (typeof chart)[number]
                  return (
                    <div className="rounded-xl border border-line-2 bg-white px-3 py-2 text-xs shadow-[0_10px_28px_rgba(74,58,30,.18)]">
                      <div className="capitalize text-muted">{d.full}</div>
                      <div className="font-display text-[15px] font-bold tabular text-out">{fmtMoney(d.out)}</div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="out" radius={[6, 6, 6, 6]} maxBarSize={34} minPointSize={3}>
                {chart.map((c) => (
                  <Cell key={c.day} fill={c.day === today() ? '#b8864a' : 'rgba(184,134,74,.35)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

function TopCategories({ data }: { data: Data | null }) {
  const { categories } = useCatalog()
  const rows = useMemo(() => {
    if (!data) return []
    const out = data.month.filter((r) => r.direction === 'out')
    const prev = data.prevMonth.filter((r) => r.direction === 'out')
    return categories
      .map((c) => ({
        cat: c,
        v: out.filter((r) => r.category_code === c.code).reduce((s, r) => s + Number(r.total), 0),
        p: prev.filter((r) => r.category_code === c.code).reduce((s, r) => s + Number(r.total), 0),
      }))
      .filter((r) => r.v > 0)
      .sort((a, b) => b.v - a.v)
      .slice(0, 5)
  }, [data, categories])
  const max = rows[0]?.v ?? 1

  return (
    <section className="card h-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="card-title">Chi nhiều nhất tháng</h2>
        <PieChart className="h-4 w-4 text-muted" />
      </div>
      {!data ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <span className="skel h-3 w-1/2" />
              <span className="skel h-2 w-full" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Chưa có khoản chi tháng này.</p>
      ) : (
        <ul className="space-y-3.5">
          {rows.map((r) => {
            const d = pctChange(r.v, r.p)
            return (
              <li key={r.cat.code}>
                <div className="mb-1.5 flex items-center gap-2.5">
                  <CategoryIcon icon={r.cat.icon} color={r.cat.color} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13.5px] font-semibold">{r.cat.name}</span>
                      <span className="shrink-0 font-display text-[13.5px] font-bold tabular">{fmtMoney(r.v)}</span>
                    </div>
                    {d !== null && (
                      <div className={`text-[11px] font-semibold ${d > 0 ? 'text-out' : 'text-in'}`}>
                        {d > 0 ? '▲' : '▼'} {fmtPct(d)} so với tháng trước
                      </div>
                    )}
                  </div>
                </div>
                <div className="ml-[42px] h-1.5 overflow-hidden rounded-full bg-[rgba(60,48,28,.08)]">
                  <div className="h-full rounded-full" style={{ width: `${(r.v / max) * 100}%`, background: r.cat.color }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Link to="/thong-ke" className="mt-4 flex items-center justify-end gap-0.5 text-[13px] font-semibold text-link hover:underline">
        Phân tích chi tiết <ChevronRight className="h-4 w-4" />
      </Link>
    </section>
  )
}

function RecentList({ list, onPick }: { list: Transaction[]; onPick: (t: Transaction) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, Transaction[]>()
    for (const t of list) m.set(t.txn_date, [...(m.get(t.txn_date) ?? []), t])
    return [...m.entries()]
  }, [list])
  return (
    <div className="card overflow-hidden">
      {groups.map(([date, txns]) => (
        <div key={date}>
          <div className="border-b border-line bg-white/40 px-4 py-2 text-[12px] font-bold text-muted">{dateHeading(date)}</div>
          <div className="divide-y divide-line">
            {txns.map((t) => (
              <TransactionRow key={t.id} txn={t} onClick={() => onPick(t)} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
