import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Movie } from '../models/movie';
import { ReviewEntry } from '../models/review';
import { MovieService } from './movie.service';

interface ReviewSeed {
  movieId: number;
  rating: number;
  content: string;
  author: string;
  createdAt: Date;
  likes: number;
}

@Injectable({ providedIn: 'root' })
export class ReviewStoreService {
  private readonly storageKey = 'cinemaflow.reviews.v2';
  private readonly reviewsSubject = new BehaviorSubject<ReviewEntry[]>(this.loadInitialReviews());

  readonly reviews$ = this.reviewsSubject.asObservable();

  constructor(private movieService: MovieService) {}

  getReviews(): ReviewEntry[] {
    return this.reviewsSubject.value.map(review => ({ ...review }));
  }

  addReview(movie: Movie, payload: { rating: number; content: string; author: string }): ReviewEntry {
    const review: ReviewEntry = {
      id: this.buildNextId(),
      movieId: movie.id,
      movieTitle: movie.title,
      posterUrl: movie.posterUrl,
      rating: payload.rating,
      content: payload.content.trim(),
      author: payload.author.trim() || '匿名观众',
      createdAt: new Date(),
      likes: 0,
      liked: false
    };

    this.commit([review, ...this.reviewsSubject.value]);
    return { ...review };
  }

  toggleLike(reviewId: number): void {
    const updatedReviews = this.reviewsSubject.value.map(review => {
      if (review.id !== reviewId) {
        return { ...review };
      }

      const liked = !review.liked;
      return {
        ...review,
        liked,
        likes: review.likes + (liked ? 1 : -1)
      };
    });

    this.commit(updatedReviews);
  }

  replaceReviews(reviews: ReviewEntry[]): void {
    const normalizedReviews = reviews
      .map(review => this.normalizeReview(review))
      .filter((review): review is ReviewEntry => review !== null)
      .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());

    this.commit(normalizedReviews);
  }

  private loadInitialReviews(): ReviewEntry[] {
    if (typeof localStorage !== 'undefined') {
      try {
        const rawValue = localStorage.getItem(this.storageKey);
        if (rawValue) {
          const parsedValue = JSON.parse(rawValue);
          if (Array.isArray(parsedValue)) {
            const storedReviews = parsedValue
              .map(review => this.normalizeReview(review))
              .filter((review): review is ReviewEntry => review !== null)
              .sort((first, second) => second.createdAt.getTime() - first.createdAt.getTime());

            if (storedReviews.length > 0) {
              return storedReviews;
            }
          }
        }
      } catch {
        // Ignore invalid persisted data and fall back to seed reviews.
      }
    }

    return this.buildSeedReviews();
  }

  private buildSeedReviews(): ReviewEntry[] {
    const seeds: ReviewSeed[] = [
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

    return seeds.reduce<ReviewEntry[]>((accumulator, seed, index) => {
      const movie = this.movieService.getMovieById(seed.movieId);
      if (!movie) {
        return accumulator;
      }

      accumulator.push({
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

      return accumulator;
    }, []);
  }

  private buildNextId(): number {
    return this.reviewsSubject.value.length > 0
      ? Math.max(...this.reviewsSubject.value.map(review => review.id)) + 1
      : 1;
  }

  private commit(reviews: ReviewEntry[]): void {
    const clonedReviews = reviews.map(review => ({ ...review }));
    this.reviewsSubject.next(clonedReviews);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.storageKey, JSON.stringify(clonedReviews));
    }
  }

  private normalizeReview(review: Partial<ReviewEntry> | null | undefined): ReviewEntry | null {
    if (!review || typeof review.id !== 'number' || typeof review.movieId !== 'number' || !review.movieTitle) {
      return null;
    }

    const createdAt = new Date(review.createdAt ?? '');
    if (Number.isNaN(createdAt.getTime()) || typeof review.content !== 'string') {
      return null;
    }

    return {
      id: review.id,
      movieId: review.movieId,
      movieTitle: review.movieTitle,
      posterUrl: review.posterUrl ?? '',
      rating: Number(review.rating ?? 0),
      content: review.content,
      author: review.author?.trim() || '匿名观众',
      createdAt,
      likes: Math.max(0, Number(review.likes ?? 0)),
      liked: !!review.liked
    };
  }
}
