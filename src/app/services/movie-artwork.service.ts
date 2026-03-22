import { Injectable } from '@angular/core';
import { Movie } from '../models/movie';
import { coerceMovieDate, optimizeMovieImageUrl } from '../utils/movie-media';

interface ArtworkSeed {
  title: string;
  releaseDate: Date | string;
  director?: string;
}

interface ResolvedMovieArtwork {
  posterUrl: string;
  posterSource: string;
}

interface WikiPageProps {
  page_image?: string;
  page_image_free?: string;
  'wikibase-shortdesc'?: string;
}

interface WikiPage {
  title: string;
  index?: number;
  pageprops?: WikiPageProps;
}

interface WikiSearchResponse {
  query?: {
    pages?: Record<string, WikiPage>;
  };
}

interface WikiImageInfo {
  url?: string;
}

interface WikiImagePage {
  imageinfo?: WikiImageInfo[];
}

interface WikiImageResponse {
  query?: {
    pages?: Record<string, WikiImagePage>;
  };
}

interface WikiSearchPlan {
  site: 'en' | 'zh';
  query: string;
  candidate: string;
}

interface WikiMatch {
  site: 'en' | 'zh';
  title: string;
  pageImage: string;
  score: number;
}

@Injectable({ providedIn: 'root' })
export class MovieArtworkService {
  private readonly cache = new Map<string, Promise<ResolvedMovieArtwork | null>>();
  private readonly filmMarkers = ['film', 'movie', 'documentary', '电影', '紀錄片', '纪录片', '動畫電影', '动画电影'];

  resolveMovieArtwork(
    seed: Pick<Movie, 'title' | 'releaseDate'> & Partial<Pick<Movie, 'director'>>
  ): Promise<ResolvedMovieArtwork | null> {
    const title = seed.title.trim();

    if (!title) {
      return Promise.resolve(null);
    }

    const year = coerceMovieDate(seed.releaseDate).getFullYear();
    const key = `${this.normalizeText(title)}-${year}`;
    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    const lookupPromise = this.lookupArtwork({
      title,
      releaseDate: seed.releaseDate,
      director: seed.director
    });

    this.cache.set(key, lookupPromise);
    return lookupPromise;
  }

  private async lookupArtwork(seed: ArtworkSeed): Promise<ResolvedMovieArtwork | null> {
    const year = coerceMovieDate(seed.releaseDate).getFullYear();
    const plans = this.buildSearchPlans(seed.title, year, seed.director);

    for (const plan of plans) {
      const match = await this.searchWikipedia(plan, year);
      if (!match) {
        continue;
      }

      const posterUrl = await this.resolveImageUrl(match.site, match.pageImage);
      if (!posterUrl) {
        continue;
      }

      const optimizedPosterUrl = optimizeMovieImageUrl(posterUrl, 'poster');
      if (!optimizedPosterUrl) {
        continue;
      }

      return {
        posterUrl: optimizedPosterUrl,
        posterSource: `${match.site === 'zh' ? '中文维基百科' : '英文维基百科'} · ${match.title}`
      };
    }

    return null;
  }

  private buildSearchPlans(title: string, year: number, director?: string): WikiSearchPlan[] {
    const candidates = this.buildTitleCandidates(title);
    const plans: WikiSearchPlan[] = [];

    candidates.forEach(candidate => {
      const isCjk = /[\u3400-\u9fff]/.test(candidate);
      const trimmedDirector = director?.trim();

      if (isCjk) {
        plans.push({ site: 'zh', candidate, query: `${candidate} ${year} 电影` });
        plans.push({ site: 'zh', candidate, query: candidate });
      } else {
        plans.push({ site: 'en', candidate, query: `${candidate} ${year} film` });
        plans.push({ site: 'en', candidate, query: candidate });
      }

      if (trimmedDirector) {
        plans.push({
          site: isCjk ? 'zh' : 'en',
          candidate,
          query: `${candidate} ${year} ${trimmedDirector}`
        });
      }

      if (!isCjk) {
        plans.push({ site: 'zh', candidate, query: `${candidate} ${year} 电影` });
      }

      if (isCjk) {
        plans.push({ site: 'en', candidate, query: `${candidate} ${year} film` });
      }
    });

    const dedupedPlans = new Map<string, WikiSearchPlan>();
    plans.forEach(plan => {
      const key = `${plan.site}-${plan.query.toLowerCase()}`;
      if (!dedupedPlans.has(key)) {
        dedupedPlans.set(key, plan);
      }
    });

    return Array.from(dedupedPlans.values()).slice(0, 10);
  }

