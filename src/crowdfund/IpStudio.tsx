import { useMemo, useState } from 'react'
import { AppShell } from '../App'
import {
  ipAuthors,
  ipCategories,
  ipThreads,
  ipWeeklyTopic,
  type IpThread,
  type IpThreadCategory,
} from '../data/ipStudioData'

type FeedSort = 'hot' | 'new' | 'top'
type CommunityPost = IpThread & { isDraft?: boolean }

const adoptionByThread: Partial<Record<string, { label: string; note: string }>> = {
  'thread-001': { label: '已进入设定集', note: '创作者将把高架桥段落收进第二章分镜。' },
  'thread-004': { label: '本周采纳', note: '「夜市烧烤科学化」已进入下一期选题。' },
  'thread-007': { label: '创作者回复', note: '已收到角色组，正在整理五帧表情方案。' },
}

function getAuthor(authorId: string) {
  return ipAuthors.find((author) => author.id === authorId)
}

function scoreFor(thread: IpThread, voteDelta: number) {
  return thread.likes + voteDelta + thread.replies * 3
}

export function IpStudio() {
  const [sort, setSort] = useState<FeedSort>('hot')
  const [activeCategory, setActiveCategory] = useState<'all' | IpThreadCategory>('all')
  const [isJoined, setIsJoined] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [draftCategory, setDraftCategory] = useState<IpThreadCategory>('灵感征集')
  const [draftPosts, setDraftPosts] = useState<CommunityPost[]>([])
  const [votes, setVotes] = useState<Record<string, number>>({})
  const [activePostId, setActivePostId] = useState<string | null>(null)

  const allPosts = useMemo(() => [...draftPosts, ...ipThreads], [draftPosts])
  const visiblePosts = useMemo(() => {
    const list = allPosts.filter((post) => activeCategory === 'all' || post.category === activeCategory)

    return list.sort((left, right) => {
      if (sort === 'new') return right.id.localeCompare(left.id)
      if (sort === 'top') return right.likes + (votes[right.id] ?? 0) - (left.likes + (votes[left.id] ?? 0))
      return scoreFor(right, votes[right.id] ?? 0) - scoreFor(left, votes[left.id] ?? 0)
    })
  }, [activeCategory, allPosts, sort, votes])

  const activePost = allPosts.find((post) => post.id === activePostId)
  const memberCount = 24800 + (isJoined ? 1 : 0)

  function castVote(postId: string, direction: 1 | -1) {
    setVotes((current) => {
      const previous = current[postId] ?? 0
      return { ...current, [postId]: previous === direction ? 0 : direction }
    })
  }

  function submitPost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = draftTitle.trim()
    const content = draftBody.trim()
    if (!title || !content) return

    const now = Date.now()
    const post: CommunityPost = {
      id: `draft-${now}`,
      title,
      excerpt: content,
      content,
      category: draftCategory,
      authorId: 'user-feichuan',
      createdAt: '刚刚',
      views: '0',
      replies: 0,
      likes: 1,
      tags: ['共创提案'],
      lastReplyAt: '刚刚',
      lastReplyAuthorId: 'user-feichuan',
      isDraft: true,
    }

    setDraftPosts((current) => [post, ...current])
    setDraftTitle('')
    setDraftBody('')
    setIsComposerOpen(false)
    setActivePostId(post.id)
  }

  return (
    <AppShell>
      <section className="reddit-community-banner">
        <div className="reddit-banner-art" aria-hidden="true">
          <span className="reddit-banner-sun" />
          <span className="reddit-banner-orb reddit-banner-orb-one" />
          <span className="reddit-banner-orb reddit-banner-orb-two" />
        </div>
        <div className="reddit-community-head">
          <div className="reddit-community-icon" aria-hidden="true">雾</div>
          <div>
            <div className="reddit-community-kicker">IP CO-CREATION COMMUNITY</div>
            <h1>雾港计划</h1>
            <p>r/雾港计划 · 让每一条好设定都有机会进入作品</p>
          </div>
          <button
            type="button"
            className={`reddit-join-button${isJoined ? ' joined' : ''}`}
            onClick={() => setIsJoined((current) => !current)}
          >
            {isJoined ? '已加入' : '加入社区'}
          </button>
        </div>
      </section>

      <div className="reddit-layout">
        <main className="reddit-feed">
          <section className="reddit-community-nav" aria-label="社区导航">
            <button type="button" className="active">讨论</button>
            <button type="button">设定集</button>
            <button type="button">共创进度</button>
            <button type="button">精华</button>
          </section>

          <section className="reddit-composer-card">
            <div className="reddit-user-avatar">草</div>
            <button type="button" className="reddit-composer-trigger" onClick={() => setIsComposerOpen(true)}>
              为《雾港计划》发起一个讨论或共创提案
            </button>
            <button type="button" className="reddit-composer-image" aria-label="添加图片" onClick={() => setIsComposerOpen(true)}>▧</button>
          </section>

          {isComposerOpen ? (
            <form className="reddit-post-form" onSubmit={submitPost}>
              <div className="reddit-post-form-head">
                <strong>发起共创讨论</strong>
                <button type="button" aria-label="关闭" onClick={() => setIsComposerOpen(false)}>×</button>
              </div>
              <input
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="给你的提案写一个清晰标题"
                maxLength={100}
                autoFocus
              />
              <textarea
                value={draftBody}
                onChange={(event) => setDraftBody(event.target.value)}
                placeholder="说说你的设定、理由或参考作品。高质量提案会进入创作者待阅池。"
                rows={4}
              />
              <div className="reddit-post-form-foot">
                <select value={draftCategory} onChange={(event) => setDraftCategory(event.target.value as IpThreadCategory)}>
                  {ipCategories.filter((category) => category.id !== 'all').map((category) => (
                    <option key={category.id} value={category.id}>{category.label}</option>
                  ))}
                </select>
                <button type="submit" disabled={!draftTitle.trim() || !draftBody.trim()}>发布提案</button>
              </div>
            </form>
          ) : null}

          <section className="reddit-filter-bar">
            <div className="reddit-sort-tabs" role="tablist" aria-label="帖子排序">
              {([
                ['hot', '热门'],
                ['new', '最新'],
                ['top', '最高分'],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" className={sort === id ? 'active' : ''} onClick={() => setSort(id)}>
                  {label}
                </button>
              ))}
            </div>
            <label className="reddit-category-select">
              <span className="sr-only">选择讨论分区</span>
              <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value as 'all' | IpThreadCategory)}>
                {ipCategories.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
              </select>
            </label>
          </section>

          <div className="reddit-post-list">
            {visiblePosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                vote={votes[post.id] ?? 0}
                onVote={castVote}
                onOpen={() => setActivePostId(post.id)}
              />
            ))}
          </div>
        </main>

        <aside className="reddit-sidebar">
          <section className="reddit-about-card">
            <div className="reddit-sidebar-heading"><span>◒</span> 关于社区</div>
            <p>《雾港计划》是一部由创作者与观众共同搭建的原创悬疑动画。讨论、投票与采纳记录都会沉淀为可追溯的共创档案。</p>
            <div className="reddit-members">
              <div><strong>{memberCount.toLocaleString('zh-CN')}</strong><span>成员</span></div>
              <div><strong>186</strong><span>正在讨论</span></div>
            </div>
            <button type="button" className={`reddit-sidebar-join${isJoined ? ' joined' : ''}`} onClick={() => setIsJoined((current) => !current)}>
              {isJoined ? '✓ 已加入社区' : '加入共创'}
            </button>
            <div className="reddit-created">创建于 2026 年 4 月</div>
          </section>

          <section className="reddit-sidebar-card reddit-progress-card">
            <div className="reddit-sidebar-heading">本期共创进度 <span className="reddit-live-dot">● 进行中</span></div>
            <strong>第一章 · 失踪的灯塔守夜人</strong>
            <div className="reddit-progress-line"><span style={{ width: '68%' }} /></div>
            <div className="reddit-progress-meta"><span>设定收集</span><b>68%</b></div>
            <button type="button" onClick={() => setActiveCategory('灵感征集')}>查看待讨论提案 →</button>
          </section>

          <section className="reddit-sidebar-card">
            <div className="reddit-sidebar-heading">本周共创题</div>
            <strong>{ipWeeklyTopic.title}</strong>
            <p>{ipWeeklyTopic.description}</p>
            <button type="button" onClick={() => { setActiveCategory('灵感征集'); setIsComposerOpen(true) }}>参与话题 →</button>
          </section>

          <section className="reddit-sidebar-card reddit-rules-card">
            <div className="reddit-sidebar-heading">社区规则</div>
            <ol>
              <li>尊重已有设定，引用时标记来源</li>
              <li>提案请附上创作理由或参考</li>
              <li>不发布未授权的剧透与素材</li>
              <li>被采纳内容将进入共创档案</li>
            </ol>
          </section>
        </aside>
      </div>

      {activePost ? (
        <PostDialog post={activePost} vote={votes[activePost.id] ?? 0} onVote={castVote} onClose={() => setActivePostId(null)} />
      ) : null}
    </AppShell>
  )
}

