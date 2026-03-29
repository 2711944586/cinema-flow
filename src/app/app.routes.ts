import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    title: 'Dashboard | CinemaFlow',
    data: { breadcrumb: '仪表盘' },
    loadComponent: () => import('./pages/dashboard-page/dashboard-page.component').then(m => m.DashboardPageComponent)
  },
  {
    path: 'movies',
    title: 'Movies | CinemaFlow',
    data: { breadcrumb: '电影列表' },
    loadComponent: () => import('./pages/movie-list-page/movie-list-page.component').then(m => m.MovieListPageComponent)
  },
  {
    path: 'movies/:id',
    title: '电影详情 | CinemaFlow',
    data: { breadcrumb: '详情' },
    loadComponent: () => import('./pages/movie-detail-page/movie-detail-page.component').then(m => m.MovieDetailPageComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'info' },
      {
        path: 'info',
        title: '电影基本信息 | CinemaFlow',
        data: { breadcrumb: '基本信息' },
        loadComponent: () => import('./components/movie-detail-info/movie-detail-info.component').then(m => m.MovieDetailInfoComponent)
      },
      {
        path: 'cast',
        title: '电影演员表 | CinemaFlow',
        data: { breadcrumb: '演员表' },
        loadComponent: () => import('./components/movie-detail-cast/movie-detail-cast.component').then(m => m.MovieDetailCastComponent)
      }
    ]
  },
  {
    path: 'add',
    title: '添加电影 | CinemaFlow',
    data: { breadcrumb: '添加电影' },
    loadComponent: () => import('./pages/movie-add-page/movie-add-page.component').then(m => m.MovieAddPageComponent)
  },
  {
    path: 'about',
    title: '关于 CinemaFlow | CinemaFlow',
    data: { breadcrumb: '关于' },
    loadComponent: () => import('./pages/about-page/about-page.component').then(m => m.AboutPageComponent)
  },
  {
    path: 'explore',
    title: '探索影库 | CinemaFlow',
    data: { breadcrumb: '探索影库' },
    loadComponent: () => import('./components/movie-list/movie-list.component').then(m => m.MovieListComponent)
  },
  {
    path: 'favorites',
    title: '收藏中心 | CinemaFlow',
    data: { breadcrumb: '收藏中心' },
    loadComponent: () => import('./components/movie-favorites/movie-favorites.component').then(m => m.MovieFavoritesComponent)
  },
  {
    path: 'timeline',
    title: '电影时间线 | CinemaFlow',
    data: { breadcrumb: '时间线' },
    loadComponent: () => import('./components/movie-timeline/movie-timeline.component').then(m => m.MovieTimelineComponent)
  },
  {
    path: 'recommendations',
    title: '分类推荐 | CinemaFlow',
    data: { breadcrumb: '推荐' },
    loadComponent: () => import('./components/movie-recommendations/movie-recommendations.component').then(m => m.MovieRecommendationsComponent)
  },
  {
    path: 'random',
    title: '随机选片 | CinemaFlow',
    data: { breadcrumb: '随机选片' },
    loadComponent: () => import('./components/movie-random/movie-random.component').then(m => m.MovieRandomComponent)
  },
  {
    path: 'compare',
    title: '电影对比 | CinemaFlow',
    data: { breadcrumb: '对比' },
    loadComponent: () => import('./components/movie-compare/movie-compare.component').then(m => m.MovieCompareComponent)
  },
  {
    path: 'calendar',
    title: '观影日历 | CinemaFlow',
    data: { breadcrumb: '日历' },
    loadComponent: () => import('./components/movie-calendar/movie-calendar.component').then(m => m.MovieCalendarComponent)
  },
  {
    path: 'reviews',
    title: '影评墙 | CinemaFlow',
    data: { breadcrumb: '影评墙' },
    loadComponent: () => import('./components/movie-review-wall/movie-review-wall.component').then(m => m.MovieReviewWallComponent)
  },
  { path: '**', redirectTo: '/dashboard' }
];
