/* Servidor estático para trabajar en local. Sin dependencias.
   `npm run serve` -> http://localhost:8000

   Sirve dist/, que es la web tal cual se publica.

   LENTO=1500 npm run serve   cada página tarda 1,5 s en llegar, como con
                              mala conexión: para ver el loader de la
                              transición, que en local no da tiempo */

import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 8000;
const SLOW = Number(process.env.LENTO) || 0;   // ms de espera en cada página

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
};

createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  // normalize + join: nada de salirse del proyecto con ../
  const path = normalize(url).replace(/^(\.\.[/\\])+/, '');

  try {
    let file = join(DIST, path);
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    const type = TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
    if (SLOW && type.startsWith('text/html')) await new Promise((r) => setTimeout(r, SLOW));
    res.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
    createReadStream(file).pipe(res);
  } catch {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
    createReadStream(join(DIST, '404.html')).on('error', () => res.end('404')).pipe(res);
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
