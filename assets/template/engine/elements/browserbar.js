// Browser chrome drawn in HTML/CSS (engine/devices/browser.css), so the address bar shows real text.
//   barHtml({ url, title, favicon, style:'tabs'|'compact', tabs:['Second tab'] })   desktop window bar
//     favicon: an image path, or null/false for a neutral dot (device.js passes the brand icon on the brand's site)
//   mobileUi({ url, family:'ios'|'android'|'ipad' })                               status bar + address pill
// Every size is in --u (one CSS px of a 1440-wide desktop viewport, a little larger for legibility).
import { esc } from '../core/boot.js';
import { at } from '../core/root.js';

const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;

export const GLYPHS = {
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  fwd: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  reload: '<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4.2h-4.2"/>',
  lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2.2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  star: '<path d="M12 4.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z"/>',
  dots: '<circle cx="12" cy="5.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="18.5" r="1.3" fill="currentColor"/>',
  plus: '<path d="M12 5.5v13M5.5 12h13"/>',
  close: '<path d="M7 7l10 10M17 7L7 17"/>',
  side: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M9.5 5v14"/>',
  share: '<path d="M8.5 9H7a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V11a2 2 0 0 0-2-2h-1.5M12 3.5v11M8.5 7L12 3.5 15.5 7"/>',
  tabs: '<rect x="3.5" y="7.5" width="13" height="13" rx="2.5"/><path d="M7.5 4h10.5a2.5 2.5 0 0 1 2.5 2.5V17"/>',
  aa: '<path d="M3.5 17.5l3.5-9 3.5 9M4.8 14.2h4.4M13.5 17.5l2.6-6.6 2.6 6.6M14.4 15.3h3.4"/>',
};

const g = (name, cls = '') => `<i class="g ${cls}">${svg(GLYPHS[name])}</i>`;

export function splitUrl(url = 'example.com') {
  const clean = String(url).replace(/^https?:\/\//, '');
  const i = clean.indexOf('/');
  return i < 0 ? { host: clean, path: '' } : { host: clean.slice(0, i), path: clean.slice(i).replace(/\/$/, '') };
}

const fav = (src) => (src ? `<img class="fav" src="${esc(at(src))}" alt="">` : '<i class="fav dot"></i>');

export function barHtml(o = {}) {
  const { host, path } = splitUrl(o.url);
  const lights = '<span class="lights"><i></i><i></i><i></i></span>';
  if (o.style === 'compact') {
    return `<div class="bar compact">${lights}${g('side')}${g('back')}${g('fwd', 'dim')}`
      + `<div class="omni center">${g('aa', 'sm dim')}<span class="host">${esc(host)}</span>${g('reload', 'sm dim')}</div>`
      + `${g('share')}${g('plus')}${g('tabs')}</div>`;
  }
  const title = o.title || host;
  const more = (o.tabs || []).map((t) => `<div class="tab">${fav(null)}<span class="t">${esc(t)}</span>${g('close', 'x')}</div>`).join('');
  return `<div class="bar"><div class="strip">${lights}`
    + `<div class="tab on">${fav(o.favicon)}<span class="t">${esc(title)}</span>${g('close', 'x')}</div>${more}${g('plus', 'new')}</div>`
    + `<div class="toolbar">${g('back')}${g('fwd', 'dim')}${g('reload')}`
    + `<div class="omni">${g('lock', 'sm dim')}<span class="host">${esc(host)}</span><span class="path">${esc(path)}</span>${g('star', 'sm dim end')}</div>`
    + `<i class="me"></i>${g('dots')}</div></div>`;
}

// Phones and tablets showing a website: the system status bar on top, then the browser's address pill
// (bottom on iPhone, top on Android, a top toolbar on iPad). The capture fills the space between.
const SYS = '<svg viewBox="0 0 19 12" class="sig" fill="currentColor"><rect x="0" y="7.5" width="3.2" height="4.5" rx="1"/><rect x="5.1" y="5.2" width="3.2" height="6.8" rx="1"/><rect x="10.2" y="2.7" width="3.2" height="9.3" rx="1"/><rect x="15.3" y="0" width="3.2" height="12" rx="1"/></svg>'
  + '<svg viewBox="0 0 17 12" class="wifi" fill="currentColor"><path d="M8.5 2.3c2.6 0 4.9 1 6.7 2.7l1.3-1.3A11.3 11.3 0 0 0 .5 3.7L1.8 5a9.5 9.5 0 0 1 6.7-2.7zm0 3.7c1.6 0 3 .6 4 1.6L13.9 6.3a7.6 7.6 0 0 0-10.8 0L4.5 7.6c1-1 2.4-1.6 4-1.6zm0 3.6c-.6 0-1.2.2-1.6.6L8.5 11.8l1.6-1.6c-.4-.4-1-.6-1.6-.6z"/></svg>'
  + '<svg viewBox="0 0 28 13" class="bat"><rect x=".5" y=".5" width="24" height="12" rx="3.8" fill="none" stroke="currentColor" stroke-opacity=".38"/><rect x="2.2" y="2.2" width="20.6" height="8.6" rx="2.3" fill="currentColor"/><path d="M26 4.4v4.2c.9-.3 1.4-1.1 1.4-2.1s-.5-1.8-1.4-2.1z" fill="currentColor" fill-opacity=".42"/></svg>';

export function mobileUi(o = {}) {
  const { host } = splitUrl(o.url);
  const fam = o.family || 'ios';
  const status = `<div class="m-status"><span class="time">${fam === 'android' ? '12:00' : '9:41'}</span><span class="sys">${SYS}</span></div>`;
  const pill = `<div class="m-pill">${g('lock', 'sm dim')}<span>${esc(host)}</span></div>`;
  if (fam === 'ipad') {
    return {
      top: `<div class="m-top">${status}<div class="m-row">${g('side')}${g('back')}${g('fwd', 'dim')}${pill}${g('share')}${g('plus')}${g('tabs')}</div></div>`,
      bottom: '<div class="m-bottom"></div>',
    };
  }
  if (fam === 'android') {
    return { top: `<div class="m-top">${status}<div class="m-row">${pill}${g('tabs')}${g('dots')}</div></div>`, bottom: '<div class="m-bottom"></div>' };
  }
  return { top: `<div class="m-top">${status}</div>`, bottom: `<div class="m-bottom"><div class="m-row">${g('back')}${pill}${g('dots')}</div></div>` };
}
