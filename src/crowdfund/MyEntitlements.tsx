import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { AppShell } from '../App'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type Delivery = { id: number; title: string; description: string; kind: string; resourceUrl: string; status: string; releasedAt: string | null }
type Entitlement = { id: number; campaign_id: string; project_title: string; name: string; benefits: string[]; status: string; granted_at: string; deliveries: Delivery[] }

export function MyEntitlements() {
  const { user, loading } = useAuth(); const [items, setItems] = useState<Entitlement[]>([]); const [error, setError] = useState('')
  useEffect(() => { if (user) api.get<{ entitlements: Entitlement[] }>('/me/entitlements').then((result) => setItems(result.entitlements)).catch(() => setError('数字权益加载失败')) }, [user])
  if (loading) return <AppShell><div className="empty-state"><h3>正在读取账号…</h3></div></AppShell>
  if (!user) return <Navigate to="/login" replace />
  return <AppShell><section className="section-block"><span className="section-kicker">我的数字权益</span><h1>权益与交付</h1><p>这里展示支付完成后发放的具体权益、制作交付和退款撤销状态。</p></section>{error ? <div className="auth-error">{error}</div> : null}<section className="section-block" style={{ marginTop: '1rem' }}><div className="cf-order-list">{items.map((item) => <article className="cf-order" key={item.id}><div className="cf-order-head"><span className="cf-order-badge">{item.status}</span></div><div className="cf-order-main"><Link className="cf-order-title" to={`/cocreate/project/${item.campaign_id}`}>{item.project_title} · {item.name}</Link><ul>{item.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>{item.deliveries.map((delivery) => <p key={delivery.id}><strong>{delivery.title}</strong>：{delivery.description} {delivery.resourceUrl ? <a href={delivery.resourceUrl} target="_blank" rel="noreferrer">查看交付</a> : null}</p>)}</div></article>)}{items.length === 0 ? <div className="empty-state"><h3>还没有数字权益</h3><Link to="/cocreate">浏览共创项目</Link></div> : null}</div></section></AppShell>
}
