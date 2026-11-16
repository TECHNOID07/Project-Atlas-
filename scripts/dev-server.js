/**
 * PROJECT ATLAS — Local Static HTTP Server (`scripts/dev-server.js`)
 * Binds strictly to 127.0.0.1 for 100% offline local execution.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const isPreview = process.argv.includes('--preview');
const serveRoot = isPreview && fs.existsSync(path.join(rootDir, 'dist'))
  ? path.join(rootDir, 'dist')
  : rootDir;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon'
};

const port = Number(process.env.PORT || 8080);
const host = '127.0.0.1';

const server = http.createServer((req, res) => {
  const parsed = new URL(req.url || '/', `http://${host}:${port}`);
  const rawPath = decodeURIComponent(parsed.pathname);
  const safeRel = path.normalize(rawPath).replace(/^(\.\.[/\\])+/, '');

  let filePath = path.join(serveRoot, safeRel === '/' ? 'index.html' : safeRel);
  if (!fs.existsSync(filePath) && !isPreview) {
    const pubCandidate = path.join(rootDir, 'public', safeRel);
    if (fs.existsSync(pubCandidate)) filePath = pubCandidate;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`PROJECT ATLAS Local Offline Server running at http://${host}:${port}`);
});
