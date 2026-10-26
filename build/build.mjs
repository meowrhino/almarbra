/* data/ + textil/, foto/ (las listas) + diaris/ -> dist/

   Las páginas salen de build/paginas.mjs (las plantillas, las mismas
   que usa la vista previa, build/preview.mjs); aquí, lo que toca el
   disco: leer los JSON y las fotos, hacer las fotos pequeñas del mapa y
   las imágenes para compartir, y escribirlo todo en dist/:

     dist/index.html                    portada: el mapa
     dist/<lista>/index.html            cada lista (textil/, foto/)
     dist/diaris/index.html             las fotos de diaris/, barajadas
     dist/about/index.html              el about
     dist/<lista>/<slug>/index.html     cada proyecto: ficha técnica y
                                        galería en scroll vertical

   Una vez por idioma: el del sitio en la raíz y los demás en su carpeta
   (dist/en/, dist/ca/…), cada página con sus hreflang.

   Más lo que pide un sitio estático: 404.html, sitemap.xml, robots.txt,
   .nojekyll, _headers y favicon.svg, y una copia de css/, js/ y
   las fotos (dist/media/). dist/ no se commitea: lo publica la Action
   (.github/workflows/deploy.yml).

   Antes de escribir nada, valida: un JSON roto, un campo que no dice
   schema/, una foto que no está o una foto de `cover` o `map` que no está
   paran el build con un mensaje, y la web publicada se queda como estaba
   (en la Action, además, un issue: CLAUDE.md).

   El sitio funciona entero sin JavaScript: sin él el mapa son las fotos
   seguidas, y las listas y el about son páginas. Con él: js/mapa.js monta el mapa,
   js/transicion.js tapa y destapa al cambiar de página (con el dibujo
   de js/ola.js), js/hilos.js da la forma a los hilos, js/telar.js teje
   el fondo del about y js/hilo.js dibuja el de los proyectos.

     node build/build.mjs      (npm run build)

   Lo que se edita:

     data/site.json          título, dirección, descripción, idiomas, las
                             listas con su nombre y sus proyectos, el menú,
                             email, redes y la mezcla del mapa
     data/about.json         el texto del about, por idioma
     <lista>/<slug>/project.json    cada proyecto, en la carpeta de su
                             lista (textil/, foto/): título, texto,
                             créditos, color, fotos, portada y mapa
                             (ver build/proyectos.mjs)
     diaris/1.webp …         las fotos de diaris */

