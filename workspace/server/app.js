// The Mockup Studio server (node:http only). Routes:
//   GET  /                      the workspace UI (ui/index.html), /ui/... its files
//   GET  /p/<slug>/...          a registered project's root (its own engine pages, raw/, brand/, node_modules fonts);
//                               /p/<slug>/raw/index.json lists raw/ so the engine finds screens without 404 probes,
//                               /p/<slug>/screens/index.json the mock screen pages (live screens, editable projects)
//   GET  /node_modules/... etc. a root-absolute path asked for by a project page (a mock screen's /brand/tokens.json,
//                               its fonts): 307 into the project the Referer names (registered projects only)
//   GET  /api/projects          [{ slug, folder }] (searches remembered folders of projects again first)
//   GET  /api/project/<slug>    { screens, layout, notes, edits, board } (what the browser cannot list itself)
//   GET  /api/events            Server-Sent Events: { slug, kinds, files } when a project's files change
//   POST /api/layout            { slug, entries, adds }  -> layout.json (see server/store.js)
//   POST /api/notes             { slug, op, note }       -> notes.json
//   POST /api/edits             { slug, screens, copy, stage } -> edits.json (see server/edits-store.js)
// Binds 127.0.0.1. Every request must name this server in Host (no DNS rebinding); a POST must be JSON from
// this origin, so no other web page can write into a project.
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { send, sendJson, serveFile, listScreens, rawFiles, screenPages, exists } from './files.js';
import { patchLayout, patchNotes, readLayout, readNotes, isOwnWrite } from './store.js';
import { patchEdits, readEdits } from './edits-store.js';
import { watchProject } from './watch.js';

const UI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ui');

function readBody(req, limit = 1 << 20) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('body too large'), { status: 413 })); req.destroy(); } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch {
        reject(Object.assign(new Error('invalid JSON'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

export function createApp(registry, { log = console.log } = {}) {
  const clients = new Set();
  const watchers = new Map();
  let port = 0;

  const broadcast = (data) => {
    const line = `data: ${JSON.stringify(data)}\n\n`;
    for (const res of clients) res.write(line);
  };
  const watchAll = () => {
    for (const p of registry.live()) {
      if (watchers.has(p.slug)) continue;
      try {
        watchers.set(p.slug, watchProject(p.root, (change) => broadcast({ slug: p.slug, ...change }), {
          isOwnWrite: (rel) => isOwnWrite(p.root, rel),
        }));
      } catch (err) {
        log(`  warn: cannot watch ${p.slug}: ${err.message}`);
      }
    }
  };

  const hostOk = (req) => [`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host);
  const originOk = (req) => !req.headers.origin || [`http://127.0.0.1:${port}`, `http://localhost:${port}`].includes(req.headers.origin);

  async function api(req, res, url) {
    if (req.method === 'GET' && url.pathname === '/api/projects') {
      // projects created in a remembered folder since the start (or the last page load)
      if (registry.rescan && registry.rescan().length) {
        registry.save();
        watchAll();
      }
      return sendJson(res, 200, registry.live().map((p) => ({ slug: p.slug, folder: path.basename(p.root) })));
    }
    const m = /^\/api\/project\/([\w-]+)$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const p = registry.get(m[1]);
      if (!p) return sendJson(res, 404, { error: 'unknown project' });
      return sendJson(res, 200, {
        screens: listScreens(p.root), layout: readLayout(p.root), notes: readNotes(p.root).notes, edits: readEdits(p.root),
        board: { live: exists(p.root, 'out/brand/board/board.json'), png: exists(p.root, 'final/brand/brand-board.png') },
      });
    }
    if (req.method === 'GET' && url.pathname === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write('retry: 1000\n\n');
      clients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 20000);
      req.on('close', () => { clearInterval(ping); clients.delete(res); });
      return null;
    }
    if (req.method === 'POST' && ['/api/layout', '/api/notes', '/api/edits'].includes(url.pathname)) {
      if (!originOk(req) || !/^application\/json\b/.test(req.headers['content-type'] || '')) return sendJson(res, 403, { error: 'JSON from this page only' });
      const body = await readBody(req);
      const p = registry.get(String(body.slug || ''));
      if (!p) return sendJson(res, 404, { error: 'unknown project' });
      if (url.pathname === '/api/layout') return sendJson(res, 200, { layout: patchLayout(p.root, body) });
      if (url.pathname === '/api/edits') return sendJson(res, 200, { edits: patchEdits(p.root, body) });
      return sendJson(res, 200, { notes: patchNotes(p.root, body).notes });
    }
    return sendJson(res, 404, { error: 'not found' });
  }

  const server = http.createServer((req, res) => {
    if (!hostOk(req)) return send(res, 403, 'forbidden host');
    let url;
    try {
      url = new URL(req.url, 'http://x');
    } catch {
      return send(res, 400, 'bad url');
    }
    const p = /^\/p\/([\w-]+)(\/.*)$/.exec(url.pathname);
    if (p) {
      const proj = registry.get(p[1]);
      if (!proj) return send(res, 404, 'unknown project');
      if (p[2] === '/raw/index.json') return sendJson(res, 200, { files: rawFiles(proj.root) }); // no HEAD probing per screen
      if (p[2] === '/screens/index.json') return sendJson(res, 200, screenPages(proj.root));
      return serveFile(req, res, proj.root, p[2]);
    }
    // mock screens were written for a project served at '/': their root-absolute paths (/brand/tokens.json,
    // /node_modules/... fonts) go to the project of the page that asked (its Referer), never anywhere else
    const ref = /^\/(node_modules|brand|scripts|screens|raw|engine)\//.test(url.pathname)
      && /^https?:\/\/[^/]+\/p\/([\w-]+)\//.exec(req.headers.referer || '');
    if (ref && registry.get(ref[1])) {
      res.writeHead(307, { Location: `/p/${ref[1]}${url.pathname}${url.search}`, 'Cache-Control': 'no-store' });
      return res.end();
    }
    if (url.pathname.startsWith('/api/')) {
      return api(req, res, url).catch((err) => sendJson(res, err.status || 500, { error: err.message }));
    }
    if (url.pathname === '/' || url.pathname === '/index.html') return serveFile(req, res, UI, '/index.html');
    if (url.pathname.startsWith('/ui/')) return serveFile(req, res, UI, url.pathname.slice(3));
    return send(res, 404, 'not found');
  });

  return {
    server,
    listen(wanted, host = '127.0.0.1') {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(wanted, host, () => {
          port = server.address().port;
          watchAll();
          resolve(port);
        });
      });
    },
    refresh: watchAll,
    close() {
      for (const w of watchers.values()) w.close();
      for (const res of clients) res.end();
      return new Promise((r) => server.close(() => r()));
    },
  };
}
