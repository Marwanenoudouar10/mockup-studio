// Screens by NAME -> files on disk, with the fallback chain
//   raw/<platform>/<locale>/<name>.png -> raw/<platform>/<name>.png -> the other platform (same two steps)
// plus the optional <name>.boxes.json next to the file that was found. Also inline SVG + image waits.
// The lookup reads ONE listing of raw/ (GET raw/index.json, served by the project server and Store Studio)
// instead of probing every candidate with HEAD requests; any other server falls back to probing.
// A non-default locale that falls back to the default-language capture is an issue (an English screen
// under a Spanish headline): the render log and validate report it.
import { PLATFORMS } from '../../scripts/lib/stores.js';
import { at } from './root.js';
import { issue } from './issues.js';

const EXT = ['png', 'jpg', 'jpeg', 'webp'];
const heads = new Map();
const screens = new Map();
let listing = null;

function rawListing() {
  if (!listing) {
    listing = fetch(at('raw/index.json'), { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && Array.isArray(d.files) ? new Set(d.files) : null))
      .catch(() => null);
  }
  return listing;
}

// rel: a path from the project root
async function exists(rel) {
  const files = /^raw\//.test(rel) ? await rawListing() : null;
  if (files) return files.has(rel);
  const url = at(rel);
  if (!heads.has(url)) heads.set(url, fetch(url, { method: 'HEAD' }).then((r) => r.ok).catch(() => false));
  return heads.get(url);
}

export function loadImage(url) {
  const img = new Image();
  img.src = url;
  return img.decode().then(() => ({ w: img.naturalWidth, h: img.naturalHeight }));
}

function candidates(name, platform, locale) {
  const plats = [platform, PLATFORMS[platform] && PLATFORMS[platform].other].filter(Boolean);
  const list = [];
  for (const p of plats) for (const [dir, own] of [[`raw/${p}/${locale}`, true], [`raw/${p}`, false]]) for (const ext of EXT) {
    list.push({ rel: `${dir}/${name}.${ext}`, platform: p, ownLocale: own });
  }
  return list;
}

async function find(name, ctx) {
  if (/[./]/.test(name)) return (await exists(name)) ? { rel: name, platform: ctx.platform, ownLocale: true, path: true } : null;
  const list = candidates(name, ctx.platform, ctx.locale);
  const ok = await Promise.all(list.map((c) => exists(c.rel)));
  return list[ok.indexOf(true)] || null;
}

async function loadBoxes(rel) {
  const file = rel.replace(/\.\w+$/, '.boxes.json');
  if (/^raw\//.test(file) && !(await exists(file))) return null;
  try {
    const r = await fetch(at(file));
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

// -> { name, url, platform, w, h, boxes, fallback, missing }
export function resolveScreen(name, ctx) {
  const key = `${name}|${ctx.platform}|${ctx.locale}`;
  if (!screens.has(key)) screens.set(key, (async () => {
    const hit = await find(String(name), ctx);
    const cap = (PLATFORMS[ctx.platform] || PLATFORMS.ios).capture;
    if (!hit) {
      issue(`missing screen "${name}": looked in raw/${ctx.platform}/${ctx.locale}/, raw/${ctx.platform}/ and the other platform`);
      return { name, missing: true, platform: ctx.platform, w: cap[0], h: cap[1], boxes: null };
    }
    const url = at(hit.rel);
    const fallback = hit.platform !== ctx.platform;
    if (fallback) console.warn(`screen "${name}": no ${ctx.platform} capture, using ${hit.rel}`);
    if (!hit.path && !hit.ownLocale && ctx.defaultLocale && ctx.locale !== ctx.defaultLocale) {
      issue(`screen "${name}" is not localized for "${ctx.locale}": no raw/${hit.platform}/${ctx.locale}/${name}.png, using ${hit.rel}`
        + ` (npm run screens -- --locale ${ctx.locale}, or capture the app in that language)`);
    }
    const [{ w, h }, boxes] = await Promise.all([loadImage(url), loadBoxes(hit.rel)]);
    return { name, url, rel: hit.rel, platform: hit.platform, w, h, boxes, fallback, missing: false };
  })());
  return screens.get(key);
}

// wanted: [{ name, platform }] -> Map('name|platform' -> screen)
export async function preloadScreens(wanted, ctx) {
  const keys = [...new Set(wanted.map((w) => `${w.name}|${w.platform}`))];
  const found = await Promise.all(keys.map((k) => {
    const [name, platform] = k.split('|');
    return resolveScreen(name, { ...ctx, platform });
  }));
  return new Map(keys.map((k, i) => [k, found[i]]));
}

// SVG files are inlined so currentColor, CSS variables and page fonts apply inside them.
const svgs = new Map();
export async function graphic(src, cls) {
  const url = at(src);
  const box = document.createElement('div');
  box.className = cls;
  if (!/\.svg($|\?)/i.test(url)) {
    box.innerHTML = `<img src="${url}" alt="">`;
    return box;
  }
  if (!svgs.has(url)) svgs.set(url, fetch(url).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${url}`)))));
  try {
    const doc = new DOMParser().parseFromString(await svgs.get(url), 'image/svg+xml');
    const svg = doc.documentElement;
    if (svg.nodeName !== 'svg' || doc.querySelector('parsererror')) {
      console.warn(`${url} is not valid XML (a "--" inside a comment?): drawn as a plain image`);
      box.innerHTML = `<img src="${url}" alt="">`;
      return box;
    }
    svg.querySelectorAll('script').forEach((s) => s.remove());
    box.appendChild(document.importNode(svg, true));
  } catch (err) {
    console.warn(`could not load ${url}: ${err.message}`);
  }
  return box;
}

export async function waitImages(root = document) {
  const imgs = [...root.querySelectorAll('img')];
  await Promise.all(imgs.map((i) => (i.complete && i.naturalWidth ? Promise.resolve() : i.decode().catch(() => {
    console.warn(`image failed to load: ${i.getAttribute('src')}`);
  }))));
}
