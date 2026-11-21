import dayjs, { Dayjs } from 'dayjs'
import isoWeek from 'dayjs/plugin/isoWeek'
import 'dayjs/locale/vi'

dayjs.extend(isoWeek)
dayjs.locale('vi')

export { dayjs }
export type PeriodType = 'day' | 'week' | 'month' | 'year'

export const PERIOD_LABELS: Record<PeriodType, string> = {
  day: 'Ngày',
  week: 'Tuần',
  month: 'Tháng',
  year: 'Năm',
}

const unit = (t: PeriodType) => (t === 'week' ? 'isoWeek' : t)

export const ymd = (d: Dayjs) => d.format('YYYY-MM-DD')
export const today = () => ymd(dayjs())

export interface Range {
  from: string
  to: string
  start: Dayjs
}

export function rangeOf(type: PeriodType, anchor: Dayjs): Range {
  const start = anchor.startOf(unit(type))
  const end = anchor.endOf(unit(type))
  return { from: ymd(start), to: ymd(end), start }
}

export const shift = (type: PeriodType, anchor: Dayjs, n: number) => anchor.add(n, type)

/** Số kỳ hiển thị trên biểu đồ xu hướng */
export const TREND_COUNT: Record<PeriodType, number> = { day: 14, week: 12, month: 12, year: 5 }

export function trendRange(type: PeriodType, anchor: Dayjs): Range & { buckets: string[] } {
  const n = TREND_COUNT[type]
  const first = shift(type, anchor, -(n - 1)).startOf(unit(type))
  const last = anchor.endOf(unit(type))
  const buckets: string[] = []
  for (let i = 0; i < n; i++) buckets.push(ymd(shift(type, first, i).startOf(unit(type))))
  return { from: ymd(first), to: ymd(last), start: first, buckets }
}

export function periodLabel(type: PeriodType, anchor: Dayjs): string {
  const r = rangeOf(type, anchor)
  switch (type) {
    case 'day':
      return anchor.format('dddd, DD/MM/YYYY')
    case 'week':
      return `Tuần ${anchor.isoWeek()} (${dayjs(r.from).format('DD/MM')} – ${dayjs(r.to).format('DD/MM/YYYY')})`
    case 'month':
      return `Tháng ${anchor.format('MM/YYYY')}`
    case 'year':
      return `Năm ${anchor.format('YYYY')}`
  }
}

export const PREV_LABEL: Record<PeriodType, string> = {
  day: 'hôm trước',
  week: 'tuần trước',
  month: 'tháng trước',
  year: 'năm trước',
}

export function bucketLabel(type: PeriodType, bucket: string): string {
  const d = dayjs(bucket)
  switch (type) {
    case 'day':
      return d.format('DD/MM')
    case 'week':
      return `${d.format('DD/MM')}`
    case 'month':
      return `T${d.format('M')}/${d.format('YY')}`
    case 'year':
      return d.format('YYYY')
  }
}

export function dateHeading(date: string): string {
  const d = dayjs(date)
  const diff = dayjs().startOf('day').diff(d.startOf('day'), 'day')
  const base = d.format('dddd, DD/MM/YYYY')
  if (diff === 0) return `Hôm nay · ${base}`
  if (diff === 1) return `Hôm qua · ${base}`
  return base.charAt(0).toUpperCase() + base.slice(1)
}
