import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', label: 'Ghi', icon: '✚', end: true },
  { to: '/lich-su', label: 'Lịch sử', icon: '☰' },
  { to: '/thong-ke', label: 'Thống kê', icon: '◔' },
  { to: '/danh-muc', label: 'Danh mục', icon: '▦' },
  { to: '/tai-khoan', label: 'Tài khoản', icon: '◉' },
]

export function Layout() {
  const { member } = useAuth()
  return (
    <div className="min-h-dvh md:flex">
      {/* Sidebar (máy tính) */}
      <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-surface p-3 md:flex">
        <div className="mb-6 px-3 pt-2">
          <div className="text-lg font-bold">💸 Chi tiêu</div>
          <div className="text-xs text-muted">Xin chào, {member?.display_name}</div>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  isActive ? 'bg-accent/12 text-accent' : 'text-ink-2 hover:bg-surface-2'
                }`
              }
            >
              <span className="w-5 text-center" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
        <Outlet />
      </main>

      {/* Bottom nav (điện thoại) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${isActive ? 'text-accent' : 'text-muted'}`
            }
          >
            <span className="text-lg leading-none" aria-hidden>
              {n.icon}
            </span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
