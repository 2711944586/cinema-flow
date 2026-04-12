import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Movie } from '../models/movie';
import {
  DEFAULT_SMART_PICK_CRITERIA,
  SmartPickCriteria,
  ViewingPreset,
  ViewingPresetDraft
} from '../models/viewing-preset';
import { MovieService } from './movie.service';
import { WatchPlanService } from './watch-plan.service';

export interface SmartPickResult {
  movie: Movie;
  score: number;
  reasons: string[];
}

@Injectable({ providedIn: 'root' })
export class SmartPicksService {
  private readonly storageKey = 'cinemaflow.smart-picks.presets.v1';
  private readonly presetsSubject = new BehaviorSubject<ViewingPreset[]>(this.loadPresets());

  readonly presets$ = this.presetsSubject.asObservable();

  constructor(
    private movieService: MovieService,
    private watchPlanService: WatchPlanService
  ) {}

  getPresets(): ViewingPreset[] {
    return this.presetsSubject.value.map(preset => this.clonePreset(preset));
  }

  getPresetById(id: number): ViewingPreset | undefined {
    return this.getPresets().find(preset => preset.id === id);
  }

  savePreset(draft: ViewingPresetDraft):
    | { ok: true; preset: ViewingPreset; created: boolean }
    | { ok: false; error: string } {
    const normalizedName = draft.name?.trim() ?? '';
    if (!normalizedName) {
      return { ok: false, error: '请先为智能选片预设命名。' };
    }

    const normalizedCriteria = this.normalizeCriteria(draft);
    const existingPreset = typeof draft.id === 'number'
      ? this.presetsSubject.value.find(preset => preset.id === draft.id)
      : undefined;

    if (existingPreset) {
      const updatedPreset = this.normalizePreset({
        ...existingPreset,
        ...normalizedCriteria,
        name: normalizedName,
        updatedAt: new Date()
      });

      this.commitPresets(this.presetsSubject.value.map(preset => {
        return preset.id === existingPreset.id ? updatedPreset : this.clonePreset(preset);
      }));

      return { ok: true, preset: this.clonePreset(updatedPreset), created: false };
    }

    const nextPreset = this.normalizePreset({
      id: this.buildNextId(),
      name: normalizedName,
      ...normalizedCriteria,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.commitPresets([nextPreset, ...this.presetsSubject.value]);
    return { ok: true, preset: this.clonePreset(nextPreset), created: true };
  }

  deletePreset(id: number): boolean {
    const hasTarget = this.presetsSubject.value.some(preset => preset.id === id);
    if (!hasTarget) {
      return false;
    }

    this.commitPresets(this.presetsSubject.value.filter(preset => preset.id !== id));
    return true;
  }

  replacePresets(presets: ViewingPreset[]): void {
    const normalizedPresets = presets
      .map(preset => this.normalizeStoredPreset(preset))
      .filter((preset): preset is ViewingPreset => preset !== null);

    this.commitPresets(normalizedPresets);
  }

  getRecommendations(criteria: SmartPickCriteria, limit = 6): SmartPickResult[] {
    const normalizedCriteria = this.normalizeCriteria(criteria);
    const activePlanMovieIds = new Set(this.watchPlanService.getActivePlans().map(plan => plan.movieId));
    const availableMovies = this.movieService.getMovies();

    return availableMovies
      .filter(movie => normalizedCriteria.allowWatched || !movie.isWatched)
      .filter(movie => normalizedCriteria.maxDuration === null || movie.duration <= normalizedCriteria.maxDuration)
      .filter(movie => movie.rating >= normalizedCriteria.minRating)
      .filter(movie => normalizedCriteria.includeGenres.length === 0
        || normalizedCriteria.includeGenres.some(genre => movie.genres.includes(genre)))
      .filter(movie => normalizedCriteria.excludeGenres.every(genre => !movie.genres.includes(genre)))
      .filter(movie => normalizedCriteria.preferredLanguages.length === 0
        || (movie.language ? normalizedCriteria.preferredLanguages.includes(movie.language) : false))
      .filter(movie => !normalizedCriteria.onlyWatchlist || activePlanMovieIds.has(movie.id))
      .map(movie => this.scoreMovie(movie, normalizedCriteria, activePlanMovieIds))
      .sort((first, second) => {
        return second.score - first.score
          || Number(!!second.movie.isFavorite) - Number(!!first.movie.isFavorite)
          || Number(!second.movie.isWatched) - Number(!first.movie.isWatched)
          || second.movie.rating - first.movie.rating
          || first.movie.duration - second.movie.duration;
      })
      .slice(0, limit)
      .map(result => ({
        movie: result.movie,
        score: Math.round(result.score * 10) / 10,
        reasons: result.reasons
      }));
  }

  private loadPresets(): ViewingPreset[] {
    if (typeof localStorage === 'undefined') {
      return this.buildDefaultPresets();
    }

    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) {
        return this.buildDefaultPresets();
      }

      const parsedValue = JSON.parse(rawValue);
      if (!Array.isArray(parsedValue)) {
        return this.buildDefaultPresets();
      }

      const normalizedPresets = parsedValue
        .map(preset => this.normalizeStoredPreset(preset))
        .filter((preset): preset is ViewingPreset => preset !== null);

      return normalizedPresets.length > 0 ? this.sortPresets(normalizedPresets) : this.buildDefaultPresets();
    } catch {
      return this.buildDefaultPresets();
    }
  }

