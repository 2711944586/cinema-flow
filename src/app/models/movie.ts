/**
 * 电影数据接口定义
 */
export interface Movie {
  /** 电影唯一标识 */
  id: number;
  /** 电影名称 */
  title: string;
  /** 上映日期 */
  releaseDate: Date;
  /** 导演 */
  director: string;
  /** 关联导演实体 ID */
  directorId?: number;
  /** 电影主类型，兼容后端 REST 示例中的单类型字段 */
  genre?: string;
  /** 上映年份，兼容后端 REST 示例中的年份字段 */
  releaseYear?: number;
  /** 后端示例状态字段 */
  status?: 'showing' | 'archived';
  /** 评分 (0-10) */
  rating: number;
  /** 是否已观影 */
  isWatched: boolean;
  /** 海报 URL */
  posterUrl: string;
  /** 电影全画幅背景图 URL (Hero Banner使用) */
  backdropUrl: string;
  /** 电影类型标签 (如: '科幻', '动作', '剧情') */
  genres: string[];
  /** 电影时长 (分钟) */
  duration: number;
  /** 电影简介（长文本） */
  description: string;
  /** 预告片 URL (模拟使用) */
  trailerUrl?: string;
  /** 是否收藏 */
  isFavorite?: boolean;
  /** 用户个人评分 (0-10, 可选) */
  userRating?: number;
  /** 票房收入 (亿, 模拟数据) */
  boxOffice?: number;
  /** 语言 */
  language?: string;
  /** 演员列表 */
  cast?: string[];
  /** 用户观影笔记 */
  userNotes?: string;
}
