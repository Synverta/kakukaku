import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth, type AuthUser } from '../lib/auth'
import { api, getToken } from '../lib/api'

type UploadState = {
  fileName: string
  percent: number
  status: 'uploading' | 'done' | 'error'
  errorMessage?: string
} | null

function uploadAvatar(file: File, onProgress: (p: number) => void): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file, file.name)
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    })
    xhr.addEventListener('load', () => {
      let body: { error?: string; message?: string; url?: string } = {}
      try {
        body = JSON.parse(xhr.responseText || '{}')
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.url) {
        resolve({ url: body.url })
      } else {
        reject(new Error(body.message || body.error || `HTTP ${xhr.status}`))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('network_error')))
    const token = getToken()
    xhr.open('POST', '/api/uploads/cover')
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(form)
  })
}

function AvatarUploader({
  currentUrl,
  onUploaded,
}: {
  currentUrl: string
  onUploaded: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>(null)
  const [isDragging, setIsDragging] = useState(false)

  async function handleFile(file: File) {
    setState({ fileName: file.name, percent: 0, status: 'uploading' })
    try {
      const { url } = await uploadAvatar(file, (percent) => {
        setState({ fileName: file.name, percent, status: 'uploading' })
      })
      setState({ fileName: file.name, percent: 100, status: 'done' })
      onUploaded(url)
    } catch (err) {
      const message = err instanceof Error ? err.message : '上传失败'
      setState({ fileName: file.name, percent: 0, status: 'error', errorMessage: message })
    }
  }

  return (
    <div
      className={`avatar-uploader${isDragging ? ' is-dragging' : ''}${state?.status === 'error' ? ' is-error' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files?.[0]
        if (file && file.type.startsWith('image/')) void handleFile(file)
      }}
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
        accept="image/png,image/jpeg,image/webp"
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      <div className="avatar-preview">
        {currentUrl ? (
          <img src={currentUrl} alt="avatar" />
        ) : (
          <div className="avatar-letter-fallback">—</div>
        )}
        {state?.status === 'uploading' && (
          <div className="avatar-progress-ring">
            <span>{state.percent}%</span>
          </div>
        )}
      </div>
      <div className="avatar-meta">
        <strong>{state?.status === 'uploading' ? '上传中' : state?.status === 'error' ? '上传失败' : '更换头像'}</strong>
        {state?.status === 'uploading' ? (
          <span>{state.fileName} · {state.percent}%</span>
        ) : state?.status === 'error' ? (
          <span>{state.errorMessage}</span>
        ) : (
          <span>点击或拖入图片（PNG / JPG / WebP，最大 8MB）</span>
        )}
      </div>
    </div>
  )
}

type ProfileSectionProps = {
  user: AuthUser
}

function ProfileSection({ user }: ProfileSectionProps) {
  const { updateProfile } = useAuth()
  const [username, setUsername] = useState(user.username)
  const [email, setEmail] = useState(user.email ?? '')
  const [bio, setBio] = useState(user.bio)
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl)
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    setUsername(user.username)
    setEmail(user.email ?? '')
    setBio(user.bio)
    setAvatarUrl(user.avatarUrl)
  }, [user])

  async function handleSave() {
    setFeedback(null)
    setSubmitting(true)
    try {
      await updateProfile({
        username: username.trim(),
        email: email.trim() || null,
        avatarUrl: avatarUrl.trim(),
        bio,
      })
      setFeedback({ kind: 'ok', text: '资料已更新' })
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : ''
      const error = typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: unknown }).error ?? '')
        : 'unknown_error'
      setFeedback({ kind: 'err', text: message || error || '保存失败' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>账号资料</h2>
        <p>用户名、邮箱、头像和简介</p>
      </header>

      <div className="account-profile-grid">
        <div className="account-profile-left">
          <AvatarUploader
            currentUrl={avatarUrl}
            onUploaded={(url) => {
              setAvatarUrl(url)
              setFeedback({ kind: 'ok', text: '头像已选择，记得点保存' })
            }}
          />
        </div>

        <div className="account-profile-right">
          <label>
            用户名 *
            <input
              className="creator-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              type="text"
            />
          </label>
          <label>
            邮箱
            <input
              className="creator-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="可选，用于找回账号"
              type="email"
            />
          </label>
          <label>
            头像直链(URL)
            <input
              className="creator-input"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="/uploads/covers/xxx.jpg 或 https://…"
              type="url"
            />
          </label>
          <label>
            简介(最多 200 字)
            <textarea
              className="creator-textarea"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="一句话介绍你自己"
            />
          </label>
        </div>
      </div>

      <div className="account-actions">
        {feedback ? (
          <span className={`account-feedback ${feedback.kind === 'ok' ? 'is-ok' : 'is-err'}`}>
            {feedback.text}
          </span>
        ) : null}
        <button
          type="button"
          className="primary-button"
          disabled={submitting || !username.trim()}
          onClick={() => void handleSave()}
        >
          {submitting ? '保存中…' : '保存修改'}
        </button>
      </div>
    </section>
  )
}

function PasswordSection() {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function handleSubmit() {
    setFeedback(null)
    if (newPassword.length < 8) {
      setFeedback({ kind: 'err', text: '新密码至少 8 位' })
      return
    }
    if (newPassword !== confirmPassword) {
      setFeedback({ kind: 'err', text: '两次输入的新密码不一致' })
      return
    }
    if (newPassword === currentPassword) {
      setFeedback({ kind: 'err', text: '新密码不能与旧密码相同' })
      return
    }
    setSubmitting(true)
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setFeedback({ kind: 'ok', text: '密码已更新' })
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : ''
      const error = typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: unknown }).error ?? '')
        : ''
      setFeedback({ kind: 'err', text: message || error || '修改失败' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="account-section">
      <header>
        <h2>修改密码</h2>
        <p>修改后需要重新登录</p>
      </header>

      <form
        className="creator-form-grid"
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
      >
        <label>
          当前密码 *
          <input
            className="creator-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>
        <label>
          新密码(8-128 位) *
          <input
            className="creator-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
          />
        </label>
        <label className="full-span">
          确认新密码 *
          <input
            className="creator-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
          />
        </label>
        <div className="full-span account-actions">
          {feedback ? (
            <span className={`account-feedback ${feedback.kind === 'ok' ? 'is-ok' : 'is-err'}`}>
              {feedback.text}
            </span>
          ) : null}
          <button
            type="submit"
            className="primary-button"
            disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
          >
            {submitting ? '更新中…' : '更新密码'}
          </button>
        </div>
      </form>
    </section>
  )
}

function DeleteSection() {
  const { deleteAccount } = useAuth()
  const navigate = useNavigate()
  const [confirmText, setConfirmText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const CONFIRM_PHRASE = 'DELETE_MY_ACCOUNT'

  async function handleDelete() {
    setFeedback(null)
    if (confirmText !== CONFIRM_PHRASE) {
      setFeedback({ kind: 'err', text: `请输入确认短语 "${CONFIRM_PHRASE}" 以继续` })
      return
    }
    if (!window.confirm('确定要注销当前账号吗？此操作不可撤销（30 天内联系客服可恢复）。')) {
      return
    }
    setSubmitting(true)
    try {
      await api.delete('/auth/me', { confirm: CONFIRM_PHRASE })
        .then(async () => {
          await deleteAccount()
          return null
        })
      setFeedback({ kind: 'ok', text: '账号已注销' })
      setTimeout(() => navigate('/'), 1000)
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err
        ? String((err as { message?: unknown }).message ?? '')
        : ''
      const error = typeof err === 'object' && err && 'error' in err
        ? String((err as { error?: unknown }).error ?? '')
        : ''
      setFeedback({ kind: 'err', text: message || error || '注销失败' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="account-section account-danger">
      <header>
        <h2>注销账号</h2>
        <p>30 天内可联系客服恢复，之后将永久删除</p>
      </header>
      <ul className="account-danger-list">
        <li>头像、简介、个人信息将立即被清空</li>
        <li>账号名将被替换为 deleted_&lt;uid&gt;，无法登录</li>
        <li>已发布的视频 / 评论会保留，但会显示「已注销用户」</li>
        <li>酷币余额保留 30 天，恢复账号后可继续使用</li>
      </ul>
      <label className="account-confirm">
        输入 <code>{CONFIRM_PHRASE}</code> 以确认
        <input
          className="creator-input"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          type="text"
          autoComplete="off"
          spellCheck={false}
        />
      </label>
      <div className="account-actions">
        {feedback ? (
          <span className={`account-feedback ${feedback.kind === 'ok' ? 'is-ok' : 'is-err'}`}>
            {feedback.text}
          </span>
        ) : null}
        <button
          type="button"
          className="danger-button"
          disabled={submitting || confirmText !== CONFIRM_PHRASE}
          onClick={() => void handleDelete()}
        >
          {submitting ? '注销中…' : '永久注销账号'}
        </button>
      </div>
    </section>
  )
}

export function AccountPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="creator-page-head">
        <span className="creator-page-eyebrow">账号设置</span>
        <p className="creator-page-sub">正在加载...</p>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="creator-page">
      <div className="creator-page-head">
        <div>
          <span className="creator-page-eyebrow">账号设置</span>
          <h1 className="creator-page-title">管理你的账号</h1>
          <p className="creator-page-sub">修改资料、密码，或注销账号。所有修改都需要重新登录后才能完全生效。</p>
        </div>
      </div>

      <ProfileSection user={user} />
      <PasswordSection />
      <DeleteSection />
    </div>
  )
}
