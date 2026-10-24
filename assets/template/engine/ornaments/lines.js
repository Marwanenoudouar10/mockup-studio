// Text lines of a node as client rects (one per visual line), top to bottom.
// Range.getClientRects returns a rect per text fragment; fragments that share a line are merged.
export function lineRects(node) {
  const range = document.createRange();
  range.selectNodeContents(node);
  const rects = [...range.getClientRects()].filter((r) => r.width > 2 && r.height > 2);
  const lines = [];
  for (const r of rects) {
    const cy = (r.top + r.bottom) / 2;
    const hit = lines.find((l) => Math.abs((l.top + l.bottom) / 2 - cy) < Math.min(l.bottom - l.top, r.height) * 0.4);
    if (hit) {
      hit.left = Math.min(hit.left, r.left);
      hit.right = Math.max(hit.right, r.right);
      hit.top = Math.min(hit.top, r.top);
      hit.bottom = Math.max(hit.bottom, r.bottom);
    } else {
      lines.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    }
  }
  return lines.sort((a, b) => a.top - b.top);
}

// Client rect -> design units relative to the canvas.
export function toDesign(r, cv) {
  const c = cv.el.getBoundingClientRect();
  return {
    left: (r.left - c.left) / cv.k,
    right: (r.right - c.left) / cv.k,
    top: (r.top - c.top) / cv.k,
    bottom: (r.bottom - c.top) / cv.k,
  };
}

export function svgLayer(cls, w, h) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', cls);
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.setAttribute('width', String(w));
  svg.setAttribute('height', String(h));
  return svg;
}
