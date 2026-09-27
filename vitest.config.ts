import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    // legacy/ holds the frozen Vite SPA (roadmap Issue 002); its tests run
    // under their own toolchain and must never be collected here.
    exclude: ['**/node_modules/**', '**/dist/**', 'legacy/**'],
    // Globals: true gives RTL automatic afterEach cleanup (it hooks via
    // global `afterEach`). Without this, multiple `render()` calls in the
    // same test file leak DOM into each other.
    globals: true,
    // Default to node for the source-text + schema tests (fast, no DOM).
    // RTL render tests opt in to jsdom via a `// @vitest-environment jsdom`
    // pragma at the top of the file (see button.test.tsx, ErrorBoundary.test.tsx).
    // NOTE: vitest 4 removed `environmentMatchGlobs` — the per-file pragma is
    // now the only supported way to switch environment per test file.
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
  },
});
