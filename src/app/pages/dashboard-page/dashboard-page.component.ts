import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Movie } from '../../models/movie';
import { MovieStatsComponent } from '../../components/movie-stats/movie-stats.component';
import { RecentHistoryComponent } from '../../components/recent-history/recent-history.component';
import { DashboardViewModel, MovieStateService } from '../../services/movie-state.service';
import { getBackdropDisplayUrl } from '../../utils/movie-media';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MovieStatsComponent,
    RecentHistoryComponent
  ],
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss'
})
export class DashboardPageComponent {
  readonly vm$ = this.movieStateService.dashboardVm$;

  readonly quickLinks = [
    { label: '进入 Movies', route: '/movies', icon: 'movie', hint: '完整片库视图' },
    { label: '添加电影', route: '/add', icon: 'add_circle', hint: '进入独立新增页面' },
    { label: '收藏中心', route: '/favorites', icon: 'favorite', hint: '查看已收藏影片' },
    { label: '随机选片', route: '/random', icon: 'casino', hint: '快速决定今晚看什么' }
  ];

  constructor(private movieStateService: MovieStateService) {}

  getHeroBackdrop(movie?: Movie): string | null {
    return movie ? getBackdropDisplayUrl(movie) : null;
  }
}
