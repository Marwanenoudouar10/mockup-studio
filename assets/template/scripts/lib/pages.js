// Mock screen pages by NAME: one rule set for the capture (scripts/screens.js) and the live screens of an
// editable project (engine/core/live.js), so a live screen is exactly the page `npm run screens` captures.
// Pure ESM (no Node imports): the pages import it too.
//
// listing: { files: ['screens/home.html', 'screens/ios/home.html', 'screens/web/journal.html', ...],
//            sizes: { 'screens/web/journal.html': ['web', 'ipad', 'ios'] } }   (<meta name="kit-sizes">)
// Served as GET screens/index.json by the project server and Mockup Studio; built on disk by listScreenPages().
//
// For one platform:
//   web / mac   screens/<platform>/<name>.html                         ?platform=<platform>
//   phones, ipad screens/<platform>/<name>.html, else screens/<name>.html ?platform=<platform>
//               (the shared screens: only when `phones`, as the capture does for the platforms it was asked for)
//               + every web page whose kit-sizes lists the platform  ?platform=web&size=<platform>
export const WEBS = ['web', 'mac'];
export const PHONES = ['ios', 'android'];

const OTHER = { ios: 'android', android: 'ios', ipad: 'ios', web: 'mac', mac: 'web' };

function names(listing, dir) {
  const pre = dir ? `screens/${dir}/` : 'screens/';
  return (listing.files || [])
    .filter((f) => f.startsWith(pre) && f.endsWith('.html') && !f.slice(pre.length).includes('/'))
    .map((f) => f.slice(pre.length, -5))
    .filter((n) => n && !n.startsWith('_'));
}

const sizesOf = (listing, page) => ((listing.sizes || {})[page] || []);

// -> [{ name, page, query }] in capture order (a web page that shares a phone screen's name comes after it,
//    and `clash` says so: the capture warns, and its file wins on disk)
export function pagesFor(listing, plat, { phones = true } = {}) {
  if (WEBS.includes(plat)) return names(listing, plat).sort().map((name) => ({ name, page: `screens/${plat}/${name}.html`, query: `platform=${plat}` }));
  const jobs = [];
  if (phones) {
    const own = names(listing, plat);
    for (const name of [...new Set([...names(listing, ''), ...own])].sort()) {
      jobs.push({ name, page: own.includes(name) ? `screens/${plat}/${name}.html` : `screens/${name}.html`, query: `platform=${plat}` });
    }
  }
  for (const w of WEBS) {
    for (const name of names(listing, w)) {
      const page = `screens/${w}/${name}.html`;
      if (!sizesOf(listing, page).includes(plat)) continue;
      const clash = jobs.some((j) => j.name === name);
      jobs.push({ name, page, query: `platform=${w}&size=${plat}`, ...(clash ? { clash: true } : {}) });
    }
  }
  return jobs;
}

// The page a live screen shows for (name, platform): the platform's own page, else the shared one, else a web
// page sized for it; then the same on the other platform (as raw/ falls back to the other platform's capture).
// -> { name, page, query, platform, fallback } | null
export function resolvePage(listing, name, platform) {
  if (!listing || !name || /[./]/.test(String(name))) return null;
  for (const plat of [platform, OTHER[platform]].filter(Boolean)) {
    const hits = pagesFor(listing, plat, { phones: true }).filter((j) => j.name === String(name));
    // a clash: the capture's file is the web page's (written last); the live screen follows it
    const hit = hits[hits.length - 1];
    if (hit) return { name: hit.name, page: hit.page, query: hit.query, platform: plat, fallback: plat !== platform };
  }
  return null;
}

// every platform some page asks for, by kit-sizes (for the capture's default platform list)
export function sizedPlatforms(listing, web) {
  const out = [];
  for (const name of names(listing, web)) {
    for (const sz of sizesOf(listing, `screens/${web}/${name}.html`)) if (!out.includes(sz) && !WEBS.includes(sz)) out.push(sz);
  }
  return out;
}

export const hasPages = (listing, dir) => names(listing, dir).length > 0;
