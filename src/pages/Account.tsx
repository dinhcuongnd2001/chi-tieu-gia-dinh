import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/Layout'
import { Modal, useToast } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../context/CatalogContext'
import { errorMessage } from '../lib/api'
import { supabase } from '../lib/supabase'
import type { Member } from '../lib/types'

export function Account() {
  const { member, session, signOut } = useAuth()
  const { members, reload } = useCatalog()
  const toast = useToast()
  const isAdmin = member?.role === 'admin'
  const [editing, setEditing] = useState<Member | 'new' | null>(null)

  return (
    <>
      <PageHeader title="Tài khoản" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4 sm:p-5">
          <h2 className="mb-3 font-semibold">Của tôi</h2>
          <dl className="mb-4 space-y-1 text-sm">
            <div className="flex gap-2">
              <dt className="w-20 text-muted">Tên</dt>
              <dd className="font-medium">{member?.display_name}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 text-muted">Email</dt>
              <dd className="font-medium">{session?.user.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 text-muted">Vai trò</dt>
              <dd className="font-medium">{isAdmin ? 'Admin' : 'Thành viên'}</dd>
            </div>
          </dl>
          <ChangePassword />
          <button className="btn-ghost mt-4 w-full" onClick={signOut}>
            Đăng xuất
          </button>
        </section>

        <section className="card p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Thành viên gia đình</h2>
            {isAdmin && (
              <button className="btn-primary py-1.5" onClick={() => setEditing('new')}>
                + Thêm
              </button>
            )}
          </div>
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 font-semibold">
                  {m.display_name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {m.display_name} {m.role === 'admin' && <span className="text-xs text-accent">· admin</span>}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {m.email} {!m.user_id && '· chưa đăng nhập lần nào'}
                  </span>
                </span>
                {isAdmin && (
                  <button className="text-sm text-accent" onClick={() => setEditing(m)}>
                    Sửa
                  </button>
                )}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <p className="mt-3 rounded-lg bg-surface-2 p-3 text-xs text-ink-2">
              Sau khi thêm email ở đây, vào <b>Supabase → Authentication → Users → Invite user</b> để gửi lời mời. Người được mời bấm
              link trong email, đặt mật khẩu là dùng được.
            </p>
          )}
        </section>
      </div>

      <Modal open={editing !== null} title={editing === 'new' ? 'Thêm thành viên' : 'Sửa thành viên'} onClose={() => setEditing(null)}>
        {editing !== null && (
          <MemberForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            isSelf={editing !== 'new' && editing.id === member?.id}
            onDone={async (msg) => {
              await reload()
              if (msg) toast(msg)
              setEditing(null)
            }}
          />
        )}
      </Modal>
    </>
  )
}

function ChangePassword() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (pw.length < 8) return toast('Mật khẩu tối thiểu 8 ký tự', 'error')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password: pw })
    setBusy(false)
    if (error) return toast(error.message, 'error')
    toast('Đã đổi mật khẩu')
    setPw('')
    setOpen(false)
  }

  if (!open)
    return (
      <button className="btn-ghost w-full" onClick={() => setOpen(true)}>
        Đổi mật khẩu
      </button>
    )
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input className="input" type="password" autoComplete="new-password" placeholder="Mật khẩu mới" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      <button className="btn-primary" disabled={busy}>
        Lưu
      </button>
    </form>
  )
}

function MemberForm({ initial, isSelf, onDone }: { initial: Member | null; isSelf: boolean; onDone: (msg?: string) => void }) {
  const toast = useToast()
  const [email, setEmail] = useState(initial?.email ?? '')
  const [name, setName] = useState(initial?.display_name ?? '')
  const [role, setRole] = useState<Member['role']>(initial?.role ?? 'member')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      if (initial) {
        await supabase.from('members').update({ display_name: name.trim(), role }).eq('id', initial.id).throwOnError()
      } else {
        await supabase
          .from('members')
          .insert({ email: email.trim().toLowerCase(), display_name: name.trim(), role })
          .throwOnError()
      }
      onDone('Đã lưu thành viên')
    } catch (err) {
      const m = errorMessage(err)
      toast(m.includes('duplicate') ? 'Email đã có trong danh sách' : m, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!initial) return
    try {
      await supabase.from('members').delete().eq('id', initial.id).throwOnError()
      onDone('Đã xoá quyền truy cập')
    } catch (err) {
      toast(errorMessage(err), 'error')
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="label">Email *</span>
        <input className="input" type="email" required value={email} disabled={Boolean(initial)} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="block">
        <span className="label">Tên hiển thị *</span>
        <input className="input" required maxLength={50} value={name} onChange={(e) => setName(e.target.value)} placeholder="vd. Mẹ" />
      </label>
      <label className="block">
        <span className="label">Vai trò</span>
        <select className="input" value={role} disabled={isSelf} onChange={(e) => setRole(e.target.value as Member['role'])}>
          <option value="member">Thành viên — ghi & sửa giao dịch của mình</option>
          <option value="admin">Admin — sửa mọi giao dịch, quản lý thành viên</option>
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button className="btn-primary" disabled={busy}>
          Lưu
        </button>
        <button type="button" className="btn-ghost" onClick={() => onDone()}>
          Huỷ
        </button>
        {initial && !isSelf && (
          <span className="ml-auto">
            {confirmDelete ? (
              <span className="flex items-center gap-2">
                <button type="button" className="btn-danger" onClick={onDelete}>
                  Xác nhận xoá
                </button>
              </span>
            ) : (
              <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
                Xoá quyền
              </button>
            )}
          </span>
        )}
      </div>
    </form>
  )
}
