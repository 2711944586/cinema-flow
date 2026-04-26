import { Movie } from '../models/movie';

export type RemoteMovieSeed = Omit<Movie, 'id'>;

interface ErikMoviePayload {
  title?: string;
  year?: string;
  runtime?: string;
  genres?: string[];
  director?: string;
  actors?: string;
  plot?: string;
  posterUrl?: string;
}

interface ErikCatalogPayload {
  movies?: ErikMoviePayload[];
}

const ERIK_CATALOG_URL = 'https://raw.githubusercontent.com/erik-sytnyk/movies-list/master/db.json';
const MIN_RELEASE_YEAR = 1888;

const GENRE_ALIASES: Record<string, string> = {
  action: '动作',
  adventure: '冒险',
  animation: '动画',
  biography: '传记',
  comedy: '喜剧',
  'black comedy': '黑色喜剧',
  concert: '音乐',
  crime: '犯罪',
  documentary: '纪录片',
  drama: '剧情',
  'dramatic comedy': '剧情',
  family: '家庭',
  fantasy: '奇幻',
  'film-noir': '黑色电影',
  history: '历史',
  horror: '恐怖',
  'kids fiction': '家庭',
  music: '音乐',
  musical: '歌舞',
  mystery: '悬疑',
  romance: '爱情',
  'science fiction': '科幻',
  'sci-fi': '科幻',
  sport: '运动',
  thriller: '惊悚',
  war: '战争',
  western: '西部'
};

function sanitizeText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() || fallback : fallback;
}

function sanitizeImageUrl(url: unknown): string | undefined {
  if (typeof url !== 'string' || !url.trim()) {
    return undefined;
  }

  return url.trim().replace(/^http:\/\//i, 'https://');
}

function parseNumber(value: unknown): number | undefined {
  const numericValue = typeof value === 'string' ? Number(value) : value;
  return typeof numericValue === 'number' && Number.isFinite(numericValue) ? numericValue : undefined;
}

function clampRating(value: number | undefined, fallback = 7.2): number {
  const resolvedValue = value ?? fallback;
  return Math.min(9.9, Math.max(0, +resolvedValue.toFixed(1)));
}

function parseDuration(value: unknown, fallback = 108): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(60, Math.round(value));
  }

  if (typeof value === 'string') {
    const numericValue = Number.parseInt(value.replace(/[^\d]/g, ''), 10);
    if (Number.isFinite(numericValue)) {
      return Math.max(60, numericValue);
    }
  }

  return fallback;
}

function translateGenre(value: string): string {
  const normalizedValue = value.trim().toLowerCase();
  return GENRE_ALIASES[normalizedValue] ?? value.trim();
}

function buildGenres(primaryGenre?: string, genreList: string[] = []): string[] {
  const mergedGenres = [primaryGenre, ...genreList]
    .filter((genre): genre is string => typeof genre === 'string' && genre.trim().length > 0)
    .map(translateGenre);

  return Array.from(new Set(mergedGenres)).slice(0, 4);
}

function parseCastList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(actor => sanitizeText(actor))
      .filter(Boolean)
      .slice(0, 6);
  }

  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map(actor => actor.trim())
    .filter(Boolean)
    .slice(0, 6);
}

function parseReleaseDate(rawDate: unknown, fallbackYear?: unknown): Date {
  if (typeof rawDate === 'string' && rawDate.trim()) {
    const parsedDate = new Date(rawDate);
    if (!Number.isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  const parsedYear = parseNumber(fallbackYear);
  if (parsedYear) {
    return new Date(parsedYear, 0, 1);
  }

  return new Date(new Date().getFullYear(), 0, 1);
}

function parseReleaseYear(rawDate: unknown, fallbackYear?: unknown): number | null {
  const releaseDate = parseReleaseDate(rawDate, fallbackYear);
  const releaseYear = releaseDate.getFullYear();
  const currentYear = new Date().getFullYear();

  if (releaseYear < MIN_RELEASE_YEAR || releaseYear > currentYear) {
    return null;
  }

  return releaseYear;
}

function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function mapErikMovie(movie: ErikMoviePayload): RemoteMovieSeed | null {
  const title = sanitizeText(movie.title);
  const director = sanitizeText(movie.director);
  const releaseYear = parseReleaseYear(undefined, movie.year);

  if (!title || !director || releaseYear === null) {
    return null;
  }

  const posterUrl = sanitizeImageUrl(movie.posterUrl);
  return {
    title,
    releaseDate: new Date(releaseYear, 0, 1),
    director,
    rating: clampRating(undefined, 7.4),
    isWatched: false,
    posterUrl: posterUrl ?? '',
    backdropUrl: posterUrl ?? '',
    genres: buildGenres(undefined, movie.genres ?? []).length > 0 ? buildGenres(undefined, movie.genres ?? []) : ['剧情'],
    duration: parseDuration(movie.runtime),
    description: truncateText(
      sanitizeText(movie.plot, `${title} 已加入扩展片库，适合继续完善你的观影路线。`),
      220
    ),
    isFavorite: false,
    language: '英语',
    cast: parseCastList(movie.actors),
    userNotes: ''
  };
}

export async function fetchExpandedMovieSeeds(fetcher: typeof fetch): Promise<RemoteMovieSeed[]> {
  const erikResult = await fetcher(ERIK_CATALOG_URL);

  if (!erikResult.ok) {
    return [];
  }

  const payload = await erikResult.json() as ErikCatalogPayload;
  return (payload.movies ?? [])
    .map(mapErikMovie)
    .filter((movie): movie is RemoteMovieSeed => !!movie);
}
