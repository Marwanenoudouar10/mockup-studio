// Watches the files that change what a project's images look like and reports them, batched:
//   onChange({ kinds: ['config'|'layout'|'notes'|'brand'|'screens'|'raw'|'briefs'|'engine'], files: [...] })
// The root folder is watched flat (studio.config.js, layout.json, notes.json); the folders below recursively.
// Where recursive fs.watch is missing (Linux before Node 20) every subfolder gets its own watcher.
import fs from 'node:fs';
import path from 'node:path';

const FOLDERS = ['brand', 'screens', 'raw', 'briefs', 'engine', 'scripts'];
const ROOT_FILES = { 'studio.config.js': 'config', 'layout.json': 'layout', 'notes.json': 'notes' };
const IGNORE = /(^|[\\/])(\.|node_modules|out|final)|\.bake-check-|~$|\.tmp$|\.swp$/;

function kindOf(rel) {
  if (ROOT_FILES[rel]) return ROOT_FILES[rel];
  const top = rel.split(/[\\/]/)[0];
  if (top === 'brand') return /tokens\.json$/.test(rel) ? 'config' : 'brand';
  if (top === 'scripts') return 'engine';
  return FOLDERS.includes(top) ? top : null;
}

function watchTree(dir, cb, watchers) {
  try {
    // a watched folder can be deleted (raw/ re-captured, out/ cleaned): log nothing, never crash
    watchers.push(fs.watch(dir, { recursive: true }, (ev, f) => f && cb(path.join(dir, String(f)))).on('error', () => {}));
    return;
  } catch (err) {
    if (err.code !== 'ERR_FEATURE_UNAVAILABLE_ON_PLATFORM' && err.code !== 'ERR_INVALID_ARG_VALUE') throw err;
  }
  const walk = (d) => {
    try {
      watchers.push(fs.watch(d, (ev, f) => {
        if (!f) return;
        const full = path.join(d, String(f));
        cb(full);
        try { if (ev === 'rename' && fs.statSync(full).isDirectory()) walk(full); } catch { /* gone again */ }
      }).on('error', () => {}));
      for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory() && !IGNORE.test(e.name)) walk(path.join(d, e.name));
    } catch {
      // folder vanished while walking
    }
  };
  walk(dir);
}

// isOwnWrite(rel): true when the file now holds exactly what the workspace itself wrote (no reload needed)
export function watchProject(root, onChange, { isOwnWrite = () => false, delay = 120 } = {}) {
  const watchers = [];
  let pending = new Set();
  let timer = null;
  const flush = () => {
    timer = null;
    const files = [...pending].filter((rel) => !isOwnWrite(rel));
    pending = new Set();
    const kinds = [...new Set(files.map(kindOf).filter(Boolean))];
    if (kinds.length) onChange({ kinds, files });
  };
  const hit = (full) => {
    const rel = path.relative(root, full).split(path.sep).join('/');
    if (!rel || rel.startsWith('..') || IGNORE.test(rel) || !kindOf(rel)) return;
    pending.add(rel);
    clearTimeout(timer);
    timer = setTimeout(flush, delay);
  };
  watchers.push(fs.watch(root, (ev, f) => f && ROOT_FILES[String(f)] && hit(path.join(root, String(f)))).on('error', () => {}));
  for (const f of FOLDERS) {
    const dir = path.join(root, f);
    if (fs.existsSync(dir)) watchTree(dir, hit, watchers);
  }
  return { close: () => { clearTimeout(timer); for (const w of watchers) w.close(); } };
}
