// Layer names: Figma (and Illustrator) name an imported layer after its id, so every group gets a readable one,
// never a bare tag ("span", "span-2", "b"). From the strongest source to the weakest (the level):
//   2 author   data-id ("greeting"), data-box with its role class ('card streak' + streak -> "card-streak"), a stage
//              element (data-what 'iphone "home"' -> "phone-home", a badge -> "badge-private-default"), the copy
//              ("copy", "headline", "sub", "logo"), kit chrome ids ("nav-title", "tab-label-today"), icons
//              ("icon-flame")
//   1 class    the element's classes (layout utilities skipped) and a slug of its words: <h4 class="entry-title">
//              Morning walk</h4> -> "entry-title-morning-walk", <i class="btn power"> -> "btn-power"; typography
//              classes (t-sub) read as "text"
//   0 role     the tag's role and the words: <span>Recent</span> -> "text-recent", an empty <i> -> "shape"
//   nameOf(el) -> { raw, level }   raw goes through tidy.js layerNamer (lower case, valid, unique per file);
// tidy.js keeps the stronger name when it merges a wrapper group with its only child.
const ROLE = {
  div: 'group', span: 'text', p: 'text', b: 'text', strong: 'text', small: 'text', time: 'text', mark: 'text', code: 'text',
  label: 'label', em: 'accent', i: 'shape', a: 'link', button: 'button', ul: 'list', ol: 'list', li: 'item', section: 'section',
  article: 'card', header: 'header', footer: 'footer', nav: 'nav', main: 'main', aside: 'sidebar', figure: 'figure',
  img: 'image', svg: 'graphic', canvas: 'chart', body: 'page', html: 'page', input: 'field', textarea: 'field',
  table: 'table', tr: 'row', td: 'cell', th: 'cell', h1: 'heading', h2: 'heading', h3: 'heading', h4: 'heading', h5: 'heading', h6: 'heading',
};
// layout and state utilities: never a layer's name
const UTIL = /^(grow|row|col|stack|flex|center|between|end|start|top|bottom|wrap|m[tblrxy]?-\w+|p[tblrxy]?-\w+|gap-\w+|span-\d+|hide-\w+|show-\w+|on|off|done|today|dim|sm|lg|xs|muted|active|selected|tinted|solid|glass|dark|light|outline|flat|compact|right|left|filled|clamp-\d+)$/;
// repeated items: their words tell them apart ("card-first-run", "row-walks-outside")
const ROLES = /^(card|list|chips?|tile|row|panel|sheet|banner|pill|item|kpi|stat|section|grid|day|sd|lift-row|entry-item|entry-row)$/;
// engine parts named by their class alone
const PARTS = new Set(['canvas', 'copy', 'headline', 'sub', 'logo', 'wordmark', 'watermark', 'eyebrow']);
// engine wrappers around a live screen: plain names, which tidy.js gives up for the screen's own ("screen-home")
const WRAP = { 'live-host': 'viewport', 'live-screen': 'screen-frame' };
const STOP = new Set(['a', 'an', 'the', 'of', 'to', 'by', 'and', 'or', 'for', 'in', 'on', 'at', 'is', 'your', 'my', 'de', 'la', 'el', 'le', 'y', 'et']);

