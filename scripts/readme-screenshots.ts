/**
 * README screenshots (roadmap Issue 044) → docs/assets/*.png.
 *
 * Captures the landing page, a recipe detail, the planner and the tracking
 * progress page from a running production preview, seeded with the same
 * deterministic state as the visual suite (tests/fixtures/planning.ts: frozen
 * clock, fixed plan, diary and goals), so a re-run only changes the images
 * when the UI changed.
 *
 * Usage (from the repo root):
 *   npm run build
 *   npx astro preview --port 4321 --ignore-lock &   # --ignore-lock: stays in the foreground under an AI agent (Astro 7)
 *   npm run docs:screenshots                         # BASE_URL=http://localhost:4321 by default
 *   npx astro preview stop                           # if the preview backgrounded itself
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium, type Page } from '@playwright/test';
import { GOALS, PLAN, TRACKING_HISTORY, seedPlanning } from '../tests/fixtures/planning.ts';

const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:4321').replace(/\/$/, '');
const OUT = fileURLToPath(new URL('../docs/assets/', import.meta.url));

interface Shot {
  file: string;
  path: string;
  storage: Record<string, unknown>;
  /** Interaction before the capture (e.g. switch the progress view to the month). */
  prepare?: (page: Page) => Promise<void>;
}

const SHOTS: Shot[] = [
  { file: 'screenshot-landing.png', path: '/', storage: {} },
  { file: 'screenshot-recipe-detail.png', path: '/recipes/rec_001/', storage: {} },
  { file: 'screenshot-planner.png', path: '/planner/', storage: { currentMealPlan: PLAN } },
  {
    file: 'screenshot-tracking-progress.png',
    path: '/tracking/progress/',
    storage: { trackingEntries: TRACKING_HISTORY, nutritionGoals: GOALS },
    // The seeded history is the two weeks before the frozen "today".
    prepare: (page) => page.getByRole('button', { name: 'Month', exact: true }).click(),
  },
];

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Islands are interactive once Astro drops the `ssr` attribute. Only the
  // ones in the viewport matter (`client:visible` islands below the fold never
  // hydrate in a viewport-only capture).
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('astro-island[ssr]')].every(
        (el) =>
          el.getAttribute('client') === 'visible' &&
          (el.firstElementChild?.getBoundingClientRect().top ?? 0) >= window.innerHeight,
      ),
    null,
    { timeout: 15_000 },
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500); // chart entrance animations
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
try {
  for (const shot of SHOTS) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
      colorScheme: 'light',
      locale: 'en-US',
      timezoneId: 'UTC',
    });
    const page = await context.newPage();
    await seedPlanning(page, shot.storage);
    await page.goto(`${BASE_URL}${shot.path}`);
    await settle(page);
    if (shot.prepare) {
      await shot.prepare(page);
      await settle(page);
    }
    await page.screenshot({ path: join(OUT, shot.file) });
    console.log(`docs/assets/${shot.file} ← ${shot.path}`);
    await context.close();
  }
} finally {
  await browser.close();
}
