import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import {
  collectMovieGenres,
  DEFAULT_MOVIE_QUERY_STATE,
  filterMoviesByQueryState,
  MOVIE_SORT_OPTIONS,
  MOVIE_VIEW_OPTIONS,
  MovieQueryState,
  toMovieQueryParams,
  parseMovieQueryState
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
    MatSnackBarModule
  ],
  templateUrl: './movie-list-page.component.html',
  styleUrl: './movie-list-page.component.scss'
})
export class MovieListPageComponent {
  movies: Movie[] = [];
  filteredMovies: Movie[] = [];
  genres: string[] = [];
  queryState: MovieQueryState = { ...DEFAULT_MOVIE_QUERY_STATE };

  readonly sortOptions = MOVIE_SORT_OPTIONS;
  readonly viewOptions = MOVIE_VIEW_OPTIONS;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private movieService: MovieService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    combineLatest([this.movieService.movies$, this.route.queryParamMap])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([movies, queryParamMap]) => {
        this.movies = movies;
        this.genres = collectMovieGenres(movies);
        this.queryState = parseMovieQueryState(queryParamMap, this.genres);
        this.filteredMovies = filterMoviesByQueryState(movies, this.queryState);
      });
  }

  get summaryLabel(): string {
    return `${this.filteredMovies.length} / ${this.movies.length} 部`;
  }

  updateQueryState(patch: Partial<MovieQueryState>): void {
    const nextState: MovieQueryState = {
      ...this.queryState,
      ...patch
    };

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: toMovieQueryParams(nextState),
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  clearFilters(): void {
    this.updateQueryState({ ...DEFAULT_MOVIE_QUERY_STATE });
  }

  toggleFavorite(movie: Movie): void {
    this.movieService.toggleFavorite(movie.id);
  }

  toggleWatched(movie: Movie): void {
    this.movieService.toggleWatched(movie.id);
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
      this.snackBar.open(success ? `已删除：${movie.title}` : '删除失败：电影不存在', '关闭', {
        duration: 3000
      });
    });
  }

  trackByMovieId(index: number, movie: Movie): number {
    return movie.id;
  }
}
