// Reads the brand brief (briefs/brand-brief.md) for the boards. It takes "- **Field:** value" lines;
// HTML comments and unfilled values (TODO, ..., _x_) are ignored.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from '../../lib/cli.js';

const FIELDS = {
  name: 'Name', oneLiner: 'One-liner', audience: 'Audience', personality: 'Personality',
  category: 'Category', seed: 'Seed colour', mood: 'Mood', hero: 'Hero line',
};

const unfilled = (v) => !v || /^(todo|tbd|\.\.\.|_.*_|-)$/i.test(v);

export function readBrief(file = 'briefs/brand-brief.md') {
  const abs = path.join(ROOT, file);
  if (!fs.existsSync(abs)) return {};
  const text = fs.readFileSync(abs, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const out = {};
  for (const [key, label] of Object.entries(FIELDS)) {
    const m = text.match(new RegExp(`^\\s*[-*]\\s*\\**${label}[^:*\\n]*\\**\\s*:\\s*(.+)$`, 'im'));
    const v = m && m[1].replace(/\*\*/g, '').replace(/`/g, '').trim();
    if (!unfilled(v)) out[key] = v;
  }
  if (out.personality) out.personality = out.personality.split(/[,·/]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3);
  if (out.seed) out.seed = (out.seed.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i) || [null])[0];
  if (out.mood) out.mood = out.mood.split(/[\s,(]/)[0].toLowerCase();
  return out;
}

// Is a logo chosen for THIS project? Only after `apply --logo <id>` (tokens.source.logo), while the file exists,
// and when the tokens were made for this name (a copied template's tokens name its demo brand). Before that
// (the colour and font steps), the boards set the name as live text in the display face, so a client never
// sees another brand's lockup (the template's demo logo) on their boards.
export function logoReady(cfg, tokens, name = cfg.brand.name) {
  if (!tokens || !tokens.source || !tokens.source.logo || !cfg.brand.logo) return false;
  if (tokens.name && name && tokens.name !== name) return false;
  return fs.existsSync(path.join(ROOT, cfg.brand.logo));
}

// What the boards print on their sample store image: the brief's hero line, else the first panel.
export function sampleCopy(brief, cfg, tokens = null) {
  const p = cfg.panels && cfg.panels[0];
  const first = p && (typeof p.headline === 'object' ? p.headline[cfg.defaultLocale] || Object.values(p.headline)[0] : p.headline);
  const sub = cfg.panels && cfg.panels.find((x) => x.sub);
  const subText = sub && (typeof sub.sub === 'object' ? sub.sub[cfg.defaultLocale] || Object.values(sub.sub)[0] : sub.sub);
  return {
    name: brief.name || cfg.brand.name,
    logo: logoReady(cfg, tokens, brief.name || cfg.brand.name),
    oneLiner: brief.oneLiner || '',
    personality: brief.personality || [],
    headline: brief.hero || first || cfg.brand.name,
    sub: brief.oneLiner || subText || '',
  };
}
