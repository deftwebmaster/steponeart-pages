import { defineCollection, type SchemaContext } from 'astro:content';
import { glob, type Loader } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Artwork content model. One Markdown file per artwork in src/content/artwork/.
 * The same fields are configured for editors in .pages.yml — keep them in sync.
 */

export const AVAILABILITY = ['Available', 'Reserved', 'Sold'] as const;
export const SOURCES = ['john', 'donated'] as const;
export const CATEGORIES = [
  'Paintings',
  'Photography',
  'Drawings',
  'Prints',
  'Mixed media',
  'Sculpture',
  'Other',
] as const;

const PHOTO_FORMAT = /\.(jpe?g|png|webp)$/i;
const PHOTO_MESSAGE =
  'Photos must be JPG, PNG or WebP. iPhone HEIC photos are not supported — export or convert the photo to JPG and upload it again.';

const artworkSchema = ({ image }: SchemaContext) => {
  // Check the file type first so an unsupported upload (e.g. HEIC) fails
  // with a clear message instead of a confusing image-processing error.
  // (image() accepts the path string at runtime; its declared input type is the resolved object.)
  const photo = () =>
    z
      .string()
      .trim()
      .regex(PHOTO_FORMAT, PHOTO_MESSAGE)
      .pipe(image() as unknown as z.ZodType<ImageMetadata, string>);
  return z.object({
    title: z.string().trim().min(1),
    // URL slug comes from the Markdown filename (set by Pages CMS from the
    // title when creating). A leftover frontmatter `slug` is ignored.
    artist: z.string().trim().min(1),
    source: z.enum(SOURCES),
    category: z.enum(CATEGORIES),
    // Empty price shows "Price on request".
    price: z.preprocess((v) => (v === '' || v === null ? undefined : v), z.coerce.number().nonnegative().optional()),
    medium: z.string().trim().nullish().transform((v) => v ?? ''),
    dimensions: z.string().trim().nullish().transform((v) => v ?? ''),
    framing: z.string().trim().nullish().transform((v) => v ?? ''),
    summary: z.string().trim().min(1),
    image: photo(),
    imageAlt: z.string().trim().min(1, 'Every cover image needs a short description (alt text).'),
    gallery: z
      .array(
        z.object({
          image: photo(),
          alt: z.string().trim().min(1, 'Every additional photo needs alt text.'),
        }),
      )
      .nullish()
      .transform((v) => v ?? []),
    availability: z.enum(AVAILABILITY).default('Available'),
    featured: z.boolean().default(false),
    published: z.boolean().default(true),
    dateAdded: z.coerce.date(),
  });
};

/**
 * Wraps the glob loader so entries with `published: false` never enter the
 * content store. That keeps drafts — and their images — out of every page,
 * the built asset folder, the sitemap and anything else generated from
 * content, rather than relying on each page remembering to filter them.
 */
function publishedOnly(inner: Loader): Loader {
  return {
    name: 'published-only',
    load: async (context) => {
      const store = new Proxy(context.store, {
        get(target, prop, receiver) {
          if (prop === 'set') {
            return (entry: Parameters<typeof target.set>[0]) => {
              if ((entry.data as { published?: boolean })?.published === false) {
                target.delete(entry.id);
                return false;
              }
              return target.set(entry);
            };
          }
          const value = Reflect.get(target, prop, receiver);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      return inner.load({ ...context, store });
    },
  };
}

const artwork = defineCollection({
  loader: publishedOnly(
    glob({
      pattern: '**/*.md',
      base: './src/content/artwork',
      // Filename (without .md) is the URL slug and collection id. Pages CMS
      // sets it from the title when creating an entry.
      generateId: ({ entry }) => entry.replace(/\.md$/, ''),
    }),
  ),
  schema: artworkSchema,
});

export const collections = { artwork };
