// Live screens: in an editable project (screens.mode 'live') a device, lift or tile draws the mock screen PAGE
// (screens/<name>.html, scripts/lib/pages.js) in an iframe at the capture's CSS viewport (440 x 956 on iOS),
// scaled to fit, instead of its PNG capture. The kit applies edits.json in the page, the text stays text, and
// the image is sharp at any --scale with no recapture. Sizes stay in CAPTURE px (CSS px x the platform's pixel
// ratio), so lift, tile and device maths is the same as with a capture:
//   liveScreen(name, ctx)  -> { live, name, platform, page, url, w, h, dpr, css: [w, h], fallback } | null
//                             null = no page in screens/ (the capture in raw/ is used)
//   liveBoxes(s, ctx)      -> s.boxes, measured once per page in a hidden iframe (screens/kit/boxes.js) after the kit
//                             ran (edits included, so a lift shows the edited card); only for lifts and tiles.
//                             Its warnings (a box cut by the edge, covered by the tab bar) wait in s.boxWarnings:
//                             a lift reports the ones about ITS box (npm run screens prints them all)
//   liveFrame(s, ctx)      -> the <iframe> to put in a device / lift / tile (the caller sets its transform)
//   waitLive()             -> every frame drawn so far is ready (kit done, fonts in), painted, and fitted
// A frame that is not ready after 30 s is an issue, and the render goes on.
import { at } from './root.js';
import { issue } from './issues.js';
import { PLATFORMS } from '../../scripts/lib/stores.js';
import { resolvePage } from '../../scripts/lib/pages.js';
import { untranslatedText } from '../../scripts/lib/locales.js';
import { boxes as measureBoxes } from '../../screens/kit/boxes.js';

const TIMEOUT = 30000;
const conf = { mode: 'raster', theme: null, edits: 'edits.json' };
const pending = new Map(); // frame -> its ready promise
const resolved = new Map();
const checked = new Set();
let listing = null;

// set by core/boot.js loadConfig: { mode, theme, edits (file from the project root, or 'none') }
export function configureLive(o) {
  Object.assign(conf, o);
}

export const liveMode = () => conf.mode === 'live';

function pageListing() {
  if (!listing) {
    listing = fetch(at('screens/index.json'), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && Array.isArray(d.files) ? d : null))
      .catch(() => null);
  }
  return listing;
}

const passthrough = new URLSearchParams(location.search).get('tokens'); // brand option previews

function srcOf(s, locale) {
  const q = new URLSearchParams(s.query);
  q.set('locale', locale);
  if (conf.theme) q.set('themeDefault', conf.theme);
  q.set('edits', conf.edits || 'none');
  if (passthrough) q.set('tokens', passthrough);
  q.set('embed', '1');
  return at(`${s.page}?${q}`);
}

// resolves when the page in the frame is ready: the kit's window.__ready (or, for a page without the kit, its
// fonts and images), the same rule as the capture's readyMode 'auto' (scripts/lib/session.js)
function whenReady(f, label) {
  let timer;
  const done = new Promise((resolve) => {
    const check = async () => {
      const w = f.contentWindow;
      if (!w || !w.document || w.document.readyState !== 'complete') return false;
      if (w.__ready === false) return false;
      await w.document.fonts.ready;
      await Promise.all([...w.document.images].map((i) => i.decode().catch(() => null)));
      return w.__ready !== false;
    };
    const poll = async () => {
      if (await check().catch(() => false)) { clearTimeout(timer); resolve(f); } else setTimeout(poll, 30);
    };
    f.addEventListener('load', poll, { once: true });
    timer = setTimeout(() => {
      if (f.isConnected) issue(`live screen ${label}: not ready after ${TIMEOUT / 1000} s (open ${f.getAttribute('src')} to see why)`);
      resolve(f);
    }, TIMEOUT);
  }).then(() => {
    const err = f.contentWindow && f.contentWindow.__error;
    if (err) issue(`live screen ${label}: ${err}`);
    return f;
  });
  pending.set(f, done);
  done.finally(() => pending.delete(f));
  return done;
}

