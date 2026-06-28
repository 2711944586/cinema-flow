import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { WatchLogDraft, WatchLogEntry } from '../models/watch-log';
import { WatchPlanCompletionSnapshot } from '../models/watch-plan';
import { MovieService } from './movie.service';
import { WatchPlanService } from './watch-plan.service';

@Injectable({ providedIn: 'root' })
export class WatchLogService {
  private readonly storageKey = 'cinemaflow.watch-log.v1';
  private readonly logsSubject = new BehaviorSubject<WatchLogEntry[]>(this.loadLogs());

  readonly logs$ = this.logsSubject.asObservable();

  constructor(
    private movieService: MovieService,
    private watchPlanService: WatchPlanService
  ) {}

  getLogs(): WatchLogEntry[] {
    return this.logsSubject.value.map(entry => this.cloneEntry(entry));
  }

  getRecentLogs(limit = 8): WatchLogEntry[] {
    return this.getLogs().slice(0, limit);
  }

  getLogsForMovie(movieId: number): WatchLogEntry[] {
    return this.getLogs().filter(entry => entry.movieId === movieId);
  }

  addLog(draft: WatchLogDraft):
    | { ok: true; entry: WatchLogEntry }
    | { ok: false; error: string } {
    if (!Number.isInteger(draft.movieId)) {
      return { ok: false, error: '无法为未知电影写入观影日志。' };
    }

    const movie = this.movieService.getMovieById(draft.movieId);
    if (!movie) {
      return { ok: false, error: '无法为不存在的电影写入观影日志。' };
    }

    const watchedAt = this.coerceDate(draft.watchedAt) ?? new Date();
    const hasExistingLogs = this.logsSubject.value.some(entry => entry.movieId === draft.movieId);
    const autoMarkedWatched = !movie.isWatched;
    const sessionRating = this.normalizeRating(draft.sessionRating);
    const autoAssignedUserRating = sessionRating !== null && movie.userRating == null;
    const completedPlanSnapshot = this.watchPlanService.markCompletedByMovie(movie.id, watchedAt);
    const normalizedEntry = this.normalizeEntry({
      id: this.buildNextId(),
      movieId: draft.movieId,
      watchedAt,
      location: draft.location?.trim() ?? '',
      companion: draft.companion?.trim() ?? '',
      moodTags: this.normalizeMoodTags(draft.moodTags),
      sessionRating,
      note: draft.note?.trim() ?? '',
      isRewatch: draft.isRewatch ?? (movie.isWatched || hasExistingLogs),
      autoMarkedWatched,
      autoAssignedUserRating,
      completedPlanSnapshot,
      createdAt: new Date()
    });

    this.commitEntries([normalizedEntry, ...this.logsSubject.value]);

    if (autoMarkedWatched) {
      this.movieService.updateMovie(movie.id, { isWatched: true });
    }

    if (autoAssignedUserRating && normalizedEntry.sessionRating !== null) {
      this.movieService.setUserRating(movie.id, normalizedEntry.sessionRating);
    }

    return { ok: true, entry: this.cloneEntry(normalizedEntry) };
  }

  removeLog(id: number): boolean {
    const removedEntry = this.logsSubject.value.find(entry => entry.id === id);
    if (!removedEntry) {
      return false;
    }

    const remainingEntries = this.logsSubject.value.filter(entry => entry.id !== id);
    this.commitEntries(remainingEntries);
    this.reconcileMovieStateAfterRemoval(removedEntry, remainingEntries);
    return true;
  }

  replaceLogs(entries: WatchLogEntry[]): void {
    const normalizedEntries = entries
      .map(entry => this.normalizeStoredEntry(entry))
      .filter((entry): entry is WatchLogEntry => entry !== null);

    this.commitEntries(normalizedEntries);
  }

  private loadLogs(): WatchLogEntry[] {
    if (typeof localStorage === 'undefined') {
      return this.buildInitialLogs();
    }

    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) {
        return this.buildInitialLogs();
      }

      const parsedValue = JSON.parse(rawValue);
      if (!Array.isArray(parsedValue)) {
        return this.buildInitialLogs();
      }

      const storedLogs = this.sortEntries(parsedValue
        .map(entry => this.normalizeStoredEntry(entry))
        .filter((entry): entry is WatchLogEntry => entry !== null));

