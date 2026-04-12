import { Injectable } from '@angular/core';
import { combineLatest, map, shareReplay } from 'rxjs';
import { Movie } from '../models/movie';
import { ReviewEntry } from '../models/review';
import { ViewingPreset } from '../models/viewing-preset';
import { WatchLogEntry } from '../models/watch-log';
import { WatchPlanEntry } from '../models/watch-plan';
import { MovieService } from './movie.service';
import { RecentHistoryEntry, RecentHistoryService } from './recent-history.service';
import { ReviewStoreService } from './review-store.service';
import { SmartPicksService } from './smart-picks.service';
import { WatchLogService } from './watch-log.service';
import { WatchPlanService } from './watch-plan.service';

export interface CinemaFlowBackup {
  version: string;
  exportedAt: string;
  movies: Movie[];
  recentHistory: RecentHistoryEntry[];
  reviews: ReviewEntry[];
  watchPlans: WatchPlanEntry[];
  watchLogs: WatchLogEntry[];
  viewingPresets: ViewingPreset[];
  meta: {
    movieCount: number;
    recentHistoryCount: number;
    reviewCount: number;
    watchPlanCount: number;
    watchLogCount: number;
    viewingPresetCount: number;
  };
}

export type CinemaFlowBackupMeta = CinemaFlowBackup['meta'];

export type BackupParseResult =
  | { ok: true; payload: CinemaFlowBackup }
  | { ok: false; error: string };

@Injectable({ providedIn: 'root' })
export class DataPortService {
  private readonly backupVersion = 'CinemaFlow-3.0';

  readonly summary$ = combineLatest([
    this.movieService.movies$,
    this.recentHistoryService.history$,
    this.reviewStoreService.reviews$,
    this.watchPlanService.plans$,
    this.watchLogService.logs$,
    this.smartPicksService.presets$
  ]).pipe(
    map(([movies, recentHistory, reviews, watchPlans, watchLogs, viewingPresets]) => {
      return this.buildMeta(movies, recentHistory, reviews, watchPlans, watchLogs, viewingPresets);
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  constructor(
    private movieService: MovieService,
    private recentHistoryService: RecentHistoryService,
    private reviewStoreService: ReviewStoreService,
    private watchPlanService: WatchPlanService,
    private watchLogService: WatchLogService,
    private smartPicksService: SmartPicksService
  ) {}

  createBackup(): CinemaFlowBackup {
    const movies = this.movieService.getMovies();
    const recentHistory = this.recentHistoryService.getEntries();
    const reviews = this.reviewStoreService.getReviews();
    const watchPlans = this.watchPlanService.getPlans();
    const watchLogs = this.watchLogService.getLogs();
    const viewingPresets = this.smartPicksService.getPresets();
    const meta = this.buildMeta(movies, recentHistory, reviews, watchPlans, watchLogs, viewingPresets);

    return {
      version: this.backupVersion,
      exportedAt: new Date().toISOString(),
      movies,
      recentHistory,
      reviews,
      watchPlans,
      watchLogs,
      viewingPresets,
      meta
    };
  }

  downloadBackup(): void {
    const snapshot = this.createBackup();
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const exportDate = snapshot.exportedAt.slice(0, 10);

    anchor.href = objectUrl;
    anchor.download = `cinemaflow-backup-${exportDate}.json`;
    anchor.click();

    URL.revokeObjectURL(objectUrl);
  }

  parseBackup(rawValue: string): BackupParseResult {
    try {
      const parsedValue = JSON.parse(rawValue) as Partial<CinemaFlowBackup>;
      if (!parsedValue || !Array.isArray(parsedValue.movies)) {
        return { ok: false, error: '导入文件缺少电影列表，无法恢复。' };
      }

      if (parsedValue.recentHistory && !Array.isArray(parsedValue.recentHistory)) {
        return { ok: false, error: '最近浏览数据格式不正确。' };
      }

      if (parsedValue.reviews && !Array.isArray(parsedValue.reviews)) {
        return { ok: false, error: '影评数据格式不正确。' };
      }

      if (parsedValue.watchPlans && !Array.isArray(parsedValue.watchPlans)) {
        return { ok: false, error: '待看片单数据格式不正确。' };
      }

      if (parsedValue.watchLogs && !Array.isArray(parsedValue.watchLogs)) {
        return { ok: false, error: '观影日志数据格式不正确。' };
      }

      if (parsedValue.viewingPresets && !Array.isArray(parsedValue.viewingPresets)) {
        return { ok: false, error: '智能选片预设数据格式不正确。' };
      }

      const hasInvalidMovie = parsedValue.movies.some(movie =>
        !movie
        || typeof movie.id !== 'number'
        || typeof movie.title !== 'string'
        || typeof movie.director !== 'string'
        || movie.title.trim().length === 0
        || movie.director.trim().length === 0
      );

      if (hasInvalidMovie) {
        return { ok: false, error: '导入文件中的电影条目不完整，请检查 JSON 内容。' };
      }

      return {
        ok: true,
        payload: {
          version: typeof parsedValue.version === 'string' ? parsedValue.version : this.backupVersion,
          exportedAt: typeof parsedValue.exportedAt === 'string'
            ? parsedValue.exportedAt
            : new Date().toISOString(),
          movies: parsedValue.movies,
          recentHistory: parsedValue.recentHistory ?? [],
          reviews: parsedValue.reviews ?? [],
          watchPlans: parsedValue.watchPlans ?? [],
          watchLogs: parsedValue.watchLogs ?? [],
          viewingPresets: parsedValue.viewingPresets ?? [],
          meta: {
            movieCount: parsedValue.movies.length,
            recentHistoryCount: parsedValue.recentHistory?.length ?? 0,
            reviewCount: parsedValue.reviews?.length ?? 0,
            watchPlanCount: parsedValue.watchPlans?.length ?? 0,
            watchLogCount: parsedValue.watchLogs?.length ?? 0,
            viewingPresetCount: parsedValue.viewingPresets?.length ?? 0
          }
        }
      };
    } catch {
      return { ok: false, error: '文件不是合法的 JSON，无法导入。' };
    }
  }

  restoreBackup(payload: CinemaFlowBackup): void {
    this.movieService.replaceMovies(payload.movies);
    this.recentHistoryService.replaceHistory(payload.recentHistory ?? []);
    this.reviewStoreService.replaceReviews(payload.reviews ?? []);
    this.watchPlanService.replacePlans(payload.watchPlans ?? []);
    this.watchLogService.replaceLogs(payload.watchLogs ?? []);
    this.smartPicksService.replacePresets(payload.viewingPresets ?? []);
  }

  private buildMeta(
    movies: Movie[],
    recentHistory: RecentHistoryEntry[],
    reviews: ReviewEntry[],
    watchPlans: WatchPlanEntry[],
    watchLogs: WatchLogEntry[],
    viewingPresets: ViewingPreset[]
  ): CinemaFlowBackupMeta {
    return {
      movieCount: movies.length,
      recentHistoryCount: recentHistory.length,
      reviewCount: reviews.length,
      watchPlanCount: watchPlans.length,
      watchLogCount: watchLogs.length,
      viewingPresetCount: viewingPresets.length
    };
  }
}
