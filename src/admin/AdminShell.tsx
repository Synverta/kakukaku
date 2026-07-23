import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppShell } from '../App'
import { useAuth } from '../lib/auth'

const NAV_ITEMS: { path: string; label: string }[] = [
  { path: '/admin/cases', label: '举报工单' },
  { path: '/admin/appeals', label: '申诉队列' },
  { path: '/admin/audit', label: '审核日志' },
]

export function AdminShell() {
  const { user, loading, isAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <AppShell>
        <div className="admin-loading">加载中…</div>
      </AppShell>
    )
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (!isAdmin) {
    return (
      <AppShell>
        <div className="admin-forbidden">
          <h2>无权访问审核后台</h2>
          <p>该页面仅向平台管理员开放。</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="admin-layout">
        <aside className="admin-sidebar" aria-label="审核后台导航">
          <div className="admin-side-head">
            <strong>审核后台</strong>
            <span>{user.username}</span>
          </div>
          <nav>
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                className={({ isActive }) => `admin-side-link${isActive ? ' is-active' : ''}`}
                to={item.path}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="admin-main">
          <Outlet key={location.pathname} />
        </main>
      </div>
    </AppShell>
  )
}