// The stage: a 1320 x 1900 design-unit box hung under the copy, scaled to the room left.
//   top = copy bottom + gap          f = min(1.08, (DH - top) / 1900)
//   copy: 'bottom' (a panel key): the copy sits at the foot, the stage fills the room above it:
//   top = gap, DH = copy top - gap   (panel.js)
//   single image: X(x) = 660 + (x - 660) * f   (scales around the centre)
//   panorama:     X(x) = x                      (global x, 0..N*1320, so seams stay put)
//   Y(y) = top + y * f
// Element coords: x = centre, y = top edge, w/h = size, r = rotation (deg), z = z-index.
import { STAGE_H } from '../../scripts/lib/config.js';

export function stageFrame({ DH, top, panorama = false, designW = 1320, maxScale = 1.08 }) {
  const f = Math.max(0.3, Math.min(maxScale, (DH - top) / STAGE_H));
  const mid = designW / 2;
  return {
    f,
    top,
    X: panorama ? (x) => x : (x) => mid + (x - mid) * f,
    Y: (y) => top + y * f,
  };
}

// A fixed frame for absolute layouts (feature graphic): design units are final px.
export const flatFrame = () => ({ f: 1, top: 0, X: (x) => x, Y: (y) => y });

// Positions a node from element coords. w/h are stage units (h optional = auto height).
export function place(node, e, fr, w, h) {
  node.style.position = 'absolute';
  node.style.width = `${w * fr.f}px`;
  if (h) node.style.height = `${h * fr.f}px`;
  node.style.left = `${fr.X(e.x ?? fr.mid ?? 660) - (w * fr.f) / 2}px`;
  node.style.top = `${fr.Y(e.y ?? 0)}px`;
  node.style.transform = `rotate(${e.r || 0}deg)`;
  node.style.zIndex = String(e.z ?? 10);
  if (e.opacity != null) node.style.opacity = String(e.opacity);
  return node;
}
