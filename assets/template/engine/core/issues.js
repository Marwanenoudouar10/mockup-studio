// Findings a page wants in the render log AND in render-report.json, where `npm run validate` lists them
// as warnings (--strict fails on them): a crop outside its capture, a screen borrowed from another
// language, a card cut by the image edge, the same card twice, a panorama image with no app UI.
//   issue('lift "streak": ...', { slice: 1 })   slice = 0-based image of a panorama strip (else omitted)
// Each finding is also a console warning, which the render log prints as a `warn:` line.
const list = [];
const seen = new Set();

export function issue(text, extra = {}) {
  const key = `${extra.slice ?? ''}|${text}`;
  if (seen.has(key)) return;
  seen.add(key);
  console.warn(text);
  list.push({ text, ...extra });
}

export const issues = () => list.slice();
