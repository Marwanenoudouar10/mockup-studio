// Node-side helpers: project root, CLI flags, config loading, output paths.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { normalize } from './config.js';
import { withTokens } from './tokens.js';
import { layoutFile, parseLayout } from './layout.js';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// --store appstore --locale en --panel 2 --out final --config studio.config.js  (also --key=value)
export function parseArgs(argv = process.argv.slice(2)) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const eq = a.indexOf('=');
    const k = eq < 0 ? a.slice(2) : a.slice(2, eq);
    if (eq >= 0) flags[k] = a.slice(eq + 1); // split at the first '=' only: --url=https://x.com/?a=b
    else if (argv[i + 1] && !argv[i + 1].startsWith('--')) flags[k] = argv[++i];
    else flags[k] = true;
  }
  return flags;
}

export const list = (v) => (v === undefined || v === true ? null : String(v).split(',').map((s) => s.trim()).filter(Boolean));

export function configPath(flags) {
  return String(flags.config || 'studio.config.js').replace(/^\.\//, '');
}

// draft: the brand step runs before any panel exists, so an empty panel list gets a placeholder.
export async function loadConfig(flags, { draft = false } = {}) {
  const rel = configPath(flags);
  const abs = path.resolve(ROOT, rel);
  if (!fs.existsSync(abs)) throw new Error(`Config not found: ${rel}`);
  if (path.relative(ROOT, abs).startsWith('..')) throw new Error('The config must live inside the project folder.');
  const mod = await import(`${pathToFileURL(abs).href}?t=${Date.now()}`);
  const tokens = readTokens(mod.default, { optional: draft });
  const merged = withTokens(mod.default, tokens);
  if (draft && !(merged.panels && merged.panels.length)) merged.panels = [{ headline: (merged.brand || {}).name, stage: [] }];
  const relPath = path.relative(ROOT, abs).split(path.sep).join('/');
  const cfg = normalize(merged);
  cfg.overrides = readLayout(relPath);
  return { cfg, raw: mod.default, tokens, rel: relPath };
}

// layout.json next to the config (scripts/lib/layout.js): position overrides from Store Studio, or null
export function readLayout(cfgRel) {
  const file = path.join(ROOT, layoutFile(cfgRel));
  if (!fs.existsSync(file)) return null;
  try {
    return parseLayout(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    console.warn(`  warn: ${layoutFile(cfgRel)} is not valid JSON (${err.message}): ignored`);
    return null;
  }
}

// brand.tokens: 'brand/tokens.json' (written by `npm run brand -- apply`) -> its JSON, or null.
export function readTokens(raw = {}, { optional = false } = {}) {
  const src = raw.brand && raw.brand.tokens;
  if (!src) return null;
  const file = path.resolve(ROOT, String(src));
  if (!fs.existsSync(file) && optional) return null;
  if (!fs.existsSync(file)) throw new Error(`brand.tokens: ${src} not found (run npm run brand -- apply, or remove brand.tokens)`);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`brand.tokens: ${src} is not valid JSON (${err.message})`);
  }
}

// final/ for the project's own config; another config (examples/web.config.js) writes to out/qa/<name>/
// unless --out says otherwise, so a test config never replaces images of the real set.
export function outDir(flags) {
  if (flags.out && flags.out !== true) return path.resolve(ROOT, String(flags.out));
  const cfg = configPath(flags);
  if (cfg === 'studio.config.js') return path.resolve(ROOT, 'final');
  return path.resolve(ROOT, 'out', 'qa', path.basename(cfg).replace(/(\.config)?\.m?js$/, ''));
}

export const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

export function kb(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

export function isMain(meta) {
  return process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === meta.url;
}

export function fail(err) {
  console.error(`\n  error: ${err && err.message ? err.message : err}\n`);
  process.exit(1);
}
