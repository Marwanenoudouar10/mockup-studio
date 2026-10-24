// studio.config.js: the ONE file you edit per project. Read by the Node scripts AND by the pages.
// Demo: "Brimpage", an invented journaling app (a name checked as unused in both stores; its site is the
// reserved brimpage.example). Replace brand, screens and copy with yours.
//
// Any text may be a string or per locale: { en: 'Hello', es: 'Hola' }.
// Any value may vary per store / platform: { playstore: 640, default: 720 }, crop: { ios: [..], android: [..] }.
// Headlines accept <em>word</em> (accent colour, or the highlight band) and <br>.

export default {
  brand: {
    name: 'Brimpage',
    domain: 'brimpage.example', // the brand's own site: browser tabs on it show the brand icon as favicon
    // Colours, fonts, field and headline weight come from the brand step (npm run brand -- apply),
    // the same file the mock screens read. Anything set below wins over it, e.g.
    //   colors: { accent: '#FFC27A' }   fonts: { display: { family: 'Poppins', weights: [700, 800] } }
    // Colour keys: primary (field), secondary (gradient middle), deep (gradient end, shadows),
    // accent (<em> word, highlight band), ink (dark text), paper (light fields), onField (copy on the field).
    tokens: 'brand/tokens.json',
    logo: 'brand/logo.svg', // inlined: currentColor = the headline colour
    mark: 'brand/mark.svg', // symbol only: the watermark uses it (falls back to the logo)
    // fonts: { extra: ['Noto Sans Arabic Variable'] },   // fallbacks for scripts the main fonts lack
    // field: 'gradient', // gradient | solid | light | dark | mesh | your own in brand/theme.css
    grain: true,
    watermark: true, // the giant faint mark; or { src: 'brand/other.svg', opacity: .06 } or false
    ornament: 'brush', // brush | highlight | none
    align: 'left', // left | center (mirrors automatically for RTL locales)
    // devices: { iphone: { island: false } },   // when your iOS captures already show the island
  },

  locales: ['en', 'es'],

  // Phone stores: appstore (iPhone 6.9" 1320x2868), appstore-6.3 (1206x2622, the slot App Store Connect marks
  // required), appstore-6.5 (1284x2778), ipad-13 (2064x2752), playstore (1080x1920), playstore-4k (2160x3840).
  // Wide targets: og (1200x630), x (1600x900), x-card, linkedin, square, portrait, producthunt (1270x760),
  // chrome-webstore, chrome-promo, chrome-marquee, mac-appstore, web-hero, web-hero-wide, portfolio (1600x1200).
  // Every id and size: scripts/lib/stores.js + scripts/lib/targets.js.
  // Object form: { id: 'appstore', panorama: true }  or  { id: 'mac-appstore', screens: 'web' } (a web app's captures)
  stores: ['appstore', 'appstore-6.3', 'playstore', 'og', 'producthunt', 'portfolio'],

  // Optional tuning of the copy block (design units on the 1320-wide canvas). Defaults shown.
  // layout: { headline: 118, headlineShort: 106, sub: 46, maxLines: 3, top: 210, gap: 140,
  //   wide: { mode: 'auto', headline: 96, sub: 38, copyWidth: 0.36, stageW: 1600, stageH: 1200 } },

  // One entry per store image, in store order: hero, three features, trust (5 is the default set).
  // stage: a 1320 x 1900 box hung under the copy and scaled to the room left.
  //   x = centre, y = top edge, w/h = size, r = rotation (deg), z = stacking order.
  // Screens are referenced by NAME: raw/<platform>/<locale>/<name>.png, else raw/<platform>/<name>.png.
  panels: [
    {
      logo: true,
      headline: { en: 'Your day, <em>one&nbsp;page</em> at a time', es: 'Tu día, <em>una&nbsp;página</em> a la vez' },
      stage: [
        { type: 'phone', screen: 'home', w: 760, x: 660, y: 40, z: 20 },
        // lifts by box name: data-box="streak" / "lifts" in screens/insights.html -> raw/<platform>/insights.boxes.json
        { type: 'lift', screen: 'insights', box: 'streak', w: 520, x: 960, y: { playstore: 200, default: 330 }, r: 4, z: 31 },
        { type: 'lift', screen: 'insights', box: 'lifts', w: 560, x: 930, y: 1250, r: 3, z: 33 },
        { type: 'badge', text: { en: 'Private by default', es: 'Privado por defecto' }, icon: 'lock', x: 400, y: 1130, r: -4, z: 40 },
      ],
    },
    {
      headline: { en: 'Write it down in <em>seconds</em>', es: 'Escríbelo en <em>segundos</em>' },
      sub: {
        en: 'Prompts, photos and moods. Your journal is ready when you are.',
        es: 'Preguntas, fotos y estados de ánimo. Tu diario, listo cuando tú lo estés.',
      },
      stage: [
        { type: 'phone', screen: 'entry', w: 700, x: 750, y: 0, r: 5, z: 10 },
        // box: a named card from raw/<platform>/home.boxes.json (written by `npm run screens` from data-box="prompt").
        // For a real capture without boxes, crop in screen pixels: crop: { ios: [x, y, w, h], android: [x, y, w, h] }
        { type: 'lift', screen: 'home', box: 'prompt', w: 820, x: 540, y: 1010, r: -4, z: 30 },
      ],
    },
    {
      headline: { en: 'See what <em>lifts</em> your mood', es: 'Descubre qué <em>mejora</em> tu ánimo' },
      sub: {
        en: 'Weekly insights turn small notes into clear patterns.',
        es: 'Resúmenes semanales que convierten notas pequeñas en patrones claros.',
      },
      stage: [
        // a frameless screen as a window, the phone in front, one card lifted out
        { type: 'tile', screen: 'insights', w: 840, h: 1240, x: 490, y: 0, r: -3, z: 5, radius: 70, pos: 'top' },
        // it runs off the right edge on purpose (the top too: devices turn around their bottom centre)
        { type: 'phone', screen: 'entry', w: 600, x: 1010, y: 460, r: 7, z: 20, bleed: true },
        { type: 'lift', screen: 'home', box: 'mood', w: 680, x: 460, y: 1150, r: -3, z: 30 },
      ],
    },
    {
      headline: { en: 'A gentle <em>nudge</em>, never a nag', es: 'Un <em>aviso</em> amable, nunca una lata' },
      sub: {
        en: 'Pick your time. A streak saver covers the busy days.',
        es: 'Elige la hora. El salvavidas de racha cubre los días con prisa.',
      },
      stage: [
        // one big straight phone: the screen speaks for itself (it bleeds off the bottom on purpose)
        { type: 'phone', screen: 'remind', w: 880, x: 660, y: 30, z: 20 },
      ],
    },
    {
      headline: { en: 'Yours alone, <em>locked</em> and private', es: 'Solo tuyo, <em>protegido</em> y privado' },
      sub: {
        en: 'A lock on every page, encrypted sync, no account needed.',
        es: 'Un candado en cada página, sincronización cifrada y sin cuenta.',
      },
      stage: [
        // trust: a stack of cards from one screen, no device (every card is real UI)
        // (Android's cards are taller: smaller widths on Play keep the three apart on the 9:16 canvas)
        { type: 'lift', screen: 'privacy', box: 'lock', w: { playstore: 900, default: 1040 }, x: 640, y: 20, r: -3, z: 10 },
        // Android lists are connected rows (no card corners): give the lifted list its own radius
        { type: 'lift', screen: 'privacy', box: 'options', w: { playstore: 960, default: 1080 }, x: 670, y: 720, r: 2, z: 20,
          radius: { ios: 78, android: 64 } },
        { type: 'lift', screen: 'privacy', box: 'offline', w: { playstore: 940, default: 1060 }, x: 650, y: { playstore: 1370, default: 1260 }, r: -2, z: 30 },
      ],
    },

    // Wide targets (og, producthunt, portfolio): space 'landscape' panels, laid out by engine/layout/wide.js.
    // The stage is 1600 x 1200 design units beside the copy (side) or under it (stack); x = centre, y = top.
    // only: which targets show the panel (og takes one image). Screens: raw/web/ (npm run screens: screens/web/).
    {
      space: 'landscape',
      only: ['og', 'producthunt'],
      logo: true,
      headline: { en: 'Your journal, now on the <em>web</em>', es: 'Tu diario, ahora en la <em>web</em>' },
      sub: {
        en: 'Write on any screen. Pick up where you left off.',
        es: 'Escribe en cualquier pantalla. Sigue donde lo dejaste.',
      },
      stage: [
        { type: 'browser', screen: 'journal', url: 'brimpage.example/journal', title: { en: 'Journal · Brimpage', es: 'Diario · Brimpage' }, w: 1500, x: 880, y: 150, z: 10 },
        { type: 'lift', screen: 'journal', box: 'prompt', w: 500, x: 230, y: 760, r: -4, z: 30 },
      ],
    },
    {
      space: 'landscape',
      only: ['producthunt'],
      headline: { en: 'Patterns at a <em>glance</em>', es: 'Tus patrones de un <em>vistazo</em>' },
      sub: {
        en: 'Streaks, moods and what lifts them, in one calm dashboard.',
        es: 'Rachas, estados de ánimo y lo que los mejora, en un panel tranquilo.',
      },
      stage: [
        { type: 'laptop', screen: 'dashboard', url: 'brimpage.example/insights', title: { en: 'Insights · Brimpage', es: 'Resumen · Brimpage' }, w: 1240, x: 820, y: 170, z: 10 },
        { type: 'lift', screen: 'dashboard', box: 'lifts', w: 500, x: 1260, y: 720, r: 3, z: 30 },
      ],
    },
    {
      space: 'landscape',
      only: ['producthunt', 'portfolio'],
      headline: { en: 'Write anywhere. <em>Pick&nbsp;up</em> everywhere.', es: 'Escribe donde sea. <em>Sigue</em> en todas partes.' },
      sub: { en: 'One journal on your laptop, tablet and phone.', es: 'Un diario en tu portátil, tableta y móvil.' },
      stage: [
        // the responsive trio: the same page at three widths (screens/web/journal.html, kit-sizes web,ipad,ios)
        { type: 'laptop', screen: 'journal', url: 'brimpage.example/journal', w: 1120, x: 640, y: 150, z: 10 },
        { type: 'tablet', screen: 'journal', url: 'brimpage.example/journal', w: 470, x: 1250, y: 400, z: 20 },
        { type: 'phone', screen: 'journal', url: 'brimpage.example/journal', w: 236, x: 1450, y: 590, z: 30 },
      ],
    },
  ],

  // Google Play feature graphic, 1024 x 500. Stage coords are plain pixels of that image.
  // The copy starts at x 154 (side) in a 380 px column (copyWidth): Google crops about 15% per side, so the
  // logo, name and slogan stay inside x 154-872, y 76-424 (the page warns when they leave it).
  feature: {
    headline: { en: 'Your day, <em>one&nbsp;page</em> at a time', es: 'Tu día, <em>una&nbsp;página</em> a la vez' },
    logo: true,
    stage: [
      { type: 'phone', screen: 'entry', w: 196, x: 668, y: 120, r: -8, z: 10 },
      { type: 'phone', screen: 'insights', w: 196, x: 932, y: 120, r: 8, z: 11, bleed: true }, // a fan's side phone, cut on purpose
      { type: 'phone', screen: 'home', w: 236, x: 800, y: 52, z: 20 },
    ],
  },

  // Store icons from one square artwork (no rounded corners: the stores mask it). npm run brand -- apply
  // --logo <id> derives brand/icon.svg from the symbol. background (what the App Store icon is flattened
  // onto, if the artwork has transparent parts) defaults to the brand's primary colour.
  icon: { src: 'brand/icon.svg' },

  // Overview sheets (final/<locale>/overview-<store>.jpg). background: default = the brand's paper a step darker.
  sheet: { height: 1100, gap: 44, padding: 96, title: true },
};
