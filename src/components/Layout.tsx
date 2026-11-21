import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BarChart3, History, Home, Layers, LogOut, Plus, Settings, type LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useQuickAdd } from '../context/QuickAddContext'
import { Avatar } from './ui'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}
const NAV: NavItem[] = [
  { to: '/', label: 'Tổng quan', icon: Home, end: true },
  { to: '/lich-su', label: 'Lịch sử', icon: History },
  { to: '/thong-ke', label: 'Thống kê', icon: BarChart3 },
  { to: '/danh-muc', label: 'Danh mục', icon: Layers },
]

export function Logo({ size = 48 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full bg-grad font-display font-bold text-white shadow-[0_6px_18px_rgba(138,100,48,.25),0_0_0_2px_rgba(207,169,106,.55)]"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      ₫
    </span>
  )
}

export function Layout() {
  const { member, signOut } = useAuth()
  const openAdd = useQuickAdd()
  const { pathname } = useLocation()

  return (
    <>
      <div className="grid-bg" />
      <div className="lg:flex">
        {/* ============ Sidebar (máy tính) ============ */}
        <aside className="sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col p-4 lg:flex">
          <div className="card flex h-full flex-col p-4">
            <Link to="/" className="mb-6 flex items-center gap-3 px-1 pt-1">
              <Logo size={42} />
              <div className="min-w-0">
                <div className="text-gradient font-display text-[17px] font-bold leading-tight">Chi tiêu gia đình</div>
                <div className="text-[11.5px] text-muted">Thu chi · thống kê</div>
              </div>
            </Link>

            <button className="btn-primary mb-5 w-full py-3" onClick={() => openAdd('out')}>
              <Plus className="h-5 w-5" /> Ghi giao dịch
              <kbd className="ml-auto rounded-md bg-white/20 px-1.5 py-0.5 font-sans text-[10.5px] font-semibold">N</kbd>
            </button>

            <nav className="flex flex-col gap-1">
              {NAV.map((n) => (
                <SideLink key={n.to} item={n} />
              ))}
            </nav>

            <div className="mt-auto space-y-1 border-t border-line pt-3">
              <SideLink item={{ to: '/tai-khoan', label: 'Tài khoản', icon: Settings }} />
              <div className="mt-2 flex items-center gap-3 rounded-xl bg-white/60 p-2.5">
                <Avatar name={member?.display_name ?? '?'} seed={member?.email} size={34} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold">{member?.display_name}</div>
                  <div className="text-[11px] text-muted">{member?.role === 'admin' ? 'Admin' : 'Thành viên'}</div>
                </div>
                <button onClick={signOut} className="btn-icon h-8 w-8 border-transparent bg-transparent" title="Đăng xuất" aria-label="Đăng xuất">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ============ Nội dung ============ */}
        <div className="min-w-0 flex-1">
          {/* Thanh trên (điện thoại / tablet) */}
          <header className="sticky top-0 z-30 border-b border-white/60 bg-[rgba(243,238,223,.78)] backdrop-blur-xl lg:hidden">
            <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
              <Link to="/" className="flex items-center gap-2.5">
                <Logo size={34} />
                <span className="text-gradient font-display text-[16px] font-bold">Chi tiêu gia đình</span>
              </Link>
              <Link to="/tai-khoan" className="ml-auto" aria-label="Tài khoản">
                <Avatar name={member?.display_name ?? '?'} seed={member?.email} size={34} />
              </Link>
            </div>
          </header>

          <main key={pathname} className="animate-rise mx-auto w-full max-w-3xl px-4 pb-32 pt-4 lg:max-w-[1180px] lg:px-8 lg:pb-12 lg:pt-8">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ============ Thanh đáy (điện thoại / tablet) ============ */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(74,58,30,.1)] backdrop-blur-xl lg:hidden"
        aria-label="Điều hướng"
      >
        <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
          {NAV.slice(0, 2).map((n) => (
            <BottomLink key={n.to} item={n} />
          ))}
          <div className="flex justify-center">
            <button
              onClick={() => openAdd('out')}
              className="bg-grad -mt-6 grid h-14 w-14 place-items-center rounded-full text-white shadow-[0_10px_26px_rgba(176,132,64,.45),0_0_0_5px_rgba(243,238,223,.95)] transition active:scale-95"
              aria-label="Ghi giao dịch"
            >
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
          </div>
          {NAV.slice(2).map((n) => (
            <BottomLink key={n.to} item={n} />
          ))}
        </div>
      </nav>
    </>
  )
}

function SideLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition ${
          isActive ? 'bg-white text-accent-deep shadow-[0_4px_14px_rgba(74,58,30,.08)]' : 'text-muted hover:bg-white/50 hover:text-ink'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`grid h-8 w-8 place-items-center rounded-lg ${isActive ? 'bg-grad shadow-glow text-white' : ''}`}>
            <item.icon className="h-[18px] w-[18px]" />
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  )
}

function BottomLink({ item }: { item: NavItem }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 pb-2 pt-2.5 text-[10.5px] font-semibold transition ${isActive ? 'text-accent-deep' : 'text-muted'}`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`grid h-7 w-12 place-items-center rounded-full transition ${isActive ? 'bg-[rgba(176,132,64,.16)]' : ''}`}>
            <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  )
}

export function PageHeader({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="font-display text-[22px] font-bold tracking-tight lg:text-[26px]">{title}</h1>
        {sub && <p className="mt-0.5 text-[13px] text-muted">{sub}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
