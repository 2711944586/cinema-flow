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

const CINEMA_POSTER_PALETTE = [
  ['#090B12', '#171B2B', '#6B1D1D', '#E7B95D'],
  ['#0A1118', '#1A2436', '#3A215A', '#F0C46B'],
  ['#0A0D16', '#18202E', '#6C2B40', '#F5D28B']
];

const CINEMA_BACKDROP_PALETTE = [
  ['#070910', '#101A28', '#51243F', '#E7B95D'],
  ['#090D17', '#152133', '#203B57', '#F7D489'],
  ['#060810', '#1A1E2E', '#462B22', '#E3B563']
];

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

function hashSeed(input: string): number {
  return Array.from(input).reduce((hash, char) => {
    return (hash << 5) - hash + char.charCodeAt(0);
  }, 0);
}

function getPalette(seed: string, variants: string[][]): string[] {
  const index = Math.abs(hashSeed(seed)) % variants.length;
  return variants[index];
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function toDataUri(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function isGeneratedMovieArt(url: string | undefined): boolean {
  return !!url && url.startsWith('data:image/svg+xml;charset=UTF-8,');
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

    if (/(?:^|\.)ia\.media-imdb\.com$/i.test(parsedUrl.hostname)) {
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
    return trimmedUrl;
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

    if (/(?:^|\.)ia\.media-imdb\.com$/i.test(parsedUrl.hostname)) {
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

function getMovieYear(seed: MovieVisualSeed): string {
  return `${coerceMovieDate(seed.releaseDate).getFullYear()}`;
}

function getGenreLine(seed: MovieVisualSeed): string {
  return seed.genres?.slice(0, 3).join(' / ') || 'CINEMA FLOW';
}

function getSubtitle(seed: MovieVisualSeed): string {
  return [seed.director, seed.language, getMovieYear(seed)]
    .filter(Boolean)
    .join(' · ');
}

export function buildPosterFallback(seed: MovieVisualSeed): string {
  const [bgTop, bgBottom, accent, gold] = getPalette(
    `${seed.title}-${seed.director}-poster`,
    CINEMA_POSTER_PALETTE
  );
  const safeTitle = escapeXml(seed.title || 'Untitled Feature');
  const safeGenres = escapeXml(getGenreLine(seed));
  const safeSubtitle = escapeXml(getSubtitle(seed) || 'CinemaFlow Collection');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1080">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bgTop}" />
          <stop offset="100%" stop-color="${bgBottom}" />
        </linearGradient>
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${gold}" stop-opacity="0.8" />
          <stop offset="100%" stop-color="${gold}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="720" height="1080" fill="url(#bg)" />
      <circle cx="610" cy="130" r="170" fill="${accent}" opacity="0.24" />
      <circle cx="90" cy="950" r="180" fill="${gold}" opacity="0.12" />
      <path d="M0 760 C160 680 280 840 420 760 S620 660 720 740 L720 1080 L0 1080 Z" fill="${accent}" opacity="0.18" />
      <rect x="52" y="56" width="616" height="968" rx="36" fill="none" stroke="rgba(255,255,255,0.12)" />
      <rect x="84" y="94" width="12" height="892" rx="6" fill="url(#shine)" />
      <text x="84" y="160" fill="${gold}" font-size="28" font-family="Outfit, Noto Sans SC, sans-serif" letter-spacing="7">
        CINEMA FLOW
      </text>
      <text x="84" y="778" fill="#F8F2E9" font-size="66" font-weight="700" font-family="Noto Serif SC, Noto Sans SC, serif">
        ${safeTitle}
      </text>
      <text x="84" y="856" fill="#D8D1C7" font-size="26" font-family="Outfit, Noto Sans SC, sans-serif">
        ${safeSubtitle}
      </text>
      <text x="84" y="906" fill="#A59E93" font-size="24" font-family="Outfit, Noto Sans SC, sans-serif" letter-spacing="3">
        ${safeGenres}
      </text>
      <text x="84" y="980" fill="#8A8378" font-size="20" font-family="Outfit, Noto Sans SC, sans-serif" letter-spacing="5">
        ARCHIVE EDITION
      </text>
    </svg>
  `;

  return toDataUri(svg);
}

export function buildBackdropFallback(seed: MovieVisualSeed): string {
  const [bgTop, bgBottom, accent, gold] = getPalette(
    `${seed.title}-${seed.director}-backdrop`,
    CINEMA_BACKDROP_PALETTE
  );

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${bgTop}" />
          <stop offset="100%" stop-color="${bgBottom}" />
        </linearGradient>
        <radialGradient id="halo" cx="80%" cy="20%" r="55%">
          <stop offset="0%" stop-color="${gold}" stop-opacity="0.55" />
          <stop offset="100%" stop-color="${gold}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#bg)" />
      <rect width="1600" height="900" fill="url(#halo)" />
      <path d="M0 710 C260 540 500 720 780 620 S1250 420 1600 610 L1600 900 L0 900 Z" fill="${accent}" opacity="0.2" />
      <path d="M0 790 C260 690 420 870 650 760 S1160 620 1600 760 L1600 900 L0 900 Z" fill="${gold}" opacity="0.12" />
      <circle cx="1260" cy="186" r="240" fill="${gold}" opacity="0.14" />
      <circle cx="280" cy="184" r="180" fill="${accent}" opacity="0.12" />
      <circle cx="1360" cy="760" r="210" fill="${accent}" opacity="0.08" />
      <rect x="72" y="72" width="1456" height="756" rx="38" fill="none" stroke="rgba(255,255,255,0.14)" />
      <text x="112" y="164" fill="${gold}" font-size="30" font-family="Outfit, Noto Sans SC, sans-serif" letter-spacing="8">
        FEATURE PRESENTATION
      </text>
      <rect x="112" y="214" width="260" height="2" fill="${gold}" opacity="0.42" />
      <rect x="112" y="246" width="520" height="16" rx="8" fill="rgba(255,255,255,0.08)" />
      <rect x="112" y="278" width="440" height="16" rx="8" fill="rgba(255,255,255,0.06)" />
      <rect x="112" y="310" width="360" height="16" rx="8" fill="rgba(255,255,255,0.05)" />
      <rect x="112" y="590" width="280" height="12" rx="6" fill="rgba(255,255,255,0.06)" />
      <rect x="112" y="618" width="220" height="12" rx="6" fill="rgba(255,255,255,0.05)" />
      <rect x="112" y="646" width="180" height="12" rx="6" fill="rgba(255,255,255,0.04)" />
    </svg>
  `;

  return toDataUri(svg);
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
  const generatedFallback = buildBackdropFallback(seed);
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
      'background-image': `linear-gradient(180deg, rgba(6, 8, 15, 0.14) 0%, rgba(6, 8, 15, 0.8) 66%, rgba(6, 8, 15, 0.96) 100%), url("${posterFallback}"), url("${generatedFallback}")`,
      'background-position': 'center, right 5% center, center',
      'background-repeat': 'repeat, no-repeat, no-repeat',
      'background-size': 'auto, clamp(260px, 30vw, 520px) auto, cover'
    };
  }

  return {
    'background-image': `linear-gradient(180deg, rgba(6, 8, 15, 0.14) 0%, rgba(6, 8, 15, 0.8) 66%, rgba(6, 8, 15, 0.96) 100%), url("${remoteFallback}"), url("${generatedFallback}")`,
    'background-position': 'center, center, center',
    'background-repeat': 'repeat, no-repeat, no-repeat',
    'background-size': 'auto, cover, cover'
  };
}

export function buildBackdropImage(seed: MovieVisualSeed): string {
  return buildBackdropStyle(seed)['background-image'];
}

export function applyBackdropDisplayFallback(event: Event, movie: MovieVisualSeed): void {
  const image = event.target as HTMLImageElement;
  const posterFallback = optimizeBackdropDisplayUrl(movie.posterUrl);
  const generatedFallback = buildBackdropFallback(movie);

  if (image.dataset['posterFallbackApplied'] !== 'true' && posterFallback && image.currentSrc !== posterFallback) {
    image.dataset['posterFallbackApplied'] = 'true';
    image.src = posterFallback;
    return;
  }

  if (image.dataset['fallbackApplied'] === 'true') {
    return;
  }

  image.dataset['fallbackApplied'] = 'true';
  image.src = generatedFallback;
}

export function applyMovieImageFallback(
  event: Event,
  movie: MovieVisualSeed,
  kind: 'poster' | 'backdrop' = 'poster'
): void {
  const image = event.target as HTMLImageElement;
  const fallback = kind === 'poster' ? buildPosterFallback(movie) : buildBackdropFallback(movie);

  if (image.dataset['fallbackApplied'] === 'true') {
    return;
  }

  image.dataset['fallbackApplied'] = 'true';
  image.src = fallback;
}
