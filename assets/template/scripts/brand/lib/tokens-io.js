// brand/tokens.json on disk: read it, build it from a palette option + a font pair, write it.
// The shape (consumed by scripts/lib/tokens.js):
//   { name, colors: {primary secondary deep accent ink paper onField}, ui: {tint tint2 onTint bg},
//     ramp: {50..900}, neutrals: {50..900}, field, fonts: {display, text}, headlineWeight,
//     icon: {style, scale}, source: {seed, mood, palette, fonts, logo}, updated }
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../lib/cli.js';

export const TOKENS = 'brand/tokens.json';
export const OUT = 'out/brand';

export function readJson(rel, fallback) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    if (fallback !== undefined) return fallback;
    throw new Error(`${rel} not found`);
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function writeJson(rel, data) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}

// The fonts the brand uses right now: the tokens' (if applied) or the config's.
export function currentFonts(tokens, cfg) {
  if (tokens && tokens.fonts && tokens.fonts.display) return { fonts: tokens.fonts, headlineWeight: tokens.headlineWeight };
  const plain = (s) => s && { family: s.family.replace(/ Variable$/, ''), ...(/ Variable$/.test(s.family) ? { variable: true } : {}), weights: s.weights };
  return { fonts: { display: plain(cfg.brand.fonts.display), text: plain(cfg.brand.fonts.text) }, headlineWeight: cfg.brand.headlineWeight };
}

export function paletteTokens(option, meta = {}) {
  return {
    colors: option.colors, ui: option.ui, ramp: option.ramp, neutrals: option.neutrals, field: option.field,
    source: { seed: meta.seed, mood: meta.mood, palette: `${option.id} ${option.name}` },
  };
}

export function fontTokens(pair) {
  return { fonts: { display: pair.display, text: pair.text }, headlineWeight: pair.headlineWeight, source: { fonts: `${pair.id} ${pair.label}` } };
}

// Shallow merge, with `source` merged one level deeper.
export function mergeTokens(base, ...parts) {
  let out = { ...(base || {}) };
  for (const p of parts) out = { ...out, ...p, source: { ...(out.source || {}), ...(p.source || {}) } };
  return out;
}

export const today = () => new Date().toISOString().slice(0, 10);
