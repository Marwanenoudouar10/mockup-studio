// Every repo test, one after another (each one starts its own single Chrome, never two at once):
//   node tests/all.js            rename, parity, edits, vector, checks   (about 5 minutes on an idle laptop)
// The workspace has its own end-to-end test: cd workspace && npm test (Mockup Studio on a random port).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const failed = [];
for (const t of ['rename', 'parity', 'edits', 'vector', 'checks']) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(HERE, `${t}.js`)], { stdio: 'inherit' });
  console.log(`  ${r.status === 0 ? 'passed' : 'FAILED'}: tests/${t}.js (${Math.round((Date.now() - t0) / 1000)}s)\n`);
  if (r.status !== 0) failed.push(t);
}
console.log(failed.length ? `failed: ${failed.join(', ')}` : 'all tests passed');
process.exit(failed.length ? 1 : 0);
