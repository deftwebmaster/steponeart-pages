/**
 * Post-build checks on dist/. Fails the build if:
 *  - a draft (published: false) slug, title, sentinel text or image leaked
 *  - an expected page is missing
 *  - a page lacks a title, description or canonical URL
 *  - an internal link points at a page that was not built
 */
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const CONTENT = 'src/content/artwork';
const errors = [];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

// Minimal front-matter reader for the fields we need.
function field(src, name) {
  const m = src.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'));
  return m ? m[1].trim().replace(/^['"]|['"]$/g, '') : undefined;
}

const files = await walk(DIST);
const textFiles = files.filter((f) => /\.(html|xml|txt|json|js|css|webmanifest)$/.test(f));
const texts = new Map(await Promise.all(textFiles.map(async (f) => [f, await readFile(f, 'utf8')])));
const assetNames = files.map((f) => relative(DIST, f));

const published = [];
for (const name of (await readdir(CONTENT)).filter((f) => f.endsWith('.md'))) {
  const src = await readFile(join(CONTENT, name), 'utf8');
  // URL slug is the filename (Pages CMS creates it from the title).
  const slug = name.replace(/\.md$/, '');
  const isDraft = field(src, 'published') === 'false';
  if (!isDraft) {
    published.push(slug);
    continue;
  }
  const title = field(src, 'title');
  const imageBase = (field(src, 'image') ?? '').split('/').pop()?.replace(/\.[a-z]+$/i, '');
  if (existsSync(join(DIST, 'artwork', slug))) errors.push(`Draft page was built: /artwork/${slug}/`);
  for (const [file, text] of texts) {
    if (text.includes(`/artwork/${slug}/`)) errors.push(`Draft URL /artwork/${slug}/ appears in ${file}`);
    if (title && text.includes(title)) errors.push(`Draft title "${title}" appears in ${file}`);
    if (text.includes('DRAFT-SENTINEL-TEXT')) errors.push(`Draft body text appears in ${file}`);
  }
  if (imageBase && assetNames.some((a) => a.includes(imageBase))) errors.push(`Draft image ${imageBase} was copied into dist/`);
}

// GitHub Pages (Jekyll) silently drops any file or folder starting with "_".
for (const f of files) {
  if (relative(DIST, f).split('/').some((part) => part.startsWith('_'))) errors.push(`Name starts with "_" (GitHub Pages would drop it): ${relative(DIST, f)}`);
}

const expected = ['index.html', 'artwork/index.html', 'our-purpose/index.html', 'donate-art/index.html', '404.html', 'sitemap.xml', 'robots.txt'];
for (const slug of published) expected.push(`artwork/${slug}/index.html`);
for (const p of expected) if (!existsSync(join(DIST, p))) errors.push(`Missing page: ${p}`);

for (const [file, html] of texts) {
  if (!file.endsWith('.html')) continue;
  if (!/<title>[^<]+<\/title>/.test(html)) errors.push(`${file}: missing <title>`);
  if (!/<meta name="description" content="[^"]+"/.test(html)) errors.push(`${file}: missing meta description`);
  if (!/<link rel="canonical" href="https:\/\/steponeart24\.com\//.test(html)) errors.push(`${file}: missing canonical`);
  for (const [, href] of html.matchAll(/href="(\/[^"#?]*)/g)) {
    const target = href.endsWith('/') ? join(DIST, href, 'index.html') : join(DIST, href);
    if (!existsSync(target)) errors.push(`${file}: broken internal link ${href}`);
  }
}

if (errors.length) {
  console.error(`\n✗ verify-dist found ${errors.length} problem(s):\n- ${[...new Set(errors)].join('\n- ')}\n`);
  process.exit(1);
}
console.log(`✓ verify-dist: ${published.length} published artworks, drafts excluded, ${texts.size} text files checked.`);
