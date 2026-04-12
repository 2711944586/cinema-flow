import { TestBed } from '@angular/core/testing';
import { LoggerService } from './logger.service';
import { MovieService } from './movie.service';
import { WatchPlanService } from './watch-plan.service';

const STORAGE_KEYS = [
  'cinemaflow.movies.v2',
  'cinemaflow.watch-plans.v1'
];

describe('WatchPlanService', () => {
  let movieService: MovieService;
  let watchPlanService: WatchPlanService;

  beforeEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

    TestBed.configureTestingModule({
      providers: [LoggerService, MovieService, WatchPlanService]
    });

    movieService = TestBed.inject(MovieService);
    watchPlanService = TestBed.inject(WatchPlanService);
  });

  afterEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  });

  it('updates the exact historical plan entry when editing by id', () => {
    const movie = movieService.getMovies()[0];
    const firstPlan = watchPlanService.savePlan({ movieId: movie.id, status: 'queued', note: '初始计划' });

    expect(firstPlan.ok).toBeTrue();
    if (!firstPlan.ok) {
      return;
    }

    expect(watchPlanService.updatePlan(firstPlan.entry.id, { status: 'completed' })).toBeTrue();

    const activePlan = watchPlanService.savePlan({ movieId: movie.id, status: 'scheduled', note: '新的活跃计划' });
    expect(activePlan.ok).toBeTrue();
    if (!activePlan.ok) {
      return;
    }

    const editedHistoricalPlan = watchPlanService.savePlan({
      id: firstPlan.entry.id,
      movieId: movie.id,
      status: 'completed',
      priority: 'high',
      note: '只更新历史计划'
    });

    expect(editedHistoricalPlan).toEqual(jasmine.objectContaining({ ok: true, created: false }));

    const allPlans = watchPlanService.getPlans();
    const historicalPlan = allPlans.find(entry => entry.id === firstPlan.entry.id);
    const currentActivePlan = allPlans.find(entry => entry.id === activePlan.entry.id);

    expect(historicalPlan?.note).toBe('只更新历史计划');
    expect(historicalPlan?.status).toBe('completed');
    expect(currentActivePlan?.note).toBe('新的活跃计划');
    expect(currentActivePlan?.status).toBe('scheduled');
  });

  it('rejects editing a completed plan into another active duplicate', () => {
    const movie = movieService.getMovies()[1];
    const firstPlan = watchPlanService.savePlan({ movieId: movie.id, status: 'queued' });

    expect(firstPlan.ok).toBeTrue();
    if (!firstPlan.ok) {
      return;
    }

    expect(watchPlanService.updatePlan(firstPlan.entry.id, { status: 'completed' })).toBeTrue();

    const activePlan = watchPlanService.savePlan({ movieId: movie.id, status: 'scheduled' });
    expect(activePlan.ok).toBeTrue();

    const invalidEdit = watchPlanService.savePlan({
      id: firstPlan.entry.id,
      movieId: movie.id,
      status: 'queued'
    });

    expect(invalidEdit).toEqual(jasmine.objectContaining({ ok: false }));
  });
});