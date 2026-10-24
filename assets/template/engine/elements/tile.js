// tile: an image (photo, map, chart, a whole screen) as a framed window.
// { type:'tile', src:'brand/photo.jpg' | screen:'insights', w, h?, x, y, r, z,
//   radius (stage units), pos:'center 30%', fit:'cover'|'contain', fade:true, shadow:false }
import { byPlatform } from '../../scripts/lib/config.js';
import { el, esc } from '../core/boot.js';
import { place } from '../layout/stage.js';
import { missingHtml } from './device.js';
import { platformOf } from './resolve.js';
import { at } from '../core/root.js';

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
  node.innerHTML = s && s.missing
    ? missingHtml(s)
    : `<img src="${esc(url)}" alt="" style="object-fit:${e.fit || 'cover'};object-position:${e.pos || 'center'}">`;
  place(node, e, ctx.fr, e.w, h);
  ctx.cv.el.appendChild(node);
  return node;
}
