import { defineConfig } from 'vitest/config';

// `base` is relative so the static build works from any host subpath (e.g. GitHub Pages project sites).
import { execSync } from 'node:child_process';

function buildId(): string {
  try {
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 2000,
  },
  server: { host: true },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
