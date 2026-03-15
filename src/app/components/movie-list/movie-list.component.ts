import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatBadgeModule } from '@angular/material/badge';
import { Subscription } from 'rxjs';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { MovieDetailComponent } from '../movie-detail/movie-detail.component';
import { RatingLevelPipe } from '../../pipes/rating-level.pipe';

@Component({
  selector: 'app-movie-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatChipsModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatBadgeModule,
    MovieDetailComponent,
    RatingLevelPipe
  ],
  templateUrl: './movie-list.component.html',
  styleUrl: './movie-list.component.scss'
})
export class MovieListComponent implements OnInit, OnDestroy {
  movies: Movie[] = [];
  filteredMovies: Movie[] = [];
  selectedMovie?: Movie;

  genres: string[] = [];
  selectedGenre = '全部';
  sortOption = 'newest';
  searchQuery = '';
  showOnlyFavorites = false;
  showOnlyWatched = false;

  showDetailModal = false;
  genreDropdownOpen = false;
  sortDropdownOpen = false;

  readonly sortOptions = [
    { value: 'newest', label: '最新上映' },
    { value: 'toprated', label: '最高评分' },
    { value: 'title', label: '名称排序' },
    { value: 'duration', label: '时长排序' }
  ];
  readonly sortLabels: Record<string, string> = {
    newest: '最新上映', toprated: '最高评分', title: '名称排序', duration: '时长排序'
  };

  private sub?: Subscription;

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.sub = this.movieService.movies$.subscribe(movies => {
      this.movies = movies;
      this.buildGenreList();
      this.applyFilters();
      if (this.selectedMovie) {
        this.selectedMovie = movies.find(m => m.id === this.selectedMovie!.id);
      }
      if (!this.selectedMovie) {
        this.selectedMovie = this.movies[0];
      }
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  private buildGenreList() {
    const genreSet = new Set<string>();
    this.movies.forEach(m => m.genres?.forEach(g => genreSet.add(g)));
    this.genres = ['全部', ...Array.from(genreSet).sort()];
  }

  onSelect(movie: Movie): void {
    this.selectedMovie = movie;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openDetail() {
    this.showDetailModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeDetail() {
    this.showDetailModal = false;
    document.body.style.overflow = 'auto';
  }

  toggleGenreDropdown(): void {
    this.genreDropdownOpen = !this.genreDropdownOpen;
    this.sortDropdownOpen = false;
  }

  toggleSortDropdown(): void {
    this.sortDropdownOpen = !this.sortDropdownOpen;
    this.genreDropdownOpen = false;
  }

  selectSort(value: string): void {
    this.sortOption = value;
    this.sortDropdownOpen = false;
    this.applyFilters();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.genre-dropdown')) {
      this.genreDropdownOpen = false;
    }
    if (!target.closest('.sort-dropdown')) {
      this.sortDropdownOpen = false;
    }
  }

  selectGenreFromDropdown(genre: string): void {
    this.selectedGenre = genre;
    this.genreDropdownOpen = false;
    this.applyFilters();
  }

  selectGenre(genre: string) {
    this.selectedGenre = genre;
    this.applyFilters();
  }

  toggleFavorite(event: Event, movie: Movie) {
    event.stopPropagation();
    this.movieService.toggleFavorite(movie.id);
  }

  toggleWatched(event: Event, movie: Movie) {
    event.stopPropagation();
    this.movieService.toggleWatched(movie.id);
  }

  toggleFavoritesFilter() {
    this.showOnlyFavorites = !this.showOnlyFavorites;
    this.applyFilters();
  }

  toggleWatchedFilter() {
    this.showOnlyWatched = !this.showOnlyWatched;
    this.applyFilters();
  }

  applyFilters() {
    let result = [...this.movies];

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(m =>
        m.title.toLowerCase().includes(q) ||
        m.director.toLowerCase().includes(q) ||
        m.cast?.some(c => c.toLowerCase().includes(q))
      );
    }

    if (this.selectedGenre !== '全部') {
      result = result.filter(m => m.genres?.includes(this.selectedGenre));
    }

    if (this.showOnlyFavorites) {
      result = result.filter(m => m.isFavorite);
    }

    if (this.showOnlyWatched) {
      result = result.filter(m => m.isWatched);
    }

    switch (this.sortOption) {
      case 'newest':
        result.sort((a, b) => b.releaseDate.getTime() - a.releaseDate.getTime());
        break;
      case 'toprated':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'duration':
        result.sort((a, b) => b.duration - a.duration);
        break;
    }

    this.filteredMovies = result;
  }

  get favoriteCount(): number {
    return this.movies.filter(m => m.isFavorite).length;
  }

  get watchedCount(): number {
    return this.movies.filter(m => m.isWatched).length;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }
}
