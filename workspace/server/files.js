// Static files: the workspace UI (ui/) and each project's root (/p/<slug>/...). Never outside the root:
// the decoded path is resolved and must stay inside it (403 otherwise). No caching, so edits show at once.
import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
};

export function send(res, code, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(body);
}

export const sendJson = (res, code, data) => send(res, code, JSON.stringify(data), 'application/json; charset=utf-8');

// rel: the URL path below the root, still percent-encoded
export function serveFile(req, res, root, rel) {
  let decoded;
  try {
    decoded = decodeURIComponent(rel);
  } catch {
    return send(res, 400, 'bad url');
  }
  if (decoded.includes('\0')) return send(res, 400, 'bad url');
  const base = path.resolve(root);
  const file = path.resolve(base, `.${path.posix.sep}${decoded.replace(/^\/+/, '')}`);
  const inside = path.relative(base, file);
  if (inside.startsWith('..') || path.isAbsolute(inside)) return send(res, 403, 'forbidden');
  if (/^(cookies|headers)[^/]*\.json$/i.test(path.basename(file))) return send(res, 403, 'forbidden: login file');
  fs.stat(file, (err, st) => {
    if ((err || !st.isFile()) && /(^|[/.])layout\.json$/.test(decoded)) { // no moves yet: empty, not a 404
      res.writeHead(204, { 'Cache-Control': 'no-store' });
      return res.end();
    }
    if (err || !st.isFile()) return send(res, 404, `not found: ${decoded}`);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    if (req.method === 'HEAD') return res.end();
    // the file can vanish between stat and open (layout.json reset, atomic rewrites): never crash the server
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
}

// every file under raw/ (paths from the project root): the engine's screen lookup (GET /p/<slug>/raw/index.json)
export function rawFiles(root, dir = 'raw', depth = 3) {
  const abs = path.join(root, dir);
  if (!depth || !fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).filter((d) => !d.name.startsWith('.')).flatMap((d) => (d.isDirectory()
    ? rawFiles(root, `${dir}/${d.name}`, depth - 1) : [`${dir}/${d.name}`]));
}

// the captures a project has: raw/<platform>/<name>.<ext> (top level of each platform folder)
export function listScreens(root) {
  const out = {};
  const raw = path.join(root, 'raw');
  if (!fs.existsSync(raw)) return out;
  for (const d of fs.readdirSync(raw, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const names = fs.readdirSync(path.join(raw, d.name))
      .filter((f) => /\.(png|jpe?g|webp)$/i.test(f) && !f.startsWith('.'))
      .map((f) => ({ name: f.replace(/\.\w+$/, ''), file: `raw/${d.name}/${f}` }));
    if (names.length) out[d.name] = names;
  }
  return out;
}

export const exists = (root, rel) => fs.existsSync(path.join(root, rel));
