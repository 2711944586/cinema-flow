import { Movie } from '../models/movie';

type MovieVisualSeed = Pick<Movie, 'title' | 'director' | 'releaseDate' | 'genres'> &
  Partial<Pick<Movie, 'posterUrl' | 'backdropUrl' | 'language'>>;

type MovieImageKind = 'poster' | 'backdrop';

export interface MovieBackdropStyle {
  'background-image': string;
  'background-position': string;
  'background-repeat': string;
  'background-size': string;
}

const TMDB_IMAGE_SIZES: Record<MovieImageKind, string> = {
  poster: 'w500',
  backdrop: 'w1280'
};

const WIKIMEDIA_IMAGE_WIDTHS: Record<MovieImageKind, number> = {
  poster: 500,
  backdrop: 1280
};

const WIKIMEDIA_BACKDROP_DISPLAY_WIDTH = 1920;

const REMOTE_IMAGE_EXTENSION = /\.(avif|gif|jpe?g|png|webp)$/i;
const REMOTE_FALLBACK_HOST = 'picsum.photos';
const UNSTABLE_IMAGE_HOST_PATTERN = /(?:^|\.)((?:ia\.media-imdb\.com)|(?:images-na\.ssl-images-amazon\.com))$/i;

export function isGeneratedMovieArt(url: string | undefined): boolean {
  return !!url && url.startsWith('data:image/svg+xml;charset=UTF-8,');
}

export function isRemoteFallbackMovieArt(url: string | undefined): boolean {
  if (!url) {
    return false;
  }

  try {
    return new URL(url).hostname === REMOTE_FALLBACK_HOST;
  } catch {
    return false;
  }
}

function isUnstableRemoteImageHost(hostname: string): boolean {
  return UNSTABLE_IMAGE_HOST_PATTERN.test(hostname);
}

function getUrlFilename(url: URL): string | null {
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const filename = pathSegments[pathSegments.length - 1];

  return filename ? filename.split('?')[0] : null;
}

function isSuspiciousImageFilename(filename: string): boolean {
  const normalized = decodeURIComponent(filename).replace(/\.[^.]+$/, '');

  if (!normalized || normalized.length < 12) {
    return false;
  }

  return /([a-z0-9])\1{5,}/i.test(normalized) || /([a-z]{2,4})\1{4,}/i.test(normalized);
}

function optimizeTmdbImageUrl(url: URL, kind: MovieImageKind): string | null {
  const filename = getUrlFilename(url);

  if (!filename || !REMOTE_IMAGE_EXTENSION.test(filename) || isSuspiciousImageFilename(filename)) {
    return null;
  }

  return `https://image.tmdb.org/t/p/${TMDB_IMAGE_SIZES[kind]}/${filename}`;
}

function optimizeWikimediaImageUrl(url: URL, kind: MovieImageKind, width?: number): string | null {
  const segments = url.pathname.split('/').filter(Boolean);
  const wikipediaIndex = segments.indexOf('wikipedia');

  if (wikipediaIndex === -1) {
    return url.toString();
  }

  const collection = segments[wikipediaIndex + 1];
  const sourceOffset = segments[wikipediaIndex + 2] === 'thumb' ? 3 : 2;
  const hashA = segments[wikipediaIndex + sourceOffset];
  const hashB = segments[wikipediaIndex + sourceOffset + 1];
  const filename = segments[wikipediaIndex + sourceOffset + 2];

  if (!collection || !hashA || !hashB || !filename) {
    return url.toString();
  }

  if (!REMOTE_IMAGE_EXTENSION.test(filename) || isSuspiciousImageFilename(filename)) {
    return null;
  }

  return `${url.origin}/wikipedia/${collection}/thumb/${hashA}/${hashB}/${filename}/${width ?? WIKIMEDIA_IMAGE_WIDTHS[kind]}px-${filename}`;
}

