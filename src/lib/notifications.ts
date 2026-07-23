import { api } from './api'

export type NotificationType =
  | 'report_handled'
  | 'case_decision'
  | 'penalty_applied'
  | 'appeal_decided'

export type Notification = {
  id: number
  type: NotificationType
  title: string
  body: string
  payload: Record<string, unknown>
  readAt: string | null
  createdAt: string
}

export async function fetchNotifications(): Promise<{ items: Notification[]; unread: number }> {
  return api.get<{ items: Notification[]; unread: number }>('/notifications')
}

export async function markNotificationRead(id: number): Promise<{ ok: true }> {
  return api.post<{ ok: true }>(`/notifications/${id}/read`)
}

export async function markAllNotificationsRead(): Promise<{ ok: true }> {
  return api.post<{ ok: true }>('/notifications/read-all')
}

export function notificationIcon(type: NotificationType): string {
  switch (type) {
    case 'report_handled':
      return '🛡'
    case 'case_decision':
      return '⚖'
    case 'penalty_applied':
      return '⚠'
    case 'appeal_decided':
      return '✉'
    default:
      return '🔔'
  }
}