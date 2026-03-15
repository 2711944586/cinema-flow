import { Routes } from '@angular/router';
import { MovieListComponent } from './components/movie-list/movie-list.component';
import { MovieDashboardComponent } from './components/movie-dashboard/movie-dashboard.component';
import { MovieFavoritesComponent } from './components/movie-favorites/movie-favorites.component';
import { MovieTimelineComponent } from './components/movie-timeline/movie-timeline.component';
import { MovieRecommendationsComponent } from './components/movie-recommendations/movie-recommendations.component';
import { MovieRandomComponent } from './components/movie-random/movie-random.component';
import { MovieCompareComponent } from './components/movie-compare/movie-compare.component';

export const routes: Routes = [
  { path: '', redirectTo: '/explore', pathMatch: 'full' },
  { path: 'explore', component: MovieListComponent },
  { path: 'dashboard', component: MovieDashboardComponent },
  { path: 'favorites', component: MovieFavoritesComponent },
  { path: 'timeline', component: MovieTimelineComponent },
  { path: 'recommendations', component: MovieRecommendationsComponent },
  { path: 'random', component: MovieRandomComponent },
  { path: 'compare', component: MovieCompareComponent },
  { path: '**', redirectTo: '/explore' }
];
