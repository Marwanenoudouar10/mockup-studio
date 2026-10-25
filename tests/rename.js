// The rename from "store-screenshots" / "Store Studio" to "mockup-studio" / "Mockup Studio":   node tests/rename.js
// 1 no old name left in the code (js, json, html, css, gitignore), except the one-time migration and the old
//   localStorage key Mockup Studio reads once; --docs also checks the Markdown files
// 2 the state migration, in a temporary XDG_CONFIG_HOME (never the real ~/.config): the old project list is
//   copied to ~/.config/mockup-studio/ once (the old file stays), a second start does nothing, --state skips it
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { REPO, checker } from './lib/project.js';

const t = checker('rename');
const OLD = /store-screenshots|store[- ]studio/i; // the old names ("App Store screenshots" stays a phrase)
const ALLOW = {
  'workspace/server/state.js': /store-studio/, // the migration itself
  'workspace/server/index.js': /old ~\/\.config\/store-studio/, // its comment
  'workspace/ui/main.js': /'store-studio\.project'/, // the old localStorage key, read once
  'tests/rename.js': /./,
  'README.md': /store-screenshots|store-studio|Store Studio/, // the note for older installs
};

// the repo's files: git's list in a clone, else (a ZIP download) a walk of the folder without what .gitignore drops
function repoFiles() {
  try {
    return execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\n');
  } catch {
    const skip = new Set(['node_modules', '.git', 'final', 'out', 'raw']);
    const out = [];
    const walk = (dir) => {
      for (const d of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
        const rel = dir ? `${dir}/${d.name}` : d.name;
        if (d.isDirectory()) { if (!skip.has(d.name)) walk(rel); } else out.push(rel);
      }
    };
    walk('');
    return out;
  }
}

console.log('1. old names in the code');
const files = repoFiles()
  .filter((f) => f && !f.includes('node_modules/') && fs.existsSync(path.join(REPO, f)))
  .filter((f) => (process.argv.includes('--docs') ? /\.(m?js|json|html|css|md)$|\.gitignore$/ : /\.(m?js|json|html|css)$|\.gitignore$/).test(f))
  .filter((f) => !/\.(png|jpe?g)$/.test(f));
const hits = [];
for (const f of files) {
  fs.readFileSync(path.join(REPO, f), 'utf8').split('\n').forEach((line, i) => {
    if (OLD.test(line) && !(ALLOW[f] && ALLOW[f].test(line))) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 90)}`);
  });
}
t.ok(!hits.length, `${files.length} files: no old name outside the migration${process.argv.includes('--docs') ? ' (docs included)' : ' (code; --docs for the Markdown)'}`, hits.slice(0, 8).join('\n      '));
const pkg = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), 'utf8')).name;
t.ok(pkg('assets/template/package.json') === 'mockup-studio-project' && pkg('workspace/package.json') === 'mockup-studio-workspace', 'package names');

console.log('2. state migration (temporary XDG_CONFIG_HOME)');
const xdg = fs.mkdtempSync(path.join(os.tmpdir(), 'mockup-xdg-'));
const env = process.env.XDG_CONFIG_HOME;
process.env.XDG_CONFIG_HOME = xdg;
try {
  const { start } = await import(path.join(REPO, 'workspace/server/index.js'));
  const { defaultState, oldState } = await import(path.join(REPO, 'workspace/server/state.js'));
  t.ok(defaultState() === path.join(xdg, 'mockup-studio', 'workspace.json'), 'the state file is <config>/mockup-studio/workspace.json');
  const list = { projects: [{ slug: 'old-one', root: path.join(xdg, 'nowhere') }], folders: [] };
  fs.mkdirSync(path.dirname(oldState()), { recursive: true });
  fs.writeFileSync(oldState(), `${JSON.stringify(list, null, 2)}\n`);
  const run = async (args = []) => {
    const lines = [];
    const app = await start(['--port', '0', ...args], { log: (l) => lines.push(l) });
    await app.close();
    return lines.join('\n');
  };
  let log = await run();
  t.ok(/moved your project list from .*store-studio/.test(log), 'first start: one line says the list was moved', (log.match(/.*moved.*/) || [''])[0].trim());
  t.ok(JSON.parse(fs.readFileSync(defaultState(), 'utf8')).projects[0].slug === 'old-one', 'the projects came over');
  t.ok(fs.existsSync(oldState()), 'the old file stays (an older checkout keeps working)');
  log = await run();
  t.ok(!/moved/.test(log), 'second start: nothing to move');
  fs.rmSync(defaultState());
  log = await run(['--state', path.join(xdg, 'own.json')]);
  t.ok(!/moved/.test(log) && !fs.existsSync(defaultState()), '--state <file>: no migration');
  t.done();
} finally {
  if (env === undefined) delete process.env.XDG_CONFIG_HOME; else process.env.XDG_CONFIG_HOME = env;
  fs.rmSync(xdg, { recursive: true, force: true });
}
