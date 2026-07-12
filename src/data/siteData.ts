export type Video = {
  id: string
  title: string
  creator: string
  views: string
  danmaku: string
  likes: string
  duration: string
  publishedAt: string
  category: string
  description: string
  tags: string[]
  cover: string
  videoSrc: string
  /** 第三方平台嵌入地址（YouTube/Bilibili 等），设置后优先用 iframe 播放，节省自有带宽 */
  embedUrl?: string
}

export type Spotlight = {
  name: string
  title: string
  summary: string
}

export type NavigationItem = {
  label: string
  to: string
}

export type ProfileStat = {
  label: string
  value: string
}

export type StudioCard = {
  title: string
  metric: string
  detail: string
}

export type UploadChecklistItem = {
  title: string
  detail: string
}

export type DanmakuSeed = {
  text: string
  track: number
  mode?: 'scroll' | 'top' | 'bottom'
  color?: string
  duration?: number
  delay?: number
}

export const navigationItems: NavigationItem[] = [
  { label: '首页', to: '/' },
  { label: '排行榜', to: '/rank' },
  { label: '共创', to: '/crowdfund' },
  { label: '社区', to: '/communities' },
]

export const categories = [
  { name: '为你推荐', accent: '#ff7a59' },
  { name: '热门', accent: '#ffb703' },
  { name: '动画', accent: '#4cc9f0' },
  { name: '音乐', accent: '#fb5607' },
  { name: '知识', accent: '#06d6a0' },
  { name: '科技', accent: '#5fa8d3' },
  { name: '舞蹈', accent: '#f15bb5' },
  { name: '鬼畜', accent: '#ff006e' },
  { name: '影视', accent: '#577590' },
  { name: '纪录片', accent: '#8338ec' },
]

