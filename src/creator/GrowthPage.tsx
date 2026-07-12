// 任务中心 — 真实数据 + 进度条 + 领取
import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { CreatorMission, MissionStatus } from './types'

const STATUS_LABELS: Record<MissionStatus, string> = {
  active: '进行中',
  done: '已完成',
  claimed: '已领取',
}

const STATUS_ORDER: MissionStatus[] = ['active', 'done', 'claimed']

export function GrowthPage() {
  const [missions, setMissions] = useState<CreatorMission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<{ missions: CreatorMission[] }>('/creator/missions')
      setMissions(result.missions ?? [])
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setError(message || '加载任务失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function handleClaim(id: number) {
    setActionError(null)
    try {
      await api.post(`/creator/missions/${id}/claim`, {})
      void load()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setActionError(message || '领取失败')
    }
  }

  const grouped: Record<MissionStatus, CreatorMission[]> = {
    active: [],
    done: [],
    claimed: [],
  }
  missions.forEach((m) => grouped[m.status].push(m))

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">创作成长</span>
          <h1 className="creator-page-title">任务中心</h1>
          <p className="creator-page-sub">完成平台任务,获得流量曝光、创作激励和专属权益</p>
        </div>
      </div>

      {actionError ? <div className="creator-error">{actionError}</div> : null}
      {error ? <div className="creator-error">{error}</div> : null}

      {loading ? (
        <div className="creator-stub-page">加载中…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.6rem' }}>
          {STATUS_ORDER.map((status) => {
            const list = grouped[status]
            if (list.length === 0) return null
            return (
              <section key={status}>
                <div className="creator-chart-head" style={{ marginBottom: '0.7rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {STATUS_LABELS[status]} · {list.length}
                  </h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {list.map((m) => {
                    const percent = Math.min(100, Math.round((m.progress / m.target) * 100))
                    const isDone = m.status === 'done'
                    const isClaimed = m.status === 'claimed'
                    return (
                      <article
                        key={m.id}
                        className={`creator-mission-card${isDone ? ' is-done' : ''}${isClaimed ? ' is-claimed' : ''}`}
                      >
                        <div>
                          <div className="title">{m.title}</div>
                          <div className="reward">奖励:{m.rewardText}</div>
                        </div>
                        {isDone ? (
                          <button
                            className="primary-button"
                            type="button"
                            onClick={() => void handleClaim(m.id)}
                          >
                            领取
                          </button>
                        ) : isClaimed ? (
                          <span className="creator-status-pill claimed">已领取</span>
                        ) : (
                          <span className="cell-muted">{percent}%</span>
                        )}
                        <div className="creator-mission-progress">
                          <span style={{ width: `${percent}%` }} />
                        </div>
                        <div className="progress-text">
                          <span>
                            进度 {m.progress} / {m.target}
                          </span>
                          <span>{percent}%</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}

          {missions.length === 0 ? (
            <div className="creator-stub-page">
              <h2>暂无任务</h2>
              <p>下一阶段将上线 5 个新手任务 · 当前可能是数据库尚未播种</p>
            </div>
          ) : null}
        </div>
      )}
    </>
  )
}
