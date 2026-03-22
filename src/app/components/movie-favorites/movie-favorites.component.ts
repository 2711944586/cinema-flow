import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { RatingLevelPipe } from '../../pipes/rating-level.pipe';
import { applyMovieImageFallback } from '../../utils/movie-media';

@Component({
  selector: 'app-movie-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, RatingLevelPipe],
  templateUrl: './movie-favorites.component.html',
  styleUrl: './movie-favorites.component.scss'
})
export class MovieFavoritesComponent implements OnInit, OnDestroy {
  favorites: Movie[] = [];
  private sub?: Subscription;

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.sub = this.movieService.getFavorites().subscribe(f => this.favorites = f);
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  removeFavorite(movie: Movie) {
    this.movieService.toggleFavorite(movie.id);
  }

  toggleWatched(movie: Movie) {
    this.movieService.toggleWatched(movie.id);
  }

  get totalDuration(): number {
    return this.favorites.reduce((s, m) => s + m.duration, 0);
  }

  get avgRating(): string {
    if (this.favorites.length === 0) return '0';
    return (this.favorites.reduce((s, m) => s + m.rating, 0) / this.favorites.length).toFixed(1);
  }

  onImageError(event: Event, movie: Movie) {
    applyMovieImageFallback(event, movie);
  }
}
