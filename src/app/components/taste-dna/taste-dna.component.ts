import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { ReviewStoreService } from '../../services/review-store.service';
import { WatchLogService } from '../../services/watch-log.service';
import { buildDirectorId } from '../../utils/director-identity';
import { applyMovieImageFallback } from '../../utils/movie-media';

interface TasteAxis {
  label: string;
  value: number;
  hint: string;
}

interface TasteBucket {
  name: string;
  count: number;
  score: number;
  percent: number;
  routeId?: number;
}

@Component({
  selector: 'app-taste-dna',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './taste-dna.component.html',
  styleUrl: './taste-dna.component.scss'
})
export class TasteDnaComponent implements OnInit {
  watchedMovies: Movie[] = [];
  favoriteMovies: Movie[] = [];
  genreBuckets: TasteBucket[] = [];
  directorBuckets: TasteBucket[] = [];
  languageBuckets: TasteBucket[] = [];
  eraBuckets: TasteBucket[] = [];
  axes: TasteAxis[] = [];
  blindSpotMovies: Movie[] = [];
  profileTitle = '等待形成偏好';
  tasteSummary = '';

  constructor(
    private movieService: MovieService,
    private watchLogService: WatchLogService,
    private reviewStoreService: ReviewStoreService
  ) {}

  ngOnInit(): void {
    this.rebuild();
  }

  get watchedCount(): number {
    return this.watchedMovies.length;
  }

  get favoriteCount(): number {
    return this.favoriteMovies.length;
  }

  get reviewCount(): number {
    return this.reviewStoreService.getReviews().length;
  }

  get logCount(): number {
    return this.watchLogService.getLogs().length;
  }

  onImageError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  trackByMovieId(index: number, movie: Movie): number {
    return movie.id;
  }

  private rebuild(): void {
    const movies = this.movieService.getMovies();
    this.watchedMovies = movies.filter(movie => movie.isWatched || this.watchLogService.getLogsForMovie(movie.id).length > 0);
    this.favoriteMovies = movies.filter(movie => movie.isFavorite);
    const signalMovies = this.buildSignalMovies(movies);

    this.genreBuckets = this.buildBuckets(signalMovies.flatMap(movie => movie.genres), signalMovies);
    this.directorBuckets = this.buildBuckets(signalMovies.map(movie => movie.director), signalMovies)
      .map(bucket => ({ ...bucket, routeId: buildDirectorId(bucket.name) }));
    this.languageBuckets = this.buildBuckets(signalMovies.map(movie => movie.language || '未知语言'), signalMovies);
    this.eraBuckets = this.buildEraBuckets(signalMovies);
    this.axes = this.buildAxes(signalMovies);
    this.blindSpotMovies = this.buildBlindSpots(movies);
    this.profileTitle = this.buildProfileTitle();
    this.tasteSummary = this.buildTasteSummary();
  }

  private buildSignalMovies(movies: Movie[]): Movie[] {
    const logMovieIds = new Set(this.watchLogService.getLogs().map(log => log.movieId));
    const reviewMovieIds = new Set(this.reviewStoreService.getReviews().map(review => review.movieId));
    const signalMovies = movies.filter(movie => {
      return movie.isWatched
        || movie.isFavorite
        || movie.userRating != null
        || logMovieIds.has(movie.id)
        || reviewMovieIds.has(movie.id);
    });

    return signalMovies.length > 0 ? signalMovies : movies.slice(0, 60);
  }

  private buildBuckets(labels: string[], signalMovies: Movie[]): TasteBucket[] {
    const counts = new Map<string, { count: number; score: number }>();
    labels.forEach(label => {
      const current = counts.get(label) ?? { count: 0, score: 0 };
      current.count += 1;
      counts.set(label, current);
    });

    signalMovies.forEach(movie => {
      const score = (movie.userRating ?? movie.rating) + (movie.isFavorite ? 1 : 0);
      [movie.director, movie.language || '未知语言', ...movie.genres].forEach(label => {
        const current = counts.get(label);
        if (current) {
          current.score += score;
        }
      });
    });

    const total = labels.length || 1;
    return Array.from(counts.entries())
      .map(([name, value]) => ({
        name,
        count: value.count,
        score: Math.round((value.score / Math.max(1, value.count)) * 10) / 10,
        percent: Math.round((value.count / total) * 100)
      }))
      .sort((first, second) => second.count - first.count || second.score - first.score)
      .slice(0, 8);
  }

  private buildEraBuckets(signalMovies: Movie[]): TasteBucket[] {
    const labels = signalMovies.map(movie => `${Math.floor(movie.releaseDate.getFullYear() / 10) * 10}s`);
    return this.buildBuckets(labels, signalMovies);
  }

  private buildAxes(signalMovies: Movie[]): TasteAxis[] {
    const avgDuration = signalMovies.reduce((total, movie) => total + movie.duration, 0) / Math.max(1, signalMovies.length);
    const avgRating = signalMovies.reduce((total, movie) => total + movie.rating, 0) / Math.max(1, signalMovies.length);
    const genreDiversity = new Set(signalMovies.flatMap(movie => movie.genres)).size;
    const rewatchSignals = this.watchLogService.getLogs().filter(log => log.isRewatch).length;

    return [
      { label: '类型探索', value: Math.min(100, genreDiversity * 8), hint: `${genreDiversity} 个类型信号` },
      { label: '高分偏好', value: Math.round(avgRating * 10), hint: `平均片库评分 ${avgRating.toFixed(1)}` },
      { label: '长片耐受', value: Math.min(100, Math.round((avgDuration / 180) * 100)), hint: `平均片长 ${Math.round(avgDuration)} 分钟` },
      { label: '重看倾向', value: Math.min(100, rewatchSignals * 18), hint: `${rewatchSignals} 条重看日志` }
    ];
  }

  private buildBlindSpots(movies: Movie[]): Movie[] {
    const watchedIds = new Set(this.watchedMovies.map(movie => movie.id));
    const topGenres = new Set(this.genreBuckets.slice(0, 3).map(bucket => bucket.name));

    return movies
      .filter(movie => !watchedIds.has(movie.id))
      .filter(movie => movie.genres.some(genre => topGenres.has(genre)) || movie.rating >= 8.6)
      .sort((first, second) => second.rating - first.rating || Number(!!second.isFavorite) - Number(!!first.isFavorite))
      .slice(0, 6);
  }

  private buildProfileTitle(): string {
    const topGenre = this.genreBuckets[0]?.name;
    const topEra = this.eraBuckets[0]?.name;
    if (!topGenre || !topEra) {
      return '探索型观众';
    }

    return `${topEra} ${topGenre} 策展型观众`;
  }

  private buildTasteSummary(): string {
    const genre = this.genreBuckets[0]?.name ?? '高分作品';
    const director = this.directorBuckets[0]?.name ?? '多元导演';
    const language = this.languageBuckets[0]?.name ?? '多语言';

    return `你的偏好信号集中在 ${genre}、${director} 与 ${language} 作品上。这里会把已看、收藏、评分、影评和观影日志合并成一张可行动的偏好画像。`;
  }
}
