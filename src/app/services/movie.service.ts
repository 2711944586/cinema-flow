import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { fetchExpandedMovieSeeds, type RemoteMovieSeed } from '../data/expanded-movie-catalog';
import { MOCK_MOVIES } from '../data/mock-movies';
import { Movie } from '../models/movie';
import { buildDirectorId } from '../utils/director-identity';
import {
  coerceMovieDate,
  ensureMovieMedia,
  isGeneratedMovieArt,
  optimizeMovieImageUrl
} from '../utils/movie-media';
import { LoggerService } from './logger.service';

@Injectable({ providedIn: 'root' })
export class MovieService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiUrl = '/api/movies';
  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };
  private readonly storageKey = 'cinemaflow.movies.v4';
  private readonly deprecatedStorageKeys = ['cinemaflow.movies.v3', 'cinemaflow.movies.v2'];
  private readonly minimumCatalogSize = 180;
  private readonly moviesSubject: BehaviorSubject<Movie[]>;
  private expansionInFlight = false;

  readonly movies$: Observable<Movie[]>;

  constructor(private logger: LoggerService) {
    const initialMovies = this.loadInitialMovies();
    this.moviesSubject = new BehaviorSubject<Movie[]>(initialMovies);
    this.movies$ = this.moviesSubject.asObservable();

    this.logger.log(`MovieService initialized with ${initialMovies.length} movies`);
    void this.prefetchFromApiIfAvailable();
    void this.prefetchExpandedCatalogIfNeeded();
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

  searchMoviesRemote(query: string, limit = 8): Observable<Movie[]> {
    const normalizedQuery = query.trim();
    if (!this.http) {
      return of(this.searchMovies(normalizedQuery, limit));
    }

    const params = new URLSearchParams();
    if (normalizedQuery) {
      params.set('title', normalizedQuery);
    }

    const url = params.toString() ? `${this.apiUrl}?${params.toString()}` : this.apiUrl;
    return this.http.get<Movie[]>(url).pipe(
      map(movies => movies.map(movie => this.normalizeMovie(movie)).slice(0, limit)),
      tap(movies => this.logger.log(`HTTP movie search returned ${movies.length} items`, 'MovieService')),
      catchError(error => {
        this.logger.warn(`HTTP movie search failed, falling back locally: ${this.describeHttpError(error)}`);
        return of(this.searchMovies(normalizedQuery, limit));
      })
    );
  }

  getMoviesByGenreRoute(genre: string): Movie[] {
    return this.moviesSubject.value
      .filter(movie => movie.genres.includes(genre) || movie.genre === genre)
      .map(movie => this.cloneMovie(movie));
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

    this.syncUpdateMovie({ ...movie, isFavorite: !movie.isFavorite });
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

    this.syncUpdateMovie({ ...movie, isWatched: !movie.isWatched });
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

    this.syncUpdateMovie({ ...movie, userRating: rating });
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

    this.syncUpdateMovie(this.normalizeMovie({ ...movie, ...changes }));
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

    this.syncCreateMovie(newMovie);
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

    this.syncDeleteMovie(id);
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

    this.syncUpdateMovie(updatedMovie);
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
    const fallbackMovies = this.normalizeMovieList(MOCK_MOVIES);

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

      const persistedMovies = this.normalizeMovieList(parsedValue);
      return persistedMovies.length > 0 ? persistedMovies : fallbackMovies;
    } catch {
      return fallbackMovies;
    }
  }

  private commitMovies(movies: Movie[], logMessage?: string): void {
    const normalizedMovies = this.normalizeMovieList(movies);
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

    try {
      const persistableMovies = movies.map(movie => this.toPersistableMovie(movie));
      localStorage.setItem(this.storageKey, JSON.stringify(persistableMovies));
      this.deprecatedStorageKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      this.logger.warn(`Failed to persist movie library: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  private async prefetchFromApiIfAvailable(): Promise<void> {
    if (!this.http) {
      return;
    }

    this.http.get<Movie[]>(this.apiUrl).pipe(
      map(movies => Array.isArray(movies) ? movies.map(movie => this.normalizeMovie(movie)) : []),
      tap(movies => {
        if (movies.length === 0) {
          return;
        }

        this.commitMovies(
          this.mergeApiMovies(movies),
          `Synced ${movies.length} movies from Flask API`
        );
      }),
      catchError(error => {
        this.logger.warn(`Flask movie API unavailable, using local catalog: ${this.describeHttpError(error)}`);
        return of([]);
      })
    ).subscribe();
  }

  private async prefetchExpandedCatalogIfNeeded(): Promise<void> {
    if (this.expansionInFlight || this.moviesSubject.value.length >= this.minimumCatalogSize || typeof fetch !== 'function') {
      return;
    }

    this.expansionInFlight = true;

    try {
      const remoteMovies = await fetchExpandedMovieSeeds(fetch);
      if (remoteMovies.length === 0) {
        this.logger.warn('Expanded catalog fetch returned no movies');
        return;
      }

      const expandedMovies = this.mergeExpandedCatalog(remoteMovies);
      if (expandedMovies.length <= this.moviesSubject.value.length) {
        return;
      }

      this.commitMovies(
        expandedMovies,
        `Expanded movie catalog from ${this.moviesSubject.value.length} to ${expandedMovies.length} entries`
      );
    } catch (error) {
      this.logger.warn(`Expanded catalog fetch failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      this.expansionInFlight = false;
    }
  }

  private mergeExpandedCatalog(remoteMovies: RemoteMovieSeed[]): Movie[] {
    const catalogMap = new Map<string, Movie>();
    let nextId = this.moviesSubject.value.length > 0
      ? Math.max(...this.moviesSubject.value.map(movie => movie.id)) + 1
      : 1;

    this.moviesSubject.value.forEach(movie => {
      catalogMap.set(this.buildMovieIdentityKey(movie), this.cloneMovie(movie));
    });

    remoteMovies.forEach(remoteMovie => {
      const normalizedMovie = this.normalizeMovie({ ...remoteMovie, id: nextId });
      if (!this.isCredibleLibraryMovie(normalizedMovie)) {
        return;
      }

      const identityKey = this.buildMovieIdentityKey(normalizedMovie);
      const currentMovie = catalogMap.get(identityKey);

      if (currentMovie) {
        catalogMap.set(identityKey, this.mergeCatalogEntry(currentMovie, normalizedMovie));
        return;
      }

      catalogMap.set(identityKey, normalizedMovie);
      nextId += 1;
    });

    return Array.from(catalogMap.values()).sort((first, second) => first.id - second.id);
  }

  private mergeApiMovies(apiMovies: Movie[]): Movie[] {
    const catalogMap = new Map<string, Movie>();

    this.moviesSubject.value.forEach(movie => {
      catalogMap.set(this.buildMovieIdentityKey(movie), this.cloneMovie(movie));
    });

    apiMovies.forEach(apiMovie => {
      const normalizedMovie = this.normalizeMovie(apiMovie);
      if (!this.isCredibleLibraryMovie(normalizedMovie)) {
        return;
      }

      const identityKey = this.buildMovieIdentityKey(normalizedMovie);
      const currentMovie = catalogMap.get(identityKey);
      catalogMap.set(identityKey, currentMovie ? this.mergeCatalogEntry(currentMovie, normalizedMovie) : normalizedMovie);
    });

    return Array.from(catalogMap.values()).sort((first, second) => first.id - second.id);
  }

  private mergeCatalogEntry(currentMovie: Movie, incomingMovie: Movie): Movie {
    const shouldUseIncomingPoster = (!this.hasVerifiedPoster(currentMovie.posterUrl) || this.isRemoteFallbackArt(currentMovie.posterUrl))
      && this.hasVerifiedPoster(incomingMovie.posterUrl)
      && !this.isRemoteFallbackArt(incomingMovie.posterUrl);
    const shouldUseIncomingBackdrop = (!this.hasVerifiedBackdrop(currentMovie.backdropUrl) || this.isRemoteFallbackArt(currentMovie.backdropUrl))
      && this.hasVerifiedBackdrop(incomingMovie.backdropUrl)
      && !this.isRemoteFallbackArt(incomingMovie.backdropUrl);

    return this.normalizeMovie({
      ...currentMovie,
      posterUrl: shouldUseIncomingPoster ? incomingMovie.posterUrl : currentMovie.posterUrl,
      backdropUrl: shouldUseIncomingBackdrop
        ? incomingMovie.backdropUrl
        : shouldUseIncomingPoster
          ? incomingMovie.posterUrl
          : currentMovie.backdropUrl,
      cast: currentMovie.cast && currentMovie.cast.length > 0 ? currentMovie.cast : incomingMovie.cast,
      description: currentMovie.description?.trim() ? currentMovie.description : incomingMovie.description,
      boxOffice: currentMovie.boxOffice ?? incomingMovie.boxOffice,
      language: currentMovie.language ?? incomingMovie.language
    });
  }

  private toPersistableMovie(movie: Movie): Movie {
    return {
      ...movie,
      posterUrl: isGeneratedMovieArt(movie.posterUrl) ? '' : movie.posterUrl,
      backdropUrl: isGeneratedMovieArt(movie.backdropUrl) ? '' : movie.backdropUrl,
      cast: movie.cast ? [...movie.cast] : [],
      genres: [...movie.genres],
      userNotes: movie.userNotes ?? ''
    };
  }

  private cloneMovie(movie: Movie): Movie {
    return this.normalizeMovie({ ...movie });
  }

  private normalizeMovie(movie: Movie): Movie {
    const releaseDate = coerceMovieDate(movie.releaseDate);
    const genres = [...(movie.genres || [])].filter(Boolean);
    const primaryGenre = movie.genre?.trim() || genres[0] || '剧情';
    const normalizedGenres = genres.length > 0 ? genres : [primaryGenre];

    return ensureMovieMedia({
      ...movie,
      releaseDate,
      directorId: movie.directorId ?? buildDirectorId(movie.director),
      genre: primaryGenre,
      releaseYear: movie.releaseYear ?? releaseDate.getFullYear(),
      status: movie.status ?? (movie.isWatched ? 'archived' : 'showing'),
      genres: normalizedGenres,
      cast: movie.cast ? [...movie.cast] : [],
      userNotes: movie.userNotes ?? ''
    });
  }

  private normalizeMovieList(movies: Movie[]): Movie[] {
    return this.dedupeMovies(
      movies
        .map(movie => this.normalizeMovie(movie))
        .filter(movie => this.isCredibleLibraryMovie(movie))
    );
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

  private isCredibleLibraryMovie(movie: Movie): boolean {
    const title = movie.title?.trim() ?? '';
    const director = movie.director?.trim() ?? '';
    const releaseYear = coerceMovieDate(movie.releaseDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const hasValidRating = Number.isFinite(movie.rating) && movie.rating >= 0 && movie.rating <= 10;
    const hasValidDuration = Number.isFinite(movie.duration) && movie.duration >= 1;

    return title.length > 0
      && director.length > 0
      && director !== '佚名导演'
      && releaseYear >= 1888
      && releaseYear <= currentYear
      && hasValidRating
      && hasValidDuration;
  }

  private buildMovieIdentityKey(movie: Pick<Movie, 'title' | 'releaseDate'>): string {
    const normalizedTitle = this.extractCanonicalTitle(movie.title)
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\u3400-\u9fff]+/gu, '');

    return `${normalizedTitle}-${coerceMovieDate(movie.releaseDate).getFullYear()}`;
  }

  private extractCanonicalTitle(title: string): string {
    const normalizedTitle = title
      .replace(/[（(][^（）()]+[)）]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (/[A-Za-z]/.test(normalizedTitle)) {
      return normalizedTitle;
    }

    const aliasMatches = Array.from(title.matchAll(/[（(]([^（）()]+)[)）]/g));
    const englishAlias = aliasMatches
      .map(match => match[1]?.trim() ?? '')
      .find(alias => /[A-Za-z]/.test(alias));

    return englishAlias || normalizedTitle || title.trim();
  }

  private hasVerifiedPoster(url: string | undefined): boolean {
    const posterUrl = url?.trim() ?? '';
    return !!posterUrl
      && !isGeneratedMovieArt(posterUrl)
      && optimizeMovieImageUrl(posterUrl, 'poster') !== null;
  }

  private hasVerifiedBackdrop(url: string | undefined): boolean {
    const backdropUrl = url?.trim() ?? '';
    return !!backdropUrl
      && !isGeneratedMovieArt(backdropUrl)
      && optimizeMovieImageUrl(backdropUrl, 'backdrop') !== null;
  }

  private isRemoteFallbackArt(url: string | undefined): boolean {
    return !!url && /https:\/\/picsum\.photos\/seed\//i.test(url);
  }

  private syncCreateMovie(movie: Movie): void {
    if (!this.http) {
      return;
    }

    this.http.post<Movie>(this.apiUrl, this.toApiMovie(movie), this.httpOptions).pipe(
      tap(createdMovie => this.logger.log(`HTTP created movie ${createdMovie.title}`, 'MovieService')),
      catchError(error => {
        this.logger.warn(`HTTP create movie failed: ${this.describeHttpError(error)}`);
        return of(null);
      })
    ).subscribe();
  }

  private syncUpdateMovie(movie: Movie): void {
    if (!this.http) {
      return;
    }

    this.http.put<Movie>(`${this.apiUrl}/${movie.id}`, this.toApiMovie(movie), this.httpOptions).pipe(
      tap(updatedMovie => this.logger.log(`HTTP updated movie ${updatedMovie.title}`, 'MovieService')),
      catchError(error => {
        this.logger.warn(`HTTP update movie failed: ${this.describeHttpError(error)}`);
        return of(null);
      })
    ).subscribe();
  }

  private syncDeleteMovie(id: number): void {
    if (!this.http) {
      return;
    }

    this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.logger.log(`HTTP deleted movie ${id}`, 'MovieService')),
      catchError(error => {
        this.logger.warn(`HTTP delete movie failed: ${this.describeHttpError(error)}`);
        return of(null);
      })
    ).subscribe();
  }

  private toApiMovie(movie: Movie): Movie {
    const normalizedMovie = this.normalizeMovie(movie);
    return {
      ...normalizedMovie,
      releaseYear: normalizedMovie.releaseDate.getFullYear(),
      genre: normalizedMovie.genres[0] ?? normalizedMovie.genre ?? '剧情'
    };
  }

  private describeHttpError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error && 'status' in error) {
      return `status ${(error as { status: number }).status}`;
    }

    return 'unknown error';
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
