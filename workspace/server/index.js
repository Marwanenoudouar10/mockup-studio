// Store Studio: every store-screenshots project, live, on one canvas. Preview and drag only.
//   npm start -- [projects folder | project path ...] [--port 4400] [--forget <slug>] [--reset] [--state file]
// Paths are remembered in a per-user file (never in the skill folder, which may be shared or published):
//   ~/.config/store-studio/workspace.json ($XDG_CONFIG_HOME, or %APPDATA% on Windows), or --state <file>.
// A plain `npm start` then opens the same projects next time.
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Registry, discover } from './registry.js';
import { createApp } from './app.js';

export function defaultState(env = process.env) {
  const base = env.XDG_CONFIG_HOME || (process.platform === 'win32' && env.APPDATA) || path.join(os.homedir(), '.config');
  return path.join(base, 'store-studio', 'workspace.json');
}

function parseArgs(argv) {
  const out = { paths: [], port: 4400, state: defaultState() };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--port') out.port = Number(argv[++i]);
    else if (a.startsWith('--port=')) out.port = Number(a.slice(7));
    else if (a === '--state') out.state = path.resolve(argv[++i]);
    else if (a === '--forget') out.forget = argv[++i];
    else if (a === '--reset') out.reset = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else out.paths.push(a);
  }
  return out;
}

export async function start(argv, { log = console.log } = {}) {
  const args = parseArgs(argv);
  if (args.help) {
    log('npm start -- [projects folder | project paths] [--port 4400] [--forget <slug>] [--reset] [--state file]');
    log(`  remembered projects: ${args.state}`);
    return null;
  }
  if (!Number.isInteger(args.port) || args.port < 0 || args.port > 65535) throw new Error(`--port ${args.port}: not a port`);
  const registry = new Registry(args.state);
  if (args.reset) { registry.projects = []; registry.folders = []; }
  if (args.forget && !registry.forget(args.forget)) log(`  note: no project "${args.forget}" to forget`);
  for (const p of args.paths) {
    const abs = path.resolve(process.env.INIT_CWD || process.cwd(), p);
    const found = discover(abs);
    registry.addFolder(abs); // a folder of projects: new projects in it appear on the next page reload
    if (!found.length) log(`  note: no studio.config.js in ${p} yet (or two levels below it): projects made there later show up when you reload the page`);
    registry.add(found);
  }
  registry.save();
  const live = registry.live();
  const app = createApp(registry, { log });
  let port;
  try {
    port = await app.listen(args.port);
  } catch (err) {
    if (err.code !== 'EADDRINUSE') throw err;
    log(`  port ${args.port} is busy: using a free one`);
    port = await app.listen(0);
  }
  const url = `http://127.0.0.1:${port}/`;
  log(`\n  Store Studio  ->  ${url}\n`);
  if (!live.length) log('  no projects yet: npm start -- <folder with studio.config.js, or a folder of projects>\n');
  for (const p of live) log(`  ${p.slug.padEnd(22)} ${path.relative(process.cwd(), p.root) || '.'}`);
  log('\n  Watching their files. Ctrl+C to stop.\n');
  return { ...app, port, url, registry };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  start(process.argv.slice(2)).catch((err) => {
    console.error(`\n  error: ${err.message}\n`);
    process.exit(1);
  });
}
