import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { delay, finalize, of } from 'rxjs';
import { MovieFormComponent } from '../../components/movie-form/movie-form.component';
import { Movie } from '../../models/movie';
import { MessageService } from '../../services/message.service';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-add-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule, MovieFormComponent],
  templateUrl: './movie-add-page.component.html',
  styleUrl: './movie-add-page.component.scss'
})
export class MovieAddPageComponent {
  isSaving = false;
  saveError = '';

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private movieService: MovieService,
    private messageService: MessageService
  ) {}

  onSubmit(movieData: Omit<Movie, 'id'>): void {
    if (this.isSaving) {
      return;
    }

    this.isSaving = true;
    this.saveError = '';

    of(this.movieService.addMovie(movieData)).pipe(
      delay(180),
      finalize(() => {
        this.isSaving = false;
      })
    ).subscribe(success => {
      if (success) {
        this.messageService.success(`已把《${movieData.title}》写入片库，电影库页面会立即同步。`, '添加电影');
        this.snackBar.open(`已添加：${movieData.title}`, '关闭', { duration: 3200 });
        void this.router.navigate(['/movies']);
        return;
      }

      this.saveError = `未添加《${movieData.title}》。片库中已存在同名同年份条目，或当前海报校验未通过。`;
      this.messageService.error(this.saveError, '添加电影');
      this.snackBar.open(this.saveError, '关闭', { duration: 3600 });
    });
  }

  onCancel(): void {
    void this.router.navigate(['/movies']);
  }
}
