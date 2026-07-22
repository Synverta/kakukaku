import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../App'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

type CommunityCategory = '全部' | '动画' | '小说' | '游戏' | '音乐' | '科幻' | '生活方式'

type Community = {
  id: string
  name: string
  handle: string
  description: string
  members: string
  online: string
  category: Exclude<CommunityCategory, '全部'>
  accent: string
  icon: string
  trend?: '上升' | '新建'
  isJoined?: boolean
  isFeatured?: boolean
}

const communities: Community[] = [
  { id: 'mist-harbor', name: '雾港计划', handle: 'mist-harbor', description: '一起搭建一部发生在雾港的原创悬疑动画。', members: '2.5 万', online: '186', category: '动画', accent: 'linear-gradient(135deg, #17364d, #d47b57)', icon: '雾', trend: '上升', isJoined: true, isFeatured: true },
  { id: 'shanhai-files', name: '山海档案局', handle: 'shanhai-files', description: '东方奇幻世界观、妖怪图鉴与主线任务的共创基地。', members: '1.8 万', online: '93', category: '游戏', accent: 'linear-gradient(135deg, #1f5d50, #e2a85f)', icon: '山', trend: '上升', isFeatured: true },
  { id: 'orbit-cinema', name: '轨道放映厅', handle: 'orbit-cinema', description: '从一张概念图出发，共同孵化近未来太空歌剧。', members: '9,426', online: '74', category: '科幻', accent: 'linear-gradient(135deg, #24234f, #798bd3)', icon: 'O', isFeatured: true },
  { id: 'paper-city', name: '纸上城建局', handle: 'paper-city', description: '城市、建筑与小人物的故事，在纸上慢慢长出来。', members: '7,218', online: '42', category: '小说', accent: 'linear-gradient(135deg, #8d5848, #e6bd84)', icon: '城', trend: '新建' },
  { id: 'noiseroom', name: '失真房间', handle: 'noiseroom', description: '独立音乐人的采样交换、概念专辑和声音实验。', members: '6,804', online: '58', category: '音乐', accent: 'linear-gradient(135deg, #392746, #dd7596)', icon: '♪', trend: '上升' },
  { id: 'weekday-supper', name: '晚餐以后', handle: 'weekday-supper', description: '关于都市生活、下班后创作与微小快乐的共创日记。', members: '4,650', online: '31', category: '生活方式', accent: 'linear-gradient(135deg, #8a5740, #e5ac72)', icon: '晚', trend: '新建' },
  { id: 'mecha-garden', name: '机甲花园', handle: 'mecha-garden', description: '机械设计、驾驶员角色与废土生态的多人接力创作。', members: '1.2 万', online: '115', category: '动画', accent: 'linear-gradient(135deg, #31535d, #77b4a7)', icon: '甲', isFeatured: true },
  { id: 'cyber-tales', name: '霓虹短篇集', handle: 'cyber-tales', description: '每周一个命题，48 小时完成一篇赛博短篇故事。', members: '5,120', online: '66', category: '科幻', accent: 'linear-gradient(135deg, #242047, #d164b1)', icon: 'N', trend: '上升' },
]

const categories: CommunityCategory[] = ['全部', '动画', '小说', '游戏', '音乐', '科幻', '生活方式']

type ApiCommunity = {
  id: number
  slug: string
  name: string
  description: string
  category: string
  iconText: string
  accent: string
  memberCount: number
  weeklyPosts: number
  isFeatured: boolean
  joined: boolean
}

