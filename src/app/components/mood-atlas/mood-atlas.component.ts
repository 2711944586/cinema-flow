import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { combineLatest } from 'rxjs';
import { Movie } from '../../models/movie';
import { WatchLogEntry } from '../../models/watch-log';
import { MovieService } from '../../services/movie.service';
import { WatchLogService } from '../../services/watch-log.service';
import { applyMovieImageFallback, formatDateInputValue } from '../../utils/movie-media';

interface MoodEntryView {
  movie: Movie;
  watchedAt: Date;
  watchedAtLabel: string;
  sessionRating: number | null;
  note: string;
  location: string;
}

interface MoodCluster {
  tag: string;
  count: number;
  averageScore: string;
  lastWatchedAt?: Date;
  entries: MoodEntryView[];
  featuredMovie?: Movie;
}

@Component({
  selector: 'app-mood-atlas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './mood-atlas.component.html',
  styleUrl: './mood-atlas.component.scss'
})
export class MoodAtlasComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  clusters: MoodCluster[] = [];
  filteredClusters: MoodCluster[] = [];
  selectedCluster?: MoodCluster;
  searchQuery = '';
  uniqueSessionCount = 0;

  constructor(
    private movieService: MovieService,
    private watchLogService: WatchLogService
  ) {}

  ngOnInit(): void {
    combineLatest([this.movieService.movies$, this.watchLogService.logs$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([movies, logs]) => {
        this.clusters = this.buildClusters(movies, logs);
        this.uniqueSessionCount = logs.length;
        this.applyFilters();
      });
  }

  get totalClusters(): number {
    return this.clusters.length;
  }

  get hottestCluster(): MoodCluster | undefined {
    return [...this.clusters].sort((first, second) => second.count - first.count)[0];
  }

  get strongestAverageScore(): string {
    if (this.clusters.length === 0) {
      return '0.0';
    }

    const bestCluster = [...this.clusters].sort((first, second) => Number(second.averageScore) - Number(first.averageScore))[0];
    return bestCluster?.averageScore ?? '0.0';
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredClusters = !query
      ? this.clusters
      : this.clusters.filter(cluster => {
          const titles = cluster.entries.map(entry => entry.movie.title).join(' ').toLowerCase();
          return cluster.tag.toLowerCase().includes(query) || titles.includes(query);
        });

    if (!this.filteredClusters.some(cluster => cluster.tag === this.selectedCluster?.tag)) {
      this.selectedCluster = this.filteredClusters[0];
    }
  }

  selectCluster(cluster: MoodCluster): void {
    this.selectedCluster = cluster;
  }

  trackByMood(index: number, cluster: MoodCluster): string {
    return cluster.tag;
  }

  trackByEntry(index: number, entry: MoodEntryView): string {
    return `${entry.movie.id}-${entry.watchedAt.getTime()}-${index}`;
  }

  onImageError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  private buildClusters(movies: Movie[], logs: WatchLogEntry[]): MoodCluster[] {
    const movieMap = new Map(movies.map(movie => [movie.id, movie]));
    const clusterMap = new Map<string, MoodEntryView[]>();

    logs.forEach(log => {
      const movie = movieMap.get(log.movieId);
      if (!movie) {
        return;
      }

      const tags = log.moodTags.length > 0 ? log.moodTags : ['未标记'];
      const entry: MoodEntryView = {
        movie,
        watchedAt: new Date(log.watchedAt),
        watchedAtLabel: formatDateInputValue(log.watchedAt),
        sessionRating: log.sessionRating,
        note: log.note,
        location: log.location
      };

      tags.forEach(tag => {
        const bucket = clusterMap.get(tag) ?? [];
        bucket.push(entry);
        clusterMap.set(tag, bucket);
      });
    });

    return Array.from(clusterMap.entries())
      .map(([tag, entries]) => {
        const orderedEntries = [...entries].sort((first, second) => second.watchedAt.getTime() - first.watchedAt.getTime());
        const averageScore = orderedEntries.length === 0
          ? '0.0'
          : (
              orderedEntries.reduce((sum, entry) => sum + (entry.sessionRating ?? entry.movie.rating), 0)
              / orderedEntries.length
            ).toFixed(1);

        return {
          tag,
          count: orderedEntries.length,
          averageScore,
          lastWatchedAt: orderedEntries[0]?.watchedAt,
          entries: orderedEntries,
          featuredMovie: [...orderedEntries]
            .sort((first, second) => (second.sessionRating ?? second.movie.rating) - (first.sessionRating ?? first.movie.rating))[0]?.movie
        } satisfies MoodCluster;
      })
      .sort((first, second) => second.count - first.count || Number(second.averageScore) - Number(first.averageScore));
  }
}
