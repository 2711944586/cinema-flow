import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Movie } from '../models/movie';
import { MOCK_MOVIES } from '../data/mock-movies';
import { LoggerService } from './logger.service';
import { coerceMovieDate, ensureMovieMedia, isGeneratedMovieArt, optimizeMovieImageUrl } from '../utils/movie-media';

@Injectable({ providedIn: 'root' })
export class MovieService {
  private readonly moviesSubject = new BehaviorSubject<Movie[]>(
    this.dedupeMovies(MOCK_MOVIES.map(m => this.normalizeMovie(m)))
  );

  readonly movies$ = this.moviesSubject.asObservable();

  constructor(private logger: LoggerService) {
    this.logger.log('MovieService initialized with ' + this.moviesSubject.value.length + ' movies');
  }

  getMovies(): Movie[] {
    const movies = this.moviesSubject.value.map(m => this.cloneMovie(m));
    this.logger.log(`Retrieved ${movies.length} movies`);
    return movies;
  }

  // Observable version for Phase 5
  getMoviesObservable(): Observable<Movie[]> {
    return this.movies$;
  }

  getMovieById(id: number): Movie | undefined {
    const movie = this.moviesSubject.value.find(m => m.id === id);
    if (movie) {
      this.logger.log(`Retrieved movie: ${movie.title}`);
      return this.cloneMovie(movie);
    }
    this.logger.warn(`Movie with id ${id} not found`);
    return undefined;
  }

  // Observable version for Phase 5
  getMovieByIdObservable(id: number): Observable<Movie | undefined> {
    return of(this.getMovieById(id));
  }

  toggleFavorite(id: number): void {
    const movie = this.moviesSubject.value.find(m => m.id === id);
    const updated = this.moviesSubject.value.map(m =>
      m.id === id ? this.normalizeMovie({ ...m, isFavorite: !m.isFavorite }) : this.cloneMovie(m)
    );
    this.moviesSubject.next(updated);
    this.logger.log(`${movie?.title} favorite status toggled to ${!movie?.isFavorite}`);
  }

  toggleWatched(id: number): void {
    const movie = this.moviesSubject.value.find(m => m.id === id);
    const updated = this.moviesSubject.value.map(m =>
      m.id === id ? this.normalizeMovie({ ...m, isWatched: !m.isWatched }) : this.cloneMovie(m)
    );
    this.moviesSubject.next(updated);
    this.logger.log(`${movie?.title} watched status toggled to ${!movie?.isWatched}`);
  }

  setUserRating(id: number, rating: number): void {
    const movie = this.moviesSubject.value.find(m => m.id === id);
    const updated = this.moviesSubject.value.map(m =>
      m.id === id ? this.normalizeMovie({ ...m, userRating: rating }) : this.cloneMovie(m)
    );
    this.moviesSubject.next(updated);
    this.logger.log(`${movie?.title} rated ${rating}/10`);
  }

  updateMovie(id: number, changes: Partial<Movie>): void {
    if (changes.posterUrl !== undefined && !this.hasVerifiedPoster(changes.posterUrl)) {
      this.logger.warn(`Rejected poster update for movie ${id}: poster must be a verified external image URL`);
      return;
    }

    const movie = this.moviesSubject.value.find(m => m.id === id);
    const updated = this.moviesSubject.value.map(m =>
      m.id === id ? this.normalizeMovie({ ...m, ...changes }) : this.cloneMovie(m)
    );
    this.moviesSubject.next(updated);
    this.logger.log(`Updated movie ${movie?.title}: ${JSON.stringify(changes)}`);
  }

  setNotes(id: number, notes: string): void {
    this.updateMovie(id, { userNotes: notes });
    this.logger.log(`Added notes to movie ${id}`);
  }

  // ==================== CRUD Operations ====================
  
  /**
   * Add a new movie to the collection
   * Generates a new unique ID automatically
   */
  addMovie(movie: Omit<Movie, 'id'>): boolean {
    if (!this.hasVerifiedPoster(movie.posterUrl)) {
      this.logger.warn(`Rejected new movie "${movie.title}": poster must be a verified external image URL`);
      return false;
    }

    const normalizedMovie = this.normalizeMovie({ ...movie, id: 0 });
    if (this.isDuplicateMovie(normalizedMovie)) {
      this.logger.warn(`Rejected new movie "${movie.title}": duplicate title/year combination`);
      return false;
    }

    const newId = this.moviesSubject.value.length > 0
      ? Math.max(...this.moviesSubject.value.map(m => m.id)) + 1
      : 1;
    const newMovie: Movie = { ...normalizedMovie, id: newId };
    const updated = [...this.moviesSubject.value.map(m => this.cloneMovie(m)), newMovie];
    this.moviesSubject.next(updated);
    this.logger.log(`Added new movie: ${movie.title} (ID: ${newId})`);
    return true;
  }

  /**
   * Delete a movie by ID
   * Returns true if deletion was successful, false if movie not found
   */
  deleteMovie(id: number): boolean {
    const movie = this.moviesSubject.value.find(m => m.id === id);
    if (!movie) {
      this.logger.warn(`Cannot delete: Movie with id ${id} not found`);
      return false;
    }
    const updated = this.moviesSubject.value
      .filter(m => m.id !== id)
      .map(m => this.cloneMovie(m));
    this.moviesSubject.next(updated);
    this.logger.log(`Deleted movie: ${movie.title} (ID: ${id})`);
    return true;
  }

