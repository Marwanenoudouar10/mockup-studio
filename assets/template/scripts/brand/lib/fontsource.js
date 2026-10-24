// Fontsource lookup for the brand step: a family name -> the installed package, its weights and
// category (from the package's metadata.json). A missing family comes back with the exact npm command.
//   "Poppins/Inter, Newsreader/Inter"  -> pairs of { display, text } (a single name = both roles)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../lib/cli.js';

const DISPLAY_W = [600, 700, 800];
const TEXT_W = [400, 500, 600];

const slugOf = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function findFont(name) {
  const family = String(name).trim().replace(/\s+variable$/i, '');
  const slug = slugOf(family);
  for (const [pkg, variable] of [[`@fontsource-variable/${slug}`, true], [`@fontsource/${slug}`, false]]) {
    const meta = path.join(ROOT, 'node_modules', pkg, 'metadata.json');
    if (!fs.existsSync(meta)) continue;
    const m = JSON.parse(fs.readFileSync(meta, 'utf8'));
    return {
      family: m.family || family, variable, package: pkg, weights: m.weights || [400],
      category: m.category || 'sans-serif', license: (m.license && m.license.type) || '',
    };
  }
  return { family, missing: true, install: `npm i @fontsource-variable/${slug}`, fallback: `npm i @fontsource/${slug}` };
}

// The weights a role uses, from the ones the family has (nearest available when a wanted one is missing).
function weightsFor(have, want) {
  const set = new Set(want.map((w) => have.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), have[0])));
  return [...set].sort((a, b) => a - b);
}

// { family, variable, weights } in the shape studio.config.js and brand/tokens.json take
export function roleSpec(font, role) {
  const weights = weightsFor(font.weights, role === 'display' ? DISPLAY_W : TEXT_W);
  return { family: font.family, ...(font.variable ? { variable: true } : {}), weights };
}

// Serif and display faces look best a step lighter than the 800 a geometric sans takes.
export function headlineWeight(font) {
  const want = font.category === 'sans-serif' ? 800 : 600;
  return weightsFor(font.weights, [want])[0];
}

export function parsePairs(str) {
  return String(str).split(',').map((s) => s.trim()).filter(Boolean).map((p, i) => {
    const [display, text] = p.split('/').map((x) => x.trim());
    return { id: i + 1, display, text: text || display };
  });
}

// pairs -> [{ id, label, display, text, headlineWeight, fonts }] + the npm commands for missing families
export function resolvePairs(pairs) {
  const missing = new Map();
  const out = pairs.map((p) => {
    const d = findFont(p.display);
    const t = findFont(p.text);
    for (const f of [d, t]) if (f.missing) missing.set(f.family, f);
    const label = `${d.family} / ${t.family}`;
    if (d.missing || t.missing) return { id: p.id, label, missing: true };
    return {
      id: p.id, label,
      display: roleSpec(d, 'display'), text: roleSpec(t, 'text'),
      headlineWeight: headlineWeight(d),
      about: { display: d.category, text: t.category, license: [...new Set([d.license, t.license].filter(Boolean))].join(' + ') },
    };
  });
  return { pairs: out, missing: [...missing.values()] };
}
