import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { MovieFormComponent } from '../../components/movie-form/movie-form.component';
import { Movie } from '../../models/movie';
import { MovieService } from '../../services/movie.service';

@Component({
  selector: 'app-movie-add-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatSnackBarModule, MovieFormComponent],
  templateUrl: './movie-add-page.component.html',
  styleUrl: './movie-add-page.component.scss'
})
export class MovieAddPageComponent {
  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private movieService: MovieService
  ) {}

  onSubmit(movieData: Omit<Movie, 'id'>): void {
    const success = this.movieService.addMovie(movieData);
    this.snackBar.open(
      success ? `已添加：${movieData.title}` : `未添加：${movieData.title}，片库中已存在同名同年份条目`,
      '关闭',
      { duration: 3200 }
    );

    if (success) {
      void this.router.navigate(['/movies']);
    }
  }

  onCancel(): void {
    void this.router.navigate(['/movies']);
  }
}
