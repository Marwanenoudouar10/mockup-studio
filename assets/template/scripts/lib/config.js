// Config normalization, shared by the Node scripts and the pages (pure ESM, no Node imports).
// normalize(raw) fills defaults once; target(cfg, {store, locale}) resolves every variant for one render.
//
// Variants: any value may be an object keyed by store id, platform, locale or 'default', e.g.
//   headline: { en: 'Hello', de: 'Hallo' }     w: { playstore: 640, default: 720 }
//   crop: { ios: [x, y, w, h], android: [x, y, w, h] }   (crop/radius follow the capture actually used)
//   stage: { portrait: [...], landscape: [...] }         (by the target's design space)
// Panels: space 'portrait' (phone stores) or 'landscape' (web/social/desktop targets) or 'any';
// only: ['og', 'producthunt'] narrows a panel to some targets. Each target renders its own panels in order.
import { STORES, PLATFORMS } from './stores.js';
import { applyLayout, elementId, FEATURE } from './layout.js';

export const DESIGN_W = 1320;
export const STAGE_H = 1900;
const RTL = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'ug', 'yi', 'dv', 'ckb'];
const TEXT_KEYS = ['headline', 'sub', 'text', 'title', 'label'];
const LATE_KEYS = new Set(['crop', 'radius']);

export const isRtl = (locale) => RTL.includes(String(locale).toLowerCase().split(/[-_]/)[0]);
export const pad2 = (n) => String(n).padStart(2, '0');
const isPlain = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const COLORS = {
  primary: '#6C5CE7', secondary: '#3B2FA8', deep: '#1A1550',
  accent: '#FFC27A', ink: '#17152E', paper: '#F7F4EF',
};

const LAYOUT = {
  headline: 118, headlineShort: 106, sub: 46, subShort: 44, maxLines: 3, subMaxLines: 3,
  top: 210, topShort: 150, gap: 140, gapShort: 100, side: 96, logo: 420, logoShort: 360,
  bottom: 190, bottomShort: 140, // a panel with copy: 'bottom': the copy block's distance from the bottom edge
};

// The wide layout (landscape space): design units on a 1200-high canvas.
//   mode 'side' = copy column beside the stage, 'stack' = copy centred above it; 'auto' = side when W/H >= sideRatio
export const WIDE = {
  mode: 'auto', sideRatio: 1.5, headline: 96, sub: 38, logo: 300, maxLines: 3, subMaxLines: 3,
  side: 120, copyWidth: 0.36, copyMin: 600, copyMax: 860, gap: 40,
  top: 100, stackGap: 64, stackWidth: 1500, stackScale: 0.84, stageW: 1600, stageH: 1200, maxScale: 1,
};

// 'Poppins' or { family, weights, variable, package, css } -> { family, weights, css[] }
export function fontSpec(v, weights) {
  if (!v) return null;
  const o = typeof v === 'string' ? { family: v } : { ...v };
  let family = o.family;
  let variable = !!o.variable;
  if (/ Variable$/.test(family)) { variable = true; family = family.replace(/ Variable$/, ''); }
  const slug = o.slug || family.toLowerCase().replace(/\s+/g, '-');
  const pkg = o.package || (variable ? `@fontsource-variable/${slug}` : `@fontsource/${slug}`);
  const ws = o.weights || weights;
  const css = o.css ? [].concat(o.css) : variable ? [`node_modules/${pkg}/index.css`] : ws.map((w) => `node_modules/${pkg}/${w}.css`);
  return { family: variable ? `${family} Variable` : family, weights: ws, css };
}

function normStore(s) {
  const o = typeof s === 'string' ? { id: s } : { ...s };
  const base = STORES[o.id];
  if (!base && !(o.size && o.platform)) {
    throw new Error(`Unknown store "${o.id}". Known: ${Object.keys(STORES).join(', ')} (or give size + platform).`);
  }
  const st = { min: 1, max: 10, formats: ['png'], alpha: false, maxBytes: null, ...base, ...o };
  st.screens = o.screens || st.platform;
  st.device = o.device || (o.screens && PLATFORMS[o.screens] ? PLATFORMS[o.screens].device : st.device)
    || (PLATFORMS[st.platform] || PLATFORMS.ios).device;
  st.space = o.space || st.space || (st.size[0] > st.size[1] ? 'landscape' : 'portrait');
  st.panorama = !!o.panorama && st.space === 'portrait';
  return st;
}

