// render.js
// Renders film.html to an H.264 MP4: 1440x1152, 60 fps, 14.5 s, with motion blur.
// Each output frame is the average of N subframes spread across SPAN of a frame interval.
//
// Usage:
//   node render.js                                   # final: 60 fps, 16 subframes, 0.7 span
//   node render.js --fps 30 --subframes 1 --out preview30.mp4     # quick preview, no motion blur
//   node render.js --from 0 --to 120 --out test.mp4              # frame range for a test
//
// Needs: Node 18+, npm i playwright sharp, ffmpeg on PATH (with libx264),
// and the assets from build_assets.js in ./capture.
// Run on a machine with a real GPU for the final render (Claude Code on your computer).

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');
const sharp = require('sharp');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const FPS = Number(opt('fps', 60));
const SUB = Number(opt('subframes', 16));
const SPAN = Number(opt('span', 0.7));
const DURATION = Number(opt('duration', 14.5));
const OUT = opt('out', path.join(__dirname, 'aegis-flyover.mp4'));
const TOTAL = Math.round(DURATION * FPS);
const FROM = Number(opt('from', 0));
const TO = Number(opt('to', TOTAL));
const W = 1440, H = 1152;
const CHROME = process.env.CHROME || undefined;

// GPU flags for a real GPU. Windows: D3D11. macOS: Metal. Linux: ANGLE GL.
const GPU_ARGS = {
  win32: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'],
  darwin: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
}[process.platform] || ['--use-gl=angle', '--enable-gpu', '--ignore-gpu-blocklist'];
// override for a machine without a GPU, e.g. GPU_ARGS="--use-angle=swiftshader --enable-unsafe-swiftshader"
const GPU_ARGS_USED = process.env.GPU_ARGS ? process.env.GPU_ARGS.split(' ') : GPU_ARGS;

// static server: textures must come from http, not file://
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
  const srv = http.createServer((req, res) => {
    const p = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(__dirname) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const srv = await serve();
  const url = `http://127.0.0.1:${srv.address().port}/film.html`;
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', ...GPU_ARGS_USED] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.ready || window.bootError, null, { timeout: 300000 });
  const bootErr = await page.evaluate(() => window.bootError || null);
  if (bootErr) throw new Error('film page failed to boot: ' + bootErr.slice(0, 500));
  await page.evaluate(() => document.fonts && document.fonts.ready);
  const gl = await page.evaluate(() => { const c = document.createElement('canvas'); const g = c.getContext('webgl2'); const d = g && g.getExtension('WEBGL_debug_renderer_info'); return d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'webgl2 unavailable'; });
  console.log('renderer:', gl, '| frames', FROM, '-', TO, '| fps', FPS, '| subframes', SUB);

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${W}x${H}`, '-r', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));

  const n = W * H * 3;
  const acc = new Float32Array(n);
  const t0 = Date.now();
  for (let f = FROM; f < TO; f++) {
    acc.fill(0);
    for (let s = 0; s < SUB; s++) {
      const off = SUB === 1 ? 0 : (s / (SUB - 1) - 0.5) * SPAN / FPS;
      const t = Math.max(0, f / FPS + off);
      await page.evaluate(tt => window.seek(tt), t);
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: W, height: H } });
      const raw = await sharp(png).removeAlpha().raw().toBuffer();
      for (let i = 0; i < n; i++) acc[i] += raw[i];
    }
    const out = Buffer.alloc(n);
    for (let i = 0; i < n; i++) out[i] = Math.round(acc[i] / SUB);
    if (!ff.stdin.write(out)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - FROM) % FPS === 0) {
      const sec = (f / FPS).toFixed(1), el = ((Date.now() - t0) / 1000).toFixed(0);
      console.log(`frame ${f}/${TOTAL} (${sec}s) elapsed ${el}s`);
    }
  }
  ff.stdin.end();
  await ffDone;
  await browser.close();
  srv.close();
  console.log('wrote', OUT, `(${((Date.now() - t0) / 1000).toFixed(0)} s)`);
})().catch(e => { console.error(e); process.exit(1); });
