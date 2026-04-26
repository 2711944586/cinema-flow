import {
  applyBackdropDisplayFallback,
  applyMovieImageFallback,
  normalizeMovieImageUrl,
  optimizeMovieImageUrl
} from './movie-media';

const seed = {
  title: 'The Lord of the Rings: The Fellowship of the Ring',
  director: 'Peter Jackson',
  releaseDate: new Date(2001, 0, 1),
  genres: ['冒险']
};

describe('movie media utilities', () => {
  it('replaces generated placeholders and legacy poster hosts with remote image URLs', () => {
    const generatedSvg = 'data:image/svg+xml;charset=UTF-8,%3Csvg%3ECINEMA%20FLOW%3C%2Fsvg%3E';
    const legacyAmazonPoster = 'https://images-na.ssl-images-amazon.com/images/M/MV5BNTEyMjAwMDU1OV5BMl5BanBnXkFtZTcwNDQyNTkxMw@@._V1_SX300.jpg';
    const legacyImdbPoster = 'https://ia.media-imdb.com/images/M/MV5BMjE4MjA1NTAyMV5BMl5BanBnXkFtZTcwNzM1NDQyMQ@@._V1_SX300.jpg';

    expect(optimizeMovieImageUrl(generatedSvg, 'poster')).toBeNull();
    expect(optimizeMovieImageUrl(legacyAmazonPoster, 'poster')).toBeNull();
    expect(optimizeMovieImageUrl(legacyImdbPoster, 'poster')).toBeNull();
    expect(normalizeMovieImageUrl(generatedSvg, seed, 'poster')).toContain('https://picsum.photos/seed/');
  });

  it('uses remote image URLs instead of SVG when an image load fails', () => {
    const poster = document.createElement('img');
    applyMovieImageFallback({ target: poster } as unknown as Event, seed);

    const backdrop = document.createElement('img');
    applyBackdropDisplayFallback({ target: backdrop } as unknown as Event, seed);

    expect(poster.src).toContain('https://picsum.photos/seed/');
    expect(backdrop.src).toContain('https://picsum.photos/seed/');
    expect(poster.src.startsWith('data:image/svg+xml')).toBeFalse();
    expect(backdrop.src.startsWith('data:image/svg+xml')).toBeFalse();
  });
});
