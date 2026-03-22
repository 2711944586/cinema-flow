import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { applyMovieImageFallback } from '../../utils/movie-media';

export interface Review {
  id: number;
  movieId: number;
  movieTitle: string;
  posterUrl: string;
  rating: number;
  content: string;
  author: string;
  createdAt: Date;
  likes: number;
  liked: boolean;
}

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
    FormsModule
  ],
  templateUrl: './movie-review-wall.component.html',
  styleUrls: ['./movie-review-wall.component.scss']
})
export class MovieReviewWallComponent implements OnInit {
  reviews: Review[] = [];
  filteredReviews: Review[] = [];
  movies: Movie[] = [];

  selectedMovieId: number | null = null;
  sortBy = 'latest';

  showNewReviewForm = false;
  newReviewMovieId: number | null = null;
  newReviewRating = 5;
  newReviewContent = '';
  newReviewAuthor = '匿名观众';

  constructor(private movieService: MovieService) {}

  ngOnInit(): void {
    this.loadMovies();
    this.generateSampleReviews();
    this.filterReviews();
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

  get featuredReview(): Review | undefined {
    return [...this.filteredReviews].sort((first, second) => {
      return second.likes - first.likes || second.rating - first.rating;
    })[0];
  }

  get selectedComposeMovie(): Movie | undefined {
    return this.movies.find(movie => movie.id === this.newReviewMovieId)
      ?? this.movies.find(movie => movie.id === this.selectedMovieId!)
      ?? this.movies[0];
  }

  get visibleReviews(): Review[] {
    return this.filteredReviews.slice(0, 8);
  }

  filterReviews(): void {
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
  }

  onMovieSelect(): void {
    this.filterReviews();
  }

  onSortChange(): void {
    this.filterReviews();
  }

  toggleLike(review: Review): void {
    review.liked = !review.liked;
    review.likes += review.liked ? 1 : -1;

    if (this.sortBy === 'popular') {
      this.filterReviews();
    }
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

    const newReview: Review = {
      id: this.reviews.length + 1,
      movieId: movie.id,
      movieTitle: movie.title,
      posterUrl: movie.posterUrl,
      rating: this.newReviewRating,
      content: this.newReviewContent.trim(),
      author: this.newReviewAuthor.trim() || '匿名观众',
      createdAt: new Date(),
      likes: 0,
      liked: false
    };

    this.reviews = [newReview, ...this.reviews];
    this.filterReviews();
    this.cancelReview();
  }

  cancelReview(): void {
    this.showNewReviewForm = false;
    this.newReviewMovieId = this.selectedMovieId ?? this.movies[0]?.id ?? null;
    this.newReviewRating = 5;
    this.newReviewContent = '';
    this.newReviewAuthor = '匿名观众';
  }

  trackByReviewId(index: number, review: Review): number {
    return review.id;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  onReviewPosterError(event: Event, review: Review): void {
    const movie = this.movies.find(item => item.id === review.movieId);
    if (movie) {
      applyMovieImageFallback(event, movie);
    }
  }

  onMoviePosterError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  private loadMovies(): void {
    this.movies = this.movieService.getMovies();
  }

  private generateSampleReviews(): void {
    const seeds = [
      {
        movieId: 4,
        rating: 10,
        content: '它的伟大并不靠煽情堆叠，而是靠节奏、克制和人物命运一点一点把希望抬起来。',
        author: '影迷小王',
        createdAt: new Date(2024, 2, 15),
        likes: 128
      },
      {
        movieId: 8,
        rating: 9,
        content: '人物关系和权力秩序像被精确雕刻出来一样，哪怕只是沉默，也带着巨大的压迫感。',
        author: '老张看电影',
        createdAt: new Date(2024, 3, 1),
        likes: 95
      },
      {
        movieId: 11,
        rating: 10,
        content: '它把商业片的动能和作者表达拉到了同一个层级，小丑的存在感几乎压穿整部片子。',
        author: '夜场观众',
        createdAt: new Date(2024, 3, 10),
        likes: 156
      },
      {
        movieId: 1,
        rating: 9,
        content: '不是单纯的硬科幻奇观，而是一部真正用宇宙尺度去承载私人情感的电影。',
        author: '科幻迷 Lisa',
        createdAt: new Date(2024, 3, 20),
        likes: 203
      },
      {
        movieId: 17,
        rating: 9,
        content: '它最厉害的不是金句，而是把一个极度朴素的人放进时代洪流里后，仍然保持了温柔。',
        author: '正能量使者',
        createdAt: new Date(2024, 4, 15),
        likes: 142
      },
      {
        movieId: 5,
        rating: 10,
        content: '想象力、节奏与情绪转换都极其细腻，它看似温柔，其实每一笔都很准确。',
        author: '文艺青年',
        createdAt: new Date(2024, 4, 22),
        likes: 167
      }
    ];

    const reviews: Review[] = [];

    seeds.forEach((seed, index) => {
      const movie = this.movies.find(item => item.id === seed.movieId);
      if (!movie) {
        return;
      }

      reviews.push({
        id: index + 1,
        movieId: movie.id,
        movieTitle: movie.title,
        posterUrl: movie.posterUrl,
        rating: seed.rating,
        content: seed.content,
        author: seed.author,
        createdAt: seed.createdAt,
        likes: seed.likes,
        liked: false
      });
    });

    this.reviews = reviews;
  }
}
