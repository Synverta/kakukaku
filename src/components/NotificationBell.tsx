import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationIcon,
  type Notification,
} from '../lib/notifications'

export function NotificationBell() {
  const { user } = useAuth()
  const [items, setItems] = useState<Notification[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    if (!user) {
      setItems([])
      setUnread(0)
      return
    }
    try {
      const result = await fetchNotifications()
      setItems(result.items ?? [])
      setUnread(result.unread ?? 0)
    } catch {
      // 静默失败，不打断 UI
    }
  }, [user])

  useEffect(() => {
    void load()
    if (!user) return
    const timer = window.setInterval(() => {
      void load()
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [user, load])

  if (!user) return null

  async function handleOpen() {
    setOpen((value) => !value)
    if (!open && unread > 0) {
      try {
        await markAllNotificationsRead()
        setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
        setUnread(0)
      } catch {
        // ignore
      }
    }
  }

  async function handleRead(notification: Notification) {
    if (notification.readAt) return
    try {
      await markNotificationRead(notification.id)
      setItems((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n)),
      )
      setUnread((value) => Math.max(0, value - 1))
    } catch {
      // ignore
    }
  }

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-bell-trigger"
        aria-label={`通知 ${unread} 条未读`}
        onClick={handleOpen}
      >
        <span aria-hidden="true">🔔</span>
        {unread > 0 ? <span className="notification-bell-dot" aria-hidden="true">{unread}</span> : null}
      </button>
      {open ? (
        <div className="notification-bell-panel" role="dialog" aria-label="通知">
          <div className="notification-bell-head">
            <strong>通知</strong>
            <Link to="/account/reports" onClick={() => setOpen(false)}>
              我的举报
            </Link>
          </div>
          {items.length === 0 ? (
            <div className="notification-bell-empty">暂无通知</div>
          ) : (
            <ul className="notification-bell-list">
              {items.slice(0, 20).map((item) => (
                <li
                  key={item.id}
                  className={`notification-bell-item${item.readAt ? '' : ' is-unread'}`}
                  onClick={() => void handleRead(item)}
                >
                  <span className="notification-bell-icon" aria-hidden="true">
                    {notificationIcon(item.type)}
                  </span>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.body}</p>
                    <small>{new Date(item.createdAt).toLocaleString('zh-CN')}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}