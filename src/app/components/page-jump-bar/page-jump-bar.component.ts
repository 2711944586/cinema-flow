import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CORE_NAV_ITEMS, ENHANCEMENT_NAV_ITEMS, type AppNavItem } from '../../config/navigation';

@Component({
  selector: 'app-page-jump-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './page-jump-bar.component.html',
  styleUrl: './page-jump-bar.component.scss'
})
export class PageJumpBarComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

  readonly pages = [...CORE_NAV_ITEMS, ...ENHANCEMENT_NAV_ITEMS];
  selectedRoute = this.pages[0]?.route ?? '/dashboard';

  ngOnInit(): void {
    this.syncRoute(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => this.syncRoute(event.urlAfterRedirects));
  }

  get currentPage(): AppNavItem | null {
    return this.pages.find(page => page.route === this.selectedRoute) ?? null;
  }

  get currentIndex(): number {
    return this.pages.findIndex(page => page.route === this.selectedRoute);
  }

  get previousPage(): AppNavItem | null {
    if (this.currentIndex <= 0) {
      return null;
    }

    return this.pages[this.currentIndex - 1] ?? null;
  }

  get nextPage(): AppNavItem | null {
    if (this.currentIndex < 0 || this.currentIndex >= this.pages.length - 1) {
      return null;
    }

    return this.pages[this.currentIndex + 1] ?? null;
  }

  navigateTo(route: string): void {
    if (!route || route === this.selectedRoute) {
      return;
    }

    void this.router.navigateByUrl(route);
  }

  private syncRoute(url: string): void {
    const firstSegment = url.split('?')[0].split('#')[0].split('/').filter(Boolean)[0] ?? 'dashboard';
    const normalizedUrl = firstSegment === 'add' ? '/movies' : `/${firstSegment}`;
    if (this.pages.some(page => page.route === normalizedUrl)) {
      this.selectedRoute = normalizedUrl;
    }
  }
}