  private buildTitleCandidates(title: string): string[] {
    const candidates = new Set<string>();
    const normalizedTitle = title.replace(/\s+/g, ' ').trim();

    const addCandidate = (value: string): void => {
      const candidate = value.trim().replace(/\s+/g, ' ');
      if (candidate.length > 1) {
        candidates.add(candidate);
      }
    };

    addCandidate(normalizedTitle);

    normalizedTitle
      .split(/[\\/]/)
      .forEach(addCandidate);

    const bracketContents = normalizedTitle.matchAll(/[（(]([^()（）]+)[)）]/g);
    for (const match of bracketContents) {
      addCandidate(match[1] ?? '');
    }

    addCandidate(normalizedTitle.replace(/[（(][^()（）]+[)）]/g, ' '));

    return Array.from(candidates)
      .sort((first, second) => second.length - first.length)
      .slice(0, 6);
  }

  private async searchWikipedia(plan: WikiSearchPlan, year: number): Promise<WikiMatch | null> {
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: plan.query,
      gsrnamespace: '0',
      gsrlimit: '6',
      prop: 'pageprops',
      format: 'json',
      origin: '*'
    });

    const response = await this.fetchJson<WikiSearchResponse>(
      `https://${plan.site}.wikipedia.org/w/api.php?${params.toString()}`
    );

    const pages = Object.values(response.query?.pages ?? {});
    const rankedPages = pages
      .map(page => {
        const pageImage = page.pageprops?.page_image ?? page.pageprops?.page_image_free;
        if (!pageImage || !this.hasRelevantTitle(page.title, plan.candidate)) {
          return null;
        }

        return {
          page,
          pageImage,
          score: this.scorePage(page, plan.candidate, year)
        };
      })
      .filter((value): value is { page: WikiPage; pageImage: string; score: number } => value !== null)
      .sort((first, second) => second.score - first.score);

    const bestPage = rankedPages[0];

    if (!bestPage || bestPage.score < 6 || !this.looksLikeFilmPage(bestPage.page, year)) {
      return null;
    }

    return {
      site: plan.site,
      title: bestPage.page.title,
      pageImage: bestPage.pageImage,
      score: bestPage.score
    };
  }

  private scorePage(page: WikiPage, candidate: string, year: number): number {
    const description = (page.pageprops?.['wikibase-shortdesc'] ?? '').toLowerCase();
    const normalizedTitle = this.normalizeText(page.title);
    const normalizedCandidate = this.normalizeText(candidate);

    let score = 0;

    if (this.filmMarkers.some(marker => description.includes(marker.toLowerCase()))) {
      score += 4;
    }

    if (description.includes(`${year}`) || page.title.includes(`${year}`)) {
      score += 2;
    }

    if (normalizedTitle === normalizedCandidate) {
      score += 5;
    } else if (normalizedTitle.includes(normalizedCandidate) || normalizedCandidate.includes(normalizedTitle)) {
      score += 3;
    }

    if (page.index !== undefined) {
      score += Math.max(0, 4 - page.index);
    }

    if (!this.looksLikeFilmPage(page, year)) {
      score -= 6;
    }

    return score;
  }

  private looksLikeFilmPage(page: WikiPage, year: number): boolean {
    const description = (page.pageprops?.['wikibase-shortdesc'] ?? '').toLowerCase();
    const pageTitle = page.title.toLowerCase();

    return this.filmMarkers.some(marker =>
      description.includes(marker.toLowerCase()) || pageTitle.includes(marker.toLowerCase())
    ) || pageTitle.includes(`${year}`);
  }

  private hasRelevantTitle(pageTitle: string, candidate: string): boolean {
    const normalizedTitle = this.normalizeText(pageTitle);
    const normalizedCandidate = this.normalizeText(candidate);

    return normalizedTitle === normalizedCandidate
      || normalizedTitle.includes(normalizedCandidate)
      || normalizedCandidate.includes(normalizedTitle);
  }

  private async resolveImageUrl(site: 'en' | 'zh', fileName: string): Promise<string | null> {
    const params = new URLSearchParams({
      action: 'query',
      titles: `File:${fileName.replace(/_/g, ' ')}`,
      prop: 'imageinfo',
      iiprop: 'url',
      format: 'json',
      origin: '*'
    });

    const response = await this.fetchJson<WikiImageResponse>(
      `https://${site}.wikipedia.org/w/api.php?${params.toString()}`
    );

    const imagePage = Object.values(response.query?.pages ?? {})[0];
    return imagePage?.imageinfo?.[0]?.url ?? null;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutHandle = window.setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Artwork lookup failed: ${response.status}`);
      }

      return await response.json() as T;
    } catch {
      return {} as T;
    } finally {
      window.clearTimeout(timeoutHandle);
    }
  }

  private normalizeText(value: string): string {
    return value
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\u3400-\u9fff]+/gu, '');
  }
}
