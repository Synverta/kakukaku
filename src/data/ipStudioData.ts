export type IpAuthorRole = 'creator' | 'user' | 'mod'

export type IpAuthor = {
  id: string
  name: string
  role: IpAuthorRole
  bio: string
  followers: string
  videos?: number
  avatarSeed: string
  isVerified?: boolean
}

export type IpThreadCategory =
  | '剧本讨论'
  | '角色设计'
  | '镜头语言'
  | '音乐与音效'
  | '工具评测'
  | '行业观察'
  | '灵感征集'

export type IpThread = {
  id: string
  title: string
  excerpt: string
  content: string
  category: IpThreadCategory
  authorId: string
  createdAt: string
  views: string
  replies: number
  likes: number
  pinned?: boolean
  highlighted?: boolean
  tags: string[]
  lastReplyAt: string
  lastReplyAuthorId: string
}

export const ipAuthors: IpAuthor[] = [
  {
    id: 'creator-zhipian',
    name: '纸片城建局',
    role: 'creator',
    bio: '用连续镜头构建虚构城市，关心镜头节奏与空间关系。',
    followers: '138.4 万',
    videos: 42,
    avatarSeed: 'ZP',
    isVerified: true,
  },
  {
    id: 'creator-jiaoyu',
    name: '镜头语法手册',
    role: 'creator',
    bio: '拆解电影语言里的可执行清单，专注调度与构图。',
    followers: '62.8 万',
    videos: 28,
    avatarSeed: 'JT',
    isVerified: true,
  },
  {
    id: 'creator-zaoyin',
    name: '噪音研究所',
    role: 'creator',
    bio: '把机器震动、电机噪声变成可听的节奏层。',
    followers: '47.2 万',
    videos: 19,
    avatarSeed: 'ZY',
    isVerified: true,
  },
  {
    id: 'user-feichuan',
    name: '会飞的草稿纸',
    role: 'user',
    bio: '独立动画作者，最近在尝试用 procedural 生成角色。',
    followers: '342',
    avatarSeed: 'FC',
  },
  {
    id: 'user-bianxing',
    name: '南极风味汽水',
    role: 'user',
    bio: '影像爱好者，看完片总想写两句镜头分析。',
    followers: '186',
    avatarSeed: 'NJ',
  },
  {
    id: 'user-mod',
    name: '小卡值班',
    role: 'mod',
    bio: '社区运营，整理精华帖与周话题。',
    followers: '—',
    avatarSeed: 'XK',
  },
]

