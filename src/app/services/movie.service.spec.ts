import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';
import { MovieService } from './movie.service';

const STORAGE_KEYS = ['cinemaflow.movies.v4', 'cinemaflow.movies.v3', 'cinemaflow.movies.v2'];

describe('MovieService', () => {
  let movieService: MovieService;

  beforeEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

    spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
      const url = String(input);

      return Promise.resolve({
        ok: true,
        json: async () => ({
          movies: [
            {
              title: 'Expansion Test',
              year: '2025',
              runtime: '120 min',
              genres: ['Action'],
              director: 'Jane Doe',
              actors: 'Actor A, Actor B',
              plot: 'Poster merge target',
              posterUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Clapperboard_Icon_-_nospace.png/500px-Clapperboard_Icon_-_nospace.png'
            },
            {
              title: 'Pan\'s Labyrinth',
              year: '2006',
              runtime: '95',
              genres: ['Fantasy'],
              director: 'Guillermo del Toro',
              actors: 'Actor C, Actor D',
              plot: 'Valid catalog entry',
              posterUrl: ''
            },
            {
              title: 'Future Mirage',
              year: '2046',
              runtime: '95',
              genres: ['Drama'],
              director: 'Future Director',
              actors: 'Actor E',
              plot: 'Invalid future entry',
              posterUrl: ''
            },
            {
              title: 'Anonymous Drift',
              year: '2024',
              runtime: '90',
              genres: ['Drama'],
              director: '',
              actors: 'Actor F',
              plot: 'Missing director entry',
              posterUrl: ''
            }
          ]
        })
      } as Response);
    });

    TestBed.configureTestingModule({
      providers: [LoggerService, MovieService]
    });

    movieService = TestBed.inject(MovieService);
  });

  afterEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
  });

  it('merges vetted expanded catalog results and strips generated placeholders before persisting', async () => {
    const movies = await firstValueFrom(
      movieService.movies$.pipe(filter(items => items.some(movie => movie.title === 'Pan\'s Labyrinth')))
    );

    expect(movies.length).toBe(46);

    const mergedMovie = movies.find(movie => movie.title === 'Expansion Test');
    const panMovie = movies.find(movie => movie.title === 'Pan\'s Labyrinth');
    const futureMovie = movies.find(movie => movie.title === 'Future Mirage');
    const anonymousMovie = movies.find(movie => movie.title === 'Anonymous Drift');
    const persistedMovies = JSON.parse(localStorage.getItem('cinemaflow.movies.v4') ?? '[]') as Array<{ title: string; posterUrl: string; backdropUrl: string }>;
    const persistedPanMovie = persistedMovies.find(movie => movie.title === 'Pan\'s Labyrinth');

    expect(mergedMovie?.posterUrl).toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Clapperboard_Icon_-_nospace.png/500px-Clapperboard_Icon_-_nospace.png');
    expect(panMovie).toBeDefined();
    expect(futureMovie).toBeUndefined();
    expect(anonymousMovie).toBeUndefined();
    expect(persistedPanMovie?.posterUrl).toContain('upload.wikimedia.org');
    expect(persistedPanMovie?.backdropUrl).toContain('upload.wikimedia.org');
  });
});
