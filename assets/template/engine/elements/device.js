// device: a screen in a CSS frame (engine/devices/<device>.css). w = SCREEN width in stage units;
// the frame grows around it (the browser window grows by its bar). The aspect comes from the capture.
//   { type:'phone', screen:'home', w:720, x:660, y:40, r:0, z:20, island?, camera? }
//   { type:'device', device:'laptop'|'monitor'|'browser'|'ipad'|'iphone'|'pixel', screen, w, x, y, ... }
//   { type:'browser', screen:'journal', url:'brimpage.example/journal', title:'Journal', theme:'dark', style:'compact' }
//   { type:'laptop', screen:'dashboard', url:'brimpage.example', finish:'graphite' }   url adds a browser bar
//   { type:'phone', device:'iphone', screen:'journal', url:'brimpage.example' }       url adds the mobile browser UI
// favicon: the brand icon only on the brand's own site (no url, or a url on brand.domain); false = none,
// 'path/to/icon.png' = that image (a third-party site keeps its own look).
import { PLATFORMS, DEVICES } from '../../scripts/lib/stores.js';
import { el, esc } from '../core/boot.js';
import { place } from '../layout/stage.js';
import { FRAMES } from './frames.js';
import { barHtml, mobileUi, splitUrl } from './browserbar.js';
import { deviceOf, ownsDevice, platformOf } from './resolve.js';

export function missingHtml(s, label = 'missing screen') {
  return `<div class="missing">${esc(label)}<br>"${esc(s.name)}"<br>raw/${esc(s.platform)}/</div>`;
}

const OPTS = ['island', 'camera', 'theme', 'style', 'finish', 'url', 'title', 'favicon', 'tabs', 'shadow'];

function ownSite(url, domain) {
  if (!url) return true;
  if (!domain) return false;
  const host = splitUrl(url).host.toLowerCase().replace(/:\d+$/, '').replace(/^www\./, '');
  const d = String(domain).toLowerCase().replace(/^www\./, '');
  return host === d || host.endsWith(`.${d}`);
}

function options(e, name, ctx) {
  const o = { ...((ctx.brand.devices || {})[name] || {}) };
  for (const k of OPTS) if (e[k] !== undefined) o[k] = e[k];
  if (o.favicon === undefined) o.favicon = ownSite(o.url, ctx.brand.domain) ? ctx.icon || null : null;
  return o;
}

function inner(name, o, img) {
  if (name === 'browser') return `<div class="window"></div>${barHtml(o)}<div class="view">${img}</div>`;
  const frame = FRAMES[name](o);
  if (!o.url) return `${frame.under}<div class="screen">${img}</div>${frame.over}`;
  if (DEVICES[name] && (DEVICES[name].phone || name === 'ipad')) {
    const fam = name === 'ipad' ? 'ipad' : DEVICES[name].platforms[0] === 'android' ? 'android' : 'ios';
    const ui = mobileUi({ ...o, family: fam });
    return `${frame.under}<div class="screen site mobile ${fam}">${ui.top}<div class="view">${img}</div>${ui.bottom}</div>${frame.over}`;
  }
  return `${frame.under}<div class="screen site">${barHtml(o)}<div class="view">${img}</div></div>${frame.over}`;
}

export function device(e, ctx) {
  const s = ctx.screen(e.screen, platformOf(e, ctx));
  let name = deviceOf(e, ctx);
  // a capture borrowed from the other platform keeps the frame it was made for (phones only)
  if (!ownsDevice(e, ctx) && s.fallback && DEVICES[name] && DEVICES[name].phone) name = PLATFORMS[s.platform].device;
  if (!FRAMES[name] && name !== 'browser') {
    console.warn(`unknown device "${name}" (known: ${Object.keys(DEVICES).join(', ')}): drawn as an iPhone`);
    name = 'iphone';
  }
  const o = options(e, name, ctx);
  const cls = ['device', name];
  if (o.theme === 'dark') cls.push('dark');
  if (o.style === 'compact') cls.push('compact');
  if (o.finish) cls.push(`finish-${o.finish}`);
  if (o.shadow === false) cls.push('flat');
  const node = el('div', cls.join(' '));
  node.dataset.what = `${name} "${e.screen}"`;
  if (!s.missing) Object.assign(node.dataset, { src: s.url, ui: '1' });
  node.style.setProperty('--pw', `${e.w * ctx.fr.f}px`);
  node.style.setProperty('--ar', String(s.w / s.h));
  const img = s.missing ? missingHtml(s) : `<img src="${s.url}" alt="">`;
  node.innerHTML = inner(name, o, img);
  place(node, e, ctx.fr, e.w);
  ctx.cv.el.appendChild(node);
  return node;
}
