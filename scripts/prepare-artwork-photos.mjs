/**
 * Straightens, crops and colour-corrects John's artwork photos.
 *
 * Input:  photo-originals/<file>   (unchanged phone photos, kept for re-processing)
 * Output: src/assets/artwork/<slug>.jpg
 *
 * Modes per photo:
 *   auto  – drawing taped inside a blue painter's-tape mat: the paper is found
 *           automatically and its four corners are flattened (perspective fix)
 *   quad  – the four paper corners given by hand, in % of the photo (TL, TR, BR, BL)
 *   rect  – a plain rectangular crop, in % of the photo (left, top, right, bottom)
 *   print – a clean digital print on white: trimmed with an even white margin
 *
 * Every drawing then gets a white-balance/levels pass so the paper reads as
 * paper rather than orange lamp-light or grey shadow. Nothing in the artwork
 * itself is painted over or retouched.
 *
 * Usage: node scripts/prepare-artwork-photos.mjs [slug ...]
 */
import sharp from 'sharp';

const IN = 'photo-originals';
const OUT = 'src/assets/artwork';
const LONG_EDGE = 2000;

export const PHOTOS = [
  { slug: 'desert-ruins', file: '20260214_054847.jpg', mode: 'auto' },
  { slug: 'desert-thicket', file: '20260214_054906.jpg', mode: 'quad', quad: [[10.2, 27.7], [94.3, 20.8], [83.2, 54.8], [24.6, 60.6]] },
  { slug: 'face-in-the-storm', file: '20260224_030235.jpg', mode: 'quad', quad: [[1, 3.6], [97, 4.6], [96.3, 93], [0.6, 94]] },
  { slug: 'clown', file: '20260224_232110.jpg', mode: 'quad', quad: [[14.2, 17.2], [85.4, 16.8], [86.4, 87.6], [9.8, 87.6]] },
  { slug: 'hillside-church', file: '20260224_232240.jpg', mode: 'auto' },
  { slug: 'river-of-faces', file: '20260224_232533.jpg', mode: 'auto' },
  { slug: 'gathering', file: '20260224_232552.jpg', mode: 'auto' },
  { slug: 'canyon-wall', file: '20260224_232613.jpg', mode: 'auto' },
  { slug: 'sun-and-the-watchers', file: 'IMG_0316.jpg', mode: 'auto' },
  { slug: 'faces-in-the-wood', file: 'IMG_0379.jpg', mode: 'auto' },
  { slug: 'mountain-sketch', file: 'IMG_0458.jpg', mode: 'rect', rect: [10, 14, 94, 80] },
  { slug: 'city-portrait', file: 'IMG_0607.jpg', mode: 'rect', rect: [9, 2.5, 99, 99] },
  { slug: 'bearded-portrait', file: 'IMG_0646.jpg', mode: 'rect', rect: [10.5, 0.5, 85.5, 97.5] },
  { slug: 'portrait-in-collar', file: 'IMG_0668.jpg', mode: 'rect', rect: [22, 3, 89, 82.5] },
  { slug: 'two-portraits', file: 'IMG_20260720_070808723_HDR.jpg', mode: 'rect', rect: [0, 16.5, 100, 93] },
  { slug: 'print-extreme-pain', file: 'IMG_0640.jpg', mode: 'print' },
  { slug: 'print-further-than-i-intended', file: 'IMG_0641.jpg', mode: 'print' },
  { slug: 'print-bird-overhead', file: 'IMG_0642.jpg', mode: 'print' },
];

/** Find the light paper inside a blue tape mat; returns corners in source pixels. */
async function detectPaper(path) {
  const S = 480;
  const { data, info } = await sharp(path).resize(S, S, { fit: 'inside' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Blue tape (including its shadows), grown by a few pixels to close gaps.
  const blue = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    blue[i] = b - Math.max(r, g) > 4 || (b > r + 8 && r + g + b < 240) ? 1 : 0;
  }
  const R = 3;
  const notBlue = new Uint8Array(w * h).fill(1);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!blue[y * w + x]) continue;
      for (let dy = -R; dy <= R; dy++) {
        for (let dx = -R; dx <= R; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h) notBlue[yy * w + xx] = 0;
        }
      }
    }
  }
  // Flood fill from the centre across non-blue pixels.
  const seen = new Uint8Array(w * h);
  const stack = [((h / 2) | 0) * w + ((w / 2) | 0)];
  const pts = [];
  while (stack.length) {
    const p = stack.pop();
    if (seen[p] || !notBlue[p]) continue;
    seen[p] = 1;
    const x = p % w, y = (p / w) | 0;
    pts.push([x, y]);
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }
  const by = (f) => pts.reduce((a, b) => (f(b) > f(a) ? b : a));
  const tl = by(([x, y]) => -(x + y));
  const tr = by(([x, y]) => x - y);
  const br = by(([x, y]) => x + y);
  const bl = by(([x, y]) => y - x);
  const meta = await sharp(path).metadata();
  const k = meta.width / w;
  return { corners: [tl, tr, br, bl].map(([x, y]) => [(x + 0.5) * k, (y + 0.5) * k]), coverage: pts.length / (w * h) };
}