import { createHash } from 'node:crypto';
import {
  closeSync, cpSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, readSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { OG_H, OG_W, abs, esc, prefix, sitio } from './paginas.mjs';
import { leerJSON, loadDiaris, loadProjects, slugOf, validar, webpSize } from './proyectos.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const OUT = join(ROOT, 'dist');

/** Para el build: cada línea con su ✗ (la Action las copia al issue). */
const fail = (lines) => {
  console.error(`\n${[].concat(lines).map((l) => `✗ ${l}`).join('\n')}\n\nNo se escribe nada hasta que se arregle (en VS Code sale subrayado en rojo); la vista previa (Live Server) lo enseña igual.\n`);
  process.exit(1);
};

/* Cada JSON se lee y se comprueba con su esquema (schema/), el mismo con
   el que VS Code subraya lo que está mal: un JSON roto dice dónde, y un
   campo mal escrito o del tipo que no es para el build. */
const schema = (type) => JSON.parse(readFileSync(join(ROOT, 'schema', `${type}.json`), 'utf8'));
const invalid = [];
function read(file, type) {
  let data;
  try { data = leerJSON(readFileSync(join(ROOT, file), 'utf8'), file); } catch (e) { fail(e.message); }
  invalid.push(...validar(data, schema(type), file));
  return data;
}

const site = read('data/site.json', 'site');
const about = read('data/about.json', 'about');
const files = new Map();
for (const [category, list] of Object.entries(site.lists || {})) {
  for (const slug of (list?.projects || []).map(slugOf)) {
    const at = `${category}/${slug}/project.json`;
    if (typeof slug === 'string' && existsSync(join(ROOT, at))) files.set(at, read(at, 'project'));
  }
}
if (invalid.length) fail(invalid);

/* Dónde se publica, según dónde se construye (JAMstack, patrones.md §5):
   en la Action de GitHub (nuestra copia), meowrhino.github.io/almarbra/ y
   sin indexar; en cualquier otro sitio (Workers Builds, la copia de
   Almudena), la raíz con el dominio de site.json → "url", y se indexa si
   lo hay. */
const github = process.env.GITHUB_ACTIONS === 'true';
const [owner, repo] = (process.env.GITHUB_REPOSITORY || 'meowrhino/almarbra').split('/');
if (github) site.url = `https://${owner}.github.io/${repo}/`;
else if (site.url) site.url = site.url.replace(/\/?$/, '/');
site.noindex = github || !site.url;

/* ── validar ─────────────────────────────────────────────────────── */

function sizeOf(src) {
  const file = join(ROOT, src);
  if (!existsSync(file)) return undefined;
  const b = Buffer.alloc(30);
  const fd = openSync(file, 'r');
  readSync(fd, b, 0, 30, 0);
  closeSync(fd);
  return webpSize(b);
}

const { projects, errors, warnings } = loadProjects(site, {
  json: (at) => files.get(at),
  size: sizeOf,
  folders: Object.keys(site.lists || {}).filter((category) => existsSync(join(ROOT, category))).flatMap((category) =>
    readdirSync(join(ROOT, category), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => `${category}/${e.name}`)),
});

/* diaris/: las que se llaman 1.webp, 2.webp…; lo demás no sale. La
   vista previa las busca por orden y se para en el primer hueco. */
const DIARIS = join(ROOT, 'diaris');
const diarisFiles = existsSync(DIARIS) ? readdirSync(DIARIS).filter((f) => !f.startsWith('.')) : [];
const numbers = diarisFiles.map((f) => /^([1-9][0-9]*)\.webp$/.exec(f)?.[1]).filter(Boolean).map(Number).sort((a, b) => a - b);
for (const f of diarisFiles) if (!/^[1-9][0-9]*\.webp$/.test(f)) warnings.push(`diaris/${f} no sale: las fotos de diaris se llaman 1.webp, 2.webp… (como las saca imgToWeb)`);
const gap = numbers.findIndex((n, i) => n !== i + 1);
if (gap >= 0) warnings.push(`diaris: falta ${gap + 1}.webp (en la web salen todas, pero la vista previa se para ahí)`);
const { images: diaris, errors: diarisErrors } = loadDiaris(numbers, sizeOf);
errors.push(...diarisErrors);

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) fail(errors);

/* ── lo que necesitan las plantillas del disco ───────────────────── */

/* ?v=<hash> para que un deploy no deje a nadie con el CSS o el JS viejos
   en caché. Se calcula una vez por archivo, no una por página. */
const hashes = new Map();
function version(file) {
  if (!hashes.has(file)) {
    const path = join(ROOT, file);
    hashes.set(file, existsSync(path)
      ? `?v=${createHash('sha1').update(readFileSync(path)).digest('hex').slice(0, 8)}`
      : '');
  }
  return hashes.get(file);
}

/* Las imágenes que hace el build, con sharp (npm ci; va igual en la
   Action que en Workers Builds, donde no hay ffmpeg ni cwebp), en
   .cache/, fuera de git, y solo si no están o ha cambiado la foto de la
   que salen. Sin sharp se publica igual y se avisa: al compartir sale la
   portada tal cual y el mapa usa las fotos grandes.

   La imagen al compartir (og:image): 1200×630 en JPG, que es lo que
   esperan WhatsApp, Instagram, LinkedIn y compañía. La de un proyecto,
   su portada entera sobre blanco, con aire; la de la portada de la web y
   la de cada lista, las portadas de sus primeros proyectos en fila.

   Las fotos del mapa salen a 170 px como mucho (340 con el zoom): las de
   2000 serían 30 MB de golpe. Así que de cada una se hace otra de MINI px
   de ancho, que se publica en media/<slug>/mapa/.

   Las plantillas piden og y fotos pequeñas mientras pintan, y sharp va
   aparte (es asíncrono): una primera pasada apunta cuáles hacen falta, se
   hacen, y se pinta. */
