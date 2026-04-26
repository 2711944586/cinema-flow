import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { map, shareReplay, switchMap } from 'rxjs/operators';
import { Movie } from '../../models/movie';
import { DirectorService } from '../../services/director.service';
import { applyMovieImageFallback } from '../../utils/movie-media';

@Component({
  selector: 'app-director-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './director-detail-page.component.html',
  styleUrl: './director-detail-page.component.scss'
})
export class DirectorDetailPageComponent {
  private readonly directorId$ = this.route.paramMap.pipe(
    map(params => Number(params.get('id'))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$ = this.directorId$.pipe(
    switchMap(directorId => {
      return combineLatest([
        this.directorService.getDirectorById(directorId),
        this.directorService.getDirectorMovies(directorId),
        this.directorService.getDirectors()
      ]).pipe(
        map(([director, movies, directors]) => {
          const index = directors.findIndex(item => item.id === directorId);
          const totalMinutes = movies.reduce((total, movie) => total + movie.duration, 0);
          const avgRating = movies.length > 0
            ? (movies.reduce((total, movie) => total + movie.rating, 0) / movies.length).toFixed(1)
            : '0.0';

          return {
            director,
            movies,
            avgRating,
            totalHours: Math.round(totalMinutes / 60),
            favoriteCount: movies.filter(movie => movie.isFavorite).length,
            watchedCount: movies.filter(movie => movie.isWatched).length,
            previousDirector: index > 0 ? directors[index - 1] : undefined,
            nextDirector: index >= 0 && index < directors.length - 1 ? directors[index + 1] : undefined,
            notFound: !director
          };
        })
      );
    })
  );

  constructor(
    private route: ActivatedRoute,
    private directorService: DirectorService
  ) {}

  trackByMovieId(index: number, movie: Movie): number {
    return movie.id;
  }

  onImageError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }
}
