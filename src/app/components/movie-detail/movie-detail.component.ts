import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { RatingLevelPipe } from '../../pipes/rating-level.pipe';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatTooltipModule,
    RatingLevelPipe
  ],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.scss'
})
export class MovieDetailComponent implements OnChanges {
  @Input() movie?: Movie;

  recommendations: Movie[] = [];
  userRatingStars: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  hoverRating = 0;

  constructor(private movieService: MovieService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['movie'] && this.movie) {
      this.recommendations = this.movieService.getRecommendations(this.movie.id, 4);
    }
  }

  toggleFavorite() {
    if (this.movie) {
      this.movieService.toggleFavorite(this.movie.id);
    }
  }

  toggleWatched() {
    if (this.movie) {
      this.movieService.toggleWatched(this.movie.id);
    }
  }

  setUserRating(rating: number) {
    if (this.movie) {
      this.movieService.setUserRating(this.movie.id, rating);
    }
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
  }

  saveNotes(event: Event) {
    if (!this.movie) return;
    const notes = (event.target as HTMLTextAreaElement).value;
    this.movieService.setNotes(this.movie.id, notes);
  }
}
