// Palette options from ONE seed colour, worked out in OKLCH. Each option is a complete brand palette
// (the engine's six colours + onField, a tint ramp, neutrals, UI tokens for the kit) with its WCAG checks.
// Three directions, so the client compares three real looks, not three shades of one:
//   drenched  the seed itself as a full-bleed gradient field (the loudest in search results)
//   night     a near-black field lit by the seed (premium; suits dark screens)
//   paper     warm paper with soft colour light, the seed darkened into an ink accent (editorial)
// The mood sets chroma, paper warmth and the hue harmony that gives each option its accent.
// look 'dark' swaps the three directions for three DARK ones (night, graphite, deep) for a dark-first brief;
// accent '#hex' pins the accent (a client's real accent, or a chosen electric lime) instead of deriving it.
// Every option also carries dark app surfaces (ui.bgDark, surfaceDark, raisedDark) for dark mock screens.
// Pure ESM (no Node imports).
import { toOklch, oklch, contrast, mix, level, rot, turn, normHex } from './color.js';

const acc = (name, o) => ({ name, ...o });
export const MOODS = {
  balanced: { chroma: 1, accentL: 0.84, accentC: 0.15, paperC: 0.01,
    accents: [acc('split complement', { rot: 150 }), acc('complement', { rot: 180 }), acc('analogous', { rot: -50 })] },
  calm: { chroma: 0.72, accentL: 0.86, accentC: 0.1, paperC: 0.012,
    accents: [acc('analogous', { rot: 45 }), acc('split complement', { rot: 150 }), acc('analogous', { rot: -45 })] },
  bold: { chroma: 1.15, accentL: 0.83, accentC: 0.19, paperC: 0.008,
    accents: [acc('complement', { rot: 180 }), acc('triad', { rot: 120 }), acc('split complement', { rot: -150 })] },
  warm: { chroma: 0.95, accentL: 0.84, accentC: 0.14, paperH: 75, paperC: 0.014,
    accents: [acc('amber', { hue: 70 }), acc('coral', { hue: 38 }), acc('honey', { hue: 88 })] },
  fresh: { chroma: 1.05, accentL: 0.87, accentC: 0.15, paperH: 195, paperC: 0.008, lift: 0.03,
    accents: [acc('triad', { rot: 120 }), acc('triad', { rot: -120 }), acc('analogous', { rot: 60 })] },
  serious: { chroma: 0.6, accentL: 0.8, accentC: 0.09, paperC: 0.006, lift: -0.06,
    accents: [acc('gold', { hue: 85 }), acc('complement', { rot: 180, c: 0.06 }), acc('tonal', { rot: 25 })] },
  // a vivid, light accent that glows on a dark field (fintech, pro tools, music)
  electric: { chroma: 1.1, accentL: 0.9, accentC: 0.21, paperC: 0.008,
    accents: [acc('lime', { hue: 128 }), acc('mint', { hue: 165 }), acc('complement', { rot: 180 })] },
};

const STEPS = { 50: 0.975, 100: 0.945, 200: 0.89, 300: 0.81, 400: 0.72, 500: 0.63, 600: 0.54, 700: 0.45, 800: 0.36, 900: 0.27 };
const bell = (l) => 0.3 + 0.7 * Math.max(0, 1 - ((l - 0.6) / 0.45) ** 2);
const scale = (c, h, shape = true) => Object.fromEntries(Object.entries(STEPS).map(([k, l]) => [k, oklch(l, shape ? c * bell(l) : c, h)]));

// darker reads cooler for most hues; reds, oranges and yellows deepen toward red instead of olive
const deepen = (h, d) => (h >= 20 && h <= 120 ? rot(h, -d) : rot(h, Math.sign(turn(h, 265)) * d));

