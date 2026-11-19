import type { APIRoute } from 'astro';
import { settings, SITE_URL } from '../lib/settings';

/**
 * Crawling stays allowed so search engines can see each page's robots meta tag.
 * In demo mode every page carries `noindex`, which keeps sample content out of
 * search results. Turn demo mode off in Site settings before launch.
 */
export const GET: APIRoute = () => {
  const lines = [
    settings.demoMode ? '# Demo mode is ON: every page is marked noindex until it is switched off in Site settings.' : null,
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    '',
  ].filter((l) => l !== null);
  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
