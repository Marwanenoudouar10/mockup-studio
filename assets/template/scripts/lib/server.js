// Tiny static file server for the project root (127.0.0.1, random free port by default).
// Pages are always opened over http so they can use ES modules, fetch() and node_modules fonts.
// Guards: the Host header must name this server (no DNS rebinding while `npm run preview` runs), and the
// login files of `npm run capture` (cookies*.json, headers*.json) are never served.
// GET /raw/index.json is virtual: every file under raw/, so the pages find screens without probing; a
// missing layout.json (no Store Studio moves yet) answers 204, so the browser console stays free of 404s.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
};

const SECRET = /^(cookies|headers)[^/]*\.json$/i;

// every file under raw/ (paths from the project root), for the engine's screen lookup
export function rawFiles(root, dir = 'raw', depth = 3) {
  const abs = path.join(root, dir);
  if (!depth || !fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true }).filter((d) => !d.name.startsWith('.')).flatMap((d) => (d.isDirectory()
    ? rawFiles(root, `${dir}/${d.name}`, depth - 1) : [`${dir}/${d.name}`]));
}

export function serve(root, { port = 0, host = '127.0.0.1', home = '/engine/gallery.html' } = {}) {
  const base = path.resolve(root);
  let bound = 0;
  const server = http.createServer((req, res) => {
    if (![`127.0.0.1:${bound}`, `localhost:${bound}`].includes(req.headers.host)) return send(res, 403, 'forbidden host');
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      return send(res, 400, 'bad url');
    }
    if (rel === '/') {
      res.writeHead(302, { Location: home });
      return res.end();
    }
    if (rel === '/raw/index.json') {
      const body = JSON.stringify({ files: rawFiles(base) });
      res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store' });
      return res.end(req.method === 'HEAD' ? undefined : body);
    }
    const file = path.join(base, rel);
    const inside = path.relative(base, file);
    if (inside.startsWith('..') || path.isAbsolute(inside)) return send(res, 403, 'forbidden');
    if (SECRET.test(path.basename(file))) return send(res, 403, 'forbidden: login file');
    fs.stat(file, (err, st) => {
      if ((err || !st.isFile()) && /(^|[/.])layout\.json$/.test(rel)) { // no moves yet: an empty answer, not a 404
        res.writeHead(204, { 'Cache-Control': 'no-store' });
        return res.end();
      }
      if (err || !st.isFile()) return send(res, 404, `not found: ${rel}`);
      res.writeHead(200, {
        'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': st.size,
        'Cache-Control': 'no-store',
      });
      if (req.method === 'HEAD') return res.end();
      fs.createReadStream(file).pipe(res);
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      const { port: p } = server.address();
      bound = p;
      resolve({
        origin: `http://${host}:${p}`,
        port: p,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

function send(res, code, text) {
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(text);
}
