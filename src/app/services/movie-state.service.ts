import { Injectable } from '@angular/core';
import { ParamMap } from '@angular/router';
import { combineLatest, map, Observable, shareReplay } from 'rxjs';
import { CORE_NAV_ITEMS, ENHANCEMENT_NAV_ITEMS } from '../config/navigation';
import { Movie } from '../models/movie';
import {
  collectMovieGenres,
  DEFAULT_MOVIE_QUERY_STATE,
  filterMoviesByQueryState,
  MOVIE_PAGE_SIZE_OPTIONS,
  parseMovieQueryState,
  MovieQueryState
} from '../utils/movie-query';
import { paginateItems } from '../utils/pagination';
import { AppMessage, MessageService } from './message.service';
import { LogEntry, LoggerService } from './logger.service';
import { MovieService } from './movie.service';
import { RecentHistoryEntry, RecentHistoryService } from './recent-history.service';
import { ReviewStoreService } from './review-store.service';
import { SmartPicksService } from './smart-picks.service';
import { WatchLogService } from './watch-log.service';
import { WatchPlanService } from './watch-plan.service';

export interface SummaryCard {
  label: string;
  value: string;
  hint: string;
}

export interface ServiceSummary {
  name: string;
  summary: string;
  storageKey: string;
  reactiveSignal: string;
}

export interface DashboardViewModel {
  movies: Movie[];
  recentAdded: Movie[];
  recentHistory: RecentHistoryEntry[];
  heroMovie?: Movie;
  stats: SummaryCard[];
}

export interface MovieListViewModel {
  movies: Movie[];
  filteredMovies: Movie[];
  visibleMovies: Movie[];
  genres: string[];
  queryState: MovieQueryState;
  summaryLabel: string;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  totalPages: number;
  startItem: number;
  endItem: number;
}

export interface MovieDetailViewModel {
  movie?: Movie;
  recommendations: Movie[];
  previousMovie?: Movie;
  nextMovie?: Movie;
  recentHistory: RecentHistoryEntry[];
  currentSection: 'info' | 'cast';
  notFound: boolean;
}

export interface AboutViewModel {
  summaryCards: SummaryCard[];
  highlights: string[];
  techStack: string[];
  coreModules: typeof CORE_NAV_ITEMS;
  enhancementModules: typeof ENHANCEMENT_NAV_ITEMS;
  serviceSummaries: ServiceSummary[];
  latestMessage?: AppMessage;
  recentMessages: AppMessage[];
  recentLogs: LogEntry[];
}

@Injectable({ providedIn: 'root' })
export class MovieStateService {
  private readonly serviceSummaries: ServiceSummary[] = [
    {
      name: 'MovieService',
      summary: '电影主库、收藏与已观看状态的单一事实来源。',
      storageKey: 'cinemaflow.movies.v3',
      reactiveSignal: 'movies$'
    },
    {
      name: 'DirectorService',
      summary: '导演实体、导演详情、导演作品集与 Flask 导演 API 的统一访问层。',
      storageKey: 'Flask / local aggregate',
      reactiveSignal: 'getDirectors()'
    },
    {
      name: 'RecentHistoryService',
      summary: '记录详情页最近浏览轨迹，支持跨页面恢复浏览上下文。',
      storageKey: 'cinemaflow.recent-history.v2',
      reactiveSignal: 'history$'
    },
    {
      name: 'ReviewStoreService',
      summary: '维护影评墙数据、点赞状态与评论排序基础。',
      storageKey: 'cinemaflow.reviews.v2',
      reactiveSignal: 'reviews$'
    },
    {
      name: 'WatchPlanService',
      summary: '管理待看片单、排期优先级与计划状态。',
      storageKey: 'cinemaflow.watch-plans.v1',
      reactiveSignal: 'plans$'
    },
    {
      name: 'WatchLogService',
      summary: '沉淀观影日志、观影情境与会话评分。',
      storageKey: 'cinemaflow.watch-log.v1',
      reactiveSignal: 'logs$'
    },
    {
      name: 'SmartPicksService',
      summary: '保存智能选片预设，并基于偏好生成推荐结果。',
      storageKey: 'cinemaflow.smart-picks.presets.v1',
      reactiveSignal: 'presets$'
    },
    {
      name: 'MessageService',
      summary: '统一用户可见消息、实验过程提示与状态反馈。',
      storageKey: 'memory',
      reactiveSignal: 'messages$'
    },
    {
      name: 'LoggerService',
      summary: '结构化日志流，供 About 页面与调试过程复盘使用。',
      storageKey: 'memory',
      reactiveSignal: 'logs$'
    }
  ];

