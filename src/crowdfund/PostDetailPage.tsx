import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AppShell } from '../App'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type Post = { id: number; title: string; body: string; adoptionStatus: string; adoptionNote: string; voteScore: number; author: { name: string } }
type Comment = { id: number; body: string; author: { name: string }; voteScore: number }

export function PostDetailPage() {
  const { slug, postId } = useParams(); const { user } = useAuth(); const [post, setPost] = useState<Post | null>(null); const [comments, setComments] = useState<Comment[]>([]); const [body, setBody] = useState(''); const [notice, setNotice] = useState('')
  async function load() { if (!postId) return; const [p, c] = await Promise.all([api.get<{ post: Post }>(`/community-posts/${postId}`), api.get<{ comments: Comment[] }>(`/community-posts/${postId}/comments`)]); setPost(p.post); setComments(c.comments) }
  useEffect(() => { void load().catch(() => setNotice('帖子加载失败')) }, [postId])
  if (!slug || !postId) return <Navigate to="/communities" replace />
  async function comment(event: React.FormEvent) { event.preventDefault(); if (!user) return setNotice('请先登录'); await api.post(`/community-posts/${postId}/comments`, { body }); setBody(''); await load() }
  async function adopt(status: string) { try { await api.post(`/community-contributions/${postId}/adoption-events`, { status, note: status === 'adopted' ? '提案已进入制作计划' : '状态已更新' }); await load() } catch { setNotice('只有 IP 负责人或社区创建者可以更新采纳状态') } }
  return <AppShell><section className="section-block"><Link to={`/communities/${slug}`}>← 返回社区</Link><span className="section-kicker" style={{ marginTop: '1rem' }}>贡献状态：{post?.adoptionStatus ?? '待评审'}</span><h1>{post?.title ?? '加载中…'}</h1><p>{post?.body}</p><p>贡献者：{post?.author.name} · 赞同 {post?.voteScore}</p>{post?.adoptionNote ? <div className="community-notice">采纳说明：{post.adoptionNote}</div> : null}<div className="cf-hero-actions"><button onClick={() => adopt('reviewing')}>进入评审</button><button onClick={() => adopt('adopted')}>采纳提案</button><button onClick={() => adopt('in_production')}>进入制作</button><button onClick={() => adopt('declined')}>暂不采纳</button></div>{notice ? <div className="auth-error">{notice}</div> : null}</section><section className="section-block" style={{ marginTop: '1rem' }}><h2>讨论记录</h2>{comments.map((item) => <article className="comment-card" key={item.id}><strong>{item.author.name}</strong><p>{item.body}</p></article>)}<form className="cf-form-grid" onSubmit={comment}><label className="full-span">回复<textarea rows={4} value={body} onChange={(event) => setBody(event.target.value)} required /></label><button className="primary" type="submit">发布回复</button></form></section></AppShell>
}
