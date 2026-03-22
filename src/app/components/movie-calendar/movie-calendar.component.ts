import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { applyMovieImageFallback } from '../../utils/movie-media';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  movies: Movie[];
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
  readonly months = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月'
  ];
  readonly weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth();
  years: number[] = [];

  watchedMovies: Movie[] = [];
  calendarData: MonthData | null = null;
  monthHeatCells: MonthHeatCell[] = [];
  selectedDay?: CalendarDay;

  constructor(private movieService: MovieService) {}

  ngOnInit(): void {
    this.loadWatchedMovies();
    this.prepareYearOptions();
    this.setInitialFocus();
    this.generateCalendar();
  }

  get monthMovieCount(): number {
    return this.activeMonthMovies.length;
  }

  get monthWatchHours(): number {
    return Math.round(this.activeMonthMovies.reduce((sum, movie) => sum + movie.duration, 0) / 60);
  }

  get monthAverageRating(): string {
    if (this.activeMonthMovies.length === 0) {
      return '0.0';
    }

    const total = this.activeMonthMovies.reduce((sum, movie) => sum + movie.rating, 0);
    return (total / this.activeMonthMovies.length).toFixed(1);
  }

  get activeMonthMovies(): Movie[] {
    return this.watchedMovies
      .filter(movie =>
        movie.releaseDate.getFullYear() === this.selectedYear
        && movie.releaseDate.getMonth() === this.selectedMonth
      )
      .sort((first, second) => first.releaseDate.getTime() - second.releaseDate.getTime());
  }

  get selectedDayMovies(): Movie[] {
    return this.selectedDay?.movies ?? [];
  }

  get monthFeaturedMovie(): Movie | undefined {
    return [...this.activeMonthMovies].sort((first, second) => {
      return second.rating - first.rating || second.releaseDate.getTime() - first.releaseDate.getTime();
    })[0];
  }

  changeMonth(delta: number): void {
    this.selectedMonth += delta;
    if (this.selectedMonth < 0) {
      this.selectedMonth = 11;
      this.selectedYear--;
    } else if (this.selectedMonth > 11) {
      this.selectedMonth = 0;
      this.selectedYear++;
    }
    this.generateCalendar();
  }

  onYearChange(): void {
    this.generateCalendar();
  }

  onMonthChange(): void {
    this.generateCalendar();
  }

  selectDay(day: CalendarDay): void {
    if (day.movies.length === 0) {
      return;
    }

    this.selectedDay = day;
  }

  trackByMovieId(index: number, movie: Movie): number {
    return movie.id;
  }

  onImageError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  private loadWatchedMovies(): void {
    this.watchedMovies = this.movieService.getMovies().filter(movie => movie.isWatched);
  }

  private prepareYearOptions(): void {
    if (this.watchedMovies.length === 0) {
      this.years = [this.selectedYear];
      return;
    }

    const years = this.watchedMovies.map(movie => movie.releaseDate.getFullYear());
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    this.years = [];

    for (let year = minYear; year <= maxYear; year++) {
      this.years.push(year);
    }
  }

  private setInitialFocus(): void {
    if (this.watchedMovies.length === 0) {
      return;
    }

    const monthMap = new Map<string, { year: number; month: number; count: number }>();

    this.watchedMovies.forEach(movie => {
      const year = movie.releaseDate.getFullYear();
      const month = movie.releaseDate.getMonth();
      const key = `${year}-${month}`;
      const entry = monthMap.get(key) ?? { year, month, count: 0 };
      entry.count += 1;
      monthMap.set(key, entry);
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
    const movies = this.watchedMovies
      .filter(movie => this.isSameDate(movie.releaseDate, date))
      .sort((first, second) => second.rating - first.rating);

    return {
      date,
      isCurrentMonth,
      isToday: this.isSameDate(date, today),
      movies,
      dayOfMonth: date.getDate()
    };
  }

  private reconcileSelectedDay(): void {
    if (!this.calendarData) {
      this.selectedDay = undefined;
      return;
    }

    const currentSelection = this.selectedDay;
    const availableDays = this.calendarData.days.filter(day => day.isCurrentMonth && day.movies.length > 0);

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
      const movies = this.watchedMovies.filter(movie => {
        return movie.releaseDate.getFullYear() === year && movie.releaseDate.getMonth() === monthIndex;
      });
      const count = movies.length;
      const totalDuration = movies.reduce((sum, movie) => sum + movie.duration, 0);
      const averageRating = count === 0
        ? 0
        : +(movies.reduce((sum, movie) => sum + movie.rating, 0) / count).toFixed(1);

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
}