const DIRECTIONS = [
  {
    key: 'drenched', label: 'Drenched', field: 'gradient',
    why: 'Your colour as a full-bleed gradient. The loudest option in a search results page.',
    build: (s, m, seed) => ({
      primary: seed,
      secondary: oklch(s.l - 0.13, s.c * m.chroma, deepen(s.h, 8)),
      deep: oklch(0.25, s.c * 0.55 * m.chroma, deepen(s.h, 16)),
    }),
  },
  {
    key: 'night', label: 'Night', field: 'dark',
    why: 'A near-black field lit by your colour. Premium, and made for dark-mode screens.',
    build: (s, m) => ({
      // yellows only read as yellow when light, so they keep more of their lightness
      primary: oklch(Math.min(s.h > 75 && s.h < 120 ? 0.84 : 0.66, Math.max(0.52, s.l + (m.lift || 0))), s.c * m.chroma * 1.05, s.h),
      secondary: oklch(0.46, s.c * m.chroma, rot(s.h, 28)),
      deep: oklch(0.2, s.c * 0.45, deepen(s.h, 10)),
    }),
  },
  {
    key: 'paper', label: 'Paper', field: 'mesh',
    why: 'Warm paper with soft colour light; your colour turns into ink. Editorial and quiet.',
    build: (s, m, seed, paper) => {
      let l = Math.min(s.l, 0.52) + Math.min(0, m.lift || 0);
      let primary = oklch(l, s.c * m.chroma, s.h);
      while (contrast(primary, paper) < 4.5 && l > 0.2) {
        l -= 0.02;
        primary = oklch(l, s.c * m.chroma, s.h);
      }
      return { primary, secondary: oklch(0.72, s.c * 0.8 * m.chroma, rot(s.h, 30)), deep: oklch(0.27, s.c * 0.5, s.h) };
    },
  },
];

const nightPrimary = (s, m, h = s.h) => oklch(Math.min(h > 75 && h < 120 ? 0.84 : 0.66, Math.max(0.52, s.l + (m.lift || 0))), s.c * m.chroma * 1.05, h);

// look 'dark': three dark directions, each lit by the seed, with the second glow kept near the seed's hue
// (a +28 degree secondary turns every blue seed violet)
const DARK = [
  { key: 'night', label: 'Night', field: 'dark', why: 'A near-black field lit by your colour. Premium, and made for dark-mode screens.',
    build: (s, m) => ({ primary: nightPrimary(s, m), secondary: oklch(0.46, s.c * m.chroma, rot(s.h, 12)), deep: oklch(0.2, s.c * 0.45, deepen(s.h, 10)) }) },
  { key: 'graphite', label: 'Graphite', field: 'dark', why: 'Neutral graphite, your colour only as light. The quietest dark option.',
    build: (s, m) => ({ primary: nightPrimary(s, m), secondary: oklch(0.4, s.c * 0.55 * m.chroma, s.h), deep: oklch(0.19, 0.012, s.h) }) },
  { key: 'deep', label: 'Deep', field: 'dark', why: 'A deeper, cooler night that leans to the next hue. Rich, still calm.',
    build: (s, m) => ({ primary: nightPrimary(s, m, rot(s.h, -14)), secondary: oklch(0.42, s.c * m.chroma, rot(s.h, -8)), deep: oklch(0.18, s.c * 0.5, rot(s.h, -24)) }) },
];

// What sits behind the headline for each field preset (engine/styles/field.css), approximately.
function fieldTone(c, field) {
  const night = mix(c.deep, '#07070B', 0.55);
  if (field === 'dark') return { top: mix(night, c.primary, 0.32), text: '#FFFFFF', em: c.accent, sub: mix('#FFFFFF', c.accent, 0.18) };
  if (field === 'light' || field === 'mesh') {
    return { top: mix(c.paper, c.primary, field === 'mesh' ? 0.16 : 0.06), text: c.ink, em: c.primary, sub: mix(c.ink, c.paper, 0.34) };
  }
  return { top: c.primary, text: c.onField, em: c.accent, sub: mix(c.onField, c.accent, 0.18) };
}

