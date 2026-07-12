// 视频详情页 — 编辑 + 单视频数据
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import { categories } from '../data/siteData'
import { formatCompact, formatDate } from './components/format'
import { StatCard } from './components/StatCard'
import { VIDEO_STATUS_LABELS, type CreatorVideo, type VideoStatus } from './types'

export function VideoDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const videoId = Number(id)
  const [video, setVideo] = useState<CreatorVideo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 编辑字段
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('动画')
  const [tags, setTags] = useState('')
  const [videoSrc, setVideoSrc] = useState('')
  const [embedUrl, setEmbedUrl] = useState('')
  const [duration, setDuration] = useState('')

  const load = useCallback(async () => {
    if (!Number.isFinite(videoId)) {
      setError('无效的视频 ID')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<{ videos: CreatorVideo[] }>('/videos/mine')
      const found = (result.videos ?? []).find((v) => v.id === videoId)
      if (!found) {
        setError('作品不存在或已被删除')
        return
      }
      setVideo(found)
      setTitle(found.title)
      setDescription(found.description)
      setCategory(found.category)
      setTags(found.tags.join(', '))
      setVideoSrc(found.videoSrc)
      setEmbedUrl(found.embedUrl)
      setDuration(found.duration)
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setError(message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [videoId])

  useEffect(() => {
    void load()
  }, [load])

  async function handleSave() {
    if (!video) return
    if (!title.trim()) {
      setFeedback('标题不能为空')
      return
    }
    setSaving(true)
    setFeedback(null)
    try {
      await api.patch(`/videos/${video.id}`, {
        title: title.trim(),
        description,
        category,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        videoSrc,
        embedUrl,
        duration,
      })
      setFeedback('保存成功')
      void load()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setFeedback(message || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleStatus(nextStatus: VideoStatus) {
    if (!video) return
    setSaving(true)
    setFeedback(null)
    try {
      await api.patch(`/videos/${video.id}`, { status: nextStatus })
      setFeedback(nextStatus === 'pending' ? '已提交审核' : '已撤回')
      void load()
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setFeedback(message || '操作失败')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!video) return
    if (!window.confirm(`确定删除「${video.title}」?删除后不可恢复。`)) return
    setSaving(true)
    try {
      await api.delete(`/videos/${video.id}`)
      navigate('/creator/works')
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      setFeedback(message || '删除失败')
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="creator-stub-page"><h2>加载中…</h2></div>
  }

  if (error || !video) {
    return (
      <>
        <div className="creator-page-head">
          <div>
            <span className="creator-page-eyebrow">作品详情</span>
            <h1 className="creator-page-title">未找到该作品</h1>
            <p className="creator-page-sub">{error || '该作品可能已被删除'}</p>
          </div>
          <div className="creator-page-actions">
            <button className="creator-chip" type="button" onClick={() => navigate('/creator/works')}>
              返回作品列表
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">
            {VIDEO_STATUS_LABELS[video.status]} · {video.category}
          </span>
          <h1 className="creator-page-title">{video.title}</h1>
          <p className="creator-page-sub">作品 ID: {video.id} · 更新于 {formatDate(video.updatedAt)}</p>
        </div>
        <div className="creator-page-actions">
          <button className="creator-chip" type="button" onClick={() => navigate('/creator/works')}>
            ← 返回列表
          </button>
        </div>
      </div>

      {feedback ? <div className="creator-error">{feedback}</div> : null}

      <div className="creator-detail-grid">
        <section className="creator-chart-card">
          <div className="creator-chart-head">
            <h3>编辑稿件</h3>
            <span className="note">保存后立即生效</span>
          </div>
          <form
            className="creator-form-grid"
            onSubmit={(e) => {
              e.preventDefault()
              void handleSave()
            }}
          >
            <label className="full-span">
              作品标题
              <input className="creator-input" value={title} onChange={(e) => setTitle(e.target.value)} type="text" />
            </label>
            <label className="full-span">
              作品简介
              <textarea className="creator-textarea" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </label>
            <label>
              分区
              <select className="creator-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.slice(2).map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              时长
              <input className="creator-input" value={duration} onChange={(e) => setDuration(e.target.value)} type="text" />
            </label>
            <label className="full-span">
              标签(逗号分隔)
              <input className="creator-input" value={tags} onChange={(e) => setTags(e.target.value)} type="text" />
            </label>
            <label className="full-span">
              视频直链
              <input className="creator-input" value={videoSrc} onChange={(e) => setVideoSrc(e.target.value)} type="url" />
            </label>
            <label className="full-span">
              第三方嵌入地址
              <input className="creator-input" value={embedUrl} onChange={(e) => setEmbedUrl(e.target.value)} type="url" />
            </label>
            <div className="full-span creator-form-actions">
              {video.status === 'draft' ? (
                <button type="button" className="creator-chip" disabled={saving} onClick={() => void handleStatus('pending')}>
                  提交审核
                </button>
              ) : null}
              {video.status === 'rejected' ? (
                <button type="button" className="creator-chip" disabled={saving} onClick={() => void handleStatus('pending')}>
                  重新提交
                </button>
              ) : null}
              {video.status === 'pending' ? (
                <button type="button" className="creator-chip" disabled={saving} onClick={() => void handleStatus('draft')}>
                  撤回草稿
                </button>
              ) : null}
              <button type="submit" className="primary-button" disabled={saving}>
                {saving ? '保存中…' : '保存修改'}
              </button>
              <button
                type="button"
                className="creator-chip"
                style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.4)' }}
                onClick={() => void handleDelete()}
              >
                删除
              </button>
            </div>
          </form>
        </section>

        <div className="creator-detail-side">
          <div className="creator-detail-hero">
            <div className="cover" style={{ background: video.cover || 'linear-gradient(135deg,#2868ff 0%,#18b6a0 100%)' }} />
            <div className="info">
              <span className="creator-page-eyebrow" style={{ background: 'var(--accent-soft)' }}>
                {video.category}
              </span>
              <h2>{video.title}</h2>
              <p>{video.description || '暂无简介'}</p>
              <div className="meta">
                {video.publishedAt ? <span>已发布:{formatDate(video.publishedAt)}</span> : null}
                {video.scheduledAt ? <span>定时:{formatDate(video.scheduledAt)}</span> : null}
                <span>创建:{formatDate(video.createdAt)}</span>
              </div>
              {video.status === 'rejected' && video.rejectReason ? (
                <p className="creator-reject-reason">退回原因:{video.rejectReason}</p>
              ) : null}
            </div>
          </div>

          <div className="creator-chart-card">
            <div className="creator-chart-head">
              <h3>数据概览</h3>
            </div>
            <div className="creator-detail-stats">
              <StatCard label="播放" value={formatCompact(video.views)} />
              <StatCard label="点赞" value={formatCompact(video.likes)} />
              <StatCard label="弹幕" value={formatCompact(video.danmakuCount)} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
