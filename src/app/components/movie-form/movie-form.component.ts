import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSliderModule } from '@angular/material/slider';
import { Movie } from '../../models/movie';
import { MovieArtworkService } from '../../services/movie-artwork.service';
import {
  applyBackdropDisplayFallback,
  applyMovieImageFallback,
  coerceMovieDate,
  formatDateInputValue,
  getBackdropDisplayUrl,
  isGeneratedMovieArt,
} from '../../utils/movie-media';

interface MovieFormData {
  title: string;
  director: string;
  releaseDate: string;
  rating: number;
  isWatched: boolean;
  posterUrl: string;
  backdropUrl: string;
  genres: string;
  duration: number;
  description: string;
  trailerUrl: string;
  language: string;
  cast: string;
}

@Component({
  selector: 'app-movie-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSliderModule,
    MatCardModule,
    MatIconModule
  ],
  templateUrl: './movie-form.component.html',
  styleUrls: ['./movie-form.component.scss']
})
export class MovieFormComponent implements OnInit, OnChanges, OnDestroy {
  @Input() movie?: Movie;
  @Output() submitted = new EventEmitter<Omit<Movie, 'id'>>();
  @Output() cancelled = new EventEmitter<void>();

  formData: MovieFormData = this.createEmptyForm();
  autoPosterUrl = '';
  autoPosterSource = '';
  artworkState: 'idle' | 'loading' | 'resolved' | 'fallback' = 'idle';
  isSubmitting = false;
  posterValidationMessage = '';

  private artworkLookupToken = 0;
  private artworkLookupHandle?: number;

  constructor(private movieArtworkService: MovieArtworkService) {}

  ngOnInit(): void {
    this.populateForm();
  }