// true | false | { src, opacity } -> false | { src, opacity }. Any other object is a variant map
// ({ playstore: false, default: true }: per store or platform), each value normalized the same way.
export function normWatermark(wm, b = {}) {
  if (wm === false || wm === null) return false;
  if (isPlain(wm) && Object.keys(wm).length && !('src' in wm) && !('opacity' in wm)) {
    return Object.fromEntries(Object.entries(wm).map(([k, v]) => [k, normWatermark(v, b)]));
  }
  const o = isPlain(wm) ? wm : {};
  return { src: o.src || b.mark || b.logo, opacity: o.opacity || null };
}

function normBrand(b = {}) {
  const fonts = b.fonts || {};
  return {
    name: b.name || 'App',
    domain: b.domain || null, // the brand's own site: browser tabs on it show the brand icon as favicon
    logo: b.logo || null,
    colors: { ...COLORS, ...(b.colors || {}) },
    fonts: {
      display: fontSpec(fonts.display || 'Poppins', [600, 700, 800]),
      text: fontSpec(fonts.text || fonts.display || 'Poppins', [400, 500]),
      extra: (fonts.extra || []).map((f) => fontSpec(f, [400, 600, 700])),
    },
    mark: b.mark || null,
    watermark: normWatermark(b.watermark === undefined ? true : b.watermark, b),
    field: b.field || 'gradient',
    grain: b.grain !== false,
    ornament: b.ornament || 'brush',
    align: b.align || 'left',
    headlineWeight: b.headlineWeight || 800,
    devices: {
      iphone: { island: true, ...((b.devices || {}).iphone || {}) },
      pixel: { camera: true, ...((b.devices || {}).pixel || {}) },
      ipad: { ...((b.devices || {}).ipad || {}) },
      browser: { theme: 'light', style: 'tabs', ...((b.devices || {}).browser || {}) },
      laptop: { finish: 'silver', ...((b.devices || {}).laptop || {}) },
      monitor: { finish: 'silver', ...((b.devices || {}).monitor || {}) },
    },
  };
}

export function normalize(raw = {}) {
  const locales = (raw.locales && raw.locales.length ? raw.locales : ['en']).map(String);
  const stores = (raw.stores || ['appstore', 'playstore']).map(normStore);
  // a panel without `space` belongs to the phone layout, unless every target is wide
  const space = stores.some((s) => s.space === 'portrait') ? 'portrait' : 'landscape';
  const panels = (raw.panels || []).map((p, i) => ({ ...p, id: i + 1, space: p.space || space, stage: p.stage || [] }));
  if (!panels.length) throw new Error('studio config has no panels.');
  const lay = raw.layout || {};
  const brand = normBrand(raw.brand);
  return {
    brand,
    locales,
    defaultLocale: raw.defaultLocale || locales[0],
    stores,
    layout: { ...LAYOUT, ...lay, wide: { ...WIDE, ...(lay.wide || {}) } },
    panels,
    feature: raw.feature || null,
    // background: what the App Store icon is flattened onto (an icon with transparent parts)
    icon: { src: 'brand/icon.svg', background: brand.colors.primary, ...(raw.icon || {}) },
    // sheet.background: null = the brand's paper a step darker (engine/gallery.js), so light images still separate
    sheet: { height: 1100, wideWidth: 1040, width: 3840, quality: 94, gap: 44, padding: 96, background: null, title: true, ...(raw.sheet || {}) },
    // mock screens: theme = the default theme of `npm run screens` ('dark' for an all-dark app)
    screens: { theme: null, ...(raw.screens || {}) },
  };
}

export function keySet(cfg) {
  return new Set([...cfg.locales, ...Object.keys(PLATFORMS), ...Object.keys(STORES),
    ...cfg.stores.map((s) => s.id), 'portrait', 'landscape', 'default']);
}

// Picks variant objects for this ctx; recurses into everything else.
export function resolve(value, ctx, keys, late = LATE_KEYS) {
  if (Array.isArray(value)) return value.map((v) => resolve(v, ctx, keys, late));
  if (!isPlain(value)) return value;
  const ks = Object.keys(value);
  if (ks.length && ks.every((k) => keys.has(k))) {
    const hit = [ctx.store, ctx.platform, ctx.space, ctx.locale, 'default', ctx.defaultLocale].find((k) => k in value);
    return hit === undefined ? undefined : resolve(value[hit], ctx, keys, late);
  }
  const out = {};
  for (const k of ks) out[k] = late.has(k) ? value[k] : resolve(value[k], ctx, keys, late);
  return out;
}

