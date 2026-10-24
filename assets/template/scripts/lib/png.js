// PNG helpers: read the header without decoding, flatten alpha to 24-bit RGB, force 32-bit RGBA.
import { PNG } from 'pngjs';

const SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COLOR = { 0: 'gray', 2: 'RGB', 3: 'palette', 4: 'gray+alpha', 6: 'RGBA' };

export function isPng(buf) {
  return buf.length > 33 && buf.subarray(0, 8).equals(SIG);
}

// IHDR + whether a tRNS chunk adds transparency to an RGB/palette image.
export function pngInfo(buf) {
  if (!isPng(buf)) return null;
  const info = {
    format: 'png',
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
    bitDepth: buf[24],
    colorType: buf[25],
    interlace: buf[28],
    trns: false,
  };
  let at = 8;
  while (at + 8 <= buf.length) {
    const len = buf.readUInt32BE(at);
    const type = buf.toString('latin1', at + 4, at + 8);
    if (type === 'tRNS') info.trns = true;
    if (type === 'IDAT' || type === 'IEND') break;
    at += 12 + len;
  }
  info.alpha = info.colorType === 4 || info.colorType === 6 || info.trns;
  info.colorName = COLOR[info.colorType] || `type ${info.colorType}`;
  info.bits = info.bitDepth * ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[info.colorType] || 1);
  return info;
}

export function hexToRgb(hex = '#ffffff') {
  const h = String(hex).replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Composite any transparency over `background` and write 8-bit RGB (PNG colour type 2, no alpha).
export function flattenPng(buf, background = '#ffffff') {
  const png = PNG.sync.read(buf);
  const [br, bg, bb] = hexToRgb(background);
  const d = png.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 255) continue;
    const t = a / 255;
    d[i] = Math.round(d[i] * t + br * (1 - t));
    d[i + 1] = Math.round(d[i + 1] * t + bg * (1 - t));
    d[i + 2] = Math.round(d[i + 2] * t + bb * (1 - t));
    d[i + 3] = 255;
  }
  return PNG.sync.write(png, { colorType: 2, inputColorType: 6, inputHasAlpha: true, deflateLevel: 7 });
}

// Re-encode as 8-bit RGBA (colour type 6): Google Play asks for a "32-bit PNG" icon.
export function rgbaPng(buf) {
  const png = PNG.sync.read(buf);
  return PNG.sync.write(png, { colorType: 6, inputColorType: 6, inputHasAlpha: true, deflateLevel: 9 });
}
