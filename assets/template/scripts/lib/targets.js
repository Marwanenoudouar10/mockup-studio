// Web, social and desktop targets: landscape (or square) images rendered in the wide layout.
// Pure data, merged into STORES (stores.js) and imported by the pages too.
//
// strict   true  = the destination rejects other sizes (validate FAILs on a mismatch)
//          false = a recommended size (validate only warns on a mismatch)
// source   where the number comes from (checked 2026-10); `null` = our own default, no external rule
// platform which raw/<platform>/ captures the target uses (web = raw/web/, 1440 x 900 @2x)
// device   the default frame for { type: 'device' } elements
// space    'landscape' = 1200-high design canvas, copy beside (side) or above (stack) a 1600 x 1200 stage

const MB = 1024 * 1024;

const web = (o) => ({
  platform: 'web', device: 'browser', space: 'landscape', formats: ['png', 'jpg'], alpha: false,
  maxBytes: null, min: 1, max: 10, strict: false, ...o,
});

export const WEB_TARGETS = {
  // link previews (Open Graph meta image, used by most chat apps and social sites)
  og: web({
    label: 'Open Graph link preview', size: [1200, 630], max: 1, maxBytes: 8 * MB,
    source: 'https://developers.facebook.com/docs/sharing/webmasters/images/',
  }),
  // X: the summary_large_image card is 2:1 (min 300 x 157, max 4096 x 4096, under 5 MB)
  'x-card': web({
    label: 'X card (summary_large_image)', size: [1200, 600], max: 1, maxBytes: 5 * MB,
    source: 'https://developer.x.com/en/docs/x-for-websites/cards/overview/summary-card-with-large-image',
  }),
  // X: an image post, 16:9 shows uncropped in the timeline; up to 4 images per post
  x: web({
    label: 'X image post 16:9', size: [1600, 900], max: 4, maxBytes: 5 * MB,
    source: 'https://help.x.com/en/using-x/posting-gifs-and-pictures',
  }),
  linkedin: web({
    label: 'LinkedIn link / post image 1.91:1', size: [1200, 627], max: 1,
    source: 'https://www.linkedin.com/help/linkedin/answer/a521928',
  }),
  // Instagram keeps 1080 wide between 1.91:1 and 4:5; LinkedIn shows both sizes too
  square: web({
    label: 'Square post 1:1', size: [1080, 1080],
    source: 'https://help.instagram.com/1631821640426723',
  }),
  portrait: web({
    label: 'Portrait post 4:5', size: [1080, 1350],
    source: 'https://help.instagram.com/1631821640426723',
  }),
  // the gallery needs 2+ images before it shows
  producthunt: web({
    label: 'Product Hunt gallery', size: [1270, 760], min: 2, max: 8,
    source: 'https://help.producthunt.com/en/articles/5473122-how-to-post-media',
  }),
  'chrome-webstore': web({
    label: 'Chrome Web Store screenshot', size: [1280, 800], sizes: [[1280, 800], [640, 400]],
    max: 5, strict: true, source: 'https://developer.chrome.com/docs/webstore/images',
  }),
  'chrome-promo': web({
    label: 'Chrome Web Store small promo tile', size: [440, 280], max: 1, strict: true,
    source: 'https://developer.chrome.com/docs/webstore/images',
  }),
  'chrome-marquee': web({
    label: 'Chrome Web Store marquee', size: [1400, 560], max: 1, strict: true,
    source: 'https://developer.chrome.com/docs/webstore/images',
  }),
  // Mac App Store: 16:10, one of four sizes, 1 to 10 per locale
  'mac-appstore': web({
    label: 'Mac App Store', platform: 'mac', device: 'laptop', size: [2880, 1800],
    sizes: [[2880, 1800], [2560, 1600], [1440, 900], [1280, 800]], max: 10, strict: true,
    source: 'https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications',
  }),
  // landing-page heroes: 16:10 (a 1440 x 900 viewport @2x) and 16:9
  'web-hero': web({ label: 'Website hero 16:10', size: [2880, 1800], source: null }),
  'web-hero-wide': web({ label: 'Website hero 16:9', size: [2560, 1440], source: null }),
  // Upwork / Dribbble / Behance cover, 4:3 (Dribbble shows 1600 x 1200; Upwork's catalog 1000 x 750)
  portfolio: web({
    label: 'Portfolio cover 4:3', size: [1600, 1200], maxBytes: 10 * MB,
    source: 'https://support.upwork.com/hc/en-us/articles/1500011309082-How-to-add-images-and-video-to-your-Project-Catalog-project',
  }),
};