export function textOf(v, ctx) {
  if (v == null || typeof v === 'string' || typeof v === 'number') return v;
  if (!isPlain(v)) return String(v);
  const hit = v[ctx.locale] ?? v[ctx.defaultLocale] ?? Object.values(v).find((x) => typeof x === 'string');
  return hit ?? '';
}

// { ios: .., android: .. } picked by the platform of the capture actually drawn.
export function byPlatform(v, platform) {
  if (!isPlain(v)) return v;
  const other = PLATFORMS[platform] ? PLATFORMS[platform].other : null;
  return v[platform] ?? v[other] ?? v.default ?? Object.values(v)[0];
}

function texts(obj, ctx) {
  if (!obj) return obj;
  const out = { ...obj };
  for (const k of TEXT_KEYS) if (k in out) out[k] = textOf(out[k], ctx);
  return out;
}

// Each element gets its id (explicit `id`, else its 1-based position in the stage array, counted before
// store/locale variants drop any), then layout.json (cfg.overrides, see layout.js) moves or adds elements.
function resolveStage(stage, ctx, keys, overrides, panel, layoutKey = ctx.store) {
  const list = (resolve(stage, ctx, keys) || []).map((e, i) => (e ? { ...texts(e, ctx), id: elementId(e, i) } : null));
  return applyLayout(list.filter(Boolean), overrides, layoutKey, panel)
    .map((e) => ({ ...texts(resolve(e, ctx, keys), ctx), $panel: panel }));
}

// The panels one target renders, in order: same space (or 'any'), and `only` (if set) names the target.
export function panelsFor(cfg, st) {
  return cfg.panels.filter((p) => (p.space === 'any' || p.space === st.space)
    && (!p.only || [].concat(p.only).some((k) => k === st.id || k === st.space || k === st.screens)));
}

export function storeOf(cfg, id) {
  return cfg.stores.find((s) => s.id === id) || normStore(id);
}

export function target(cfg, { store, locale }) {
  const st = storeOf(cfg, store);
  const loc = locale || cfg.defaultLocale;
  const ctx = { store: st.id, platform: st.screens, space: st.space, locale: loc, defaultLocale: cfg.defaultLocale };
  const keys = keySet(cfg);
  const panels = panelsFor(cfg, st).map((p, i) => {
    const r = texts(resolve({ ...p, stage: undefined }, ctx, keys), ctx);
    return { ...r, id: p.id, n: i + 1, stage: resolveStage(p.stage, ctx, keys, cfg.overrides, p.id) };
  });
  return {
    ctx, store: st, locale: loc, dir: isRtl(loc) ? 'rtl' : 'ltr',
    brand: resolve(cfg.brand, ctx, keys), layout: cfg.layout, panels,
  };
}

// The Play feature graphic: its own 1024 x 500 stage, Android captures by default.
export function featureTarget(cfg, locale) {
  const f = cfg.feature || {};
  const platform = f.platform || 'android';
  const loc = locale || cfg.defaultLocale;
  const ctx = { store: 'playstore', platform, space: 'landscape', locale: loc, defaultLocale: cfg.defaultLocale };
  const keys = keySet(cfg);
  const stage = resolveStage(f.stage || [], ctx, keys, cfg.overrides, 1, FEATURE);
  const r = texts(resolve({ ...f, stage: undefined }, ctx, keys), ctx);
  const brand = resolve(cfg.brand, ctx, keys);
  // feature.watermark (true / false / { src, opacity }) overrides brand.watermark for the graphic only
  if (f.watermark !== undefined) brand.watermark = normWatermark(f.watermark, cfg.brand);
  return {
    ctx, locale: loc, dir: isRtl(loc) ? 'rtl' : 'ltr', platform,
    device: f.device || PLATFORMS[platform].device,
    brand, feature: { ...r, stage },
  };
}

// The brand as one store sees it (variants such as field: { appstore: 'x', default: 'y' } resolved): for pages
// that draw a store image outside a render, such as the brand board's thumbnail.
export function brandFor(cfg, { store, platform = 'ios', locale } = {}) {
  const st = store || (cfg.stores.find((s) => s.space === 'portrait') || cfg.stores[0]).id;
  const ctx = { store: st, platform, space: 'portrait', locale: locale || cfg.defaultLocale, defaultLocale: cfg.defaultLocale };
  return resolve(cfg.brand, ctx, keySet(cfg));
}