  ngOnDestroy(): void {
    this.clearArtworkLookupTimer();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['movie']) {
      this.populateForm();
    }
  }

  get previewMovie(): Movie {
    return {
      id: this.movie?.id ?? 0,
      title: this.formData.title.trim() || '未命名电影',
      director: this.formData.director.trim() || '待填写导演',
      releaseDate: coerceMovieDate(this.formData.releaseDate),
      rating: this.formData.rating,
      isWatched: this.formData.isWatched,
      posterUrl: this.effectivePosterUrl,
      backdropUrl: this.formData.backdropUrl.trim(),
      genres: this.parseDelimitedList(this.formData.genres, ['剧情', '电影']),
      duration: Number(this.formData.duration) || 120,
      description: this.formData.description.trim() || '在这里补充剧情梗概、叙事节奏与观影感受，让影片信息更完整。',
      trailerUrl: this.formData.trailerUrl.trim(),
      language: this.formData.language.trim() || '待补充语言',
      cast: this.parseDelimitedList(this.formData.cast)
    };
  }

  get posterPreviewUrl(): string {
    return this.effectivePosterUrl;
  }

  get backdropPreviewUrl(): string {
    return getBackdropDisplayUrl({
      ...this.previewMovie,
      backdropUrl: this.effectiveBackdropUrl
    });
  }

  get genrePreview(): string[] {
    return this.previewMovie.genres.slice(0, 3);
  }

  get castPreview(): string {
    return this.previewMovie.cast?.slice(0, 3).join(' / ') || '待补充主演阵容';
  }

  get isUsingAutoPoster(): boolean {
    return !this.formData.posterUrl.trim() && !!this.autoPosterUrl;
  }

  get isUsingAutoBackdrop(): boolean {
    return !this.formData.backdropUrl.trim();
  }

  get posterStatusLabel(): string {
    if (this.formData.posterUrl.trim()) {
      return '已保存真实海报';
    }

    if (this.artworkState === 'loading') {
      return '海报校验中';
    }

    if (this.autoPosterUrl) {
      return '已验证真实海报';
    }

    if (this.artworkState === 'fallback') {
      return '未匹配到真实海报';
    }

    return '等待校验真实海报';
  }

  get backdropStatusLabel(): string {
    if (this.formData.backdropUrl.trim()) {
      return '已填写背景';
    }

    return '统一背景主视觉';
  }

  get artworkHintText(): string {
    if (this.artworkState === 'loading') {
      return '正在根据片名、导演和上映日期校验真实电影海报。';
    }

    if (this.autoPosterUrl) {
      return this.autoPosterSource
        ? `已自动匹配真实海报，来源：${this.autoPosterSource}。`
        : '已自动匹配真实电影海报。';
    }

    if (this.artworkState === 'fallback') {
      return '未匹配到真实电影海报，当前条目不能保存，请检查片名、导演和上映日期。';
    }

    return '系统会自动校验真实电影海报；未通过校验的条目不会写入片库。';
  }

  async onSubmit(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.posterValidationMessage = '';

    try {
      await this.resolveArtworkForSubmit();

      if (!this.effectivePosterUrl) {
        this.posterValidationMessage = '未验证到真实海报，不能保存。请检查片名、导演和上映日期是否对应真实电影。';
        this.artworkState = 'fallback';
        return;
      }

      const previewMovie = this.previewMovie;
      const movieData: Omit<Movie, 'id'> = {
        title: previewMovie.title,
        director: previewMovie.director,
        releaseDate: previewMovie.releaseDate,
        rating: previewMovie.rating,
        isWatched: previewMovie.isWatched,
        posterUrl: this.effectivePosterUrl,
        backdropUrl: this.effectiveBackdropUrl,
        genres: previewMovie.genres,
        duration: previewMovie.duration,
        description: previewMovie.description,
        trailerUrl: previewMovie.trailerUrl,
        language: previewMovie.language,
        cast: previewMovie.cast
      };

      this.submitted.emit(movieData);
    } finally {
      this.isSubmitting = false;
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  onPosterError(event: Event): void {
    applyMovieImageFallback(event, this.previewMovie);
  }

  onBackdropError(event: Event): void {
    applyBackdropDisplayFallback(event, {
      ...this.previewMovie,
      backdropUrl: this.effectiveBackdropUrl
    });
  }

  onArtworkSeedChange(): void {
    this.posterValidationMessage = '';
    this.formData.posterUrl = '';
    this.queueArtworkLookup();
  }

  private populateForm(): void {
    this.clearArtworkLookupTimer();
    this.artworkLookupToken += 1;

    if (!this.movie) {
      this.formData = this.createEmptyForm();
      this.resetArtworkState();
      this.queueArtworkLookup();
      return;
    }

    this.formData = {
      title: this.movie.title,
      director: this.movie.director,
      releaseDate: formatDateInputValue(this.movie.releaseDate),
      rating: this.movie.rating,
      isWatched: this.movie.isWatched,
      posterUrl: isGeneratedMovieArt(this.movie.posterUrl) ? '' : this.movie.posterUrl || '',
      backdropUrl: isGeneratedMovieArt(this.movie.backdropUrl) ? '' : this.movie.backdropUrl || '',
      genres: this.movie.genres.join(', '),
      duration: this.movie.duration,
      description: this.movie.description,
      trailerUrl: this.movie.trailerUrl || '',
      language: this.movie.language || '',
      cast: this.movie.cast?.join(', ') || ''
    };

    this.resetArtworkState();
    this.queueArtworkLookup();
  }

  private createEmptyForm(): MovieFormData {
    return {
      title: '',
      director: '',
      releaseDate: formatDateInputValue(new Date()),
      rating: 8.5,
      isWatched: false,
      posterUrl: '',
      backdropUrl: '',
      genres: '',
      duration: 120,
      description: '',
      trailerUrl: '',
      language: '',
      cast: ''
    };
  }

  private parseDelimitedList(value: string, fallback: string[] = []): string[] {
    const parsed = value
      .split(/[，,、/]/)
      .map(item => item.trim())
      .filter(Boolean);

    return parsed.length > 0 ? parsed : fallback;
  }

  private get effectivePosterUrl(): string {
    return this.formData.posterUrl.trim() || this.autoPosterUrl;
  }

  private get effectiveBackdropUrl(): string {
    return this.formData.backdropUrl.trim();
  }

  private queueArtworkLookup(): void {
    this.clearArtworkLookupTimer();
    this.artworkLookupToken += 1;
    const lookupToken = this.artworkLookupToken;

    if (this.formData.posterUrl.trim()) {
      this.resetArtworkState();
      return;
    }

    if (!this.formData.title.trim()) {
      this.resetArtworkState();
      return;
    }

    this.autoPosterUrl = '';
    this.autoPosterSource = '';
    this.artworkState = 'loading';
    this.posterValidationMessage = '';

    this.artworkLookupHandle = window.setTimeout(() => {
      void this.performArtworkLookup(lookupToken);
    }, 450);
  }

  private async resolveArtworkForSubmit(): Promise<void> {
    this.clearArtworkLookupTimer();

    if (!this.formData.posterUrl.trim() && !this.autoPosterUrl && this.formData.title.trim()) {
      const lookupToken = ++this.artworkLookupToken;
      await this.performArtworkLookup(lookupToken);
    }
  }

  private async performArtworkLookup(lookupToken: number): Promise<void> {
    if (this.formData.posterUrl.trim()) {
      this.resetArtworkState();
      return;
    }

    const artwork = await this.movieArtworkService.resolveMovieArtwork(this.previewMovie);

    if (lookupToken !== this.artworkLookupToken || this.formData.posterUrl.trim()) {
      return;
    }

    this.autoPosterUrl = artwork?.posterUrl ?? '';
    this.autoPosterSource = artwork?.posterSource ?? '';
    this.artworkState = artwork?.posterUrl ? 'resolved' : 'fallback';

    if (artwork?.posterUrl) {
      this.posterValidationMessage = '';
    }
  }

  private resetArtworkState(): void {
    this.autoPosterUrl = '';
    this.autoPosterSource = '';
    this.artworkState = 'idle';
    this.posterValidationMessage = '';
  }

  private clearArtworkLookupTimer(): void {
    if (this.artworkLookupHandle !== undefined) {
      window.clearTimeout(this.artworkLookupHandle);
      this.artworkLookupHandle = undefined;
    }
  }
}
