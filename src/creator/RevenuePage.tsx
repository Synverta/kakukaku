// 收益管理 — 真实数据 + 来源拆分 + 趋势图 + 明细
import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatCents, formatDate } from './components/format'
import { ContentTable, Pagination } from './components/ContentTable'
import { BarChart } from './components/BarChart'
import { REVENUE_SOURCE_LABELS, type RevenueEntry, type RevenueSource, type RevenueSummary, type StatsRange } from './types'

const RANGE_OPTIONS: { key: StatsRange; label: string }[] = [
  { key: '7d', label: '近 7 天' },
  { key: '30d', label: '近 30 天' },
  { key: '90d', label: '近 90 天' },
]

const PAGE_SIZE = 15

export function RevenuePage() {
  const [range, setRange] = useState<StatsRange>('30d')
  const [data, setData] = useState<RevenueSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const result = await api.get<RevenueSummary>(`/creator/revenue?range=${range}`)
        if (!cancelled) setData(result)
      } catch (err) {
        if (!cancelled) {
          const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
          setError(message || '加载收益数据失败')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [range])

  const trendRows = (data?.trend ?? []).map((p) => ({ label: p.date.slice(5), value: p.amountCents / 100 }))
  const totalPages = data ? Math.ceil(data.entries.length / PAGE_SIZE) : 0
  const pageItems = data ? data.entries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : []

  const deltaPercent =
    data && data.prevCents > 0
      ? Math.round(((data.totalCents - data.prevCents) / data.prevCents) * 100)
      : data && data.prevCents === 0 && data.totalCents > 0
        ? 100
        : 0

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">粉丝与收益</span>
          <h1 className="creator-page-title">收益管理</h1>
          <p className="creator-page-sub">查看你的创作激励、充电、商单、活动等收益明细</p>
        </div>
        <div className="creator-page-actions">
          <div className="creator-chip-group">
            {RANGE_OPTIONS.map((r) => (
              <button
                key={r.key}
                className={`creator-chip${range === r.key ? ' is-active' : ''}`}
                type="button"
                onClick={() => {
                  setRange(r.key)
                  setPage(1)
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <div className="creator-error">{error}</div> : null}

      {data ? (
        <>
          <section
            className="creator-chart-card"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '1.4rem',
              marginBottom: '1.4rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                累计收益
              </span>
              <div className="creator-revenue-total" style={{ marginTop: '0.4rem' }}>
                {formatCents(data.totalCents)}
              </div>
              <div className={`creator-revenue-delta ${deltaPercent >= 0 ? 'up' : 'down'}`}>
                {deltaPercent >= 0 ? '↑' : '↓'} {Math.abs(deltaPercent)}% vs 上一周期
              </div>
            </div>

            <div className="creator-revenue-grid" style={{ gridColumn: 'span 2' }}>
              {(['views', 'charging', 'brand', 'activity'] as RevenueSource[]).map((src) => {
                const found = data.bySource.find((b) => b.source === src)
                return (
                  <div key={src} className="creator-revenue-source">
                    <span className="label">{REVENUE_SOURCE_LABELS[src]}</span>
                    <span className="value">{formatCents(found?.amountCents ?? 0)}</span>
                    <span className="percent">占比 {found?.percent ?? 0}%</span>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="creator-chart-card" style={{ marginBottom: '1.4rem' }}>
            <div className="creator-chart-head">
              <h3>每日收益趋势</h3>
              <span className="note">按天聚合 · 单位:元</span>
            </div>
            {loading ? (
              <div style={{ color: 'var(--text-tertiary)' }}>加载中…</div>
            ) : trendRows.length === 0 ? (
              <div style={{ color: 'var(--text-tertiary)' }}>暂无数据</div>
            ) : (
              <BarChart rows={trendRows} unit="" />
            )}
          </section>

          <ContentTable
            toolbar={
              <span className="cell-muted">最近 {data.entries.length} 条收益明细</span>
            }
            pagination={
              totalPages > 1 ? (
                <Pagination page={page} pageSize={PAGE_SIZE} total={data.entries.length} onChange={setPage} />
              ) : undefined
            }
          >
            <table className="creator-table">
              <thead>
                <tr>
                  <th>来源</th>
                  <th>金额</th>
                  <th>说明</th>
                  <th>日期</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
                      暂无收益记录
                    </td>
                  </tr>
                ) : (
                  pageItems.map((e: RevenueEntry) => (
                    <tr key={e.id}>
                      <td>
                        <span className="creator-status-pill visible">
                          {REVENUE_SOURCE_LABELS[e.source as RevenueSource] ?? e.source}
                        </span>
                      </td>
                      <td className="cell-strong">{formatCents(e.amountCents)}</td>
                      <td className="cell-muted">{e.memo}</td>
                      <td className="cell-muted" title={formatDate(e.createdAt)}>
                        {e.occurredOn}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ContentTable>
        </>
      ) : null}
    </>
  )
}