// 'Private by default' -> 'private-default' (ASCII, the first words that say something, 24 characters at most)
export function slug(s, n = 2) {
  const all = String(s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  const words = all.filter((w) => !STOP.has(w));
  return (words.length ? words : all).slice(0, n).join('-').slice(0, 24).replace(/-$/, '');
}
const kebab = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const join = (...parts) => parts.filter(Boolean).join('-');

// the words under an element, text node by text node (textContent would glue "Today" and "Journal")
function textOf(el, max = 80) {
  const doc = el.ownerDocument;
  const w = doc.createTreeWalker(el, 4);
  let s = '';
  for (let n = w.nextNode(); n && s.length < max; n = w.nextNode()) {
    if (!n.parentElement || /^(script|style)$/i.test(n.parentElement.localName)) continue;
    if (n.nodeValue.trim()) s += ` ${n.nodeValue.trim()}`;
  }
  return s.trim();
}
// a class as a name: a one-letter class says nothing ('g': a browser bar glyph), a tag's name needs a noun
const SHORT = { g: 'glyph' };
const clsName = (c) => SHORT[c] || (c in ROLE ? `${c}-area` : c);
const ownText = (el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue).join(' ').trim();

function author(el, d) {
  if (d.id) return kebab(d.id);
  if (d.box) {
    const role = [...el.classList].find((c) => ROLES.test(c));
    const box = kebab(d.box);
    return role && !box.startsWith(role) ? `${role}-${box}` : box;
  }
  if (d.what) { // a stage element: 'iphone "home"', 'lift "streak" (insights)', 'tile "home"', 'text "4.9"'
    const w = d.what.replace(/\b(iphone|pixel|galaxy|android)\b/, 'phone');
    return w.startsWith('text ') ? join('text', slug(w.slice(5), 3)) : w.replace(/["()]/g, ' ');
  }
  if (el.classList.contains('badge')) return join('badge', slug(textOf(el)));
  if (el.classList.contains('stage-text')) return join('text', slug(textOf(el), 3));
  const part = [...el.classList].find((c) => PARTS.has(c));
  if (part) return part;
  if (d.eid && !d.eid.startsWith('@')) { // kit chrome: nav:title, tabs:2, status:time, fab:label
    const [what, n] = d.eid.split(':');
    return what === 'tabs' ? join('tab-label', slug(textOf(el)) || n) : `${what}-${n}`;
  }
  if (d.icon) return `icon-${kebab(d.icon)}`;
  return null;
}

export function nameOf(el) {
  const d = el.dataset || {};
  if (d.vxPseudo) { // a ::before / ::after made real (prepare.js): its host's name
    const host = el.parentElement ? nameOf(el.parentElement).raw : '';
    return { raw: join(host, d.vxPseudo.split('-').pop()), level: 1 };
  }
  const a = author(el, d);
  if (a) return { raw: a, level: 2 };
  const tag = el.localName;
  if (tag === 'body' || tag === 'html') return { raw: 'page', level: 0 };
  const cls = typeof el.className === 'string' ? el.className.split(/\s+/).filter((c) => c && !UTIL.test(c)) : [];
  if (cls[0] in WRAP) return { raw: WRAP[cls[0]], level: 0 };
  if (/^(body|band)$/.test(cls[0]) && el.parentElement && el.parentElement.classList.contains('device')) return { raw: 'frame', level: 1 };
  const icon = el.querySelector && el.querySelector('[data-icon]');
  if (tag === 'svg' && !cls.length) { // an icon's drawing takes its host's name; any other drawing its parent's
    const host = el.closest('[data-icon]');
    if (host) return { raw: `icon-${kebab(host.dataset.icon)}`, level: 1 };
    const p = el.parentElement && typeof el.parentElement.className === 'string' ? el.parentElement.className.split(/\s+/).find((c) => c && !UTIL.test(c)) : '';
    return { raw: join(p && clsName(p), 'graphic'), level: 0 };
  }
  const own = ownText(el);
  const all = textOf(el);
  if (cls.length && !/^t-/.test(cls[0])) {
    // words: its own text, a short container's text, or (a repeated item) its first words
    const words = own || all.length <= 32 || ROLES.test(cls[0]) ? slug(own || all) : '';
    return { raw: join(clsName(cls[0]), words || (all ? '' : cls[1])), level: 1 }; // <i class="btn power"> -> btn-power
  }
  const words = slug(own || all);
  if (words) return { raw: join(cls.length ? 'text' : ROLE[tag] || 'group', words), level: 0 };
  const leaf = !el.children.length || (icon && el.children.length === 1);
  const shape = leaf && ['span', 'b', 'strong', 'i', 'small', 'p', 'div'].includes(tag) ? 'shape' : ROLE[tag] || 'group';
  return { raw: join(shape, icon ? kebab(icon.dataset.icon) : ''), level: 0 };
}
