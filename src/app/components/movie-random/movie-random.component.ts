import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { applyMovieImageFallback } from '../../utils/movie-media';

@Component({
  selector: 'app-movie-random',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './movie-random.component.html',
  styleUrl: './movie-random.component.scss'
})
export class MovieRandomComponent {
  pickedMovie?: Movie;
  isSpinning = false;
  history: Movie[] = [];

  constructor(private movieService: MovieService) {}

  spin(): void {
    if (this.isSpinning) return;
    this.isSpinning = true;

    let count = 0;
    const total = 10;
    const interval = setInterval(() => {
      this.pickedMovie = this.movieService.getRandomMovie();
      count++;
      if (count >= total) {
        clearInterval(interval);
        this.isSpinning = false;
        if (this.pickedMovie) {
          this.history = [this.pickedMovie, ...this.history.filter(m => m.id !== this.pickedMovie!.id)].slice(0, 5);
        }
      }
    }, 120);
  }

  toggleFavorite(): void {
    if (this.pickedMovie) {
      this.movieService.toggleFavorite(this.pickedMovie.id);
      this.pickedMovie = { ...this.pickedMovie, isFavorite: !this.pickedMovie.isFavorite };
    }
  }

  onImageError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }
}
