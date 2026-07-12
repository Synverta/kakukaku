export type PerkTier = {
  id: string
  name: string
  tokens: number
  perks: string[]
  highlight?: boolean
}

export type Milestone = {
  label: string
  tokens: number
  status: 'done' | 'active' | 'upcoming'
}

export type TokenPlanItem = {
  label: string
  percent: number
}

export type Campaign = {
  id: string
  title: string
  creator: string
  creatorAvatar: string
  category: string
  summary: string
  cover: string
  goalTokens: number
  raisedTokens: number
  backers: number
  daysLeft: number
  tags: string[]
  description: string
  tokenPlan: TokenPlanItem[]
  perks: PerkTier[]
  milestones: Milestone[]
  costSavingPercent: number
}

export type IpTemplate = {
  id: string
  name: string
  style: string
  cover: string
  tags: string[]
  baselineTokens: number
  assets: Record<string, number>
}

export type AssetType = {
  id: string
  name: string
  unit: string
  tokenPerUnit: number
}

export type CrowdfundStat = {
  label: string
  value: string
  detail: string
}

export const assetTypes: AssetType[] = [
  { id: 'character', name: '角色设定集', unit: '套', tokenPerUnit: 120000 },
  { id: 'short', name: '短视频片段', unit: '条', tokenPerUnit: 25000 },
  { id: 'sticker', name: '表情包', unit: '套', tokenPerUnit: 8000 },
  { id: 'comic', name: '漫画分镜', unit: '页', tokenPerUnit: 15000 },
  { id: 'voice', name: '配音 / 语音', unit: '分钟', tokenPerUnit: 6000 },
  { id: 'background', name: '场景原画', unit: '张', tokenPerUnit: 18000 },
]

export const crowdfundStats: CrowdfundStat[] = [
  { label: '累计共创 Token 池', value: '8,640 万', detail: '来自 2.3 万次支持，直接进入 IP 孵化算力。' },
  { label: '平均打造成本下降', value: '38%', detail: '共享基座模型 + 批量推理带来的规模效应。' },
  { label: '已孵化 IP', value: '126 个', detail: '覆盖虚拟偶像、动画、互动剧与音乐陪伴。' },
  { label: '参与创作者', value: '2,300+', detail: '新手与成熟团队都能发起自己的 IP 计划。' },
]

export const howItWorks = [
  {
    step: '01',
    title: '创作人发起 IP 计划',
    detail: '用 IP 工坊把灵感拆成可量化的 token 预算，设定目标与回报档位。',
  },
  {
    step: '02',
    title: '粉丝共创 Token',
    detail: '支持者用 token 认领共创权益，越早期支持，越能影响角色与剧情走向。',
  },
  {
    step: '03',
    title: '平台批量生成降成本',
    detail: '共创资金汇入共享算力池，批量推理与共享素材让单次生成成本显著下降。',
  },
  {
    step: '04',
    title: 'IP 成型并共享收益',
    detail: '成片、角色与衍生内容上线，出品人与共创官按档位共享 IP 收益。',
  },
]

export const costSavingReasons = [
  {
    title: '共享基座模型',
    detail: '同一画风 / 同一世界观下的多个 IP 复用微调基座，省去从零训练的大头开销。',
  },
  {
    title: '批量推理调度',
    detail: '把零散的立绘、分镜、短视频请求合并成批次，单位 token 单价随规模下降。',
  },
  {
    title: '社区素材库',
    detail: '已授权的角色部件、场景与音色进入公共库，后续 IP 可直接调用，避免重复生成。',
  },
]

