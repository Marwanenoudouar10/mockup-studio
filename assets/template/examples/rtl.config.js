// RTL example: an Arabic set on a light field with the highlight ornament, Arabic screens included.
//   npm run screens -- --locale ar --platform android    # Arabic mock screens -> raw/android/ar/ (strings.json "ar")
//   npm run render -- --config examples/rtl.config.js     # -> out/qa/rtl/ (another config never writes to final/)
// RTL locales (ar, he, fa, ur...) set dir="rtl": the copy block aligns right, the brush and the
// feature graphic mirror, the mock screens mirror too. Poppins has no Arabic letters, so a fallback font
// is added in `extra` (npm i @fontsource-variable/noto-sans-arabic). The stage is NOT mirrored: place
// devices yourself. Without the Arabic captures the render warns "screen ... is not localized for ar"
// on every image (English screens under Arabic headlines are a defect, not a style).
import base from '../studio.config.js';

export default {
  ...base,
  brand: {
    ...base.brand,
    field: 'light',
    ornament: 'highlight',
    fonts: { ...base.brand.fonts, extra: ['Noto Sans Arabic Variable'] },
  },
  locales: ['ar'],
  defaultLocale: 'en', // the language of raw/<platform>/ captures: Arabic ones live in raw/<platform>/ar/
  stores: ['playstore'],
  panels: [
    {
      logo: true,
      headline: 'يومك، <em>صفحة واحدة</em> في كل مرة',
      stage: [
        { type: 'phone', screen: 'home', w: 700, x: 660, y: 30, z: 20 },
        // over the header and the week strip, clear of the prompt card (the proof); the badge in open field,
        // under the phone, never on the extended FAB (Android keeps it on the right in Arabic too)
        { type: 'lift', screen: 'insights', box: 'streak', w: 440, x: 330, y: 140, r: -5, z: 31 },
        { type: 'badge', text: 'خاص افتراضيًا', icon: 'lock', x: 660, y: 1640, r: -3, z: 40, style: 'dark' },
      ],
    },
    {
      headline: 'اكتبها في <em>ثوانٍ</em>',
      sub: 'أسئلة وصور ومزاج. دفترك جاهز متى كنت جاهزًا.',
      stage: [
        { type: 'phone', screen: 'entry', w: 700, x: 570, y: 0, r: -5, z: 10 },
        { type: 'lift', screen: 'home', box: 'prompt', w: 760, x: 860, y: 1000, r: 4, z: 30 },
      ],
    },
  ],
  feature: {
    ...base.feature,
    headline: 'يومك، <em>صفحة واحدة</em> في كل مرة',
  },
};
