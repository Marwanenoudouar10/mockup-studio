// Typing in place for Mockup Studio's screen editing (core/edit-screen.js): one inline edit at a time, on a text
// of an entered live screen (textStart) or on a panel's headline or sub line (copyStart). The element becomes
// contenteditable in its real font and size; Enter saves, Esc cancels, a click elsewhere saves; the answer goes
// to the Studio through api.post (text-commit / text-cancel, copy-commit / copy-cancel). Keys the Studio caught
// before the element was editable arrive as { ss:'type-keys' } (typeKeys). Until they do, keys typed here are held
// too, then both are replayed in the order they were typed, so a fast typist loses nothing and an early Enter
// saves everything (without an answer within 1.5 s, an older Studio, the held keys go in alone).
import { sanitizeHeadline } from '../../scripts/lib/edits.js';

let typing = null; // { finish(commit, how), keys(list) }

// one inline edit at a time: el becomes editable; Enter / a click elsewhere -> done(true, read(), how), Esc ->
// done(false); how = 'enter' when Enter ended it. t.go(list) replays the Studio's early keys, then the held ones.
function type(el, win, { mode, breaks = false, read, done, input = () => {} }) {
  const style = el.getAttribute('style');
  el.setAttribute('contenteditable', mode);
  el.spellcheck = false;
  for (const p of ['outline:none', 'user-select:text', '-webkit-user-select:text', 'cursor:text']) {
    const [k, v] = p.split(':');
    el.style.setProperty(k, v, 'important');
  }
  const t = { ready: false, held: [] };
  const key = (e) => {
    e.stopPropagation();
    if (!t.ready) { // the Studio's early keys come first: hold this one
      const k = e.key === 'Enter' && e.shiftKey ? 'BR' : e.key;
      if (!e.isComposing && !e.metaKey && !e.ctrlKey && (k.length === 1 || ['Enter', 'Escape', 'Backspace', 'BR'].includes(k))) {
        e.preventDefault();
        t.held.push(k);
      }
      return;
    }
    if (e.key === 'Escape') { e.preventDefault(); t.finish(false); } else if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault();
      if (!e.shiftKey) t.finish(true, 'enter');
      else if (breaks) win.document.execCommand('insertLineBreak');
    }
  };
  const blur = () => t.finish(true);
  const paste = (e) => {
    e.preventDefault();
    win.document.execCommand('insertText', false, ((e.clipboardData && e.clipboardData.getData('text/plain')) || '').replace(/\s+/g, ' '));
  };
  t.keys = (list) => {
    for (const k of list) {
      if (typing !== t) return;
      if (k === 'Enter') t.finish(true, 'enter');
      else if (k === 'Escape') t.finish(false);
      else if (k === 'Backspace') win.document.execCommand('delete');
      else if (k === 'BR') { if (breaks) win.document.execCommand('insertLineBreak'); } else win.document.execCommand('insertText', false, k);
    }
  };
  t.go = (list) => {
    if (t.ready) { t.keys(list); return; }
    t.ready = true;
    t.keys([...list, ...t.held]);
    t.held = [];
  };
  setTimeout(() => t.go([]), 1500);
  t.finish = (commit, how = null) => {
    if (typing !== t) return;
    typing = null;
    el.removeEventListener('keydown', key);
    el.removeEventListener('blur', blur);
    el.removeEventListener('input', input);
    el.removeEventListener('paste', paste);
    const value = read();
    el.removeAttribute('contenteditable');
    if (style === null) el.removeAttribute('style'); else el.setAttribute('style', style);
    win.getSelection().removeAllRanges();
    done(commit, value, how);
  };
  typing = t;
  el.addEventListener('keydown', key);
  el.addEventListener('input', input);
  el.addEventListener('paste', paste);
  win.focus();
  el.focus();
  const range = win.document.createRange();
  range.selectNodeContents(el);
  win.getSelection().removeAllRanges();
  win.getSelection().addRange(range);
  el.addEventListener('blur', blur);
}

export const isTyping = () => !!typing;
export const stopTyping = () => typing && typing.finish(true);
export const typeKeys = ({ keys }) => typing && Array.isArray(keys) && typing.go(keys.map(String).slice(0, 500));

export function textStart({ eid }, { api, f, later }) {
  stopTyping();
  const kit = f && f.contentWindow.kit;
  const el = f ? [...f.contentDocument.querySelectorAll('[data-eid]')].find((n) => n.dataset.eid === eid) : null;
  const node = el && el.children.length ? [...el.childNodes].find((n) => n.nodeType === 3 && n.nodeValue.trim()) : null;
  if (!el || !kit || (el.children.length && !node)) { api.post({ ss: 'text-cancel', eid }); return; }
  kit.edit.set(eid, {}); // the kit remembers the untouched element first (Reset element goes back to it)
  const screen = f.dataset.screen;
  const before = node ? node.nodeValue : el.textContent;
  const read = () => (node ? (node.isConnected ? node.nodeValue : '') : el.textContent).replace(/\s+/g, ' ').trim();
  const was = read();
  type(el, f.contentWindow, { mode: 'plaintext-only', read, input: later, done: (commit, text, how) => {
    if (commit && text !== was) api.post({ ss: 'text-commit', screen, eid, text });
    else {
      if (node) node.nodeValue = before; else el.textContent = before;
      api.post({ ss: 'text-cancel', eid, enter: how === 'enter' });
    }
    later();
  } });
  api.post({ ss: 'text-started', eid });
}

// the headline as the clean HTML edits.json keeps: text, <em> and <br> (anything else a browser adds is unwrapped)
function htmlOf(node) {
  let s = '';
  for (const c of node.childNodes) {
    if (c.nodeType === 3) s += c.nodeValue.replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch])).replace(/ /g, '&nbsp;');
    else if (c.nodeType === 1 && c.localName === 'br') s += '<br>';
    else if (c.nodeType === 1) s += ['em', 'i'].includes(c.localName) ? `<em>${htmlOf(c)}</em>` : htmlOf(c);
  }
  return s;
}

export function copyStart({ panel, field }, { api }) {
  stopTyping();
  const box = api.copyNode(panel);
  const el = box && box.querySelector(field === 'sub' ? '.sub' : '.headline');
  if (!el) { api.post({ ss: 'copy-cancel', panel, field }); return; }
  const before = el.innerHTML;
  const read = () => (field === 'sub' ? el.textContent.replace(/\s+/g, ' ').trim()
    : sanitizeHeadline(htmlOf(el).replace(/\s+/g, ' ').replace(/\s*<br>\s*/g, '<br>').trim()));
  const was = read();
  type(el, window, { mode: field === 'sub' ? 'plaintext-only' : 'true', breaks: field !== 'sub', read, input: api.boxes, done: (commit, html, how) => {
    if (commit && html !== was) api.post({ ss: 'copy-commit', panel, field, html });
    else {
      el.innerHTML = before;
      api.post({ ss: 'copy-cancel', panel, field, enter: how === 'enter' });
    }
  } });
  api.post({ ss: 'copy-started', panel, field });
}

