import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  WatchPlanCompletionSnapshot,
  WatchPlanDraft,
  WatchPlanEntry,
  WatchPlanPriority,
  WatchPlanStatus
} from '../models/watch-plan';
import { MovieService } from './movie.service';

const STATUS_ORDER: Record<WatchPlanStatus, number> = {
  scheduled: 0,
  queued: 1,
  paused: 2,
  completed: 3
};

const PRIORITY_ORDER: Record<WatchPlanPriority, number> = {
  high: 0,
  medium: 1,
  low: 2
};

@Injectable({ providedIn: 'root' })
export class WatchPlanService {
  private readonly storageKey = 'cinemaflow.watch-plans.v1';
  private readonly plansSubject = new BehaviorSubject<WatchPlanEntry[]>(this.loadPlans());

  readonly plans$ = this.plansSubject.asObservable();

  constructor(private movieService: MovieService) {}

  getPlans(): WatchPlanEntry[] {
    return this.plansSubject.value.map(entry => this.cloneEntry(entry));
  }

  getActivePlans(): WatchPlanEntry[] {
    return this.getPlans().filter(entry => entry.status !== 'completed');
  }

  getPlanForMovie(movieId: number): WatchPlanEntry | undefined {
    const plans = this.getPlans();
    return plans.find(entry => entry.movieId === movieId && entry.status !== 'completed')
      ?? plans.find(entry => entry.movieId === movieId);
  }

  savePlan(draft: WatchPlanDraft):
    | { ok: true; entry: WatchPlanEntry; created: boolean }
    | { ok: false; error: string } {
    if (!Number.isInteger(draft.movieId) || !this.movieService.getMovieById(draft.movieId)) {
      return { ok: false, error: '要加入待看片单的电影不存在。' };
    }

    const normalizedDraft = this.normalizeDraft(draft);
    if (typeof draft.id === 'number') {
      const existingEntry = this.plansSubject.value.find(entry => entry.id === draft.id);
      if (!existingEntry) {
        return { ok: false, error: '要更新的待看片单不存在。' };
      }

      if (normalizedDraft.status !== 'completed' && this.findActivePlan(normalizedDraft.movieId, existingEntry.id)) {
        return { ok: false, error: '该电影已经存在一条进行中的待看片单，请先编辑原计划或将其完成。' };
      }

      const updatedEntry = this.normalizeEntry({
        ...existingEntry,
        ...normalizedDraft,
        id: existingEntry.id,
        createdAt: existingEntry.createdAt,
        updatedAt: new Date()
      });

      this.commitEntries(this.plansSubject.value.map(entry => {
        return entry.id === existingEntry.id ? updatedEntry : this.cloneEntry(entry);
      }));

      return { ok: true, entry: this.cloneEntry(updatedEntry), created: false };
    }

    const existingActivePlan = this.findActivePlan(normalizedDraft.movieId);

    if (existingActivePlan) {
      const updatedEntry = this.normalizeEntry({
        ...existingActivePlan,
        ...normalizedDraft,
        id: existingActivePlan.id,
        createdAt: existingActivePlan.createdAt,
        updatedAt: new Date()
      });

      this.commitEntries(this.plansSubject.value.map(entry => {
        return entry.id === existingActivePlan.id ? updatedEntry : this.cloneEntry(entry);
      }));

      return { ok: true, entry: this.cloneEntry(updatedEntry), created: false };
    }

    const nextEntry = this.normalizeEntry({
      id: this.buildNextId(),
      ...normalizedDraft,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.commitEntries([nextEntry, ...this.plansSubject.value]);
    return { ok: true, entry: this.cloneEntry(nextEntry), created: true };
  }

  updatePlan(id: number, changes: Partial<Omit<WatchPlanEntry, 'id' | 'createdAt'>>): boolean {
    const existingEntry = this.plansSubject.value.find(entry => entry.id === id);
    if (!existingEntry) {
      return false;
    }

    const nextMovieId = typeof changes.movieId === 'number' ? changes.movieId : existingEntry.movieId;
    if (!Number.isInteger(nextMovieId) || !this.movieService.getMovieById(nextMovieId)) {
      return false;
    }

    const nextStatus = this.isValidStatus(changes.status) ? changes.status : existingEntry.status;
    if (nextStatus !== 'completed' && this.findActivePlan(nextMovieId, existingEntry.id)) {
      return false;
    }

    const updatedEntry = this.normalizeEntry({
      ...existingEntry,
      ...changes,
      movieId: nextMovieId,
      status: nextStatus,
      id: existingEntry.id,
      createdAt: existingEntry.createdAt,
      updatedAt: new Date()
    });

    this.commitEntries(this.plansSubject.value.map(entry => {
      return entry.id === id ? updatedEntry : this.cloneEntry(entry);
    }));

    return true;
  }

  markCompletedByMovie(movieId: number, completedAt: Date = new Date()): WatchPlanCompletionSnapshot | null {
    const existingActivePlan = this.findActivePlan(movieId);

    if (!existingActivePlan) {
      return null;
    }

    const completionSnapshot = this.createCompletionSnapshot(existingActivePlan);

    const completedEntry = this.normalizeEntry({
      ...existingActivePlan,
      status: 'completed',
      plannedFor: existingActivePlan.plannedFor ?? completedAt,
      updatedAt: completedAt
    });

    this.commitEntries(this.plansSubject.value.map(entry => {
      return entry.id === existingActivePlan.id ? completedEntry : this.cloneEntry(entry);
    }));

    return completionSnapshot;
  }

  restoreCompletionSnapshot(snapshot: WatchPlanCompletionSnapshot): boolean {
    const existingEntry = this.plansSubject.value.find(entry => entry.id === snapshot.id);
    if (!existingEntry) {
      return false;
    }

    if (snapshot.status !== 'completed' && this.findActivePlan(existingEntry.movieId, existingEntry.id)) {
      return false;
    }

    const restoredEntry = this.normalizeEntry({
      ...existingEntry,
      status: snapshot.status,
      plannedFor: snapshot.plannedFor,
      updatedAt: snapshot.updatedAt,
      id: existingEntry.id,
      createdAt: existingEntry.createdAt
    });

    this.commitEntries(this.plansSubject.value.map(entry => {
      return entry.id === existingEntry.id ? restoredEntry : this.cloneEntry(entry);
    }));

    return true;
  }

  removePlan(id: number): boolean {
    const hasTarget = this.plansSubject.value.some(entry => entry.id === id);
    if (!hasTarget) {
      return false;
    }

    this.commitEntries(this.plansSubject.value.filter(entry => entry.id !== id));
    return true;
  }

  replacePlans(entries: WatchPlanEntry[]): void {
    const normalizedEntries = entries
      .map(entry => this.normalizeStoredEntry(entry))
      .filter((entry): entry is WatchPlanEntry => entry !== null);

    this.commitEntries(normalizedEntries);
  }

  private loadPlans(): WatchPlanEntry[] {
    if (typeof localStorage === 'undefined') {
      return this.buildInitialPlans();
    }

    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) {
        return this.buildInitialPlans();
      }

      const parsedValue = JSON.parse(rawValue);
      if (!Array.isArray(parsedValue)) {
        return this.buildInitialPlans();
      }

      const storedPlans = this.sortEntries(parsedValue
        .map(entry => this.normalizeStoredEntry(entry))
        .filter((entry): entry is WatchPlanEntry => entry !== null));

      return storedPlans.length > 0 ? storedPlans : this.buildInitialPlans();
    } catch {
      return this.buildInitialPlans();
    }
  }

