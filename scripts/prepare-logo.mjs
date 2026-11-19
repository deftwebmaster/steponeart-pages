/**
 * Prepares the supplied Step One Art logo for the website.
 *
 * Input:  src/assets/brand/source/step-one-art-logo-original.jpg (supplied file, white background)
 * Output: src/assets/brand/step-one-art-logo.png  — trimmed, white made transparent
 *         src/assets/brand/mark-mountains.png     — the logo's mountain drawing, used as the header mark
 *
 * The artwork and lettering are not altered: the white paper becomes
 * transparency so the logo can sit on the cream mat in the hero frame.
 *
 * Usage: node scripts/prepare-logo.mjs
 */
import sharp from 'sharp';

const input = 'src/assets/brand/source/step-one-art-logo-original.jpg';
const output = 'src/assets/brand/step-one-art-logo.png';
const ink = 20;

const trimmed = await sharp(input).trim({ background: '#ffffff', threshold: 30 }).extend({
  top: 12, bottom: 12, left: 12, right: 12, background: '#ffffff',
}).toBuffer();

const { data, info } = await sharp(trimmed).greyscale().raw().toBuffer({ resolveWithObject: true });
const paper = 252;
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < data.length; i++) {
  let a = (paper - data[i]) / (paper - ink);
  a = Math.min(1, Math.max(0, a));
  rgba[i * 4] = rgba[i * 4 + 1] = rgba[i * 4 + 2] = ink;
  rgba[i * 4 + 3] = Math.round(a * 255);
}
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(output);
console.log(`wrote ${output} (${info.width}x${info.height})`);

// The link-preview image is the supplied share card (src/assets/brand/og-share-card.jpg).

// Header mark: the mountain drawing from the centre of the logo, with the
// curved lettering that overlaps its top corners masked out.
{
  const meta = await sharp(output).metadata();
  const r = { left: Math.round(meta.width * 0.18), top: Math.round(meta.height * 0.375), width: Math.round(meta.width * 0.64), height: Math.round(meta.height * 0.29) };
  const sx = r.width / 988, sy = r.height / 429; // mask drawn on a 988×429 reference crop
  const pts = (list) => list.map(([x, y]) => `${(x * sx).toFixed(1)},${(y * sy).toFixed(1)}`).join(' ');
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}" height="${r.height}">
    <rect width="100%" height="100%" fill="#fff"/>
    <polygon points="${pts([[0, 0], [285, 0], [285, 22], [248, 48], [0, 168]])}" fill="#000"/>
    <polygon points="${pts([[722, 0], [988, 0], [988, 178], [760, 48], [722, 22]])}" fill="#000"/>
  </svg>`);
  const cropped = await sharp(output).extract(r).png().toBuffer();
  const alphaMask = await sharp(mask).greyscale().raw().toBuffer();
  const { data, info } = await sharp(cropped).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < info.width * info.height; i++) if (alphaMask[i] < 128) data[i * 4 + 3] = 0;
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim()
    .png({ compressionLevel: 9 })
    .toFile('src/assets/brand/mark-mountains.png');
  console.log('wrote src/assets/brand/mark-mountains.png');
}
