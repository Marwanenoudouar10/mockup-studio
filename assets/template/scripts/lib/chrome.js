// Finds the user's installed Chrome / Chromium / Edge / Brave and launches ONE headless instance.
// Override with CHROME_PATH=/path/to/browser.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

function macCandidates() {
  const apps = [
    'Google Chrome.app/Contents/MacOS/Google Chrome',
    'Chromium.app/Contents/MacOS/Chromium',
    'Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    'Brave Browser.app/Contents/MacOS/Brave Browser',
    'Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  ];
  const roots = ['/Applications', path.join(os.homedir(), 'Applications')];
  return roots.flatMap((r) => apps.map((a) => path.join(r, a)));
}

function linuxCandidates() {
  const names = ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser', 'microsoft-edge', 'microsoft-edge-stable', 'brave-browser'];
  const found = [];
  for (const n of names) {
    try {
      const p = execFileSync('which', [n], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
      if (p) found.push(p);
    } catch { /* not on PATH */ }
  }
  return [...found, '/opt/google/chrome/chrome', '/snap/bin/chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'];
}

function windowsCandidates() {
  const roots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const rels = [
    'Google\\Chrome\\Application\\chrome.exe',
    'Microsoft\\Edge\\Application\\msedge.exe',
    'Chromium\\Application\\chrome.exe',
    'BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  ];
  return roots.flatMap((r) => rels.map((x) => path.join(r, x)));
}

export function findChrome() {
  const env = process.env.CHROME_PATH;
  if (env) {
    if (fs.existsSync(env)) return env;
    throw new Error(`CHROME_PATH is set but nothing is there: ${env}`);
  }
  const list = process.platform === 'darwin' ? macCandidates()
    : process.platform === 'win32' ? windowsCandidates()
    : linuxCandidates();
  const hit = list.find((p) => p && fs.existsSync(p));
  if (hit) return hit;
  throw new Error([
    'No Chrome, Chromium, Edge or Brave found.',
    '  Install Google Chrome: https://www.google.com/chrome/',
    '  Linux: sudo apt install chromium   (or google-chrome-stable)',
    '  Or point to any Chromium-based browser: CHROME_PATH=/path/to/chrome npm run export',
  ].join('\n'));
}

export async function launchChrome() {
  const { default: puppeteer } = await import('puppeteer-core');
  return puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    defaultViewport: null,
    args: [
      '--hide-scrollbars',
      '--force-color-profile=srgb',
      '--font-render-hinting=none',
      '--disable-lcd-text',
      '--no-first-run',
      '--no-default-browser-check',
      '--mute-audio',
    ],
  });
}
