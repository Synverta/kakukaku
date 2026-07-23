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
import { CommunityHome } from './crowdfund/CommunityHome'
import { LaunchCampaign } from './crowdfund/LaunchCampaign'
import { MyOrders } from './crowdfund/MyOrders'
import { RegisterPage } from './pages/RegisterPage'
import { AccountPage } from './pages/AccountPage'
import { RechargePage } from './pages/RechargePage'
import { LegalPage } from './pages/legal/LegalPage'
import { MyReportsPage } from './account/MyReportsPage'
import { AdminShell } from './admin/AdminShell'
import { CasesListPage } from './admin/CasesListPage'
import { CaseDetailPage } from './admin/CaseDetailPage'
import { AppealsPage } from './admin/AppealsPage'
import { AuditLogPage } from './admin/AuditLogPage'
import { ReportDialog } from './components/ReportDialog'
import { NotificationBell } from './components/NotificationBell'
import { CreatorShell } from './creator/CreatorShell'
import { DashboardPage } from './creator/DashboardPage'
import { WorksPage } from './creator/WorksPage'
import { PublishPage } from './creator/PublishPage'
import { AnalyticsPage } from './creator/AnalyticsPage'
import { VideoDetailPage } from './creator/VideoDetailPage'
import { CommentsPage } from './creator/CommentsPage'
import { DanmakuPage } from './creator/DanmakuPage'
import { FansPage } from './creator/FansPage'
import { RevenuePage } from './creator/RevenuePage'
import { GrowthPage } from './creator/GrowthPage'
import { RightsPage } from './creator/RightsPage'
import { ContentTypePage } from './creator/ContentTypePage'
import { PeanutPage } from './creator/PeanutPage'
import { UpdreamPage } from './creator/UpdreamPage'
import { PromotePage } from './creator/PromotePage'
import { AcademyPage } from './creator/AcademyPage'
import { useAuth } from './lib/auth'
import { CommunityDetailPage } from './crowdfund/CommunityDetailPage'
import { PostDetailPage } from './crowdfund/PostDetailPage'
import { IpWorkshopPage } from './crowdfund/IpWorkshopPage'
import { MyEntitlements } from './crowdfund/MyEntitlements'
import { usePublicVideos } from './lib/publicVideos'
import { api } from './lib/api'
import type { PublicVideo } from './lib/publicVideos'
import {
  categories,
  comments,
  danmakuSeedsByVideo,
  navigationItems,
  profileStats,
  studioCards,
  videos,
} from './data/siteData'

