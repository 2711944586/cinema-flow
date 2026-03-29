import { Injectable } from '@angular/core';
import { Movie } from '../models/movie';
import { ReviewEntry } from '../models/review';
import { MovieService } from './movie.service';
import { RecentHistoryEntry, RecentHistoryService } from './recent-history.service';
import { ReviewStoreService } from './review-store.service';

export interface CinemaFlowBackup {
  version: string;
  exportedAt: string;
  movies: Movie[];
  recentHistory: RecentHistoryEntry[];
  reviews: ReviewEntry[];
  meta: {
    movieCount: number;
    recentHistoryCount: number;
    reviewCount: number;
  };
}

export type BackupParseResult =
  | { ok: true; payload: CinemaFlowBackup }
  | { ok: false; error: string };

@Injectable({ providedIn: 'root' })
export class DataPortService {
  private readonly backupVersion = 'CinemaFlow-2.0';

  constructor(
    private movieService: MovieService,
    private recentHistoryService: RecentHistoryService,
    private reviewStoreService: ReviewStoreService
  ) {}

  createBackup(): CinemaFlowBackup {
    const movies = this.movieService.getMovies();
    const recentHistory = this.recentHistoryService.getEntries();
    const reviews = this.reviewStoreService.getReviews();

    return {
      version: this.backupVersion,
      exportedAt: new Date().toISOString(),
      movies,
      recentHistory,
      reviews,
      meta: {
        movieCount: movies.length,
        recentHistoryCount: recentHistory.length,
        reviewCount: reviews.length
      }
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
          meta: {
            movieCount: parsedValue.movies.length,
            recentHistoryCount: parsedValue.recentHistory?.length ?? 0,
            reviewCount: parsedValue.reviews?.length ?? 0
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
  }
}