  readonly dashboardVm$ = combineLatest([
    this.movieService.movies$,
    this.recentHistoryService.history$
  ]).pipe(
    map(([movies, recentHistory]): DashboardViewModel => {
      const recentAdded = [...movies].sort((first, second) => second.id - first.id).slice(0, 5);
      const heroMovie = [...movies].sort((first, second) => second.rating - first.rating)[0];
      const watchedCount = movies.filter(movie => movie.isWatched).length;
      const favoriteCount = movies.filter(movie => movie.isFavorite).length;
      const avgRating = movies.length > 0
        ? (movies.reduce((total, movie) => total + movie.rating, 0) / movies.length).toFixed(1)
        : '0.0';

      return {
        movies,
        recentAdded,
        recentHistory,
        heroMovie,
        stats: [
          { label: '总影片数', value: String(movies.length), hint: '当前片库可浏览电影总数' },
          { label: '已观影', value: String(watchedCount), hint: '标记为已看或写入观影日志的电影' },
          { label: '收藏数', value: String(favoriteCount), hint: '被加入收藏中心的电影数量' },
          { label: '平均评分', value: avgRating, hint: '基于片库评分计算的当前平均值' }
        ]
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly aboutVm$ = combineLatest([
    this.movieService.movies$,
    this.recentHistoryService.history$,
    this.reviewStoreService.reviews$,
    this.watchPlanService.plans$,
    this.watchLogService.logs$,
    this.smartPicksService.presets$,
    this.messageService.messages$,
    this.loggerService.logs$
  ]).pipe(
    map(([movies, recentHistory, reviews, watchPlans, watchLogs, presets, messages, logEntries]) => {
      const publicRouteCount = CORE_NAV_ITEMS.length + ENHANCEMENT_NAV_ITEMS.length;

      return {
        summaryCards: [
          { label: '公开页面', value: String(publicRouteCount), hint: '当前主导航与增强导航中的页面入口总数' },
          { label: '根级服务', value: String(this.serviceSummaries.length), hint: '本轮实验纳入 About 展示的服务数量' },
          { label: '用户消息', value: String(messages.length), hint: '消息面板当前保留的最近提示条数' },
          { label: '日志记录', value: String(logEntries.length), hint: 'LoggerService 当前缓存的结构化日志数量' }
        ],
        highlights: [
          '第五次上机课要求的导演实体、跨实体导航、分类路由与添加页路由守卫已经接入主路由。',
          '第六次上机课要求的 Flask REST API、HttpClient、错误降级与防抖搜索已经补齐。',
          'Movies、Dashboard、Movie Detail、Directors 与 About 均可通过响应式数据链路消费状态。',
          'Watch Plans、Watch Logs 与 Smart Picks 让计划、观影与推荐形成了完整闭环。',
          '新增 Taste DNA、Scene Board、Archive Health 三个不重复功能页，用于偏好画像、氛围策展与片库质量审计。',
          '导入导出会保留片库、最近浏览、影评、待看片单、观影日志与智能选片预设。'
        ],
        techStack: [
          'Angular 17 Standalone Components + Angular Material',
          'Flask Blueprint + flask-cors 提供电影与导演 RESTful API',
          'Angular provideHttpClient + tap/catchError 实现 HTTP 化服务与本地降级',
          'debounceTime + distinctUntilChanged + switchMap 驱动命令面板防抖搜索',
          'BehaviorSubject + combineLatest + shareReplay 组成页面 façade',
          'Router 参数、queryParam 与页面状态联动',
          'LoggerService / MessageService 提供可观测反馈链路',
          'LocalStorage 持久化与 JSON 导入导出备份'
        ],
        coreModules: CORE_NAV_ITEMS,
        enhancementModules: ENHANCEMENT_NAV_ITEMS,
        serviceSummaries: this.serviceSummaries,
        latestMessage: messages[0],
        recentMessages: messages.slice(0, 6),
        recentLogs: logEntries.slice(0, 8).map(entry => ({
          ...entry,
          createdAt: new Date(entry.createdAt)
        }))
      } satisfies AboutViewModel;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(
    private movieService: MovieService,
    private recentHistoryService: RecentHistoryService,
    private reviewStoreService: ReviewStoreService,
    private watchPlanService: WatchPlanService,
    private watchLogService: WatchLogService,
    private smartPicksService: SmartPicksService,
    private messageService: MessageService,
    private loggerService: LoggerService
  ) {}

  movieListVm$(queryParamMap$: Observable<ParamMap>, routeParamMap$?: Observable<ParamMap>): Observable<MovieListViewModel> {
    return combineLatest([
      this.movieService.movies$,
      queryParamMap$,
      routeParamMap$ ?? queryParamMap$
    ]).pipe(
      map(([movies, queryParamMap, routeParamMap]) => {
        const genres = collectMovieGenres(movies);
        const routeGenre = routeParamMap.get('genre')?.trim() ?? '';
        const queryState = parseMovieQueryState(queryParamMap, genres);
        const nextQueryState = routeGenre && genres.includes(routeGenre)
          ? { ...queryState, genre: routeGenre }
          : queryState;
        const filteredMovies = filterMoviesByQueryState(movies, nextQueryState);
        const pagination = paginateItems(filteredMovies, nextQueryState.page, nextQueryState.pageSize);

        return {
          movies,
          filteredMovies,
          visibleMovies: pagination.items,
          genres,
          queryState: nextQueryState,
          summaryLabel: `${filteredMovies.length} / ${movies.length} 部`,
          page: pagination.page,
          pageSize: pagination.pageSize,
          pageSizeOptions: MOVIE_PAGE_SIZE_OPTIONS,
          totalPages: pagination.totalPages,
          startItem: pagination.startItem,
          endItem: pagination.endItem
        };
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  movieDetailVm$(
    paramMap$: Observable<ParamMap>,
    currentSection$: Observable<'info' | 'cast'>
  ): Observable<MovieDetailViewModel> {
    return combineLatest([
      paramMap$,
      currentSection$,
      this.movieService.movies$,
      this.recentHistoryService.history$
    ]).pipe(
      map(([params, currentSection, _, recentHistory]) => {
        const movieId = Number(params.get('id'));
        if (!Number.isFinite(movieId)) {
          return {
            movie: undefined,
            recommendations: [],
            previousMovie: undefined,
            nextMovie: undefined,
            recentHistory: recentHistory.slice(0, 4),
            currentSection,
            notFound: true
          };
        }

        const movie = this.movieService.getMovieById(movieId);
        const neighbors = this.movieService.getMovieNeighbors(movieId);

        return {
          movie,
          recommendations: movie ? this.movieService.getRecommendations(movie.id, 4) : [],
          previousMovie: neighbors.previous,
          nextMovie: neighbors.next,
          recentHistory: movie
            ? recentHistory.filter(entry => entry.movieId !== movie.id).slice(0, 4)
            : recentHistory.slice(0, 4),
          currentSection,
          notFound: !movie
        };
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  emptyMovieListVm(): MovieListViewModel {
    return {
      movies: [],
      filteredMovies: [],
      visibleMovies: [],
      genres: [],
      queryState: { ...DEFAULT_MOVIE_QUERY_STATE },
      summaryLabel: '0 / 0 部',
      page: DEFAULT_MOVIE_QUERY_STATE.page,
      pageSize: DEFAULT_MOVIE_QUERY_STATE.pageSize,
      pageSizeOptions: MOVIE_PAGE_SIZE_OPTIONS,
      totalPages: 1,
      startItem: 0,
      endItem: 0
    };
  }
}
