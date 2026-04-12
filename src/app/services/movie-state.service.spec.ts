import { filter, firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { LoggerService } from './logger.service';
import { MessageService } from './message.service';
import { MovieService } from './movie.service';
import { MovieStateService } from './movie-state.service';
import { RecentHistoryService } from './recent-history.service';
import { ReviewStoreService } from './review-store.service';
import { SmartPicksService } from './smart-picks.service';
import { WatchLogService } from './watch-log.service';
import { WatchPlanService } from './watch-plan.service';

const STORAGE_KEYS = [
  'cinemaflow.movies.v2',
  'cinemaflow.recent-history.v2',
  'cinemaflow.reviews.v2',
  'cinemaflow.watch-plans.v1',
  'cinemaflow.watch-log.v1',
  'cinemaflow.smart-picks.presets.v1'
];

describe('MovieStateService', () => {
  let messageService: MessageService;
  let movieStateService: MovieStateService;

  beforeEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

    TestBed.configureTestingModule({
      providers: [
        LoggerService,
        MessageService,
        MovieService,
        RecentHistoryService,
        ReviewStoreService,
        WatchPlanService,
        WatchLogService,
        SmartPicksService,
        MovieStateService
      ]
    });

    messageService = TestBed.inject(MessageService);
    movieStateService = TestBed.inject(MovieStateService);
  });

  afterEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  });

  it('surfaces message and logger feedback in the about view model', async () => {
    const vmPromise = firstValueFrom(movieStateService.aboutVm$.pipe(
      filter(vm => {
        return vm.latestMessage?.text === '反馈链路测试'
          && vm.recentLogs.some(log => {
            return log.source === 'Data Management' && log.message.includes('MessagePanel: 反馈链路测试');
          });
      })
    ));

    messageService.success('反馈链路测试', 'Data Management');

    const vm = await vmPromise;
    const feedbackLog = vm.recentLogs.find(log => {
      return log.source === 'Data Management' && log.message.includes('MessagePanel: 反馈链路测试');
    });

    expect(vm.latestMessage?.source).toBe('Data Management');
    expect(vm.latestMessage?.text).toBe('反馈链路测试');
    expect(vm.recentMessages[0]?.text).toBe('反馈链路测试');
    expect(feedbackLog?.source).toBe('Data Management');
    expect(feedbackLog?.message).toContain('MessagePanel: 反馈链路测试');
  });
});