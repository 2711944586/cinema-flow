import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, Observable, shareReplay } from 'rxjs';
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
  readonly movie$: Observable<Movie | undefined>;

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
}
