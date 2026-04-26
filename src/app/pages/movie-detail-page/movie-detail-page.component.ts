import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { distinctUntilChanged, filter, map, Observable, shareReplay, startWith } from 'rxjs';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { RecentHistoryComponent } from '../../components/recent-history/recent-history.component';
import { Movie } from '../../models/movie';
import { MessageService } from '../../services/message.service';
import { MovieDetailViewModel, MovieStateService } from '../../services/movie-state.service';
import { MovieService } from '../../services/movie.service';
import { RecentHistoryService } from '../../services/recent-history.service';
import {
  applyBackdropDisplayFallback,
  applyMovieImageFallback,
  getBackdropDisplayUrl
} from '../../utils/movie-media';

@Component({
  selector: 'app-movie-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    RecentHistoryComponent
  ],
  templateUrl: './movie-detail-page.component.html',
  styleUrl: './movie-detail-page.component.scss'
})
export class MovieDetailPageComponent {
  readonly currentSection$: Observable<'info' | 'cast'> = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd),
    startWith(null),
    map(() => this.route.firstChild?.snapshot?.url?.[0]?.path === 'cast' ? 'cast' : 'info'),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$ = this.movieStateService.movieDetailVm$(this.route.paramMap, this.currentSection$);

  private lastRecordedKey = '';
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private movieStateService: MovieStateService,
    private movieService: MovieService,
    private recentHistoryService: RecentHistoryService,
    private messageService: MessageService
  ) {
    this.vm$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(vm => {
        this.recordCurrentVisit(vm);
      });
  }

  getBackdropUrl(movie: Movie): string | null {
    return getBackdropDisplayUrl(movie);
  }

  goBack(): void {
    void this.router.navigate(['/movies']);
  }

  toggleFavorite(movie: Movie): void {
    this.movieService.toggleFavorite(movie.id);
    this.messageService.info(
      movie.isFavorite ? `已取消收藏《${movie.title}》。` : `已把《${movie.title}》加入收藏中心。`,
      '电影详情'
    );
  }

  toggleWatched(movie: Movie): void {
    this.movieService.toggleWatched(movie.id);
    this.messageService.info(
      movie.isWatched ? `已把《${movie.title}》恢复为未观影状态。` : `已把《${movie.title}》标记为已观影。`,
      '电影详情'
    );
  }

  deleteMovie(movie: Movie): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '确认删除当前电影',
        message: `删除《${movie.title}》后，电影库、探索影库、收藏中心和其他扩展页面中的对应条目都会消失。`,
        confirmLabel: '删除电影',
        cancelLabel: '取消',
        tone: 'danger'
      },
      panelClass: 'cf-dialog-panel'
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      const deletedTitle = movie.title;
      const success = this.movieService.deleteMovie(movie.id);
      if (success) {
        this.messageService.success(`已删除《${deletedTitle}》，详情上下文已返回电影库。`, '电影详情');
        this.snackBar.open(`已删除：${deletedTitle}`, '关闭', { duration: 3000 });
        void this.router.navigate(['/movies']);
      } else {
        this.messageService.error(`删除《${deletedTitle}》失败：电影不存在。`, '电影详情');
        this.snackBar.open('删除失败：电影不存在', '关闭', { duration: 3000 });
      }
    });
  }

  onPosterError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  onBackdropError(event: Event, movie: Movie): void {
    applyBackdropDisplayFallback(event, movie);
  }

  onRecommendationPosterError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  private recordCurrentVisit(vm: MovieDetailViewModel): void {
    if (!vm.movie) {
      return;
    }

    const currentKey = `${vm.movie.id}-${vm.currentSection}-${this.router.url}`;
    if (currentKey === this.lastRecordedKey) {
      return;
    }

    this.lastRecordedKey = currentKey;
    this.recentHistoryService.recordVisit(vm.movie, vm.currentSection);
  }
}
