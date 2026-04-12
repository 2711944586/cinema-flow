import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { RouterModule } from '@angular/router';
import { Movie } from '../../models/movie';
import { MessageService } from '../../services/message.service';
import { MovieService } from '../../services/movie.service';
import { WatchPlanService } from '../../services/watch-plan.service';
import { applyMovieImageFallback } from '../../utils/movie-media';

@Component({
  selector: 'app-marathon-planner',
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
  templateUrl: './marathon-planner.component.html',
  styleUrl: './marathon-planner.component.scss'
})
export class MarathonPlannerComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  movies: Movie[] = [];
  genres: string[] = ['全部'];
  lineup: Movie[] = [];
  selectedGenre = '全部';
  budgetHours = 4;
  includeWatched = false;
  preferFavorites = true;

  constructor(
    private movieService: MovieService,
    private watchPlanService: WatchPlanService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.movieService.movies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(movies => {
        this.movies = movies;
        this.genres = ['全部', ...Array.from(new Set(movies.flatMap(movie => movie.genres))).sort((first, second) => first.localeCompare(second, 'zh-CN'))];
        this.generateLineup();
      });
  }

  get totalLineupHours(): string {
    const totalMinutes = this.lineup.reduce((sum, movie) => sum + movie.duration, 0);
    return (totalMinutes / 60).toFixed(1);
  }

  get lineupAverageRating(): string {
    if (this.lineup.length === 0) {
      return '0.0';
    }

    const total = this.lineup.reduce((sum, movie) => sum + movie.rating, 0);
    return (total / this.lineup.length).toFixed(1);
  }

  get remainingMinutes(): number {
    return Math.max(0, Math.round(this.budgetHours * 60 - this.lineup.reduce((sum, movie) => sum + movie.duration, 0)));
  }

  setBudget(hours: number): void {
    this.budgetHours = hours;
    this.generateLineup();
  }

  generateLineup(): void {
    const budgetMinutes = Math.max(120, Math.round(this.budgetHours * 60));
    const filteredMovies = this.movies
      .filter(movie => this.includeWatched || !movie.isWatched)
      .filter(movie => this.selectedGenre === '全部' || movie.genres.includes(this.selectedGenre))
      .sort((first, second) => {
        const favoriteBoost = this.preferFavorites
          ? Number(second.isFavorite) - Number(first.isFavorite)
          : 0;
        return favoriteBoost || second.rating - first.rating || first.duration - second.duration;
      });

    const lineup: Movie[] = [];
    let usedMinutes = 0;

    for (const movie of filteredMovies) {
      if (lineup.length >= 5) {
        break;
      }

      const remainingMinutes = budgetMinutes - usedMinutes;
      const shouldTakeAsFirstMovie = lineup.length === 0;
      if (movie.duration <= remainingMinutes || shouldTakeAsFirstMovie) {
        lineup.push(movie);
        usedMinutes += movie.duration;
      }
    }

    this.lineup = lineup;
  }

  saveLineup(): void {
    if (this.lineup.length === 0) {
      this.messageService.warning('当前还没有可加入待看片单的马拉松片单。', 'Marathon');
      return;
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const activePlanMovieIds = new Set(this.watchPlanService.getActivePlans().map(entry => entry.movieId));

    this.lineup.forEach((movie, index) => {
      if (activePlanMovieIds.has(movie.id)) {
        skippedCount += 1;
        return;
      }

      const result = this.watchPlanService.savePlan({
        movieId: movie.id,
        status: 'queued',
        priority: index < 2 ? 'high' : 'medium',
        plannedFor: null,
        contextTag: this.selectedGenre === '全部' ? '观影马拉松' : `${this.selectedGenre} 主题马拉松`,
        note: `由 Marathon Planner 自动生成，时长预算 ${this.budgetHours} 小时。`
      });

      if (result.ok) {
        if (result.created) {
          createdCount += 1;
        } else {
          updatedCount += 1;
        }
      }
    });

    this.messageService.success(
      `已处理 ${this.lineup.length} 部电影：新增 ${createdCount}，更新 ${updatedCount}，跳过 ${skippedCount} 条已有进行中计划。`,
      'Marathon'
    );
  }

  toggleWatchedFilter(): void {
    this.includeWatched = !this.includeWatched;
    this.generateLineup();
  }

  toggleFavoritePreference(): void {
    this.preferFavorites = !this.preferFavorites;
    this.generateLineup();
  }

  trackByMovieId(index: number, movie: Movie): number {
    return movie.id;
  }

  onImageError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }
}
