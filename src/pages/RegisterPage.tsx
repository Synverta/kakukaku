import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('两次输入的密码不一致')
      return
    }

    setSubmitting(true)
    try {
      await register(username.trim(), email.trim() || null, password)
      navigate('/profile')
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      const code = typeof err === 'object' && err && 'error' in err ? String((err as { error?: unknown }).error ?? '') : ''
      setError(message || code || '注册失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-layout">
      <div className="hero-copy auth-copy">
        <span className="eyebrow">创建账号</span>
        <h1>注册一个 kakukaku 创作人账号。</h1>
        <p>注册后可以发起 IP 共创计划、用 token 支持别人、把创作台/收藏/历史同步到服务端。</p>
        <div className="auth-benefits">
          <div>
            <strong>同步创作进度</strong>
            <p>跨设备继续编辑草稿、查看数据与粉丝互动。</p>
          </div>
          <div>
            <strong>支持 IP 共创</strong>
            <p>支持档位、获得分成、进入共创者榜单。</p>
          </div>
          <div>
            <strong>发起共创</strong>
            <p>用 IP 工坊预算一键发起属于自己的共创计划。</p>
          </div>
        </div>
      </div>

      <section className="section-block auth-panel">
        <div className="section-heading">
          <div>
            <span className="section-kicker">注册</span>
            <h2>创建你的账号</h2>
          </div>
        </div>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            用户名
            <input
              autoComplete="username"
              maxLength={40}
              minLength={3}
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <label>
            邮箱（可选）
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            密码
            <input
              autoComplete="new-password"
              maxLength={128}
              minLength={8}
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <label>
            确认密码
            <input
              autoComplete="new-password"
              maxLength={128}
              minLength={8}
              required
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
          </label>
          {error ? <div className="auth-error">{error}</div> : null}
          <button type="submit" className="primary-button full-button" disabled={submitting}>
            {submitting ? '正在创建…' : '创建账号并登录'}
          </button>
        </form>
        <div className="oauth-row">
          <Link to="/login" className="ghost-button full-button" style={{ display: 'inline-flex' }}>
            已有账号？去登录
          </Link>
        </div>
      </section>
    </section>
  )
}
