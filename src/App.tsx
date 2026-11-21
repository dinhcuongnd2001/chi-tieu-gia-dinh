import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CatalogProvider, useCatalog } from './context/CatalogContext'
import { Layout } from './components/Layout'
import { FullPageSpinner, ToastProvider } from './components/ui'
import { supabaseConfigured } from './lib/supabase'
import { AuthShell, Login, SetPassword } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { QuickAddProvider } from './context/QuickAddContext'
import { History } from './pages/History'
import { Categories } from './pages/Categories'
import { CategoryDetail } from './pages/CategoryDetail'
import { Account } from './pages/Account'

const Stats = lazy(() => import('./pages/Stats').then((m) => ({ default: m.Stats })))

function Gate() {
  const { loading, session, member, needsPassword, clearNeedsPassword, signOut } = useAuth()

  if (!supabaseConfigured) {
    return (
      <AuthShell title="Chưa cấu hình">
        <p className="text-sm text-ink-2">
          Thiếu biến môi trường <code>VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </AuthShell>
    )
  }
  if (loading) return <FullPageSpinner />
  if (!session) return <Login />
  if (needsPassword) return <SetPassword onDone={clearNeedsPassword} />
  if (!member) {
    return (
      <AuthShell title="Chưa được cấp quyền">
        <p className="mb-4 text-sm text-ink-2">
          Tài khoản <b>{session.user.email}</b> chưa có trong danh sách thành viên. Hãy nhờ admin thêm email này.
        </p>
        <button className="btn-ghost w-full" onClick={signOut}>
          Đăng xuất
        </button>
      </AuthShell>
    )
  }
  return (
    <CatalogProvider>
      <AppRoutes />
    </CatalogProvider>
  )
}

function AppRoutes() {
  const { loading } = useCatalog()
  if (loading) return <FullPageSpinner />
  return (
    <QuickAddProvider>
      <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="lich-su" element={<History />} />
        <Route
          path="thong-ke"
          element={
            <Suspense fallback={<FullPageSpinner />}>
              <Stats />
            </Suspense>
          }
        />
        <Route path="danh-muc" element={<Categories />} />
        <Route path="danh-muc/:code" element={<CategoryDetail />} />
        <Route path="tai-khoan" element={<Account />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      </Routes>
    </QuickAddProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Gate />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
