import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { errorMessage } from '../lib/api'
import { Spinner } from '../components/ui'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })
        if (error) throw error
        setMsg({ text: 'Nếu email có trong hệ thống, link đặt lại mật khẩu đã được gửi.', ok: true })
      }
    } catch (err) {
      const m = errorMessage(err)
      setMsg({ text: m === 'Invalid login credentials' ? 'Email hoặc mật khẩu không đúng' : m, ok: false })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell title={mode === 'login' ? 'Đăng nhập' : 'Quên mật khẩu'}>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <span className="label">Email</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode === 'login' && (
          <label className="block">
            <span className="label">Mật khẩu</span>
            <input
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {msg && <p className={`text-sm ${msg.ok ? 'text-in' : 'text-danger'}`}>{msg.text}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          {busy && <Spinner className="h-4 w-4 border-white/40 border-t-white" />}
          {mode === 'login' ? 'Đăng nhập' : 'Gửi link đặt lại'}
        </button>
        <button
          type="button"
          className="w-full text-sm text-accent"
          onClick={() => {
            setMode(mode === 'login' ? 'forgot' : 'login')
            setMsg(null)
          }}
        >
          {mode === 'login' ? 'Quên mật khẩu?' : '← Quay lại đăng nhập'}
        </button>
      </form>
    </AuthShell>
  )
}

export function SetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) return setErr('Mật khẩu tối thiểu 8 ký tự')
    if (password !== confirm) return setErr('Mật khẩu nhập lại không khớp')
    setBusy(true)
    setErr(null)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setErr(error.message)
    window.history.replaceState(null, '', window.location.pathname)
    onDone()
  }

  return (
    <AuthShell title="Đặt mật khẩu">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-sm text-ink-2">Tạo mật khẩu để đăng nhập những lần sau.</p>
        <label className="block">
          <span className="label">Mật khẩu mới</span>
          <input className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Nhập lại</span>
          <input className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>
        {err && <p className="text-sm text-danger">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>
          Lưu mật khẩu
        </button>
      </form>
    </AuthShell>
  )
}

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center p-4">
      <div className="card w-full max-w-sm p-6 shadow-sm">
        <div className="mb-1 text-2xl">💸</div>
        <h1 className="mb-5 text-xl font-bold">{title}</h1>
        {children}
      </div>
    </div>
  )
}
