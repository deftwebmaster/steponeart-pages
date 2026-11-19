import { z } from 'astro/zod';
import raw from '../data/settings.json';

/** Site-wide settings, edited in Pages CMS ("Site settings"). */
const settingsSchema = z.object({
  siteName: z.string().trim().min(1).default('Step One Art'),
  siteDescription: z.string().trim().default(''),
  contactEmail: z
    .string()
    .trim()
    .default('')
    .refine((v) => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Contact email does not look like an email address.'),
  heroHeading: z.string().trim().min(1),
  heroText: z.string().trim().default(''),
  missionHeading: z.string().trim().min(1),
  missionText: z.string().trim().default(''),
  socialLinks: z
    .array(z.object({ label: z.string().trim().min(1), url: z.url() }))
    .nullish()
    .transform((v) => v ?? []),
  demoMode: z.boolean().default(false),
  demoNotice: z.string().trim().default(''),
});

export type Settings = z.infer<typeof settingsSchema>;

const parsed = settingsSchema.safeParse(raw);
if (!parsed.success) {
  throw new Error(`src/data/settings.json is invalid:\n${parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`).join('\n')}`);
}

export const settings: Settings = parsed.data;

/** A usable contact address, or null when none is configured. */
export const contactEmail: string | null = settings.contactEmail || null;

export const SITE_URL = 'https://steponeart24.com';
