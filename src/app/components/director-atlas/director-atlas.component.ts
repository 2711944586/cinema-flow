import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { applyMovieImageFallback } from '../../utils/movie-media';

interface DirectorSnapshot {
  name: string;
  filmography: Movie[];
  count: number;
  avgRating: string;
  watchedCount: number;
  favoriteCount: number;
  totalHours: number;
  latestYear: number;
  highlightMovie?: Movie;
}

@Component({
  selector: 'app-director-atlas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './director-atlas.component.html',
  styleUrl: './director-atlas.component.scss'
})
export class DirectorAtlasComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  directors: DirectorSnapshot[] = [];
  filteredDirectors: DirectorSnapshot[] = [];
  selectedDirector?: DirectorSnapshot;
  searchQuery = '';

  constructor(private movieService: MovieService) {}

  ngOnInit(): void {
    this.movieService.movies$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(movies => {
        this.directors = this.buildDirectorSnapshots(movies);
        this.applyFilters();
      });
  }

  get totalDirectors(): number {
    return this.directors.length;
  }

  get topDirector(): DirectorSnapshot | undefined {
    return [...this.directors].sort((first, second) => {
      return second.count - first.count || Number(second.avgRating) - Number(first.avgRating);
    })[0];
  }

  get averageDirectorRating(): string {
    if (this.directors.length === 0) {
      return '0.0';
    }

    const total = this.directors.reduce((sum, director) => sum + Number(director.avgRating), 0);
    return (total / this.directors.length).toFixed(1);
  }

  get watchedDirectorRate(): string {
    if (this.directors.length === 0) {
      return '0%';
    }

    const watchedDirectors = this.directors.filter(director => director.watchedCount > 0).length;
    return `${Math.round((watchedDirectors / this.directors.length) * 100)}%`;
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredDirectors = !query
      ? this.directors
      : this.directors.filter(director => {
          const filmTitles = director.filmography.map(movie => movie.title).join(' ').toLowerCase();
          return director.name.toLowerCase().includes(query) || filmTitles.includes(query);
        });

    if (!this.filteredDirectors.some(director => director.name === this.selectedDirector?.name)) {
      this.selectedDirector = this.filteredDirectors[0];
    }
  }

  selectDirector(director: DirectorSnapshot): void {
    this.selectedDirector = director;
  }

  trackByDirectorName(index: number, director: DirectorSnapshot): string {
    return director.name;
  }

  trackByMovieId(index: number, movie: Movie): number {
    return movie.id;
  }

  onImageError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  private buildDirectorSnapshots(movies: Movie[]): DirectorSnapshot[] {
    const directorMap = new Map<string, Movie[]>();

    movies.forEach(movie => {
      const bucket = directorMap.get(movie.director) ?? [];
      bucket.push(movie);
      directorMap.set(movie.director, bucket);
    });

    return Array.from(directorMap.entries())
      .map(([name, filmography]) => {
        const orderedFilmography = [...filmography].sort((first, second) => {
          return second.rating - first.rating || second.releaseDate.getTime() - first.releaseDate.getTime();
        });
        const totalRating = orderedFilmography.reduce((sum, movie) => sum + movie.rating, 0);
        const totalDuration = orderedFilmography.reduce((sum, movie) => sum + movie.duration, 0);
        const latestYear = Math.max(...orderedFilmography.map(movie => movie.releaseDate.getFullYear()));

        return {
          name,
          filmography: orderedFilmography,
          count: orderedFilmography.length,
          avgRating: (totalRating / orderedFilmography.length).toFixed(1),
          watchedCount: orderedFilmography.filter(movie => movie.isWatched).length,
          favoriteCount: orderedFilmography.filter(movie => movie.isFavorite).length,
          totalHours: Math.round(totalDuration / 60),
          latestYear,
          highlightMovie: orderedFilmography[0]
        } satisfies DirectorSnapshot;
      })
      .sort((first, second) => {
        return second.count - first.count || Number(second.avgRating) - Number(first.avgRating) || first.name.localeCompare(second.name, 'zh-CN');
      });
  }
}
