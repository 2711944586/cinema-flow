import { TestBed } from '@angular/core/testing';
import { filter, firstValueFrom } from 'rxjs';
import { LoggerService } from './logger.service';
import { MovieService } from './movie.service';

const STORAGE_KEYS = ['cinemaflow.movies.v3', 'cinemaflow.movies.v2'];

describe('MovieService', () => {
  let movieService: MovieService;

  beforeEach(() => {
    STORAGE_KEYS.forEach(key => localStorage.removeItem(key));

    spyOn(window, 'fetch').and.callFake((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('vega-datasets')) {
        return Promise.resolve({
          ok: true,
          json: async () => ([
            {
              Title: 'Expansion Test',
              Director: 'Jane Doe',
              'Release Date': '2025-01-01',
              'Running Time min': 120,
              'Major Genre': 'Action',
              'IMDB Rating': 8.8
            },
            {
              Title: 'Quiet Orbit',
              Director: 'Alex Ray',
              'Release Date': '2024-04-05',
              'Running Time min': 95,
              'Major Genre': 'Science Fiction',
              'IMDB Rating': 7.9
            }
          ])
        } as Response);
      }

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
              posterUrl: 'https://example.com/expansion-test.jpg'
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

  it('merges expanded catalog results and strips generated placeholders before persisting', async () => {
    const movies = await firstValueFrom(
      movieService.movies$.pipe(filter(items => items.some(movie => movie.title === 'Quiet Orbit')))
    );

    expect(movies.length).toBe(46);

    const mergedMovie = movies.find(movie => movie.title === 'Expansion Test');
    const vegaOnlyMovie = movies.find(movie => movie.title === 'Quiet Orbit');
    const persistedMovies = JSON.parse(localStorage.getItem('cinemaflow.movies.v3') ?? '[]') as Array<{ title: string; posterUrl: string; backdropUrl: string }>;
    const persistedVegaOnlyMovie = persistedMovies.find(movie => movie.title === 'Quiet Orbit');

    expect(mergedMovie?.posterUrl).toBe('https://example.com/expansion-test.jpg');
    expect(vegaOnlyMovie).toBeDefined();
    expect(persistedVegaOnlyMovie?.posterUrl).toBe('');
    expect(persistedVegaOnlyMovie?.backdropUrl).toBe('');
  });
});
