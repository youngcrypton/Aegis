const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  let cleanUrl = req.url.split('?')[0];

  // Convenience redirection
  if (cleanUrl === '/' || cleanUrl === '') {
    res.writeHead(302, { 'Location': '/app/' });
    res.end();
    return;
  }

  if (cleanUrl.endsWith('/')) {
    cleanUrl += 'index.html';
  }

  const filePath = path.join(DIST_DIR, cleanUrl);

  // Security check: stay within DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Access Denied');
    return;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found: ' + req.url);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[AEGIS Dev Server] Running at:`);
  console.log(`  > Local:   http://localhost:${PORT}/app/`);
  console.log(`  > Network: http://127.0.0.1:${PORT}/app/`);
});
