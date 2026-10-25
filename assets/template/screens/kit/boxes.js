// Named boxes of a mock screen: every [data-box="name"] as { x, y, w, h, r } in CAPTURE pixels (CSS px x k, the
// pixel ratio), plus what is wrong with them. ONE implementation for both uses:
//   the capture   scripts/screens.js -> raw/<platform>/<name>.boxes.json (window.kit.boxes(dpr) in the page)
//   live screens  engine/core/live.js measures the page in its iframe: boxes(dpr, frame.contentWindow)
// Rules:
//   radius   the element's own corner radius, else (an M3 connected list rounds its rows, not the list) the first
//            child's top corner; data-box-radius="24" (CSS px) sets it by hand.
//   height   a box in a grid or flex row is measured at its content height (align-self: start), not the height
//            the row stretched it to, so a lifted dashboard card has no blank bottom; data-box-fit="cell" keeps
//            the stretched cell.
//   warnings a box cut off by the screen edge, or covered by system chrome (tab bar, FAB, toolbar, home
//            indicator, or any element marked data-chrome: a pinned CTA, a banner, a custom bottom bar).
export function boxes(k, win = window) {
  const doc = win.document;
  const css = (n) => win.getComputedStyle(n);
  const out = {};
  const warnings = [];
  const chrome = [...doc.querySelectorAll('.tabbar, .fab, .toolbar, .indicator, [data-chrome]')].map((n) => [n, n.getBoundingClientRect()]);
  const radiusOf = (n) => {
    if (n.dataset.boxRadius !== undefined) return parseFloat(n.dataset.boxRadius) || 0;
    const own = parseFloat(css(n).borderTopLeftRadius) || 0;
    const first = n.firstElementChild;
    return own || (first ? parseFloat(css(first).borderTopLeftRadius) || 0 : 0);
  };
  const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  // a grid item or flex-row item stretched by its row: its content height (the card as it would stand alone)
  const fitHeight = (n, r) => {
    const p = n.parentElement;
    if (!p || n.dataset.boxFit === 'cell' || n.style.height) return r.height;
    const ps = css(p);
    const stretchy = /grid/.test(ps.display) || (/flex/.test(ps.display) && !/column/.test(ps.flexDirection));
    if (!stretchy || !['auto', 'normal', 'stretch'].includes(css(n).alignSelf)) return r.height;
    const prev = n.style.alignSelf;
    n.style.alignSelf = 'start';
    const h = n.getBoundingClientRect().height;
    n.style.alignSelf = prev;
    return Math.min(h, r.height);
  };
  for (const n of doc.querySelectorAll('[data-box]')) {
    if (!n.getClientRects().length) continue; // hidden at this size (responsive web captures)
    const r = n.getBoundingClientRect();
    const name = n.dataset.box;
    if (out[name]) warnings.push(`box "${name}" is used twice; the last one wins`);
    const rad = radiusOf(n);
    const h = fitHeight(n, r);
    out[name] = { x: Math.round(r.left * k), y: Math.round(r.top * k), w: Math.round(r.width * k), h: Math.round(h * k), r: Math.round(rad * k) };
    if (r.width < 1 || r.height < 1) warnings.push(`box "${name}" has no size`);
    else if (r.left < -0.5 || r.top < -0.5 || r.right > win.innerWidth + 0.5 || r.bottom > win.innerHeight + 0.5) warnings.push(`box "${name}" runs off the screen`);
    for (const [c, cr] of chrome) {
      if (!n.contains(c) && !c.contains(n) && overlap(r, cr) > 4) {
        warnings.push(`box "${name}" is covered by ${c.classList[0] ? `.${c.classList[0]}` : `<${c.tagName.toLowerCase()} data-chrome>`}`);
      }
    }
  }
  return { boxes: out, warnings };
}