export const campaigns: Campaign[] = [
  {
    id: 'neon-cat-idol',
    title: '喵电波 · 赛博猫娘偶像企划',
    creator: '像素电波',
    creatorAvatar: '像',
    category: '虚拟偶像',
    summary: '一只住在霓虹数据港的猫娘偶像，用共创 token 完成 Live2D 形象、首支 PV 与专属语音。',
    cover: 'linear-gradient(135deg, rgba(241,71,111,0.95) 0%, rgba(255,168,133,0.92) 46%, rgba(28,18,65,0.96) 100%)',
    goalTokens: 3000000,
    raisedTokens: 2140000,
    backers: 1280,
    daysLeft: 12,
    tags: ['虚拟偶像', 'Live2D', '音乐'],
    description:
      '“喵电波”是一个面向 Z 世代的赛博猫娘偶像 IP。我们希望用共创到的 token 完成角色基座模型微调、一套可动的 Live2D 形象、首支 PV 与可商用的专属语音。越早期的 supporters 越能参与猫娘的性格设定、代表色与出道单曲的投票。',
    tokenPlan: [
      { label: '角色基座模型微调', percent: 35 },
      { label: '立绘与表情包', percent: 25 },
      { label: '短视频 / PV', percent: 20 },
      { label: '语音合成', percent: 12 },
      { label: '社区共创素材', percent: 8 },
    ],
    perks: [
      {
        id: 'tier-1',
        name: '抢先体验官',
        tokens: 1000,
        perks: ['抢先看到角色早期形象', '片尾鸣谢名单', '专属共创者徽章'],
      },
      {
        id: 'tier-2',
        name: '设定共创官',
        tokens: 6000,
        perks: ['投票决定猫娘性格与代表色', '专属表情包一套', '出道单曲试听提前 7 天'],
        highlight: true,
      },
      {
        id: 'tier-3',
        name: 'IP 联名伙伴',
        tokens: 20000,
        perks: ['名字进入 PV 片尾', '定制专属角色形象', '季度共创直播席位'],
      },
      {
        id: 'tier-4',
        name: '出品人',
        tokens: 60000,
        perks: ['IP 衍生收益分成权', '线下见面会名额', '角色设定文档共创署名'],
      },
    ],
    milestones: [
      { label: '概念设定与世界观', tokens: 400000, status: 'done' },
      { label: '基座模型微调', tokens: 1500000, status: 'active' },
      { label: '首支 PV 与 Live2D', tokens: 2400000, status: 'upcoming' },
      { label: '出道直播首秀', tokens: 3000000, status: 'upcoming' },
    ],
    costSavingPercent: 41,
  },
  {
    id: 'healing-village',
    title: '云栖小馆 · 治愈系村庄',
    creator: '慢炖工作室',
    creatorAvatar: '慢',
    category: '动画',
    summary: '一家开在云上的小馆，用共创 token 把治愈系村庄做成短片系列与可互动场景。',
    cover: 'linear-gradient(135deg, rgba(6,214,160,0.95) 0%, rgba(171,240,200,0.92) 46%, rgba(22,54,92,0.96) 100%)',
    goalTokens: 2400000,
    raisedTokens: 1980000,
    backers: 940,
    daysLeft: 6,
    tags: ['治愈', '动画', '陪伴'],
    description:
      '“云栖小馆”是一个慢节奏治愈 IP：一家只有云朵客人的小馆，每集讲一个被生活压垮的客人如何被一顿饭治愈。共创 token 将用于短片系列、可互动 3D 场景与一套温暖的角色表情。',
    tokenPlan: [
      { label: '短片系列生成', percent: 40 },
      { label: '角色与场景原画', percent: 28 },
      { label: '互动场景建模', percent: 20 },
      { label: '社区共创素材', percent: 12 },
    ],
    perks: [
      {
        id: 'tier-1',
        name: '路边食客',
        tokens: 800,
        perks: ['抢先观看每集短片', '专属“云朵客人”徽章'],
      },
      {
        id: 'tier-2',
        name: '常驻座上宾',
        tokens: 5000,
        perks: ['为你定制一道“治愈料理”', '角色表情包一套', '片尾鸣谢'],
        highlight: true,
      },
      {
        id: 'tier-3',
        name: '小馆合伙人',
        tokens: 18000,
        perks: ['投票决定下一季主题', '你的名字进入世界观设定集', '互动场景内专属座位'],
      },
    ],
    milestones: [
      { label: '世界观与小馆视觉', tokens: 300000, status: 'done' },
      { label: '前 3 集短片', tokens: 1400000, status: 'active' },
      { label: '互动场景上线', tokens: 2000000, status: 'upcoming' },
      { label: '第二季立项', tokens: 2400000, status: 'upcoming' },
    ],
    costSavingPercent: 36,
  },
  {
    id: 'detective-noir',
    title: '雾港档案 · 互动悬疑',
    creator: '黑键推理',
    creatorAvatar: '黑',
    category: '互动剧',
    summary: '一座终年起雾的港口城市，用共创 token 做成可分支选择的互动推理剧。',
    cover: 'linear-gradient(135deg, rgba(87,117,144,0.96) 0%, rgba(176,196,222,0.92) 46%, rgba(25,33,48,0.96) 100%)',
    goalTokens: 4200000,
    raisedTokens: 880000,
    backers: 410,
    daysLeft: 21,
    tags: ['悬疑', '互动剧', '剧情'],
    description:
      '“雾港档案”是一部可分支选择的互动推理 IP。每一集都提供多个调查方向，观众的选择会改变真相。共创 token 用于剧本大模型微调、分镜与多结局短视频生成，以及一套雾港城市音色。',
    tokenPlan: [
      { label: '剧本与分支大模型', percent: 38 },
      { label: '分镜与短视频', percent: 30 },
      { label: '城市原画与音色', percent: 22 },
      { label: '社区共创素材', percent: 10 },
    ],
    perks: [
      {
        id: 'tier-1',
        name: '旁听侦探',
        tokens: 1200,
        perks: ['抢先体验互动分支', '“雾港市民”徽章'],
      },
      {
        id: 'tier-2',
        name: '线索合伙人',
        tokens: 8000,
        perks: ['投票决定一条支线剧情', '专属角色头像', '剧透豁免权'],
        highlight: true,
      },
      {
        id: 'tier-3',
        name: '档案出品人',
        tokens: 30000,
        perks: ['以 NPC 身份进入剧情', 'IP 衍生收益分成', '主创线上复盘会'],
      },
    ],
    milestones: [
      { label: '核心谜案与世界观', tokens: 600000, status: 'active' },
      { label: '前 2 集互动分支', tokens: 2400000, status: 'upcoming' },
      { label: '多结局生成', tokens: 3600000, status: 'upcoming' },
      { label: '全季上线', tokens: 4200000, status: 'upcoming' },
    ],
    costSavingPercent: 44,
  },
  {
    id: 'guofeng-xianxia',
    title: '山海拾遗 · 国风仙侠',
    creator: '青简动画',
    creatorAvatar: '青',
    category: '动画',
    summary: '从《山海经》里拾取妖兽与仙人，用共创 token 做成国风动画短片合集。',
    cover: 'linear-gradient(135deg, rgba(131,56,236,0.95) 0%, rgba(255,119,199,0.9) 46%, rgba(28,18,65,0.96) 100%)',
    goalTokens: 5000000,
    raisedTokens: 3600000,
    backers: 2100,
    daysLeft: 9,
    tags: ['国风', '仙侠', '动画'],
    description:
      '“山海拾遗”把《山海经》里的妖兽与仙人重新讲成现代国风短片。共创 token 用于国风基座模型微调、角色设定集、短片与一套可商用国风音色，让小团队也能做出电影感画面。',
    tokenPlan: [
      { label: '国风基座模型微调', percent: 34 },
      { label: '角色设定集与原画', percent: 26 },
      { label: '短片生成', percent: 26 },
      { label: '国风音色合成', percent: 14 },
    ],
    perks: [
      {
        id: 'tier-1',
        name: '拾遗旅人',
        tokens: 1000,
        perks: ['抢先观看每支短片', '国风徽章'],
      },
      {
        id: 'tier-2',
        name: '山海绘卷客',
        tokens: 7000,
        perks: ['投票选定下一支妖兽', '专属设定壁纸', '片尾鸣谢'],
        highlight: true,
      },
      {
        id: 'tier-3',
        name: '仙盟长老',
        tokens: 25000,
        perks: ['定制专属妖兽形象', '设定集共创署名', '线下展映名额'],
      },
    ],
    milestones: [
      { label: '妖兽图鉴与画风', tokens: 500000, status: 'done' },
      { label: '基座模型微调', tokens: 2500000, status: 'active' },
      { label: '前 4 支短片', tokens: 4000000, status: 'upcoming' },
      { label: '全季与设定集', tokens: 5000000, status: 'upcoming' },
    ],
    costSavingPercent: 39,
  },
  {
    id: 'mecha-pet',
    title: '齿轮小狗 · 机甲萌宠',
    creator: '硬核小作坊',
    creatorAvatar: '硬',
    category: '玩具 / 短片',
    summary: '一只用废零件拼出来的机甲小狗，用共创 token 做成短片与可打印 3D 模型。',
    cover: 'linear-gradient(135deg, rgba(76,201,240,0.96) 0%, rgba(171,240,255,0.92) 46%, rgba(22,54,92,0.96) 100%)',
    goalTokens: 1800000,
    raisedTokens: 1720000,
    backers: 760,
    daysLeft: 3,
    tags: ['机甲', '萌宠', '3D'],
    description:
      '“齿轮小狗”是一只由废零件拼装的机甲萌宠，既有短片也有可打印的 3D 模型。共创 token 用于角色设定、短片、表情包与一份开源 3D 打印文件，让粉丝也能在家拼出自己的小狗。',
    tokenPlan: [
      { label: '角色设定与短片', percent: 42 },
      { label: '表情包与贴纸', percent: 22 },
      { label: '3D 模型与图纸', percent: 26 },
      { label: '社区共创素材', percent: 10 },
    ],
    perks: [
      {
        id: 'tier-1',
        name: '零件收藏家',
        tokens: 600,
        perks: ['抢先观看短片', '小狗徽章'],
      },
      {
        id: 'tier-2',
        name: '拼装合伙人',
        tokens: 4000,
        perks: ['开源 3D 打印文件', '专属配色方案', '片尾鸣谢'],
        highlight: true,
      },
      {
        id: 'tier-3',
        name: '机甲出品人',
        tokens: 15000,
        perks: ['定制专属小狗形态', '线下拼装活动', '周边分成权'],
      },
    ],
    milestones: [
      { label: '角色与短片', tokens: 300000, status: 'done' },
      { label: '3D 图纸开源', tokens: 1200000, status: 'active' },
      { label: '配色扩展包', tokens: 1600000, status: 'upcoming' },
      { label: '线下活动', tokens: 1800000, status: 'upcoming' },
    ],
    costSavingPercent: 33,
  },
  {
    id: 'lofi-ghost',
    title: '晚安电台 · 治愈幽灵',
    creator: '耳机公园',
    creatorAvatar: '耳',
    category: '音乐 / 陪伴',
    summary: '一只只在深夜出现的幽灵 DJ，用共创 token 做成 Lo-fi 陪伴电台与专属音色。',
    cover: 'linear-gradient(135deg, rgba(128,237,153,0.94) 0%, rgba(56,176,0,0.9) 46%, rgba(20,40,30,0.96) 100%)',
    goalTokens: 1500000,
    raisedTokens: 640000,
    backers: 320,
    daysLeft: 18,
    tags: ['Lo-fi', '音乐', '陪伴'],
    description:
      '“晚安电台”是一只只在深夜出现的幽灵 DJ，用 Lo-fi 节拍陪你入睡。共创 token 用于专属音色合成、每周更新的陪伴短片与一套助眠视觉，让一个人睡也不孤单。',
    tokenPlan: [
      { label: '专属音色合成', percent: 36 },
      { label: '陪伴短片生成', percent: 32 },
      { label: '助眠视觉原画', percent: 22 },
      { label: '社区共创素材', percent: 10 },
    ],
    perks: [
      {
        id: 'tier-1',
        name: '夜班听众',
        tokens: 500,
        perks: ['抢先收听新单', '幽灵徽章'],
      },
      {
        id: 'tier-2',
        name: '电台搭档',
        tokens: 3500,
        perks: ['点歌与命名一首 Loop', '专属助眠壁纸', '片尾鸣谢'],
        highlight: true,
      },
      {
        id: 'tier-3',
        name: '深夜出品人',
        tokens: 12000,
        perks: ['定制专属晚安语音', '电台收益分成', '主理人线上夜聊'],
      },
    ],
    milestones: [
      { label: '音色与视觉基调', tokens: 200000, status: 'active' },
      { label: '前 8 期电台', tokens: 900000, status: 'upcoming' },
      { label: '陪伴短片系列', tokens: 1300000, status: 'upcoming' },
      { label: '常驻栏目化', tokens: 1500000, status: 'upcoming' },
    ],
    costSavingPercent: 47,
  },
]

