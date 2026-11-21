import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Member } from '../lib/types'

// Link mời / đặt lại mật khẩu: phải đặt mật khẩu mới trước khi dùng app
const initialNeedsPassword = /type=(invite|recovery)/.test(window.location.hash)

interface AuthState {
  loading: boolean
  session: Session | null
  member: Member | null
  needsPassword: boolean
  clearNeedsPassword: () => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [member, setMember] = useState<Member | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsPassword, setNeedsPassword] = useState(initialNeedsPassword)

  useEffect(() => {
    let active = true

    async function load(s: Session | null) {
      setSession(s)
      if (!s) {
        setMember(null)
        setLoading(false)
        return
      }
      const { data, error } = await supabase.rpc('claim_membership')
      if (!active) return
      if (error) console.error(error)
      const m = data as Member | null
      setMember(m && m.id ? m : null)
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => load(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setNeedsPassword(true)
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // không gọi supabase trực tiếp trong callback (tránh deadlock của supabase-js)
        setTimeout(() => load(s), 0)
      }
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value: AuthState = {
    loading,
    session,
    member,
    needsPassword,
    clearNeedsPassword: () => setNeedsPassword(false),
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside provider')
  return ctx
}
