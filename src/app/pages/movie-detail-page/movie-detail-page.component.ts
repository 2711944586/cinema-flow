import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { filter, startWith } from 'rxjs/operators';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { RecentHistoryComponent } from '../../components/recent-history/recent-history.component';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { RecentHistoryEntry, RecentHistoryService } from '../../services/recent-history.service';
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
  movie?: Movie;
  recommendations: Movie[] = [];
  previousMovie?: Movie;
  nextMovie?: Movie;
  recentHistory: RecentHistoryEntry[] = [];
  notFound = false;

  private lastRecordedKey = '';
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private movieService: MovieService,
    private recentHistoryService: RecentHistoryService
  ) {
    combineLatest([this.route.paramMap, this.movieService.movies$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([params]) => {
        const movieId = Number(params.get('id'));

        if (!Number.isFinite(movieId)) {
          this.movie = undefined;
          this.notFound = true;
          return;
        }

        const currentMovie = this.movieService.getMovieById(movieId);
        this.movie = currentMovie;
        this.notFound = !currentMovie;
        this.recommendations = currentMovie ? this.movieService.getRecommendations(currentMovie.id, 4) : [];

        const neighbors = this.movieService.getMovieNeighbors(movieId);
        this.previousMovie = neighbors.previous;
        this.nextMovie = neighbors.next;
        this.recordCurrentVisit();
      });

    this.recentHistoryService.history$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(entries => {
        this.recentHistory = this.movie
          ? entries.filter(entry => entry.movieId !== this.movie?.id).slice(0, 4)
          : entries.slice(0, 4);
      });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.recordCurrentVisit();
      });
  }

  get currentSection(): 'info' | 'cast' {
    const childPath = this.route.firstChild?.snapshot.url[0]?.path;
    return childPath === 'cast' ? 'cast' : 'info';
  }

  get backdropUrl(): string | null {
    return this.movie ? getBackdropDisplayUrl(this.movie) : null;
  }

  goBack(): void {
    void this.router.navigate(['/movies']);
  }

  toggleFavorite(): void {
    if (!this.movie) {
      return;
    }

    this.movieService.toggleFavorite(this.movie.id);
    this.movie = this.movieService.getMovieById(this.movie.id);
  }

  toggleWatched(): void {
    if (!this.movie) {
      return;
    }

    this.movieService.toggleWatched(this.movie.id);
    this.movie = this.movieService.getMovieById(this.movie.id);
  }

  deleteMovie(): void {
    if (!this.movie) {
      return;
    }

    this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: '确认删除当前电影',
        message: `删除《${this.movie.title}》后，Movies、Explore、Favorites 和其他增强模块中的对应条目都会消失。`,
        confirmLabel: '删除电影',
        cancelLabel: '取消',
        tone: 'danger'
      },
      panelClass: 'cf-dialog-panel'
    }).afterClosed().subscribe(confirmed => {
      if (!confirmed || !this.movie) {
        return;
      }

      const deletedTitle = this.movie.title;
      const success = this.movieService.deleteMovie(this.movie.id);
      if (success) {
        this.snackBar.open(`已删除：${deletedTitle}`, '关闭', { duration: 3000 });
        void this.router.navigate(['/movies']);
      } else {
        this.snackBar.open('删除失败：电影不存在', '关闭', { duration: 3000 });
      }
    });
  }

  onPosterError(event: Event): void {
    if (this.movie) {
      applyMovieImageFallback(event, this.movie);
    }
  }

  onBackdropError(event: Event): void {
    if (this.movie) {
      applyBackdropDisplayFallback(event, this.movie);
    }
  }

  onRecommendationPosterError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  private recordCurrentVisit(): void {
    if (!this.movie) {
      return;
    }

    const currentKey = `${this.movie.id}-${this.currentSection}-${this.router.url}`;
    if (currentKey === this.lastRecordedKey) {
      return;
    }

    this.lastRecordedKey = currentKey;
    this.recentHistoryService.recordVisit(this.movie, this.currentSection);
  }
}
