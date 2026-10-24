// lift: a slice of a real screen lifted out at reading size, as a floating card.
// { type:'lift', screen:'entry', box:'moodCard' | crop:[x,y,w,h] | crop:{ios:[..], android:[..]},
//   w:620, x, y, r, z, radius?, bleed? }   crop/box/radius are in SCREEN pixels of the capture.
// box names come from <screen>.boxes.json:  { "moodCard": [x,y,w,h] }  or  { "moodCard": {x,y,w,h,r} }
// A pixel crop belongs to ONE capture: crop:{ios:[..]} is never applied to an Android capture (the layouts
// differ), and a crop or box that leaves the capture draws the magenta placeholder plus an issue
// (render log + render-report.json), never a card with blank bands.
import { byPlatform } from '../../scripts/lib/config.js';
import { el } from '../core/boot.js';
import { issue } from '../core/issues.js';
import { place } from '../layout/stage.js';
import { missingHtml } from './device.js';
import { platformOf } from './resolve.js';

const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const label = (e) => `lift "${e.box || 'crop'}" (${e.screen})`;

function rawCrop(e, s) {
  if (e.box) {
    const b = s.boxes && s.boxes[e.box];
    if (!b) return { error: `box "${e.box}" not found in ${s.name}.boxes.json (${s.platform})` };
    return Array.isArray(b) ? { crop: b } : { crop: [b.x, b.y, b.w, b.h], radius: b.r };
  }
  if (e.crop == null) return { crop: [0, 0, s.w, s.h] };
  if (isPlain(e.crop)) {
    const c = e.crop[s.platform] ?? e.crop.default;
    if (!c) return { error: `crop has no "${s.platform}" key (has ${Object.keys(e.crop).join(', ')}): pixel crops never carry over between platforms` };
    return { crop: c };
  }
  return { crop: e.crop };
}

function cropOf(e, s) {
  const r = rawCrop(e, s);
  if (r.error) return r;
  const [x, y, w, h] = (r.crop || []).map(Number);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return { error: `crop [${r.crop}] is not [x, y, w, h]` };
  if (x < -1 || y < -1 || x + w > s.w + 1 || y + h > s.h + 1) {
    return { error: `crop [${x}, ${y}, ${w}, ${h}] leaves the ${s.w}x${s.h} capture ${s.rel || s.url}` };
  }
  return { crop: [x, y, w, h], radius: r.radius };
}

export function lift(e, ctx) {
  const s = ctx.screen(e.screen, platformOf(e, ctx));
  const found = s.missing ? null : cropOf(e, s);
  // a panorama strip: the finding belongs to the image the card sits on
  const slice = ctx.cv.slices > 1 ? { slice: Math.max(0, Math.min(ctx.cv.slices - 1, Math.floor(ctx.fr.X(e.x ?? 660) / ctx.cv.designW))) } : {};
  if (found && found.error) issue(`${label(e)}: ${found.error}`, slice);
  const ok = found && !found.error;
  const crop = ok ? found.crop : [0, 0, s.w, s.h * 0.3];
  const [cx, cy, cw, ch] = crop;
  const zoom = (e.w * ctx.fr.f) / cw;
  const radius = byPlatform(e.radius, s.platform) ?? (ok && found.radius) ?? s.w * 0.033;
  const node = el('div', 'lift');
  node.dataset.what = label(e);
  if (ok) Object.assign(node.dataset, { src: s.url, crop: crop.join(','), ui: '1' });
  if (e.bleed) node.dataset.bleed = '1';
  node.style.borderRadius = `${radius * zoom}px`;
  if (e.bg) node.style.setProperty('--lift-bg', e.bg);
  node.innerHTML = ok
    ? `<img src="${s.url}" alt="" style="width:${s.w * zoom}px;left:${-cx * zoom}px;top:${-cy * zoom}px">`
    : missingHtml({ ...s, name: `${e.screen}${e.box ? ` #${e.box}` : ''}` }, s.missing ? 'missing screen' : 'bad crop');
  place(node, e, ctx.fr, e.w, (ch * e.w) / cw);
  ctx.cv.el.appendChild(node);
  return node;
}
