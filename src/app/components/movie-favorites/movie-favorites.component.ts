import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { ListPagerComponent } from '../list-pager/list-pager.component';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { RatingLevelPipe } from '../../pipes/rating-level.pipe';
import { applyMovieImageFallback } from '../../utils/movie-media';
import { paginateItems } from '../../utils/pagination';

@Component({
  selector: 'app-movie-favorites',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule, RatingLevelPipe, ListPagerComponent],
  templateUrl: './movie-favorites.component.html',
  styleUrl: './movie-favorites.component.scss'
})
export class MovieFavoritesComponent implements OnInit, OnDestroy {
  favorites: Movie[] = [];
  visibleFavorites: Movie[] = [];
  currentPage = 1;
  pageSize = 9;
  totalPages = 1;
  readonly pageSizeOptions = [9, 18, 36];
  private sub?: Subscription;

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.sub = this.movieService.getFavorites().subscribe(favorites => {
      this.favorites = favorites;
      this.updatePagination();
    });
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

  setPage(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  setPageSize(pageSize: number): void {
    this.pageSize = pageSize;
    this.currentPage = 1;
    this.updatePagination();
  }

  private updatePagination(): void {
    const pagination = paginateItems(this.favorites, this.currentPage, this.pageSize);
    this.currentPage = pagination.page;
    this.totalPages = pagination.totalPages;
    this.visibleFavorites = pagination.items;
  }
}