  private commitPresets(presets: ViewingPreset[]): void {
    const normalizedPresets = this.sortPresets(presets.map(preset => this.normalizePreset(preset)));
    this.presetsSubject.next(normalizedPresets.map(preset => this.clonePreset(preset)));

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(normalizedPresets));
    }
  }

  private buildDefaultPresets(): ViewingPreset[] {
    const seedTime = new Date();

    return this.sortPresets([
      this.normalizePreset({
        id: 1,
        name: '工作日晚场',
        maxDuration: 120,
        minRating: 7.5,
        includeGenres: [],
        excludeGenres: [],
        allowWatched: false,
        preferFavorites: false,
        onlyWatchlist: false,
        preferredLanguages: [],
        createdAt: seedTime,
        updatedAt: seedTime
      }),
      this.normalizePreset({
        id: 2,
        name: '待看片单优先',
        maxDuration: null,
        minRating: 7.8,
        includeGenres: [],
        excludeGenres: [],
        allowWatched: false,
        preferFavorites: true,
        onlyWatchlist: true,
        preferredLanguages: [],
        createdAt: seedTime,
        updatedAt: seedTime
      }),
      this.normalizePreset({
        id: 3,
        name: '高分收藏夜',
        maxDuration: 180,
        minRating: 8.5,
        includeGenres: [],
        excludeGenres: [],
        allowWatched: true,
        preferFavorites: true,
        onlyWatchlist: false,
        preferredLanguages: [],
        createdAt: seedTime,
        updatedAt: seedTime
      })
    ]);
  }

  private buildNextId(): number {
    return this.presetsSubject.value.length > 0
      ? Math.max(...this.presetsSubject.value.map(preset => preset.id)) + 1
      : 1;
  }

  private scoreMovie(
    movie: Movie,
    criteria: SmartPickCriteria,
    activePlanMovieIds: Set<number>
  ): SmartPickResult {
    const reasons: string[] = [];
    let score = movie.rating * 10;

    const matchedGenres = criteria.includeGenres.filter(genre => movie.genres.includes(genre));
    if (matchedGenres.length > 0) {
      score += matchedGenres.length * 8;
      reasons.push(`匹配类型：${matchedGenres.join(' / ')}`);
    }

    if (criteria.preferredLanguages.length > 0 && movie.language && criteria.preferredLanguages.includes(movie.language)) {
      score += 6;
      reasons.push(`语言符合偏好：${movie.language}`);
    }

    if (!movie.isWatched) {
      score += 6;
      reasons.push('尚未观看，适合这次优先解锁');
    }

    if (activePlanMovieIds.has(movie.id)) {
      score += 12;
      reasons.push('已经在待看片单中，可直接安排');
    }

    if (criteria.preferFavorites && movie.isFavorite) {
      score += 10;
      reasons.push('已收藏，优先级更高');
    }

    if (criteria.maxDuration !== null) {
      const spareMinutes = criteria.maxDuration - movie.duration;
      if (spareMinutes >= 0) {
        score += Math.max(2, Math.min(10, Math.round(spareMinutes / 20) + 2));
        reasons.push(`片长 ${movie.duration} 分钟，落在时长预算内`);
      }
    }

    if (movie.userRating != null) {
      score += movie.userRating;
      reasons.push('你曾经给过个人评分信号');
    }

    if (movie.rating >= criteria.minRating + 1) {
      score += 4;
      reasons.push('口碑明显高于当前门槛');
    }

    return {
      movie,
      score,
      reasons: [...new Set(reasons)].slice(0, 4).length > 0
        ? [...new Set(reasons)].slice(0, 4)
        : ['综合评分、时长与可安排性表现均衡']
    };
  }

  private normalizeCriteria(criteria: Partial<SmartPickCriteria>): SmartPickCriteria {
    return {
      maxDuration: this.normalizeDuration(criteria.maxDuration),
      minRating: this.normalizeMinRating(criteria.minRating),
      includeGenres: this.normalizeStringList(criteria.includeGenres),
      excludeGenres: this.normalizeStringList(criteria.excludeGenres),
      allowWatched: !!criteria.allowWatched,
      preferFavorites: criteria.preferFavorites ?? DEFAULT_SMART_PICK_CRITERIA.preferFavorites,
      onlyWatchlist: !!criteria.onlyWatchlist,
      preferredLanguages: this.normalizeStringList(criteria.preferredLanguages)
    };
  }

  private normalizePreset(preset: Partial<ViewingPreset>): ViewingPreset {
    return {
      id: Number(preset.id ?? 0),
      name: preset.name?.trim() ?? '未命名预设',
      ...this.normalizeCriteria(preset),
      createdAt: this.coerceDate(preset.createdAt) ?? new Date(),
      updatedAt: this.coerceDate(preset.updatedAt) ?? new Date()
    };
  }

  private normalizeStoredPreset(preset: Partial<ViewingPreset> | null | undefined): ViewingPreset | null {
    if (!preset || typeof preset.id !== 'number' || !preset.name) {
      return null;
    }

    return this.normalizePreset(preset);
  }

  private sortPresets(presets: ViewingPreset[]): ViewingPreset[] {
    return [...presets].sort((first, second) => second.updatedAt.getTime() - first.updatedAt.getTime());
  }

  private clonePreset(preset: ViewingPreset): ViewingPreset {
    return {
      ...preset,
      includeGenres: [...preset.includeGenres],
      excludeGenres: [...preset.excludeGenres],
      preferredLanguages: [...preset.preferredLanguages],
      createdAt: new Date(preset.createdAt),
      updatedAt: new Date(preset.updatedAt)
    };
  }

  private normalizeDuration(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return null;
    }

    return Math.round(numericValue);
  }

  private normalizeMinRating(value: unknown): number {
    const numericValue = Number(value ?? DEFAULT_SMART_PICK_CRITERIA.minRating);
    if (!Number.isFinite(numericValue)) {
      return DEFAULT_SMART_PICK_CRITERIA.minRating;
    }

    return Math.min(10, Math.max(0, Math.round(numericValue * 10) / 10));
  }

  private normalizeStringList(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return Array.from(new Set(value
      .map(item => typeof item === 'string' ? item.trim() : '')
      .filter(item => item.length > 0)));
  }

  private coerceDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    const date = value instanceof Date ? new Date(value) : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
  }
}