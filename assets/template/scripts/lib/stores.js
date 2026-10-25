// Store rules: every size, format and limit the renderer and the validator rely on.
// Pure data (no Node imports): the pages import this file too, over the local server.
//
// size     the size we render (portrait)        sizes  every exact size the store accepts
// range    Play's rule instead of a fixed list: each side within [min, max], long side <= ratio x short side
// platform which raw/<platform>/ captures a store uses by default; device = which CSS frame draws them
// alpha    false = transparency is rejected (we flatten to 24-bit RGB); min/max = images per locale
// space    'portrait' = the phone layout (1320-wide design, copy over a 1320 x 1900 stage);
//          'landscape' = the wide layout (1200-high design, copy beside or above a 1600 x 1200 stage)
// Web, social and desktop targets live in targets.js and are merged in below.
import { WEB_TARGETS } from './targets.js';

const MB = 1024 * 1024;

// App Store Connect names the iPhone slots by device class since October 2026 (checked 2026-10-24):
//   appstore      "iPhone with Dynamic Island (large display)", was 6.9": optional, the sharpest set (Pro Max, Air)
//   appstore-6.3  "iPhone with Dynamic Island (medium display)", was 6.3": the slot marked REQUIRED
//   appstore-6.5  "iPhone with Face ID (large display)", was 6.5": optional when the large set is uploaded
// Upload appstore-6.3 AND appstore; App Store Connect scales them down for the smaller classes.
const PHONE_STORES = {
  appstore: {
    label: 'App Store · iPhone 6.9"',
    platform: 'ios',
    device: 'iphone',
    size: [1320, 2868],
    sizes: [[1320, 2868], [1290, 2796], [1260, 2736], [2868, 1320], [2796, 1290], [2736, 1260]],
    formats: ['png', 'jpg'],
    alpha: false,
    maxBytes: null, // Apple publishes no per-image byte limit
    min: 1,
    max: 10,
  },
  'appstore-6.3': {
    label: 'App Store · iPhone 6.3"',
    platform: 'ios',
    device: 'iphone',
    size: [1206, 2622],
    sizes: [[1206, 2622], [1179, 2556], [2622, 1206], [2556, 1179]],
    formats: ['png', 'jpg'],
    alpha: false,
    maxBytes: null,
    min: 1,
    max: 10,
  },
  'appstore-6.5': {
    label: 'App Store · iPhone 6.5"',
    platform: 'ios',
    device: 'iphone',
    size: [1284, 2778],
    sizes: [[1284, 2778], [1242, 2688], [2778, 1284], [2688, 1242]],
    formats: ['png', 'jpg'],
    alpha: false,
    maxBytes: null,
    min: 1,
    max: 10,
  },
  'ipad-13': {
    label: 'App Store · iPad 13"',
    platform: 'ipad',
    device: 'ipad',
    size: [2064, 2752],
    sizes: [[2064, 2752], [2048, 2732], [2752, 2064], [2732, 2048]],
    formats: ['png', 'jpg'],
    alpha: false,
    maxBytes: null,
    min: 1,
    max: 10,
  },
  playstore: {
    label: 'Google Play · phone',
    platform: 'android',
    device: 'pixel',
    size: [1080, 1920],
    range: { min: 320, max: 3840, ratio: 2 },
    formats: ['png', 'jpg'],
    alpha: false, // "JPEG or 24-bit PNG (no alpha)"
    maxBytes: 8 * MB, // the Console uploader's limit (the help page states none for phones)
    min: 2, // Play needs 2+ screenshots across all device types to publish; up to 8 per device type
    max: 8,
    promo: 4, // 4+ portrait 9:16 screenshots of 1080 px or more to be eligible for promotion (validate notes it)
  },
  // Same Play rules, rendered at 2x (2160 x 3840, the 3840 px maximum): crisper on large screens.
  // Upload EITHER playstore or playstore-4k for a listing, not both.
  'playstore-4k': {
    label: 'Google Play · phone 4K',
    platform: 'android',
    device: 'pixel',
    size: [2160, 3840],
    range: { min: 320, max: 3840, ratio: 2 },
    formats: ['png', 'jpg'],
    alpha: false,
    maxBytes: 8 * MB,
    min: 2,
    max: 8,
    promo: 4,
  },
};

for (const s of Object.values(PHONE_STORES)) s.space = 'portrait';

export const STORES = { ...PHONE_STORES, ...WEB_TARGETS };

// Single assets that sit next to the screenshot sets.
export const ASSETS = {
  'feature-graphic': { label: 'Google Play feature graphic', size: [1024, 500], formats: ['png', 'jpg'], alpha: false, maxBytes: 15 * MB },
  'appstore-icon': { label: 'App Store icon', size: [1024, 1024], formats: ['png'], alpha: false, maxBytes: null },
  'playstore-icon': { label: 'Google Play icon', size: [512, 512], formats: ['png'], alpha: true, needsAlpha: true, maxBytes: 1024 * 1024 },
};

// The store icons a config needs (scripts/icons.js writes them, validate expects them, stale.js removes the
// others): App Store 1024 for an App Store target (iPhone, iPad, Mac App Store), Play 512 for a Google Play
// target or the feature graphic. A web-only project needs none.
export const ICONS = [
  { file: 'appstore-1024.png', key: 'appstore-icon', size: 1024, alpha: false, for: (id) => /^(appstore|ipad|mac-appstore)/.test(id) },
  { file: 'playstore-512.png', key: 'playstore-icon', size: 512, alpha: true, for: (id) => /^playstore/.test(id) },
];
export const iconsFor = (cfg) => ICONS.filter((i) => cfg.stores.some((s) => i.for(s.id)) || (i.key === 'playstore-icon' && !!cfg.feature));

// How screens are captured for each platform (scripts/screens.js, scripts/capture.js) and which frame suits them.
// css x dpr = capture size. iOS: iPhone 6.9" (440 x 956 pt @3x). Android: 360 x 800 dp @3x = 1080 x 2400.
// web: a 1440 x 900 desktop viewport @2x = 2880 x 1800 (16:10). mac: a Mac app window, same size.
export const PLATFORMS = {
  ios: { capture: [1320, 2868], css: [440, 956], dpr: 3, device: 'iphone', other: 'android' },
  android: { capture: [1080, 2400], css: [360, 800], dpr: 3, device: 'pixel', other: 'ios' },
  ipad: { capture: [2064, 2752], css: [1032, 1376], dpr: 2, device: 'ipad', other: 'ios' },
  web: { capture: [2880, 1800], css: [1440, 900], dpr: 2, device: 'browser', other: 'mac' },
  mac: { capture: [2880, 1800], css: [1440, 900], dpr: 2, device: 'laptop', other: 'web' },
};

// CSS frames (engine/devices/<name>.css) and the raw/<platform>/ folders their screens come from:
// an element with device:'iphone' on a web target looks in raw/ios/ (then raw/android/).
export const DEVICES = {
  iphone: { platforms: ['ios'], phone: true },
  pixel: { platforms: ['android'], phone: true },
  ipad: { platforms: ['ipad'] },
  browser: { platforms: ['web', 'mac'] },
  laptop: { platforms: ['web', 'mac'] },
  monitor: { platforms: ['web', 'mac'] },
};
