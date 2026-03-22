import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Subscription } from 'rxjs';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { applyMovieImageFallback } from '../../utils/movie-media';

@Component({
  selector: 'app-movie-compare',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  templateUrl: './movie-compare.component.html',
  styleUrl: './movie-compare.component.scss'
})
export class MovieCompareComponent implements OnInit, OnDestroy {
  movies: Movie[] = [];
  movieA?: Movie;
  movieB?: Movie;
  dropdownAOpen = false;
  dropdownBOpen = false;
  searchA = '';
  searchB = '';
  private sub?: Subscription;

  constructor(private movieService: MovieService) {}

  ngOnInit(): void {
    this.sub = this.movieService.movies$.subscribe(movies => {
      this.movies = movies;
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggleDropdownA(): void {
    this.dropdownAOpen = !this.dropdownAOpen;
    this.dropdownBOpen = false;
    this.searchA = '';
  }

  toggleDropdownB(): void {
    this.dropdownBOpen = !this.dropdownBOpen;
    this.dropdownAOpen = false;
    this.searchB = '';
  }

  selectA(movie: Movie): void {
    this.movieA = movie;
    this.dropdownAOpen = false;
  }

  selectB(movie: Movie): void {
    this.movieB = movie;
    this.dropdownBOpen = false;
  }

  swapMovies(): void {
    const temp = this.movieA;
    this.movieA = this.movieB;
    this.movieB = temp;
  }

  get filteredA(): Movie[] {
    if (!this.searchA) return this.movies;
    const q = this.searchA.toLowerCase();
    return this.movies.filter(m => m.title.toLowerCase().includes(q));
  }

  get filteredB(): Movie[] {
    if (!this.searchB) return this.movies;
    const q = this.searchB.toLowerCase();
    return this.movies.filter(m => m.title.toLowerCase().includes(q));
  }

  getWinner(field: 'rating' | 'duration' | 'boxOffice'): 'A' | 'B' | 'tie' {
    if (!this.movieA || !this.movieB) return 'tie';
    const a = this.movieA[field] ?? 0;
    const b = this.movieB[field] ?? 0;
    if (a > b) return 'A';
    if (b > a) return 'B';
    return 'tie';
  }

  getSharedGenres(): string[] {
    if (!this.movieA || !this.movieB) return [];
    return this.movieA.genres.filter(g => this.movieB!.genres.includes(g));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.selector-a')) this.dropdownAOpen = false;
    if (!target.closest('.selector-b')) this.dropdownBOpen = false;
  }

  onImageError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }
}