const AIR = 48;      // margen blanco alrededor de la og, en px
const MOSAIC = 6;    // portadas en la og de la portada y de cada lista
const MINI = 600;
const DIARI = 1000;   // las de diaris, en columnas de unos 450 px
const WHITE = { r: 255, g: 255, b: 255 };

let sharp;
try { sharp = (await import('sharp')).default; } catch (e) {
  console.warn(`⚠ sin sharp (${e.code || e.message}): al compartir sale la portada tal cual y el mapa usa las fotos grandes. Se arregla con: npm ci`);
}

const fresh = (out, srcs) => existsSync(out) && statSync(out).mtimeMs >= Math.max(...srcs.map((src) => statSync(join(ROOT, src)).mtimeMs));

/** La og de `srcs` (una portada, o varias en fila) en .cache/og/. */
async function makeOg(srcs) {
  const key = createHash('sha1').update(srcs.join('|')).digest('hex').slice(0, 12);
  const cached = join(ROOT, '.cache', 'og', `${key}.jpg`);
  if (fresh(cached, srcs)) return cached;
  let picture = join(ROOT, srcs[0]);
  if (srcs.length > 1) {
    // cada portada a 440 de alto con 12 px blancos a cada lado, en fila
    const tiles = await Promise.all(srcs.map((src) => sharp(join(ROOT, src)).resize({ height: 440 }).flatten({ background: WHITE })
      .extend({ left: 12, right: 12, background: WHITE }).png().toBuffer({ resolveWithObject: true })));
    let left = 0;
    picture = await sharp({ create: { width: tiles.reduce((w, t) => w + t.info.width, 0), height: 440, channels: 3, background: WHITE } })
      .composite(tiles.map((t) => ({ input: t.data, left: (left += t.info.width) - t.info.width, top: 0 }))).png().toBuffer();
  }
  mkdirSync(dirname(cached), { recursive: true });
  await sharp(picture).resize(OG_W - 2 * AIR, OG_H - 2 * AIR, { fit: 'contain', background: WHITE }).flatten({ background: WHITE })
    .extend({ top: AIR, bottom: AIR, left: AIR, right: AIR, background: WHITE }).jpeg({ quality: 85, mozjpeg: true }).toFile(cached);
  return cached;
}

