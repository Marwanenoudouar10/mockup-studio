// Which frame an element draws and which raw/<platform>/ folder its screen comes from.
//   { type:'phone' }                    the target's phone (iPhone on the App Store, Pixel on Play; iPhone on wide targets)
//   { type:'device', device:'laptop' }  any frame in DEVICES (scripts/lib/stores.js)
//   { type:'browser' | 'laptop' | 'monitor' | 'tablet' }   shorthands for type:'device'
// A frame looks in its own platform's folder: device:'iphone' on a web target -> raw/ios/, a browser -> raw/web/.
// lift and tile use the target's platform; any element can force one with platform:'ios'.
import { DEVICES } from '../../scripts/lib/stores.js';

const SHORT = { browser: 'browser', laptop: 'laptop', monitor: 'monitor', tablet: 'ipad' };
export const FRAMED = new Set(['phone', 'device', ...Object.keys(SHORT)]);

// the frame the element itself asks for (null = the target's default frame)
function ownDevice(e, ctx) {
  if (e.device) return e.device;
  if (SHORT[e.type]) return SHORT[e.type];
  if (e.type === 'phone' && ctx.space === 'landscape') return ctx.platform === 'android' ? 'pixel' : 'iphone';
  return null;
}

export const deviceOf = (e, ctx) => ownDevice(e, ctx) || ctx.device;
export const ownsDevice = (e, ctx) => !!ownDevice(e, ctx);

export function platformOf(e, ctx) {
  if (e.platform) return e.platform;
  const d = FRAMED.has(e.type) && DEVICES[ownDevice(e, ctx)];
  if (!d) return ctx.platform; // the target's own frame shows the target's captures (store-level device overrides)
  return d.platforms.includes(ctx.platform) ? ctx.platform : d.platforms[0];
}
