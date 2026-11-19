import type { APIRoute } from 'astro';
import { artworkPath, getArtworks } from '../lib/artwork';
import { SITE_URL } from '../lib/settings';

/** Sitemap built only from published content (drafts never reach getArtworks). */
export const GET: APIRoute = async () => {
  const artworks = await getArtworks();
  const latest = artworks.reduce((d, a) => (a.data.dateAdded > d ? a.data.dateAdded : d), new Date(0));
  const day = (d: Date) => d.toISOString().slice(0, 10);

  const urls = [
    { loc: '/', lastmod: artworks.length ? day(latest) : undefined },
    { loc: '/artwork/', lastmod: artworks.length ? day(latest) : undefined },
    { loc: '/our-purpose/' },
    { loc: '/donate-art/' },
    ...artworks.map((a) => ({ loc: artworkPath(a), lastmod: day(a.data.dateAdded) })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map((u) => `  <url><loc>${new URL(u.loc, SITE_URL).href}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
  .join('\n')}
</urlset>
`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
