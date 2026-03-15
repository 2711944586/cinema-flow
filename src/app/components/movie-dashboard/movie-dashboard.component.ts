import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MovieStatsComponent } from '../movie-stats/movie-stats.component';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-dashboard',
  standalone: true,
  imports: [CommonModule, MovieStatsComponent],
  templateUrl: './movie-dashboard.component.html',
  styleUrl: './movie-dashboard.component.scss'
})
export class MovieDashboardComponent implements OnInit {
  movies: Movie[] = [];

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.movieService.movies$.subscribe(movies => {
      this.movies = movies;
    });
  }
}
