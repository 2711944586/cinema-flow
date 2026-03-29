import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
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
export class CommandPaletteComponent implements AfterViewInit {
  @ViewChild('paletteInput') private paletteInput?: ElementRef<HTMLInputElement>;

  query = '';
  selectedIndex = 0;

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
    if (!this.query.trim()) {
      return this.recentHistoryService.getEntries(6).map(entry => ({
        id: `movie-${entry.movieId}`,
        group: 'Movies' as const,
        title: entry.title,
        subtitle: `${entry.director} · 最近访问 ${entry.section === 'cast' ? '演员表' : '基本信息'}`,
        icon: 'movie',
        route: `/movies/${entry.movieId}/${entry.section}`
      }));
    }

    return this.movieService.searchMovies(this.query, 8).map(movie => ({
      id: `movie-${movie.id}`,
      group: 'Movies' as const,
      title: movie.title,
      subtitle: `${movie.director} · ${movie.releaseDate.getFullYear()} · ${movie.rating}/10`,
      icon: 'local_movies',
      route: `/movies/${movie.id}/info`
    }));
  }

  get visibleItems(): CommandItem[] {
    return [...this.pageItems, ...this.movieItems];
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.paletteInput?.nativeElement.focus());
  }

  onInputChange(): void {
    this.selectedIndex = 0;
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
}
