import { supabase } from './supabase'
import type { Direction, PaymentMethod, Transaction } from './types'

export const TXN_SELECT = '*, transaction_badges(badge_id)'

export interface TxnInput {
  id?: string | null
  txn_date: string
  amount: number
  item_id: string
  payment_method: PaymentMethod | null
  note: string
  receipt_path: string | null
  badge_ids: string[]
}

export async function saveTransaction(t: TxnInput): Promise<string> {
  const { data, error } = await supabase.rpc('save_transaction', {
    p_id: t.id ?? null,
    p_txn_date: t.txn_date,
    p_amount: t.amount,
    p_item_id: t.item_id,
    p_payment_method: t.payment_method ?? '',
    p_note: t.note,
    p_receipt_path: t.receipt_path ?? '',
    p_badge_ids: t.badge_ids,
  })
  if (error) throw error
  return data as string
}

export async function deleteTransaction(t: Transaction) {
  const { error } = await supabase.from('transactions').delete().eq('id', t.id)
  if (error) throw error
  if (t.receipt_path) await supabase.storage.from('receipts').remove([t.receipt_path])
}

/** Lấy toàn bộ giao dịch trong khoảng ngày (tự phân trang 1000 dòng/lần) */
export async function fetchTransactions(from: string, to: string): Promise<Transaction[]> {
  const page = 1000
  const all: Transaction[] = []
  for (let offset = 0; ; offset += page) {
    const { data, error } = await supabase
      .from('transactions')
      .select(TXN_SELECT)
      .gte('txn_date', from)
      .lte('txn_date', to)
      .order('txn_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + page - 1)
    if (error) throw error
    all.push(...(data as Transaction[]))
    if (!data || data.length < page) break
  }
  return all
}

export async function fetchTopTransactions(from: string, to: string, direction: Direction, limit = 10) {
  const { data, error } = await supabase
    .from('transactions')
    .select(TXN_SELECT)
    .gte('txn_date', from)
    .lte('txn_date', to)
    .eq('direction', direction)
    .order('amount', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as Transaction[]
}

export interface BreakdownRow {
  category_code: string
  item_id: string
  direction: Direction
  total: number
  txn_count: number
}
export interface BadgeRow {
  badge_id: string
  total: number
  txn_count: number
}
export interface TrendRow {
  bucket: string
  direction: Direction
  total: number
}

export async function fetchBreakdown(from: string, to: string) {
  const { data, error } = await supabase.rpc('stats_breakdown', { p_from: from, p_to: to })
  if (error) throw error
  return data as BreakdownRow[]
}
export async function fetchBadgeStats(from: string, to: string) {
  const { data, error } = await supabase.rpc('stats_badges', { p_from: from, p_to: to })
  if (error) throw error
  return data as BadgeRow[]
}
export async function fetchTrend(from: string, to: string, bucket: string) {
  const { data, error } = await supabase.rpc('stats_trend', { p_from: from, p_to: to, p_bucket: bucket })
  if (error) throw error
  return data as TrendRow[]
}

/** Thu nhỏ ảnh trước khi upload (tối đa 1600px, JPEG) */
async function compressImage(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Không xử lý được ảnh'))), 'image/jpeg', 0.82),
  )
}

export async function uploadReceipt(file: File): Promise<string> {
  const blob = await compressImage(file)
  const path = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('receipts').upload(path, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

export async function receiptUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('receipts').createSignedUrl(path, 60 * 10)
  return data?.signedUrl ?? null
}

export function errorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: string }).message)
  return 'Đã có lỗi xảy ra'
}