export const ipThreads: IpThread[] = [
  {
    id: 'thread-001',
    title: '一条长镜头塞下整座城，我是如何压住节奏的',
    excerpt: '上次发了《未来都市漫游》，不少朋友问起镜头推进和剪辑的取舍。开帖聊一下从分镜草稿到最终成片的过程……',
    content:
      '开篇先把节奏卡在 18 秒，每 6 秒一组对照镜头；中段进入高架桥时用一组长焦跟拍压缩时间；结尾的城市俯瞰交给自动云台。整体上我让镜头尽可能保持连续运动，但允许在 3 个固定转场点切硬切。',
    category: '镜头语言',
    authorId: 'creator-zhipian',
    createdAt: '2 小时前',
    views: '1.2 万',
    replies: 87,
    likes: 642,
    pinned: true,
    highlighted: true,
    tags: ['长镜头', '城市动画', '调度'],
    lastReplyAt: '5 分钟前',
    lastReplyAuthorId: 'user-bianxing',
  },
  {
    id: 'thread-002',
    title: '想听大家聊聊剧本的"前 30 秒"到底怎么写',
    excerpt: '短片的前 30 秒太重要了，我自己总是写得很满。这次想征集一下大家的实战方法……',
    content:
      '我习惯把前 30 秒拆成"钩子—冲突—预告"三段，每段不超过 10 秒。钩子一般用一个反常识的画面开场，冲突是交代人物关系，预告是给出本片的最大疑问。',
    category: '剧本讨论',
    authorId: 'creator-jiaoyu',
    createdAt: '昨天 21:14',
    views: '8,432',
    replies: 54,
    likes: 318,
    highlighted: true,
    tags: ['剧本', '前 30 秒', '短片'],
    lastReplyAt: '12 分钟前',
    lastReplyAuthorId: 'user-feichuan',
  },
  {
    id: 'thread-003',
    title: '打印机合唱团幕后：把电机噪声变鼓点的实验记录',
    excerpt: '从最初发现打印头频率能映射音高，到后来用步进电机做底鼓。这条路走了三个月，整理一下踩过的坑……',
    content:
      '第一阶段只调音高，第二阶段开始引入节拍触发，第三阶段才加入人声合声。最难的是同步，所有打印机必须在同一个时钟源上对齐，否则听起来就是一锅粥。',
    category: '音乐与音效',
    authorId: 'creator-zaoyin',
    createdAt: '3 天前',
    views: '5,621',
    replies: 42,
    likes: 256,
    tags: ['硬件音乐', '步进电机', '翻奏'],
    lastReplyAt: '1 小时前',
    lastReplyAuthorId: 'creator-jiaoyu',
  },
  {
    id: 'thread-004',
    title: '征集：你想看哪个"实验室系列"主题？',
    excerpt: '实验厨房这个系列已经做了 8 期，想听听大家下一期最想看什么主题。呼声最高的会做出来……',
    content:
      '目前备选：分子料理的失败合集、便利店冷食改造、夜市烧烤的科学化。最后一个我个人最想做，但担心观众少。大家投个票？',
    category: '灵感征集',
    authorId: 'creator-zaoyin',
    createdAt: '5 小时前',
    views: '3,108',
    replies: 96,
    likes: 412,
    tags: ['实验厨房', '投票', '征集'],
    lastReplyAt: '20 分钟前',
    lastReplyAuthorId: 'user-feichuan',
  },
  {
    id: 'thread-005',
    title: 'Midjourney V6 vs Stable Diffusion XL：实际项目里的差距',
    excerpt: '用同一组 prompt 在两个平台跑了一周，把可控性、角色一致性和后期工作量对比了一下。结论可能和很多人想的不一样……',
    content:
      'Midjourney 在氛围感上更省事，但角色一致性差，需要大量 inpaint。SDXL 配合 ControlNet 可以做到很精确，但学习曲线明显更陡。建议创作者看场景选择，没有绝对好坏。',
    category: '工具评测',
    authorId: 'user-bianxing',
    createdAt: '昨天 14:08',
    views: '6,720',
    replies: 73,
    likes: 388,
    tags: ['AI 绘画', 'MJ', 'SDXL'],
    lastReplyAt: '2 小时前',
    lastReplyAuthorId: 'creator-zhipian',
  },
  {
    id: 'thread-006',
    title: '为什么这两年国产动画的群像戏突然变好了？',
    excerpt: '结合最近追的几部片子，想聊聊行业里群像戏处理的变化。不是单纯夸，而是想拆解一下原因……',
    content:
      '我观察到的几个变量：制作流程标准化、年轻导演集体上岗、海外团队回流。但最关键的可能还是平台愿意给中长篇动画留出空间了。',
    category: '行业观察',
    authorId: 'user-bianxing',
    createdAt: '2 天前',
    views: '4,205',
    replies: 38,
    likes: 224,
    tags: ['国产动画', '群像戏', '行业'],
    lastReplyAt: '3 小时前',
    lastReplyAuthorId: 'user-feichuan',
  },
  {
    id: 'thread-007',
    title: '角色立绘：怎么用最少的笔触表达情绪？',
    excerpt: '在做的项目里有个角色只有 5 帧的镜头，但需要在一秒内从平静过渡到崩溃。求大家的速写方法……',
    content:
      '我自己常用三个原则：眼距拉开、嘴部夸大、肩膀前倾。这三个改完基本能覆盖 80% 的情绪表达。',
    category: '角色设计',
    authorId: 'user-feichuan',
    createdAt: '4 天前',
    views: '2,941',
    replies: 28,
    likes: 152,
    tags: ['角色设计', '立绘', '情绪'],
    lastReplyAt: '昨天 22:15',
    lastReplyAuthorId: 'creator-zhipian',
  },
  {
    id: 'thread-008',
    title: '【精华】镜头语法手册：场景里的视觉权重分配',
    excerpt: '把之前专栏里聊过的视觉权重方法整理成一份 7 步清单。配合《迷魂记》《鸟人》等案例……',
    content:
      '1. 先确定主体位置；2. 用光线划分主次；3. 用前景遮挡强化层次；4. 用色温区分时空；5. 用运动方向引导视线；6. 用留白制造呼吸感；7. 最后一帧回看是否统一。',
    category: '镜头语言',
    authorId: 'creator-jiaoyu',
    createdAt: '1 周前',
    views: '15,420',
    replies: 124,
    likes: 882,
    pinned: true,
    tags: ['精华', '视觉权重', '镜头'],
    lastReplyAt: '5 小时前',
    lastReplyAuthorId: 'user-bianxing',
  },
]

export const ipCategories: { id: 'all' | IpThreadCategory; label: string }[] = [
  { id: 'all', label: '全部话题' },
  { id: '剧本讨论', label: '剧本讨论' },
  { id: '角色设计', label: '角色设计' },
  { id: '镜头语言', label: '镜头语言' },
  { id: '音乐与音效', label: '音乐与音效' },
  { id: '工具评测', label: '工具评测' },
  { id: '行业观察', label: '行业观察' },
  { id: '灵感征集', label: '灵感征集' },
]

export const ipWeeklyTopic = {
  title: '本周话题：你的第一支"被骂"的作品讲了什么',
  description: '邀请大家聊聊自己收到的最尖锐的一条批评，以及它有没有反过来帮到后续的创作。',
  endsAt: '本周日 24:00 截止',
  participants: 142,
}
