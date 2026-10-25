// A store image as a vector PDF (Chrome's own print of the page: real text and shapes; blurred shadows become
// soft image masks, variable fonts embed as Type 3). For Illustrator, Affinity, Acrobat and print; Figma has no
// PDF import (use the SVG there). Printed BEFORE the SVG step, from the untouched page.
//   printPdf(page, { width, height, slices, index }) -> Buffer   one page of width x height CSS px (x 0.75 pt)
// A panorama strip prints one image at a time: the canvas is shifted by -index x width and the page narrowed.
// The body is contained while printing: Chrome's print fits the LAYOUT width onto the page, and a wide canvas is
// laid out larger than it shows (scale(k) < 1) or a strip runs past the page: either would shrink the print.
export async function printPdf(page, { width, height, slices = 1, index = 0 }) {
  const strip = slices > 1;
  await page.evaluate(() => { document.body.style.contain = 'strict'; });
  if (strip) {
    await page.evaluate((i, W) => {
      const c = document.querySelector('#canvas');
      c.dataset.vxLeft = c.style.left || '';
      c.style.left = `${-i * W}px`;
      document.documentElement.dataset.vxPageW = document.documentElement.style.getPropertyValue('--page-w');
      document.documentElement.style.setProperty('--page-w', `${W}px`);
    }, index, width);
  }
  try {
    return Buffer.from(await page.pdf({
      width: `${width}px`, height: `${height}px`, printBackground: true, pageRanges: '1',
      margin: { top: 0, right: 0, bottom: 0, left: 0 }, tagged: false,
    }));
  } finally {
    await page.evaluate((s) => {
      document.body.style.contain = '';
      if (!s) return;
      const c = document.querySelector('#canvas');
      c.style.left = c.dataset.vxLeft;
      document.documentElement.style.setProperty('--page-w', document.documentElement.dataset.vxPageW);
    }, strip);
  }
}

// a light check of a PDF file (validate.js, the tests): its page count and the first page's size in pt
export function pdfInfo(buf) {
  const text = buf.toString('latin1');
  if (!text.startsWith('%PDF-')) return null;
  const pages = (text.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const box = /\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(text);
  return { pages, width: box ? +box[3] - +box[1] : null, height: box ? +box[4] - +box[2] : null, unicode: /\/ToUnicode/.test(text) };
}
