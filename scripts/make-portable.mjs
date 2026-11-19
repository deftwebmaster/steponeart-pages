/**
 * Makes a copy of dist/ whose internal links are all RELATIVE, so the same
 * files work at any address: a domain root, or a GitHub Pages project
 * sub-path such as https://name.github.io/any-repo-name/.
 *
 * Absolute https://steponeart24.com URLs (canonical, Open Graph, sitemap)
 * are left alone. Also adds .nojekyll (belt and braces for GitHub Pages).
 *
 * With --base=/concept-one/ every root link is instead prefixed with that
 * path (absolute), which also keeps the 404 page's links correct at any depth.
 * Full https://steponeart24.com/... URLs in the HTML (canonical, Open Graph
 * share image, structured data) are moved under the same path too, so link
 * previews of the hosted concept show the share card instead of a broken image.
 *
 * Usage: node scripts/make-portable.mjs [--base=/sub-path/] [outDir]
 *        (default outDir: exports/site-portable)
 */
import { cp, readdir, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { join, relative, sep, dirname } from 'node:path';

const SRC = 'dist';
const args = process.argv.slice(2);
const baseArg = args.find((a) => a.startsWith('--base='));
const BASE = baseArg ? `/${baseArg.slice(7).replace(/^\/+|\/+$/g, '')}/`.replace('//', '/') : null;
const OUT = args.find((a) => !a.startsWith('--')) ?? 'exports/site-portable';
const SITE = 'https://steponeart24.com';

await rm(OUT, { recursive: true, force: true });
await mkdir(dirname(OUT), { recursive: true });
await cp(SRC, OUT, { recursive: true });
await writeFile(join(OUT, '.nojekyll'), '');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}

let changed = 0;
for (const file of await walk(OUT)) {
  const isHtml = file.endsWith('.html');
  const isCss = file.endsWith('.css');
  if (!isHtml && !isCss) continue;

  const depth = relative(OUT, dirname(file)).split(sep).filter(Boolean).length;
  const prefix = BASE ?? (depth === 0 ? './' : '../'.repeat(depth));
  let text = await readFile(file, 'utf8');
  const before = text;

  if (isHtml) {
    // Root-relative page and file links: href="/artwork/" → href="../artwork/"
    text = text.replace(/(href|src)="\/(?!\/)([^"]*)"/g, (_, attr, path) => `${attr}="${prefix}${path}"`);
    if (BASE) text = text.replaceAll(`${SITE}/`, `${SITE}${BASE}`);
  }
  // Remaining asset references (srcset lists, CSS url(), JSON in data attributes).
  // Runs second; already-rewritten paths no longer match.
  text = text.replace(/(["'(,\s]|&quot;)\/assets\//g, (_, lead) => `${lead}${prefix}assets/`);
  if (text !== before) {
    await writeFile(file, text);
    changed++;
  }
}
console.log(`Copy written to ${OUT} (${changed} files rewritten, links ${BASE ? `under ${BASE}` : 'relative'})`);
