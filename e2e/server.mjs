// Solo para E2E: HTTP estático + API simulada, sin base de datos.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contenido, texto } from './fixtures.mjs';

const root = resolve(fileURLToPath(new URL('../public/', import.meta.url)));
const host = '127.0.0.1';
const port = Number(process.env.E2E_PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
};

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'content-type': contentType, 'cache-control': 'no-store' });
  res.end(body);
}

const server = createServer(async (req, res) => {
  if (req.method !== 'GET') return send(res, 405, 'Method not allowed');
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, `http://${host}:${port}`).pathname); }
  catch { return send(res, 400, 'Invalid URL'); }
  if (pathname === '/api/contenido')
    return send(res, 200, JSON.stringify(contenido), 'application/json; charset=utf-8');
  if (pathname === '/api/texto/EN_libro1_v8.txt')
    return send(res, 200, texto);
  if (pathname.startsWith('/api/')) return send(res, 404, 'Not found');

  const full = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
  if (full !== root && !full.startsWith(root + sep)) return send(res, 403, 'Forbidden');
  try {
    const info = await stat(full);
    if (!info.isFile()) return send(res, 404, 'Not found');
    return send(res, 200, await readFile(full), types[extname(full)] || 'application/octet-stream');
  } catch { return send(res, 404, 'Not found'); }
});
server.listen(port, host, () => console.log(`E2E mock en http://${host}:${port}`));
