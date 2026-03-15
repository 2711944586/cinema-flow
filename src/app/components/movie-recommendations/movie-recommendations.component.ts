import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';

interface GenreSection {
  genre: string;
  movies: Movie[];
}

@Component({
  selector: 'app-movie-recommendations',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './movie-recommendations.component.html',
  styleUrl: './movie-recommendations.component.scss'
})
export class MovieRecommendationsComponent implements OnInit {
  genreSections: GenreSection[] = [];
  directorSections: { name: string; movies: Movie[] }[] = [];

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    const movies = this.movieService.getMovies();
    const genreMap = new Map<string, Movie[]>();
    movies.forEach(m => {
      m.genres.forEach(g => {
        const list = genreMap.get(g) || [];
        list.push(m);
        genreMap.set(g, list);
      });
    });

    this.genreSections = Array.from(genreMap.entries())
      .map(([genre, movies]) => ({
        genre,
        movies: movies.sort((a, b) => b.rating - a.rating).slice(0, 8)
      }))
      .filter(s => s.movies.length >= 2)
      .sort((a, b) => b.movies.length - a.movies.length);

    const directors = this.movieService.getDirectors().filter(d => d.count >= 2);
    this.directorSections = directors.map(d => ({
      name: d.name,
      movies: this.movieService.getByDirector(d.name)
    }));
  }

  toggleFavorite(movie: Movie) {
    this.movieService.toggleFavorite(movie.id);
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
