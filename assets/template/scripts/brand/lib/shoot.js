// Renders for the brand step, on the same session as the store renders (one Chrome, one page, in order):
//   shootBoard   engine/brand/brand.html?view=... -> a board PNG (2x, opaque, 24-bit)
//   shootSample  screens/kit/sample.html (or `page`, e.g. a category sample in screens/) with a token file
//                -> a sample app screen + its boxes, so the boards show the brand on real kit UI before any app
//                screen exists (hide: 'card' drops that box, for a phone beside the lifted card; theme: 'dark')
//   shootAsset   one SVG (logo, mark) on a transparent background -> RGBA PNG for the client's brand kit
//   samplePage   the sample page the boards dress: --sample <page>, else screens/_sample.html when the project
//                has one (the kit's sample in this app's own words), else the kit's habit-app sample
import fs from 'node:fs';
import path from 'node:path';
import { capture } from '../../lib/session.js';
import { flattenPng, rgbaPng } from '../../lib/png.js';
import { PLATFORMS } from '../../lib/stores.js';
import { ROOT } from '../../lib/cli.js';
import { boxesOf } from '../../screens.js';
import { printFile } from '../../render.js';

const write = (rel, buf) => {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return file;
};

export function samplePage(flag) {
  const asked = flag === undefined || flag === true ? null : String(flag);
  if (asked && !fs.existsSync(path.join(ROOT, asked))) throw new Error(`--sample ${asked}: no such page`);
  if (asked) return asked;
  return fs.existsSync(path.join(ROOT, 'screens/_sample.html')) ? 'screens/_sample.html' : undefined;
}

export async function shootBoard(session, cfgRel, view, query, outRel, { dpr = 2 } = {}) {
  const qs = new URLSearchParams({ view, config: cfgRel, ...query }).toString();
  const t0 = Date.now();
  const [b] = await capture(session, `engine/brand/brand.html?${qs}`, { width: 1600, height: 1000, dpr, sizeFrom: '__size' });
  const png = flattenPng(b, '#ffffff');
  printFile(write(outRel, png), png, Date.now() - t0, session.drain());
}

export async function shootSample(session, outRel, { tokens, platform = 'ios', dpr = 2, hide = null, theme = null, page = 'screens/kit/sample.html' } = {}) {
  const [w, h] = PLATFORMS[platform].css;
  const q = new URLSearchParams({ platform, tokens: tokens ? `/${tokens}` : 'none', ...(hide ? { hide } : {}), ...(theme ? { theme } : {}) }).toString();
  const t0 = Date.now();
  const [b] = await capture(session, `${page}?${q}`, { width: w, height: h, dpr, readyMode: 'auto' });
  const png = flattenPng(b);
  const file = write(outRel, png);
  const { boxes, warnings } = await boxesOf(session.page, dpr);
  write(outRel.replace(/\.png$/, '.boxes.json'), `${JSON.stringify(boxes, null, 2)}\n`);
  printFile(file, png, Date.now() - t0, [...session.drain(), ...warnings]);
}

export async function shootAsset(session, cfgRel, src, color, width, outRel) {
  const qs = new URLSearchParams({ view: 'asset', config: cfgRel, src, color, w: String(width) }).toString();
  const t0 = Date.now();
  const [b] = await capture(session, `engine/brand/brand.html?${qs}`, { width, height: width, omitBackground: true, sizeFrom: '__size' });
  const png = rgbaPng(b);
  printFile(write(outRel, png), png, Date.now() - t0, session.drain());
}
