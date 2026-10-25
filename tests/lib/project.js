// Temporary project copies for the repo tests: never the template itself, never a real project.
//   tempProject(name, { from }) -> { root, run(script, args), rm() }
//   a copy of the template (or `from`) in the OS temp folder, without node_modules / final / out (node_modules is
//   a symlink to the template's own), so renders, edits and bakes never touch the original files. KEEP=1 keeps it.
// Every command runs one after another, each with its own single Chrome (the scripts' rule).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const TEMPLATE = path.join(REPO, 'assets', 'template');
const SKIP = new Set(['node_modules', 'final', 'out', '.git']);

export function tempProject(name, { from = TEMPLATE, raw = true } = {}) {
  if (!fs.existsSync(path.join(TEMPLATE, 'node_modules'))) throw new Error(`run npm install in ${TEMPLATE} first`);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `mockup-${name}-`));
  for (const e of fs.readdirSync(from)) {
    if (SKIP.has(e) || (!raw && e === 'raw') || /^(layout|edits|notes)\.json$/.test(e)) continue;
    fs.cpSync(path.join(from, e), path.join(root, e), { recursive: true });
  }
  fs.symlinkSync(path.join(TEMPLATE, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  return {
    root,
    file: (rel) => path.join(root, rel),
    read: (rel) => fs.readFileSync(path.join(root, rel), 'utf8'),
    write: (rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); },
    exists: (rel) => fs.existsSync(path.join(root, rel)),
    // node scripts/<script>.js args... -> { ok, out } (stdout + stderr)
    run(script, args = [], { allowFail = false } = {}) {
      const r = spawnSync(process.execPath, [`scripts/${script}.js`, ...args], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
      const out = `${r.stdout}${r.stderr}`;
      if (r.status !== 0 && !allowFail) throw new Error(`${script} ${args.join(' ')} failed:\n${out.slice(-3000)}`);
      return { ok: r.status === 0, out };
    },
    // KEEP=1 node tests/x.js keeps the copy to look at (its path is printed)
    rm: () => (process.env.KEEP ? console.log(`  kept ${root}`) : fs.rmSync(root, { recursive: true, force: true })),
  };
}

// a tiny test runner: ok(cond, msg) counts and prints; fail stops with the message
export function checker(title) {
  let passed = 0;
  console.log(title);
  return {
    ok(cond, msg, detail = '') {
      if (!cond) throw new Error(`FAIL: ${msg}${detail ? ` (${detail})` : ''}`);
      passed++;
      console.log(`  ok  ${msg}${detail ? `  ${detail}` : ''}`);
    },
    note: (msg) => console.log(`      ${msg}`),
    done: () => console.log(`  ${passed} checks passed`),
  };
}
