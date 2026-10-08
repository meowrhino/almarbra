/* Las imágenes para compartir (og:image): 1200×630 en JPG, que es lo que
   esperan WhatsApp, Instagram, LinkedIn y compañía.

     media/og/portada.jpg     la portada: las portadas de unos cuantos
                              proyectos en fila, sobre blanco
     media/og/<slug>.jpg      cada proyecto: su portada entera, sobre
                              blanco, con aire alrededor

   Se hacen aquí, en local, con ffmpeg (brew install ffmpeg), y van al
   repo con el resto de media/: el build no las fabrica, solo las enlaza.
   Al lado, media/og/og.json apunta de qué foto salió cada una, y el
   build avisa si la portada de un proyecto ha cambiado desde entonces.

     node build/og.mjs        (npm run og)

   La portada de cada proyecto se elige igual que en build/build.mjs:
   `cover` de content/proyectos.json, o la primera foto. */

import { execFileSync } from 'node:child_process';
import {
  existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { variant } from './formats.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const OUT = join(ROOT, 'media', 'og');
const W = 1200;
const H = 630;
const AIR = 48;      // margen blanco alrededor, en px
const MOSAIC = 6;    // portadas en la de la portada

const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const site = read('content/web.json');
const changes = read('content/proyectos.json');

/* La variante de 800 basta y se lee mucho más deprisa que la grande. */
const source = (src) => {
  const small = variant(src, 800);
  return join(ROOT, existsSync(join(ROOT, small)) ? small : src);
};

const ffmpeg = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args, '-q:v', '3'], { stdio: 'inherit' });

/* Encajada en 1200×630 sin recortar, centrada sobre blanco. */
const fit = `scale=${W - 2 * AIR}:${H - 2 * AIR}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:white`;

const order = site.order || [];
const rank = (category) => (order.includes(category) ? order.indexOf(category) : order.length);
const projects = readdirSync(join(ROOT, 'content', 'projects'))
  .filter((n) => n.endsWith('.json'))
  .map((n) => read(`content/projects/${n}`))
  .sort((a, b) => rank(a.category) - rank(b.category) || a.slug.localeCompare(b.slug));
const coverOf = (p) => changes[p.slug]?.cover || p.cover || p.images[0].src;

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('\n✗ hace falta ffmpeg: brew install ffmpeg\n');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const made = {};

for (const p of projects) {
  const cover = coverOf(p);
  ffmpeg(['-i', source(cover), '-vf', fit, join(OUT, `${p.slug}.jpg`)]);
  made[p.slug] = cover;
  console.log(`og/${p.slug}.jpg`.padEnd(34) + cover);
}

/* La de la portada: las portadas de los primeros proyectos de la lista,
   a la misma altura y con un poco de aire entre ellas, en fila. */
const picks = projects.slice(0, MOSAIC).map(coverOf);
const row = picks.map((_, i) => `[${i}:v]scale=-2:440,pad=iw+24:ih:12:0:white[p${i}]`).join(';');
ffmpeg([
  ...picks.flatMap((src) => ['-i', source(src)]),
  '-filter_complex', `${row};${picks.map((_, i) => `[p${i}]`).join('')}hstack=inputs=${picks.length},${fit}`,
  join(OUT, 'portada.jpg'),
]);
made.portada = picks.join(' ');
console.log('og/portada.jpg'.padEnd(34) + `${picks.length} portadas`);

writeFileSync(join(OUT, 'og.json'), JSON.stringify(made, null, 2) + '\n');
console.log(`\n✓ media/og/: ${projects.length + 1} imágenes de ${W}×${H}`);