type CommentEntry = {
  user: string
  time: string
  content: string
  role?: 'mod' | 'creator' | 'member'
  replyTo?: string
  replyContent?: string
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/recharge" element={<RechargePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/video/:videoId" element={<VideoPage />} />
        <Route path="/published-video/:videoId" element={<PublishedVideoPage />} />
        <Route path="/crowdfund" element={<CrowdfundHome />} />
        <Route path="/cocreate" element={<CrowdfundHome />} />
        <Route path="/crowdfund/project/:id" element={<CampaignDetail />} />
        <Route path="/cocreate/project/:id" element={<CampaignDetail />} />
        <Route path="/crowdfund/create" element={<LaunchCampaign />} />
        <Route path="/cocreate/create" element={<LaunchCampaign />} />
        <Route path="/my-orders" element={<MyOrders />} />
        <Route path="/my-entitlements" element={<MyEntitlements />} />
        <Route path="/ip-studio" element={<IpWorkshopPage />} />
        <Route path="/communities" element={<CommunityHome />} />
        <Route path="/communities/:slug" element={<CommunityDetailPage />} />
        <Route path="/communities/:slug/posts/:postId" element={<PostDetailPage />} />
        <Route path="/creator" element={<CreatorShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="works" element={<WorksPage />} />
          <Route path="works/:id" element={<VideoDetailPage />} />
          <Route path="publish" element={<PublishPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="interactions" element={<Navigate to="interactions/comments" replace />} />
          <Route path="interactions/comments" element={<CommentsPage />} />
          <Route path="interactions/danmaku" element={<DanmakuPage />} />
          <Route path="fans" element={<FansPage />} />
          <Route path="revenue" element={<RevenuePage />} />
          <Route path="growth" element={<Navigate to="growth/missions" replace />} />
          <Route path="growth/missions" element={<GrowthPage />} />
          <Route path="growth/promote" element={<PromotePage />} />
          <Route path="growth/academy" element={<AcademyPage />} />
          <Route path="rights" element={<RightsPage />} />
          <Route path="content/:type" element={<ContentTypePage />} />
          <Route path="peanut" element={<PeanutPage />} />
          <Route path="updream" element={<UpdreamPage />} />
        </Route>
        <Route path="/legal" element={<Navigate to="/legal/user-agreement" replace />} />
        <Route path="/legal/user-agreement" element={<LegalPage slug="user-agreement" />} />
        <Route path="/legal/privacy-policy" element={<LegalPage slug="privacy-policy" />} />
        <Route path="/legal/recharge-rules" element={<LegalPage slug="recharge-rules" />} />
        <Route path="/legal/refund-rules" element={<LegalPage slug="refund-rules" />} />
        <Route path="/legal/content-review-rules" element={<LegalPage slug="content-review-rules" />} />
        <Route path="/legal/complaint-handling" element={<LegalPage slug="complaint-handling" />} />
        <Route path="/legal/account-deletion" element={<LegalPage slug="account-deletion" />} />
        <Route path="/legal/cybersecurity-management" element={<LegalPage slug="cybersecurity-management" />} />
        <Route path="/legal/confidentiality-management" element={<LegalPage slug="confidentiality-management" />} />
        <Route path="/legal/user-information-protection" element={<LegalPage slug="user-information-protection" />} />
        <Route path="/account/reports" element={<MyReportsPage />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<Navigate to="cases" replace />} />
          <Route path="cases" element={<CasesListPage />} />
          <Route path="cases/:id" element={<CaseDetailPage />} />
          <Route path="appeals" element={<AppealsPage />} />
          <Route path="audit" element={<AuditLogPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </UserStateContext.Provider>
  )
}

function HomePage() {
  const { videos: publishedVideos } = usePublicVideos()
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
  const shelfVideos = filteredVideos.slice(0, 8)
  const animeChannelVideos = videos.filter((video) => ['动画', '音乐', '鬼畜'].includes(video.category)).slice(0, 6)
  const learningChannelVideos = videos.filter((video) => ['知识', '科技', '纪录片', '影视'].includes(video.category)).slice(0, 6)
  const latestDropVideos = [...videos].sort((left, right) => parseTimeRank(left.publishedAt) - parseTimeRank(right.publishedAt)).slice(0, 3)
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
          <strong>AIGC 共创 · 帮助创作人快速打造 IP</strong>
          <p>粉丝用 token 支持你心中的 IP，平台批量生成把单次打造的成本打下来。从角色设定到成片，一个人也能跑完一条 IP 生产线。</p>
        </div>
        <div className="cf-hero-actions">
          <Link className="primary-button" to="/cocreate">
            浏览共创项目
          </Link>
          <Link className="ghost-button" to="/ip-studio">
            进入 IP 工坊
          </Link>
        </div>
      </section>

      {publishedVideos.length > 0 ? (
        <section className="section-block">
          <div className="section-heading"><div><span className="section-kicker">最新投稿</span><h2>来自创作者中心的已发布作品</h2></div></div>
          <div className="video-grid">
            {publishedVideos.slice(0, 8).map((video) => (
              <Link key={video.id} className="video-card" to={`/published-video/${video.id}`}>
                <div className="video-card-cover" style={{ background: video.cover || 'linear-gradient(135deg,#2868ff,#18b6a0)' }}><span>{video.duration}</span></div>
                <strong>{video.title}</strong><span>{video.creator?.name ?? '创作者'} · {video.views.toLocaleString('zh-CN')} 播放</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

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
            </div>
          </section>
        </>
      ) : null}

      <footer className="site-icp-footer">
        <span className="site-legal-link-wrap">
          <Link to="/legal/user-agreement" className="site-legal-link">
            协议与规则
          </Link>
        </span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
          className="site-icp-link"
        >
          辽ICP备2026005046号-2
        </a>
      </footer>
    </AppShell>
  )
}

function HistoryPage() {
  const { favoriteVideoIds, historyVideoIds } = useUserState()
  const historyVideos = historyVideoIds
    .map((videoId) => videos.find((video) => video.id === videoId))
    .filter((video): video is (typeof videos)[number] => Boolean(video))

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
            {historyVideos.map((video, index) => (
              <Link key={video.id} className="history-item" to={`/video/${video.id}`}>
                <div className="history-cover" style={{ background: video.cover }} />
                <div className="history-copy">
                  <strong>{video.title}</strong>
                  <p>{video.description}</p>
                  <span>
                    {video.creator} · {video.views} 播放 · 上次看到 {Math.min(93, 18 + index * 11)}%
                  </span>
                  <div className="progress-rail">
                    <span style={{ width: `${Math.min(93, 18 + index * 11)}%` }} />
                  </div>
                </div>
              </Link>
            ))}
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
            <div className="video-grid">
              {videos
                .filter((video) => favoriteVideoIds.includes(video.id))
                .map((video) => (
                  <Link key={video.id} className="history-item" to={`/video/${video.id}`}>
                    <div className="history-cover" style={{ background: video.cover }} />
                    <div className="history-copy">
                      <strong>{video.title}</strong>
                      <span>{video.creator} · {video.views}</span>
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

function RankPage() {
  const { videos: publishedVideos } = usePublicVideos()
  const ranking = [...videos]
    .sort((left, right) => parseCompactNumber(right.views) - parseCompactNumber(left.views))
    .slice(0, 20)

  return (
    <AppShell>
      <section className="section-block ranking-hero">
        <div>
          <span className="eyebrow">排行榜</span>
          <h1>站内综合热度榜，按播放量排序。</h1>
          <p>展示站内综合热度前列的作品，模拟真实排行榜前 20 位。</p>
        </div>
      </section>
      <div className="ranking-list">
        {publishedVideos.sort((left, right) => right.views - left.views).map((video, index) => (
          <Link key={`db-${video.id}`} className="ranking-item" to={`/published-video/${video.id}`}>
            <span className="ranking-index">{String(index + 1).padStart(2, '0')}</span><div><strong>{video.title}</strong><span>{video.creator?.name ?? '创作者'} · {video.views.toLocaleString('zh-CN')} 播放 · {video.category}</span></div>
          </Link>
        ))}
        {ranking.map((video, index) => (
          <Link key={video.id} className="ranking-item" to={`/video/${video.id}`}>
            <span className="ranking-index">{String(index + 1).padStart(2, '0')}</span>
            <div>
              <strong>{video.title}</strong>
              <span>
                {video.creator} · {video.views} 播放 · {video.category}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  )
}

function PublishedVideoPage() {
  const { videoId } = useParams()
  const [video, setVideo] = useState<PublicVideo | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    if (!videoId) return
    api.get<{ video: PublicVideo }>(`/videos/${videoId}`).then((result) => setVideo(result.video)).catch(() => setError('作品不存在或尚未发布'))
  }, [videoId])
  return <AppShell><section className="section-block"><Link to="/">← 返回首页</Link>{error ? <div className="empty-state"><h3>{error}</h3></div> : !video ? <div className="empty-state"><h3>正在加载作品…</h3></div> : <><h1>{video.title}</h1><p>{video.creator?.name} · {video.category} · {video.views.toLocaleString('zh-CN')} 播放</p>{video.embedUrl ? <div className="video-frame"><iframe src={video.embedUrl} title={video.title} allowFullScreen /></div> : <video className="video-frame" controls src={video.videoSrc} poster={video.cover} />}<p>{video.description}</p><div className="tag-row">{video.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></>}</section></AppShell>
}

function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
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
      setError(message || code || '登录失败，请稍后再试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell>
      <section className="auth-layout login-layout">
        <div className="hero-copy auth-copy auth-copy-redesign login-copy">
          <div className="auth-copy-top">
            <span className="eyebrow">账号登录 · kakukaku</span>
            <h1>
              欢迎回来
              <br />
              一起继续把作品折成城市。
            </h1>
            <p>登录后同步创作台、发起 IP 共创、用 token 支持别人的创作，让每一次灵感都有进度条。</p>
          </div>

          <div className="auth-feature-list" aria-label="登录后可使用的能力">
            <div className="auth-feature-item">
              <span className="auth-feature-icon" aria-hidden="true">稿</span>
              <div>
                <strong>同步创作台</strong>
                <p>草稿、收藏与历史记录跨设备继续，不错过任何更新。</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-icon" aria-hidden="true">IP</span>
              <div>
                <strong>支持 IP 共创</strong>
                <p>加入喜欢的项目，用 token 解锁共创权益与动态。</p>
              </div>
            </div>
            <div className="auth-feature-item">
              <span className="auth-feature-icon" aria-hidden="true">榜</span>
              <div>
                <strong>进入创作者榜单</strong>
                <p>作品热度实时沉淀，离下一次推荐更近一步。</p>
              </div>
            </div>
          </div>

          <div className="auth-stat-row" aria-label="社区数据">
            <div>
              <strong>12,800+</strong>
              <span>活跃创作者</span>
            </div>
            <div>
              <strong>320 万</strong>
              <span>月观看量</span>
            </div>
            <div>
              <strong>1,200+</strong>
              <span>正在共创</span>
            </div>
          </div>

          <blockquote className="auth-quote">
            <p>「在这里我从一张稿子起步，做出了连续三季的城市景观动画。」</p>
            <cite>—— 创作者 林同学</cite>
          </blockquote>
        </div>

        <section className="section-block auth-panel login-panel" aria-labelledby="login-title">
          <div className="section-heading login-heading">
            <div>
              <span className="section-kicker">登录</span>
              <h2 id="login-title">登录你的账号</h2>
            </div>
            <Link className="ghost-button small-button" to="/register">
              去注册
            </Link>
          </div>

          <form className="auth-form login-form" onSubmit={handleSubmit}>
            <label>
              用户名
              <input
                autoComplete="username"
                maxLength={40}
                minLength={3}
                placeholder="请输入你的用户名"
                required
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
            <div className="auth-form-field">
              <label htmlFor="login-password">密码</label>
              <div className="auth-input-wrap">
                <input
                  id="login-password"
                  autoComplete="current-password"
                  maxLength={128}
                  minLength={8}
                  placeholder="至少 8 位字符"
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="auth-input-affix"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            <div className="auth-form-row login-form-row">
              <label className="checkbox-line">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                记住我
              </label>
              <a className="auth-link" href="/login" onClick={(event) => event.preventDefault()}>
                忘记密码？
              </a>
            </div>

            {error ? <div className="auth-error">{error}</div> : null}

            <button type="submit" className="primary-button full-button" disabled={submitting}>
              {submitting ? '登录中…' : '登录'}
            </button>

            <div className="auth-divider" aria-hidden="true">
              <span>或使用快捷方式</span>
            </div>

            <div className="oauth-row login-oauth-row">
              <button type="button" disabled>
                微信登录
              </button>
              <button type="button" disabled>
                微博登录
              </button>
              <button type="button" disabled>
                手机号登录
              </button>
            </div>

            <p className="auth-footnote">
              还没有账号？
              <Link to="/register">免费注册一个</Link>
            </p>
          </form>
        </section>
      </section>
    </AppShell>
  )
}

function ProfilePage() {
  const { favoriteVideoIds, followedCreators, historyVideoIds } = useUserState()
  const continueWatching = historyVideoIds
    .map((videoId) => videos.find((video) => video.id === videoId))
    .filter((video): video is (typeof videos)[number] => Boolean(video))
    .slice(0, 3)

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

      {continueWatching.length > 0 ? (
        <section className="section-block">
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
            <Link className="ghost-button small-button" to="/creator/works">
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
              <Link className="quick-link-card" to="/creator/dashboard">
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
              <Link className="quick-link-card" to="/my-orders">
                <strong>我的共创订单</strong>
                <span>关闭未支付订单、对已支付订单申请退款</span>
              </Link>
              <Link className="quick-link-card" to="/account">
                <strong>账号设置</strong>
                <span>修改昵称、邮箱、头像或密码，注销账号</span>
              </Link>
              <Link className="quick-link-card" to="/recharge">
                <strong>充值酷币</strong>
                <span>用账户余额支持你喜欢的 IP 计划</span>
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

function VideoPage() {
  const {
    addHistory,
    addDanmakuBlockTerm,
    danmakuBlocklist,
    danmakuByVideo,
    favoriteVideoIds,
    followedCreators,
    publishComment,
    publishDanmaku,
    removeDanmakuBlockTerm,
    toggleFavorite,
    toggleFollow,
    userCommentsByVideo,
  } = useUserState()
  const { videoId } = useParams()
  const video = videos.find((item) => item.id === videoId) ?? videos[0]
  const isEmbedded = Boolean(video.embedUrl)
  const relatedVideos = videos.filter((item) => item.id !== video.id).slice(0, 4)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const playerStageRef = useRef<HTMLDivElement | null>(null)
  const [draftComment, setDraftComment] = useState('')
  const [draftDanmaku, setDraftDanmaku] = useState('')
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
  const [draftBlockTerm, setDraftBlockTerm] = useState('')
  const [commentSort, setCommentSort] = useState<'hot' | 'newest'>('hot')
  const [likedCommentKeys, setLikedCommentKeys] = useState<Set<string>>(new Set())
  const [reportTarget, setReportTarget] = useState<{ type: 'video' | 'comment' | 'danmaku'; id: string; label?: string } | null>(null)
  const playbackDurationLabel = formatVideoClock(videoDurationSeconds)
  const allComments: CommentEntry[] = [...(userCommentsByVideo[video.id] ?? []), ...(comments as CommentEntry[])]
  const sortedComments = commentSort === 'newest' ? [...allComments].reverse() : allComments

  function toggleCommentLike(key: string) {
    setLikedCommentKeys((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  function likeCountFor(comment: CommentEntry, index: number) {
    const key = `${comment.user}-${index}`
    const base = 56 + (comment.user.length * 7 + comment.content.length * 3) % 9000
    return likedCommentKeys.has(key) ? base + 1 : base
  }
  const filteredDanmakuByMode = (danmakuByVideo[video.id] ?? []).filter((item) => {
    const matchesBlocklist = !danmakuBlocklist.some((term) => item.text.toLowerCase().includes(term))
    return matchesBlocklist
  })
  const visibleDanmaku = filteredDanmakuByMode.filter((item) => {
    const threshold = item.mode === 'scroll' ? 6 : 3

    return Math.abs(item.timestampPercent - currentPlaybackPercent) <= threshold
  })
  const activeDanmaku = visibleDanmaku.filter((_, index) => (danmakuDensity === 'full' ? true : index % 2 === 0))
  const danmakuMarkers = [...new Map(filteredDanmakuByMode.map((item) => [item.timestampPercent, item])).values()]
  const filteredDanmakuList = [...filteredDanmakuByMode]
    .sort((left, right) => left.timestampPercent - right.timestampPercent)

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

  function handleBlockTermSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    addDanmakuBlockTerm(draftBlockTerm)
    setDraftBlockTerm('')
  }

  return (
    <AppShell>
      <div className="watch-layout">
        <section className="section-block player-block">
          <div className="watch-title-row">
            <h1>{video.title}</h1>
            <div className="watch-meta-row">
              <span className="meta-pill">{video.views} 播放</span>
              <span className="meta-pill">{allComments.length} 评论</span>
              <span className="meta-pill">{video.danmaku} 弹幕</span>
              <span className="meta-pill">{video.publishedAt}</span>
              <span className="meta-warn-text">· 个人观点，仅供参考</span>
              <span className="meta-warn-text meta-warning">⚠ 未经作者授权，禁止转载</span>
            </div>
          </div>

          <div ref={playerStageRef} className="player-stage" style={{ background: video.cover }}>
            {isEmbedded ? (
              <iframe
                className="player-embed"
                src={video.embedUrl}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                scrolling="no"
                frameBorder={0}
              />
            ) : (
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
            )}
            <div className="player-video-scrim" />
            <div className="player-chrome">
              <span className="player-pill">{isEmbedded ? '第三方源' : '正在播放'}</span>
              <span>{playbackDurationLabel}</span>
            </div>
            {!isEmbedded && !isPlaying ? (
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
            {isEmbedded ? (
              <div className="player-controls player-controls-embed">
                <div className="player-toolbar">
                  <div className="toolbar-left">
                    <button type="button" onClick={() => setIsDanmakuEnabled((current) => !current)}>
                      {isDanmakuEnabled ? '关闭弹幕' : '开启弹幕'}
                    </button>
                    <button type="button" onClick={() => setIsDanmakuPanelOpen((current) => !current)}>
                      弹幕设置
                    </button>
                    <span className="player-embed-hint">播放进度由第三方播放器控制</span>
                  </div>
                  <div className="toolbar-right">
                    <span className="toolbar-chip">HD</span>
                    <button type="button" onClick={() => void handleFullscreen()}>
                      全屏
                    </button>
                  </div>
                </div>
              </div>
            ) : (
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
            )}
          </div>

          <div className="watch-action-bar">
            <button type="button" className="action-button">
              <span className="action-glyph" aria-hidden="true">👍</span>
              <span>点赞</span>
              <span className="action-count">{video.likes}</span>
            </button>
            <button type="button" className="action-button">
              <span className="action-glyph" aria-hidden="true">🪙</span>
              <span>投币</span>
              <span className="action-count">2.1万</span>
            </button>
            <button
              type="button"
              className={`action-button${favoriteVideoIds.includes(video.id) ? ' active' : ''}`}
              onClick={() => toggleFavorite(video.id)}
            >
              <span className="action-glyph" aria-hidden="true">
                {favoriteVideoIds.includes(video.id) ? '★' : '☆'}
              </span>
              <span>{favoriteVideoIds.includes(video.id) ? '已收藏' : '收藏'}</span>
              <span className="action-count">{favoriteVideoIds.includes(video.id) ? '已加' : video.likes}</span>
            </button>
            <button type="button" className="action-button">
              <span className="action-glyph" aria-hidden="true">↗</span>
              <span>分享</span>
              <span className="action-count">676</span>
            </button>
            <button
              type="button"
              className="action-button"
              onClick={() => setReportTarget({ type: 'video', id: video.id, label: video.title })}
            >
              <span className="action-glyph" aria-hidden="true">⚐</span>
              <span>稿件举报</span>
            </button>
            <button type="button" className="action-button">
              <span className="action-glyph" aria-hidden="true">📝</span>
              <span>记笔记</span>
            </button>
            <button type="button" className="action-button action-push-end">
              <span className="action-glyph" aria-hidden="true">⋯</span>
              <span>更多</span>
            </button>
          </div>

          <section className="video-summary-block">
            <div className="summary-head">
              <span className="author">{video.creator}</span>
              <span>· {video.publishedAt}</span>
              <span>· {video.danmaku} 弹幕</span>
            </div>
            <p>{video.description}</p>
          </section>

          <div className="tag-row-bili">
            <span className="tag-pill-bili tag-tag-up">新人 UP 报道</span>
            {video.tags.map((tag) => (
              <span key={tag} className="tag-pill-bili">
                {tag}
              </span>
            ))}
            <span className="tag-pill-bili">{video.category}</span>
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

          <section className="comment-block-bili">
            <div className="comment-tabs">
              <h2>评论 {allComments.length}</h2>
              <div className="tab-buttons">
                <button
                  type="button"
                  className={commentSort === 'hot' ? 'active' : ''}
                  onClick={() => setCommentSort('hot')}
                >
                  暴热
                </button>
                <button
                  type="button"
                  className={commentSort === 'newest' ? 'active' : ''}
                  onClick={() => setCommentSort('newest')}
                >
                  最新
                </button>
                <button type="button">只看 UP 主</button>
              </div>
            </div>
            <form className="comment-form" onSubmit={handleCommentSubmit}>
              <div className="form-avatar" aria-hidden="true">我</div>
              <textarea
                placeholder="发条友善的评论吧 ⌃ Ctrl+Enter 发送"
                value={draftComment}
                onChange={(event) => setDraftComment(event.target.value)}
              />
              <div className="form-actions">
                <span>{draftComment.length}/1000</span>
                <button type="submit" className="publish-button" disabled={!draftComment.trim()}>
                  发布
                </button>
              </div>
            </form>
            <div className="comment-list">
              {sortedComments.map((comment, index) => (
                <article key={`${comment.user}-${comment.time}-${index}`} className="comment-item">
                  <div className="comment-avatar" aria-hidden="true">{comment.user.slice(0, 1)}</div>
                  <div>
                    <div className="comment-meta">
                      <span className="comment-name">{comment.user}</span>
                      {comment.role === 'mod' ? (
                        <span className="level-tag level-mod">房管</span>
                      ) : comment.role === 'creator' ? (
                        <span className="level-tag">UP主</span>
                      ) : index % 3 === 0 ? (
                        <span className="level-tag">LV6</span>
                      ) : (
                        <span className="level-tag level-member">LV4</span>
                      )}
                      <span>· {comment.time}</span>
                    </div>
                    <p className="comment-content">{comment.content}</p>
                    <div className="comment-footer">
                      <button
                        type="button"
                        className={`like-count${likedCommentKeys.has(`${comment.user}-${index}`) ? ' active' : ''}`}
                        onClick={() => toggleCommentLike(`${comment.user}-${index}`)}
                      >
                        <span aria-hidden="true">👍</span>
                        <span>{likeCountFor(comment, index)}</span>
                      </button>
                      <button type="button">
                        <span aria-hidden="true">💬</span>
                        <span>回复</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setReportTarget({
                            type: 'comment',
                            id: `static:${video.id}:${index}`,
                            label: `评论：${comment.user}`,
                          })
                        }
                      >
                        <span aria-hidden="true">↗</span>
                        <span>举报</span>
                      </button>
                    </div>
                    {comment.replyTo ? (
                      <div className="comment-sub">
                        <strong>{comment.replyTo}</strong>
                        <span>：{comment.replyContent}</span>
                      </div>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
            <div className="comment-login-hint">登录后即可参与评论，文明发言，拒绝引战。</div>
          </section>
        </section>

        <aside className="bili-side-rail">
          <section className="up-card">
            <div className="up-card-head">
              <div className="up-card-avatar" aria-hidden="true">{video.creator.slice(0, 1)}</div>
              <div className="up-card-meta">
                <div className="up-name">
                  <span>{video.creator}</span>
                  <span className="verified-tick" aria-hidden="true">✓</span>
                </div>
                <div className="up-summary">看见有意思的说出来，偶尔做有意思的事</div>
              </div>
            </div>
            <div className="up-card-stats">
              <div>
                <strong>1.8 万</strong>
                <span>关注</span>
              </div>
              <div>
                <strong>138.4 万</strong>
                <span>粉丝</span>
              </div>
              <div>
                <strong>428</strong>
                <span>投稿</span>
              </div>
            </div>
            <div className="up-card-actions">
              <button type="button" className="up-action charge">
                <span aria-hidden="true">⚡</span>
                充电
              </button>
              <button
                type="button"
                className={`up-action follow${followedCreators.includes(video.creator) ? ' active' : ''}`}
                onClick={() => toggleFollow(video.creator)}
              >
                {followedCreators.includes(video.creator) ? '已关注' : '+ 关注'}
              </button>
            </div>
          </section>

          <section className="danmaku-list-card">
            <div className="head">
              <h3>弹幕列表</h3>
              <label>
                <input
                  type="checkbox"
                  checked={isDanmakuEnabled}
                  onChange={(event) => setIsDanmakuEnabled(event.target.checked)}
                />
                <span className="toggle-track" />
                <span>开启弹幕</span>
              </label>
            </div>
            <div className="danmaku-rows">
              {filteredDanmakuList.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="danmaku-row"
                  onClick={() => seekToPercent(item.timestampPercent)}
                >
                  <span className="danmaku-time">{formatDanmakuTime(item.timestampPercent, playbackDurationLabel)}</span>
                  <span className="danmaku-text">{item.text}</span>
                  <span className="danmaku-color" style={{ background: item.color }} />
                </button>
              ))}
            </div>
            <button type="button" className="see-more">查看更多弹幕 →</button>
          </section>

          <section className="hot-list-card">
            <div className="head">
              <h3>大调查热点人物 <span style={{ color: '#8793a5', fontSize: '0.78rem', fontWeight: 500 }}>(1/1)</span></h3>
              <div className="hot-head-extra">
                <button type="button">+ 订阅合集</button>
              </div>
            </div>
            <div className="hot-list hot-list--stacked">
              {relatedVideos.map((item, index) => (
                <Link key={item.id} className="hot-item" to={`/video/${item.id}`}>
                  <div className="hot-thumbnail-row">
                    <div className="hot-cover" style={{ background: item.cover }}>
                      <span className="hot-duration">{item.duration}</span>
                    </div>
                    <div className="hot-info">
                      <span className="hot-title">{item.title}</span>
                      <div className="hot-stats">
                        <span>▲ {index % 2 === 0 ? '热榜 TOP' : `TOP ${index + 3}`}</span>
                        <span>{item.views} 播放</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="hot-list-card">
            <div className="head">
              <h3>接下来播放</h3>
              <span style={{ color: '#8793a5', fontSize: '0.78rem' }}>相关推荐</span>
            </div>
            <div className="hot-list hot-list--stacked">
              {videos
                .filter((item) => item.id !== video.id)
                .slice(0, 5)
                .map((item, index) => (
                  <Link key={item.id} className="hot-item" to={`/video/${item.id}`}>
                    <div className="hot-thumbnail-row">
                      <div className="hot-rank" style={{ alignSelf: 'center' }}>{index + 1}</div>
                      <div className="hot-info">
                        <span className="hot-title">{item.title}</span>
                        <div className="hot-stats">
                          <span>▲ {item.creator}</span>
                          <span>{item.views}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </section>
        </aside>
      </div>
      <ReportDialog
        targetType={reportTarget?.type ?? 'video'}
        targetId={reportTarget?.id ?? ''}
        targetLabel={reportTarget?.label}
        open={Boolean(reportTarget)}
        onClose={() => setReportTarget(null)}
      />
    </AppShell>
  )
}

function HeaderAuthAction() {
  const { user, logout, loading, isAdmin } = useAuth()

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
      <NotificationBell />
      <Link className="header-link" to="/account/reports" title="我的举报">
        我的举报
      </Link>
      {isAdmin ? (
        <Link className="header-link" to="/admin/cases" title="审核后台">
          审核后台
        </Link>
      ) : null}
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
    { label: '创作中心', to: '/creator/dashboard' },
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

    if (to === '/rank' || to === '/communities' || to === '/ip-studio') {
      return location.pathname === to
    }

    if (to === '/cocreate') {
      return location.pathname === '/cocreate' || location.pathname.startsWith('/cocreate/') || location.pathname.startsWith('/crowdfund')
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
              placeholder="搜索视频、番剧或 UP 主"
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
