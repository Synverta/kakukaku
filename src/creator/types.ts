// 创作中心共用的数据类型
// 与 server/src/routes/videos.ts 中的 CreatorVideo 保持一致

export type VideoStatus = 'draft' | 'pending' | 'published' | 'rejected'

export type ContentType = 'video' | 'article' | 'interactive' | 'audio' | 'sticker' | 'material'

export type CreatorVideo = {
  id: number
  title: string
  description: string
  category: string
  tags: string[]
  cover: string
  videoSrc: string
  embedUrl: string
  duration: string
  status: VideoStatus
  views: number
  likes: number
  danmakuCount: number
  rejectReason: string | null
  scheduledAt: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  contentType?: ContentType
  pinned?: boolean
}

export type CommentStatus = 'visible' | 'hidden' | 'pinned'

export type CreatorComment = {
  id: number
  videoId: number
  videoTitle: string
  authorName: string
  avatarLetter: string
  content: string
  status: CommentStatus
  createdAt: string
}

export type CreatorDanmaku = {
  id: number
  videoId: number
  videoTitle: string
  authorName: string
  text: string
  mode: 'scroll' | 'top' | 'bottom'
  color: string
  timeSeconds: number
  hidden: boolean
  createdAt: string
}

export type CreatorFan = {
  id: number
  username: string
  avatarLetter: string
  followedAt: string
  lastActiveAt: string | null
  engagement: {
    views: number
    likes: number
    danmaku: number
    comments: number
  }
}

export type RevenueSource = 'views' | 'charging' | 'brand' | 'activity'

export type RevenueEntry = {
  id: number
  source: RevenueSource
  amountCents: number
  memo: string
  occurredOn: string
  createdAt: string
}

export type RevenueSummary = {
  totalCents: number
  prevCents: number
  currency: 'CNY'
  bySource: { source: RevenueSource; label: string; amountCents: number; percent: number }[]
  trend: { date: string; amountCents: number }[]
  entries: RevenueEntry[]
}

export type MissionStatus = 'active' | 'done' | 'claimed'

export type CreatorMission = {
  id: number
  code: string
  title: string
  rewardText: string
  progress: number
  target: number
  status: MissionStatus
  expiresAt: string | null
}

export type CreatorRight = {
  id: number
  code: string
  title: string
  detail: string
  enabled: boolean
  grantedAt: string
}

export type DashboardStats = {
  totalVideos: number
  totalViews: number
  totalLikes: number
  totalDanmaku: number
  followerCount: number
  delta7dViews: number
  delta7dFollowers: number
  pendingComments: number
  draftCount: number
  pendingVideoCount: number
  scheduledVideoCount: number
}

export type DashboardData = {
  stats: DashboardStats
  recentVideos: CreatorVideo[]
}

export type StatsRange = '7d' | '30d' | '90d'

export type StatsPoint = { date: string; views: number; likes: number; danmaku: number; comments: number }

export type StatsData = {
  range: StatsRange
  totalViews: number
  totalLikes: number
  totalDanmaku: number
  totalComments: number
  series: StatsPoint[]
  topVideos: { id: number; title: string; views: number; likes: number; danmaku: number; comments: number }[]
  trafficSources: { source: string; percent: number }[]
}

export const VIDEO_STATUS_LABELS: Record<VideoStatus, string> = {
  draft: '草稿',
  pending: '审核中',
  published: '已发布',
  rejected: '未通过',
}

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: '视频',
  article: '图文',
  interactive: '互动视频',
  audio: '音频',
  sticker: '贴纸',
  material: '视频素材',
}

export const COMMENT_STATUS_LABELS: Record<CommentStatus, string> = {
  visible: '展示中',
  hidden: '已隐藏',
  pinned: '已置顶',
}

export const REVENUE_SOURCE_LABELS: Record<RevenueSource, string> = {
  views: '创作激励',
  charging: '用户充电',
  brand: '商单合作',
  activity: '活动奖励',
}
