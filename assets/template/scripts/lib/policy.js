// Store content checks on the config (not the pixels), run by validate.js. Each finding is a WARNING to review:
// the word lists are English and a match is a prompt to re-read the line, not a verdict.
// Rules (App Review Guidelines 2.3, Google Play Metadata policy + preview-asset guidance, checked 2026-10):
//   - no rankings, awards, store programs, prices, promotions, download counts, calls to action or emoji
//   - no other platform's names on a store's images (Apple 2.3.10: no Android or Google Play on iOS)
//   - real UI: more than half of an App Store set shows the app in use; Play's first three images show UI.
//     Measured on the rendered pixels when render-report.json has them (uiOf: a screen drawn over 2% or more
//     of the image, so a panorama whose devices all sit on image 1 is caught); else read from the config.
import { target, featureTarget } from './config.js';

const WORDS = [
  [/(#\s?|\bno\.\s?|\bn[º°]\s?|\bnumber\s)1\b|\bnumber one\b/i, 'a ranking ("#1")'],
  [/\b(best|top|leading|most popular|popular)\b/i, 'a ranking word'],
  [/\b(award|awards|award-winning|app of the year|editor'?s choice|best of)\b/i, 'an award or a store program'],
  [/\b(free|sale|discount|deal|cash ?back|limited time|price)\b|\d+\s?% off|[$€£¥]\s?\d/i, 'a price or a promotion'],
  [/\bnew\b/i, '"New" (Play lists it as a banned word)'],
  [/\b(download|install|get|try|play|buy|subscribe|sign up|join)( it)? (now|today)\b/i, 'a call to action'],
  [/\b(millions?|thousands|\d+\s?[km]\+?) (of )?(downloads|users|installs|reviews)\b/i, 'a download or user count'],
  [/\p{Extended_Pictographic}/u, 'an emoji'],
];
const OTHER = {
  apple: [/\b(android|google play|play store)\b/i, 'another platform\'s name (Apple 2.3.10)'],
  play: [/\b(iphone|ipad|ios|app store|apple)\b/i, 'another store\'s name'],
};

const plain = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, ' ')
  .replace(/\s+/g, ' ').trim();

// 'apple' | 'play' | null (web and social targets follow their own sites' rules, not checked here)
export function storeFamily(st) {
  if (st.platform === 'android' || /^playstore/.test(st.id)) return 'play';
  if (['ios', 'ipad'].includes(st.platform) || st.id === 'mac-appstore') return 'apple';
  return null;
}

function scan(text, family) {
  const s = plain(text);
  if (!s) return [];
  const rules = [...WORDS, OTHER[family]];
  const hits = rules.filter(([re]) => re.test(s)).map(([re, why]) => `"${s.match(re)[0]}": ${why}`);
  if (family === 'play' && s.length >= 8 && s === s.toUpperCase() && /[A-Z]{4}/.test(s)) hits.push('ALL CAPS text (Play)');
  return hits;
}

function texts(p) {
  const out = [['headline', p.headline], ['sub', p.sub]];
  for (const e of p.stage || []) if (e.type === 'badge') out.push([`badge "${plain(e.text)}"`, e.text]);
  return out;
}

// -> [{ label, text }] warnings for every store target, locale and panel (+ the feature graphic)
//   uiOf(storeId, locale, n) -> true | false | null: does rendered image n show the app (render-report.json)
export function policyFindings(cfg, { uiOf = null } = {}) {
  const found = [];
  const seen = new Set(); // a line left untranslated is reported once, not once per locale
  const uiLocale = cfg.locales.includes(cfg.defaultLocale) ? cfg.defaultLocale : cfg.locales[0];
  for (const st of cfg.stores) {
    const family = storeFamily(st);
    if (!family) continue;
    for (const locale of cfg.locales) {
      const t = target(cfg, { store: st.id, locale });
      for (const p of t.panels) {
        for (const [where, text] of texts(p)) {
          const key = `${st.id}|${p.n}|${where}|${plain(text)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          for (const h of scan(text, family)) found.push({ label: `copy ${st.id} ${locale} image ${p.n}`, text: `${where} ${h}` });
        }
      }
      const px = uiOf ? t.panels.map((p) => uiOf(st.id, locale, p.n)) : [];
      const measured = px.length > 0 && px.every((v) => typeof v === 'boolean');
      if (!measured && locale !== uiLocale) continue;
      const ui = measured ? px : t.panels.map((p) => p.stage.some((e) => e.screen));
      const how = measured ? `${locale}, rendered` : 'config';
      const n = ui.length;
      const withUi = ui.filter(Boolean).length;
      const add = (text) => {
        if (seen.has(`ui|${st.id}|${text}`)) return;
        seen.add(`ui|${st.id}|${text}`);
        found.push({ label: `ui ${st.id} (${how})`, text });
      };
      if (family === 'apple' && n && withUi * 2 <= n) add(`${withUi} of ${n} images show the app's UI: Apple wants more than half (2.3.3)`);
      if (family === 'play') {
        const bare = ui.slice(0, 3).map((v, i) => (v ? 0 : i + 1)).filter(Boolean);
        const which = bare.length > 1 ? `images ${bare.join(', ')} show` : `image ${bare[0]} shows`;
        if (bare.length) add(`${which} no app screen: Play wants UI in the first three`);
      }
    }
  }
  if (cfg.feature && cfg.stores.some((s) => storeFamily(s) === 'play')) {
    for (const locale of cfg.locales) {
      const f = featureTarget(cfg, locale).feature;
      for (const [where, text] of [['headline', f.headline], ['sub', f.sub]]) {
        for (const h of scan(text, 'play')) found.push({ label: `copy feature-graphic ${locale}`, text: `${where} ${h}` });
      }
    }
  }
  return found;
}