  private buildInitialPlans(): WatchPlanEntry[] {
    const now = new Date();
    const daysFromNow = (days: number, hour = 20): Date => {
      const date = new Date(now);
      date.setDate(now.getDate() + days);
      date.setHours(hour, 0, 0, 0);
      return date;
    };
    const daysAgo = (days: number, hour = 22): Date => {
      const date = new Date(now);
      date.setDate(now.getDate() - days);
      date.setHours(hour, 0, 0, 0);
      return date;
    };

    return this.sortEntries([
      this.normalizeEntry({
        id: 1,
        movieId: 6,
        status: 'scheduled',
        priority: 'high',
        plannedFor: daysFromNow(2, 20),
        contextTag: '周末夜场',
        note: '承接第一部的世界观，适合留出完整晚上看完并补一遍幕后资料。',
        createdAt: daysAgo(12, 21),
        updatedAt: daysAgo(1, 20)
      }),
      this.normalizeEntry({
        id: 2,
        movieId: 8,
        status: 'queued',
        priority: 'high',
        plannedFor: null,
        contextTag: '经典补片',
        note: '和黑帮类型片、家族叙事放在一起看，重点关注人物调度和权力关系。',
        createdAt: daysAgo(10, 19),
        updatedAt: daysAgo(3, 22)
      }),
      this.normalizeEntry({
        id: 3,
        movieId: 21,
        status: 'queued',
        priority: 'medium',
        plannedFor: daysFromNow(6, 19),
        contextTag: '音乐主题',
        note: '适合安静环境观看，准备和配乐片单一起整理观后感。',
        createdAt: daysAgo(9, 18),
        updatedAt: daysAgo(4, 21)
      }),
      this.normalizeEntry({
        id: 4,
        movieId: 30,
        status: 'paused',
        priority: 'medium',
        plannedFor: null,
        contextTag: '家庭观影',
        note: '片长较长，等有完整下午再安排，适合和家人一起看。',
        createdAt: daysAgo(8, 20),
        updatedAt: daysAgo(2, 23)
      }),
      this.normalizeEntry({
        id: 5,
        movieId: 36,
        status: 'queued',
        priority: 'low',
        plannedFor: daysFromNow(12, 21),
        contextTag: '作者电影',
        note: '节奏需要耐心，放到不赶时间的晚上。',
        createdAt: daysAgo(6, 22),
        updatedAt: daysAgo(5, 22)
      }),
      this.normalizeEntry({
        id: 6,
        movieId: 44,
        status: 'scheduled',
        priority: 'medium',
        plannedFor: daysFromNow(9, 19),
        contextTag: '轻松放映',
        note: '视效和流行文化彩蛋多，适合放在复习间隙做调剂。',
        createdAt: daysAgo(5, 20),
        updatedAt: daysAgo(1, 18)
      }),
      this.normalizeEntry({
        id: 7,
        movieId: 7,
        status: 'completed',
        priority: 'high',
        plannedFor: daysAgo(14, 20),
        contextTag: '国产科幻',
        note: '已经完成，后续可以把工业化叙事和视效调度写进观影记录。',
        createdAt: daysAgo(20, 18),
        updatedAt: daysAgo(14, 23)
      })
    ]);
  }

