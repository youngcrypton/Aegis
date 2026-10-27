// build_assets.js
// Captures the landing page into capture/ for the fly-over:
//   capture/layers.json   page size and rects of every lifting piece
//   capture/piece_*.png   each lifting piece on a transparent background (28px padding)
//   capture/tile0-3.jpg   the page base, split into four overlapping strips (GPU texture limit)
//   capture/logo_tile.png the logo tile
//
// Usage:  node build_assets.js                      (captures the live page)
//         PAGE=file:///path/to/index.html node build_assets.js   (captures a local file)
//
// Needs: npm i playwright sharp  and a Chromium that Playwright can launch.
// Set CHROME to a Chromium/Chrome binary path if Playwright's default is not installed.

const { chromium } = require('playwright');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PAGE = process.env.PAGE || 'https://aegis.terminall.workers.dev/';
const OUT = path.join(__dirname, 'capture');
const VH = 900;          // capture viewport height: keep it fixed, the layout depends on it
const W = 1440;
const PAD = 28;
const CHROME = process.env.CHROME || undefined;

const LAYERS = {
  sim: '.hero .sim', chipA: '#state', chipB: '.cmp-head.aegis',
  panelA: '#architecture .panel@0', panelB: '#architecture .panel@1', panelC: '#architecture .panel@2',
  proofMain: '.proof-main', proofA: '.proof-rest > div:nth-child(1)', proofB: '.proof-rest > div:nth-child(2)', proofC: '.proof-rest > div:nth-child(3)',
  vault: '.vault', hero: '.hero', btn: '.cta-row .btn', foot: '.site-foot',
};
// elements that are only measured, never tagged (tagging a container hides its children)
const MEASURE_ONLY = new Set(['hero', 'btn', 'foot']);

const LOGO_SVG_SRC = path.join(__dirname, 'logo', 'aegis-mark.svg');

function logoTileSvg() {
  const mark = fs.readFileSync(LOGO_SVG_SRC, 'utf8').replace(/<\?xml[^>]*>/, '').replace(/<!--[\s\S]*?-->/g, '');
  const inner = mark.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  const defs = (mark.match(/<defs>[\s\S]*?<\/defs>/) || [''])[0];
  const body = inner.replace(/<defs>[\s\S]*?<\/defs>/, '');
  const size = 512;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#161230" flood-opacity="0.18"/></filter></defs>
  <rect x="8" y="8" width="496" height="496" rx="112" fill="#FFFFFF" filter="url(#s)"/>
  <g transform="translate(${size / 2} ${size / 2}) scale(2.35) translate(-65.5 -64)">${defs}${body}</g>
</svg>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: VH }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.waitForTimeout(6000);                       // splash and entrance animations finish

  // scroll through once so every reveal fires, then return to the top
  const docH0 = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= docH0; y += 450) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120); }
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1200);

  // measure and tag the lifting pieces
  const layers = await page.evaluate(({ spec, measureOnly }) => {
    const out = {};
    for (const [name, sel] of Object.entries(spec)) {
      const [qs, qi] = sel.split('@');
      const el = qi !== undefined ? document.querySelectorAll(qs)[+qi] : document.querySelector(sel);
      if (!el) { out[name] = null; continue; }
      if (!measureOnly.includes(name)) el.setAttribute('data-layer', name);
      const r = el.getBoundingClientRect();
      out[name] = { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
    }
    return out;
  }, { spec: LAYERS, measureOnly: [...MEASURE_ONLY] });
  const docW = W;
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('page height', H, 'pieces', Object.keys(layers).filter(k => layers[k] && !MEASURE_ONLY.has(k)).length);

  // 1) page base in viewport-height chunks, lifting pieces hidden, topbar only in the first chunk
  const hide = await page.addStyleTag({ content: '[data-layer]{visibility:hidden !important}' });
  const chunks = [];
  for (let y = 0; y < H; y += VH) {
    const h = Math.min(VH, H - y);
    await page.evaluate(v => window.scrollTo(0, v), y);
    await page.waitForTimeout(350);
    const topHide = y === 0 ? null : await page.addStyleTag({ content: '.topbar{visibility:hidden !important}' });
    const p = path.join(OUT, `_chunk_${y}.png`);
    await page.screenshot({ path: p, clip: { x: 0, y, width: docW, height: h }, fullPage: true });
    if (topHide) await topHide.evaluate(el => el.remove());
    chunks.push({ y, h, p });
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await hide.evaluate(el => el.remove());

  const baseW = docW * 2, baseH = H * 2;
  const comp = chunks.map(c => ({ input: c.p, left: 0, top: c.y * 2 }));
  await sharp({ create: { width: baseW, height: baseH, channels: 3, background: '#ffffff' } })
    .composite(comp).png().toFile(path.join(OUT, 'page_base.png'));
  // four overlapping strips, each under the GPU texture limit
  const rows = [[0, 4140], [4133, 8273], [8266, 12406], [12399, baseH]];
  for (let i = 0; i < rows.length; i++) {
    const [a, b] = rows[i];
    await sharp(path.join(OUT, 'page_base.png')).extract({ left: 0, top: a, width: baseW, height: Math.min(b, baseH) - a })
      .jpeg({ quality: 95 }).toFile(path.join(OUT, `tile${i}.jpg`));
  }
  chunks.forEach(c => fs.unlinkSync(c.p));

  // 2) each lifting piece alone on a transparent background
  for (const [name, r] of Object.entries(layers)) {
    if (!r || MEASURE_ONLY.has(name)) continue;
    const st = await page.addStyleTag({ content: `body *{visibility:hidden !important} html,body{background:transparent !important} [data-layer="${name}"], [data-layer="${name}"] *{visibility:visible !important}` });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(150);
    await page.screenshot({ path: path.join(OUT, `piece_${name}.png`), omitBackground: true, fullPage: true,
      clip: { x: Math.max(0, r.x - PAD), y: Math.max(0, r.y - PAD), width: r.w + 2 * PAD, height: r.h + 2 * PAD } });
    await st.evaluate(el => el.remove());
  }
  fs.writeFileSync(path.join(OUT, 'layers.json'), JSON.stringify({ docW, docH: H, layers }, null, 2));
  await browser.close();

  // 3) logo tile
  await sharp(Buffer.from(logoTileSvg())).png().toFile(path.join(OUT, 'logo_tile.png'));
  console.log('assets written to', OUT);
})().catch(e => { console.error(e); process.exit(1); });
