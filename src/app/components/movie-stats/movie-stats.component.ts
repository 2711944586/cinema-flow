import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-stats',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatProgressBarModule, MatIconModule, MatDividerModule, MatTooltipModule],
  templateUrl: './movie-stats.component.html',
  styleUrl: './movie-stats.component.scss'
})
export class MovieStatsComponent implements OnChanges {
  @Input() movies: Movie[] = [];

  totalMovies = 0;
  watchedCount = 0;
  watchedPercentage = 0;
  averageRating = '0.0';
  uniqueDirectors = 0;
  favoriteCount = 0;
  totalDuration = 0;
  topRatedMovie?: Movie;
  topGenres: { name: string; count: number; percent: number }[] = [];
  yearDistribution: { year: number; count: number; maxCount: number }[] = [];
  ratingDistribution: { range: string; count: number; color: string }[] = [];
  recentMovies: Movie[] = [];
  directorStats: { name: string; count: number; avgRating: number }[] = [];

  constructor(private movieService: MovieService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['movies'] && this.movies) {
      this.calculateStats();
    }
  }

  private calculateStats() {
    this.totalMovies = this.movies.length;
    if (this.totalMovies === 0) return;

    this.watchedCount = this.movies.filter(m => m.isWatched).length;
    this.watchedPercentage = Math.round((this.watchedCount / this.totalMovies) * 100);
    this.favoriteCount = this.movies.filter(m => m.isFavorite).length;
    this.totalDuration = this.movies.reduce((s, m) => s + m.duration, 0);

    const sum = this.movies.reduce((acc, m) => acc + m.rating, 0);
    this.averageRating = (sum / this.totalMovies).toFixed(1);

    this.topRatedMovie = this.movies.reduce((top, m) => m.rating > top.rating ? m : top, this.movies[0]);
    this.uniqueDirectors = new Set(this.movies.map(m => m.director)).size;

    this.topGenres = this.movieService.getGenreStats().slice(0, 6);
    this.yearDistribution = this.movieService.getYearDistribution().map(y => ({
      ...y,
      maxCount: Math.max(...this.movieService.getYearDistribution().map(d => d.count))
    }));

    this.ratingDistribution = [
      { range: '9.0+', count: this.movies.filter(m => m.rating >= 9).length, color: '#f59e0b' },
      { range: '8.0-8.9', count: this.movies.filter(m => m.rating >= 8 && m.rating < 9).length, color: '#22c55e' },
      { range: '7.0-7.9', count: this.movies.filter(m => m.rating >= 7 && m.rating < 8).length, color: '#3b82f6' },
      { range: '<7.0', count: this.movies.filter(m => m.rating < 7).length, color: '#64748b' }
    ];

    this.recentMovies = [...this.movies]
      .sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime())
      .slice(0, 5);

    this.directorStats = this.movieService.getDirectors().slice(0, 5);
  }
}
