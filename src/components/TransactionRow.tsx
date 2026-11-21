import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useDataVersion } from '../lib/dataSync'
import { useCatalog } from '../context/CatalogContext'
import { deleteTransaction, errorMessage } from '../lib/api'
import { dayjs } from '../lib/period'
import { paymentLabel, type Transaction } from '../lib/types'
import { TransactionForm } from './TransactionForm'
import { Paperclip, Pencil, ReceiptText } from 'lucide-react'
import { Avatar, BadgeTag, Modal, Money, useToast } from './ui'
import { CategoryIcon } from '../lib/categoryIcons'

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
  ].filter(Boolean)
  const author = memberNameByUserId.get(txn.created_by)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-[rgba(176,132,64,.05)] sm:px-4"
    >
      <CategoryIcon icon={cat?.icon} color={cat?.color ?? '#898781'} size={40} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold">{item?.name ?? 'Không rõ'}</span>
          {txn.receipt_path && <Paperclip className="h-3.5 w-3.5 text-muted" aria-label="Có ảnh hoá đơn" />}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
          {author && <Avatar name={author} size={16} />}
          {[author, ...meta].filter(Boolean).join(' · ')}
        </span>
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
  const { bump } = useDataVersion()
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const canEdit = txn && (txn.created_by === member?.user_id || member?.role === 'admin')

  async function onDelete() {
    if (!txn) return
    try {
      await deleteTransaction(txn)
      toast('Đã xoá giao dịch')
      setConfirming(false)
      bump()
      onChanged()
      onClose()
    } catch (e) {
      toast(errorMessage(e), 'error')
    }
  }

  return (
    <Modal open={Boolean(txn)} title={canEdit ? 'Sửa giao dịch' : 'Chi tiết giao dịch'} icon={canEdit ? Pencil : ReceiptText} onClose={onClose}>
      {txn && !canEdit && (
        <p className="mb-4 rounded-xl border border-[rgba(180,83,9,.28)] bg-[rgba(180,83,9,.1)] px-3.5 py-2.5 text-sm text-[#b45309]">
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
