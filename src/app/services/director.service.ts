import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Director } from '../models/director';
import { Movie } from '../models/movie';
import { buildDirectorId } from '../utils/director-identity';
import { LoggerService } from './logger.service';
import { MessageService } from './message.service';
import { MovieService } from './movie.service';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({ providedIn: 'root' })
export class DirectorService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiUrl = '/api/directors';

  constructor(
    private movieService: MovieService,
    private messageService: MessageService,
    private logger: LoggerService
  ) {}

  getDirectors(): Observable<Director[]> {
    if (!this.http) {
      return of(this.buildLocalDirectors()).pipe(
        tap(list => this.messageService.info(`已从本地片库聚合 ${list.length} 位导演。`, 'DirectorService'))
      );
    }

    return this.http.get<Director[]>(this.apiUrl).pipe(
      map(directors => this.mergeWithLocalDirectors(directors)),
      tap(list => this.messageService.info(`已通过 HTTP 加载 ${list.length} 位导演。`, 'DirectorService')),
      catchError(error => {
        this.logger.warn(`Director API unavailable, using local directors: ${this.describeHttpError(error)}`, 'DirectorService');
        return of(this.buildLocalDirectors());
      })
    );
  }

  getDirectorById(id: number): Observable<Director | undefined> {
    if (!this.http) {
      return this.getDirectors().pipe(map(directors => directors.find(director => director.id === id)));
    }

    return this.http.get<Director>(`${this.apiUrl}/${id}`).pipe(
      map(director => this.normalizeDirector(director)),
      tap(director => this.messageService.info(`已载入导演 ${director.name}。`, 'DirectorService')),
      catchError(error => {
        this.logger.warn(`Director detail API unavailable, using local lookup: ${this.describeHttpError(error)}`, 'DirectorService');
        return this.getDirectors().pipe(map(directors => directors.find(director => director.id === id)));
      })
    );
  }

  getDirectorMovies(directorId: number): Observable<Movie[]> {
    if (!this.http) {
      return of(this.getLocalDirectorMovies(directorId));
    }

    return this.http.get<Movie[]>(`${this.apiUrl}/${directorId}/movies`).pipe(
      map(movies => movies.length > 0 ? movies : this.getLocalDirectorMovies(directorId)),
      tap(movies => this.logger.log(`Loaded ${movies.length} director movies via HTTP`, 'DirectorService')),
      catchError(error => {
        this.logger.warn(`Director movies API unavailable, using local movies: ${this.describeHttpError(error)}`, 'DirectorService');
        return of(this.getLocalDirectorMovies(directorId));
      })
    );
  }

  createDirector(draft: Omit<Director, 'id'>): Observable<Director | null> {
    if (!this.http) {
      return of(null);
    }

    return this.http.post<Director>(this.apiUrl, draft, httpOptions).pipe(
      map(director => this.normalizeDirector(director)),
      tap(director => this.messageService.success(`已通过 API 新增导演 ${director.name}。`, 'DirectorService')),
      catchError(error => {
        this.messageService.error(`新增导演失败：${this.describeHttpError(error)}`, 'DirectorService');
        return of(null);
      })
    );
  }

  deleteDirector(id: number): Observable<boolean> {
    if (!this.http) {
      return of(false);
    }

    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`).pipe(
      map(result => !!result.success),
      tap(() => this.messageService.success(`已通过 API 删除导演 ${id}。`, 'DirectorService')),
      catchError(error => {
        this.messageService.error(`删除导演失败：${this.describeHttpError(error)}`, 'DirectorService');
        return of(false);
      })
    );
  }

  private mergeWithLocalDirectors(apiDirectors: Director[]): Director[] {
    const directorMap = new Map<number, Director>();
    this.buildLocalDirectors().forEach(director => directorMap.set(director.id, director));
    apiDirectors.map(director => this.normalizeDirector(director)).forEach(director => {
      directorMap.set(director.id, {
        ...directorMap.get(director.id),
        ...director
      });
    });

    return Array.from(directorMap.values()).sort((first, second) => {
      return first.name.localeCompare(second.name, 'zh-CN');
    });
  }

  private buildLocalDirectors(): Director[] {
    const groups = new Map<number, Movie[]>();

    this.movieService.getMovies().forEach(movie => {
      const directorId = movie.directorId ?? buildDirectorId(movie.director);
      const movies = groups.get(directorId) ?? [];
      movies.push(movie);
      groups.set(directorId, movies);
    });

    return Array.from(groups.entries()).map(([id, movies]) => {
      const orderedMovies = [...movies].sort((first, second) => {
        return second.rating - first.rating || second.releaseDate.getTime() - first.releaseDate.getTime();
      });
      const directorName = orderedMovies[0]?.director ?? '未知导演';
      const years = orderedMovies.map(movie => movie.releaseDate.getFullYear());
      const genres = Array.from(new Set(orderedMovies.flatMap(movie => movie.genres))).slice(0, 3);
      const firstYear = Math.min(...years);
      const lastYear = Math.max(...years);

      return this.normalizeDirector({
        id,
        name: directorName,
        nationality: this.inferNationality(directorName),
        birthYear: this.inferBirthYear(directorName),
        bio: `${directorName} 在 CinemaFlow 中收录了 ${orderedMovies.length} 部作品，代表类型集中在 ${genres.join(' / ') || '剧情'}。`,
        portraitUrl: this.buildPortraitUrl(directorName),
        activeYears: `${firstYear} - ${lastYear}`,
        signatureStyle: this.inferSignatureStyle(genres),
        awards: this.inferAwards(directorName),
        knownFor: orderedMovies.slice(0, 4).map(movie => movie.title)
      });
    });
  }

  private getLocalDirectorMovies(directorId: number): Movie[] {
    return this.movieService.getMovies()
      .filter(movie => (movie.directorId ?? buildDirectorId(movie.director)) === directorId)
      .sort((first, second) => second.rating - first.rating || second.releaseDate.getTime() - first.releaseDate.getTime());
  }

  private normalizeDirector(director: Partial<Director>): Director {
    const name = director.name?.trim() || '未知导演';
    return {
      id: Number(director.id ?? buildDirectorId(name)),
      name,
      nationality: director.nationality?.trim() || this.inferNationality(name),
      birthYear: Number(director.birthYear ?? this.inferBirthYear(name)),
      bio: director.bio?.trim() || `${name} 的导演档案由本地片库自动聚合生成。`,
      portraitUrl: director.portraitUrl?.trim() || this.buildPortraitUrl(name),
      activeYears: director.activeYears?.trim() || '待补充',
      signatureStyle: director.signatureStyle?.trim() || '影像作者性与类型表达',
      awards: Array.isArray(director.awards) ? director.awards : this.inferAwards(name),
      knownFor: Array.isArray(director.knownFor) ? director.knownFor : []
    };
  }

  private buildPortraitUrl(name: string): string {
    return `https://picsum.photos/seed/director-${encodeURIComponent(name)}/640/800`;
  }

  private inferNationality(name: string): string {
    const known: Record<string, string> = {
      '克里斯托弗·诺兰': '英国/美国',
      '诺兰': '英国/美国',
      '李安': '中国台湾/美国',
      '宫崎骏': '日本',
      '王家卫': '中国香港',
      '丹尼斯·维伦纽瓦': '加拿大',
      '弗兰克·德拉邦特': '美国',
      '郭帆': '中国'
    };

    return known[name] ?? '全球影人';
  }

  private inferBirthYear(name: string): number {
    const known: Record<string, number> = {
      '克里斯托弗·诺兰': 1970,
      '诺兰': 1970,
      '李安': 1954,
      '宫崎骏': 1941,
      '王家卫': 1958,
      '丹尼斯·维伦纽瓦': 1967,
      '弗兰克·德拉邦特': 1959,
      '郭帆': 1980
    };

    return known[name] ?? 1970;
  }

  private inferSignatureStyle(genres: string[]): string {
    if (genres.includes('科幻')) {
      return '高概念叙事与沉浸式视听';
    }

    if (genres.includes('动画')) {
      return '手工质感、奇幻世界与成长母题';
    }

    if (genres.includes('剧情')) {
      return '人物关系、时间记忆与情绪调度';
    }

    return '类型融合与作者表达';
  }

  private inferAwards(name: string): string[] {
    const known: Record<string, string[]> = {
      '克里斯托弗·诺兰': ['奥斯卡最佳导演', '英国电影学院奖'],
      '李安': ['奥斯卡最佳导演', '金狮奖', '金熊奖'],
      '宫崎骏': ['奥斯卡最佳动画长片', '金熊奖'],
      '王家卫': ['戛纳最佳导演', '香港电影金像奖'],
      '丹尼斯·维伦纽瓦': ['奥斯卡提名', '加拿大银幕奖']
    };

    return known[name] ?? ['影迷高分收藏'];
  }

  private describeHttpError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'object' && error && 'status' in error) {
      return `status ${(error as { status: number }).status}`;
    }

    return 'unknown error';
  }
}
