import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { ListPagerComponent } from '../../components/list-pager/list-pager.component';
import { Movie } from '../../models/movie';
import { MessageService } from '../../services/message.service';
import { MovieService } from '../../services/movie.service';
import { MovieListViewModel, MovieStateService } from '../../services/movie-state.service';
import {
  DEFAULT_MOVIE_QUERY_STATE,
  MOVIE_PAGE_SIZE_OPTIONS,
  MOVIE_SORT_OPTIONS,
  MOVIE_VIEW_OPTIONS,
  MovieQueryState,
  toMovieQueryParams
} from '../../utils/movie-query';

@Component({
  selector: 'app-movie-list-page',
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
    MatSnackBarModule,
    ListPagerComponent
  ],
  templateUrl: './movie-list-page.component.html',
  styleUrl: './movie-list-page.component.scss'
})
export class MovieListPageComponent {
  readonly vm$: Observable<MovieListViewModel>;

  readonly sortOptions = MOVIE_SORT_OPTIONS;
  readonly viewOptions = MOVIE_VIEW_OPTIONS;
  readonly pageSizeOptions = MOVIE_PAGE_SIZE_OPTIONS;

  constructor(
    private movieStateService: MovieStateService,
    private movieService: MovieService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private messageService: MessageService
  ) {
    this.vm$ = this.movieStateService.movieListVm$(this.route.queryParamMap);
  }

  updateQueryState(currentState: MovieQueryState, patch: Partial<MovieQueryState>): void {
    const shouldResetPage = [
      'search',
      'genre',
      'sort',
      'watched',
      'favorite',
      'view',
      'pageSize'
    ].some(field => Object.prototype.hasOwnProperty.call(patch, field))
      && !Object.prototype.hasOwnProperty.call(patch, 'page');

    const nextState: MovieQueryState = {
      ...currentState,
      ...patch,
      page: shouldResetPage ? 1 : patch.page ?? currentState.page
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toMovieQueryParams(nextState),
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  clearFilters(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toMovieQueryParams({ ...DEFAULT_MOVIE_QUERY_STATE }),
      replaceUrl: true
    });
  }

  changePage(currentState: MovieQueryState, page: number): void {
    this.updateQueryState(currentState, { page });
  }

  changePageSize(currentState: MovieQueryState, pageSize: number): void {
    this.updateQueryState(currentState, { pageSize, page: 1 });
  }

  toggleFavorite(movie: Movie): void {
    this.movieService.toggleFavorite(movie.id);
    this.messageService.info(
      movie.isFavorite ? `已将《${movie.title}》移出收藏中心。` : `已将《${movie.title}》加入收藏中心。`,
      'Movies'
    );
  }

  toggleWatched(movie: Movie): void {
    this.movieService.toggleWatched(movie.id);
    this.messageService.info(
      movie.isWatched ? `已把《${movie.title}》标记为未观影。` : `已把《${movie.title}》标记为已观影。`,
      'Movies'
    );
  }

  deleteMovie(movie: Movie): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '确认删除电影',
        message: `确定要删除《${movie.title}》吗？此操作会直接影响 Movies、Explore、Favorites 与其他增强模块中的数据。`,
        confirmLabel: '删除',
        cancelLabel: '保留',
        tone: 'danger'
      },
      panelClass: 'cf-dialog-panel'
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed) {
        return;
      }

      const success = this.movieService.deleteMovie(movie.id);
      if (success) {
        this.messageService.success(`已删除《${movie.title}》，Movies 与增强页会同步刷新。`, 'Movies');
      } else {
        this.messageService.error(`删除《${movie.title}》失败：电影不存在。`, 'Movies');
      }
      this.snackBar.open(success ? `已删除：${movie.title}` : '删除失败：电影不存在', '关闭', {
        duration: 3000
      });
    });
  }

  trackByMovieId(index: number, movie: Movie): number {
    return movie.id;
  }
}