export function liveFrame(s, ctx, { hidden = false } = {}) {
  const f = document.createElement('iframe');
  f.className = 'live-screen';
  f.setAttribute('scrolling', 'no');
  f.setAttribute('aria-hidden', 'true');
  f.tabIndex = -1;
  f.dataset.screen = s.name;
  f.style.cssText = `width:${s.css[0]}px;height:${s.css[1]}px;${hidden ? 'visibility:hidden;left:-100000px;' : ''}`;
  f.src = srcOf(s, ctx.locale);
  f.ready = whenReady(f, `"${s.name}" (${s.platform}, ${ctx.locale})`).then(() => afterReady(f, s, ctx));
  return f;
}

// once per page: is it translated, and did the kit skip an edit (core/issues.js: render log, report, validate)
function afterReady(f, s, ctx) {
  const win = f.contentWindow;
  if (!win || checked.has(s.url)) return f;
  checked.add(s.url);
  localized(win, s.name, ctx);
  for (const t of (win.kit && win.kit.editIssues ? win.kit.editIssues() : [])) issue(t);
  return f;
}

// a screen with no translation at all for this locale, else the strings its strings.json entry misses
function localized(win, name, ctx) {
  const kit = win.kit;
  if (!ctx.defaultLocale || ctx.locale === ctx.defaultLocale || !kit) return;
  if (kit.localized === false) {
    issue(`screen "${name}" is not localized for "${ctx.locale}": screens/strings.json has no "${ctx.locale}" entries and `
      + `no data-${ctx.locale} texts (translate it, or the screen shows the ${ctx.defaultLocale} words)`);
    return;
  }
  const left = kit.untranslated ? kit.untranslated() : [];
  if (left.length) issue(untranslatedText(name, ctx.locale, left));
}

// -> the screen (no boxes yet: liveBoxes measures them when a lift or a tile needs them) | null (no page)
export function liveScreen(name, ctx) {
  const key = `${name}|${ctx.platform}|${ctx.locale}`;
  if (!resolved.has(key)) {
    resolved.set(key, pageListing().then((listing) => {
      const hit = resolvePage(listing, name, ctx.platform);
      if (!hit) return null;
      const spec = PLATFORMS[hit.platform] || PLATFORMS.ios;
      const s = { live: true, name: String(name), platform: hit.platform, page: hit.page, query: hit.query, fallback: hit.fallback,
        css: spec.css, dpr: spec.dpr, w: spec.css[0] * spec.dpr, h: spec.css[1] * spec.dpr, missing: false, boxes: null };
      s.url = srcOf(s, ctx.locale);
      s.rel = hit.page;
      return s;
    }));
  }
  return resolved.get(key);
}

// the named boxes of a live screen, measured once in a hidden frame after the kit ran (edits included)
export function liveBoxes(s, ctx) {
  if (!s.measured) {
    s.measured = (async () => {
      const f = liveFrame(s, ctx, { hidden: true });
      document.body.appendChild(f);
      await f.ready;
      try {
        const m = measureBoxes(s.dpr, f.contentWindow);
        s.boxes = m.boxes;
        s.boxWarnings = m.warnings.map((w) => `screen "${s.name}" (${s.platform}): ${w}`);
      } catch (err) {
        issue(`live screen "${s.name}": could not measure its boxes (${err.message})`);
        s.boxes = {};
      }
      f.remove();
    })();
  }
  return s.measured;
}

// A device screen is filled like the capture was (object-fit: cover, top). device.js scales the page to the
// screen's exact width (data-fit-w); a host taller than that (a frame with its own aspect) is covered by height.
function fit() {
  for (const host of document.querySelectorAll('.live-host')) {
    const f = host.querySelector('iframe.live-screen');
    const W = f ? parseFloat(f.dataset.fitW) : 0;
    if (!W) continue;
    const [w, h] = [parseFloat(f.style.width), parseFloat(f.style.height)];
    const H = host.clientHeight;
    if (H <= (h * W) / w + 1) continue;
    const z = H / h;
    f.style.transform = `translate(${(W - w * z) / 2}px, 0px) scale(${z})`;
  }
}

// (a frame removed before it loaded, e.g. redrawn by Mockup Studio, is not waited for)
export async function waitLive() {
  if (!pending.size && !document.querySelector('iframe.live-screen')) return;
  const open = () => [...pending].filter(([f]) => f.isConnected).map(([, p]) => p);
  for (let list = open(); list.length; list = open()) await Promise.all(list);
  fit();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
}
