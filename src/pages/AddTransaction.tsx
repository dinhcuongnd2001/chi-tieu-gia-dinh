import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/Layout'
import { TransactionForm } from '../components/TransactionForm'
import { TransactionEditModal, TransactionRow } from '../components/TransactionRow'
import { EmptyState, Spinner } from '../components/ui'
import { fetchTransactions } from '../lib/api'
import { fmtMoney } from '../lib/format'
import { today } from '../lib/period'
import type { Transaction } from '../lib/types'

export function AddTransaction() {
  const [list, setList] = useState<Transaction[] | null>(null)
  const [editing, setEditing] = useState<Transaction | null>(null)

  const load = useCallback(async () => {
    const d = today()
    setList(await fetchTransactions(d, d))
  }, [])

  useEffect(() => {
    load().catch(() => setList([]))
  }, [load])

  const totalIn = list?.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0) ?? 0
  const totalOut = list?.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0) ?? 0

  return (
    <>
      <PageHeader title="Ghi giao dịch" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section className="card p-4 sm:p-5">
          <TransactionForm onSaved={() => load()} />
        </section>

        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Hôm nay</h2>
            <Link to="/lich-su" className="text-sm text-accent">
              Xem lịch sử →
            </Link>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
            <div className="card px-3 py-2">
              <div className="text-xs text-muted">Tiền vào</div>
              <div className="tabular font-semibold text-in">{fmtMoney(totalIn)}</div>
            </div>
            <div className="card px-3 py-2">
              <div className="text-xs text-muted">Tiền ra</div>
              <div className="tabular font-semibold text-out">{fmtMoney(totalOut)}</div>
            </div>
          </div>
          {list === null ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : list.length === 0 ? (
            <EmptyState>Chưa có giao dịch nào hôm nay.</EmptyState>
          ) : (
            <div className="card divide-y divide-line overflow-hidden">
              {list.map((t) => (
                <TransactionRow key={t.id} txn={t} onClick={() => setEditing(t)} />
              ))}
            </div>
          )}
        </section>
      </div>
      <TransactionEditModal txn={editing} onClose={() => setEditing(null)} onChanged={load} />
    </>
  )
}
