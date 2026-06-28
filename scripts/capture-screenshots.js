const { chromium } = require('playwright');
const path = require('path');

const base = process.env.CINEMAFLOW_BASE_URL || 'http://127.0.0.1:4200';
const shots = [
  ['dashboard', '/dashboard'],
  ['movies', '/movies'],
  ['movies-search-inception', '/movies?search=Inception'],
  ['movies-genre-sci-fi', '/movies/genre/科幻'],
  ['movie-detail-info', '/movies/1/info'],
  ['movie-detail-cast', '/movies/1/cast'],
  ['add', '/add'],
  ['directors', '/directors'],
  ['director-detail', '/directors/1'],
  ['explore', '/explore'],
  ['favorites', '/favorites'],
  ['timeline', '/timeline'],
  ['recommendations', '/recommendations'],
  ['random', '/random'],
  ['compare', '/compare'],
  ['calendar', '/calendar'],
  ['reviews', '/reviews'],
  ['watch-plans', '/watch-plans'],
  ['watch-logs', '/watch-logs'],
  ['smart-picks', '/smart-picks'],
  ['director-atlas', '/director-atlas'],
  ['mood-atlas', '/mood-atlas'],
  ['marathon', '/marathon'],
  ['taste-dna', '/taste-dna'],
  ['scene-board', '/scene-board'],
  ['archive-health', '/archive-health'],
  ['about', '/about']
];

async function waitForPage(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1600);
  await page.evaluate(async () => {
    const images = Array.from(document.images);
    await Promise.all(images.map(img => img.complete ? Promise.resolve() : new Promise(resolve => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      setTimeout(resolve, 1800);
    })));
  }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  const page = await context.newPage();

  for (const [name, route] of shots) {
    await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForPage(page);
    await page.screenshot({ path: path.join('docs', 'screenshots', `${name}.png`), fullPage: false });
    console.log(`captured ${name}`);
  }

  await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
  await waitForPage(page);
  await page.keyboard.press('Control+K');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join('docs', 'screenshots', 'command-palette.png'), fullPage: false });
  console.log('captured command-palette');

  await page.goto(`${base}/dashboard`, { waitUntil: 'domcontentloaded' });
  await waitForPage(page);
  const recent = page.locator('text=最近浏览').first();
  if (await recent.count()) {
    await recent.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join('docs', 'screenshots', 'recent-history.png'), fullPage: false });
  console.log('captured recent-history');

  await page.goto(`${base}/about`, { waitUntil: 'domcontentloaded' });
  await waitForPage(page);
  const dataText = page.locator('text=数据').first();
  if (await dataText.count()) {
    await dataText.scrollIntoViewIfNeeded();
  }
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join('docs', 'screenshots', 'data-management.png'), fullPage: false });
  console.log('captured data-management');

  await browser.close();
})();
