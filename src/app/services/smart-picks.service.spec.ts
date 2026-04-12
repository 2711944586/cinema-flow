import { TestBed } from '@angular/core/testing';
import { LoggerService } from './logger.service';
import { MovieService } from './movie.service';
import { SmartPicksService } from './smart-picks.service';
import { WatchPlanService } from './watch-plan.service';

const STORAGE_KEYS = [
  'cinemaflow.movies.v3',
  'cinemaflow.smart-picks.presets.v1',
  'cinemaflow.watch-plans.v1'
];

describe('SmartPicksService', () => {
  let movieService: MovieService;
  let smartPicksService: SmartPicksService;
  let watchPlanService: WatchPlanService;

  beforeEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

    TestBed.configureTestingModule({
      providers: [LoggerService, MovieService, WatchPlanService, SmartPicksService]
    });

    movieService = TestBed.inject(MovieService);
    watchPlanService = TestBed.inject(WatchPlanService);
    smartPicksService = TestBed.inject(SmartPicksService);
  });

  afterEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  });

  it('updates a saved preset by id instead of creating a duplicate copy', () => {
    const created = smartPicksService.savePreset({
      name: '测试预设',
      maxDuration: 140,
      minRating: 8,
      includeGenres: ['科幻'],
      excludeGenres: [],
      allowWatched: false,
      preferFavorites: true,
      onlyWatchlist: false,
      preferredLanguages: []
    });

    expect(created.ok).toBeTrue();
    if (!created.ok) {
      return;
    }

    const updated = smartPicksService.savePreset({
      id: created.preset.id,
      name: '测试预设（更新）',
      maxDuration: 100,
      minRating: 8.5,
      includeGenres: ['剧情'],
      excludeGenres: [],
      allowWatched: true,
      preferFavorites: false,
      onlyWatchlist: false,
      preferredLanguages: ['英语']
    });

    expect(updated).toEqual(jasmine.objectContaining({ ok: true, created: false }));
    expect(smartPicksService.getPresets().filter(preset => preset.name.includes('测试预设')).length).toBe(1);
    expect(smartPicksService.getPresetById(created.preset.id)?.maxDuration).toBe(100);
  });

  it('limits recommendations to active watchlist movies when onlyWatchlist is enabled', () => {
    const targetMovie = movieService.getMovies().find(movie => !movie.isWatched);
    expect(targetMovie).toBeDefined();
    if (!targetMovie) {
      return;
    }

    const planResult = watchPlanService.savePlan({ movieId: targetMovie.id, status: 'queued' });
    expect(planResult.ok).toBeTrue();

    const recommendations = smartPicksService.getRecommendations({
      maxDuration: null,
      minRating: 0,
      includeGenres: [],
      excludeGenres: [],
      allowWatched: true,
      preferFavorites: false,
      onlyWatchlist: true,
      preferredLanguages: []
    }, 10);

    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations.every(result => result.movie.id === targetMovie.id)).toBeTrue();
  });
});