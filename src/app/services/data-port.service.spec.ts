import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { DataPortService } from './data-port.service';
import { LoggerService } from './logger.service';
import { MovieService } from './movie.service';
import { RecentHistoryService } from './recent-history.service';
import { ReviewStoreService } from './review-store.service';
import { SmartPicksService } from './smart-picks.service';
import { WatchLogService } from './watch-log.service';
import { WatchPlanService } from './watch-plan.service';

const STORAGE_KEYS = [
  'cinemaflow.movies.v3',
  'cinemaflow.recent-history.v2',
  'cinemaflow.reviews.v2',
  'cinemaflow.watch-plans.v1',
  'cinemaflow.watch-log.v1',
  'cinemaflow.smart-picks.presets.v1'
];

describe('DataPortService', () => {
  let dataPortService: DataPortService;
  let movieService: MovieService;
  let recentHistoryService: RecentHistoryService;
  let reviewStoreService: ReviewStoreService;
  let smartPicksService: SmartPicksService;
  let watchLogService: WatchLogService;
  let watchPlanService: WatchPlanService;

  beforeEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

    TestBed.configureTestingModule({
      providers: [
        LoggerService,
        MovieService,
        RecentHistoryService,
        ReviewStoreService,
        WatchPlanService,
        WatchLogService,
        SmartPicksService,
        DataPortService
      ]
    });

    dataPortService = TestBed.inject(DataPortService);
    movieService = TestBed.inject(MovieService);
    recentHistoryService = TestBed.inject(RecentHistoryService);
    reviewStoreService = TestBed.inject(ReviewStoreService);
    smartPicksService = TestBed.inject(SmartPicksService);
    watchLogService = TestBed.inject(WatchLogService);
    watchPlanService = TestBed.inject(WatchPlanService);
  });

  afterEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  });

  it('emits reactive summary counts for backup data', async () => {
    const movie = movieService.getMovies()[0];

    recentHistoryService.recordVisit(movie, 'info');
    reviewStoreService.addReview(movie, { rating: 9, content: '测试影评', author: '单测用户' });
    watchPlanService.savePlan({ movieId: movie.id, status: 'queued' });
    watchLogService.addLog({ movieId: movie.id, watchedAt: new Date('2025-01-01T20:00:00') });
    smartPicksService.savePreset({
      name: '备份预设',
      maxDuration: null,
      minRating: 7,
      includeGenres: [],
      excludeGenres: [],
      allowWatched: true,
      preferFavorites: false,
      onlyWatchlist: false,
      preferredLanguages: []
    });

    const summary = await firstValueFrom(dataPortService.summary$);

    expect(summary.recentHistoryCount).toBe(1);
    expect(summary.reviewCount).toBeGreaterThan(0);
    expect(summary.watchPlanCount).toBe(1);
    expect(summary.watchLogCount).toBe(1);
    expect(summary.viewingPresetCount).toBeGreaterThan(0);
  });

  it('creates and parses backups with plans, logs and presets included', () => {
    const movie = movieService.getMovies()[0];

    watchPlanService.savePlan({ movieId: movie.id, status: 'scheduled' });
    watchLogService.addLog({ movieId: movie.id, watchedAt: new Date('2025-02-01T20:00:00') });
    smartPicksService.savePreset({
      name: '导出预设',
      maxDuration: 120,
      minRating: 7.5,
      includeGenres: [],
      excludeGenres: [],
      allowWatched: false,
      preferFavorites: true,
      onlyWatchlist: false,
      preferredLanguages: []
    });

    const backup = dataPortService.createBackup();
    const parsed = dataPortService.parseBackup(JSON.stringify(backup));

    expect(backup.meta.watchPlanCount).toBe(1);
    expect(backup.meta.watchLogCount).toBe(1);
    expect(backup.meta.viewingPresetCount).toBeGreaterThan(0);
    expect(parsed).toEqual(jasmine.objectContaining({ ok: true }));
    if (parsed.ok) {
      expect(parsed.payload.watchPlans.length).toBe(1);
      expect(parsed.payload.watchLogs.length).toBe(1);
      expect(parsed.payload.viewingPresets.length).toBeGreaterThan(0);
    }
  });

  it('restores plans, logs and presets from a backup payload', () => {
    const movie = movieService.getMovies()[0];

    watchPlanService.savePlan({ movieId: movie.id, status: 'scheduled' });
    watchLogService.addLog({ movieId: movie.id, watchedAt: new Date('2025-03-01T20:00:00') });
    smartPicksService.savePreset({
      name: '恢复预设',
      maxDuration: 150,
      minRating: 7.2,
      includeGenres: [],
      excludeGenres: [],
      allowWatched: true,
      preferFavorites: false,
      onlyWatchlist: false,
      preferredLanguages: []
    });

    const backup = dataPortService.createBackup();

    watchPlanService.replacePlans([]);
    watchLogService.replaceLogs([]);
    smartPicksService.replacePresets([]);

    expect(watchPlanService.getPlans().length).toBe(0);
    expect(watchLogService.getLogs().length).toBe(0);
    expect(smartPicksService.getPresets().length).toBe(0);

    dataPortService.restoreBackup(backup);

    expect(watchPlanService.getPlans().length).toBe(1);
    expect(watchLogService.getLogs().length).toBe(1);
    expect(smartPicksService.getPresets().length).toBeGreaterThan(0);
  });
});