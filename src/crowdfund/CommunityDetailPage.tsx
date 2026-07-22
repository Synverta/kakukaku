import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../App'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type Community = { slug: string; name: string; description: string; accent: string; memberCount: number; joined: boolean; creatorId: number | null; ipId: number | null }
type Post = { id: number; title: string; body: string; category: string; tags: string[]; voteScore: number; commentCount: number; viewerVote: number; adoptionStatus: string; author: { name: string } }

export function CommunityDetailPage() {
  const { slug } = useParams(); const { user } = useAuth()
  const [community, setCommunity] = useState<Community | null>(null); const [posts, setPosts] = useState<Post[]>([]); const [error, setError] = useState('')
  const [title, setTitle] = useState(''); const [body, setBody] = useState(''); const [kind, setKind] = useState('idea')

  async function load() {
    if (!slug) return
    try {
      const [communityResult, postResult] = await Promise.all([
        api.get<{ community: Community }>(`/communities/${slug}`),
        api.get<{ posts: Post[] }>(`/communities/${slug}/posts`),
      ])
      setCommunity(communityResult.community); setPosts(postResult.posts)
    } catch { setError('社区加载失败') }
  }
  useEffect(() => { void load() }, [slug])
  if (!slug) return <Navigate to="/communities" replace />

  async function submitContribution(event: React.FormEvent) {
    event.preventDefault()
    if (!user) { setError('请先登录再提交共创提案'); return }
    try {
      await api.post(`/communities/${slug}/contributions`, { title, body, kind, creditName: user.username })
      setTitle(''); setBody(''); await load()
    } catch { setError(community?.ipId ? '提案提交失败' : '该社区尚未关联 IP 工作室') }
  }

  async function vote(post: Post, direction: 1 | -1) {
    if (!user) { setError('请先登录再投票'); return }
    const result = await api.post<{ viewerVote: number; voteScore: number }>(`/community-posts/${post.id}/vote`, { direction })
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, ...result } : item))
  }

  return <AppShell>
    <section className="community-home-hero" style={{ background: community?.accent }}>
      <div className="community-home-hero-copy"><span className="community-home-eyebrow">IP 共创社区</span><h1>{community?.name ?? '加载中…'}</h1><p>{community?.description}</p></div>
    </section>
    {error ? <div className="community-notice">{error}</div> : null}
    <div className="content-grid" style={{ marginTop: '1.5rem' }}>
      <main className="section-block">
        <div className="section-heading"><div><span className="section-kicker">提案与讨论</span><h2>社区共创记录</h2></div></div>
        <div className="community-directory-list">
          {posts.map((post) => <article className="community-row" key={post.id}>
            <div><span className="section-kicker">{post.category} · {post.adoptionStatus === 'none' ? '待评审' : post.adoptionStatus}</span><h3><Link to={`/communities/${slug}/posts/${post.id}`}>{post.title}</Link></h3><p>{post.body}</p><small>由 {post.author.name} 提交 · {post.commentCount} 条讨论</small></div>
            <div><button type="button" onClick={() => vote(post, 1)}>赞同 {post.voteScore}</button><button type="button" onClick={() => vote(post, -1)}>反对</button></div>
          </article>)}
          {posts.length === 0 ? <div className="community-empty">还没有提案，提交第一条共创记录。</div> : null}
        </div>
      </main>
      <aside className="section-block">
        <span className="section-kicker">提交贡献</span><h2>发起共创提案</h2>
        <form className="cf-form-grid" onSubmit={submitContribution}>
          <label>类型<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="idea">创意</option><option value="script">剧本</option><option value="character">角色</option><option value="artwork">美术</option><option value="music">音乐</option></select></label>
          <label className="full-span">标题<input value={title} onChange={(event) => setTitle(event.target.value)} required minLength={4} /></label>
          <label className="full-span">内容<textarea value={body} onChange={(event) => setBody(event.target.value)} required minLength={4} rows={6} /></label>
          <button className="primary" type="submit">提交并记录贡献</button>
        </form>
      </aside>
    </div>
  </AppShell>
}
