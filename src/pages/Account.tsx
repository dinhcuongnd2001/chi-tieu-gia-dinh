import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/Layout'
import { KeyRound, LogOut, Pencil, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { Avatar, Modal, useToast } from '../components/ui'
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
      <PageHeader title="Tài khoản" sub="Thông tin cá nhân và thành viên gia đình" />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <section className="card p-5 sm:p-6">
          <h3 className="card-title mb-4">Của tôi</h3>
          <div className="mb-4 flex items-center gap-3">
            <Avatar name={member?.display_name ?? '?'} seed={member?.email} size={48} />
            <div>
              <div className="font-display text-lg font-bold">{member?.display_name}</div>
              <div className="inline-flex items-center gap-1 text-xs font-semibold text-accent-deep">
                <ShieldCheck className="h-3.5 w-3.5" /> {isAdmin ? 'Admin' : 'Thành viên'}
              </div>
            </div>
          </div>
          <dl className="mb-4 space-y-1.5 rounded-xl border border-line-2 bg-white/60 p-3.5 text-sm">
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
          <button className="btn-danger mt-3 w-full" onClick={signOut}>
            <LogOut className="h-4 w-4" /> Đăng xuất
          </button>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="card-title"><Users className="h-4 w-4" /> Thành viên gia đình</h3>
            {isAdmin && (
              <button className="btn-primary px-3.5 py-2 text-[13px]" onClick={() => setEditing('new')}>
                <UserPlus className="h-4 w-4" /> Thêm
              </button>
            )}
          </div>
          <ul className="divide-y divide-line">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={m.display_name} seed={m.email} size={36} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {m.display_name}{' '}
                    {m.role === 'admin' && (
                      <span className="ml-1 rounded-full bg-[rgba(176,132,64,.14)] px-2 py-0.5 text-[11px] font-semibold text-accent-deep">admin</span>
                    )}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {m.email} {!m.user_id && '· chưa đăng nhập lần nào'}
                  </span>
                </span>
                {isAdmin && (
                  <button className="btn-icon h-9 w-9" onClick={() => setEditing(m)} aria-label="Sửa">
                    <Pencil className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
          {isAdmin && (
            <p className="mt-4 rounded-xl border border-[rgba(47,74,122,.18)] bg-[rgba(47,74,122,.06)] p-3.5 text-xs leading-relaxed text-link">
              Sau khi thêm email ở đây, vào <b>Supabase → Authentication → Users → Invite user</b> để gửi lời mời. Người được mời bấm
              link trong email, đặt mật khẩu là dùng được.
            </p>
          )}
        </section>
      </div>

      <Modal open={editing !== null} title={editing === 'new' ? 'Thêm thành viên' : 'Sửa thành viên'} icon={editing === 'new' ? UserPlus : Pencil} onClose={() => setEditing(null)}>
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
        <KeyRound className="h-4 w-4" /> Đổi mật khẩu
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
