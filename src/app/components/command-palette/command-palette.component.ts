import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { CORE_NAV_ITEMS, ENHANCEMENT_NAV_ITEMS } from '../../config/navigation';
import { MovieService } from '../../services/movie.service';
import { RecentHistoryService } from '../../services/recent-history.service';

interface CommandItem {
  id: string;
  group: 'Pages' | 'Movies';
  title: string;
  subtitle: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-command-palette',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  templateUrl: './command-palette.component.html',
  styleUrl: './command-palette.component.scss'
})
export class CommandPaletteComponent implements AfterViewInit, OnDestroy {
  @ViewChild('paletteInput') private paletteInput?: ElementRef<HTMLInputElement>;

  query = '';
  selectedIndex = 0;
  private readonly queryInput$ = new Subject<string>();
  private readonly subscriptions = new Subscription();
  private movieItemsSnapshot: CommandItem[] = [];

  constructor(
    private router: Router,
    private dialogRef: MatDialogRef<CommandPaletteComponent>,
    private movieService: MovieService,
    private recentHistoryService: RecentHistoryService
  ) {}

  get pageItems(): CommandItem[] {
    const pageSource = [...CORE_NAV_ITEMS, ...ENHANCEMENT_NAV_ITEMS].map(item => ({
      id: item.route,
      group: 'Pages' as const,
      title: item.label,
      subtitle: item.description,
      icon: item.icon,
      route: item.route
    }));

    if (!this.query.trim()) {
      return pageSource.slice(0, 7);
    }

    const normalizedQuery = this.query.trim().toLowerCase();
    return pageSource.filter(item =>
      item.title.toLowerCase().includes(normalizedQuery)
      || item.subtitle.toLowerCase().includes(normalizedQuery)
      || item.route.toLowerCase().includes(normalizedQuery)
    );
  }

  get movieItems(): CommandItem[] {
    return this.movieItemsSnapshot;
  }

  get visibleItems(): CommandItem[] {
    return [...this.pageItems, ...this.movieItems];
  }

  ngAfterViewInit(): void {
    this.movieItemsSnapshot = this.buildRecentMovieItems();
    this.subscriptions.add(
      this.queryInput$.pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(query => {
          const normalizedQuery = query.trim();
          if (!normalizedQuery) {
            return of(this.buildRecentMovieItems());
          }

          return this.movieService.searchMoviesRemote(normalizedQuery, 8).pipe(
            switchMap(movies => of(movies.map(movie => ({
              id: `movie-${movie.id}`,
              group: 'Movies' as const,
              title: movie.title,
              subtitle: `${movie.director} · ${movie.releaseDate.getFullYear()} · ${movie.rating}/10`,
              icon: 'local_movies',
              route: `/movies/${movie.id}/info`
            }))))
          );
        })
      ).subscribe(items => {
        this.movieItemsSnapshot = items;
        this.selectedIndex = Math.min(this.selectedIndex, Math.max(0, this.visibleItems.length - 1));
      })
    );
    queueMicrotask(() => this.paletteInput?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onInputChange(): void {
    this.selectedIndex = 0;
    this.queryInput$.next(this.query);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.selectedIndex = this.visibleItems.length === 0
        ? 0
        : (this.selectedIndex + 1) % this.visibleItems.length;
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.selectedIndex = this.visibleItems.length === 0
        ? 0
        : (this.selectedIndex - 1 + this.visibleItems.length) % this.visibleItems.length;
      return;
    }

    if (event.key === 'Enter' && this.visibleItems[this.selectedIndex]) {
      event.preventDefault();
      this.selectItem(this.visibleItems[this.selectedIndex]);
      return;
    }

    if (event.key === 'Escape') {
      this.dialogRef.close();
    }
  }

  selectItem(item: CommandItem): void {
    this.dialogRef.close();
    void this.router.navigateByUrl(item.route);
  }

  isSelected(item: CommandItem): boolean {
    return this.visibleItems[this.selectedIndex]?.id === item.id;
  }

  private buildRecentMovieItems(): CommandItem[] {
    return this.recentHistoryService.getEntries(6).map(entry => ({
      id: `movie-${entry.movieId}`,
      group: 'Movies' as const,
      title: entry.title,
      subtitle: `${entry.director} · 最近访问 ${entry.section === 'cast' ? '演员表' : '基本信息'}`,
      icon: 'movie',
      route: `/movies/${entry.movieId}/${entry.section}`
    }));
  }
}
