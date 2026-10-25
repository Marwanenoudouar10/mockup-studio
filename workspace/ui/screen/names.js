// Readable names for the elements of a mock screen (the layers list, the canvas, the breadcrumb), from what the
// kit reports (screens/kit/edits.js layers()): an explicit data-id or data-box is the name; kit chrome gets a
// plain name; a text layer is named by its words, as in a design tool; anything else by its class.
const TAGS = {
  div: 'group', section: 'section', article: 'card', header: 'header', main: 'content', nav: 'nav', footer: 'footer',
  ul: 'list', ol: 'list', li: 'item', i: 'shape', img: 'image', svg: 'graphic', button: 'button', a: 'link',
  p: 'text', span: 'text', b: 'text', strong: 'text', small: 'text', h1: 'title', h2: 'title', h3: 'heading', h4: 'heading',
};
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function labelOf(it) {
  const id = it.eid;
  if (it.kind === 'chrome') {
    const [a, b] = id.split(':');
    const words = it.own ? ` · ${clip(it.own, 26)}` : '';
    if (a.startsWith('tabs')) return `Tab ${b}${words}`;
    if (a === 'status') return 'Status bar time';
    if (a === 'fab') return `Button label${words}`;
    return `Nav ${b}${words}`;
  }
  if (it.kind === 'text' && it.own) return clip(it.own, 40);
  if (!id.startsWith('@')) return id;
  if (it.kind === 'icon' && it.icon) return `${it.icon} icon`;
  const m = /([\w-]+)(?:\.([\w-]+))?:(\d+)$/.exec(id.split('/').pop());
  if (!m) return id;
  const name = m[2] || TAGS[m[1]] || m[1];
  return m[3] === '1' ? name : `${name} ${m[3]}`;
}

export const kindName = (it) => ({ text: 'Text', box: 'Group', icon: 'Icon', chrome: 'System text' }[it.kind] || it.kind);

// words it can be typed into (a text layer, or kit chrome with words: the nav title, a tab label)
export const texty = (it) => !!it && it.own != null && (it.kind === 'text' || it.kind === 'chrome');
