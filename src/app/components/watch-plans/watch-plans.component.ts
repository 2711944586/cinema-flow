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
import { ListPagerComponent } from '../list-pager/list-pager.component';
import { Movie } from '../../models/movie';
import { WatchPlanEntry, WatchPlanPriority, WatchPlanStatus } from '../../models/watch-plan';
import { MessageService } from '../../services/message.service';
import { MovieService } from '../../services/movie.service';
import { WatchPlanService } from '../../services/watch-plan.service';
import { formatDateInputValue } from '../../utils/movie-media';
import { paginateItems } from '../../utils/pagination';

interface SummaryCard {
  label: string;
  value: string;
  hint: string;
}

interface PlanViewItem {
  entry: WatchPlanEntry;
  movie: Movie;
  statusLabel: string;
  priorityLabel: string;
  plannedForLabel: string;
}

interface MovieOption {
  movie: Movie;
  hasActivePlan: boolean;
}

interface PlanFormState {
  id?: number;
  movieId: number | null;
  status: WatchPlanStatus;
  priority: WatchPlanPriority;
  plannedFor: string;
  contextTag: string;
  note: string;
}

interface WatchPlansViewModel {
  summaryCards: SummaryCard[];
  visiblePlans: PlanViewItem[];
  movieOptions: MovieOption[];
  statusFilter: 'all' | WatchPlanStatus;
  totalVisiblePlans: number;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
}

const STATUS_LABELS: Record<WatchPlanStatus, string> = {
  queued: '待安排',
  scheduled: '已排期',
  paused: '暂缓',
  completed: '已完成'
};

const PRIORITY_LABELS: Record<WatchPlanPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级'
};

@Component({
  selector: 'app-watch-plans',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ListPagerComponent
  ],
  templateUrl: './watch-plans.component.html',
  styleUrl: './watch-plans.component.scss'
})
export class WatchPlansComponent {
  private readonly statusFilterSubject = new BehaviorSubject<'all' | WatchPlanStatus>('all');
  private readonly currentPageSubject = new BehaviorSubject<number>(1);
  private readonly pageSizeSubject = new BehaviorSubject<number>(6);
  private readonly pageSizeOptions = [6, 12, 24];

  readonly statusOptions: Array<{ value: WatchPlanStatus; label: string }> = [
    { value: 'queued', label: STATUS_LABELS.queued },
    { value: 'scheduled', label: STATUS_LABELS.scheduled },
    { value: 'paused', label: STATUS_LABELS.paused },
    { value: 'completed', label: STATUS_LABELS.completed }
  ];

  readonly priorityOptions: Array<{ value: WatchPlanPriority; label: string }> = [
    { value: 'high', label: PRIORITY_LABELS.high },
    { value: 'medium', label: PRIORITY_LABELS.medium },
    { value: 'low', label: PRIORITY_LABELS.low }
  ];

