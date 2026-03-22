import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { applyMovieImageFallback } from '../../utils/movie-media';

interface DecadeGroup {
  decade: string;
  movies: Movie[];
}

@Component({
  selector: 'app-movie-timeline',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  templateUrl: './movie-timeline.component.html',
  styleUrl: './movie-timeline.component.scss'
})
export class MovieTimelineComponent implements OnInit {
  decadeGroups: DecadeGroup[] = [];
  totalMovies = 0;
  yearSpan = '';

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    const movies = this.movieService.getMovies()
      .sort((a, b) => a.releaseDate.getTime() - b.releaseDate.getTime());

    this.totalMovies = movies.length;
    if (movies.length > 0) {
      const first = movies[0].releaseDate.getFullYear();
      const last = movies[movies.length - 1].releaseDate.getFullYear();
      this.yearSpan = `${first} - ${last}`;
    }

    const groups = new Map<string, Movie[]>();
    movies.forEach(m => {
      const year = m.releaseDate.getFullYear();
      const decade = `${Math.floor(year / 10) * 10}s`;
      const list = groups.get(decade) || [];
      list.push(m);
      groups.set(decade, list);
    });

    this.decadeGroups = Array.from(groups.entries())
      .map(([decade, movies]) => ({ decade, movies }))
      .sort((a, b) => a.decade.localeCompare(b.decade));
  }

  onImageError(event: Event, movie: Movie) {
    applyMovieImageFallback(event, movie);
  }
}
