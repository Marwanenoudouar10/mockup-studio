// Element registry + builder. Every element type is one file; add yours to MAKERS.
//   phone / device / browser / laptop / monitor / tablet -> device.js (a screen in a CSS frame)
// Every drawn node carries data-el (the element id, scripts/lib/layout.js) and data-panel (its config panel).
import { preloadScreens } from '../core/assets.js';
import { track } from '../core/edit.js';
import { device } from './device.js';
import { lift } from './lift.js';
import { tile } from './tile.js';
import { badge } from './badge.js';
import { platformOf } from './resolve.js';

const MAKERS = { phone: device, device, browser: device, laptop: device, monitor: device, tablet: device, lift, tile, badge };

// ctx: { cv, fr, brand, device, platform, space, locale, icon, mirror? }
//   mirror(e): the element mirrored for an RTL layout (wide side mode, feature graphic); stage values stay
//   in config coordinates, so the workspace edit bridge can move them.
export async function buildElements(stage, ctx) {
  const screens = new Map();
  const full = {
    ...ctx,
    screen: (name, platform = ctx.platform) => screens.get(`${name}|${platform}`)
      || { name, missing: true, platform, w: 1320, h: 2868 },
  };
  const load = async (list) => {
    const wanted = list.filter((e) => e.screen).map((e) => ({ name: e.screen, platform: platformOf(e, ctx) }));
    for (const [k, v] of await preloadScreens(wanted, ctx)) screens.set(k, v);
  };
  const draw = (e) => {
    const type = e.type || e.t;
    const make = MAKERS[type];
    if (!make) {
      console.warn(`unknown element type "${type}" (known: ${Object.keys(MAKERS).join(', ')})`);
      return null;
    }
    const node = make({ ...(ctx.mirror ? ctx.mirror(e) : e), type }, full);
    if (node && e.id != null) node.dataset.el = e.id;
    if (node && e.$panel != null) node.dataset.panel = e.$panel;
    return node;
  };
  await load(stage);
  const scope = { ctx, draw, load };
  for (const e of stage) track(e, draw(e), scope);
}
