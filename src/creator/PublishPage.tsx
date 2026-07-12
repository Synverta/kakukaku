// 投稿发布页 — 从 /upload PublishTab 迁移 + content_type 选择
import { useRef, useState } from 'react'
import { api, getToken } from '../lib/api'
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

type UploadResult = {
  url: string
  relPath: string
  objectKey: string
  fileName: string
  originalName: string
  mimeType: string
  size: number
  maxSizeBytes: number
}

type UploadState = {
  fileName: string
  percent: number
  uploadedBytes: number
  totalBytes: number
  status: 'uploading' | 'done' | 'error'
  errorMessage?: string
} | null

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function uploadWithProgress(
  endpoint: '/api/uploads/video' | '/api/uploads/cover',
  file: File,
  onProgress: (percent: number, loaded: number, total: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file, file.name)

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100), event.loaded, event.total)
      }
    })
    xhr.addEventListener('load', () => {
      let body: { error?: string; message?: string } & Partial<UploadResult> = {}
      try {
        body = JSON.parse(xhr.responseText || '{}')
      } catch {
        body = {}
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as UploadResult)
        return
      }
      reject(new Error(body.message || body.error || `HTTP ${xhr.status}`))
    })
    xhr.addEventListener('error', () => reject(new Error('network_error')))
    xhr.addEventListener('abort', () => reject(new Error('aborted')))

    const token = getToken()
    xhr.open('POST', endpoint)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(form)
  })
}

function FilePickerZone({
  accept,
  label,
  hint,
  endpoint,
  onUploaded,
}: {
  accept: string
  label: string
  hint: string
  endpoint: '/api/uploads/video' | '/api/uploads/cover'
  onUploaded: (result: UploadResult) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function handleFile(file: File) {
    setState({
      fileName: file.name,
      percent: 0,
      uploadedBytes: 0,
      totalBytes: file.size,
      status: 'uploading',
    })
    try {
      const result = await uploadWithProgress(endpoint, file, (percent, loaded, total) => {
        setState({ fileName: file.name, percent, uploadedBytes: loaded, totalBytes: total, status: 'uploading' })
      })
      setState((prev) =>
        prev
          ? { ...prev, percent: 100, uploadedBytes: result.size, totalBytes: result.size, status: 'done' }
          : null,
      )
      onUploaded(result)
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败'
      setState((prev) => (prev ? { ...prev, status: 'error', errorMessage: message } : null))
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  function onSelectFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) void handleFile(file)
    event.target.value = ''
  }

  return (
    <div
      className={`upload-zone${isDragging ? ' is-dragging' : ''}${state?.status === 'error' ? ' is-error' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
    >
      <input
        ref={inputRef}
        accept={accept}
        onChange={onSelectFiles}
        type="file"
        style={{ display: 'none' }}
      />
      {state?.status === 'uploading' ? (
        <div className="upload-progress">
          <div className="upload-progress-head">
            <strong>{state.fileName}</strong>
            <span>{state.percent}%</span>
          </div>
          <div className="upload-progress-bar">
            <span style={{ width: `${state.percent}%` }} />
          </div>
          <div className="upload-progress-foot">
            {formatBytes(state.uploadedBytes)} / {formatBytes(state.totalBytes)}
          </div>
        </div>
      ) : state?.status === 'done' ? (
        <div className="upload-success">
          <strong>✓ {state.fileName}</strong>
          <span>{formatBytes(state.totalBytes)} · 已上传到服务器</span>
        </div>
      ) : state?.status === 'error' ? (
        <div className="upload-error">
          <strong>{state.fileName}</strong>
          <span>{state.errorMessage}</span>
        </div>
      ) : (
        <>
          <strong>{label}</strong>
          <span>{hint}</span>
          <em>点击选择文件，或将文件拖入此区域</em>
        </>
      )}
    </div>
  )
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
  const [cover, setCover] = useState(
    'linear-gradient(135deg, rgba(40,104,255,0.95) 0%, rgba(24,182,160,0.95) 100%)',
  )
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
    setCover('linear-gradient(135deg, rgba(40,104,255,0.95) 0%, rgba(24,182,160,0.95) 100%)')
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
        cover,
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

          <div className="full-span">
            <strong className="block-strong">直接上传到服务器</strong>
            <div className="upload-row">
              <FilePickerZone
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                label="点击选择视频文件"
                hint="MP4 / MOV / WebM，最大 2GB。上传后会自动填入下方的「视频直链」。"
                endpoint="/api/uploads/video"
                onUploaded={(result) => {
                  setVideoSrc(result.url)
                  setFeedback(`视频上传成功：${result.fileName}`)
                }}
              />
            </div>
            <label className="full-span" style={{ marginTop: '0.8rem' }}>
              视频直链(MP4 / 已上传视频的 URL)
              <input
                className="creator-input"
                value={videoSrc}
                onChange={(e) => setVideoSrc(e.target.value)}
                placeholder="https://example.com/video.mp4 或 /uploads/videos/xxx.mp4"
                type="url"
              />
            </label>
            <label className="full-span" style={{ marginTop: '0.8rem' }}>
              <strong className="block-strong">封面图(可选)</strong>
            </label>
            <div className="upload-row">
              <FilePickerZone
                accept="image/png,image/jpeg,image/webp"
                label="点击选择封面图"
                hint="PNG / JPG / WebP，最大 8MB。上传后会自动设为作品封面。"
                endpoint="/api/uploads/cover"
                onUploaded={(result) => {
                  setCover(result.url)
                  setFeedback(`封面上传成功：${result.fileName}`)
                }}
              />
            </div>
            <p className="creator-tip">
              当前封面：<code>{cover.slice(0, 80)}{cover.length > 80 ? '…' : ''}</code>
            </p>
          </div>

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
          三种视频来源优先级(从优到次): 第三方嵌入(零带宽) → 服务器直传(站内 7 天 CDN 缓存) → 视频直链(任意公开 URL)。
          直接上传最长支持 2GB;超出建议用阿里云 / 腾讯云对象存储再做直传升级。
        </div>
      </section>
    </>
  )
}
