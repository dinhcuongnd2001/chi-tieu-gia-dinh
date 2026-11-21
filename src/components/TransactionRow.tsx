import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { deleteTransaction, errorMessage } from '../lib/api'
import { dayjs } from '../lib/period'
import { paymentLabel, type Transaction } from '../lib/types'
import { TransactionForm } from './TransactionForm'
import { BadgeTag, Modal, Money, useToast } from './ui'

export function TransactionRow({
  txn,
  onClick,
  showDate = false,
}: {
  txn: Transaction
  onClick?: () => void
  showDate?: boolean
}) {
  const { categoryByCode, itemById, badgeById, memberNameByUserId } = useCatalog()
  const cat = categoryByCode.get(txn.category_code)
  const item = itemById.get(txn.item_id)
  const txnBadges = txn.transaction_badges.map((b) => badgeById.get(b.badge_id)).filter(Boolean)
  const meta = [
    showDate ? dayjs(txn.txn_date).format('DD/MM/YYYY') : null,
    cat?.name,
    paymentLabel(txn.payment_method) || null,
    memberNameByUserId.get(txn.created_by),
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-surface-2 sm:px-4"
    >
      <span
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{ background: `${cat?.color ?? '#898781'}22` }}
        aria-hidden
      >
        {cat?.icon || <span className="h-3 w-3 rounded-full" style={{ background: cat?.color ?? '#898781' }} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{item?.name ?? 'Không rõ'}</span>
          {txn.receipt_path && <span title="Có ảnh hoá đơn" aria-label="Có ảnh hoá đơn">📎</span>}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted">{meta.join(' · ')}</span>
        {(txnBadges.length > 0 || txn.note) && (
          <span className="mt-1 flex flex-wrap items-center gap-1">
            {txnBadges.map((b) => (
              <BadgeTag key={b!.id} name={b!.name} color={b!.color} />
            ))}
            {txn.note && <span className="truncate text-xs text-ink-2">{txn.note}</span>}
          </span>
        )}
      </span>
      <Money amount={txn.amount} direction={txn.direction} className="shrink-0 text-sm sm:text-base" />
    </button>
  )
}

/** Modal sửa/xoá giao dịch */
export function TransactionEditModal({
  txn,
  onClose,
  onChanged,
}: {
  txn: Transaction | null
  onClose: () => void
  onChanged: () => void
}) {
  const { member } = useAuth()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const canEdit = txn && (txn.created_by === member?.user_id || member?.role === 'admin')

  async function onDelete() {
    if (!txn) return
    try {
      await deleteTransaction(txn)
      toast('Đã xoá giao dịch')
      setConfirming(false)
      onChanged()
      onClose()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <Modal open={Boolean(txn)} title={canEdit ? 'Sửa giao dịch' : 'Chi tiết giao dịch'} onClose={onClose}>
      {txn && !canEdit && (
        <p className="mb-4 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink-2">
          Giao dịch do thành viên khác nhập — chỉ người nhập hoặc admin mới sửa được.
        </p>
      )}
      {txn && (
        <fieldset disabled={!canEdit} className="contents">
          <TransactionForm
            key={txn.id}
            initial={txn}
            onCancel={onClose}
            onSaved={() => {
              onChanged()
              onClose()
            }}
            extraActions={
              canEdit &&
              (confirming ? (
                <span className="flex items-center gap-2">
                  <span className="text-sm text-ink-2">Xoá thật?</span>
                  <button type="button" className="btn-danger" onClick={onDelete}>
                    Xoá
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => setConfirming(false)}>
                    Không
                  </button>
                </span>
              ) : (
                <button type="button" className="btn-danger" onClick={() => setConfirming(true)}>
                  Xoá
                </button>
              ))
            }
          />
        </fieldset>
      )}
    </Modal>
  )
}
