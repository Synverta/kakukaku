// 创作者权益 — 真实数据
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatDate } from './components/format'
import type { CreatorRight } from './types'

export function RightsPage() {
  const [rights, setRights] = useState<CreatorRight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await api.get<{ rights: CreatorRight[] }>('/creator/rights')
        if (!cancelled) setRights(result.rights ?? [])
      } catch (err) {
        if (!cancelled) {
          const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
          setError(message || '加载权益失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">创作者权益</span>
          <h1 className="creator-page-title">权益中心</h1>
          <p className="creator-page-sub">查看已开通和待解锁的创作者专属权益</p>
        </div>
      </div>

      {error ? <div className="creator-error">{error}</div> : null}

      {loading ? (
        <div className="creator-stub-page">加载中…</div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {rights.map((r) => (
            <article
              key={r.id}
              className={`creator-right-card${r.enabled ? '' : ' is-disabled'}`}
            >
              <div>
                <div className="title">{r.title}</div>
                <div className="detail">{r.detail}</div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                  开通时间:{formatDate(r.grantedAt)}
                </div>
              </div>
              <span
                className={`creator-right-pill${r.enabled ? ' granted' : ' disabled'}`}
              >
                {r.enabled ? '已开通' : '暂未达成'}
              </span>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
