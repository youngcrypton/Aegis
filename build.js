/**
 * AEGIS Protocol — Production Static Site Bundler for Cloudflare
 * Copies clean production assets into dist/ excluding repo internals (.git, cache, contracts, etc.)
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

function copyRecursive(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

console.log('Bundling AEGIS Protocol for Cloudflare Pages / Workers...');

// 1. Clean dist
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

// 2. Individual root files
const rootFiles = [
  'index.html',
  'access.html',
  'supabase-client.js',
  'download.html',
  '_headers',
  '_routes.json',
  'favicon.ico',
  'favicon.svg',
  'favicon-32x32.png',
  'favicon-16x16.png',
  'apple-touch-icon.png',
  'icon-192x192.png',
  'icon-512x512.png',
  'site.webmanifest',
  'LIGHTPAPER.md',
  'SUMMARY.md',
  '.gitbook.yaml',
  '.nojekyll'
];

rootFiles.forEach(file => {
  const src = path.join(ROOT, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(DIST, file));
    console.log(` ✓ Copied root ${file}`);
  }
});

// 3. Static directories
const dirsToCopy = ['brand', 'assets', 'docs', 'app', 'gitbook'];

dirsToCopy.forEach(dir => {
  const src = path.join(ROOT, dir);
  if (fs.existsSync(src)) {
    copyRecursive(src, path.join(DIST, dir));
    console.log(` ✓ Copied directory /${dir}`);
  }
});

console.log('[AEGIS] Protocol successfully bundled into ./dist ready for Cloudflare deployment!');
