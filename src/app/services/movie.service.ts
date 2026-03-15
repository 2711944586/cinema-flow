import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Movie } from '../models/movie';
import { MOCK_MOVIES } from '../data/mock-movies';

@Injectable({ providedIn: 'root' })
export class MovieService {
  private readonly moviesSubject = new BehaviorSubject<Movie[]>(
    MOCK_MOVIES.map(m => ({ ...m }))
  );

  readonly movies$ = this.moviesSubject.asObservable();

  getMovies(): Movie[] {
    return this.moviesSubject.value.map(m => ({ ...m }));
  }

  getMovieById(id: number): Movie | undefined {
    const movie = this.moviesSubject.value.find(m => m.id === id);
    return movie ? { ...movie } : undefined;
  }

  toggleFavorite(id: number): void {
    const updated = this.moviesSubject.value.map(m =>
      m.id === id ? { ...m, isFavorite: !m.isFavorite } : m
    );
    this.moviesSubject.next(updated);
  }

  toggleWatched(id: number): void {
    const updated = this.moviesSubject.value.map(m =>
      m.id === id ? { ...m, isWatched: !m.isWatched } : m
    );
    this.moviesSubject.next(updated);
  }

  setUserRating(id: number, rating: number): void {
    const updated = this.moviesSubject.value.map(m =>
      m.id === id ? { ...m, userRating: rating } : m
    );
    this.moviesSubject.next(updated);
  }

  updateMovie(id: number, changes: Partial<Movie>): void {
    const updated = this.moviesSubject.value.map(m =>
      m.id === id ? { ...m, ...changes } : m
    );
    this.moviesSubject.next(updated);
  }

  setNotes(id: number, notes: string): void {
    this.updateMovie(id, { userNotes: notes });
  }

  getRandomMovie(excludeIds: number[] = []): Movie | undefined {
    const candidates = this.moviesSubject.value.filter(m => !excludeIds.includes(m.id));
    if (candidates.length === 0) return undefined;
    return { ...candidates[Math.floor(Math.random() * candidates.length)] };
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
}
