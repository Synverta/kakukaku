import { createContext, useCallback, useContext, useDeferredValue, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import './App.css'
import { CrowdfundHome } from './crowdfund/CrowdfundHome'
import { CampaignDetail } from './crowdfund/CampaignDetail'
import { IpStudio } from './crowdfund/IpStudio'
import { LaunchCampaign } from './crowdfund/LaunchCampaign'
import { MyOrders } from './crowdfund/MyOrders'
import { RegisterPage } from './pages/RegisterPage'
import { useAuth } from './lib/auth'
import {
  categories,
  comments,
  danmakuSeedsByVideo,
  liveMoments,
  liveStreams,
  navigationItems,
  profileStats,
  studioCards,
  uploadChecklist,
  videos,
} from './data/siteData'

type CommentEntry = {
  user: string
  time: string
  content: string
}

type DanmakuEntry = {
  id: string
  text: string
  track: number
  mode: 'scroll' | 'top' | 'bottom'
  color: string
  duration: number
  delay: number
  timestampPercent: number
}

type DanmakuStyle = {
  color: string
  mode: 'scroll' | 'top' | 'bottom'
  timestampPercent: number
}

type PersistedUserState = {
  favoriteVideoIds: string[]
  followedCreators: string[]
  historyVideoIds: string[]
  userCommentsByVideo: Record<string, CommentEntry[]>
  danmakuByVideo: Record<string, DanmakuEntry[]>
  danmakuBlocklist: string[]
}

type UserStateContextValue = {
  favoriteVideoIds: string[]
  followedCreators: string[]
  historyVideoIds: string[]
  userCommentsByVideo: Record<string, CommentEntry[]>
  danmakuByVideo: Record<string, DanmakuEntry[]>
  danmakuBlocklist: string[]
  toggleFavorite: (videoId: string) => void
  toggleFollow: (creator: string) => void
  addHistory: (videoId: string) => void
  publishComment: (videoId: string, content: string) => void
  publishDanmaku: (videoId: string, content: string, style: DanmakuStyle) => void
  addDanmakuBlockTerm: (term: string) => void
  removeDanmakuBlockTerm: (term: string) => void
  clearDanmakuForVideo: (videoId: string) => void
  resetDanmakuForVideo: (videoId: string) => void
}

const UserStateContext = createContext<UserStateContextValue | null>(null)
const USER_STATE_STORAGE_KEY = 'kakukaku-user-state'

function App() {
  const persistedState = readPersistedUserState()
  const [favoriteVideoIds, setFavoriteVideoIds] = useState<string[]>(
    () => persistedState?.favoriteVideoIds ?? [videos[0].id, videos[2].id],
  )
  const [followedCreators, setFollowedCreators] = useState<string[]>(() => persistedState?.followedCreators ?? ['纸片城建局'])
  const [historyVideoIds, setHistoryVideoIds] = useState<string[]>(
    () => persistedState?.historyVideoIds ?? [videos[0].id, videos[3].id, videos[1].id],
  )
  const [userCommentsByVideo, setUserCommentsByVideo] = useState<Record<string, CommentEntry[]>>(
    () => persistedState?.userCommentsByVideo ?? {},
  )
  const [danmakuBlocklist, setDanmakuBlocklist] = useState<string[]>(() => persistedState?.danmakuBlocklist ?? [])
  const [danmakuByVideo, setDanmakuByVideo] = useState<Record<string, DanmakuEntry[]>>(
    () => persistedState?.danmakuByVideo ?? createInitialDanmakuMap(),
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const nextState: PersistedUserState = {
      favoriteVideoIds,
      followedCreators,
      historyVideoIds,
      userCommentsByVideo,
      danmakuByVideo,
      danmakuBlocklist,
    }

    window.localStorage.setItem(USER_STATE_STORAGE_KEY, JSON.stringify(nextState))
  }, [danmakuBlocklist, danmakuByVideo, favoriteVideoIds, followedCreators, historyVideoIds, userCommentsByVideo])

  const toggleFavorite = useCallback((videoId: string) => {
    setFavoriteVideoIds((current) =>
      current.includes(videoId) ? current.filter((item) => item !== videoId) : [videoId, ...current],
    )
  }, [])

  const toggleFollow = useCallback((creator: string) => {
    setFollowedCreators((current) =>
      current.includes(creator) ? current.filter((item) => item !== creator) : [creator, ...current],
    )
  }, [])

  const addHistory = useCallback((videoId: string) => {
    setHistoryVideoIds((current) => [videoId, ...current.filter((item) => item !== videoId)].slice(0, 12))
  }, [])

  const publishComment = useCallback((videoId: string, content: string) => {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      return
    }

    setUserCommentsByVideo((current) => ({
      ...current,
      [videoId]: [
        {
          user: '纸片城建局',
          time: '刚刚',
          content: trimmedContent,
        },
        ...(current[videoId] ?? []),
      ],
    }))
  }, [])

  const publishDanmaku = useCallback((videoId: string, content: string, style: DanmakuStyle) => {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      return
    }

    setDanmakuByVideo((current) => {
      const currentList = current[videoId] ?? []
      const sameModeCount = currentList.filter((item) => item.mode === style.mode).length

      return {
        ...current,
        [videoId]: [
          {
            id: `${videoId}-${Date.now()}`,
            text: trimmedContent,
            track: sameModeCount % (style.mode === 'scroll' ? 5 : 2),
            mode: style.mode,
            color: style.color,
            duration: style.mode === 'scroll' ? 10 : 4,
            delay: 0,
            timestampPercent: style.timestampPercent,
          },
          ...currentList,
        ].slice(0, 24),
      }
    })
  }, [])

  const addDanmakuBlockTerm = useCallback((term: string) => {
    const trimmedTerm = term.trim().toLowerCase()

    if (!trimmedTerm) {
      return
    }

    setDanmakuBlocklist((current) => (current.includes(trimmedTerm) ? current : [...current, trimmedTerm]))
  }, [])

  const removeDanmakuBlockTerm = useCallback((term: string) => {
    setDanmakuBlocklist((current) => current.filter((item) => item !== term))
  }, [])

  const clearDanmakuForVideo = useCallback((videoId: string) => {
    setDanmakuByVideo((current) => ({
      ...current,
      [videoId]: [],
    }))
  }, [])

  const resetDanmakuForVideo = useCallback((videoId: string) => {
    setDanmakuByVideo((current) => ({
      ...current,
      [videoId]: createInitialDanmakuEntries(videoId),
    }))
  }, [])

  const contextValue: UserStateContextValue = {
    favoriteVideoIds,
    followedCreators,
    historyVideoIds,
    userCommentsByVideo,
    danmakuByVideo,
    danmakuBlocklist,
    toggleFavorite,
    toggleFollow,
    addHistory,
    publishComment,
    publishDanmaku,
    addDanmakuBlockTerm,
    removeDanmakuBlockTerm,
    clearDanmakuForVideo,
    resetDanmakuForVideo,
  }

  return (
    <UserStateContext.Provider value={contextValue}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rank" element={<RankPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/video/:videoId" element={<VideoPage />} />
        <Route path="/crowdfund" element={<CrowdfundHome />} />
        <Route path="/crowdfund/project/:id" element={<CampaignDetail />} />
        <Route path="/crowdfund/create" element={<LaunchCampaign />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/ip-studio" element={<IpStudio />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserStateContext.Provider>
  )
}