export const videos: Video[] = [
  {
    id: 'future-city-loop',
    title: '未来都市漫游：一镜到底看完整座夜色赛博城',
    creator: '纸片城建局',
    views: '328.6万',
    danmaku: '4.8万',
    likes: '32.1万',
    duration: '12:46',
    publishedAt: '3 小时前',
    category: '动画',
    description:
      '从空中穿过旧工业港、广告塔群和轨道夜市，把城市的速度、灯光和人群密度压缩进一条连续镜头，整体节奏参考了大型番剧 OP 的推进方式。',
    tags: ['4K', '原创动画', '城市景观'],
    cover:
      'linear-gradient(135deg, rgba(255,122,89,0.95) 0%, rgba(255,196,140,0.95) 48%, rgba(34,39,58,0.9) 100%)',
    videoSrc: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
    embedUrl: 'https://www.youtube.com/embed/LXb3EKWsInQ',
  },
  {
    id: 'kitchen-lab-ramen',
    title: '实验厨房：把拉面做成分子料理到底能不能吃',
    creator: '有点野的主厨',
    views: '182.4万',
    danmaku: '2.3万',
    likes: '18.7万',
    duration: '08:15',
    publishedAt: '昨天',
    category: '知识',
    description:
      '用可食用凝胶、低温慢煮和烟熏泡沫重组一碗日常拉面，顺便解释每一步背后的口感逻辑和失败原因。',
    tags: ['料理', '实验', '美食'],
    cover:
      'linear-gradient(135deg, rgba(244,162,97,0.96) 0%, rgba(255,221,160,0.94) 45%, rgba(97,63,38,0.95) 100%)',
    videoSrc: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    embedUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
  },
  {
    id: 'mech-choir-remix',
    title: '机械合唱团：30 台打印机如何演奏交响版青鸟',
    creator: '噪音研究所',
    views: '264.9万',
    danmaku: '3.5万',
    likes: '25.6万',
    duration: '06:22',
    publishedAt: '2 天前',
    category: '音乐',
    description:
      '把打印头移动频率映射成旋律，底鼓由步进电机承担，最后再用一层人声把金属质感拉回到可听范围。',
    tags: ['混音', '硬件', '翻奏'],
    cover:
      'linear-gradient(135deg, rgba(251,86,7,0.94) 0%, rgba(255,190,92,0.92) 50%, rgba(37,41,61,0.95) 100%)',
    videoSrc: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    embedUrl: 'https://www.youtube.com/embed/1La4QzGeaaQ',
  },
  {
    id: 'retro-console-build',
    title: '复刻一台 90 年代掌机，从外壳到主板全部自己打样',
    creator: '硬核小作坊',
    views: '143.8万',
    danmaku: '1.7万',
    likes: '14.2万',
    duration: '15:30',
    publishedAt: '4 天前',
    category: '科技',
    description:
      '展示从工业设计草图、3D 打印外壳、PCB 走线到固件启动的完整链路，中间也保留了几次失败返工。',
    tags: ['DIY', '掌机', '硬件'],
    cover:
      'linear-gradient(135deg, rgba(76,201,240,0.96) 0%, rgba(171,240,255,0.93) 44%, rgba(22,54,92,0.96) 100%)',
    videoSrc: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    embedUrl: 'https://www.youtube.com/embed/REu2BcnlD34',
  },
  {
    id: 'street-dance-finals',
    title: '街舞总决赛现场直拍：最后 40 秒直接全场起立',
    creator: '地下热浪',
    views: '391.2万',
    danmaku: '5.2万',
    likes: '41.8万',
    duration: '04:58',
    publishedAt: '6 小时前',
    category: '舞蹈',
    description:
      '保留现场环境音与观众反应，镜头围绕主舞者旋转推进，重点突出临场爆发力和音乐停顿的配合。',
    tags: ['街舞', '现场', '比赛'],
    cover:
      'linear-gradient(135deg, rgba(239,71,111,0.95) 0%, rgba(255,168,133,0.94) 42%, rgba(68,15,39,0.96) 100%)',
    videoSrc: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    embedUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
  },
  {
    id: 'cinema-one-take',
    title: '电影镜头课：为什么这段长镜头能把紧张感拉满',
    creator: '镜头语法手册',
    views: '119.3万',
    danmaku: '1.2万',
    likes: '11.5万',
    duration: '10:11',
    publishedAt: '1 周前',
    category: '影视',
    description:
      '拆解经典长镜头在调度、光线和空间关系上的设计，把看起来流畅的一段镜头拆回成可执行的拍摄计划。',
    tags: ['电影', '解析', '导演'],
    cover:
      'linear-gradient(135deg, rgba(87,117,144,0.96) 0%, rgba(176,196,222,0.92) 48%, rgba(25,33,48,0.96) 100%)',
    videoSrc: 'https://storage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
    embedUrl: 'https://www.youtube.com/embed/aqz-KE-bpKQ',
  },
  {
    id: 'planet-documentary',
    title: '极地纪录片样片：凌晨三点的冰原到底有多安静',
    creator: '地表慢频道',
    views: '96.5万',
    danmaku: '8600',
    likes: '9.1万',
    duration: '09:44',
    publishedAt: '5 天前',
    category: '纪录片',
    description:
      '使用超长焦与环境录音记录冰原细节，重点保留低频风噪和脚踩积雪时的空间回响。',
    tags: ['自然', '4K', '纪录片'],
    cover:
      'linear-gradient(135deg, rgba(144,224,239,0.96) 0%, rgba(230,248,255,0.93) 44%, rgba(54,78,110,0.96) 100%)',
    videoSrc: 'https://storage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    embedUrl: 'https://www.youtube.com/embed/REu2BcnlD34',
  },
  {
    id: 'ghost-animal-mashup',
    title: '鬼畜改造：把动物世界配成热血运动番会怎样',
    creator: '剪辑过量供应',
    views: '215.7万',
    danmaku: '6.1万',
    likes: '20.4万',
    duration: '03:37',
    publishedAt: '8 小时前',
    category: '鬼畜',
    description:
      '高密度节奏剪辑配合夸张转场，把原本平静的自然纪录片重新塑造成比赛现场。',
    tags: ['鬼畜', '剪辑', '二创'],
    cover:
      'linear-gradient(135deg, rgba(131,56,236,0.96) 0%, rgba(255,119,199,0.94) 45%, rgba(28,18,65,0.96) 100%)',
    videoSrc: 'https://storage.googleapis.com/gtv-videos-bucket/sample/VolkswagenGTIReview.mp4',
    embedUrl: 'https://www.youtube.com/embed/1La4QzGeaaQ',
  },
]

export const spotlights: Spotlight[] = [
  {
    name: '新星 UP 主',
    title: '纸片城建局',
    summary: '用连续运动镜头拍虚构城市，擅长把建筑、交通和角色动线塞进同一条时间轴。',
  },
  {
    name: '本周专栏',
    title: '镜头语法手册',
    summary: '把电影语言拆成可练习的清单，适合想提升拍摄和剪辑表达的人。',
  },
  {
    name: '热门合集',
    title: '通宵追更榜',
    summary: '过去 24 小时内评论密度最高的一组内容，适合从第一页一路刷到凌晨。',
  },
]