/** Move each corner toward the quad's centre by `frac` (trims the paper edge / tape shadow). */
function inset(q, frac) {
  const cx = q.reduce((s, p) => s + p[0], 0) / 4, cy = q.reduce((s, p) => s + p[1], 0) / 4;
  return q.map(([x, y]) => [x + (cx - x) * frac, y + (cy - y) * frac]);
}

/** Homography mapping the unit square (u,v in 0..1) to quad corners TL,TR,BR,BL. */
function squareToQuad([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]) {
  const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  const den = dx1 * dy2 - dx2 * dy1;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const hh = (dx1 * dy3 - dx3 * dy1) / den;
  const a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0;
  const d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
  return (u, v) => {
    const z = g * u + hh * v + 1;
    return [(a * u + b * v + c) / z, (d * u + e * v + f) / z];
  };
}

const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);

async function warp(path, quad) {
  const { data, info } = await sharp(path).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W0 = (dist(quad[0], quad[1]) + dist(quad[3], quad[2])) / 2;
  const H0 = (dist(quad[0], quad[3]) + dist(quad[1], quad[2])) / 2;
  const scale = Math.min(1.25, LONG_EDGE / Math.max(W0, H0));
  const W = Math.round(W0 * scale), H = Math.round(H0 * scale);
  const map = squareToQuad(quad);
  const out = Buffer.alloc(W * H * 3);
  const sw = info.width, sh = info.height;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let [sx, sy] = map((x + 0.5) / W, (y + 0.5) / H);
      sx = Math.min(sw - 1.001, Math.max(0, sx - 0.5));
      sy = Math.min(sh - 1.001, Math.max(0, sy - 0.5));
      const x0 = sx | 0, y0 = sy | 0, fx = sx - x0, fy = sy - y0;
      const i00 = (y0 * sw + x0) * 3, i10 = i00 + 3, i01 = i00 + sw * 3, i11 = i01 + 3;
      for (let c = 0; c < 3; c++) {
        const top = data[i00 + c] * (1 - fx) + data[i10 + c] * fx;
        const bot = data[i01 + c] * (1 - fx) + data[i11 + c] * fx;
        out[(y * W + x) * 3 + c] = Math.round(top * (1 - fy) + bot * fy);
      }
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } });
}

/** Per-channel levels: paper → warm white, darkest ink → near black. */
async function balance(img) {
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const lo = [], hi = [];
  for (let c = 0; c < 3; c++) {
    const ch = new Uint8Array(n);
    for (let i = 0; i < n; i++) ch[i] = data[i * 3 + c];
    ch.sort();
    lo.push(ch[Math.floor(n * 0.004)]);
    hi.push(ch[Math.floor(n * 0.93)]);
  }
  const target = [247, 244, 237];
  const ink = [22, 22, 28];
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < 3; c++) {
      const t = (data[i * 3 + c] - lo[c]) / Math.max(1, hi[c] - lo[c]);
      out[i * 3 + c] = Math.max(0, Math.min(255, Math.round(ink[c] + Math.pow(Math.max(0, t), 0.95) * (target[c] - ink[c]))));
    }
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } });
}

async function processPhoto(p) {
  const path = `${IN}/${p.file}`;
  const meta = await sharp(path).metadata();
  const pct = ([x, y]) => [(x / 100) * meta.width, (y / 100) * meta.height];
  let img;
  if (p.mode === 'print') {
    const trimmed = await sharp(path).trim({ background: '#ffffff', threshold: 25 }).toBuffer({ resolveWithObject: true });
    const pad = Math.round(Math.max(trimmed.info.width, trimmed.info.height) * 0.05);
    img = sharp(trimmed.data).extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' });
  } else {
    let quad;
    if (p.mode === 'auto') {
      const { corners, coverage } = await detectPaper(path);
      if (coverage < 0.12) throw new Error(`${p.file}: paper detection failed (coverage ${coverage.toFixed(2)})`);
      quad = inset(corners, -0.004);
    } else if (p.mode === 'quad') {
      quad = p.quad.map(pct);
    } else {
      const [l, t, r, b] = p.rect;
      quad = [pct([l, t]), pct([r, t]), pct([r, b]), pct([l, b])];
    }
    // Soften leftover colour cast from lamp light while keeping coloured accents.
    img = (await balance(await warp(path, quad))).modulate({ saturation: p.saturation ?? 0.8 });
  }
  const file = `${OUT}/${p.slug}.jpg`;
  const info = await img
    .resize(LONG_EDGE, LONG_EDGE, { fit: 'inside', withoutEnlargement: true })
    .sharpen({ sigma: 0.7 })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(file);
  console.log(`${file.padEnd(52)} ${info.width}x${info.height}`);
}

export { detectPaper };

const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!process.argv.includes('--no-run')) {
  for (const p of PHOTOS) if (!only.length || only.includes(p.slug)) await processPhoto(p);
}