function compactCount(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(value >= 100000 ? 0 : 1)} 万`
  return value.toLocaleString('zh-CN')
}

function fromApiCommunity(community: ApiCommunity): Community {
  return {
    id: String(community.id),
    name: community.name,
    handle: community.slug,
    description: community.description,
    members: compactCount(community.memberCount),
    online: String(Math.max(0, Math.round(community.weeklyPosts * 1.6))),
    category: categories.includes(community.category as CommunityCategory) ? community.category as Exclude<CommunityCategory, '全部'> : '生活方式',
    accent: community.accent || 'linear-gradient(135deg, #385f87, #cf8464)',
    icon: community.iconText || community.name.slice(0, 1),
    trend: community.weeklyPosts > 0 || ['mist-harbor', 'shanhai-files', 'noiseroom', 'cyber-tales'].includes(community.slug) ? '上升' : undefined,
    isFeatured: community.isFeatured,
    isJoined: community.joined,
  }
}

export function CommunityHome() {
  const { user } = useAuth()
  const [activeCategory, setActiveCategory] = useState<CommunityCategory>('全部')
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createdCommunities, setCreatedCommunities] = useState<Community[]>([])
  const [remoteCommunities, setRemoteCommunities] = useState<Community[] | null>(null)
  const [joinedIds, setJoinedIds] = useState<string[]>(communities.filter((community) => community.isJoined).map((community) => community.id))
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    api.get<{ communities: ApiCommunity[] }>('/communities')
      .then((result) => {
        if (cancelled || result.communities.length === 0) return
        const nextCommunities = result.communities.map(fromApiCommunity)
        setRemoteCommunities(nextCommunities)
        setJoinedIds(nextCommunities.filter((community) => community.isJoined).map((community) => community.id))
      })
      .catch(() => {
        if (!cancelled) setNotice('暂时无法连接社区服务，正在显示本地内容。')
      })
    return () => { cancelled = true }
  }, [])

  const allCommunities = useMemo(() => [...createdCommunities, ...(remoteCommunities ?? communities)], [createdCommunities, remoteCommunities])
  const filteredCommunities = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return allCommunities.filter((community) => {
      const categoryMatches = activeCategory === '全部' || community.category === activeCategory
      const queryMatches = !normalizedQuery || `${community.name} ${community.description} ${community.category}`.toLowerCase().includes(normalizedQuery)
      return categoryMatches && queryMatches
    })
  }, [activeCategory, allCommunities, query])

  async function toggleJoin(community: Community) {
    if (!user) {
      setNotice('登录后即可加入社区并保存你的共创记录。')
      return
    }
    const isJoined = joinedIds.includes(community.id)
    try {
      const result = isJoined
        ? await api.delete<{ ok: true }>(`/communities/${community.handle}/memberships`)
        : await api.post<{ community: ApiCommunity }>(`/communities/${community.handle}/memberships`)
      if (!isJoined && 'community' in result) {
        const next = fromApiCommunity(result.community)
        setRemoteCommunities((current) => (current ?? communities).map((item) => item.id === community.id ? next : item))
      }
      setJoinedIds((current) => isJoined ? current.filter((id) => id !== community.id) : [...current, community.id])
      setNotice('')
    } catch {
      setNotice('操作未完成，请稍后重试。')
    }
  }

  async function createCommunity(form: { name: string; description: string; category: Exclude<CommunityCategory, '全部'> }) {
    if (!user) {
      setNotice('请先登录，再创建属于你的共创社区。')
      return
    }
    try {
      const result = await api.post<{ community: ApiCommunity }>('/communities', form)
      const newCommunity = { ...fromApiCommunity(result.community), trend: '新建' as const }
      setCreatedCommunities((current) => [newCommunity, ...current])
      setJoinedIds((current) => [...current, newCommunity.id])
      setShowCreate(false)
      setNotice('社区已创建，快发出第一条共创讨论吧。')
    } catch {
      setNotice('创建失败，请确认名称和描述后重试。')
    }
  }

  return (
    <AppShell>
      <section className="community-home-hero">
        <div className="community-home-orbit community-home-orbit-one" aria-hidden="true" />
        <div className="community-home-orbit community-home-orbit-two" aria-hidden="true" />
        <div className="community-home-hero-copy">
          <span className="community-home-eyebrow">COMMUNITIES · 共创广场</span>
          <h1>每个好点子，都值得找到同频的人。</h1>
          <p>发现正在生长的 IP 社区，和创作者一起讨论、投票、把灵感推进成作品。</p>
          <div className="community-search-wide">
            <span aria-hidden="true">⌕</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索社区、IP 或创作主题" aria-label="搜索社区" />
          </div>
        </div>
        <div className="community-home-hero-stats" aria-label="社区数据">
          <div><strong>1,286</strong><span>正在共创的社区</span></div>
          <div><strong>8.4 万</strong><span>本周新讨论</span></div>
          <div><strong>312</strong><span>内容进入制作</span></div>
        </div>
      </section>

      <div className="community-home-layout">
        <main>
          <section className="community-home-section-head">
            <div><span className="community-section-kicker">DISCOVER</span><h2>发现社区</h2></div>
            <button type="button" className="community-create-button" onClick={() => setShowCreate(true)}>＋ 创建社区</button>
          </section>
          {notice ? <div className="community-notice" role="status">{notice}</div> : null}

          <div className="community-category-row" role="tablist" aria-label="社区分类">
            {categories.map((category) => (
              <button key={category} type="button" className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>
            ))}
          </div>

          <section className="community-featured-grid">
            {allCommunities.filter((community) => community.isFeatured).slice(0, 3).map((community) => (
              <FeaturedCommunityCard key={community.id} community={community} isJoined={joinedIds.includes(community.id)} onJoin={() => toggleJoin(community)} />
            ))}
          </section>

          <section className="community-home-section-head community-all-heading">
            <div><span className="community-section-kicker">ALL COMMUNITIES</span><h2>{activeCategory === '全部' ? '全部社区' : activeCategory}</h2></div>
            <span>{filteredCommunities.length} 个结果</span>
          </section>

          <div className="community-directory-list">
            {filteredCommunities.map((community) => (
              <CommunityRow key={community.id} community={community} isJoined={joinedIds.includes(community.id)} onJoin={() => toggleJoin(community)} />
            ))}
            {filteredCommunities.length === 0 ? <div className="community-empty">没有找到匹配社区。换个关键词，或创建第一个社区。</div> : null}
          </div>
        </main>

        <aside className="community-home-sidebar">
          <section className="community-side-card community-trending-card">
            <div className="community-side-heading"><span>↗</span> 热门社区</div>
            <ol>
              {allCommunities.filter((community) => community.trend === '上升').slice(0, 5).map((community, index) => (
                <li key={community.id}>
                  <span className="community-trend-rank">{index + 1}</span>
                  <CommunityIcon community={community} size="small" />
                  <div><strong>r/{community.name}</strong><span>{community.members} 成员 · ↑ {18 - index * 2}%</span></div>
                </li>
              ))}
            </ol>
          </section>

          <section className="community-side-card community-joined-card">
            <div className="community-side-heading">你的社区</div>
            {allCommunities.filter((community) => joinedIds.includes(community.id)).slice(0, 4).map((community) => (
               <Link key={community.id} className="community-joined-link" to={`/communities/${community.handle}`}>
                <CommunityIcon community={community} size="small" /><span>r/{community.name}</span><b>›</b>
              </Link>
            ))}
            {joinedIds.length === 0 ? <p>加入感兴趣的社区后，它们会出现在这里。</p> : null}
          </section>

          <section className="community-side-card community-guideline-card">
            <div className="community-side-heading">共创社区是什么？</div>
            <p>它不是普通粉丝群。每一条提案、投票和创作者采纳都会留下公开的共创记录。</p>
            <button type="button" onClick={() => setShowCreate(true)}>了解如何创建 →</button>
          </section>
        </aside>
      </div>

      {showCreate ? <CreateCommunityDialog onClose={() => setShowCreate(false)} onCreate={createCommunity} /> : null}
    </AppShell>
  )
}

function CommunityIcon({ community, size = 'normal' }: { community: Community; size?: 'normal' | 'small' }) {
  return <span className={`community-icon community-icon-${size}`} style={{ background: community.accent }} aria-hidden="true">{community.icon}</span>
}

function CommunityLink({ community, children, className }: { community: Community; children: ReactNode; className?: string }) {
  return <Link className={className} to={`/communities/${community.handle}`}>{children}</Link>
}

function FeaturedCommunityCard({ community, isJoined, onJoin }: { community: Community; isJoined: boolean; onJoin: () => void }) {
  return (
    <article className="community-featured-card">
      <div className="community-featured-cover" style={{ background: community.accent }}><span>r/{community.name}</span></div>
      <div className="community-featured-content">
        <CommunityIcon community={community} />
        <CommunityLink community={community} className="community-featured-name"><strong>{community.name}</strong><span>r/{community.handle}</span></CommunityLink>
        <p>{community.description}</p>
        <div className="community-featured-foot"><span><b>{community.members}</b> 成员 · {community.online} 在线</span><button type="button" className={isJoined ? 'joined' : ''} onClick={onJoin}>{isJoined ? '已加入' : '加入'}</button></div>
      </div>
    </article>
  )
}

function CommunityRow({ community, isJoined, onJoin }: { community: Community; isJoined: boolean; onJoin: () => void }) {
  return (
    <article className="community-directory-row">
      <CommunityIcon community={community} />
      <CommunityLink community={community} className="community-directory-copy">
        <div><strong>r/{community.name}</strong>{community.trend ? <span className={`community-trend-tag ${community.trend === '上升' ? 'rise' : ''}`}>{community.trend === '上升' ? '↑ 上升中' : '✦ 新社区'}</span> : null}</div>
        <p>{community.description}</p>
        <span>{community.members} 成员 · {community.online} 正在讨论 · {community.category}</span>
      </CommunityLink>
      <button type="button" className={isJoined ? 'joined' : ''} onClick={onJoin}>{isJoined ? '已加入' : '加入'}</button>
    </article>
  )
}

function CreateCommunityDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (form: { name: string; description: string; category: Exclude<CommunityCategory, '全部'> }) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<Exclude<CommunityCategory, '全部'>>('动画')

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || !description.trim()) return
    onCreate({ name: name.trim(), description: description.trim(), category })
  }

  return (
    <div className="community-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="community-create-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="community-dialog-close" onClick={onClose} aria-label="关闭">×</button>
        <span className="community-section-kicker">CREATE A COMMUNITY</span>
        <h2>创建一个共创社区</h2>
        <p>先定义你们要一起做什么。创建后即可发布讨论、邀请创作者和设置共创规则。</p>
        <label>社区名称<input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：月球旅馆计划" maxLength={30} autoFocus /></label>
        <label>社区描述<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="一句话说明，大家会在这里共同创作什么？" rows={3} maxLength={140} /></label>
        <label>创作类型<select value={category} onChange={(event) => setCategory(event.target.value as Exclude<CommunityCategory, '全部'>)}>{categories.filter((item) => item !== '全部').map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <div className="community-create-foot"><button type="button" onClick={onClose}>取消</button><button type="submit" disabled={!name.trim() || !description.trim()}>创建社区</button></div>
      </form>
    </div>
  )
}
