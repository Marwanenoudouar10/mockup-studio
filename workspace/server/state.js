// Where Mockup Studio remembers its project list: a per-user file, never the skill folder (which may be
// shared or published, and the list holds local paths).
//   $XDG_CONFIG_HOME/mockup-studio/workspace.json, else ~/.config/mockup-studio/ (%APPDATA%\mockup-studio\ on Windows)
// One-time migration: the workspace was called "Store Studio" and kept the file in .../store-studio/. When the
// new file is missing and the old one exists, it is COPIED (an older checkout of the skill keeps working with
// its own copy) and one line is logged. An explicit --state <file> skips all of this.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const NAME = 'mockup-studio';
const OLD = 'store-studio';

function configBase(env = process.env) {
  return env.XDG_CONFIG_HOME || (process.platform === 'win32' && env.APPDATA) || path.join(os.homedir(), '.config');
}

export function defaultState(env = process.env) {
  return path.join(configBase(env), NAME, 'workspace.json');
}

export function oldState(env = process.env) {
  return path.join(configBase(env), OLD, 'workspace.json');
}

// -> true when the old project list was copied over
export function migrateState(file, { env = process.env, log = console.log } = {}) {
  if (file !== defaultState(env) || fs.existsSync(file)) return false;
  const old = oldState(env);
  if (!fs.existsSync(old)) return false;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.copyFileSync(old, file, fs.constants.COPYFILE_EXCL);
  } catch (err) {
    if (err.code === 'EEXIST') return false;
    log(`  warn: could not copy ${old} (${err.message}): starting with an empty project list`);
    return false;
  }
  const shown = path.dirname(old).replace(os.homedir(), '~');
  log(`  moved your project list from ${shown}/ (the old folder can be deleted)`);
  return true;
}