function HomePage() {
  const { historyVideoIds } = useUserState()
  const [searchParams, setSearchParams] = useSearchParams()
  const featuredVideo = videos[0]
  const ranking = [...videos].sort((left, right) => parseCompactNumber(right.views) - parseCompactNumber(left.views)).slice(0, 5)
  const selectedCategory = searchParams.get('cat') ?? '为你推荐'
  const query = searchParams.get('q') ?? ''
  const deferredQuery = useDeferredValue(query.trim().toLowerCase())
  const sourceVideos = selectedCategory === '热门' ? [...videos].sort((left, right) => parseCompactNumber(right.views) - parseCompactNumber(left.views)) : videos
  const filteredVideos = sourceVideos.filter((video) => {
    const matchesCategory = selectedCategory === '为你推荐' || selectedCategory === '热门' || video.category === selectedCategory
    const searchableText = `${video.title} ${video.creator} ${video.category} ${video.tags.join(' ')}`.toLowerCase()
    const matchesQuery = deferredQuery.length === 0 || searchableText.includes(deferredQuery)

    return matchesCategory && matchesQuery
  })
  const heroRecommendations = sourceVideos.filter((video) => video.id !== featuredVideo.id).slice(0, 6)
  const continueWatching = historyVideoIds
    .map((videoId) => videos.find((video) => video.id === videoId))
    .filter((video): video is (typeof videos)[number] => Boolean(video))
    .slice(0, 3)
  const shelfVideos = filteredVideos.slice(0, 8)
  const animeChannelVideos = videos.filter((video) => ['动画', '音乐', '鬼畜'].includes(video.category)).slice(0, 6)
  const learningChannelVideos = videos.filter((video) => ['知识', '科技', '纪录片', '影视'].includes(video.category)).slice(0, 6)
  const latestDropVideos = [...videos].sort((left, right) => parseTimeRank(left.publishedAt) - parseTimeRank(right.publishedAt)).slice(0, 3)
  const creatorBoostCards = [
    { label: '新人保护', value: '72h', detail: '新稿件进入冷启动观察池，先看完播与互动质量。' },
    { label: '收益透明', value: '4 项', detail: '播放、充电、商单、直播收入拆分展示。' },
    { label: '互动工具', value: '弹幕 / 评论', detail: '创作者可导出弹幕、配置屏蔽词和置顶讨论。' },
  ]
  const creatorSpotlightVideos = [...videos].sort((left, right) => parseTimeRank(left.publishedAt) - parseTimeRank(right.publishedAt)).slice(0, 4)
  const isDefaultHomepage = selectedCategory === '为你推荐' && deferredQuery.length === 0

  function handleCategoryClick(categoryName: string) {
    const nextParams = new URLSearchParams(searchParams)

    if (categoryName === '为你推荐') {
      nextParams.delete('cat')
    } else {
      nextParams.set('cat', categoryName)
    }

    setSearchParams(nextParams)
  }

  return (
    <AppShell>
      <section className="bili-hero">
        <Link className="featured-stage featured-stage-large" style={{ background: featuredVideo.cover }} to={`/video/${featuredVideo.id}`}>
          <div className="stage-overlay">
            <span className="badge">原创主推 · 创作者精选</span>
            <h2>{featuredVideo.title}</h2>
            <p>{featuredVideo.description}</p>
            <div className="stage-meta">
              <span>{featuredVideo.creator}</span>
              <span>{featuredVideo.views} 播放</span>
              <span>{featuredVideo.danmaku} 弹幕</span>
              <span>{featuredVideo.duration}</span>
            </div>
            <div className="stage-action-row">
              <span>进入播放页</span>
              <span>查看创作幕后</span>
            </div>
          </div>
        </Link>

        <div className="hero-card-grid">
          {heroRecommendations.map((video) => (
            <CompactVideoCard key={video.id} videoId={video.id} />
          ))}
        </div>
      </section>

      <section className="cf-home-promo">
        <div>
          <strong>AIGC 共创众筹 · 帮助创作人快速打造 IP</strong>
          <p>粉丝用 token 支持你心中的 IP，平台批量生成把单次打造的成本打下来。从角色设定到成片，一个人也能跑完一条 IP 生产线。</p>
        </div>
        <div className="cf-hero-actions">
          <Link className="primary-button" to="/crowdfund">
            浏览众筹项目
          </Link>
          <Link className="ghost-button" to="/ip-studio">
            进入 IP 工坊
          </Link>
        </div>
      </section>

      <section className="creator-command-grid" aria-label="创作者友好能力">
        <div className="creator-command-panel">
          <div>
            <span className="section-kicker">Creator First</span>
            <h2>不只推荐内容，也帮创作者看见增长路径。</h2>
            <p>首页保留视频站该有的密集内容流，同时把投稿、数据、互动治理和新人保护做成可见入口。</p>
          </div>
          <Link className="primary-button" to="/upload">
            进入创作中心
          </Link>
        </div>
        <div className="creator-boost-grid">
          {creatorBoostCards.map((card) => (
            <article key={card.label} className="creator-boost-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block category-bar-block">
        <div className="section-heading category-heading">
          <div>
            <span className="section-kicker">分区</span>
            <h2>频道速览</h2>
          </div>
          {deferredQuery ? <span className="section-note">搜索：{query}</span> : <span className="section-note">切换分区查看内容</span>}
        </div>
        <div className="category-row home-category-row">
          {categories.map((category) => (
            <button
              key={category.name}
              className={`category-pill${selectedCategory === category.name ? ' active-pill' : ''}`}
              type="button"
              onClick={() => handleCategoryClick(category.name)}
              style={{ '--category-accent': category.accent } as CSSProperties}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      <section className="section-block homepage-feed-section" id="feed">
        <div className="section-heading">
          <div>
            <span className="section-kicker">推荐</span>
            <h2>
              {selectedCategory === '为你推荐'
                ? '精选推荐'
                : selectedCategory === '热门'
                  ? '热门推荐'
                  : `${selectedCategory}`}
            </h2>
          </div>
          <span className="section-note">共 {filteredVideos.length} 条内容</span>
        </div>
        <div className="homepage-feed-layout">
          <div className="video-grid feed-grid">
            {filteredVideos.length > 0 ? (
              shelfVideos.map((video) => <VideoCard key={video.id} videoId={video.id} />)
            ) : (
              <div className="empty-state homepage-empty-state">
                <h3>没有匹配的内容</h3>
                <p>可以换个关键词，或者切回“为你推荐”查看完整推荐流。</p>
              </div>
            )}
          </div>

          <aside className="homepage-rank-panel">
            <div className="section-heading compact-heading">
              <div>
                <span className="section-kicker">热门榜</span>
                <h2>大家都在看</h2>
              </div>
              <Link className="section-link" to="/rank">
                查看更多
              </Link>
            </div>
            <div className="ranking-list homepage-ranking-list">
              {ranking.map((video, index) => (
                <Link key={video.id} className="ranking-item" to={`/video/${video.id}`}>
                  <span className="ranking-index">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{video.title}</strong>
                    <span>
                      {video.creator} · {video.views} 播放
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {isDefaultHomepage && continueWatching.length > 0 ? (
        <section className="section-block homepage-feed-section">
          <div className="section-heading">
            <div>
              <span className="section-kicker">继续观看</span>
              <h2>接着看</h2>
            </div>
            <Link className="section-link" to="/history">
              历史记录
            </Link>
          </div>
          <div className="video-grid video-grid-compact">
            {continueWatching.map((video) => (
              <VideoCard key={video.id} videoId={video.id} />
            ))}
          </div>
        </section>
      ) : null}

      {isDefaultHomepage ? (
        <>
          <section className="section-block creator-lab-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">创作者观察站</span>
                <h2>正在上升的新稿件</h2>
              </div>
              <Link className="section-link" to="/profile">
                查看创作者看板
              </Link>
            </div>
            <div className="creator-lab-grid">
              {creatorSpotlightVideos.map((video, index) => (
                <Link key={video.id} className="creator-lab-card" to={`/video/${video.id}`}>
                  <div className="creator-lab-rank">0{index + 1}</div>
                  <div className="creator-lab-cover" style={{ background: video.cover }} />
                  <div>
                    <strong>{video.title}</strong>
                    <p>{video.creator} · {video.category} · {video.publishedAt}</p>
                    <span>建议：剪出 30 秒高光，带动下一轮推荐。</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="section-block homepage-feed-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">动画</span>
                <h2>番剧动画热播</h2>
              </div>
              <Link className="section-link" to="/?cat=动画">
                查看更多
              </Link>
            </div>
            <div className="homepage-feed-layout secondary-layout">
              <div className="video-grid feed-grid">
                {animeChannelVideos.map((video) => (
                  <VideoCard key={video.id} videoId={video.id} />
                ))}
              </div>
              <div className="secondary-side-stack">
                {latestDropVideos.map((video) => (
                  <CompactVideoCard key={video.id} videoId={video.id} />
                ))}
              </div>
            </div>
          </section>

          <section className="section-block homepage-feed-section">
            <div className="section-heading">
              <div>
                <span className="section-kicker">知识科技</span>
                <h2>知识科技精选</h2>
              </div>
              <Link className="section-link" to="/?cat=知识">
                查看更多
              </Link>
            </div>
            <div className="homepage-feed-layout secondary-layout">
              <div className="video-grid feed-grid">
                {learningChannelVideos.map((video) => (
                  <VideoCard key={video.id} videoId={video.id} />
                ))}
              </div>
              <div className="secondary-side-stack live-side-stack">
                {liveStreams.map((stream) => (
                  <article key={stream.id} className="live-card homepage-live-card">
                    <div className="live-preview" style={{ background: stream.accent }} />
                    <div>
                      <strong>{stream.title}</strong>
                      <p>{stream.streamer}</p>
                      <span>
                        {stream.topic} · {stream.viewers} 观看
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </AppShell>
  )
}

function HistoryPage() {
  const { favoriteVideoIds, historyVideoIds } = useUserState()
  const historyVideos = historyVideoIds.map((videoId) => videos.find((video) => video.id === videoId)).filter(Boolean)

  return (
    <AppShell>
      <section className="section-block history-hero">
        <div>
          <span className="eyebrow">观看历史</span>
          <h1>把最近看过、收藏过和准备继续刷的内容放在一个页面里。</h1>
          <p>这个页面模拟视频网站的历史记录中心，方便继续扩展按日期分组、筛选和清空记录等能力。</p>
        </div>
        <div className="hero-metrics">
          <div>
            <dt>历史条目</dt>
            <dd>{historyVideos.length}</dd>
          </div>
          <div>
            <dt>已收藏</dt>
            <dd>{favoriteVideoIds.length}</dd>
          </div>
          <div>
            <dt>继续观看</dt>
            <dd>{Math.min(5, historyVideos.length)}</dd>
          </div>
        </div>
      </section>

      <div className="content-grid history-layout">
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="section-kicker">最近浏览</span>
              <h2>继续从上次的位置接着看</h2>
            </div>
          </div>
          <div className="history-list">
            {historyVideos.map((video, index) => {
              if (!video) {
                return null
              }

              const progress = Math.min(93, 18 + index * 11)

              return (
                <Link key={video.id} className="history-item" to={`/video/${video.id}`}>
                  <div className="history-cover" style={{ background: video.cover }} />
                  <div className="history-copy">
                    <strong>{video.title}</strong>
                    <p>{video.description}</p>
                    <span>
                      {video.creator} · {video.views} 播放 · 上次看到 {progress}%
                    </span>
                    <div className="progress-rail">
                      <span style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <aside className="sidebar-stack">
          <section className="section-block compact-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">收藏清单</span>
                <h2>已标记视频</h2>
              </div>
            </div>
            <div className="quick-link-list">
              {videos
                .filter((video) => favoriteVideoIds.includes(video.id))
                .map((video) => (
                  <Link key={video.id} className="quick-link-card" to={`/video/${video.id}`}>
                    <strong>{video.title}</strong>
                    <span>{video.creator}</span>
                  </Link>
                ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

function RankPage() {
  const rankedVideos = [...videos].sort((left, right) => parseCompactNumber(right.views) - parseCompactNumber(left.views))
  const trendingTags = Array.from(new Set(videos.flatMap((video) => video.tags))).slice(0, 10)

  return (
    <AppShell>
      <section className="section-block ranking-hero">
        <div>
          <span className="eyebrow">全站排行榜</span>
          <h1>把播放、互动和讨论密度压成一张榜单。</h1>
          <p>这里模拟了 B 站常见的全站热榜视图，方便你继续扩展日榜、周榜、分区榜和专题榜。</p>
        </div>
        <div className="hero-metrics">
          <div>
            <dt>榜单刷新</dt>
            <dd>10 分钟</dd>
          </div>
          <div>
            <dt>上榜视频</dt>
            <dd>{rankedVideos.length}</dd>
          </div>
          <div>
            <dt>热门标签</dt>
            <dd>{trendingTags.length}</dd>
          </div>
        </div>
      </section>

      <div className="content-grid rank-layout">
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="section-kicker">总榜</span>
              <h2>本周综合热视频</h2>
            </div>
          </div>
          <div className="rank-board">
            {rankedVideos.map((video, index) => (
              <Link key={video.id} className="rank-board-item" to={`/video/${video.id}`}>
                <span className="rank-board-index">#{index + 1}</span>
                <div className="rank-board-cover" style={{ background: video.cover }} />
                <div className="rank-board-copy">
                  <strong>{video.title}</strong>
                  <p>{video.description}</p>
                  <span>
                    {video.creator} · {video.views} 播放 · {video.likes} 点赞
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <aside className="sidebar-stack">
          <section className="section-block compact-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">热词</span>
                <h2>趋势标签</h2>
              </div>
            </div>
            <div className="tag-cloud">
              {trendingTags.map((tag) => (
                <span key={tag} className="tag-chip warm-chip">
                  {tag}
                </span>
              ))}
            </div>
          </section>

          <section className="section-block compact-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">看点</span>
                <h2>今日上升最快</h2>
              </div>
            </div>
            <div className="progress-list">
              {rankedVideos.slice(0, 3).map((video, index) => (
                <article key={video.id} className="insight-card">
                  <strong>{video.title}</strong>
                  <span>排名上升 {6 - index} 位</span>
                  <p>{video.category} 分区热度持续上涨。</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

function LivePage() {
  return (
    <AppShell>
      <section className="live-hero">
        <div className="hero-copy">
          <span className="eyebrow">直播中心</span>
          <h1>实时热播、预告日程和创作者互动，集中在一个入口。</h1>
          <p>这个页面模拟直播频道首页的结构，包括主推直播、直播排期、观众指标和房间瀑布流。</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/video/future-city-loop">
              查看主推内容
            </Link>
            <Link className="ghost-button" to="/rank">
              切到排行榜
            </Link>
          </div>
        </div>
        <section className="section-block live-schedule-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">今晚排期</span>
              <h2>你可能想蹲的直播</h2>
            </div>
          </div>
          <div className="schedule-list">
            {liveMoments.map((moment) => (
              <article key={`${moment.time}-${moment.title}`} className="schedule-item">
                <strong>{moment.time}</strong>
                <div>
                  <p>{moment.title}</p>
                  <span>
                    {moment.host} · {moment.label}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="section-block live-stat-strip">
        <div>
          <dt>在线观众</dt>
          <dd>246.8 万</dd>
        </div>
        <div>
          <dt>弹幕速度</dt>
          <dd>18,420 / 分</dd>
        </div>
        <div>
          <dt>开播主播</dt>
          <dd>3,124</dd>
        </div>
        <div>
          <dt>预约提醒</dt>
          <dd>92.4 万</dd>
        </div>
      </section>

      <section className="section-block">
        <div className="section-heading">
          <div>
            <span className="section-kicker">房间推荐</span>
            <h2>当前最值得点进去的直播间</h2>
          </div>
        </div>
        <div className="live-room-grid">
          {liveStreams.map((stream, index) => (
            <article key={stream.id} className="live-room-card">
              <div className="live-room-stage" style={{ background: stream.accent }}>
                <span className="badge">NO.{index + 1}</span>
              </div>
              <div>
                <strong>{stream.title}</strong>
                <p>{stream.streamer}</p>
                <span>
                  {stream.topic} · {stream.viewers} 在线
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  )
}

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(username.trim(), password)
      navigate('/profile')
    } catch (err) {
      const message = typeof err === 'object' && err && 'message' in err ? String((err as { message?: unknown }).message ?? '') : ''
      const code = typeof err === 'object' && err && 'error' in err ? String((err as { error?: unknown }).error ?? '') : ''
      setError(message || code || '登录失败')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <section className="auth-layout">
        <div className="hero-copy auth-copy">
          <span className="eyebrow">账号登录</span>
          <h1>回到你的追更列表、收藏夹和创作台。</h1>
          <p>登录后可以同步数据、发起 IP 众筹、用 token 支持别人。</p>
          <div className="auth-benefits">
            <div>
              <strong>同步观看记录</strong>
              <p>跨设备续播、收藏和稍后再看会自动同步。</p>
            </div>
            <div>
              <strong>参与互动</strong>
              <p>发送弹幕、评论、点赞和投币都需要登录态。</p>
            </div>
            <div>
              <strong>进入创作中心</strong>
              <p>登录后可以直接管理稿件、数据和收益面板。</p>
            </div>
          </div>
        </div>
        <section className="section-block auth-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">欢迎回来</span>
              <h2>登录 kakukaku</h2>
            </div>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              用户名
              <input
                autoComplete="username"
                minLength={3}
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <label>
              密码
              <input
                autoComplete="current-password"
                minLength={8}
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {error ? <div className="auth-error">{error}</div> : null}
            <button type="submit" className="primary-button full-button" disabled={submitting}>
              {submitting ? '正在登录…' : '登录并进入个人中心'}
            </button>
          </form>
          <div className="oauth-row">
            <Link to="/register" className="ghost-button full-button" style={{ display: 'inline-flex' }}>
              还没账号？去注册
            </Link>
          </div>
        </section>
      </section>
    </AppShell>
  )
}

function ProfilePage() {
  const { favoriteVideoIds, followedCreators, historyVideoIds } = useUserState()

  return (
    <AppShell>
      <section className="section-block profile-hero">
        <div className="profile-head">
          <div className="profile-avatar">纸</div>
          <div>
            <span className="eyebrow">个人中心</span>
            <h1>纸片城建局</h1>
            <p>城市景观动画创作者，主做连续镜头、赛博空间和幕后建模分享。</p>
            <div className="creator-status-row">
              <span>原创认证</span>
              <span>本周推荐池中</span>
              <span>粉丝互动优于 86% 创作者</span>
            </div>
          </div>
        </div>
        <div className="profile-stat-grid">
          {profileStats.map((item) => (
            <div key={item.label} className="profile-stat-card">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </div>
      </section>

      <div className="content-grid profile-layout">
        <section className="section-block">
          <div className="section-heading">
            <div>
              <span className="section-kicker">创作看板</span>
              <h2>创作者工作台概览</h2>
            </div>
          </div>
          <div className="studio-grid">
            {studioCards.map((card) => (
              <article key={card.title} className="studio-card">
                <span className="section-kicker">创作数据</span>
                <strong>{card.title}</strong>
                <em>{card.metric}</em>
                <p>{card.detail}</p>
              </article>
            ))}
          </div>

          <div className="creator-roadmap">
            <article>
              <span>01</span>
              <strong>今天该做什么</strong>
              <p>回复高赞评论、剪一条竖版预告，并把下一期设为 20:00 定时发布。</p>
            </article>
            <article>
              <span>02</span>
              <strong>平台给到的支持</strong>
              <p>该系列适合进入“幕后制作”专题，可补充封面 A/B 测试和合集入口。</p>
            </article>
            <article>
              <span>03</span>
              <strong>社区健康提醒</strong>
              <p>弹幕氛围良好，建议开启创作者精选评论，提高新观众理解效率。</p>
            </article>
          </div>

          <div className="section-heading top-gap">
            <div>
              <span className="section-kicker">已发布视频</span>
              <h2>最近更新</h2>
            </div>
            <Link className="ghost-button small-button" to="/upload">
              去投稿台
            </Link>
          </div>
          <div className="video-grid">
            {videos.slice(0, 4).map((video) => (
              <VideoCard key={video.id} videoId={video.id} />
            ))}
          </div>
        </section>

        <aside className="sidebar-stack">
          <section className="section-block compact-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">快捷入口</span>
                <h2>账号与资产</h2>
              </div>
            </div>
            <div className="quick-link-list">
              <Link className="quick-link-card" to="/upload">
                <strong>投稿管理</strong>
                <span>查看草稿、已过审稿件和发布计划</span>
              </Link>
              <Link className="quick-link-card" to="/history">
                <strong>观看历史</strong>
                <span>最近浏览 {historyVideoIds.length} 条，收藏 {favoriteVideoIds.length} 条</span>
              </Link>
              <Link className="quick-link-card" to="/rank">
                <strong>数据排行</strong>
                <span>观察作品在站内热榜中的相对位置</span>
              </Link>
              <Link className="quick-link-card" to="/live">
                <strong>直播预约</strong>
                <span>配置直播预告、封面和开播提醒</span>
              </Link>
              <Link className="quick-link-card" to="/my-orders">
                <strong>我的众筹订单</strong>
                <span>关闭未支付订单、对已支付订单申请退款</span>
              </Link>
              <article className="quick-link-card static-card">
                <strong>已关注创作者</strong>
                <span>{followedCreators.join(' / ') || '暂时没有关注对象'}</span>
              </article>
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

function UploadPage() {
  const [selectedCategory, setSelectedCategory] = useState('动画')

  return (
    <AppShell>
      <section className="section-block upload-hero">
        <div>
          <span className="eyebrow">投稿工作台</span>
          <h1>把标题、封面、分区和发布设置收进一个投稿流程。</h1>
          <p>面向创作者的发布台：不仅填表，还给出封面、标题、分区和排期建议，减少“发出去以后才发现问题”。</p>
        </div>
        <Link className="primary-button" to="/profile">
          返回个人中心
        </Link>
      </section>

      <section className="upload-signal-strip" aria-label="投稿智能提示">
        <article>
          <span>最佳发布时间</span>
          <strong>今晚 20:00</strong>
          <p>同类动画内容在该时段完播率最高。</p>
        </article>
        <article>
          <span>标题强度</span>
          <strong>86 / 100</strong>
          <p>建议保留“幕后”和“整座城市”两个关键词。</p>
        </article>
        <article>
          <span>封面风险</span>
          <strong>低</strong>
          <p>主体清晰，但移动端标题区域还可再放大。</p>
        </article>
      </section>

      <div className="content-grid upload-layout">
        <section className="section-block upload-form-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">稿件信息</span>
              <h2>准备发布你的下一条视频</h2>
            </div>
          </div>
          <form className="upload-form-grid">
            <label className="full-span">
              视频标题
              <input defaultValue="未来都市漫游幕后：如何把整座城市塞进一条镜头里" type="text" />
            </label>
            <label className="full-span">
              视频简介
              <textarea defaultValue="这一期会拆解城市镜头的动线设计、光影层次和镜头推进方式，也会分享失败镜头是怎么返工的。" rows={5} />
            </label>
            <label>
              分区
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
                {categories.slice(1).map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              发布时间
              <input defaultValue="2026-05-02T20:00" type="datetime-local" />
            </label>
            <label className="full-span">
              标签
              <input defaultValue="原创动画, 城市景观, 幕后制作" type="text" />
            </label>
            <label className="full-span">
              封面设计备注
              <input defaultValue="保留高架桥和霓虹塔楼的透视关系，标题放右下角。" type="text" />
            </label>
            <div className="full-span publish-row">
              <button type="button">保存草稿</button>
              <button type="button">提交审核</button>
            </div>
          </form>
        </section>

        <aside className="sidebar-stack">
          <section className="section-block compact-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">发布前检查</span>
                <h2>避免常见问题</h2>
              </div>
            </div>
            <div className="checklist-list">
              {uploadChecklist.map((item) => (
                <article key={item.title} className="checklist-item">
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="section-block compact-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">当前分区</span>
                <h2>{selectedCategory}</h2>
              </div>
            </div>
            <div className="tag-cloud">
              {videos
                .filter((video) => video.category === selectedCategory)
                .slice(0, 3)
                .map((video) => (
                  <Link key={video.id} className="quick-link-card" to={`/video/${video.id}`}>
                    <strong>{video.title}</strong>
                    <span>{video.creator}</span>
                  </Link>
                ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

function VideoPage() {
  const {
    addHistory,
    addDanmakuBlockTerm,
    clearDanmakuForVideo,
    danmakuBlocklist,
    danmakuByVideo,
    favoriteVideoIds,
    followedCreators,
    publishComment,
    publishDanmaku,
    removeDanmakuBlockTerm,
    resetDanmakuForVideo,
    toggleFavorite,
    toggleFollow,
    userCommentsByVideo,
  } = useUserState()
  const { videoId } = useParams()
  const video = videos.find((item) => item.id === videoId) ?? videos[0]
  const relatedVideos = videos.filter((item) => item.id !== video.id).slice(0, 4)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerStageRef = useRef<HTMLDivElement | null>(null)
  const [draftComment, setDraftComment] = useState('')
  const [draftDanmaku, setDraftDanmaku] = useState('')
  const [draftChatMessage, setDraftChatMessage] = useState('')
  const [chatMessages, setChatMessages] = useState(() => [
    { id: `${video.id}-chat-1`, user: '房管小卡', role: 'mod', content: '欢迎来到放映聊天室，友善讨论，拒绝剧透。', time: '刚刚' },
    { id: `${video.id}-chat-2`, user: '追更雷达', role: 'member', content: `这期 ${video.creator} 的节奏好稳。`, time: '1 分钟前' },
    { id: `${video.id}-chat-3`, user: '剪辑学习中', role: 'member', content: '有人一起看完再聊镜头设计吗？', time: '2 分钟前' },
  ])
  const [isDanmakuEnabled, setIsDanmakuEnabled] = useState(true)
  const [selectedDanmakuColor, setSelectedDanmakuColor] = useState('#ffffff')
  const [selectedDanmakuMode, setSelectedDanmakuMode] = useState<'scroll' | 'top' | 'bottom'>('scroll')
  const [isDanmakuPanelOpen, setIsDanmakuPanelOpen] = useState(false)
  const [danmakuOpacity, setDanmakuOpacity] = useState(100)
  const [danmakuDensity, setDanmakuDensity] = useState<'full' | 'half'>('full')
  const [danmakuFontSize, setDanmakuFontSize] = useState<'small' | 'normal' | 'large'>('normal')
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentPlaybackPercent, setCurrentPlaybackPercent] = useState(0)
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(parseDurationToSeconds(video.duration))
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volumeLevel, setVolumeLevel] = useState(70)
  const [hasPlaybackError, setHasPlaybackError] = useState(false)
  const [danmakuSearchQuery, setDanmakuSearchQuery] = useState('')
  const [danmakuModeFilter, setDanmakuModeFilter] = useState<'all' | 'scroll' | 'top' | 'bottom'>('all')
  const [draftBlockTerm, setDraftBlockTerm] = useState('')
  const [danmakuSortOrder, setDanmakuSortOrder] = useState<'timeline-asc' | 'timeline-desc' | 'latest'>('timeline-asc')
  const playbackDurationLabel = formatVideoClock(videoDurationSeconds)
  const allComments = [...(userCommentsByVideo[video.id] ?? []), ...comments]
  const filteredDanmakuByMode = (danmakuByVideo[video.id] ?? []).filter((item) => {
    const matchesMode = danmakuModeFilter === 'all' ? true : item.mode === danmakuModeFilter
    const matchesBlocklist = !danmakuBlocklist.some((term) => item.text.toLowerCase().includes(term))

    return matchesMode && matchesBlocklist
  })
  const visibleDanmaku = filteredDanmakuByMode.filter((item) => {
    const threshold = item.mode === 'scroll' ? 6 : 3

    return Math.abs(item.timestampPercent - currentPlaybackPercent) <= threshold
  })
  const activeDanmaku = visibleDanmaku.filter((_, index) => (danmakuDensity === 'full' ? true : index % 2 === 0))
  const danmakuMarkers = [...new Map(filteredDanmakuByMode.map((item) => [item.timestampPercent, item])).values()]
  const filteredDanmakuList = [...filteredDanmakuByMode]
    .filter((item) => item.text.toLowerCase().includes(danmakuSearchQuery.trim().toLowerCase()))
    .sort((left, right) => {
      if (danmakuSortOrder === 'latest') {
        return right.id.localeCompare(left.id)
      }

      if (danmakuSortOrder === 'timeline-desc') {
        return right.timestampPercent - left.timestampPercent
      }

      return left.timestampPercent - right.timestampPercent
    })

  useEffect(() => {
    addHistory(video.id)
  }, [addHistory, video.id])

  useEffect(() => {
    setCurrentPlaybackPercent(0)
    setVideoDurationSeconds(parseDurationToSeconds(video.duration))
    setPlaybackRate(1)
    setVolumeLevel(70)
    setHasPlaybackError(false)
    setIsPlaying(false)
    setDraftChatMessage('')
    setChatMessages([
      { id: `${video.id}-chat-1`, user: '房管小卡', role: 'mod', content: '欢迎来到放映聊天室，友善讨论，拒绝剧透。', time: '刚刚' },
      { id: `${video.id}-chat-2`, user: '追更雷达', role: 'member', content: `这期 ${video.creator} 的节奏好稳。`, time: '1 分钟前' },
      { id: `${video.id}-chat-3`, user: '剪辑学习中', role: 'member', content: '有人一起看完再聊镜头设计吗？', time: '2 分钟前' },
    ])
  }, [video.id])

  useEffect(() => {
    if (!videoRef.current) {
      return
    }

    videoRef.current.playbackRate = playbackRate
  }, [playbackRate])

  useEffect(() => {
    if (!videoRef.current) {
      return
    }

    videoRef.current.volume = volumeLevel / 100
    videoRef.current.muted = volumeLevel === 0
  }, [volumeLevel])

  function getActiveDurationSeconds() {
    return videoRef.current?.duration && Number.isFinite(videoRef.current.duration)
      ? videoRef.current.duration
      : videoDurationSeconds
  }

  function syncPlaybackPercent(currentTime: number, duration = getActiveDurationSeconds()) {
    if (!duration || Number.isNaN(duration)) {
      setCurrentPlaybackPercent(0)
      return
    }

    setCurrentPlaybackPercent(Math.min(100, (currentTime / duration) * 100))
  }

  function seekToPercent(percent: number) {
    const clamped = Math.min(100, Math.max(0, percent))
    const nextDuration = getActiveDurationSeconds()

    if (videoRef.current && nextDuration > 0) {
      videoRef.current.currentTime = (clamped / 100) * nextDuration
    }

    setCurrentPlaybackPercent(clamped)
  }

  async function handlePlayToggle() {
    if (!videoRef.current) {
      return
    }

    if (videoRef.current.paused) {
      try {
        await videoRef.current.play()
        setIsPlaying(true)
      } catch {
        setIsPlaying(false)
      }

      return
    }

    videoRef.current.pause()
    setIsPlaying(false)
  }

  async function handleFullscreen() {
    if (!playerStageRef.current?.requestFullscreen) {
      return
    }

    await playerStageRef.current.requestFullscreen()
  }

  function handleCommentSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    publishComment(video.id, draftComment)
    setDraftComment('')
  }

  function handleDanmakuSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    publishDanmaku(video.id, draftDanmaku, {
      color: selectedDanmakuColor,
      mode: selectedDanmakuMode,
      timestampPercent: currentPlaybackPercent,
    })
    setDraftDanmaku('')
  }

  function handleChatSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = draftChatMessage.trim()

    if (!content) {
      return
    }

    setChatMessages((current) => [
      ...current,
      { id: `${video.id}-chat-${Date.now()}`, user: '我', role: 'viewer', content, time: '刚刚' },
    ])
    setDraftChatMessage('')
  }

  function handleBlockTermSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    addDanmakuBlockTerm(draftBlockTerm)
    setDraftBlockTerm('')
  }

  function handleExportDanmaku() {
    if (typeof window === 'undefined') {
      return
    }

    const payload = filteredDanmakuList.map((item) => ({
      text: item.text,
      mode: item.mode,
      color: item.color,
      timestampPercent: item.timestampPercent,
      timestamp: formatDanmakuTime(item.timestampPercent, playbackDurationLabel),
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${video.id}-danmaku.json`
    document.body.append(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  }

  return (
    <AppShell>
      <div className="watch-layout">
        <section className="section-block player-block">
          <div ref={playerStageRef} className="player-stage" style={{ background: video.cover }}>
            <video
              ref={videoRef}
              className="player-video"
              loop
              playsInline
              preload="metadata"
              src={video.videoSrc}
              onDurationChange={(event) => {
                const nextDuration = Number.isFinite(event.currentTarget.duration)
                  ? event.currentTarget.duration
                  : parseDurationToSeconds(video.duration)

                setVideoDurationSeconds(nextDuration)
              }}
              onEnded={() => setIsPlaying(false)}
              onError={() => setHasPlaybackError(true)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onTimeUpdate={(event) => syncPlaybackPercent(event.currentTarget.currentTime, event.currentTarget.duration)}
            />
            <div className="player-video-scrim" />
            <div className="player-chrome">
              <span className="player-pill">正在播放</span>
              <span>{playbackDurationLabel}</span>
            </div>
            {!isPlaying ? (
              <div className="player-center">
                <button className="play-symbol" type="button" onClick={() => void handlePlayToggle()}>
                  PLAY
                </button>
              </div>
            ) : null}
            {hasPlaybackError ? <div className="player-status-banner">示例视频加载失败，仍可体验弹幕与页面交互。</div> : null}
            {isDanmakuEnabled ? (
              <div className="danmaku-layer" aria-hidden="true">
                {activeDanmaku.map((item) => (
                  <div
                    key={item.id}
                    className={`danmaku-track danmaku-track-${item.mode}`}
                    style={{
                      top: item.mode === 'scroll' ? `${18 + item.track * 12}%` : `${10 + item.track * 8}%`,
                      bottom: item.mode === 'bottom' ? `${14 + item.track * 10}%` : 'auto',
                      animationDuration: `${item.duration}s`,
                      animationDelay: `-${item.delay}s`,
                      color: item.color,
                      opacity: danmakuOpacity / 100,
                      fontSize:
                        danmakuFontSize === 'small' ? '0.92rem' : danmakuFontSize === 'large' ? '1.2rem' : '1rem',
                    }}
                  >
                    {item.text}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="player-controls">
              <div className="player-progress">
                <span style={{ width: `${currentPlaybackPercent}%` }} />
                <div className="danmaku-markers" aria-hidden="true">
                  {danmakuMarkers.map((item) => (
                    <button
                      key={item.id}
                      className="danmaku-marker"
                      title={`${formatDanmakuTime(item.timestampPercent, playbackDurationLabel)} ${item.text}`}
                      type="button"
                      style={{ left: `${item.timestampPercent}%`, background: item.color }}
                      onClick={() => seekToPercent(item.timestampPercent)}
                    />
                  ))}
                </div>
                <input
                  aria-label="拖动播放进度"
                  className="timeline-slider"
                  max="100"
                  min="0"
                  type="range"
                  value={currentPlaybackPercent}
                  onChange={(event) => seekToPercent(Number(event.target.value))}
                />
              </div>
              <div className="player-toolbar">
                <div className="toolbar-left">
                  <button type="button" onClick={() => void handlePlayToggle()}>
                    {isPlaying ? '暂停' : '播放'}
                  </button>
                  <button type="button" onClick={() => seekToPercent(0)}>
                    回到开头
                  </button>
                  <button type="button" onClick={() => setIsDanmakuEnabled((current) => !current)}>
                    {isDanmakuEnabled ? '关闭弹幕' : '开启弹幕'}
                  </button>
                  <button type="button" onClick={() => setIsDanmakuPanelOpen((current) => !current)}>
                    弹幕设置
                  </button>
                  <span>
                    {formatDanmakuTime(currentPlaybackPercent, playbackDurationLabel)} / {playbackDurationLabel}
                  </span>
                </div>
                <div className="toolbar-right">
                  <span className="toolbar-chip">HD</span>
                  <label className="toolbar-inline-control">
                    倍速
                    <select value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))}>
                      {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                        <option key={rate} value={rate}>
                          {rate}x
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="toolbar-inline-control volume-control">
                    音量
                    <input
                      max="100"
                      min="0"
                      type="range"
                      value={volumeLevel}
                      onChange={(event) => setVolumeLevel(Number(event.target.value))}
                    />
                  </label>
                  <button type="button" onClick={() => void handleFullscreen()}>
                    全屏
                  </button>
                </div>
              </div>
            </div>
          </div>
          <form className="danmaku-form" onSubmit={handleDanmakuSubmit}>
            <div className="danmaku-input-row">
              <input
                aria-label="发送弹幕"
                maxLength={30}
                placeholder="发送一条弹幕试试，最多 30 个字"
                type="text"
                value={draftDanmaku}
                onChange={(event) => setDraftDanmaku(event.target.value)}
              />
              <button type="submit">发送弹幕</button>
            </div>
            <div className="danmaku-settings">
              <div className="danmaku-mode-group">
                {[
                  { label: '滚动', value: 'scroll' },
                  { label: '顶部', value: 'top' },
                  { label: '底部', value: 'bottom' },
                ].map((option) => (
                  <button
                    key={option.value}
                    className={selectedDanmakuMode === option.value ? 'active-mode' : ''}
                    type="button"
                    onClick={() => setSelectedDanmakuMode(option.value as 'scroll' | 'top' | 'bottom')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="danmaku-color-group">
                {['#ffffff', '#ffe066', '#ff8fab', '#90e0ef', '#c77dff'].map((color) => (
                  <button
                    key={color}
                    aria-label={`选择颜色 ${color}`}
                    className={selectedDanmakuColor === color ? 'active-color' : ''}
                    type="button"
                    style={{ background: color }}
                    onClick={() => setSelectedDanmakuColor(color)}
                  />
                ))}
              </div>
            </div>
            {isDanmakuPanelOpen ? (
              <section className="danmaku-panel">
                <label>
                  不透明度
                  <input
                    max="100"
                    min="20"
                    type="range"
                    value={danmakuOpacity}
                    onChange={(event) => setDanmakuOpacity(Number(event.target.value))}
                  />
                </label>
                <div className="danmaku-segment-group">
                  <span>密度</span>
                  <div>
                    <button
                      className={danmakuDensity === 'full' ? 'active-mode' : ''}
                      type="button"
                      onClick={() => setDanmakuDensity('full')}
                    >
                      全部
                    </button>
                    <button
                      className={danmakuDensity === 'half' ? 'active-mode' : ''}
                      type="button"
                      onClick={() => setDanmakuDensity('half')}
                    >
                      半屏
                    </button>
                  </div>
                </div>
                <div className="danmaku-segment-group">
                  <span>字号</span>
                  <div>
                    {['small', 'normal', 'large'].map((size) => (
                      <button
                        key={size}
                        className={danmakuFontSize === size ? 'active-mode' : ''}
                        type="button"
                        onClick={() => setDanmakuFontSize(size as 'small' | 'normal' | 'large')}
                      >
                        {size === 'small' ? '小' : size === 'normal' ? '中' : '大'}
                      </button>
                    ))}
                  </div>
                </div>
                <form className="danmaku-block-form" onSubmit={handleBlockTermSubmit}>
                  <label>
                    屏蔽词
                    <div className="danmaku-block-row">
                      <input
                        aria-label="添加屏蔽词"
                        placeholder="输入要屏蔽的关键词"
                        type="text"
                        value={draftBlockTerm}
                        onChange={(event) => setDraftBlockTerm(event.target.value)}
                      />
                      <button type="submit">添加</button>
                    </div>
                  </label>
                  {danmakuBlocklist.length > 0 ? (
                    <div className="blocklist-chip-row">
                      {danmakuBlocklist.map((term) => (
                        <button key={term} className="blocklist-chip" type="button" onClick={() => removeDanmakuBlockTerm(term)}>
                          {term} ×
                        </button>
                      ))}
                    </div>
                  ) : null}
                </form>
              </section>
            ) : null}
          </form>
          <section className="section-block danmaku-list-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">弹幕列表</span>
                <h2>{filteredDanmakuList.length} 条当前视频弹幕</h2>
              </div>
              <span className="section-note">支持点击列表或标记跳转时间点</span>
            </div>
            <div className="danmaku-list-tools">
              <input
                aria-label="搜索弹幕"
                placeholder="搜索弹幕内容"
                type="search"
                value={danmakuSearchQuery}
                onChange={(event) => setDanmakuSearchQuery(event.target.value)}
              />
              <div className="danmaku-tool-groups">
                <div className="danmaku-filter-group">
                  {[
                    { label: '全部', value: 'all' },
                    { label: '滚动', value: 'scroll' },
                    { label: '顶部', value: 'top' },
                    { label: '底部', value: 'bottom' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={danmakuModeFilter === option.value ? 'active-mode' : ''}
                      type="button"
                      onClick={() => setDanmakuModeFilter(option.value as 'all' | 'scroll' | 'top' | 'bottom')}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="danmaku-filter-group">
                  {[
                    { label: '时间正序', value: 'timeline-asc' },
                    { label: '时间倒序', value: 'timeline-desc' },
                    { label: '最新发送', value: 'latest' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={danmakuSortOrder === option.value ? 'active-mode' : ''}
                      type="button"
                      onClick={() =>
                        setDanmakuSortOrder(option.value as 'timeline-asc' | 'timeline-desc' | 'latest')
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="danmaku-filter-group">
                  <button type="button" onClick={handleExportDanmaku}>
                    导出筛选结果
                  </button>
                  <button type="button" onClick={() => clearDanmakuForVideo(video.id)}>
                    清空当前视频
                  </button>
                  <button type="button" onClick={() => resetDanmakuForVideo(video.id)}>
                    恢复默认
                  </button>
                </div>
              </div>
            </div>
            <div className="danmaku-list">
              {filteredDanmakuList.slice(0, 12).map((item) => (
                <button
                  key={item.id}
                  className="danmaku-list-item"
                  type="button"
                  onClick={() => seekToPercent(item.timestampPercent)}
                >
                  <span className="danmaku-time">{formatDanmakuTime(item.timestampPercent, playbackDurationLabel)}</span>
                  <span className="danmaku-mode-label">{getDanmakuModeLabel(item.mode)}</span>
                  <span className="danmaku-color-dot" style={{ background: item.color }} />
                  <p>{item.text}</p>
                </button>
              ))}
            </div>
          </section>
          <div className="video-header">
            <div>
              <span className="section-kicker">{video.category}</span>
              <h1 className="video-title">{video.title}</h1>
              <p className="video-summary">{video.description}</p>
            </div>
            <div className="video-actions">
              <button type="button">点赞 {video.likes}</button>
              <button type="button">投币</button>
              <button type="button" onClick={() => toggleFavorite(video.id)}>
                {favoriteVideoIds.includes(video.id) ? '已收藏' : '收藏'}
              </button>
            </div>
          </div>
          <div className="video-meta-row">
            <span>{video.creator}</span>
            <span>{video.views} 播放</span>
            <span>{video.danmaku} 弹幕</span>
            <span>{video.publishedAt}</span>
          </div>
          <div className="tag-row">
            {video.tags.map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
          <section className="comment-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">评论区</span>
                <h2>{allComments.length} 条精选评论</h2>
              </div>
            </div>
            <form className="comment-form" onSubmit={handleCommentSubmit}>
              <textarea
                placeholder="发一条友善的评论，告诉大家你看到了什么。"
                rows={3}
                value={draftComment}
                onChange={(event) => setDraftComment(event.target.value)}
              />
              <button type="submit">发布评论</button>
            </form>
            <div className="comment-list">
              {allComments.map((comment) => (
                <article key={`${comment.user}-${comment.time}`} className="comment-item">
                  <div className="avatar-badge">{comment.user.slice(0, 1)}</div>
                  <div>
                    <div className="comment-meta">
                      <strong>{comment.user}</strong>
                      <span>{comment.time}</span>
                    </div>
                    <p>{comment.content}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="sidebar-stack">
          <section className="section-block compact-block chat-room-panel">
            <div className="chat-room-head">
              <div>
                <span className="section-kicker">聊天室</span>
                <h2>同步放映讨论</h2>
              </div>
              <span className="chat-online-dot">2.8 万在线</span>
            </div>
            <div className="chat-room-list" aria-live="polite">
              {chatMessages.map((message) => (
                <article key={message.id} className={`chat-message chat-message-${message.role}`}>
                  <div className="chat-message-meta">
                    <strong>{message.user}</strong>
                    <span>{message.time}</span>
                  </div>
                  <p>{message.content}</p>
                </article>
              ))}
            </div>
            <form className="chat-room-form" onSubmit={handleChatSubmit}>
              <input
                aria-label="发送聊天室消息"
                maxLength={80}
                placeholder="和大家实时聊两句"
                type="text"
                value={draftChatMessage}
                onChange={(event) => setDraftChatMessage(event.target.value)}
              />
              <button type="submit">发送</button>
            </form>
          </section>

          <section className="section-block compact-block creator-panel">
            <div className="creator-panel-head">
              <div className="avatar-badge">{video.creator.slice(0, 1)}</div>
              <div>
                <strong>{video.creator}</strong>
                <span>{video.category} 区 · 128.4 万粉丝</span>
              </div>
            </div>
            <p>{video.description}</p>
            <div className="creator-actions">
              <button type="button" onClick={() => toggleFollow(video.creator)}>
                {followedCreators.includes(video.creator) ? '已关注' : '关注'}
              </button>
              <button type="button">私信</button>
            </div>
          </section>

          <section className="section-block compact-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">选集</span>
                <h2>播放列表</h2>
              </div>
            </div>
            <div className="episode-list">
              {videos.slice(0, 5).map((item, index) => (
                <Link key={item.id} className={`episode-item${item.id === video.id ? ' active-episode' : ''}`} to={`/video/${item.id}`}>
                  <span>EP {index + 1}</span>
                  <strong>{item.title}</strong>
                </Link>
              ))}
            </div>
          </section>

          <section className="section-block compact-block">
            <div className="section-heading">
              <div>
                <span className="section-kicker">接下来播放</span>
                <h2>相关推荐</h2>
              </div>
            </div>
            <div className="related-list">
              {relatedVideos.map((item) => (
                <Link key={item.id} className="related-card" to={`/video/${item.id}`}>
                  <div className="related-cover" style={{ background: item.cover }} />
                  <div>
                    <strong>{item.title}</strong>
                    <span>
                      {item.creator} · {item.views}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </AppShell>
  )
}

function HeaderAuthAction() {
  const { user, logout, loading } = useAuth()

  if (loading) {
    return <span className="header-link">…</span>
  }

  if (!user) {
    return (
      <Link className="header-avatar" to="/login">
        登录
      </Link>
    )
  }

  return (
    <>
      <Link className="header-link" to="/profile" title={user.username}>
        {user.username}
      </Link>
      <button className="header-link" type="button" onClick={logout}>
        退出
      </button>
    </>
  )
}

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [searchValue, setSearchValue] = useState(searchParams.get('q') ?? '')
  const quickEntryItems = [
    { label: '动态', to: '/history' },
    { label: '热门', to: '/rank' },
    { label: '直播', to: '/live' },
    { label: '众筹', to: '/crowdfund' },
    { label: 'IP 工坊', to: '/ip-studio' },
    { label: '创作中心', to: '/upload' },
  ]

  useEffect(() => {
    setSearchValue(searchParams.get('q') ?? '')
  }, [searchParams])

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextParams = new URLSearchParams()

    if (searchValue.trim()) {
      nextParams.set('q', searchValue.trim())
    }

    navigate({ pathname: '/', search: nextParams.toString() ? `?${nextParams.toString()}` : '' })
  }

  function isNavItemActive(to: string) {
    if (to === '/') {
      return location.pathname === '/' && !searchParams.get('cat')
    }

    if (to === '/rank' || to === '/live' || to === '/ip-studio') {
      return location.pathname === to
    }

    if (to === '/crowdfund') {
      return location.pathname === '/crowdfund' || location.pathname.startsWith('/crowdfund/')
    }

    if (to.startsWith('/?cat=')) {
      return location.pathname === '/' && `/?cat=${searchParams.get('cat') ?? ''}` === to
    }

    return false
  }

  return (
    <div className="app-shell">
      <header className="header-shell">
        <div className="topbar topbar-upper">
          <Link className="brand" to="/" aria-label="KakuKaku Video 首页">
            <span className="brand-mark" aria-hidden="true">
              <span className="brand-core" />
              <span className="brand-play" />
            </span>
            <span className="brand-word">
              <strong>KakuKaku</strong>
              <span>Creator Video Hub</span>
            </span>
          </Link>
          <nav className="masthead-nav">
            {navigationItems.map((item) => (
              <Link key={item.label} className={isNavItemActive(item.to) ? 'active' : ''} to={item.to}>
                {item.label}
              </Link>
            ))}
          </nav>
          <form className="search-box" onSubmit={handleSearchSubmit}>
            <input
              aria-label="搜索视频"
              placeholder="搜索视频、番剧、直播或 UP 主"
              type="search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
            <button type="submit">搜索</button>
          </form>
          <div className="header-actions">
            {quickEntryItems.map((item) => (
              <Link key={item.label} className="header-link" to={item.to}>
                {item.label}
              </Link>
            ))}
            <HeaderAuthAction />
          </div>
        </div>
      </header>
      <main className="page-shell">{children}</main>
    </div>
  )
}

function VideoCard({ videoId }: { videoId: string }) {
  const video = videos.find((item) => item.id === videoId)

  if (!video) {
    return null
  }

  return (
    <Link className="video-card" to={`/video/${video.id}`}>
      <div className="video-cover" style={{ background: video.cover }}>
        <span className="duration-pill">{video.duration}</span>
      </div>
      <div className="video-card-copy">
        <strong>{video.title}</strong>
        <div className="video-card-meta">
          <div className="avatar-badge small-avatar">{video.creator.slice(0, 1)}</div>
          <div className="video-card-byline">
            <span className="video-card-creator">{video.creator}</span>
            <span className="video-card-published">
              {video.category} · {video.publishedAt}
            </span>
          </div>
        </div>
        <div className="video-card-stats">
          <span className="stat-chip play-stat">{video.views}</span>
          <span className="stat-chip danmaku-stat">{video.danmaku}</span>
        </div>
      </div>
    </Link>
  )
}

function CompactVideoCard({ videoId }: { videoId: string }) {
  const video = videos.find((item) => item.id === videoId)

  if (!video) {
    return null
  }

  return (
    <Link className="compact-video-card" to={`/video/${video.id}`}>
      <div className="compact-video-thumb" style={{ background: video.cover }}>
        <span className="duration-pill">{video.duration}</span>
        <div className="compact-video-overlay">
          <span className="stat-chip play-stat">{video.views}</span>
          <span className="stat-chip danmaku-stat">{video.danmaku}</span>
        </div>
      </div>
      <div className="compact-video-copy">
        <strong>{video.title}</strong>
        <span>
          {video.creator} · {video.publishedAt}
        </span>
      </div>
    </Link>
  )
}

function useUserState() {
  const context = useContext(UserStateContext)

  if (!context) {
    throw new Error('useUserState must be used within App')
  }

  return context
}

function createInitialDanmakuMap() {
  return Object.fromEntries(
    Object.entries(danmakuSeedsByVideo).map(([videoId]) => [
      videoId,
      createInitialDanmakuEntries(videoId),
    ]),
  ) as Record<string, DanmakuEntry[]>
}

function createInitialDanmakuEntries(videoId: string) {
  return (danmakuSeedsByVideo[videoId] ?? []).map((item, index) => ({
    id: `${videoId}-${index}`,
    text: item.text,
    track: item.track,
    mode: item.mode ?? 'scroll',
    color: item.color ?? '#fff8f2',
    duration: item.duration ?? (item.mode === 'scroll' || !item.mode ? 12 : 4),
    delay: item.delay ?? index * 3,
    timestampPercent: Math.min(96, 12 + index * 14),
  }))
}

function readPersistedUserState(): PersistedUserState | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(USER_STATE_STORAGE_KEY)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<PersistedUserState>

    return {
      favoriteVideoIds: parsed.favoriteVideoIds ?? [videos[0].id, videos[2].id],
      followedCreators: parsed.followedCreators ?? ['纸片城建局'],
      historyVideoIds: parsed.historyVideoIds ?? [videos[0].id, videos[3].id, videos[1].id],
      userCommentsByVideo: parsed.userCommentsByVideo ?? {},
      danmakuBlocklist: parsed.danmakuBlocklist ?? [],
      danmakuByVideo: Object.fromEntries(
        Object.entries(parsed.danmakuByVideo ?? createInitialDanmakuMap()).map(([videoId, items]) => [
          videoId,
          items.map((item, index) => ({
            ...item,
            id: item.id ?? `${videoId}-persisted-${index}`,
            mode: item.mode ?? 'scroll',
            color: item.color ?? '#fff8f2',
            duration: item.duration ?? ((item.mode ?? 'scroll') === 'scroll' ? 12 : 4),
            delay: item.delay ?? index * 3,
            timestampPercent: item.timestampPercent ?? Math.min(96, 12 + index * 14),
          })),
        ]),
      ) as Record<string, DanmakuEntry[]>,
    }
  } catch {
    return null
  }
}

function formatDanmakuTime(timestampPercent: number, duration: string) {
  const [minutes, seconds] = duration.split(':').map((value) => Number.parseInt(value, 10))
  const totalSeconds = minutes * 60 + seconds
  const currentSeconds = Math.round((timestampPercent / 100) * totalSeconds)
  const currentMinutes = Math.floor(currentSeconds / 60)
  const remainingSeconds = currentSeconds % 60

  return `${String(currentMinutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function parseDurationToSeconds(duration: string) {
  const [minutes, seconds] = duration.split(':').map((value) => Number.parseInt(value, 10))

  return minutes * 60 + seconds
}

function formatVideoClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.max(0, Math.round(totalSeconds % 60))

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getDanmakuModeLabel(mode: 'scroll' | 'top' | 'bottom') {
  if (mode === 'top') {
    return '顶部'
  }

  if (mode === 'bottom') {
    return '底部'
  }

  return '滚动'
}

function parseCompactNumber(value: string) {
  if (value.endsWith('万')) {
    return Number.parseFloat(value) * 10000
  }

  return Number.parseFloat(value.replaceAll(',', ''))
}

function parseTimeRank(value: string) {
  if (value.includes('小时')) {
    return Number.parseInt(value, 10)
  }

  if (value.includes('分钟')) {
    return Number.parseInt(value, 10) / 60
  }

  if (value.includes('昨天')) {
    return 24
  }

  if (value.includes('天')) {
    return Number.parseInt(value, 10) * 24
  }

  if (value.includes('周')) {
    return Number.parseInt(value, 10) * 24 * 7
  }

  return Number.MAX_SAFE_INTEGER
}

export default App
