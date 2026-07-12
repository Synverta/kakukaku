// 纯 HTML/CSS 横向条形图,用于 Top 5 排行
type BarRow = { label: string; value: number; subLabel?: string }

type BarChartProps = {
  rows: BarRow[]
  unit?: string
  emptyHint?: string
}

function formatCompact(value: number): string {
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

export function BarChart({ rows, unit = '', emptyHint = '暂无数据' }: BarChartProps) {
  if (rows.length === 0) {
    return (
      <div className="creator-chart-card" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
        {emptyHint}
      </div>
    )
  }

  const max = Math.max(...rows.map((r) => r.value), 1)

  return (
    <div>
      {rows.map((row, index) => {
        const percent = (row.value / max) * 100
        return (
          <div key={`${row.label}-${index}`} className="creator-bar-row">
            <span className="creator-bar-label" title={row.label}>
              {row.label}
            </span>
            <div className="creator-bar-rail" aria-hidden="true">
              <span className="creator-bar-fill" style={{ width: `${percent}%` }} />
            </div>
            <span className="creator-bar-value">
              {formatCompact(row.value)}
              {unit}
            </span>
          </div>
        )
      })}
    </div>
  )
}
