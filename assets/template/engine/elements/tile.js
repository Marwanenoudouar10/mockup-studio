// tile: an image (photo, map, chart, a whole screen) as a framed window.
// { type:'tile', src:'brand/photo.jpg' | screen:'insights', w, h?, x, y, r, z,
//   radius (stage units), pos:'center 30%', fit:'cover'|'contain', fade:true, shadow:false,
//   from:'title' | cropTop: 186 }
// A screen window should start below the status bar (a frameless tile that shows 9:41 and a battery reads as
// a phone with its bezel missing): from: '<box name>' starts the window at that box's top (data-box on the
// navbar or the first card), cropTop: N at N capture pixels (both may vary per platform: { ios, android }).
// The engine works out object-position from the tile's size, so it stays right when w or h changes.
// A src that does not load is an issue and draws the magenta placeholder (core/checks.js).
import { byPlatform } from '../../scripts/lib/config.js';
import { el, esc } from '../core/boot.js';
import { issue } from '../core/issues.js';
import { place } from '../layout/stage.js';
import { missingHtml } from './device.js';
import { platformOf } from './resolve.js';
import { at } from '../core/root.js';

// capture pixels from the top of the screen where the window should start, or null
function cropTopOf(e, s) {
  const from = byPlatform(e.from, s.platform);
  if (from) {
    const b = s.boxes && s.boxes[from];
    if (b) return Array.isArray(b) ? b[1] : b.y;
    issue(`tile "${e.screen}": from: box "${from}" not found in ${s.name}.boxes.json (${s.platform})`);
    return null;
  }
  const top = byPlatform(e.cropTop, s.platform);
  return Number.isFinite(Number(top)) && top !== null && top !== undefined ? Number(top) : null;
}

// object-position that puts capture row `top` at the tile's top edge (object-fit: cover)
function positionFor(e, s, top, w, h) {
  const z = Math.max(w / s.w, h / s.h);
  const over = s.h * z - h;
  if (over < 0.5) {
    issue(`tile "${e.screen}": the tile shows the whole screen height, so from/cropTop cannot move it (make it shorter: lower h)`);
    return null;
  }
  const pct = Math.max(0, Math.min(100, ((top * z) / over) * 100));
  if ((top * z) / over > 1.001) issue(`tile "${e.screen}": cropTop ${top} is too low for this tile; it starts at the bottom of the screen`);
  return `center ${pct.toFixed(2)}%`;
}

export function tile(e, ctx) {
  const s = e.screen ? ctx.screen(e.screen, platformOf(e, ctx)) : null;
  const url = s ? s.url : at(e.src || '');
  const h = e.h ?? (s ? (e.w * s.h) / s.w : e.w);
  const cls = ['tile'];
  if (e.fade) cls.push('fade');
  if (e.shadow === false) cls.push('flat');
  const node = el('div', cls.join(' '));
  node.dataset.what = `tile "${e.screen || e.src}"`;
  if (s && !s.missing) Object.assign(node.dataset, { src: s.url, ui: '1' }); // a screen (not a photo) shows the app
  node.style.borderRadius = `${(byPlatform(e.radius, s ? s.platform : ctx.platform) ?? 0) * ctx.fr.f}px`;
  if (e.bg) node.style.background = e.bg;
  let pos = e.pos || 'center';
  const top = s && !s.missing && (e.fit || 'cover') === 'cover' ? cropTopOf(e, s) : null;
  if (top !== null) pos = positionFor(e, s, top, e.w, h) || pos;
  node.innerHTML = s && s.missing
    ? missingHtml(s)
    : `<img src="${esc(url)}" alt="" style="object-fit:${e.fit || 'cover'};object-position:${pos}">`;
  place(node, e, ctx.fr, e.w, h);
  ctx.cv.el.appendChild(node);
  return node;
}
