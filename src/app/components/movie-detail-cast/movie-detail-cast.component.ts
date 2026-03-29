import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs/operators';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-detail-cast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './movie-detail-cast.component.html',
  styleUrl: './movie-detail-cast.component.scss'
})
export class MovieDetailCastComponent {
  movie?: Movie;

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
}
