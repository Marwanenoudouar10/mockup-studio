// JPEG header reader: size and channel count from the first SOF marker (no decoding).
export function isJpeg(buf) {
  return buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8;
}

const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export function jpegInfo(buf) {
  if (!isJpeg(buf)) return null;
  let at = 2;
  while (at + 4 < buf.length) {
    if (buf[at] !== 0xff) { at += 1; continue; }
    const marker = buf[at + 1];
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) { at += 2; continue; }
    const len = buf.readUInt16BE(at + 2);
    if (SOF.has(marker)) {
      const components = buf[at + 9];
      return {
        format: 'jpg',
        height: buf.readUInt16BE(at + 5),
        width: buf.readUInt16BE(at + 7),
        components,
        alpha: false,
        colorName: components === 4 ? 'CMYK' : components === 1 ? 'gray' : 'RGB',
        bits: components * 8,
      };
    }
    at += 2 + len;
  }
  return null;
}
