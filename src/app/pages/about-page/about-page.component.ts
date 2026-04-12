import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { DataManagementComponent } from '../../components/data-management/data-management.component';
import { MovieStateService } from '../../services/movie-state.service';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [CommonModule, MatIconModule, DataManagementComponent],
  templateUrl: './about-page.component.html',
  styleUrl: './about-page.component.scss'
})
export class AboutPageComponent {
  readonly vm$ = this.movieStateService.aboutVm$;

  constructor(private movieStateService: MovieStateService) {}
}
