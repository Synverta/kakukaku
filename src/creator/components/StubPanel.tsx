// 占位页面(用于花生 / updream / 推广 / 学院 / 暂未实现的内容类型)
import type { ReactNode } from 'react'

type StubPanelProps = {
  title: string
  description: string
  preview?: ReactNode
  ctaLabel?: string
}

export function StubPanel({ title, description, preview, ctaLabel = '敬请期待' }: StubPanelProps) {
  return (
    <section className="creator-page-head">
      <div>
        <span className="creator-page-eyebrow">Stub · 占位</span>
        <h1 className="creator-page-title">{title}</h1>
        <p className="creator-page-sub">{description}</p>
      </div>
    </section>
  )
}

export function StubCard({ title, description, preview, ctaLabel = '敬请期待' }: StubPanelProps) {
  return (
    <div className="creator-stub-page">
      <h2>{title}</h2>
      <p>{description}</p>
      {preview ? <div className="preview">{preview}</div> : null}
      <button className="primary-button" disabled type="button">
        {ctaLabel}
      </button>
    </div>
  )
}
