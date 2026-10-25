// Calm list updates for the sidebar: replace a list's HTML only when it really changed, keep its scroll position
// while it shows the same thing (same key), and let callers keep the old rows while an image or screen reloads
// (a reload empties the boxes for a moment; showing "Loading…" for it made the whole sidebar flash).
const last = new WeakMap(); // element -> { html, key }

export function setList(el, html, key) {
  const prev = last.get(el);
  if (prev && prev.html === html && prev.key === key) return false;
  const top = el.scrollTop;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const next = [...tpl.content.childNodes];
  const cur = [...el.childNodes];
  if (prev && prev.key === key && next.length === cur.length) {
    next.forEach((n, i) => { if (!cur[i].isEqualNode(n)) cur[i].replaceWith(n); }); // only the rows that changed
  } else {
    el.replaceChildren(...next);
  }
  if (prev && prev.key === key) el.scrollTop = top;
  last.set(el, { html, key });
  return true;
}

// true when the list already shows rows for this key (so a passing reload can keep them)
export const showing = (el, key) => { const p = last.get(el); return !!p && p.key === key && p.rows; };

export function markRows(el) { const p = last.get(el); if (p) p.rows = true; }

export function setText(el, text) { if (el.textContent !== text) el.textContent = text; }
