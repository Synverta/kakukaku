// 投稿发布页 — 从 /upload PublishTab 迁移 + content_type 选择
import { useState } from 'react'
import { api } from '../lib/api'
import { categories } from '../data/siteData'
import { CONTENT_TYPE_LABELS, type ContentType } from './types'

const CONTENT_TYPES: ContentType[] = ['video', 'article', 'interactive', 'audio', 'sticker', 'material']

type PublishFormProps = {
  initial?: {
    title?: string
    description?: string
    category?: string
    tags?: string[]
    cover?: string
    videoSrc?: string
    embedUrl?: string
    duration?: string
    contentType?: ContentType
  }
  onSaved?: () => void
}

export function PublishPage(_props: PublishFormProps = {}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('动画')
  const [tags, setTags] = useState('')
  const [videoSrc, setVideoSrc] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [duration, setDuration] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [contentType, setContentType] = useState<ContentType>('video')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  function resetForm() {
    setTitle('')
    setDescription('')
    setCategory('动画')
    setTags('')
    setVideoSrc('')
    setEmbedUrl('')
    setDuration('')
    setScheduledAt('')
    setContentType('video')
  }

  async function submit(status: 'draft' | 'pending') {
    if (!title.trim()) {
      setFeedback('请填写作品标题')
      return
    }
    setSubmitting(true)
    setFeedback(null)
    try {
      await api.post('/videos', {
        title: title.trim(),
        description,
        category,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        videoSrc,
        embedUrl,
        duration: duration || '00:00',
        status,
        scheduledAt: scheduledAt || null,
        contentType,
        cover: 'linear-gradient(135deg, rgba(40,104,255,0.95) 0%, rgba(24,182,160,0.95) 100%)',
      })
      setFeedback(status === 'draft' ? '草稿已保存' : '已提交审核')
      resetForm()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setFeedback(message || '提交失败,请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">内容管理</span>
          <h1 className="creator-page-title">投稿新作品</h1>
          <p className="creator-page-sub">选择内容类型,填写稿件信息,保存为草稿或提交审核</p>
        </div>
      </div>

      {feedback ? <div className="creator-error">{feedback}</div> : null}

      <section className="creator-chart-card" style={{ marginBottom: '1.4rem' }}>
        <div className="creator-chart-head">
          <h3>选择内容类型</h3>
          <span className="note">不同类型会展示在不同的分区</span>
        </div>
        <div className="creator-chip-group">
          {CONTENT_TYPES.map((type) => (
            <button
              key={type}
              className={`creator-chip${contentType === type ? ' is-active' : ''}`}
              type="button"
              onClick={() => setContentType(type)}
            >
              {CONTENT_TYPE_LABELS[type]}
            </button>
          ))}
        </div>
      </section>

      <section className="creator-chart-card">
        <div className="creator-chart-head">
          <h3>稿件信息</h3>
          <span className="note">* 必填项</span>
        </div>
        <form
          className="creator-form-grid"
          onSubmit={(e) => {
            e.preventDefault()
            void submit('pending')
          }}
        >
          <label className="full-span">
            作品标题 *
            <input
              className="creator-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给作品起个好标题"
              type="text"
            />
          </label>
          <label className="full-span">
            作品简介
            <textarea
              className="creator-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="简要介绍作品内容"
            />
          </label>
          <label>
            分区
            <select
              className="creator-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {categories.slice(2).map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            时长
            <input
              className="creator-input"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="如 12:46"
              type="text"
            />
          </label>
          <label className="full-span">
            标签(逗号分隔)
            <input
              className="creator-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="原创动画, 城市景观"
              type="text"
            />
          </label>
          <label className="full-span">
            视频直链(MP4 等,可选用)
            <input
              className="creator-input"
              value={videoSrc}
              onChange={(e) => setVideoSrc(e.target.value)}
              placeholder="https://example.com/video.mp4"
              type="url"
            />
          </label>
          <label className="full-span">
            第三方嵌入地址(YouTube/Bilibili 等,优先使用以节省带宽)
            <input
              className="creator-input"
              value={embedUrl}
              onChange={(e) => setEmbedUrl(e.target.value)}
              placeholder="https://www.youtube.com/embed/xxx"
              type="url"
            />
          </label>
          <label>
            定时发布
            <input
              className="creator-input"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              type="datetime-local"
            />
          </label>
          <div className="full-span creator-form-actions">
            <button
              type="button"
              className="creator-chip"
              disabled={submitting}
              onClick={() => void submit('draft')}
            >
              保存草稿
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? '提交中…' : '提交审核'}
            </button>
          </div>
        </form>

        <div className="creator-tip-box">
          <strong>提示</strong>
          填入第三方嵌入地址后,作品将由 YouTube / Bilibili 等 CDN 负责传输,不消耗站内带宽。视频直链作为降级备用。
        </div>
      </section>
    </>
  )
}