  /**
   * Update an existing movie with new data
   * Returns true if update was successful, false if movie not found
   */
  updateMovieFull(updatedMovie: Movie): boolean {
    if (!this.hasVerifiedPoster(updatedMovie.posterUrl)) {
      this.logger.warn(`Cannot update movie ${updatedMovie.id}: poster must be a verified external image URL`);
      return false;
    }

    const index = this.moviesSubject.value.findIndex(m => m.id === updatedMovie.id);
    if (index === -1) {
      this.logger.warn(`Cannot update: Movie with id ${updatedMovie.id} not found`);
      return false;
    }
    const updated = this.moviesSubject.value.map(m => this.cloneMovie(m));
    updated[index] = this.normalizeMovie(updatedMovie);
    this.moviesSubject.next(updated);
    this.logger.log(`Fully updated movie: ${updatedMovie.title} (ID: ${updatedMovie.id})`);
    return true;
  }

  getRandomMovie(excludeIds: number[] = []): Movie | undefined {
    const candidates = this.moviesSubject.value.filter(m => !excludeIds.includes(m.id));
    if (candidates.length === 0) return undefined;
    return this.cloneMovie(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  getFavorites(): Observable<Movie[]> {
    return this.movies$.pipe(
      map(movies => movies.filter(m => m.isFavorite))
    );
  }

  getByDirector(director: string): Movie[] {
    return this.moviesSubject.value
      .filter(m => m.director === director)
      .map(m => ({ ...m }));
  }

  getDirectors(): { name: string; count: number; avgRating: number }[] {
    const directorMap = new Map<string, Movie[]>();
    for (const m of this.moviesSubject.value) {
      const list = directorMap.get(m.director) || [];
      list.push(m);
      directorMap.set(m.director, list);
    }
    return Array.from(directorMap.entries())
      .map(([name, movies]) => ({
        name,
        count: movies.length,
        avgRating: +(movies.reduce((s, m) => s + m.rating, 0) / movies.length).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count || b.avgRating - a.avgRating);
  }

  getRecommendations(movieId: number, limit = 6): Movie[] {
    const source = this.moviesSubject.value.find(m => m.id === movieId);
    if (!source) return [];
    const others = this.moviesSubject.value.filter(m => m.id !== movieId);
    const scored = others.map(m => {
      const genreOverlap = m.genres.filter(g => source.genres.includes(g)).length;
      const sameDirector = m.director === source.director ? 2 : 0;
      const ratingProximity = 1 - Math.abs(m.rating - source.rating) / 10;
      return { movie: { ...m }, score: genreOverlap * 3 + sameDirector + ratingProximity };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.movie);
  }

  getGenreStats(): { name: string; count: number; percent: number }[] {
    const genreMap = new Map<string, number>();
    const movies = this.moviesSubject.value;
    movies.forEach(m => m.genres?.forEach(g => genreMap.set(g, (genreMap.get(g) || 0) + 1)));
    const total = Array.from(genreMap.values()).reduce((a, b) => a + b, 0);
    return Array.from(genreMap.entries())
      .map(([name, count]) => ({ name, count, percent: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  }

  getYearDistribution(): { year: number; count: number }[] {
    const yearMap = new Map<number, number>();
    this.moviesSubject.value.forEach(m => {
      const year = m.releaseDate.getFullYear();
      yearMap.set(year, (yearMap.get(year) || 0) + 1);
    });
    return Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => a.year - b.year);
  }

  getRatingDistribution(): { range: string; count: number }[] {
    const ranges = [
      { range: '9.0+', min: 9, max: 10 },
      { range: '8.0-8.9', min: 8, max: 9 },
      { range: '7.0-7.9', min: 7, max: 8 },
      { range: '<7.0', min: 0, max: 7 }
    ];
    return ranges.map(r => ({
      range: r.range,
      count: this.moviesSubject.value.filter(m => m.rating >= r.min && m.rating < r.max).length
    }));
  }

  private cloneMovie(movie: Movie): Movie {
    return this.normalizeMovie({ ...movie });
  }

  private normalizeMovie(movie: Movie): Movie {
    return ensureMovieMedia({
      ...movie,
      releaseDate: coerceMovieDate(movie.releaseDate),
      genres: [...(movie.genres || [])],
      cast: movie.cast ? [...movie.cast] : []
    });
  }

  private dedupeMovies(movies: Movie[]): Movie[] {
    const seenKeys = new Set<string>();

    return movies.filter(movie => {
      const key = this.buildMovieIdentityKey(movie);
      if (seenKeys.has(key)) {
        return false;
      }

      seenKeys.add(key);
      return true;
    });
  }

  private isDuplicateMovie(movie: Movie): boolean {
    const targetKey = this.buildMovieIdentityKey(movie);
    return this.moviesSubject.value.some(existing => this.buildMovieIdentityKey(existing) === targetKey);
  }

  private buildMovieIdentityKey(movie: Pick<Movie, 'title' | 'releaseDate'>): string {
    const normalizedTitle = movie.title
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\u3400-\u9fff]+/gu, '');

    return `${normalizedTitle}-${coerceMovieDate(movie.releaseDate).getFullYear()}`;
  }

  private hasVerifiedPoster(url: string | undefined): boolean {
    const posterUrl = url?.trim() ?? '';
    return !!posterUrl && !isGeneratedMovieArt(posterUrl) && optimizeMovieImageUrl(posterUrl, 'poster') !== null;
  }
}
