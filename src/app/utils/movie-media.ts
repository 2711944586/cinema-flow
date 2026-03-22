import { Movie } from '../models/movie';

type MovieVisualSeed = Pick<Movie, 'title' | 'director' | 'releaseDate' | 'genres'> &
  Partial<Pick<Movie, 'posterUrl' | 'backdropUrl' | 'language'>>;

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
  const safeTitle = escapeXml(seed.title || 'Untitled Feature');
  const safeSubtitle = escapeXml(getSubtitle(seed) || 'CinemaFlow');
  const safeGenres = escapeXml(getGenreLine(seed));

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
      <rect x="72" y="72" width="1456" height="756" rx="38" fill="none" stroke="rgba(255,255,255,0.14)" />
      <text x="112" y="164" fill="${gold}" font-size="30" font-family="Outfit, Noto Sans SC, sans-serif" letter-spacing="8">
        FEATURE PRESENTATION
      </text>
      <text x="112" y="540" fill="#F8F2E9" font-size="92" font-weight="700" font-family="Noto Serif SC, Noto Sans SC, serif">
        ${safeTitle}
      </text>
      <text x="112" y="620" fill="#D8D1C7" font-size="32" font-family="Outfit, Noto Sans SC, sans-serif">
        ${safeSubtitle}
      </text>
      <text x="112" y="680" fill="#A59E93" font-size="24" font-family="Outfit, Noto Sans SC, sans-serif" letter-spacing="4">
        ${safeGenres}
      </text>
    </svg>
  `;

  return toDataUri(svg);
}

export function ensureMovieMedia<T extends MovieVisualSeed>(movie: T): T & {
  posterUrl: string;
  backdropUrl: string;
} {
  const posterUrl = movie.posterUrl?.trim() || buildPosterFallback(movie);
  const backdropUrl = movie.backdropUrl?.trim() || buildBackdropFallback(movie);

  return {
    ...movie,
    posterUrl,
    backdropUrl
  };
}

export function buildBackdropImage(seed: MovieVisualSeed): string {
  const fallback = buildBackdropFallback(seed);
  const customBackdrop = seed.backdropUrl?.trim();

  return customBackdrop && customBackdrop !== fallback
    ? `linear-gradient(180deg, rgba(6, 8, 15, 0.14) 0%, rgba(6, 8, 15, 0.8) 66%, rgba(6, 8, 15, 0.96) 100%), url("${customBackdrop}"), url("${fallback}")`
    : `linear-gradient(180deg, rgba(6, 8, 15, 0.14) 0%, rgba(6, 8, 15, 0.8) 66%, rgba(6, 8, 15, 0.96) 100%), url("${fallback}")`;
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
