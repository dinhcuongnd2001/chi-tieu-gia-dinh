export type Direction = 'in' | 'out'
export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'ewallet'

export interface Member {
  id: string
  email: string
  display_name: string
  role: 'admin' | 'member'
  user_id: string | null
}

export interface Category {
  id: string
  code: string
  name: string
  color: string
  icon: string | null
  sort_order: number
  is_active: boolean
}

export interface CategoryItem {
  id: string
  category_code: string
  code: string
  name: string
  direction: Direction
  sort_order: number
  is_active: boolean
}

export interface Badge {
  id: string
  item_id: string
  name: string
  color: string
  sort_order: number
  is_active: boolean
}

export interface Transaction {
  id: string
  txn_date: string
  amount: number
  item_id: string
  category_code: string
  direction: Direction
  payment_method: PaymentMethod | null
  note: string | null
  receipt_path: string | null
  created_by: string
  created_at: string
  updated_at: string
  transaction_badges: { badge_id: string }[]
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tiền mặt' },
  { value: 'transfer', label: 'Chuyển khoản' },
  { value: 'card', label: 'Thẻ' },
  { value: 'ewallet', label: 'Ví điện tử' },
]

export const paymentLabel = (m: PaymentMethod | null) =>
  PAYMENT_METHODS.find((p) => p.value === m)?.label ?? ''

/** Bảng màu phân loại (thứ tự cố định, đã kiểm tra an toàn cho người mù màu) */
export const CATEGORY_COLORS = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948',
]
