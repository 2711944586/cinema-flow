import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';
import { applyBackdropDisplayFallback, applyMovieImageFallback, getBackdropDisplayUrl } from '../../utils/movie-media';

interface SceneLane {
  id: string;
  name: string;
  description: string;
  icon: string;
  movies: Movie[];
}

@Component({
  selector: 'app-scene-board',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule],
  templateUrl: './scene-board.component.html',
  styleUrl: './scene-board.component.scss'
})
export class SceneBoardComponent implements OnInit {
  lanes: SceneLane[] = [];
  selectedLaneId = 'cosmic';
  density: 'gallery' | 'compact' = 'gallery';

  constructor(private movieService: MovieService) {}

  ngOnInit(): void {
    const movies = this.movieService.getMovies();
    this.lanes = this.buildLanes(movies);
    this.selectedLaneId = this.lanes[0]?.id ?? 'cosmic';
  }

  get selectedLane(): SceneLane | undefined {
    return this.lanes.find(lane => lane.id === this.selectedLaneId);
  }

  get heroMovie(): Movie | undefined {
    return this.selectedLane?.movies[0];
  }

  getBackdrop(movie: Movie): string {
    return getBackdropDisplayUrl(movie);
  }

  onPosterError(event: Event, movie: Movie): void {
    applyMovieImageFallback(event, movie);
  }

  onBackdropError(event: Event, movie: Movie): void {
    applyBackdropDisplayFallback(event, movie);
  }

  trackByLaneId(index: number, lane: SceneLane): string {
    return lane.id;
  }

  trackByMovieId(index: number, movie: Movie): number {
    return movie.id;
  }

  private buildLanes(movies: Movie[]): SceneLane[] {
    const laneDefs = [
      {
        id: 'cosmic',
        name: '宇宙尺度',
        icon: 'public',
        description: '科幻、太空、时间结构和大银幕奇观。',
        test: (movie: Movie) => movie.genres.some(genre => ['科幻', '冒险', '灾难'].includes(genre))
      },
      {
        id: 'neon',
        name: '霓虹城市',
        icon: 'nightlife',
        description: '犯罪、悬疑、动作与都市夜色。',
        test: (movie: Movie) => movie.genres.some(genre => ['犯罪', '悬疑', '动作', '惊悚'].includes(genre))
      },
      {
        id: 'handcrafted',
        name: '手作奇境',
        icon: 'auto_fix_high',
        description: '动画、奇幻、家庭和高想象力世界。',
        test: (movie: Movie) => movie.genres.some(genre => ['动画', '奇幻', '家庭'].includes(genre))
      },
      {
        id: 'intimate',
        name: '亲密记忆',
        icon: 'theater_comedy',
        description: '剧情、爱情、传记和人物关系。',
        test: (movie: Movie) => movie.genres.some(genre => ['剧情', '爱情', '传记', '历史'].includes(genre))
      }
    ];

    return laneDefs.map(lane => ({
      id: lane.id,
      name: lane.name,
      icon: lane.icon,
      description: lane.description,
      movies: movies
        .filter(lane.test)
        .sort((first, second) => second.rating - first.rating || second.releaseDate.getTime() - first.releaseDate.getTime())
        .slice(0, 18)
    })).filter(lane => lane.movies.length > 0);
  }
}
