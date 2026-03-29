import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Movie } from '../../models/movie';
import { MovieStatsComponent } from '../../components/movie-stats/movie-stats.component';
import { RecentHistoryComponent } from '../../components/recent-history/recent-history.component';
import { MovieService } from '../../services/movie.service';
import { RecentHistoryEntry, RecentHistoryService } from '../../services/recent-history.service';
import { getBackdropDisplayUrl } from '../../utils/movie-media';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MovieStatsComponent,
    RecentHistoryComponent
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent {
  movies: Movie[] = [];
  recentAdded: Movie[] = [];
  recentHistory: RecentHistoryEntry[] = [];
  heroMovie?: Movie;

  readonly quickLinks = [
    { label: '进入 Movies', route: '/movies', icon: 'movie', hint: '完整片库视图' },
    { label: '添加电影', route: '/add', icon: 'add_circle', hint: '进入独立新增页面' },
    { label: '收藏中心', route: '/favorites', icon: 'favorite', hint: '查看已收藏影片' },
    { label: '随机选片', route: '/random', icon: 'casino', hint: '快速决定今晚看什么' }
  ];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private movieService: MovieService,
    private recentHistoryService: RecentHistoryService
  ) {
    this.movieService.movies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(movies => {
        this.movies = movies;
        this.recentAdded = this.movieService.getRecentAdded(5);
        this.heroMovie = [...movies].sort((first, second) => second.rating - first.rating)[0];
      });

    this.recentHistoryService.history$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(entries => {
        this.recentHistory = entries;
      });
  }

  get heroBackdrop(): string | null {
    return this.heroMovie ? getBackdropDisplayUrl(this.heroMovie) : null;
  }
}