function PostCard({ post, vote, onVote, onOpen }: { post: CommunityPost; vote: number; onVote: (id: string, direction: 1 | -1) => void; onOpen: () => void }) {
  const author = getAuthor(post.authorId)
  const adoption = adoptionByThread[post.id]
  const totalVotes = post.likes + vote

  return (
    <article className={`reddit-post-card${post.highlighted ? ' featured' : ''}`}>
      <div className="reddit-vote-rail" aria-label="投票">
        <button type="button" className={vote === 1 ? 'active up' : ''} aria-label="赞成" onClick={() => onVote(post.id, 1)}>▲</button>
        <strong>{totalVotes}</strong>
        <button type="button" className={vote === -1 ? 'active down' : ''} aria-label="反对" onClick={() => onVote(post.id, -1)}>▼</button>
      </div>
      <div className="reddit-post-content">
        <div className="reddit-post-meta">
          <span className="reddit-post-community">r/雾港计划</span>
          <span>·</span>
          <span>由 {author?.name ?? '社区成员'} 发布</span>
          <span>·</span>
          <span>{post.createdAt}</span>
        </div>
        <button type="button" className="reddit-post-title" onClick={onOpen}>{post.title}</button>
        <p className="reddit-post-excerpt">{post.excerpt}</p>
        <div className="reddit-post-labels">
          <span className="reddit-flair">{post.category}</span>
          {post.pinned ? <span className="reddit-pin">📌 官方置顶</span> : null}
          {adoption ? <span className="reddit-adoption">✦ {adoption.label}</span> : null}
        </div>
        <div className="reddit-post-actions">
          <button type="button" onClick={onOpen}>▢ {post.replies} 条评论</button>
          <button type="button" onClick={onOpen}>↗ 分享</button>
          <button type="button" onClick={onOpen}>⌑ 收藏</button>
          {author?.role === 'creator' ? <span className="reddit-creator-mark">创作者参与</span> : null}
        </div>
      </div>
    </article>
  )
}

