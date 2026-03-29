import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { Movie } from '../../models/movie';
import { RatingLevelPipe } from '../../pipes/rating-level.pipe';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-detail-info',
  standalone: true,
  imports: [CommonModule, FormsModule, RatingLevelPipe],
  templateUrl: './movie-detail-info.component.html',
  styleUrl: './movie-detail-info.component.scss'
})
export class MovieDetailInfoComponent {
  movie?: Movie;
  readonly ratingStars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  hoverRating = 0;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private route: ActivatedRoute,
    private movieService: MovieService
  ) {
    this.route.parent?.paramMap
      .pipe(
        map(params => Number(params.get('id'))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(movieId => {
        this.movie = Number.isFinite(movieId) ? this.movieService.getMovieById(movieId) : undefined;
      });
  }

  setUserRating(rating: number): void {
    if (!this.movie) {
      return;
    }

    this.movieService.setUserRating(this.movie.id, rating);
    this.movie = this.movieService.getMovieById(this.movie.id);
  }

  saveNotes(notes: string): void {
    if (!this.movie) {
      return;
    }

    this.movieService.setNotes(this.movie.id, notes);
    this.movie = this.movieService.getMovieById(this.movie.id);
  }
}
