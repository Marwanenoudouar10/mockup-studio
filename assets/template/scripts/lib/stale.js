// Output the config no longer makes: a locale or target dropped from the config, or the demo's renders in
// a new project. Such folders would end up in the delivery zip, so export removes them before rendering
// (pruneStale) and validate warns about any it finds (staleOutputs).
//   <out>/<locale>/                         a locale not in `locales`
//   <out>/<locale>/<target>/                a known target id the config does not render (not in `stores`,
//                                           or no panel for it); playstore stays while `feature` is set
//   <out>/<locale>/overview-<target>.jpg    the sheet of such a target
//   <out>/icons/<store icon>                an icon for a store the config has no target for (stores.js iconsFor)
//   <out>/vector|portfolio/<locale>/<target>/NN.*   a numbered file beyond the target's image count (a set that
//                                           shrank from 5 images to 3 leaves 04 and 05 behind)
// The same inside <out>/portfolio/ and <out>/vector/. Folders that are not locale or target names are left alone.
// staleHires: portfolio copies older than their upload image (a 1x export after a --scale 2 one): the
// sheets skip them and validate warns, so an old layout never reaches a sheet or a portfolio.
import fs from 'node:fs';
import path from 'node:path';
import { STORES, ICONS, iconsFor } from './stores.js';
import { panelsFor } from './config.js';
import { rel } from './cli.js';

const RESERVED = new Set(['icons', 'brand', 'portfolio', 'vector']);
const LOCALE = /^[a-z]{2,3}([-_][A-Za-z0-9]{2,8})*$/;

export function renderedTargets(cfg) {
  const ids = new Set(cfg.stores.filter((st) => panelsFor(cfg, st).length).map((s) => s.id));
  if (cfg.feature) ids.add('playstore');
  return ids;
}

// -> [{ file (absolute), why }]
export function staleOutputs(cfg, out) {
  const found = [];
  const targets = renderedTargets(cfg);
  const known = (id) => !!STORES[id] || cfg.stores.some((s) => s.id === id);
  const scan = (root) => {
    if (!fs.existsSync(root)) return;
    for (const d of fs.readdirSync(root, { withFileTypes: true })) {
      if (!d.isDirectory() || RESERVED.has(d.name) || !LOCALE.test(d.name)) continue;
      const ldir = path.join(root, d.name);
      if (!cfg.locales.includes(d.name)) {
        found.push({ file: ldir, why: `locale "${d.name}" is not in the config` });
        continue;
      }
      for (const f of fs.readdirSync(ldir, { withFileTypes: true })) {
        const sheet = /^overview-(.+)\.(jpe?g|png)$/i.exec(f.name);
        const id = f.isDirectory() ? f.name : sheet && sheet[1];
        if (id && known(id) && !targets.has(id)) found.push({ file: path.join(ldir, f.name), why: `target "${id}" is not rendered by the config` });
      }
    }
  };
  scan(out);
  scan(path.join(out, 'portfolio'));
  scan(path.join(out, 'vector'));
  for (const sub of ['vector', 'portfolio']) found.push(...beyondCount(cfg, path.join(out, sub), new Set(found.map((f) => f.file))));
  const need = new Set(iconsFor(cfg).map((i) => i.file));
  for (const i of ICONS) {
    const file = path.join(out, 'icons', i.file);
    if (!need.has(i.file) && fs.existsSync(file)) found.push({ file, why: `the config has no ${i.key === 'playstore-icon' ? 'Google Play' : 'App Store'} target` });
  }
  return found;
}

// how many images a target renders (render.js storePanels: a one-image target shows its first panel)
const imageCount = (cfg, st) => Math.min(panelsFor(cfg, st).length, st.max === 1 ? 1 : Infinity);

function beyondCount(cfg, root, gone) {
  const found = [];
  if (!fs.existsSync(root)) return found;
  for (const locale of fs.readdirSync(root)) {
    const ldir = path.join(root, locale);
    if (gone.has(ldir) || !cfg.locales.includes(locale) || !fs.statSync(ldir).isDirectory()) continue;
    for (const st of cfg.stores) {
      const dir = path.join(ldir, st.id);
      if (gone.has(dir) || !fs.existsSync(dir)) continue;
      const n = imageCount(cfg, st);
      for (const f of fs.readdirSync(dir)) {
        const m = /^(\d+)\.(svg|pdf|png|jpe?g)$/i.exec(f);
        if (m && Number(m[1]) > n) found.push({ file: path.join(dir, f), why: `image ${m[1]} of ${st.id}: the config makes ${n}` });
      }
    }
  }
  return found;
}

export function pruneStale(cfg, out) {
  const found = staleOutputs(cfg, out);
  for (const f of found) {
    fs.rmSync(f.file, { recursive: true, force: true });
    console.log(`  removed ${rel(f.file)} (${f.why})`);
  }
  return found.length;
}

const IMG = /^\d+\.(png|jpe?g)$/i;

// -> [file names] of portfolio copies that are older than (or have no) upload image, for one store
export function staleHires(out, locale, id) {
  const up = path.join(out, locale, id);
  const hi = path.join(out, 'portfolio', locale, id);
  if (!fs.existsSync(hi)) return [];
  const mtime = (f) => (fs.existsSync(f) ? fs.statSync(f).mtimeMs : null);
  return fs.readdirSync(hi).filter((f) => IMG.test(f)).filter((f) => {
    const u = mtime(path.join(up, f));
    return u === null || mtime(path.join(hi, f)) < u - 1000;
  });
}