function optimizeBackdropDisplayUrl(url: string | undefined): string | null {
  const trimmedUrl = url?.trim();

  if (!trimmedUrl || isGeneratedMovieArt(trimmedUrl)) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);

    if (!/^https?:$/i.test(parsedUrl.protocol)) {
      return null;
    }

    const filename = getUrlFilename(parsedUrl);
    if (!filename || isSuspiciousImageFilename(filename)) {
      return null;
    }

    if (isUnstableRemoteImageHost(parsedUrl.hostname)) {
      return null;
    }

    if (/(?:^|\.)themoviedb\.org$/i.test(parsedUrl.hostname)) {
      return `https://image.tmdb.org/t/p/original/${filename}`;
    }

    if (/(?:^|\.)wikimedia\.org$/i.test(parsedUrl.hostname)) {
      return optimizeWikimediaImageUrl(parsedUrl, 'backdrop', WIKIMEDIA_BACKDROP_DISPLAY_WIDTH);
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

export function getBackdropDisplayUrl(seed: MovieVisualSeed): string {
  return optimizeBackdropDisplayUrl(seed.backdropUrl)
    ?? optimizeBackdropDisplayUrl(seed.posterUrl)
    ?? buildRemoteBackdropUrl(seed);
}

export function optimizeMovieImageUrl(
  url: string | undefined,
  kind: MovieImageKind = 'poster'
): string | null {
  const trimmedUrl = url?.trim();

  if (!trimmedUrl) {
    return null;
  }

  if (isGeneratedMovieArt(trimmedUrl)) {
    return null;
  }

  try {
    const parsedUrl = new URL(trimmedUrl);

    if (!/^https?:$/i.test(parsedUrl.protocol)) {
      return null;
    }

    const filename = getUrlFilename(parsedUrl);
    if (filename && isSuspiciousImageFilename(filename)) {
      return null;
    }

    if (isUnstableRemoteImageHost(parsedUrl.hostname)) {
      return null;
    }

    if (/(?:^|\.)themoviedb\.org$/i.test(parsedUrl.hostname)) {
      return optimizeTmdbImageUrl(parsedUrl, kind);
    }

    if (/(?:^|\.)wikimedia\.org$/i.test(parsedUrl.hostname)) {
      return optimizeWikimediaImageUrl(parsedUrl, kind);
    }

    return parsedUrl.toString();
  } catch {
    return null;
  }
}

export function normalizeMovieImageUrl(
  url: string | undefined,
  movie: MovieVisualSeed,
  kind: MovieImageKind = 'poster'
): string {
  const fallback = kind === 'poster' ? buildRemotePosterUrl(movie) : buildRemoteBackdropUrl(movie);
  return optimizeMovieImageUrl(url, kind) ?? fallback;
}

export function coerceMovieDate(value: Date | string | undefined): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

export function formatDateInputValue(value: Date | string | undefined): string {
  const date = coerceMovieDate(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildRemotePosterUrl(seed: MovieVisualSeed): string {
  const normalizedSeed = encodeURIComponent(`${seed.title || 'untitled'}-${seed.director || 'director'}-poster`);
  return `https://picsum.photos/seed/${normalizedSeed}/500/750`;
}

export function buildRemoteBackdropUrl(seed: MovieVisualSeed): string {
  const normalizedSeed = encodeURIComponent(`${seed.title || 'untitled'}-${seed.director || 'director'}-backdrop`);
  return `https://picsum.photos/seed/${normalizedSeed}/1280/720`;
}

export function ensureMovieMedia<T extends MovieVisualSeed>(movie: T): T & {
  posterUrl: string;
  backdropUrl: string;
} {
  const posterUrl = normalizeMovieImageUrl(movie.posterUrl, movie, 'poster');
  const optimizedBackdropUrl = optimizeMovieImageUrl(movie.backdropUrl, 'backdrop');
  const backdropUrl = optimizedBackdropUrl
    ?? buildRemoteBackdropUrl(movie);

  return {
    ...movie,
    posterUrl,
    backdropUrl
  };
}

export function buildBackdropStyle(seed: MovieVisualSeed): MovieBackdropStyle {
  const remoteFallback = buildRemoteBackdropUrl(seed);
  const customBackdrop = optimizeBackdropDisplayUrl(seed.backdropUrl);
  const posterFallback = optimizeBackdropDisplayUrl(seed.posterUrl);
  if (customBackdrop && !isGeneratedMovieArt(customBackdrop)) {
    return {
      'background-image': `linear-gradient(180deg, rgba(6, 8, 15, 0.14) 0%, rgba(6, 8, 15, 0.8) 66%, rgba(6, 8, 15, 0.96) 100%), url("${customBackdrop}")`,
      'background-position': 'center, center',
      'background-repeat': 'repeat, no-repeat',
      'background-size': 'auto, cover'
    };
  }

  if (posterFallback && !isGeneratedMovieArt(posterFallback)) {
    return {
      'background-image': `linear-gradient(180deg, rgba(6, 8, 15, 0.14) 0%, rgba(6, 8, 15, 0.8) 66%, rgba(6, 8, 15, 0.96) 100%), url("${posterFallback}")`,
      'background-position': 'center, right 5% center',
      'background-repeat': 'repeat, no-repeat',
      'background-size': 'auto, clamp(260px, 30vw, 520px) auto'
    };
  }

  return {
    'background-image': `linear-gradient(180deg, rgba(6, 8, 15, 0.14) 0%, rgba(6, 8, 15, 0.8) 66%, rgba(6, 8, 15, 0.96) 100%), url("${remoteFallback}")`,
    'background-position': 'center, center',
    'background-repeat': 'repeat, no-repeat',
    'background-size': 'auto, cover'
  };
}

export function buildBackdropImage(seed: MovieVisualSeed): string {
  return buildBackdropStyle(seed)['background-image'];
}

export function applyBackdropDisplayFallback(event: Event, movie: MovieVisualSeed): void {
  const image = event.target as HTMLImageElement;
  const posterFallback = optimizeBackdropDisplayUrl(movie.posterUrl);
  const remoteFallback = buildRemoteBackdropUrl(movie);

  if (image.dataset['posterFallbackApplied'] !== 'true' && posterFallback && image.currentSrc !== posterFallback) {
    image.dataset['posterFallbackApplied'] = 'true';
    image.src = posterFallback;
    return;
  }

  if (image.dataset['fallbackApplied'] === 'true') {
    return;
  }

  image.dataset['fallbackApplied'] = 'true';
  image.src = remoteFallback;
}

export function applyMovieImageFallback(
  event: Event,
  movie: MovieVisualSeed,
  kind: 'poster' | 'backdrop' = 'poster'
): void {
  const image = event.target as HTMLImageElement;
  const fallback = kind === 'poster' ? buildRemotePosterUrl(movie) : buildRemoteBackdropUrl(movie);

  if (image.dataset['fallbackApplied'] === 'true') {
    return;
  }

  image.dataset['fallbackApplied'] = 'true';
  image.src = fallback;
}
