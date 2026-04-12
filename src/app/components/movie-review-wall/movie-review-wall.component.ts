import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ListPagerComponent } from '../list-pager/list-pager.component';
import { Movie } from '../../models/movie';
import { ReviewEntry } from '../../models/review';
import { MovieService } from '../../services/movie.service';
import { ReviewStoreService } from '../../services/review-store.service';
import { applyMovieImageFallback } from '../../utils/movie-media';
import { paginateItems } from '../../utils/pagination';

@Component({
  selector: 'app-movie-review-wall',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    ListPagerComponent
  ],
  templateUrl: './movie-review-wall.component.html',
  styleUrls: ['./movie-review-wall.component.scss']
})
export class MovieReviewWallComponent implements OnInit {
  reviews: ReviewEntry[] = [];
  filteredReviews: ReviewEntry[] = [];
  visibleReviews: ReviewEntry[] = [];
  movies: Movie[] = [];

  selectedMovieId: number | null = null;
  sortBy = 'latest';

  showNewReviewForm = false;
  newReviewMovieId: number | null = null;
  newReviewRating = 5;
  newReviewContent = '';
  newReviewAuthor = '匿名观众';
  currentPage = 1;
  pageSize = 8;
  totalPages = 1;
  readonly pageSizeOptions = [8, 16, 32];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private movieService: MovieService,
    private reviewStoreService: ReviewStoreService
  ) {}

  ngOnInit(): void {
    this.loadMovies();
    this.reviewStoreService.reviews$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(reviews => {
        this.reviews = reviews;
        this.filterReviews();
      });
  }

  get totalReviews(): number {
    return this.reviews.length;
  }

  get averageReviewScore(): string {
    if (this.reviews.length === 0) {
      return '0.0';
    }

    const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    return (total / this.reviews.length).toFixed(1);
  }

  get averageLikes(): number {
    if (this.reviews.length === 0) {
      return 0;
    }

    return Math.round(this.reviews.reduce((sum, review) => sum + review.likes, 0) / this.reviews.length);
  }

  get featuredReview(): ReviewEntry | undefined {
    return [...this.filteredReviews].sort((first, second) => {
      return second.likes - first.likes || second.rating - first.rating;
    })[0];
  }

  get selectedComposeMovie(): Movie | undefined {
    return this.movies.find(movie => movie.id === this.newReviewMovieId)
      ?? this.movies.find(movie => movie.id === this.selectedMovieId!)
      ?? this.movies[0];
  }

  filterReviews(resetPage = false): void {
    let filtered = [...this.reviews];

    if (this.selectedMovieId !== null) {
      filtered = filtered.filter(review => review.movieId === this.selectedMovieId);
    }

    switch (this.sortBy) {
      case 'highest':
        filtered.sort((first, second) => second.rating - first.rating || second.likes - first.likes);
        break;
      case 'popular':
        filtered.sort((first, second) => second.likes - first.likes || second.rating - first.rating);
        break;
      case 'latest':
      default:
        filtered.sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());
        break;
    }

    this.filteredReviews = filtered;

    if (resetPage) {
      this.currentPage = 1;
    }

    this.updatePagination();
  }

  onMovieSelect(): void {
    this.filterReviews(true);
  }

  onSortChange(): void {
    this.filterReviews(true);
  }

  toggleLike(review: ReviewEntry): void {
    this.reviewStoreService.toggleLike(review.id);
  }

  toggleNewReviewForm(): void {
    this.showNewReviewForm = !this.showNewReviewForm;

    if (this.showNewReviewForm && this.newReviewMovieId === null) {
      this.newReviewMovieId = this.selectedMovieId ?? this.movies[0]?.id ?? null;
    }
  }

  submitReview(): void {
    if (!this.newReviewMovieId || !this.newReviewContent.trim()) {
      return;
    }

    const movie = this.movies.find(item => item.id === this.newReviewMovieId);
    if (!movie) {
      return;
    }

    this.currentPage = 1;
    this.reviewStoreService.addReview(movie, {
      rating: this.newReviewRating,
      content: this.newReviewContent,
      author: this.newReviewAuthor
    });
    this.cancelReview();
  }

  cancelReview(): void {
    this.showNewReviewForm = false;
    this.newReviewMovieId = this.selectedMovieId ?? this.movies[0]?.id ?? null;
    this.newReviewRating = 5;
    this.newReviewContent = '';
    this.newReviewAuthor = '匿名观众';
  }

  trackByReviewId(index: number, review: ReviewEntry): number {
    return review.id;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onReviewPosterError(event: Event, review: ReviewEntry): void {
    const movie = this.movies.find(item => item.id === review.movieId);
    if (movie) {
      applyMovieImageFallback(event, movie);
    }
  }

  onMoviePosterError(event: Event, movie: Movie): void {
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

  private loadMovies(): void {
    this.movies = this.movieService.getMovies();
  }

  private updatePagination(): void {
    const pagination = paginateItems(this.filteredReviews, this.currentPage, this.pageSize);
    this.currentPage = pagination.page;
    this.totalPages = pagination.totalPages;
    this.visibleReviews = pagination.items;
  }
}