export const comments = [
  {
    user: '会飞的草稿纸',
    time: '2 小时前',
    content: '这条长镜头的景别切换太丝滑了，像把整座城市都做成了一个镜头轨道。',
    role: 'member' as const,
  },
  {
    user: '番茄炒月亮',
    time: '1 小时前',
    content: '后半段进入高架桥那一段，弹幕密度直接起飞，适合循环三遍。',
    role: 'mod' as const,
    replyTo: '京圈最脏的',
    replyContent: '同意，这一组信息量确实很大，截图都存了。',
  },
  {
    user: '南极风味汽水',
    time: '38 分钟前',
    content: '希望之后能出幕后制作，看起来建模、灯光和调色都花了很多心思。',
    role: 'member' as const,
  },
  {
    user: '银河系装睡员',
    time: '刚刚',
    content: 'UP 主讲得很细，特别是聊到背景那一段，圈外人才看得懂。',
    role: 'creator' as const,
  },
  {
    user: '清蒸早起鸟',
    time: '5 分钟前',
    content: 'BGM 一响就想起被《走面儿》支配的恐惧，这次终于看明白了。',
    role: 'member' as const,
  },
  {
    user: '加班备忘录',
    time: '12 分钟前',
    content: '把圈子、家族、人情这几条线拆开讲，比单纯吃瓜信息量大多了。',
    role: 'member' as const,
  },
]

export const profileStats: ProfileStat[] = [
  { label: '粉丝', value: '128.4 万' },
  { label: '获赞', value: '842.7 万' },
  { label: '播放', value: '1.92 亿' },
  { label: '专栏', value: '36 篇' },
]

export const studioCards: StudioCard[] = [
  {
    title: '近 7 日播放趋势',
    metric: '+18.6%',
    detail: '新发布的城市动画和幕后拆解视频带动了首页推荐曝光。',
  },
  {
    title: '粉丝互动率',
    metric: '12.4%',
    detail: '评论和弹幕互动明显高于站内均值，适合继续做系列化更新。',
  },
  {
    title: '待发布草稿',
    metric: '3 条',
    detail: '其中 2 条已完成封面和简介，可直接进入投稿流程。',
  },
]

export const uploadChecklist: UploadChecklistItem[] = [
  {
    title: '封面和标题',
    detail: '保持强识别度，标题最好能在 24 个字内交代主题和亮点。',
  },
  {
    title: '简介和标签',
    detail: '简介前两行决定搜索和推荐抓取效果，标签建议覆盖题材、形式和核心梗。',
  },
  {
    title: '分区和版权声明',
    detail: '确认分区准确，并声明是否为原创、二创或转载内容。',
  },
]

export const danmakuSeedsByVideo: Record<string, DanmakuSeed[]> = {
  'future-city-loop': [
    { text: '这也太像追番首页了吧', track: 0, delay: 1 },
    { text: '前方高能镜头准备起飞', track: 1, color: '#ffe066', delay: 5 },
    { text: '质感已经接近正式产品 Demo 了', track: 2, color: '#ffffff', delay: 9 },
    { text: '这镜头完全可以放片头', track: 0, mode: 'top', color: '#f8f9fa', duration: 4, delay: 4 },
    { text: '这一段城市灯光层次很强', track: 3, color: '#bde0fe', delay: 3 },
  ],
  'kitchen-lab-ramen': [
    { text: '这个泡沫看起来就很危险', track: 0, color: '#fff1c1', delay: 2 },
    { text: '主厨已经开始整活了', track: 1, delay: 6 },
    { text: '分子料理失败合集预定', track: 2, color: '#ffd6a5', delay: 10 },
    { text: '这碗面建议先截图再下口', track: 0, mode: 'bottom', color: '#ffffff', duration: 4, delay: 7 },
  ],
  'mech-choir-remix': [
    { text: '打印机也能唱副歌', track: 0, color: '#caf0f8', delay: 2 },
    { text: '步进电机这个鼓点真上头', track: 1, delay: 7 },
    { text: '硬核音乐区报到', track: 2, color: '#ffffff', delay: 10 },
  ],
}
