// The project root as a URL path, so the engine works under any prefix:
//   npm run preview / render serve the project at '/', Mockup Studio (workspace/) serves it under /p/<slug>/.
// Every project file the engine loads by path ('brand/logo.svg', 'raw/ios/home.png') goes through at().
export const BASE = new URL('../../', import.meta.url).pathname;
export const at = (p) => `${BASE}${String(p ?? '').replace(/^\/+/, '')}`;
