import { ParamMap, Params } from '@angular/router';
import { Movie } from '../models/movie';

export type MovieSortOption = 'newest' | 'toprated' | 'title' | 'director';
export type MovieViewMode = 'table' | 'grid';

export interface MovieQueryState {
  search: string;
  genre: string;
  sort: MovieSortOption;
  watched: boolean;
  favorite: boolean;
  view: MovieViewMode;
}

export const DEFAULT_MOVIE_QUERY_STATE: MovieQueryState = {
  search: '',
  genre: 'all',
  sort: 'newest',
  watched: false,
  favorite: false,
  view: 'table'
};

export const MOVIE_SORT_OPTIONS: Array<{ value: MovieSortOption; label: string }> = [
  { value: 'newest', label: '最新上映' },
  { value: 'toprated', label: '最高评分' },
  { value: 'title', label: '标题排序' },
  { value: 'director', label: '导演排序' }
];

export const MOVIE_VIEW_OPTIONS: Array<{ value: MovieViewMode; label: string; icon: string }> = [
  { value: 'table', label: '列表视图', icon: 'table_rows' },
  { value: 'grid', label: '卡片视图', icon: 'grid_view' }
];

export function collectMovieGenres(movies: Movie[]): string[] {
  return Array.from(new Set(movies.flatMap(movie => movie.genres ?? [])))
    .sort((first, second) => first.localeCompare(second, 'zh-CN'));
}

export function parseMovieQueryState(queryParamMap: ParamMap, genres: string[]): MovieQueryState {
  const availableGenres = new Set(genres);
  const sort = queryParamMap.get('sort') as MovieSortOption | null;
  const view = queryParamMap.get('view') as MovieViewMode | null;
  const genre = queryParamMap.get('genre')?.trim() ?? '';

  return {
    search: queryParamMap.get('search')?.trim() ?? DEFAULT_MOVIE_QUERY_STATE.search,
    genre: genre && availableGenres.has(genre) ? genre : DEFAULT_MOVIE_QUERY_STATE.genre,
    sort: sort && MOVIE_SORT_OPTIONS.some(option => option.value === sort)
      ? sort
      : DEFAULT_MOVIE_QUERY_STATE.sort,
    watched: queryParamMap.get('watched') === 'true',
    favorite: queryParamMap.get('favorite') === 'true',
    view: view && MOVIE_VIEW_OPTIONS.some(option => option.value === view)
      ? view
      : DEFAULT_MOVIE_QUERY_STATE.view
  };
}

export function toMovieQueryParams(state: MovieQueryState): Params {
  return {
    search: state.search || null,
    genre: state.genre !== 'all' ? state.genre : null,
    sort: state.sort !== DEFAULT_MOVIE_QUERY_STATE.sort ? state.sort : null,
    watched: state.watched ? 'true' : null,
    favorite: state.favorite ? 'true' : null,
    view: state.view !== DEFAULT_MOVIE_QUERY_STATE.view ? state.view : null
  };
}

export function filterMoviesByQueryState(movies: Movie[], state: MovieQueryState): Movie[] {
  let result = [...movies];
  const searchQuery = state.search.trim().toLowerCase();

  if (searchQuery) {
    result = result.filter(movie => {
      const haystack = [
        movie.title,
        movie.director,
        ...(movie.cast ?? []),
        ...(movie.genres ?? [])
      ].join(' ').toLowerCase();

      return haystack.includes(searchQuery);
    });
  }

  if (state.genre !== 'all') {
    result = result.filter(movie => movie.genres.includes(state.genre));
  }

  if (state.watched) {
    result = result.filter(movie => movie.isWatched);
  }

  if (state.favorite) {
    result = result.filter(movie => !!movie.isFavorite);
  }

  switch (state.sort) {
    case 'toprated':
      return result.sort((first, second) => second.rating - first.rating || second.id - first.id);
    case 'title':
      return result.sort((first, second) => first.title.localeCompare(second.title, 'zh-CN'));
    case 'director':
      return result.sort((first, second) => first.director.localeCompare(second.director, 'zh-CN'));
    case 'newest':
    default:
      return result.sort((first, second) =>
        second.releaseDate.getTime() - first.releaseDate.getTime() || second.id - first.id
      );
  }
}
