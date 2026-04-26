import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RouterModule } from '@angular/router';
import { combineLatest, Observable, shareReplay } from 'rxjs';
import { map } from 'rxjs/operators';
import { Movie } from '../../models/movie';
import { RatingLevelPipe } from '../../pipes/rating-level.pipe';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-detail-info',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, RatingLevelPipe],
  templateUrl: './movie-detail-info.component.html',
  styleUrl: './movie-detail-info.component.scss'
})
export class MovieDetailInfoComponent {
  readonly movie$: Observable<Movie | undefined>;
  readonly ratingStars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  hoverRating = 0;

  constructor(
    private route: ActivatedRoute,
    private movieService: MovieService
  ) {
    const parentParamMap$ = this.route.parent?.paramMap ?? this.route.paramMap;
    this.movie$ = combineLatest([parentParamMap$, this.movieService.movies$]).pipe(
      map(([params]) => {
        const movieId = Number(params.get('id'));
        return Number.isFinite(movieId) ? this.movieService.getMovieById(movieId) : undefined;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  setUserRating(movieId: number, rating: number): void {
    this.movieService.setUserRating(movieId, rating);
  }

  saveNotes(movieId: number, notes: string): void {
    this.movieService.setNotes(movieId, notes);
  }
}
