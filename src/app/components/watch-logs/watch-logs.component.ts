import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { BehaviorSubject, combineLatest, map, shareReplay } from 'rxjs';
import { Movie } from '../../models/movie';
import { WatchLogEntry } from '../../models/watch-log';
import { MessageService } from '../../services/message.service';
import { MovieService } from '../../services/movie.service';
import { WatchLogService } from '../../services/watch-log.service';
import { formatDateInputValue } from '../../utils/movie-media';

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
}

interface LogViewItem {
  entry: WatchLogEntry;
  movie: Movie;
  watchedAtLabel: string;
  moodLabel: string;
}

interface WatchLogsViewModel {
  summaryCards: SummaryCard[];
  visibleLogs: LogViewItem[];
  movieOptions: Movie[];
  filterMovieId: number | 'all';
}

@Component({
  selector: 'app-watch-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './watch-logs.component.html',
  styleUrl: './watch-logs.component.scss'
})
export class WatchLogsComponent {
  private readonly filterMovieIdSubject = new BehaviorSubject<number | 'all'>('all');

  readonly vm$ = combineLatest([
    this.watchLogService.logs$,
    this.movieService.movies$,
    this.filterMovieIdSubject
  ]).pipe(
    map(([logs, movies, filterMovieId]): WatchLogsViewModel => {
      const movieMap = new Map(movies.map(movie => [movie.id, movie]));
      const allLogItems = logs
        .map(entry => {
          const movie = movieMap.get(entry.movieId);
          if (!movie) {
            return null;
          }

          return {
            entry,
            movie,
            watchedAtLabel: formatDateInputValue(entry.watchedAt),
            moodLabel: entry.moodTags.length > 0 ? entry.moodTags.join(' / ') : '未填写情绪标签'
          } satisfies LogViewItem;
        })
        .filter((item): item is LogViewItem => item !== null);

      return {
        summaryCards: [
          {
            label: '日志总数',
            value: String(logs.length),
            hint: '当前已记录的观影会话数量'
          },
          {
            label: '最近 30 天',
            value: String(logs.filter(entry => Date.now() - entry.watchedAt.getTime() <= 30 * 24 * 60 * 60 * 1000).length),
            hint: '近一个月的观影活跃度'
          },
          {
            label: '重看次数',
            value: String(logs.filter(entry => entry.isRewatch).length),
            hint: '标记为重看的观影记录数量'
          },
          {
            label: '带评分日志',
            value: String(logs.filter(entry => entry.sessionRating !== null).length),
            hint: '附带会话评分的观影记录'
          }
        ],
        visibleLogs: filterMovieId === 'all'
          ? allLogItems
          : allLogItems.filter(item => item.movie.id === filterMovieId),
        movieOptions: [...movies].sort((first, second) => second.rating - first.rating || first.title.localeCompare(second.title, 'zh-CN')),
        filterMovieId
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  draft = this.createDraft();

  constructor(
    private movieService: MovieService,
    private watchLogService: WatchLogService,
    private messageService: MessageService
  ) {}

  setFilterMovieId(movieId: number | 'all'): void {
    this.filterMovieIdSubject.next(movieId);
  }

  saveLog(): void {
    if (!this.draft.movieId) {
      this.messageService.warning('请先选择一部电影，再记录观影日志。', 'Watch Logs');
      return;
    }

    const result = this.watchLogService.addLog({
      movieId: this.draft.movieId,
      watchedAt: this.toDate(this.draft.watchedAt) ?? new Date(),
      location: this.draft.location,
      companion: this.draft.companion,
      moodTags: this.parseMoodTags(this.draft.moodTags),
      sessionRating: this.toNumberOrNull(this.draft.sessionRating),
      note: this.draft.note,
      isRewatch: this.draft.isRewatch
    });

    if (!result.ok) {
      this.messageService.error(result.error, 'Watch Logs');
      return;
    }

    const movie = this.movieService.getMovieById(result.entry.movieId);
    this.messageService.success(`已记录《${movie?.title ?? `#${result.entry.movieId}` }》的观影日志。`, 'Watch Logs');
    this.resetDraft();
  }

  removeLog(entry: WatchLogEntry): void {
    const removed = this.watchLogService.removeLog(entry.id);
    if (!removed) {
      this.messageService.error('删除观影日志失败：记录不存在。', 'Watch Logs');
      return;
    }

    const movie = this.movieService.getMovieById(entry.movieId);
    this.messageService.warning(`已删除《${movie?.title ?? `#${entry.movieId}` }》的一条观影日志，并按剩余日志重新同步影片状态。`, 'Watch Logs');
  }

  resetDraft(): void {
    this.draft = this.createDraft();
  }

  trackByLogId(index: number, item: LogViewItem): number {
    return item.entry.id;
  }

  private createDraft(): {
    movieId: number | null;
    watchedAt: string;
    location: string;
    companion: string;
    moodTags: string;
    sessionRating: string;
    note: string;
    isRewatch: boolean;
  } {
    return {
      movieId: null,
      watchedAt: formatDateInputValue(new Date()),
      location: '',
      companion: '',
      moodTags: '',
      sessionRating: '',
      note: '',
      isRewatch: false
    };
  }

  private toDate(value: string): Date | null {
    return value ? new Date(`${value}T20:00:00`) : null;
  }

  private toNumberOrNull(value: string): number | null {
    if (!value.trim()) {
      return null;
    }

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  private parseMoodTags(value: string): string[] {
    return Array.from(new Set(value
      .split(/[，,、/]/)
      .map(item => item.trim())
      .filter(item => item.length > 0)
      .slice(0, 6)));
  }
}