  private commitEntries(entries: WatchPlanEntry[]): void {
    const normalizedEntries = this.sortEntries(entries.map(entry => this.normalizeEntry(entry)));
    this.plansSubject.next(normalizedEntries.map(entry => this.cloneEntry(entry)));

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(normalizedEntries));
    }
  }

  private buildNextId(): number {
    return this.plansSubject.value.length > 0
      ? Math.max(...this.plansSubject.value.map(entry => entry.id)) + 1
      : 1;
  }

  private findActivePlan(movieId: number, excludedId?: number): WatchPlanEntry | undefined {
    return this.plansSubject.value.find(entry => {
      return entry.movieId === movieId && entry.status !== 'completed' && entry.id !== excludedId;
    });
  }

  private normalizeDraft(draft: WatchPlanDraft): Omit<WatchPlanEntry, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      movieId: draft.movieId,
      status: this.isValidStatus(draft.status) ? draft.status : 'queued',
      priority: this.isValidPriority(draft.priority) ? draft.priority : 'medium',
      plannedFor: this.coerceDate(draft.plannedFor),
      contextTag: draft.contextTag?.trim() ?? '',
      note: draft.note?.trim() ?? ''
    };
  }

  private normalizeEntry(entry: Partial<WatchPlanEntry>): WatchPlanEntry {
    return {
      id: Number(entry.id ?? 0),
      movieId: Number(entry.movieId ?? 0),
      status: this.isValidStatus(entry.status) ? entry.status : 'queued',
      priority: this.isValidPriority(entry.priority) ? entry.priority : 'medium',
      plannedFor: this.coerceDate(entry.plannedFor),
      contextTag: entry.contextTag?.trim() ?? '',
      note: entry.note?.trim() ?? '',
      createdAt: this.coerceDate(entry.createdAt) ?? new Date(),
      updatedAt: this.coerceDate(entry.updatedAt) ?? new Date()
    };
  }

  private normalizeStoredEntry(entry: Partial<WatchPlanEntry> | null | undefined): WatchPlanEntry | null {
    if (!entry || typeof entry.id !== 'number' || typeof entry.movieId !== 'number') {
      return null;
    }

    return this.normalizeEntry(entry);
  }

  private sortEntries(entries: WatchPlanEntry[]): WatchPlanEntry[] {
    return [...entries].sort((first, second) => {
      const statusDiff = STATUS_ORDER[first.status] - STATUS_ORDER[second.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }

      const plannedForDiff = this.compareOptionalDates(first.plannedFor, second.plannedFor);
      if (plannedForDiff !== 0) {
        return plannedForDiff;
      }

      const priorityDiff = PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority];
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return second.updatedAt.getTime() - first.updatedAt.getTime();
    });
  }

  private compareOptionalDates(first: Date | null, second: Date | null): number {
    if (first && second) {
      return first.getTime() - second.getTime();
    }

    if (first) {
      return -1;
    }

    if (second) {
      return 1;
    }

    return 0;
  }

  private createCompletionSnapshot(entry: WatchPlanEntry): WatchPlanCompletionSnapshot {
    return {
      id: entry.id,
      status: entry.status,
      plannedFor: entry.plannedFor ? new Date(entry.plannedFor) : null,
      updatedAt: new Date(entry.updatedAt)
    };
  }

  private cloneEntry(entry: WatchPlanEntry): WatchPlanEntry {
    return {
      ...entry,
      plannedFor: entry.plannedFor ? new Date(entry.plannedFor) : null,
      createdAt: new Date(entry.createdAt),
      updatedAt: new Date(entry.updatedAt)
    };
  }

  private coerceDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? new Date(value) : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private isValidStatus(value: WatchPlanStatus | undefined): value is WatchPlanStatus {
    return value === 'queued' || value === 'scheduled' || value === 'paused' || value === 'completed';
  }

  private isValidPriority(value: WatchPlanPriority | undefined): value is WatchPlanPriority {
    return value === 'high' || value === 'medium' || value === 'low';
  }
}
