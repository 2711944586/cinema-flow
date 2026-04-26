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
import {
  DEFAULT_SMART_PICK_CRITERIA,
  ViewingPreset,
  ViewingPresetDraft
} from '../../models/viewing-preset';
import { MessageService } from '../../services/message.service';
import { MovieService } from '../../services/movie.service';
import { SmartPickResult, SmartPicksService } from '../../services/smart-picks.service';
import { WatchPlanService } from '../../services/watch-plan.service';

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
}

interface RecommendationViewItem extends SmartPickResult {
  inWatchlist: boolean;
}

interface SmartPicksViewModel {
  summaryCards: SummaryCard[];
  presets: ViewingPreset[];
  recommendations: RecommendationViewItem[];
  genres: string[];
  languages: string[];
}

@Component({
  selector: 'app-smart-picks',
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
  templateUrl: './smart-picks.component.html',
  styleUrl: './smart-picks.component.scss'
})
export class SmartPicksComponent {
  private readonly criteriaSubject = new BehaviorSubject<ViewingPresetDraft>(this.createDraft());

  readonly vm$ = combineLatest([
    this.smartPicksService.presets$,
    this.movieService.movies$,
    this.watchPlanService.plans$,
    this.criteriaSubject
  ]).pipe(
    map(([presets, movies, plans, draft]): SmartPicksViewModel => {
      const activePlanMovieIds = new Set(plans
        .filter(entry => entry.status !== 'completed')
        .map(entry => entry.movieId));
      const genres = Array.from(new Set(movies.flatMap(movie => movie.genres)))
        .sort((first, second) => first.localeCompare(second, 'zh-CN'));
      const languages = Array.from(new Set(movies
        .map(movie => movie.language?.trim() ?? '')
        .filter(language => language.length > 0)))
        .sort((first, second) => first.localeCompare(second, 'zh-CN'));

      return {
        summaryCards: [
          {
            label: '预设总数',
            value: String(presets.length),
            hint: '当前已保存的智能选片预设数量'
          },
          {
            label: '推荐结果',
            value: String(this.smartPicksService.getRecommendations(draft, 6).length),
            hint: '按当前条件计算出的候选电影数'
          },
          {
            label: '待看片单模式',
            value: draft.onlyWatchlist ? '开启' : '关闭',
            hint: '是否只从待看片单中挑选电影'
          },
          {
            label: '收藏偏置',
            value: draft.preferFavorites ? '偏爱收藏' : '中性',
            hint: '是否优先推荐你已收藏的电影'
          }
        ],
        presets,
        recommendations: this.smartPicksService.getRecommendations(draft, 6).map(result => ({
          ...result,
          inWatchlist: activePlanMovieIds.has(result.movie.id)
        })),
        genres,
        languages
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  draft = this.createDraft();

  constructor(
    private movieService: MovieService,
    private smartPicksService: SmartPicksService,
    private watchPlanService: WatchPlanService,
    private messageService: MessageService
  ) {}

  updateDraft(patch: Partial<ViewingPresetDraft>): void {
    this.draft = this.cloneDraft({
      ...this.draft,
      ...patch,
      includeGenres: patch.includeGenres ?? this.draft.includeGenres,
      excludeGenres: patch.excludeGenres ?? this.draft.excludeGenres,
      preferredLanguages: patch.preferredLanguages ?? this.draft.preferredLanguages
    });
    this.criteriaSubject.next(this.cloneDraft(this.draft));
  }

  updateMaxDuration(rawValue: string | number | null): void {
    if (rawValue === '' || rawValue === null) {
      this.updateDraft({ maxDuration: null });
      return;
    }

    const numericValue = Number(rawValue);
    this.updateDraft({ maxDuration: Number.isFinite(numericValue) ? numericValue : null });
  }

  updateMinRating(rawValue: string | number): void {
    const numericValue = Number(rawValue);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    this.updateDraft({ minRating: numericValue });
  }

  applyPreset(preset: ViewingPreset): void {
    this.draft = this.cloneDraft({
      id: preset.id,
      name: preset.name,
      maxDuration: preset.maxDuration,
      minRating: preset.minRating,
      includeGenres: preset.includeGenres,
      excludeGenres: preset.excludeGenres,
      allowWatched: preset.allowWatched,
      preferFavorites: preset.preferFavorites,
      onlyWatchlist: preset.onlyWatchlist,
      preferredLanguages: preset.preferredLanguages
    });
    this.criteriaSubject.next(this.cloneDraft(this.draft));
    this.messageService.info(`已套用智能选片预设：${preset.name}。`, '智能选片');
  }

  savePreset(): void {
    const result = this.smartPicksService.savePreset(this.cloneDraft(this.draft));
    if (!result.ok) {
      this.messageService.error(result.error, '智能选片');
      return;
    }

    this.draft = this.cloneDraft({
      id: result.preset.id,
      name: result.preset.name,
      maxDuration: result.preset.maxDuration,
      minRating: result.preset.minRating,
      includeGenres: result.preset.includeGenres,
      excludeGenres: result.preset.excludeGenres,
      allowWatched: result.preset.allowWatched,
      preferFavorites: result.preset.preferFavorites,
      onlyWatchlist: result.preset.onlyWatchlist,
      preferredLanguages: result.preset.preferredLanguages
    });
    this.criteriaSubject.next(this.cloneDraft(this.draft));
    this.messageService.success(
      result.created ? `已保存新的智能选片预设：${result.preset.name}。` : `已更新智能选片预设：${result.preset.name}。`,
      '智能选片'
    );
  }

  deletePreset(preset: ViewingPreset): void {
    const removed = this.smartPicksService.deletePreset(preset.id);
    if (!removed) {
      this.messageService.error('删除智能选片预设失败，请刷新后重试。', '智能选片');
      return;
    }

    if (this.draft.id === preset.id) {
      this.resetDraft();
    }

    this.messageService.warning(`已删除智能选片预设：${preset.name}。`, '智能选片');
  }

  addToWatchPlan(result: RecommendationViewItem): void {
    const planResult = this.watchPlanService.savePlan({
      movieId: result.movie.id,
      status: 'queued',
      priority: 'high',
      contextTag: `智能选片 · ${this.draft.name.trim() || '未命名预设'}`,
      note: `由智能选片推荐，综合得分 ${result.score}。`
    });

    if (!planResult.ok) {
      this.messageService.error(planResult.error, '智能选片');
      return;
    }

    this.messageService.success(
      planResult.created
        ? `已把《${result.movie.title}》加入待看片单。`
        : `已更新《${result.movie.title}》在待看片单中的安排。`,
      '智能选片'
    );
  }

  resetDraft(): void {
    this.draft = this.createDraft();
    this.criteriaSubject.next(this.cloneDraft(this.draft));
  }

  trackByPresetId(index: number, preset: ViewingPreset): number {
    return preset.id;
  }

  trackByMovieId(index: number, result: RecommendationViewItem): number {
    return result.movie.id;
  }

  private createDraft(): ViewingPresetDraft {
    return {
      id: undefined,
      name: '今晚放映',
      maxDuration: DEFAULT_SMART_PICK_CRITERIA.maxDuration,
      minRating: DEFAULT_SMART_PICK_CRITERIA.minRating,
      includeGenres: [...DEFAULT_SMART_PICK_CRITERIA.includeGenres],
      excludeGenres: [...DEFAULT_SMART_PICK_CRITERIA.excludeGenres],
      allowWatched: DEFAULT_SMART_PICK_CRITERIA.allowWatched,
      preferFavorites: DEFAULT_SMART_PICK_CRITERIA.preferFavorites,
      onlyWatchlist: DEFAULT_SMART_PICK_CRITERIA.onlyWatchlist,
      preferredLanguages: [...DEFAULT_SMART_PICK_CRITERIA.preferredLanguages]
    };
  }

  private cloneDraft(draft: ViewingPresetDraft): ViewingPresetDraft {
    return {
      ...draft,
      includeGenres: [...draft.includeGenres],
      excludeGenres: [...draft.excludeGenres],
      preferredLanguages: [...draft.preferredLanguages]
    };
  }
}
