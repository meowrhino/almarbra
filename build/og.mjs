/* Las imágenes para compartir (og:image): 1200×630 en JPG, que es lo que
   esperan WhatsApp, Instagram, LinkedIn y compañía.

     og.jpg                   la portada: las portadas de unos cuantos
                              proyectos en fila, sobre blanco
     projects/<slug>/og.jpg   cada proyecto: su portada entera, sobre
                              blanco, con aire alrededor

   Se hacen aquí, en local, con ffmpeg (brew install ffmpeg), y van al
   repo: el build no las fabrica, solo las enlaza. Si se cambia la
   portada de un proyecto, hay que volver a hacerlas.

     node build/og.mjs        (npm run og) */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadProjects } from './proyectos.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const W = 1200;
const H = 630;
const AIR = 48;      // margen blanco alrededor, en px
const MOSAIC = 6;    // portadas en la de la portada

const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const { projects } = loadProjects(ROOT, read('content/web.json'), read);

const source = (src) => join(ROOT, src);

const ffmpeg = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args, '-q:v', '3'], { stdio: 'inherit' });

/* Encajada en 1200×630 sin recortar, centrada sobre blanco. */
const fit = `scale=${W - 2 * AIR}:${H - 2 * AIR}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:white`;

try {
  execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
} catch {
  console.error('\n✗ hace falta ffmpeg: brew install ffmpeg\n');
  process.exit(1);
}

for (const p of projects) {
  ffmpeg(['-i', source(p.cover.src), '-vf', fit, join(ROOT, 'projects', p.slug, 'og.jpg')]);
  console.log(`projects/${p.slug}/og.jpg`.padEnd(40) + p.cover.file);
}

/* La de la portada: las portadas de los primeros proyectos de la lista,
   a la misma altura y con un poco de aire entre ellas, en fila. */
const picks = projects.slice(0, MOSAIC).map((p) => p.cover.src);
const row = picks.map((_, i) => `[${i}:v]scale=-2:440,pad=iw+24:ih:12:0:white[p${i}]`).join(';');
ffmpeg([
  ...picks.flatMap((src) => ['-i', source(src)]),
  '-filter_complex', `${row};${picks.map((_, i) => `[p${i}]`).join('')}hstack=inputs=${picks.length},${fit}`,
  join(ROOT, 'og.jpg'),
]);
console.log('og.jpg'.padEnd(40) + `${picks.length} portadas`);
