// Image comparison for the repo tests (pngjs from the template's node_modules, no other dependency).
//   compare(a, b) -> { mean, max, over8, blurMean, blurOver8, worstTile, at }   a, b: PNG buffers or file paths
//   mean / max     per-pixel channel difference (0-255); over8 = share of pixels over 8 (percent)
//   blurMean       the same after a 5 x 5 box blur of both images: glyph anti-aliasing and gradient dithering
//                  average out, a shifted or missing part does not
//   worstTile      the worst 48 x 48 tile's mean difference: one missing card is one bad tile, noise is not
// Chrome dithers gradients a little differently on every run, so two renders of the same page are not
// byte-identical: "unchanged" means within that noise (blurMean < 0.15, worstTile < 3).
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { TEMPLATE } from './project.js';

const require = createRequire(`${TEMPLATE}/package.json`);
const { PNG } = require('pngjs');

const read = (x) => PNG.sync.read(Buffer.isBuffer(x) ? x : fs.readFileSync(x));

function blur(img, R = 2) {
  const { width: W, height: H, data } = img;
  // separable box blur: rows, then columns
  const tmp = new Float32Array(W * H * 3);
  const out = new Float32Array(W * H * 3);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        let n = 0;
        for (let d = -R; d <= R; d++) { const xx = x + d; if (xx >= 0 && xx < W) { s += data[(y * W + xx) * 4 + c]; n++; } }
        tmp[(y * W + x) * 3 + c] = s / n;
      }
    }
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      for (let c = 0; c < 3; c++) {
        let s = 0;
        let n = 0;
        for (let d = -R; d <= R; d++) { const yy = y + d; if (yy >= 0 && yy < H) { s += tmp[(yy * W + x) * 3 + c]; n++; } }
        out[(y * W + x) * 3 + c] = s / n;
      }
    }
  }
  return out;
}

export function compare(a, b, { tile = 48 } = {}) {
  const A = read(a);
  const B = read(b);
  if (A.width !== B.width || A.height !== B.height) return { error: `size ${A.width}x${A.height} vs ${B.width}x${B.height}` };
  const W = A.width;
  const H = A.height;
  const n = W * H;
  let sum = 0;
  let max = 0;
  let over8 = 0;
  const px = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(A.data[i * 4 + c] - B.data[i * 4 + c]));
    px[i] = d;
    sum += d;
    if (d > max) max = d;
    if (d > 8) over8++;
  }
  const ba = blur(A);
  const bb = blur(B);
  let bsum = 0;
  let bover = 0;
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs(ba[i * 3 + c] - bb[i * 3 + c]));
    bsum += d;
    if (d > 8) bover++;
  }
  let worst = 0;
  let at = null;
  for (let ty = 0; ty < H; ty += tile) {
    for (let tx = 0; tx < W; tx += tile) {
      let s = 0;
      let k = 0;
      for (let y = ty; y < Math.min(H, ty + tile); y++) for (let x = tx; x < Math.min(W, tx + tile); x++) { s += px[y * W + x]; k++; }
      if (s / k > worst) { worst = s / k; at = [tx, ty]; }
    }
  }
  const r = (v, d = 3) => +v.toFixed(d);
  return { mean: r(sum / n), max, over8: r((100 * over8) / n), blurMean: r(bsum / n), blurOver8: r((100 * bover) / n), worstTile: r(worst, 2), at };
}

// within Chrome's run-to-run noise (gradient dithering)
export const sameish = (d) => !d.error && d.blurMean < 0.15 && d.worstTile < 3;

// a crop of a PNG (to look at a region): -> PNG buffer
export function crop(file, [x, y, w, h]) {
  const A = read(file);
  const out = new PNG({ width: w, height: h });
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const s = ((y + j) * A.width + x + i) * 4;
    const d = (j * w + i) * 4;
    for (let c = 0; c < 4; c++) out.data[d + c] = A.data[s + c];
  }
  return PNG.sync.write(out);
}

export const pngSize = (file) => { const A = read(file); return [A.width, A.height]; };

// edge energy of a region (mean |Laplacian| of the luminance): a soft, upscaled screen scores lower than a sharp one
export function sharpness(file, [x0, y0, w, h]) {
  const A = read(file);
  const lum = (x, y) => { const i = (y * A.width + x) * 4; return 0.299 * A.data[i] + 0.587 * A.data[i + 1] + 0.114 * A.data[i + 2]; };
  let sum = 0;
  let n = 0;
  for (let y = y0 + 1; y < y0 + h - 1; y++) for (let x = x0 + 1; x < x0 + w - 1; x++) {
    sum += Math.abs(4 * lum(x, y) - lum(x - 1, y) - lum(x + 1, y) - lum(x, y - 1) - lum(x, y + 1));
    n++;
  }
  return +(sum / n).toFixed(3);
}
