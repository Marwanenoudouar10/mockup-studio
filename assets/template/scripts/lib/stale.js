// Output the config no longer makes: a locale or target dropped from the config, or the demo's renders in
// a new project. Such folders would end up in the delivery zip, so export removes them before rendering
// (pruneStale) and validate warns about any it finds (staleOutputs).
//   <out>/<locale>/                         a locale not in `locales`
//   <out>/<locale>/<target>/                a known target id the config does not render (not in `stores`,
//                                           or no panel for it); playstore stays while `feature` is set
//   <out>/<locale>/overview-<target>.jpg    the sheet of such a target
// The same inside <out>/portfolio/. Folders that are not locale or target names are left alone.
import fs from 'node:fs';
import path from 'node:path';
import { STORES } from './stores.js';
import { panelsFor } from './config.js';
import { rel } from './cli.js';

const RESERVED = new Set(['icons', 'brand', 'portfolio']);
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
