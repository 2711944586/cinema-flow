import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';
import { DirectorService } from '../../services/director.service';

@Component({
  selector: 'app-director-list-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './director-list-page.component.html',
  styleUrl: './director-list-page.component.scss'
})
export class DirectorListPageComponent {
  searchQuery = '';

  readonly directors$ = this.directorService.getDirectors();
  readonly vm$ = this.directors$.pipe(
    map(directors => ({
      directors,
      nationalities: Array.from(new Set(directors.map(director => director.nationality))).length,
      avgBirthYear: directors.length > 0
        ? Math.round(directors.reduce((total, director) => total + director.birthYear, 0) / directors.length)
        : 0
    }))
  );

  constructor(private directorService: DirectorService) {}

  filterDirectors<T extends { name: string; bio: string; signatureStyle: string; knownFor: string[] }>(directors: T[]): T[] {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) {
      return directors;
    }

    return directors.filter(director => {
      return [
        director.name,
        director.bio,
        director.signatureStyle,
        director.knownFor.join(' ')
      ].join(' ').toLowerCase().includes(query);
    });
  }

  trackByDirectorId(index: number, director: { id: number }): number {
    return director.id;
  }
}
