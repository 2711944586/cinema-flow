import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { MOCK_MOVIES } from '../data/mock-movies';
import { Movie } from '../models/movie';
import {
  coerceMovieDate,
  ensureMovieMedia,
  isGeneratedMovieArt,
  optimizeMovieImageUrl
} from '../utils/movie-media';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class MovieService {
  private readonly storageKey = 'cinemaflow.movies.v2';
  private readonly moviesSubject: BehaviorSubject<Movie[]>;

  readonly movies$: Observable<Movie[]>;

  constructor(private logger: LoggerService) {
    const initialMovies = this.loadInitialMovies();
    this.moviesSubject = new BehaviorSubject<Movie[]>(initialMovies);
    this.movies$ = this.moviesSubject.asObservable();

    this.logger.log(`MovieService initialized with ${initialMovies.length} movies`);
  }

  getMovies(): Movie[] {
    return this.moviesSubject.value.map(movie => this.cloneMovie(movie));
  }

  getMoviesObservable(): Observable<Movie[]> {
    return this.movies$;
  }

  getMovieById(id: number): Movie | undefined {
    const movie = this.moviesSubject.value.find(item => item.id === id);
    if (movie) {
      return this.cloneMovie(movie);
    }

    this.logger.warn(`Movie with id ${id} not found`);
    return undefined;
  }

  getMovieByIdObservable(id: number): Observable<Movie | undefined> {
    return of(this.getMovieById(id));
  }

  getRecentAdded(limit = 6): Movie[] {
    return [...this.moviesSubject.value]
      .sort((first, second) => second.id - first.id)
      .slice(0, limit)
      .map(movie => this.cloneMovie(movie));
  }

  getAllGenres(): string[] {
    return Array.from(new Set(this.moviesSubject.value.flatMap(movie => movie.genres ?? [])))
      .sort((first, second) => first.localeCompare(second, 'zh-CN'));
  }

  searchMovies(query: string, limit = 8): Movie[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return this.getRecentAdded(limit);
    }

    return [...this.moviesSubject.value]
      .map(movie => ({
        movie,
        score: this.scoreMovieMatch(movie, normalizedQuery)
      }))
      .filter(result => result.score > 0)
      .sort((first, second) =>
        second.score - first.score
        || second.movie.rating - first.movie.rating
        || second.movie.id - first.movie.id
      )
      .slice(0, limit)
      .map(result => this.cloneMovie(result.movie));
  }

  getMovieNeighbors(id: number): { previous?: Movie; next?: Movie } {
    const orderedMovies = [...this.moviesSubject.value].sort((first, second) => first.id - second.id);
    const currentIndex = orderedMovies.findIndex(movie => movie.id === id);

    if (currentIndex === -1) {
      return {};
    }

    return {
      previous: currentIndex > 0 ? this.cloneMovie(orderedMovies[currentIndex - 1]) : undefined,
      next: currentIndex < orderedMovies.length - 1 ? this.cloneMovie(orderedMovies[currentIndex + 1]) : undefined
    };
  }

  toggleFavorite(id: number): void {
    const movie = this.moviesSubject.value.find(item => item.id === id);
    if (!movie) {
      return;
    }

    this.commitMovies(
      this.moviesSubject.value.map(item =>
        item.id === id
          ? this.normalizeMovie({ ...item, isFavorite: !item.isFavorite })
          : this.cloneMovie(item)
      ),
      `${movie.title} favorite status toggled to ${!movie.isFavorite}`
    );
  }

  toggleWatched(id: number): void {
    const movie = this.moviesSubject.value.find(item => item.id === id);
    if (!movie) {
      return;
    }

    this.commitMovies(
      this.moviesSubject.value.map(item =>
        item.id === id
          ? this.normalizeMovie({ ...item, isWatched: !item.isWatched })
          : this.cloneMovie(item)
      ),
      `${movie.title} watched status toggled to ${!movie.isWatched}`
    );
  }

  setUserRating(id: number, rating: number): void {
    const movie = this.moviesSubject.value.find(item => item.id === id);
    if (!movie) {
      return;
    }

    this.commitMovies(
      this.moviesSubject.value.map(item =>
        item.id === id
          ? this.normalizeMovie({ ...item, userRating: rating })
          : this.cloneMovie(item)
      ),
      `${movie.title} rated ${rating}/10`
    );
  }

  updateMovie(id: number, changes: Partial<Movie>): void {
    if (changes.posterUrl !== undefined && !this.hasVerifiedPoster(changes.posterUrl)) {
      this.logger.warn(`Rejected poster update for movie ${id}: poster must be a verified external image URL`);
      return;
    }

    const movie = this.moviesSubject.value.find(item => item.id === id);
    if (!movie) {
      this.logger.warn(`Cannot update: Movie with id ${id} not found`);
      return;
    }

    this.commitMovies(
      this.moviesSubject.value.map(item =>
        item.id === id
          ? this.normalizeMovie({ ...item, ...changes })
          : this.cloneMovie(item)
      ),
      `Updated movie ${movie.title}: ${JSON.stringify(changes)}`
    );
  }

  setNotes(id: number, notes: string): void {
    this.updateMovie(id, { userNotes: notes });
    this.logger.log(`Added notes to movie ${id}`);
  }

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

    const nextId = this.moviesSubject.value.length > 0
      ? Math.max(...this.moviesSubject.value.map(item => item.id)) + 1
      : 1;
    const newMovie: Movie = { ...normalizedMovie, id: nextId };

    this.commitMovies(
      [...this.moviesSubject.value.map(item => this.cloneMovie(item)), newMovie],
      `Added new movie: ${movie.title} (ID: ${nextId})`
    );

    return true;
  }

  deleteMovie(id: number): boolean {
    const movie = this.moviesSubject.value.find(item => item.id === id);
    if (!movie) {
      this.logger.warn(`Cannot delete: Movie with id ${id} not found`);
      return false;
    }

    this.commitMovies(
      this.moviesSubject.value
        .filter(item => item.id !== id)
        .map(item => this.cloneMovie(item)),
      `Deleted movie: ${movie.title} (ID: ${id})`
    );

    return true;
  }

  updateMovieFull(updatedMovie: Movie): boolean {
    if (!this.hasVerifiedPoster(updatedMovie.posterUrl)) {
      this.logger.warn(`Cannot update movie ${updatedMovie.id}: poster must be a verified external image URL`);
      return false;
    }

    const movieIndex = this.moviesSubject.value.findIndex(item => item.id === updatedMovie.id);
    if (movieIndex === -1) {
      this.logger.warn(`Cannot update: Movie with id ${updatedMovie.id} not found`);
      return false;
    }

    const updatedMovies = this.moviesSubject.value.map(item => this.cloneMovie(item));
    updatedMovies[movieIndex] = this.normalizeMovie(updatedMovie);

    this.commitMovies(
      updatedMovies,
      `Fully updated movie: ${updatedMovie.title} (ID: ${updatedMovie.id})`
    );

    return true;
  }

  replaceMovies(movies: Movie[]): boolean {
    if (!Array.isArray(movies)) {
      return false;
    }

    const normalizedMovies = this.dedupeMovies(movies.map(movie => this.normalizeMovie(movie)));
    this.commitMovies(normalizedMovies, `Replaced entire movie collection with ${normalizedMovies.length} movies`);
    return true;
  }

  getRandomMovie(excludeIds: number[] = []): Movie | undefined {
    const candidates = this.moviesSubject.value.filter(movie => !excludeIds.includes(movie.id));
    if (candidates.length === 0) {
      return undefined;
    }

    return this.cloneMovie(candidates[Math.floor(Math.random() * candidates.length)]);
  }

  getFavorites(): Observable<Movie[]> {
    return this.movies$.pipe(map(movies => movies.filter(movie => movie.isFavorite)));
  }

  getByDirector(director: string): Movie[] {
    return this.moviesSubject.value
      .filter(movie => movie.director === director)
      .map(movie => this.cloneMovie(movie));
  }

  getDirectors(): { name: string; count: number; avgRating: number }[] {
    const directorMap = new Map<string, Movie[]>();

    for (const movie of this.moviesSubject.value) {
      const directorMovies = directorMap.get(movie.director) || [];
      directorMovies.push(movie);
      directorMap.set(movie.director, directorMovies);
    }

    return Array.from(directorMap.entries())
      .map(([name, movies]) => ({
        name,
        count: movies.length,
        avgRating: +(movies.reduce((sum, movie) => sum + movie.rating, 0) / movies.length).toFixed(1)
      }))
      .sort((first, second) => second.count - first.count || second.avgRating - first.avgRating);
  }

  getRecommendations(movieId: number, limit = 6): Movie[] {
    const sourceMovie = this.moviesSubject.value.find(movie => movie.id === movieId);
    if (!sourceMovie) {
      return [];
    }

    return this.moviesSubject.value
      .filter(movie => movie.id !== movieId)
      .map(movie => {
        const genreOverlap = movie.genres.filter(genre => sourceMovie.genres.includes(genre)).length;
        const sameDirector = movie.director === sourceMovie.director ? 2 : 0;
        const ratingProximity = 1 - Math.abs(movie.rating - sourceMovie.rating) / 10;

        return {
          movie: this.cloneMovie(movie),
          score: genreOverlap * 3 + sameDirector + ratingProximity
        };
      })
      .sort((first, second) => second.score - first.score)
      .slice(0, limit)
      .map(result => result.movie);
  }

  getGenreStats(): { name: string; count: number; percent: number }[] {
    const genreMap = new Map<string, number>();
    const movies = this.moviesSubject.value;

    movies.forEach(movie => movie.genres?.forEach(genre => genreMap.set(genre, (genreMap.get(genre) || 0) + 1)));

    const total = Array.from(genreMap.values()).reduce((sum, count) => sum + count, 0);
    return Array.from(genreMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percent: total > 0 ? Math.round((count / total) * 100) : 0
      }))
      .sort((first, second) => second.count - first.count);
  }

  getYearDistribution(): { year: number; count: number }[] {
    const yearMap = new Map<number, number>();
    this.moviesSubject.value.forEach(movie => {
      const year = movie.releaseDate.getFullYear();
      yearMap.set(year, (yearMap.get(year) || 0) + 1);
    });

    return Array.from(yearMap.entries())
      .map(([year, count]) => ({ year, count }))
      .sort((first, second) => first.year - second.year);
  }

  getRatingDistribution(): { range: string; count: number }[] {
    const ranges = [
      { range: '9.0+', min: 9, max: 10 },
      { range: '8.0-8.9', min: 8, max: 9 },
      { range: '7.0-7.9', min: 7, max: 8 },
      { range: '<7.0', min: 0, max: 7 }
    ];

    return ranges.map(range => ({
      range: range.range,
      count: this.moviesSubject.value.filter(movie => movie.rating >= range.min && movie.rating < range.max).length
    }));
  }

  private loadInitialMovies(): Movie[] {
    const fallbackMovies = this.dedupeMovies(MOCK_MOVIES.map(movie => this.normalizeMovie(movie)));

    if (typeof localStorage === 'undefined') {
      return fallbackMovies;
    }

    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) {
        return fallbackMovies;
      }

      const parsedValue = JSON.parse(rawValue);
      if (!Array.isArray(parsedValue)) {
        return fallbackMovies;
      }

      const persistedMovies = this.dedupeMovies(parsedValue.map(movie => this.normalizeMovie(movie)));
      return persistedMovies.length > 0 ? persistedMovies : fallbackMovies;
    } catch {
      return fallbackMovies;
    }
  }

  private commitMovies(movies: Movie[], logMessage?: string): void {
    const normalizedMovies = this.dedupeMovies(movies.map(movie => this.normalizeMovie(movie)));
    this.moviesSubject.next(normalizedMovies);
    this.persistMovies(normalizedMovies);

    if (logMessage) {
      this.logger.log(logMessage);
    }
  }

  private persistMovies(movies: Movie[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(movies));
  }

  private cloneMovie(movie: Movie): Movie {
    return this.normalizeMovie({ ...movie });
  }

  private normalizeMovie(movie: Movie): Movie {
    return ensureMovieMedia({
      ...movie,
      releaseDate: coerceMovieDate(movie.releaseDate),
      genres: [...(movie.genres || [])],
      cast: movie.cast ? [...movie.cast] : [],
      userNotes: movie.userNotes ?? ''
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
    return !!posterUrl
      && !isGeneratedMovieArt(posterUrl)
      && optimizeMovieImageUrl(posterUrl, 'poster') !== null;
  }

  private scoreMovieMatch(movie: Movie, query: string): number {
    const normalizedTitle = movie.title.toLowerCase();
    const normalizedDirector = movie.director.toLowerCase();
    const castHit = movie.cast?.some(actor => actor.toLowerCase().includes(query)) ?? false;
    const genreHit = movie.genres.some(genre => genre.toLowerCase().includes(query));

    if (normalizedTitle === query) {
      return 100;
    }

    if (normalizedTitle.includes(query)) {
      return 80;
    }

    if (normalizedDirector.includes(query)) {
      return 55;
    }

    if (castHit) {
      return 45;
    }

    if (genreHit) {
      return 35;
    }

    return 0;
  }
}
