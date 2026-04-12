import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { combineLatest } from 'rxjs';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { WatchLogService } from '../../services/watch-log.service';
import { applyMovieImageFallback, formatDateInputValue } from '../../utils/movie-media';

interface CalendarEntry {
  movie: Movie;
  watchedAt: Date;
  watchedAtLabel: string;
  note: string;
  location: string;
  companion: string;
  moodTags: string[];
  sessionRating: number | null;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  entries: CalendarEntry[];
  dayOfMonth: number;
}

interface MonthData {
  monthName: string;
  year: number;
  days: CalendarDay[];
}

interface MonthHeatCell {
  label: string;
  count: number;
  totalDuration: number;
  averageRating: number;
  level: string;
}

@Component({
  selector: 'app-movie-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './movie-calendar.component.html',
  styleUrls: ['./movie-calendar.component.scss']
})
export class MovieCalendarComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  readonly months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  readonly weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth();
  years: number[] = [];

  calendarEntries: CalendarEntry[] = [];
  calendarData: MonthData | null = null;
  monthHeatCells: MonthHeatCell[] = [];
  selectedDay?: CalendarDay;
  private hasInitializedFocus = false;

  constructor(
    private movieService: MovieService,
    private watchLogService: WatchLogService
  ) {}

  ngOnInit(): void {
    combineLatest([this.movieService.movies$, this.watchLogService.logs$])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(([movies, logs]) => {
        this.calendarEntries = this.buildCalendarEntries(movies, logs);
        this.prepareYearOptions();
        this.ensureValidFocus();
        this.generateCalendar();
      });
  }

  get monthMovieCount(): number {
    return this.activeMonthEntries.length;
  }

  get monthWatchHours(): number {
    return Math.round(this.activeMonthEntries.reduce((sum, entry) => sum + entry.movie.duration, 0) / 60);
  }

  get monthAverageRating(): string {
    if (this.activeMonthEntries.length === 0) {
      return '0.0';
    }

    const total = this.activeMonthEntries.reduce((sum, entry) => {
      return sum + (entry.sessionRating ?? entry.movie.userRating ?? entry.movie.rating);
    }, 0);

    return (total / this.activeMonthEntries.length).toFixed(1);
  }

  get activeMonthEntries(): CalendarEntry[] {
    return this.calendarEntries
      .filter(entry =>
        entry.watchedAt.getFullYear() === this.selectedYear
        && entry.watchedAt.getMonth() === this.selectedMonth
      )
      .sort((first, second) => second.watchedAt.getTime() - first.watchedAt.getTime());
  }

  get selectedDayEntries(): CalendarEntry[] {
    return this.selectedDay?.entries ?? [];
  }

  get monthFeaturedEntry(): CalendarEntry | undefined {
    return [...this.activeMonthEntries].sort((first, second) => {
      const scoreDiff = (second.sessionRating ?? second.movie.rating) - (first.sessionRating ?? first.movie.rating);
      return scoreDiff || second.watchedAt.getTime() - first.watchedAt.getTime();
    })[0];
  }

  changeMonth(delta: number): void {
    const nextDate = new Date(this.selectedYear, this.selectedMonth + delta, 1);
    const minYear = this.years[0] ?? this.selectedYear;
    const maxYear = this.years[this.years.length - 1] ?? this.selectedYear;

    if (nextDate.getFullYear() < minYear || nextDate.getFullYear() > maxYear) {
      return;
    }

    this.selectedYear = nextDate.getFullYear();
    this.selectedMonth = nextDate.getMonth();
    this.generateCalendar();
  }

  onYearChange(): void {
    this.generateCalendar();
  }

  onMonthChange(): void {
    this.generateCalendar();
  }

  selectDay(day: CalendarDay): void {
    if (day.entries.length === 0) {
      return;
    }

    this.selectedDay = day;
  }

  trackByMovieId(index: number, movie: Movie): number {
    return movie.id;
  }

  trackByCalendarEntry(index: number, entry: CalendarEntry): string {
    return `${entry.movie.id}-${entry.watchedAt.getTime()}-${index}`;
  }

  onImageError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  private prepareYearOptions(): void {
    const currentYear = new Date().getFullYear();
    const entryYears = this.calendarEntries.map(entry => entry.watchedAt.getFullYear());
    const minYear = entryYears.length > 0 ? Math.min(...entryYears, currentYear) : currentYear;
    const maxYear = entryYears.length > 0 ? Math.max(...entryYears, currentYear) : currentYear;
    this.years = [];

    for (let year = minYear; year <= maxYear; year++) {
      this.years.push(year);
    }
  }

  private ensureValidFocus(): void {
    if (!this.hasInitializedFocus) {
      this.setInitialFocus();
      this.hasInitializedFocus = true;
      return;
    }

    if (!this.years.includes(this.selectedYear)) {
      this.selectedYear = this.years[this.years.length - 1] ?? new Date().getFullYear();
    }
  }

  private setInitialFocus(): void {
    if (this.calendarEntries.length === 0) {
      this.selectedYear = new Date().getFullYear();
      this.selectedMonth = new Date().getMonth();
      return;
    }

    const monthMap = new Map<string, { year: number; month: number; count: number }>();

    this.calendarEntries.forEach(calendarEntry => {
      const year = calendarEntry.watchedAt.getFullYear();
      const month = calendarEntry.watchedAt.getMonth();
      const key = `${year}-${month}`;
      const monthSummary = monthMap.get(key) ?? { year, month, count: 0 };
      monthSummary.count += 1;
      monthMap.set(key, monthSummary);
    });

    const bestMonth = [...monthMap.values()].sort((first, second) => {
      return second.count - first.count || second.year - first.year || second.month - first.month;
    })[0];

    if (bestMonth) {
      this.selectedYear = bestMonth.year;
      this.selectedMonth = bestMonth.month;
    }
  }

  private generateCalendar(): void {
    const year = this.selectedYear;
    const month = this.selectedMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const today = new Date();
    const days: CalendarDay[] = [];

    for (let offset = startDayOfWeek - 1; offset >= 0; offset--) {
      const day = prevMonthLastDay - offset;
      days.push(this.createCalendarDay(new Date(year, month - 1, day), false, today));
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(this.createCalendarDay(new Date(year, month, day), true, today));
    }

    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push(this.createCalendarDay(new Date(year, month + 1, day), false, today));
    }

    this.calendarData = {
      monthName: this.months[month],
      year,
      days
    };

    this.monthHeatCells = this.buildMonthHeatCells(year);
    this.reconcileSelectedDay();
  }

  private createCalendarDay(date: Date, isCurrentMonth: boolean, today: Date): CalendarDay {
    const entries = this.calendarEntries
      .filter(entry => this.isSameDate(entry.watchedAt, date))
      .sort((first, second) => {
        const scoreDiff = (second.sessionRating ?? second.movie.rating) - (first.sessionRating ?? first.movie.rating);
        return scoreDiff || second.watchedAt.getTime() - first.watchedAt.getTime();
      });

    return {
      date,
      isCurrentMonth,
      isToday: this.isSameDate(date, today),
      entries,
      dayOfMonth: date.getDate()
    };
  }

  private reconcileSelectedDay(): void {
    if (!this.calendarData) {
      this.selectedDay = undefined;
      return;
    }

    const currentSelection = this.selectedDay;
    const availableDays = this.calendarData.days.filter(day => day.isCurrentMonth && day.entries.length > 0);

    if (currentSelection) {
      const matchingDay = availableDays.find(day => this.isSameDate(day.date, currentSelection.date));
      if (matchingDay) {
        this.selectedDay = matchingDay;
        return;
      }
    }

    this.selectedDay = availableDays[0];
  }

  private buildMonthHeatCells(year: number): MonthHeatCell[] {
    return this.months.map((label, monthIndex) => {
      const entries = this.calendarEntries.filter(entry => {
        return entry.watchedAt.getFullYear() === year && entry.watchedAt.getMonth() === monthIndex;
      });
      const count = entries.length;
      const totalDuration = entries.reduce((sum, entry) => sum + entry.movie.duration, 0);
      const averageRating = count === 0
        ? 0
        : +(entries.reduce((sum, entry) => {
            return sum + (entry.sessionRating ?? entry.movie.userRating ?? entry.movie.rating);
          }, 0) / count).toFixed(1);

      return {
        label,
        count,
        totalDuration,
        averageRating,
        level: this.getHeatLevel(count)
      };
    });
  }

  private getHeatLevel(count: number): string {
    if (count === 0) return 'level-0';
    if (count === 1) return 'level-1';
    if (count <= 2) return 'level-2';
    if (count <= 4) return 'level-3';
    return 'level-4';
  }

  private isSameDate(first: Date, second: Date): boolean {
    return first.getFullYear() === second.getFullYear()
      && first.getMonth() === second.getMonth()
      && first.getDate() === second.getDate();
  }

  private buildCalendarEntries(movies: Movie[], logs: ReturnType<WatchLogService['getLogs']>): CalendarEntry[] {
    const movieMap = new Map(movies.map(movie => [movie.id, movie]));
    const logEntries: CalendarEntry[] = [];

    logs.forEach(log => {
      const movie = movieMap.get(log.movieId);
      if (!movie) {
        return;
      }

      logEntries.push({
        movie,
        watchedAt: new Date(log.watchedAt),
        watchedAtLabel: formatDateInputValue(log.watchedAt),
        note: log.note,
        location: log.location,
        companion: log.companion,
        moodTags: [...log.moodTags],
        sessionRating: log.sessionRating
      });
    });

    return [...logEntries].sort((first, second) => {
      return second.watchedAt.getTime() - first.watchedAt.getTime();
    });
  }
}
