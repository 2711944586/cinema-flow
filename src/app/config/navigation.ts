export interface AppNavItem {
  label: string;
  route: string;
  icon: string;
  description: string;
  exact?: boolean;
}

export const CORE_NAV_ITEMS: AppNavItem[] = [
  {
    label: '仪表盘',
    route: '/dashboard',
    icon: 'insights',
    description: '总览片库状态、快速入口与最近浏览',
    exact: true
  },
  {
    label: '电影库',
    route: '/movies',
    icon: 'movie',
    description: '按标题、导演、评分与状态管理整套片库',
    exact: false
  },
  {
    label: '导演库',
    route: '/directors',
    icon: 'movie_creation',
    description: '导演实体库、作品关联与跨实体导航',
    exact: false
  },
  {
    label: '探索影库',
    route: '/explore',
    icon: 'explore',
    description: '沉浸式浏览电影与主视觉探索',
    exact: true
  },
  {
    label: '收藏中心',
    route: '/favorites',
    icon: 'favorite',
    description: '收藏中心与已观影片回看',
    exact: true
  },
  {
    label: '关于',
    route: '/about',
    icon: 'info',
    description: '系统状态、技术栈与数据管理',
    exact: true
  }
];

export const ENHANCEMENT_NAV_ITEMS: AppNavItem[] = [
  {
    label: '时间线',
    route: '/timeline',
    icon: 'timeline',
    description: '时间线浏览电影年代'
  },
  {
    label: '推荐',
    route: '/recommendations',
    icon: 'auto_awesome',
    description: '按导演与类型查看推荐'
  },
  {
    label: '随机选片',
    route: '/random',
    icon: 'casino',
    description: '随机选片与抽选历史'
  },
  {
    label: '电影对比',
    route: '/compare',
    icon: 'compare_arrows',
    description: '并列对比两部电影的关键指标'
  },
  {
    label: '观影日历',
    route: '/calendar',
    icon: 'calendar_today',
    description: '观影日历与月度热度'
  },
  {
    label: '影评墙',
    route: '/reviews',
    icon: 'rate_review',
    description: '影评墙与短评创作'
  },
  {
    label: '待看片单',
    route: '/watch-plans',
    icon: 'playlist_add_check',
    description: '安排待看片单、优先级与观影日期'
  },
  {
    label: '观影日志',
    route: '/watch-logs',
    icon: 'history_edu',
    description: '记录观影日志、心情标签与会话评分'
  },
  {
    label: '智能选片',
    route: '/smart-picks',
    icon: 'auto_awesome_motion',
    description: '用预设条件智能推荐下一部要看的电影'
  },
  {
    label: '导演图谱',
    route: '/director-atlas',
    icon: 'theater_comedy',
    description: '按导演聚合作品数量、均分与已看进度'
  },
  {
    label: '情绪图谱',
    route: '/mood-atlas',
    icon: 'mood',
    description: '把观影日志里的情绪标签整理成偏好地图'
  },
  {
    label: '连看规划',
    route: '/marathon',
    icon: 'playlist_play',
    description: '按时长预算组合连看片单'
  },
  {
    label: '偏好画像',
    route: '/taste-dna',
    icon: 'psychology',
    description: '已看、收藏、评分、影评与日志画像'
  },
  {
    label: '氛围策展',
    route: '/scene-board',
    icon: 'auto_awesome',
    description: '按视觉气质重新编排片库，形成主题策展板'
  },
  {
    label: '片库审计',
    route: '/archive-health',
    icon: 'verified',
    description: '审计片库资料完整度、海报 URL 与背景图状态'
  }
];

export const BREADCRUMB_LABELS: Record<string, string> = {
  dashboard: '仪表盘',
  movies: '电影列表',
  add: '添加电影',
  about: '关于',
  explore: '探索影库',
  favorites: '收藏中心',
  timeline: '时间线',
  recommendations: '推荐',
  random: '随机选片',
  compare: '对比',
  calendar: '日历',
  reviews: '影评墙',
  'watch-plans': '待看片单',
  'watch-logs': '观影日志',
  'smart-picks': '智能选片',
  directors: '导演库',
  genre: '分类浏览',
  'director-atlas': '导演图谱',
  'mood-atlas': '情绪图谱',
  marathon: '连看规划',
  'taste-dna': '偏好画像',
  'scene-board': '氛围策展',
  'archive-health': '片库审计',
  info: '基本信息',
  cast: '演员表'
};
