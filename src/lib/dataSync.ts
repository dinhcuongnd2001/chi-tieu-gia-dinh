import { useSyncExternalStore } from 'react'

/**
 * "Phiên bản dữ liệu" dùng chung toàn app: tăng mỗi khi giao dịch thay đổi,
 * các màn (Tổng quan, Lịch sử, Thống kê) đưa `version` vào deps để tự tải lại.
 * Dùng store module-level (không dùng React Context, không phụ thuộc vòng import)
 * nên mọi nơi luôn cùng một nguồn.
 */
let version = 0
const listeners = new Set<() => void>()

export function notifyDataChanged() {
  version += 1
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

const getSnapshot = () => version

export function useDataVersion() {
  const v = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return { version: v, bump: notifyDataChanged }
}

// Quay lại tab sau > 30s: làm mới (thành viên khác có thể vừa ghi giao dịch)
if (typeof document !== 'undefined') {
  let hiddenAt = 0
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now()
    else if (hiddenAt && Date.now() - hiddenAt > 30_000) notifyDataChanged()
  })
}
