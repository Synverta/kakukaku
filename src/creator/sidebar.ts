// 创作中心侧边栏导航配置
// 与 src/creator/CreatorShell.tsx 一起使用

export type NavGroup = {
  label: string
  items: NavItem[]
}

export type NavItem = {
  label: string
  path: string
  icon?: string
  description?: string
  matchPaths?: string[] // 用于高亮的额外路径(嵌套子页)
}

export const creatorNav: NavGroup[] = [
  {
    label: '数据与运营',
    items: [
      { label: '概览', path: '/creator/dashboard', icon: '◎' },
      { label: '数据中心', path: '/creator/analytics', icon: '◇' },
    ],
  },
  {
    label: '内容管理',
    items: [
      { label: '视频管理', path: '/creator/works', icon: '▸' },
      { label: '图文', path: '/creator/content/article', icon: '✎' },
      { label: '互动视频', path: '/creator/content/interactive', icon: '↔' },
      { label: '音频', path: '/creator/content/audio', icon: '♪' },
      { label: '贴纸', path: '/creator/content/sticker', icon: '✦' },
      { label: '视频素材', path: '/creator/content/material', icon: '◫' },
    ],
  },
  {
    label: '互动',
    items: [
      { label: '评论管理', path: '/creator/interactions/comments', icon: '◌' },
      { label: '弹幕管理', path: '/creator/interactions/danmaku', icon: '☰' },
    ],
  },
  {
    label: '粉丝与收益',
    items: [
      { label: '粉丝管理', path: '/creator/fans', icon: '♡' },
      { label: '收益管理', path: '/creator/revenue', icon: '¥' },
    ],
  },
  {
    label: '创作成长',
    items: [
      { label: '任务中心', path: '/creator/growth/missions', icon: '✓' },
      { label: '必火推广', path: '/creator/growth/promote', icon: '↗' },
      { label: '创作学院', path: '/creator/growth/academy', icon: '✦' },
    ],
  },
  {
    label: '创作者权益',
    items: [
      { label: '权益中心', path: '/creator/rights', icon: '✪' },
    ],
  },
  {
    label: '工具',
    items: [
      { label: '花生', path: '/creator/peanut', icon: '✿' },
      { label: 'updream', path: '/creator/updream', icon: '☁' },
    ],
  },
]
