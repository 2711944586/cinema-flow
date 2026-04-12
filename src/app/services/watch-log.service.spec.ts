import { TestBed } from '@angular/core/testing';
import { LoggerService } from './logger.service';
import { MovieService } from './movie.service';
import { WatchLogService } from './watch-log.service';
import { WatchPlanService } from './watch-plan.service';

const STORAGE_KEYS = [
  'cinemaflow.movies.v2',
  'cinemaflow.watch-log.v1',
  'cinemaflow.watch-plans.v1'
];

describe('WatchLogService', () => {
  let movieService: MovieService;
  let watchLogService: WatchLogService;
  let watchPlanService: WatchPlanService;

  beforeEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

    TestBed.configureTestingModule({
      providers: [LoggerService, MovieService, WatchPlanService, WatchLogService]
    });

    movieService = TestBed.inject(MovieService);
    watchPlanService = TestBed.inject(WatchPlanService);
    watchLogService = TestBed.inject(WatchLogService);
  });

  afterEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  });

  it('rolls back auto-derived movie and plan state when the last log is removed', () => {
    const targetMovie = movieService.getMovies().find(movie => !movie.isWatched && movie.userRating == null);
    expect(targetMovie).toBeDefined();
    if (!targetMovie) {
      return;
    }

    const plannedFor = new Date('2025-05-18T20:00:00');
    const planResult = watchPlanService.savePlan({
      movieId: targetMovie.id,
      status: 'scheduled',
      plannedFor
    });

    expect(planResult.ok).toBeTrue();
    if (!planResult.ok) {
      return;
    }

    const logResult = watchLogService.addLog({
      movieId: targetMovie.id,
      watchedAt: new Date('2025-05-19T20:00:00'),
      sessionRating: 8.6,
      note: '一次很顺滑的单测观影'
    });

    expect(logResult.ok).toBeTrue();
    if (!logResult.ok) {
      return;
    }

    expect(movieService.getMovieById(targetMovie.id)?.isWatched).toBeTrue();
    expect(movieService.getMovieById(targetMovie.id)?.userRating).toBe(8.6);
    expect(watchPlanService.getPlans().find(entry => entry.id === planResult.entry.id)?.status).toBe('completed');

    expect(watchLogService.removeLog(logResult.entry.id)).toBeTrue();

    const restoredMovie = movieService.getMovieById(targetMovie.id);
    const restoredPlan = watchPlanService.getPlans().find(entry => entry.id === planResult.entry.id);

    expect(restoredMovie?.isWatched).toBeFalse();
    expect(restoredMovie?.userRating).toBeUndefined();
    expect(restoredPlan?.status).toBe('scheduled');
    expect(restoredPlan?.plannedFor?.getTime()).toBe(plannedFor.getTime());
  });
});