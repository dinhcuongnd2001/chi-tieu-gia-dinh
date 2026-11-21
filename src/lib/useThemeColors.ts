import { useEffect, useState } from 'react'

const read = () => {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(n).trim()
  return {
    in: v('--series-in'),
    out: v('--series-out'),
    ink: v('--ink'),
    ink2: v('--ink-2'),
    muted: v('--muted'),
    line: v('--line'),
    surface: v('--surface'),
  }
}

/** Đọc màu từ CSS variables (để Recharts đổi màu theo chế độ sáng/tối) */
export function useThemeColors() {
  const [colors, setColors] = useState(read)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = () => setColors(read())
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return colors
}