      return storedLogs.length > 0 ? storedLogs : this.buildInitialLogs();
    } catch {
      return this.buildInitialLogs();
    }
  }

  private buildInitialLogs(): WatchLogEntry[] {
    const now = new Date();
    const daysAgo = (days: number, hour = 21): Date => {
      const date = new Date(now);
      date.setDate(now.getDate() - days);
      date.setHours(hour, 0, 0, 0);
      return date;
    };

    return this.sortEntries([
      this.normalizeEntry({
        id: 1,
        movieId: 13,
        watchedAt: daysAgo(2, 20),
        location: '家中客厅',
        companion: '一个人',
        moodTags: ['沉浸', '历史', '压迫感'],
        sessionRating: 8.9,
        note: '剪辑密度很高，庭审和实验室两条线互相挤压，最后的余波比爆炸本身更有力量。',
        isRewatch: false,
        autoMarkedWatched: false,
        autoAssignedUserRating: false,
        completedPlanSnapshot: null,
        createdAt: daysAgo(2, 23)
      }),
      this.normalizeEntry({
        id: 2,
        movieId: 12,
        watchedAt: daysAgo(6, 21),
        location: '周末夜场',
        companion: '朋友',
        moodTags: ['惊讶', '黑色幽默', '社会寓言'],
        sessionRating: 9.0,
        note: '类型切换非常顺滑，前半段像骗局喜剧，后半段突然变成阶层寓言，空间调度尤其值得复盘。',
        isRewatch: false,
        autoMarkedWatched: false,
        autoAssignedUserRating: false,
        completedPlanSnapshot: null,
        createdAt: daysAgo(6, 23)
      }),
      this.normalizeEntry({
        id: 3,
        movieId: 7,
        watchedAt: daysAgo(14, 20),
        location: '资料馆放映厅',
        companion: '同学',
        moodTags: ['震撼', '工业感', '热血'],
        sessionRating: 8.4,
        note: '宏观危机和具体人物命运之间衔接得更成熟，太空电梯段落的视听完成度很突出。',
        isRewatch: false,
        autoMarkedWatched: true,
        autoAssignedUserRating: true,
        completedPlanSnapshot: {
          id: 7,
          status: 'scheduled',
          plannedFor: daysAgo(14, 20),
          updatedAt: daysAgo(15, 19)
        },
        createdAt: daysAgo(14, 23)
      }),
      this.normalizeEntry({
        id: 4,
        movieId: 10,
        watchedAt: daysAgo(24, 19),
        location: '宿舍投屏',
        companion: '室友',
        moodTags: ['浪漫', '治愈', '夏天'],
        sessionRating: 8.6,
        note: '情绪推进很快，音乐进入的时机特别准，适合放在动画和青春片交叉的片单里。',
        isRewatch: true,
        autoMarkedWatched: false,
        autoAssignedUserRating: false,
        completedPlanSnapshot: null,
        createdAt: daysAgo(24, 22)
      }),
      this.normalizeEntry({
        id: 5,
        movieId: 31,
        watchedAt: daysAgo(36, 21),
        location: '家中书房',
        companion: '一个人',
        moodTags: ['锋利', '荒诞', '情绪浓度'],
        sessionRating: 8.7,
        note: '台词像连续的刀口，但真正留下来的是人物身上那种无法排解的痛感。',
        isRewatch: false,
        autoMarkedWatched: false,
        autoAssignedUserRating: false,
        completedPlanSnapshot: null,
        createdAt: daysAgo(36, 23)
      }),
      this.normalizeEntry({
        id: 6,
        movieId: 41,
        watchedAt: daysAgo(49, 20),
        location: '晚自习后',
        companion: '一个人',
        moodTags: ['紧张', '专注', '纪录片'],
        sessionRating: 8.5,
        note: '明知道结果，手心还是会出汗。纪录片的临场感和人物关系铺垫都很扎实。',
        isRewatch: false,
        autoMarkedWatched: false,
        autoAssignedUserRating: false,
        completedPlanSnapshot: null,
        createdAt: daysAgo(49, 22)
      })
    ]);
  }

  private commitEntries(entries: WatchLogEntry[]): void {
    const normalizedEntries = this.sortEntries(entries.map(entry => this.normalizeEntry(entry)));
    this.logsSubject.next(normalizedEntries.map(entry => this.cloneEntry(entry)));

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(normalizedEntries));
    }
  }

  private buildNextId(): number {
    return this.logsSubject.value.length > 0
      ? Math.max(...this.logsSubject.value.map(entry => entry.id)) + 1
      : 1;
  }

  private normalizeEntry(entry: Partial<WatchLogEntry>): WatchLogEntry {
    return {
      id: Number(entry.id ?? 0),
      movieId: Number(entry.movieId ?? 0),
      watchedAt: this.coerceDate(entry.watchedAt) ?? new Date(),
      location: entry.location?.trim() ?? '',
      companion: entry.companion?.trim() ?? '',
      moodTags: this.normalizeMoodTags(entry.moodTags),
      sessionRating: this.normalizeRating(entry.sessionRating),
      note: entry.note?.trim() ?? '',
      isRewatch: !!entry.isRewatch,
      autoMarkedWatched: !!entry.autoMarkedWatched,
      autoAssignedUserRating: !!entry.autoAssignedUserRating,
      completedPlanSnapshot: this.normalizeCompletionSnapshot(entry.completedPlanSnapshot),
      createdAt: this.coerceDate(entry.createdAt) ?? new Date()
    };
  }

  private normalizeStoredEntry(entry: Partial<WatchLogEntry> | null | undefined): WatchLogEntry | null {
    if (!entry || typeof entry.id !== 'number' || typeof entry.movieId !== 'number') {
      return null;
    }

    return this.normalizeEntry(entry);
  }

  private sortEntries(entries: WatchLogEntry[]): WatchLogEntry[] {
    return [...entries].sort((first, second) => {
      const watchedAtDiff = second.watchedAt.getTime() - first.watchedAt.getTime();
      if (watchedAtDiff !== 0) {
        return watchedAtDiff;
      }

      return second.createdAt.getTime() - first.createdAt.getTime();
    });
  }

  private normalizeMoodTags(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(new Set(value
      .map(tag => typeof tag === 'string' ? tag.trim() : '')
      .filter(tag => tag.length > 0)
      .slice(0, 6)));
  }

  private normalizeRating(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
      return null;
    }

    const clampedValue = Math.min(10, Math.max(0, numericValue));
    return Math.round(clampedValue * 10) / 10;
  }

  private cloneEntry(entry: WatchLogEntry): WatchLogEntry {
    return {
      ...entry,
      watchedAt: new Date(entry.watchedAt),
      moodTags: [...entry.moodTags],
      completedPlanSnapshot: entry.completedPlanSnapshot
        ? {
            ...entry.completedPlanSnapshot,
            plannedFor: entry.completedPlanSnapshot.plannedFor ? new Date(entry.completedPlanSnapshot.plannedFor) : null,
            updatedAt: new Date(entry.completedPlanSnapshot.updatedAt)
          }
        : null,
      createdAt: new Date(entry.createdAt)
    };
  }

  private reconcileMovieStateAfterRemoval(removedEntry: WatchLogEntry, remainingEntries: WatchLogEntry[]): void {
    const movie = this.movieService.getMovieById(removedEntry.movieId);
    if (!movie) {
      return;
    }

    const remainingMovieLogs = remainingEntries.filter(entry => entry.movieId === removedEntry.movieId);

    if (removedEntry.autoMarkedWatched && remainingMovieLogs.length === 0 && movie.isWatched) {
      this.movieService.updateMovie(movie.id, { isWatched: false });
    }

    if (
      removedEntry.autoAssignedUserRating
      && removedEntry.sessionRating !== null
      && movie.userRating === removedEntry.sessionRating
    ) {
      const fallbackRatedLog = remainingMovieLogs.find(entry => entry.sessionRating !== null);

      if (fallbackRatedLog?.sessionRating !== null && fallbackRatedLog?.sessionRating !== undefined) {
        this.movieService.setUserRating(movie.id, fallbackRatedLog.sessionRating);
      } else {
        this.movieService.updateMovie(movie.id, { userRating: undefined });
      }
    }

    if (remainingMovieLogs.length === 0 && removedEntry.completedPlanSnapshot) {
      this.watchPlanService.restoreCompletionSnapshot(removedEntry.completedPlanSnapshot);
    }
  }

  private normalizeCompletionSnapshot(value: unknown): WatchPlanCompletionSnapshot | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const snapshot = value as Partial<WatchPlanCompletionSnapshot>;
    if (typeof snapshot.id !== 'number') {
      return null;
    }

    const updatedAt = this.coerceDate(snapshot.updatedAt);
    if (!updatedAt) {
      return null;
    }

    return {
      id: snapshot.id,
      status: snapshot.status === 'scheduled' || snapshot.status === 'queued' || snapshot.status === 'paused' || snapshot.status === 'completed'
        ? snapshot.status
        : 'completed',
      plannedFor: this.coerceDate(snapshot.plannedFor),
      updatedAt
    };
  }

  private coerceDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? new Date(value) : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }
}
