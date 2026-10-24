// Device frame markup. CSS lives in engine/devices/<device>.css; everything scales with --pw.
// under: drawn below the screen (band, buttons, bezel, lid, stand). over: drawn above it (camera, glass).
// The browser window has no frame here: it is built from engine/elements/browserbar.js.
export const FRAMES = {
  iphone: (o) => ({
    under: '<div class="body"></div><i class="btn action"></i><i class="btn vol-up"></i>'
      + '<i class="btn vol-down"></i><i class="btn power"></i><i class="btn cam"></i><div class="bezel"></div>',
    over: `${o.island === false ? '' : '<div class="island"></div>'}<div class="glass"></div>`,
  }),
  pixel: (o) => ({
    under: '<div class="band"></div><i class="btn power"></i><i class="btn vol"></i><div class="bezel"></div>',
    over: `${o.camera === false ? '' : '<div class="punch"></div>'}<div class="glass"></div>`,
  }),
  ipad: (o) => ({
    under: '<div class="body"></div><i class="btn top"></i><i class="btn vol-up"></i><i class="btn vol-down"></i><div class="bezel"></div>',
    over: `${o.camera === false ? '' : '<div class="cam"></div>'}<div class="glass"></div>`,
  }),
  // a generic aluminium laptop: lid with a thin black border, hinge, base with a thumb notch
  laptop: (o) => ({
    under: '<div class="floor"></div><div class="base"><i class="notch"></i></div><div class="hinge"></div><div class="lid"></div>',
    over: `${o.camera === false ? '' : '<div class="cam"></div>'}<div class="glass"></div>`,
  }),
  // a desktop display on a stand
  monitor: () => ({
    under: '<div class="floor"></div><div class="neck"></div><div class="foot"></div><div class="display"></div>',
    over: '<div class="glass"></div>',
  }),
};
