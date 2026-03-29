import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Movie } from '../models/movie';

export interface RecentHistoryEntry {
  movieId: number;
  title: string;
  director: string;
  posterUrl: string;
  rating: number;
  releaseYear: number;
  section: 'info' | 'cast';
  visitedAt: Date;
}

@Injectable({ providedIn: 'root' })
export class RecentHistoryService {
  private readonly storageKey = 'cinemaflow.recent-history.v2';
  private readonly maxEntries = 8;
  private readonly historySubject = new BehaviorSubject<RecentHistoryEntry[]>(this.loadEntries());

  readonly history$ = this.historySubject.asObservable();

  getEntries(limit = this.maxEntries): RecentHistoryEntry[] {
    return this.historySubject.value.slice(0, limit).map(entry => ({ ...entry }));
  }

  recordVisit(movie: Movie, section: 'info' | 'cast' = 'info'): void {
    const entry: RecentHistoryEntry = {
      movieId: movie.id,
      title: movie.title,
      director: movie.director,
      posterUrl: movie.posterUrl,
      rating: movie.rating,
      releaseYear: movie.releaseDate.getFullYear(),
      section,
      visitedAt: new Date()
    };

    const nextEntries = [
      entry,
      ...this.historySubject.value.filter(item => item.movieId !== movie.id)
    ].slice(0, this.maxEntries);

    this.commit(nextEntries);
  }

  replaceHistory(entries: RecentHistoryEntry[]): void {
    const normalizedEntries = entries
      .map(entry => this.normalizeEntry(entry))
      .filter((entry): entry is RecentHistoryEntry => entry !== null)
      .sort((first, second) => second.visitedAt.getTime() - first.visitedAt.getTime())
      .reduce<RecentHistoryEntry[]>((accumulator, entry) => {
        if (accumulator.some(item => item.movieId === entry.movieId)) {
          return accumulator;
        }

        accumulator.push(entry);
        return accumulator;
      }, [])
      .slice(0, this.maxEntries);

    this.commit(normalizedEntries);
  }

  clear(): void {
    this.commit([]);
  }

  private commit(entries: RecentHistoryEntry[]): void {
    this.historySubject.next(entries.map(entry => ({ ...entry })));
    this.persistEntries(entries);
  }

  private loadEntries(): RecentHistoryEntry[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const rawValue = localStorage.getItem(this.storageKey);
      if (!rawValue) {
        return [];
      }

      const parsedValue = JSON.parse(rawValue);
      if (!Array.isArray(parsedValue)) {
        return [];
      }

      return parsedValue
        .map(entry => this.normalizeEntry(entry))
        .filter((entry): entry is RecentHistoryEntry => entry !== null)
        .sort((first, second) => second.visitedAt.getTime() - first.visitedAt.getTime())
        .slice(0, this.maxEntries);
    } catch {
      return [];
    }
  }

  private persistEntries(entries: RecentHistoryEntry[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(entries));
  }

  private normalizeEntry(entry: Partial<RecentHistoryEntry> | null | undefined): RecentHistoryEntry | null {
    if (!entry || typeof entry.movieId !== 'number' || !entry.title || !entry.posterUrl) {
      return null;
    }

    const visitedAt = new Date(entry.visitedAt ?? '');
    if (Number.isNaN(visitedAt.getTime())) {
      return null;
    }

    return {
      movieId: entry.movieId,
      title: entry.title,
      director: entry.director ?? '未知导演',
      posterUrl: entry.posterUrl,
      rating: Number(entry.rating ?? 0),
      releaseYear: Number(entry.releaseYear ?? 0),
      section: entry.section === 'cast' ? 'cast' : 'info',
      visitedAt
    };
  }
}
