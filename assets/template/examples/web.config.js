// Web-only example: a website / web app with no phone stores. Every target is wide, so panels need
// no `space` (it defaults to 'landscape' when the config has no phone store).
//   npm run render -- --config examples/web.config.js --out out/qa/web-only
// Screens: raw/web/ (npm run screens: screens/web/*.html, or npm run capture -- --url https://...).
import base from '../studio.config.js';

export default {
  ...base,
  brand: { ...base.brand, devices: { browser: { theme: 'dark' } } },
  locales: ['en'],
  // mac-appstore looks in raw/mac/ first; this demo has web captures only, so point it at raw/web/
  stores: ['x', 'linkedin', 'chrome-webstore', { id: 'mac-appstore', screens: 'web' }, 'web-hero', 'square'],
  feature: null,
  panels: [
    {
      only: ['x', 'linkedin', 'chrome-webstore', 'square'],
      logo: true,
      headline: 'Your journal, now on the <em>web</em>',
      sub: 'Write on any screen. Pick up where you left off.',
      stage: [
        { type: 'browser', screen: 'journal', url: 'brimpage.example/journal', title: 'Journal · Brimpage', w: 1500, x: 880, y: 150, z: 10 },
        { type: 'lift', screen: 'journal', box: 'streak', w: 420, x: 240, y: 700, r: -4, z: 30 },
      ],
    },
    {
      only: ['chrome-webstore', 'mac-appstore', 'web-hero'],
      headline: 'Patterns at a <em>glance</em>',
      sub: 'Streaks, moods and what lifts them.',
      stage: [
        { type: 'monitor', screen: 'dashboard', w: 1340, x: 760, y: 60, z: 10 },
        // a card from ANOTHER screen than the monitor's (the same card twice on one image is a defect)
        { type: 'lift', screen: 'journal', box: 'week', w: 420, x: 1300, y: 760, r: 3, z: 30 },
      ],
    },
  ],
};
