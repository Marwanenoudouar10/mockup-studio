// Panorama example: all images of a store render on ONE wide strip with one continuous field,
// then get cut into separate files. Devices can sit on a seam and bridge two images.
//   npm run render -- --config examples/panorama.config.js --out out/qa/panorama
//
// In a panorama store, stage x is GLOBAL: 0..1320 is image 1, 1320..2640 image 2, and so on
// (x = 1320 sits exactly on the first seam). y is shared: every image's stage starts at the
// same height (under the tallest copy block), so bridging devices line up.
import base from '../studio.config.js';

export default {
  ...base,
  locales: ['en'],
  stores: [
    { id: 'appstore', panorama: true },
    { id: 'playstore', panorama: true },
  ],
  feature: null,
  panels: [
    {
      logo: true,
      headline: 'Your day, <em>one&nbsp;page</em> at a time',
      stage: [
        { type: 'phone', screen: 'home', w: 660, x: 600, y: 60, r: -4, z: 20 },
        { type: 'lift', screen: 'insights', box: 'streak', w: 480, x: 300, y: 1180, r: -5, z: 30 },
        // bridges image 1 and image 2
        { type: 'phone', screen: 'entry', w: 640, x: 1320, y: 420, r: 8, z: 15 },
      ],
    },
    {
      headline: 'Write it down in <em>seconds</em>',
      sub: 'Prompts, photos and moods, ready when you are.',
      stage: [
        { type: 'lift', screen: 'home', box: 'prompt', w: 700, x: 2000, y: 80, r: -4, z: 30 },
        { type: 'badge', text: 'Works offline', icon: 'offline', x: 2120, y: 1500, r: -3, z: 40 },
        // bridges image 2 and image 3
        { type: 'phone', screen: 'insights', w: 640, x: 2640, y: 260, r: -7, z: 15 },
      ],
    },
    {
      headline: 'See what <em>lifts</em> your mood',
      sub: 'Weekly insights from small notes.',
      stage: [
        { type: 'lift', screen: 'insights', box: 'lifts', w: 620, x: 3350, y: 140, r: 4, z: 30 },
        { type: 'phone', screen: 'home', w: 600, x: 3420, y: 700, r: 6, z: 20 },
      ],
    },
  ],
};
