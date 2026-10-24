// Mock-screen kit entry. One HTML file per screen renders as iOS or Android:
//   <link rel="stylesheet" href="kit/kit.css"> <link rel="stylesheet" href="app.css">
//   <script type="module" src="kit/kit.js"></script>
// Brand: <meta name="kit-tokens" content="/brand/tokens.json"> (or ?tokens=) applies the brand tokens.
// URL: ?platform=ios|android|ipad|web &locale=en &theme=light|dark &size=ipad|ios (scripts/screens.js sets them;
// <html data-platform data-theme lang> work too when you open a file by hand in the preview server).
// What it does, in order: platform + theme classes on <html>, drops [data-only] elements for the other
// platform, builds the system chrome (chrome.js), localises (i18n.js), draws icons, art and charts,
// waits for fonts, then sets window.__ready = true (the capture waits for it; never a fixed sleep).
// platform=web (or mac): desktop app shells and marketing pages (web-chrome.js, web*.css). &size=ipad|ios|android
// renders the same page at that device's viewport for responsive mockups (the CSS reflows at 1100 and 640 px).
// Pages can hook in: document.addEventListener('kit:ready', (e) => ...) runs before the capture.
import { icon } from './icons.js';
import { buildChrome } from './chrome.js';
import { buildWebChrome } from './web-chrome.js';
import { drawCharts } from './charts.js';
import { drawArt } from './art.js';
import { localize, isRtl } from './i18n.js';
import { applyBrand } from './brand.js';

window.__ready = false;

const q = new URLSearchParams(location.search);
const html = document.documentElement;
const platform = q.get('platform') || html.dataset.platform || 'ios';
// iPad screens use the iOS look; web and mac pages use the desktop look at any viewport size
const family = platform === 'android' ? 'android' : platform === 'web' || platform === 'mac' ? 'web' : 'ios';
const size = q.get('size') || html.dataset.size || (family === 'web' ? 'desktop' : platform);
const theme = q.get('theme') || html.dataset.theme || 'light';
const locale = q.get('locale') || html.getAttribute('lang') || 'en';

html.classList.add(family, platform);
if (theme === 'dark') html.classList.add('dark');
html.dataset.platform = platform;
html.dataset.size = size;
html.setAttribute('lang', locale);
if (isRtl(locale)) html.setAttribute('dir', 'rtl');

export const kit = {
  platform,
  family,
  size,
  theme,
  locale,
  strings: {},
  icon: (name, opts = {}) => icon(name, { platform: family, ...opts }),
  t: (s) => (Object.prototype.hasOwnProperty.call(kit.strings, s) ? kit.strings[s] : s),
};
window.kit = kit;

function drawIcons(root = document) {
  for (const n of root.querySelectorAll('[data-icon]')) {
    if (n.firstElementChild && n.firstElementChild.tagName.toLowerCase() === 'svg') continue;
    n.innerHTML = kit.icon(n.dataset.icon, { filled: n.hasAttribute('data-filled'), weight: Number(n.dataset.weight) || undefined });
  }
}

function dropOtherPlatform() {
  for (const n of document.querySelectorAll('[data-only]')) {
    const keep = n.dataset.only.split(/[\s,]+/);
    if (!keep.includes(family) && !keep.includes(platform)) n.remove();
  }
}

const loaded = () => (document.readyState === 'complete'
  ? Promise.resolve()
  : new Promise((r) => window.addEventListener('load', r, { once: true })));

async function run() {
  await loaded(); // stylesheets in, so measuring (charts) sees the final layout
  kit.brand = await applyBrand(q); // brand/tokens.json -> CSS variables + fonts (kit/brand.js)
  dropOtherPlatform();
  if (family === 'web') await buildWebChrome(kit);
  else buildChrome(kit);
  await localize(kit);
  drawIcons();
  drawArt();
  await document.fonts.ready;
  drawCharts(kit);
  document.dispatchEvent(new CustomEvent('kit:ready', { detail: kit }));
  drawIcons(); // icons added by kit:ready handlers
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__ready = true;
}

run().catch((err) => {
  console.error(err);
  window.__error = `kit: ${err && err.message ? err.message : err}`;
  window.__ready = true;
});
