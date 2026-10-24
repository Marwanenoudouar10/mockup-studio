// Page plumbing: query params, config import, the ready/error flags the renderer waits on.
import { normalize } from '../../scripts/lib/config.js';
import { withTokens } from '../../scripts/lib/tokens.js';
import { layoutFile, parseLayout } from '../../scripts/lib/layout.js';
import { at } from './root.js';

export const q = new URLSearchParams(location.search);

// brand.tokens (or ?tokens= to preview another token file) -> brand/tokens.json merged under the config.
async function loadTokens(raw, optional) {
  const src = q.get('tokens') || (raw.brand && raw.brand.tokens);
  if (!src) return null;
  // the brand step runs before `apply` wrote the file: look first, so no 404 lands in the render log
  if (optional && !(await fetch(at(src), { method: 'HEAD' }).then((x) => x.ok).catch(() => false))) return null;
  const r = await fetch(at(src));
  if (!r.ok && optional) return null;
  if (!r.ok) throw new Error(`brand.tokens: ${src} not found (run npm run brand -- apply, or remove brand.tokens)`);
  return r.json();
}

// draft: brand boards run before any panel exists, so an empty panel list gets a placeholder.
export async function loadConfig({ draft = false } = {}) {
  const file = (q.get('config') || 'studio.config.js').replace(/^\/+/, '');
  const mod = await import(at(file));
  const raw = withTokens(mod.default, await loadTokens(mod.default, draft));
  if (draft && !(raw.panels && raw.panels.length)) raw.panels = [{ headline: raw.brand && raw.brand.name, stage: [] }];
  const cfg = normalize(raw);
  cfg.overrides = await loadLayout(file);
  return cfg;
}

// layout.json (scripts/lib/layout.js): the workspace's position overrides. ?layout=0 shows the config alone.
async function loadLayout(file) {
  if (q.get('layout') === '0') return null;
  const r = await fetch(at(layoutFile(file)), { cache: 'no-store' }).catch(() => null);
  if (!r || !r.ok || r.status === 204) return null; // 204: the servers' answer for "no layout.json yet"
  try {
    return parseLayout(await r.text());
  } catch (err) {
    console.warn(`${layoutFile(file)} is not valid JSON (${err.message}): ignored`);
    return null;
  }
}

export function setPageSize(w, h) {
  const s = document.documentElement.style;
  s.setProperty('--page-w', `${w}px`);
  s.setProperty('--page-h', `${h}px`);
}

// Store Studio (workspace/, ?edit=1) hears about ready pages and errors without polling the frame.
function tellParent(msg) {
  if (q.get('edit') === '1' && window.parent !== window) window.parent.postMessage({ ...msg, key: q.get('key') }, '*');
}

export function ready() {
  window.__ready = true;
  document.body.dataset.ready = '1';
  tellParent({ ss: 'ready', size: window.__size || null });
}

export function fail(err) {
  const msg = err && err.stack ? `${err.message}\n${err.stack.split('\n').slice(1, 4).join('\n')}` : String(err);
  console.error(msg);
  window.__error = err && err.message ? err.message : String(err);
  tellParent({ ss: 'error', message: window.__error });
  const box = document.createElement('pre');
  box.className = 'error-box';
  box.textContent = msg;
  document.body.appendChild(box);
}

export function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const plain = (html) => String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