/** La foto pequeña del mapa de `image` en .cache/mapa/<lista>/<slug>/. */
const miniOf = (src) => join(ROOT, '.cache', 'mapa', src.replace(/\/img\//, '/'));
async function makeMini(image) {
  const out = miniOf(image.src);
  if (fresh(out, [image.src])) return;
  mkdirSync(dirname(out), { recursive: true });
  await sharp(join(ROOT, image.src)).resize({ width: Math.min(MINI, image.w) }).webp({ quality: 85 }).toFile(out);
}

/** La de diaris/ a DIARI px de ancho, en .cache/diaris/: es la que se publica. */
async function makeDiari(image) {
  const out = join(ROOT, '.cache', 'diaris', image.file);
  if (fresh(out, [image.src])) return out;
  mkdirSync(dirname(out), { recursive: true });
  await sharp(join(ROOT, image.src)).resize({ width: Math.min(DIARI, image.w) }).webp({ quality: 85 }).toFile(out);
  return out;
}

const ogWanted = new Map();     // su ruta en dist/ → las fotos de las que sale
const miniWanted = new Map();   // la foto → la foto
const ogDone = new Map();       // su ruta en dist/ → la foto hecha, en .cache/og/
const miniDone = new Set();
const minis = (image) => (miniDone.has(image.src) ? { ...image, src: image.src.replace(/\/img\//, '/mapa/') } : image);
const ogs = (out, srcs) => {
  ogWanted.set(out, srcs);
  return ogDone.has(out) ? out : null;
};
const images = {
  mini: (image) => (miniWanted.set(image.src, image), minis(image)),
  projectOg: (project) => ogs(`media/${project.dir}/og.jpg`, [project.cover.src]),
  mosaicOg: (out, list) => ogs(out, list.slice(0, MOSAIC).map((p) => p.cover.src)),
};

/* La primera pasada, sin escribir nada: qué imágenes piden las plantillas. */
const dry = sitio({ site, about, projects, diaris, version, ...images });
for (const l of dry.LANGS) for (const path of dry.paths) dry.render(l, path);
if (sharp) {
  for (const image of miniWanted.values()) {
    try { await makeMini(image); miniDone.add(image.src); } catch (e) { console.warn(`⚠ ${image.src}: no se ha podido hacer su foto pequeña del mapa (${e.message})`); }
  }
  for (const [out, srcs] of ogWanted) {
    try { ogDone.set(out, await makeOg(srcs)); } catch (e) { console.warn(`⚠ ${out}: no se ha podido hacer la imagen para compartir (${e.message})`); }
  }
}

/* ── escribir ────────────────────────────────────────────────────── */

rmSync(OUT, { recursive: true, force: true, maxRetries: 5 });
mkdirSync(OUT, { recursive: true });
for (const d of ['css', 'js']) cpSync(join(ROOT, d), join(OUT, d), { recursive: true });
for (const f of ['_headers', 'favicon.svg']) cpSync(join(ROOT, f), join(OUT, f));
/* Las fotos de cada proyecto, sin su JSON; las del mapa y las og, después. */
for (const p of projects) {
  cpSync(join(ROOT, p.dir), join(OUT, 'media', p.dir), { recursive: true, filter: (f) => !f.endsWith('.json') });
}
/* Las de diaris, a DIARI px (sin sharp, tal cual). */
for (const image of diaris) {
  let from = join(ROOT, image.src);
  if (sharp) {
    try { from = await makeDiari(image); } catch (e) { console.warn(`⚠ ${image.src}: no se ha podido hacer pequeña (${e.message}); sale la grande`); }
  }
  mkdirSync(join(OUT, 'media', 'diaris'), { recursive: true });
  cpSync(from, join(OUT, 'media', 'diaris', image.file));
}

const web = sitio({ site, about, projects, diaris, version, ...images });
const { LANGS, LISTS, paths, listed } = web;

for (const l of LANGS) {
  for (const path of paths) {
    mkdirSync(join(OUT, prefix(l), path), { recursive: true });
    writeFileSync(join(OUT, prefix(l), path, 'index.html'), web.render(l, path));
  }
  console.log(`${prefix(l) || '/'}`.padEnd(8) + `mapa, ${LISTS.join(', ')}, ${diaris.length ? `diaris (${diaris.length} fotos), ` : ''}about y ${projects.length} proyectos`);
}

/* Las imágenes que ha hecho sharp, de .cache/ a dist/. */
for (const src of miniDone) cpSync(miniOf(src), join(OUT, 'media', src.replace(/\/img\//, '/mapa/')));
for (const [out, cached] of ogDone) cpSync(cached, join(OUT, out));

writeFileSync(join(OUT, '404.html'), web.notFound());

writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.flatMap((l) => listed.map((p) => `  <url><loc>${esc(abs(prefix(l) + p))}</loc>${
  LANGS.length > 1 ? LANGS.map((o) => `<xhtml:link rel="alternate" hreflang="${o}" href="${esc(abs(prefix(o) + p))}"/>`).join('') : ''
}</url>`)).join('\n')}
</urlset>
`);

writeFileSync(
  join(OUT, 'robots.txt'),
  site.noindex ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${abs('sitemap.xml')}\n`
);

// GitHub Pages: servir los archivos tal cual, sin pasar por Jekyll
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`\n✓ dist/: ${paths.length} páginas × ${LANGS.length} idiomas, 404, sitemap y robots.`);
