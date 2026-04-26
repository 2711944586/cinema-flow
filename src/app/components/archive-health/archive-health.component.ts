import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { isGeneratedMovieArt } from '../../utils/movie-media';

interface HealthMetric {
  label: string;
  value: string;
  hint: string;
}

interface IssueRow {
  movie: Movie;
  issues: string[];
}

@Component({
  selector: 'app-archive-health',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule],
  templateUrl: './archive-health.component.html',
  styleUrl: './archive-health.component.scss'
})
export class ArchiveHealthComponent implements OnInit {
  metrics: HealthMetric[] = [];
  issueRows: IssueRow[] = [];
  completeness = 0;
  realPosterRate = 0;
  realBackdropRate = 0;
  topReadyMovies: Movie[] = [];

  constructor(private movieService: MovieService) {}

  ngOnInit(): void {
    this.rebuild();
  }

  trackByMovieId(index: number, row: IssueRow): number {
    return row.movie.id;
  }

  private rebuild(): void {
    const movies = this.movieService.getMovies();
    const total = Math.max(1, movies.length);
    const posterReady = movies.filter(movie => this.hasRealUrl(movie.posterUrl)).length;
    const backdropReady = movies.filter(movie => this.hasRealUrl(movie.backdropUrl)).length;
    const completeRows = movies.filter(movie => this.findIssues(movie).length === 0).length;

    this.realPosterRate = Math.round((posterReady / total) * 100);
    this.realBackdropRate = Math.round((backdropReady / total) * 100);
    this.completeness = Math.round((completeRows / total) * 100);
    this.issueRows = movies
      .map(movie => ({ movie, issues: this.findIssues(movie) }))
      .filter(row => row.issues.length > 0)
      .slice(0, 18);
    this.topReadyMovies = movies
      .filter(movie => this.findIssues(movie).length === 0)
      .sort((first, second) => second.rating - first.rating)
      .slice(0, 8);

    this.metrics = [
      { label: '资料完整度', value: `${this.completeness}%`, hint: `${completeRows} / ${movies.length} 部无明显缺口` },
      { label: '真实海报 URL', value: `${this.realPosterRate}%`, hint: `${posterReady} 部使用远程图片 URL` },
      { label: '真实背景 URL', value: `${this.realBackdropRate}%`, hint: `${backdropReady} 部使用远程背景 URL` },
      { label: '待修复条目', value: String(this.issueRows.length), hint: '显示前 18 条优先处理项' }
    ];
  }

  private findIssues(movie: Movie): string[] {
    const issues: string[] = [];

    if (!this.hasRealUrl(movie.posterUrl)) {
      issues.push('海报不是远程 URL');
    }

    if (!this.hasRealUrl(movie.backdropUrl)) {
      issues.push('背景不是远程 URL');
    }

    if (!movie.description || movie.description.length < 36) {
      issues.push('简介过短');
    }

    if (!movie.cast || movie.cast.length === 0) {
      issues.push('演员表缺失');
    }

    if (!movie.language) {
      issues.push('语言缺失');
    }

    if (!movie.duration || movie.duration < 40) {
      issues.push('片长异常');
    }

    return issues;
  }

  private hasRealUrl(value: string | undefined): boolean {
    return !!value && /^https?:\/\//i.test(value) && !isGeneratedMovieArt(value);
  }
}
