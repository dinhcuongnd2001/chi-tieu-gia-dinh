const nf = new Intl.NumberFormat('vi-VN')

export const fmtNumber = (n: number) => nf.format(Math.round(n))
export const fmtMoney = (n: number) => `${nf.format(Math.round(n))} ₫`

/** 1.250.000 -> 1,25 tr ; 3.400.000.000 -> 3,4 tỷ */
export function fmtShort(n: number): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  const f = (v: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(v)
  if (abs >= 1e9) return `${sign}${f(abs / 1e9)} tỷ`
  if (abs >= 1e6) return `${sign}${f(abs / 1e6)} tr`
  if (abs >= 1e3) return `${sign}${f(abs / 1e3)}k`
  return `${sign}${nf.format(abs)}`
}

export const parseMoney = (s: string) => {
  const digits = s.replace(/\D/g, '')
  return digits ? Number(digits) : 0
}

/** "Nhập hàng TQ" -> "nhap_hang_tq" */
export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

export function pctChange(cur: number, prev: number): number | null {
  if (!prev) return null
  return (cur - prev) / prev
}

export const fmtPct = (p: number) =>
  `${p > 0 ? '+' : ''}${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(p * 100)}%`
