// @ts-check
import { defineConfig } from 'astro/config';

/**
 * "_slug_@_@astro.css" → "slug": no leading "_" and only URL-friendly characters.
 * @param {string | undefined} raw
 * @param {string} fallback
 */
const safeName = (raw, fallback) =>
  (raw ?? '')
    .replace(/\.[^.]+$/, '')
    .replace(/@_@astro$/, '')
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || fallback;

export default defineConfig({
  site: 'https://steponeart24.com',
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Not "_astro": GitHub Pages (Jekyll) silently drops folders starting with "_".
    assets: 'assets',
  },
  image: {
    // Artwork photos are resized at build time; nothing is fetched remotely.
    responsiveStyles: false,
  },
  vite: {
    build: {
      rollupOptions: {
        output: {
          // GitHub Pages (Jekyll) also drops FILES whose names start with "_",
          // e.g. the CSS chunk Astro names after src/pages/artwork/[slug].astro
          // ("_slug_"). Strip leading underscores from every emitted asset name.
          assetFileNames: (info) => `assets/${safeName(info.names?.[0], 'asset')}.[hash][extname]`,
          chunkFileNames: (info) => `assets/${safeName(info.name, 'chunk')}.[hash].js`,
        },
      },
    },
  },
  prefetch: false,
  devToolbar: { enabled: false },
});
