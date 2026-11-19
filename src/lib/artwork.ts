import { getCollection, type CollectionEntry } from 'astro:content';
import { CATEGORIES } from '../content.config';
import { contactEmail, settings, SITE_URL } from './settings';

export type Artwork = CollectionEntry<'artwork'>;
export type Availability = Artwork['data']['availability'];

let cache: Artwork[] | undefined;

/** Web address segment for an artwork — the Markdown filename without `.md`. */
export const artworkSlug = (a: Artwork) => a.id;

/**
 * Every published artwork, newest first. Drafts never reach this list: the
 * loader in src/content.config.ts drops them, and they are filtered again
 * here as a second safeguard. Fails the build if two files would share a URL.
 */
export async function getArtworks(): Promise<Artwork[]> {
  if (cache) return cache;
  const entries = (await getCollection('artwork')).filter((a) => a.data.published !== false);

  const bySlug = new Map<string, Artwork>();
  for (const entry of entries) {
    const slug = artworkSlug(entry);
    const existing = bySlug.get(slug);
    if (existing) {
      throw new Error(
        `Duplicate artwork slug "${slug}" in ${existing.filePath} and ${entry.filePath}. ` +
          'Each artwork needs its own filename (web address). Rename one file and save again.',
      );
    }
    bySlug.set(slug, entry);
  }

  cache = entries.sort(
    (a, b) => b.data.dateAdded.getTime() - a.data.dateAdded.getTime() || a.data.title.localeCompare(b.data.title),
  );
  return cache;
}

export async function getFeaturedArtworks(limit = 6): Promise<Artwork[]> {
  const all = await getArtworks();
  const featured = all.filter((a) => a.data.featured);
  // Fall back to the newest available works if nothing is marked featured.
  const list = featured.length ? featured : all.filter((a) => a.data.availability === 'Available');
  return list.slice(0, limit);
}

/** Up to `limit` other available works, same category first. */
export async function getRelatedArtworks(current: Artwork, limit = 3): Promise<Artwork[]> {
  const others = (await getArtworks()).filter(
    (a) => artworkSlug(a) !== artworkSlug(current) && a.data.availability === 'Available',
  );
  const same = others.filter((a) => a.data.category === current.data.category);
  const rest = others.filter((a) => a.data.category !== current.data.category);
  return [...same, ...rest].slice(0, limit);
}

/** Categories that actually have published work, in the order set in the content model. */
export function categoriesOf(list: Artwork[]): { label: string; value: string }[] {
  const seen = new Set<string>(list.map((a) => a.data.category));
  return CATEGORIES.filter((c) => seen.has(c)).map((label) => ({ label, value: categoryValue(label) }));
}

export const categoryValue = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const artworkPath = (a: Artwork) => `/artwork/${artworkSlug(a)}/`;
export const artworkUrl = (a: Artwork) => new URL(artworkPath(a), SITE_URL).href;

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 0 });
export function formatPrice(price: number | undefined): string {
  if (price === undefined) return 'Price on request';
  return usd.format(price).replace(/\.00$/, '');
}

export const sourceLabel = (source: Artwork['data']['source']) =>
  source === 'john' ? 'Original work by John Hyder' : 'Donated artwork';

/** mailto: link for a purchase inquiry, or null if no contact email is configured. */
export function inquiryHref(a: Artwork): string | null {
  if (!contactEmail) return null;
  const subject = `Purchase inquiry: ${a.data.title}`;
  const body = [
    'Hello,',
    '',
    `I'm interested in "${a.data.title}" by ${a.data.artist}${a.data.price === undefined ? '' : ` (${formatPrice(a.data.price)})`}.`,
    artworkUrl(a),
    '',
    'Is it still available, and how would pickup or delivery work?',
    '',
    'Thank you,',
  ].join('\n');
  return mailto(subject, body);
}

export function mailto(subject: string, body: string): string | null {
  if (!contactEmail) return null;
  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export { settings };