  readonly vm$ = combineLatest([
    this.watchPlanService.plans$,
    this.movieService.movies$,
    this.statusFilterSubject,
    this.currentPageSubject,
    this.pageSizeSubject
  ]).pipe(
    map(([plans, movies, statusFilter, currentPage, pageSize]): WatchPlansViewModel => {
      const activePlanMovieIds = new Set(plans
        .filter(entry => entry.status !== 'completed')
        .map(entry => entry.movieId));
      const movieMap = new Map(movies.map(movie => [movie.id, movie]));
      const allPlanItems = plans
        .map(entry => {
          const movie = movieMap.get(entry.movieId);
          if (!movie) {
            return null;
          }

          return {
            entry,
            movie,
            statusLabel: STATUS_LABELS[entry.status],
            priorityLabel: PRIORITY_LABELS[entry.priority],
            plannedForLabel: entry.plannedFor ? formatDateInputValue(entry.plannedFor) : '待定档'
          } satisfies PlanViewItem;
        })
        .filter((item): item is PlanViewItem => item !== null);

      const visiblePlans = statusFilter === 'all'
        ? allPlanItems
        : allPlanItems.filter(item => item.entry.status === statusFilter);
      const pagination = paginateItems(visiblePlans, currentPage, pageSize);

      return {
        summaryCards: [
          {
            label: '活跃计划',
            value: String(plans.filter(entry => entry.status !== 'completed').length),
            hint: '仍在排期中的电影数量'
          },
          {
            label: '已排期',
            value: String(plans.filter(entry => entry.status === 'scheduled').length),
            hint: '明确安排了观看日期的项目'
          },
          {
            label: '高优先级',
            value: String(plans.filter(entry => entry.priority === 'high' && entry.status !== 'completed').length),
            hint: '当前最值得优先安排的片单'
          },
          {
            label: '已完成',
            value: String(plans.filter(entry => entry.status === 'completed').length),
            hint: '已经通过观影或手动结束的计划'
          }
        ],
        visiblePlans: pagination.items,
        movieOptions: [...movies]
          .sort((first, second) => second.rating - first.rating || first.title.localeCompare(second.title, 'zh-CN'))
          .map(movie => ({
            movie,
            hasActivePlan: activePlanMovieIds.has(movie.id)
          })),
        statusFilter,
        totalVisiblePlans: visiblePlans.length,
        page: pagination.page,
        pageSize: pagination.pageSize,
        pageSizeOptions: this.pageSizeOptions
      };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  draft = this.createDraft();

  constructor(
    private movieService: MovieService,
    private watchPlanService: WatchPlanService,
    private messageService: MessageService
  ) {}

  setStatusFilter(status: 'all' | WatchPlanStatus): void {
    this.statusFilterSubject.next(status);
    this.currentPageSubject.next(1);
  }

  get isEditing(): boolean {
    return typeof this.draft.id === 'number';
  }

  savePlan(): void {
    if (!this.draft.movieId) {
      this.messageService.warning('请先选择要加入待看片单的电影。', 'Watch Plans');
      return;
    }

    const result = this.watchPlanService.savePlan({
      id: this.draft.id,
      movieId: this.draft.movieId,
      status: this.draft.status,
      priority: this.draft.priority,
      plannedFor: this.toDate(this.draft.plannedFor),
      contextTag: this.draft.contextTag,
      note: this.draft.note
    });

    if (!result.ok) {
      this.messageService.error(result.error, 'Watch Plans');
      return;
    }

    const movie = this.movieService.getMovieById(result.entry.movieId);
    const targetTitle = movie?.title ?? `#${result.entry.movieId}`;
    this.messageService.success(
      result.created
        ? `已把《${targetTitle}》加入待看片单。`
        : `已更新《${targetTitle}》的观影计划。`,
      'Watch Plans'
    );
    this.currentPageSubject.next(1);
    this.resetDraft();
  }

  editPlan(item: PlanViewItem): void {
    this.draft = {
      id: item.entry.id,
      movieId: item.entry.movieId,
      status: item.entry.status,
      priority: item.entry.priority,
      plannedFor: item.entry.plannedFor ? formatDateInputValue(item.entry.plannedFor) : '',
      contextTag: item.entry.contextTag,
      note: item.entry.note
    };
    this.messageService.info(`已载入《${item.movie.title}》的计划，可直接修改后保存。`, 'Watch Plans');
  }

  updatePlanStatus(entry: WatchPlanEntry, status: WatchPlanStatus): void {
    const updated = this.watchPlanService.updatePlan(entry.id, {
      status,
      plannedFor: status === 'scheduled' && !entry.plannedFor ? new Date() : entry.plannedFor
    });

    if (!updated) {
      this.messageService.error('更新待看片单状态失败，请刷新后重试。', 'Watch Plans');
      return;
    }

    const movie = this.movieService.getMovieById(entry.movieId);
    this.messageService.info(
      `《${movie?.title ?? `#${entry.movieId}` }》已切换为“${STATUS_LABELS[status]}”。`,
      'Watch Plans'
    );
  }

  removePlan(entry: WatchPlanEntry): void {
    const removed = this.watchPlanService.removePlan(entry.id);
    if (!removed) {
      this.messageService.error('删除待看片单失败：该条目不存在。', 'Watch Plans');
      return;
    }

    if (this.draft.id === entry.id) {
      this.resetDraft();
    }

    const movie = this.movieService.getMovieById(entry.movieId);
    this.messageService.warning(`已将《${movie?.title ?? `#${entry.movieId}` }》移出待看片单。`, 'Watch Plans');
  }

  resetDraft(): void {
    this.draft = this.createDraft();
  }

  trackByPlanId(index: number, item: PlanViewItem): number {
    return item.entry.id;
  }

  setPage(page: number): void {
    this.currentPageSubject.next(page);
  }

  setPageSize(pageSize: number): void {
    this.pageSizeSubject.next(pageSize);
    this.currentPageSubject.next(1);
  }

  private createDraft(): PlanFormState {
    return {
      id: undefined,
      movieId: null,
      status: 'queued',
      priority: 'medium',
      plannedFor: '',
      contextTag: '',
      note: ''
    };
  }

  private toDate(value: string): Date | null {
    return value ? new Date(`${value}T00:00:00`) : null;
  }
}
