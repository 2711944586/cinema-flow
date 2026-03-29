import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, startWith } from 'rxjs/operators';
import { BREADCRUMB_LABELS } from '../../config/navigation';

interface BreadcrumbItem {
  label: string;
  url: string;
  last: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss'
})
export class BreadcrumbComponent {
  items: BreadcrumbItem[] = [];

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.items = this.buildBreadcrumbs();
      });
  }

  private buildBreadcrumbs(): BreadcrumbItem[] {
    const routeItems: BreadcrumbItem[] = [];
    let route = this.activatedRoute.root;
    let url = '';

    while (route.firstChild) {
      route = route.firstChild;
      const snapshot = route.snapshot;

      if (snapshot.url.length > 0) {
        const segment = snapshot.url.map(item => item.path).join('/');
        url += `/${segment}`;

        routeItems.push({
          label: this.resolveLabel(snapshot),
          url,
          last: false
        });
      }
    }

    const dashboardCrumb: BreadcrumbItem = {
      label: BREADCRUMB_LABELS['dashboard'],
      url: '/dashboard',
      last: false
    };

    const items = routeItems.length === 0
      ? [dashboardCrumb]
      : routeItems[0]?.url === '/dashboard'
        ? routeItems
        : [dashboardCrumb, ...routeItems];

    return items
      .filter((item, index, source) => index === 0 || item.url !== source[index - 1].url)
      .map((item, index, source) => ({
        ...item,
        last: index === source.length - 1
      }));
  }

  private resolveLabel(snapshot: ActivatedRouteSnapshot): string {
    const explicitLabel = snapshot.data['breadcrumb'] as string | undefined;
    if (explicitLabel) {
      return explicitLabel;
    }

    const routePath = snapshot.routeConfig?.path ?? '';
    const actualSegment = snapshot.url[snapshot.url.length - 1]?.path ?? routePath;

    if (/^\d+$/.test(actualSegment) || routePath.includes(':id')) {
      return '详情';
    }

    return BREADCRUMB_LABELS[actualSegment] ?? actualSegment;
  }
}
