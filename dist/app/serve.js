/**
 * Lightweight local server for AEGIS Protocol Pro-Trader Terminal Prototype
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.resolve(__dirname);
const REPO_ROOT = path.resolve(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt',
  '.srt': 'text/plain; charset=utf-8'
};

/**
 * Robust cross-platform directory containment check
 */
function isWithinDirectory(rootDir, targetPath) {
  const normalizedRoot = path.resolve(rootDir);
  const normalizedTarget = path.resolve(targetPath);
  const relative = path.relative(normalizedRoot, normalizedTarget);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
}

const server = http.createServer((req, res) => {
  // 1. Method check: only GET and HEAD supported
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain', 'Allow': 'GET, HEAD' });
    res.end('405 Method Not Allowed');
    return;
  }

  // 2. Safe URL decoding to prevent unhandled URIError crashes
  let reqUrl;
  try {
    const rawPath = (req.url || '/').split('?')[0];
    if (rawPath.includes('\0')) {
      res.writeHead(400, { 'Content-Type': 'text/plain' });
      res.end('400 Bad Request');
      return;
    }
    reqUrl = decodeURIComponent(rawPath);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('400 Bad Request: Malformed URI');
    return;
  }

  if (reqUrl === '/' || reqUrl === '/app') {
    reqUrl = '/index.html';
  }

  let filePath;
  let targetDir;

  if (reqUrl === '/landing' || reqUrl === '/overview') {
    filePath = path.resolve(REPO_ROOT, 'index.html');
    targetDir = REPO_ROOT;
  } else if (
    reqUrl.startsWith('/brand/') ||
    reqUrl.startsWith('/assets/') ||
    reqUrl.startsWith('/remotion/') ||
    reqUrl.startsWith('/docs/')
  ) {
    // Strip leading slash to safely join
    const safeRelPath = reqUrl.replace(/^\/+/, '');
    filePath = path.resolve(REPO_ROOT, safeRelPath);
    targetDir = REPO_ROOT;
  } else {
    const safeRelPath = reqUrl.replace(/^\/+/, '');
    filePath = path.resolve(PUBLIC_DIR, safeRelPath);
    targetDir = PUBLIC_DIR;
  }

  // Strict path traversal validation
  if (!isWithinDirectory(targetDir, filePath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Support HTTP Range requests for video seeking/scrubbing
    const range = req.headers.range;
    if (range && (ext === '.mp4' || ext === '.webm')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });

      if (req.method === 'HEAD') {
        res.end();
        return;
      }

      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.on('error', () => {
        if (!res.headersSent) res.writeHead(500);
        res.end();
      });
      fileStream.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`AEGIS Pro-Trader Terminal running at http://localhost:${PORT}/`);
});
