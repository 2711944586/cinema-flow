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
    { label: '导演库', route: '/directors', icon: 'movie_creation', hint: '跨实体查看导演作品' },
    { label: '偏好画像', route: '/taste-dna', icon: 'psychology', hint: '查看个人观影信号' },
    { label: '片库审计', route: '/archive-health', icon: 'verified', hint: '检查海报与资料完整度' },
    { label: '添加电影', route: '/add', icon: 'add_circle', hint: '进入独立新增页面' },
    { label: '随机选片', route: '/random', icon: 'casino', hint: '快速决定今晚看什么' }
  ];

  constructor(private movieStateService: MovieStateService) {}

  getHeroBackdrop(movie?: Movie): string | null {
    return movie ? getBackdropDisplayUrl(movie) : null;
  }
}
