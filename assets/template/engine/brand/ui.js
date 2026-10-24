// Shared pieces of the brand boards: the page frame (eyebrow, title, meta, footer), swatches, ramps,
// contrast rows, icon previews and font faces. Board chrome is set in Inter so the brand's own fonts
// and colours are the only loud things on the page.
import { el, esc } from '../core/boot.js';
import { fontSpec } from '../../scripts/lib/config.js';
import { onColor } from '../../scripts/brand/lib/color.js';
import { at } from '../core/root.js';

export { el, esc };

export async function getJson(p) {
  const r = await fetch(at(p));
  if (!r.ok) throw new Error(`${r.status} ${p}`);
  return r.json();
}

const sheets = new Map();
function sheet(href) {
  const url = at(href);
  if (!sheets.has(url)) {
    sheets.set(url, new Promise((resolve) => {
      const link = el('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = () => resolve();
      link.onerror = () => {
        console.warn(`font stylesheet not found: ${url} (npm install the matching @fontsource package)`);
        resolve();
      };
      document.head.appendChild(link);
    }));
  }
  return sheets.get(url);
}

// { family, variable, weights } (the tokens / config shape) -> its CSS family, with the faces loaded
export async function face(spec, weights = [400, 600, 700], sample = 'AaBbGgQq 0123') {
  const s = fontSpec(spec, weights);
  if (!s) return 'system-ui';
  await Promise.all(s.css.map(sheet));
  await Promise.all(s.weights.map((w) => document.fonts.load(`${w} 48px "${s.family}"`, sample).catch(() => null)));
  return `"${s.family}", system-ui, sans-serif`;
}

export const today = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

// header (eyebrow, title, sub, meta lines) + main + footer; returns main
export function page({ eyebrow, title, titleFont, sub, meta = [], foot = [] }) {
  const head = el('header', 'bb-head');
  const left = el('div', 'bb-head-main',
    `<div class="bb-eyebrow">${esc(eyebrow)}</div><h1 class="bb-title">${esc(title)}</h1>${sub ? `<p class="bb-sub">${sub}</p>` : ''}`);
  if (titleFont) left.querySelector('.bb-title').style.fontFamily = titleFont;
  head.append(left, el('div', 'bb-meta', meta.map((m) => `<div>${m}</div>`).join('')));
  const main = el('main', 'bb-main');
  document.body.append(head, main, el('footer', 'bb-foot', `<span>${foot[0] || ''}</span><span>${foot[1] || today()}</span>`));
  return main;
}

// the colour keys a board shows: all six, with accent folded into primary when they are the same colour
// (a one-accent brand), or the brand's own list ([{ key, name }], board --swatches)
const KEYS = ['primary', 'secondary', 'deep', 'accent', 'ink', 'paper'];
export function swatchKeys(c, list = null) {
  if (list && list.length) return list;
  const same = String(c.accent).toUpperCase() === String(c.primary).toUpperCase();
  return KEYS.filter((k) => !(same && k === 'accent')).map((key) => ({ key, name: same && key === 'primary' ? 'primary + accent' : key }));
}

export function swatch(name, hex, note = '') {
  return el('div', 'bb-swatch',
    `<div class="chip" style="background:${hex};color:${onColor(hex)}">${note}</div><div class="name">${esc(name)}</div><div class="hex">${esc(hex)}</div>`);
}

export function ramp(obj, cls = '') {
  return el('div', `bb-ramp ${cls}`, Object.entries(obj).map(([k, v]) => `<div><i style="background:${v}"></i><span>${k}</span></div>`).join(''));
}

export function checkRow(c) {
  const lvl = c.pass ? c.level : `needs ${c.need}:1`;
  return el('div', `bb-check ${c.pass ? 'pass' : 'fail'}`,
    `<span class="aa" style="color:${c.fg};background:${c.bg}">Aa</span><span class="lbl">${esc(c.label)}</span>`
    + `<span class="ratio">${c.ratio.toFixed(2)}</span><span class="lvl">${esc(lvl)}</span>`);
}

// the icon as the stores show it: iOS rounded square (~22.5% corners), Android circle
export function iconShape(src, size, shape = 'ios') {
  const n = el('div', `bb-icon ${shape}`, `<img src="${src}" alt="">`);
  n.style.width = `${size}px`;
  n.style.height = `${size}px`;
  return n;
}

export function label(text, cls = '') {
  return el('div', `bb-label ${cls}`, esc(text));
}
