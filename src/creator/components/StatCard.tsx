// 创作中心 KPI 卡片
import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: string | number
  hint?: ReactNode
  delta?: { value: number; suffix?: string } | null
}

export function StatCard({ label, value, hint, delta }: StatCardProps) {
  let deltaClass = 'flat'
  let deltaText = '—'
  if (delta) {
    if (delta.value > 0) {
      deltaClass = 'up'
      deltaText = `↑ ${delta.value}${delta.suffix ?? ''}`
    } else if (delta.value < 0) {
      deltaClass = 'down'
      deltaText = `↓ ${Math.abs(delta.value)}${delta.suffix ?? ''}`
    } else {
      deltaText = `0${delta.suffix ?? ''}`
    }
  }

  return (
    <article className="creator-stat-card">
      <span className="label">{label}</span>
      <strong className="value">{value}</strong>
      {delta ? <span className={`delta ${deltaClass}`}>{deltaText}</span> : null}
      {hint ? <p className="hint">{hint}</p> : null}
    </article>
  )
}