function PostDialog({ post, vote, onVote, onClose }: { post: CommunityPost; vote: number; onVote: (id: string, direction: 1 | -1) => void; onClose: () => void }) {
  const author = getAuthor(post.authorId)
  const adoption = adoptionByThread[post.id]
  const [comment, setComment] = useState('')
  const [comments, setComments] = useState<string[]>([
    '这个方向很对，灯塔的信号不稳定可以成为第一章的核心线索。',
    '支持保留“雾”作为角色间不可靠叙述的视觉符号。',
  ])

  function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!comment.trim()) return
    setComments((current) => [...current, comment.trim()])
    setComment('')
  }

  return (
    <div className="reddit-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="reddit-post-dialog" role="dialog" aria-modal="true" aria-label={post.title} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="reddit-dialog-close" aria-label="关闭讨论" onClick={onClose}>×</button>
        <div className="reddit-dialog-layout">
          <div className="reddit-vote-rail dialog-votes">
            <button type="button" className={vote === 1 ? 'active up' : ''} aria-label="赞成" onClick={() => onVote(post.id, 1)}>▲</button>
            <strong>{post.likes + vote}</strong>
            <button type="button" className={vote === -1 ? 'active down' : ''} aria-label="反对" onClick={() => onVote(post.id, -1)}>▼</button>
          </div>
          <div className="reddit-dialog-main">
            <div className="reddit-post-meta"><span className="reddit-post-community">r/雾港计划</span><span>·</span><span>{author?.name}</span><span>·</span><span>{post.createdAt}</span></div>
            <h2>{post.title}</h2>
            <p>{post.content}</p>
            {adoption ? <div className="reddit-adoption-note"><strong>✦ {adoption.label}</strong><span>{adoption.note}</span></div> : null}
            <div className="reddit-dialog-divider" />
            <div className="reddit-comment-heading">{post.replies + comments.length} 条评论</div>
            <form className="reddit-comment-form" onSubmit={submitComment}>
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="加入讨论，补充你的想法…" rows={3} />
              <button type="submit" disabled={!comment.trim()}>评论</button>
            </form>
            <div className="reddit-comment-list">
              {comments.map((item, index) => (
                <article key={`${item}-${index}`} className="reddit-comment">
                  <div className="reddit-comment-line" />
                  <div><div><strong>{index === 0 ? '雾港档案员' : '会飞的草稿纸'}</strong><span> · 刚刚</span></div><p>{item}</p><button type="button">赞成 · 回复</button></div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
