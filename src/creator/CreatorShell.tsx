// 创作中心主 Shell:侧边栏 + Outlet
import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { AppShell } from '../App'
import { useAuth } from '../lib/auth'
import { creatorNav } from './sidebar'
import { useCreatorNav } from './useCreatorNav'

export function CreatorShell() {
  const { user } = useAuth()
  const { isActive } = useCreatorNav()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const location = useLocation()

  function closeDrawer() {
    setDrawerOpen(false)
  }

  return (
    <AppShell>
      <div className="creator-layout">
        {drawerOpen ? (
          <div
            aria-label="关闭侧边栏"
            className="creator-mobile-backdrop"
            role="presentation"
            onClick={closeDrawer}
          />
        ) : null}

        <aside className={`creator-sidebar${drawerOpen ? ' is-open' : ''}`} aria-label="创作中心导航">
          <div className="creator-side-head">
            <div className="creator-side-avatar" aria-hidden="true">
              {(user?.avatarLetter || user?.username?.slice(0, 1) || 'U').toUpperCase()}
            </div>
            <div>
              <strong className="creator-side-name">{user?.username || '创作者'}</strong>
              <span className="creator-side-level">LV.1 创作者</span>
            </div>
          </div>

          <Link className="creator-side-back" to="/" onClick={closeDrawer}>
            ← 返回主站
          </Link>

          <nav>
            {creatorNav.map((group) => (
              <div key={group.label}>
                <div className="creator-side-group">{group.label}</div>
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    className={({ isActive: navActive }) => {
                      const active = navActive || isActive(item.path)
                      return `creator-side-link${active ? ' is-active' : ''}`
                    }}
                    to={item.path}
                    onClick={closeDrawer}
                  >
                    {item.icon ? <span className="creator-side-link-icon" aria-hidden="true">{item.icon}</span> : null}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <main className="creator-main">
          <button
            aria-label="打开侧边栏"
            className="creator-mobile-trigger"
            type="button"
            onClick={() => setDrawerOpen(true)}
          >
            ☰ 创作中心导航
          </button>
          <Outlet key={location.pathname} />
        </main>
      </div>
    </AppShell>
  )
}