export function checks(c, ui, field) {
  const f = fieldTone(c, field);
  const rows = [
    ['Headline on field', f.text, f.top, 3],
    ['Accent word on field', f.em, f.top, 3],
    ['Sub line on field', f.sub, f.top, 4.5],
    ['Button label on tint', ui.onTint, ui.tint, 4.5],
    ['Tint text on paper', ui.tint, c.paper, 4.5],
    ['Body text on paper', c.ink, c.paper, 4.5],
    ['Badge text on accent', c.ink, c.accent, 4.5],
  ];
  // a dark field usually means a dark app: check the accent and the text where the app shows them
  if (field === 'dark' && ui.surfaceDark) {
    rows.push(['Accent on dark app surface', c.accent, ui.surfaceDark, 4.5], ['Text on dark app surface', '#FFFFFF', ui.surfaceDark, 4.5]);
  }
  return rows.map(([label, fg, bg, need]) => {
    const ratio = Math.round(contrast(fg, bg) * 100) / 100;
    return { label, fg, bg, need, ratio, level: level(ratio), pass: ratio >= need };
  });
}

// The accent word must read on the field: lighten it (or darken it, on a light drenched field) until
// it reaches 3:1 there and the accent-tinted sub line reaches 4.5:1.
function fitAccent(colors, field, m, a, s) {
  const h = a.hue ?? rot(s.h, a.rot);
  const c = a.c ?? m.accentC;
  if (field === 'mesh' || field === 'light') return oklch(m.accentL, c, h);
  const dark = colors.onField !== '#FFFFFF';
  const top = fieldTone({ ...colors, accent: '#FFFFFF' }, field).top;
  const subToo = !dark && contrast(colors.onField, top) >= 4.7; // else no accent can save the sub line
  const ok = (hex) => contrast(hex, top) >= 3 && (!subToo || contrast(fieldTone({ ...colors, accent: hex }, field).sub, top) >= 4.5);
  let l = dark ? 0.45 : m.accentL;
  let hex = oklch(l, c, h);
  while (!ok(hex) && l > 0.2 && l < 0.95) {
    l += dark ? -0.01 : 0.01;
    hex = oklch(l, c, h);
  }
  return hex;
}

function uiOf(colors, ramp, m, paperH) {
  const tint = [colors.primary, ramp[500], ramp[600], ramp[700], ramp[800]].find((x) => contrast('#FFFFFF', x) >= 4.5) || ramp[800];
  const d = toOklch(colors.deep);
  const dc = Math.min(0.05, d.c * 0.7);
  return { tint, tint2: ramp[300], onTint: '#FFFFFF', bg: oklch(0.962, m.paperC, paperH),
    bgDark: oklch(0.15, dc, d.h), surfaceDark: oklch(0.21, dc, d.h), raisedDark: oklch(0.27, dc, d.h) };
}

export function generate(seedHex, { mood = 'balanced', count = 3, look = null, accent = null } = {}) {
  const m = MOODS[mood];
  if (!m) throw new Error(`unknown mood "${mood}" (use ${Object.keys(MOODS).join(', ')})`);
  if (look && look !== 'dark') throw new Error(`unknown look "${look}" (use dark, or leave it out for drenched, night, paper)`);
  const dirs = look === 'dark' ? DARK : DIRECTIONS;
  const pinned = accent ? normHex(accent) : null;
  const seed = normHex(seedHex);
  const s = toOklch(seed);
  const paperH = m.paperH ?? s.h;
  const paper = oklch(0.975, m.paperC, paperH);
  const ink = oklch(0.2, Math.min(0.04, s.c * 0.25), s.h);
  return dirs.slice(0, Math.max(1, Math.min(3, count))).map((d, i) => {
    const a = pinned ? acc('your accent', {}) : m.accents[i];
    const colors = { ...d.build(s, m, seed, paper), accent: null, ink, paper };
    colors.onField = d.field === 'gradient' && contrast('#FFFFFF', colors.primary) < 3 ? ink : '#FFFFFF';
    colors.accent = pinned || fitAccent(colors, d.field, m, a, s);
    const p = toOklch(colors.primary);
    const ramp = scale(p.c, p.h);
    const ui = uiOf(colors, ramp, m, paperH);
    return {
      id: i + 1, key: d.key, name: `${d.label} · ${a.name}`, field: d.field, why: d.why,
      colors, ramp, neutrals: scale(Math.min(0.018, m.paperC + 0.004), paperH, false), ui,
      checks: checks(colors, ui, d.field),
    };
  });
}