export const ipTemplates: IpTemplate[] = [
  {
    id: 'neon-cat',
    name: '赛博猫娘',
    style: '霓虹 / 数据港',
    cover: 'linear-gradient(135deg, rgba(241,71,111,0.95) 0%, rgba(255,168,133,0.92) 46%, rgba(28,18,65,0.96) 100%)',
    tags: ['虚拟偶像', 'Live2D', '音乐'],
    baselineTokens: 980000,
    assets: { character: 1, short: 4, sticker: 1, comic: 6, voice: 3, background: 3 },
  },
  {
    id: 'healing-village',
    name: '治愈村庄',
    style: '暖色 / 慢节奏',
    cover: 'linear-gradient(135deg, rgba(6,214,160,0.95) 0%, rgba(171,240,200,0.92) 46%, rgba(22,54,92,0.96) 100%)',
    tags: ['治愈', '动画', '陪伴'],
    baselineTokens: 720000,
    assets: { character: 1, short: 6, sticker: 1, comic: 8, voice: 2, background: 4 },
  },
  {
    id: 'detective-noir',
    name: '悬疑侦探',
    style: '冷调 / 雾港',
    cover: 'linear-gradient(135deg, rgba(87,117,144,0.96) 0%, rgba(176,196,222,0.92) 46%, rgba(25,33,48,0.96) 100%)',
    tags: ['悬疑', '互动剧', '剧情'],
    baselineTokens: 1240000,
    assets: { character: 1, short: 5, sticker: 1, comic: 10, voice: 4, background: 5 },
  },
  {
    id: 'guofeng-xianxia',
    name: '国风仙侠',
    style: '水墨 / 仙气',
    cover: 'linear-gradient(135deg, rgba(131,56,236,0.95) 0%, rgba(255,119,199,0.9) 46%, rgba(28,18,65,0.96) 100%)',
    tags: ['国风', '仙侠', '动画'],
    baselineTokens: 1480000,
    assets: { character: 1, short: 4, sticker: 1, comic: 8, voice: 3, background: 5 },
  },
  {
    id: 'mecha-pet',
    name: '机甲萌宠',
    style: '金属 / 拼装',
    cover: 'linear-gradient(135deg, rgba(76,201,240,0.96) 0%, rgba(171,240,255,0.92) 46%, rgba(22,54,92,0.96) 100%)',
    tags: ['机甲', '萌宠', '3D'],
    baselineTokens: 560000,
    assets: { character: 1, short: 5, sticker: 2, comic: 6, voice: 2, background: 3 },
  },
  {
    id: 'lofi-ghost',
    name: '像素精灵',
    style: '复古 / 低饱和',
    cover: 'linear-gradient(135deg, rgba(128,237,153,0.94) 0%, rgba(56,176,0,0.9) 46%, rgba(20,40,30,0.96) 100%)',
    tags: ['像素', '游戏', '怀旧'],
    baselineTokens: 480000,
    assets: { character: 1, short: 4, sticker: 2, comic: 5, voice: 2, background: 3 },
  },
]

export function formatTokens(value: number): string {
  if (value >= 10000) {
    const wan = value / 10000
    const text = wan >= 100 ? Math.round(wan).toString() : wan.toFixed(1).replace(/\.0$/, '')

    return `${text} 万`
  }

  return value.toLocaleString('zh-CN')
}
