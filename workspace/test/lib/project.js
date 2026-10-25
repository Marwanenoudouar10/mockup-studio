// Test helpers on the project side: keep its layout.json / notes.json / edits.json safe, run its scripts, compare PNGs.
// Uses the project's own node_modules (puppeteer-core, pngjs), so Mockup Studio itself needs no dependency.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

export function projectTools(root) {
  const require = createRequire(path.join(root, 'package.json'));
  let PNG;
  try {
    ({ PNG } = require('pngjs'));
  } catch {
    throw new Error(`run npm install in ${root} first (the test uses its puppeteer-core and pngjs)`);
  }
  const files = ['layout.json', 'notes.json', 'edits.json'];
  const saved = {};

  return {
    root,
    launchChrome: async () => (await import(pathToFileURL(path.join(root, 'scripts/lib/chrome.js')).href)).launchChrome(),
    read: (rel) => (fs.existsSync(path.join(root, rel)) ? JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')) : null),
    write: (rel, data) => fs.writeFileSync(path.join(root, rel), `${JSON.stringify(data, null, 2)}\n`),

    // set aside what the person had, start clean; restore() puts it back exactly
    backup() {
      for (const f of files) {
        const p = path.join(root, f);
        saved[f] = fs.existsSync(p) ? fs.readFileSync(p) : null;
        fs.rmSync(p, { force: true });
      }
    },
    restore() {
      for (const f of files) {
        const p = path.join(root, f);
        if (saved[f]) fs.writeFileSync(p, saved[f]);
        else fs.rmSync(p, { force: true });
      }
    },

    // a fresh clone ships no captures (the template's raw/ is generated): npm run screens once, if needed
    ensureScreens() {
      const raw = path.join(root, 'raw');
      const empty = !fs.existsSync(raw) || !fs.readdirSync(raw).some((d) => !d.startsWith('.'));
      if (!empty || !fs.existsSync(path.join(root, 'screens'))) return false;
      const r = spawnSync(process.execPath, ['scripts/screens.js'], { cwd: root, encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`npm run screens failed:\n${r.stdout}\n${r.stderr}`);
      return true;
    },

    // npm run <name> in the project, sequential (each its own single Chrome)
    script(name, args = []) {
      const r = spawnSync(process.execPath, [`scripts/${name}.js`, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
      if (r.status !== 0) throw new Error(`${name} failed:\n${r.stdout}\n${r.stderr}`);
      return r.stdout;
    },
    render(out, args = []) {
      return this.script('render', ['--out', out, ...args]);
    },

    // pixels that differ between two PNGs, and their bounding box; rect (image px { cx, cy, w, h }): only there
    diff(a, b, rect = null) {
      const A = PNG.sync.read(fs.readFileSync(path.join(root, a)));
      const B = PNG.sync.read(fs.readFileSync(path.join(root, b)));
      if (A.width !== B.width || A.height !== B.height) throw new Error(`${a} and ${b} differ in size`);
      let n = 0;
      const box = { x0: Infinity, y0: Infinity, x1: -1, y1: -1 };
      const inRect = (x, y) => !rect || (Math.abs(x - rect.cx) <= rect.w / 2 && Math.abs(y - rect.cy) <= rect.h / 2);
      for (let i = 0; i < A.data.length; i += 4) {
        if (rect && !inRect((i / 4) % A.width, Math.floor(i / 4 / A.width))) continue;
        const d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
        if (d <= 24) continue;
        n++;
        const p = i / 4;
        const x = p % A.width;
        const y = Math.floor(p / A.width);
        box.x0 = Math.min(box.x0, x); box.y0 = Math.min(box.y0, y); box.x1 = Math.max(box.x1, x); box.y1 = Math.max(box.y1, y);
      }
      return { n, box };
    },
    clean: (rel) => fs.rmSync(path.join(root, rel), { recursive: true, force: true }),
  };
}

// poll fn() until it returns a truthy value (no fixed sleeps)
export async function until(fn, what, timeout = 8000) {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() - t0 > timeout) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

// a temporary copy of a project (the template's demo by default in test/e2e.js), so a test never writes into the
// original: its node_modules is a symlink to the original's, its out/, final/ and Studio files are left out.
// KEEP=1 keeps the copy (its path is printed).
export function tempCopy(src) {
  if (!fs.existsSync(path.join(src, 'node_modules'))) throw new Error(`run npm install in ${src} first`);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mockup-studio-e2e-'));
  for (const e of fs.readdirSync(src)) {
    if (['node_modules', 'final', 'out', '.git'].includes(e) || /^(layout|edits|notes)\.json$/.test(e)) continue;
    fs.cpSync(path.join(src, e), path.join(root, e), { recursive: true });
  }
  fs.symlinkSync(path.join(src, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  return { root, rm: () => (process.env.KEEP ? console.log(`  kept ${root}`) : fs.rmSync(root, { recursive: true, force: true })) };
}
