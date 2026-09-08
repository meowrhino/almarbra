/* Ingesta del material de la clienta.

     originals/<CATEGORÍA>/<PROYECTO>/…/foto.jpg   +   FICHA <PROYECTO>.rtf
        ->  img/<categoría>/<proyecto>/<proyecto>-NN[-400|-800|-1400].webp
        ->  content/projects/<proyecto>.json

   Convierte cada foto a WebP en cuatro anchos, mide sus dimensiones y
   escribe un JSON por proyecto con título, sinopsis y créditos en los
   tres idiomas de la ficha, más la lista de imágenes.

   Es idempotente: se apoya en content/.media-cache.json y solo vuelve a
   convertir lo que haya cambiado de tamaño o fecha.

     node build/ingest.mjs            # solo lo nuevo
     node build/ingest.mjs --force    # todo otra vez

   Las correcciones a mano van en content/overrides.json, que se aplica
   encima del JSON generado: así reingestar no se las lleva por delante. */

import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { parseFicha } from './ficha.mjs';
import { slugify, titleize } from './slug.mjs';

const run = promisify(execFile);
const ROOT = resolve(fileURLToPath(import.meta.url), '../..');

const SOURCE = join(ROOT, 'originals');
const IMG = join(ROOT, 'img');
const PROJECTS = join(ROOT, 'content', 'projects');
const CACHE = join(ROOT, 'content', '.media-cache.json');
const OVERRIDES = join(ROOT, 'content', 'overrides.json');

/* La conversión es la misma que usamos en meowrhino/imgToWeb, que es la
   de todos los sitios: calidad 0.85 y el LADO LARGO —no el ancho— topado
   a 2000 px, manteniendo la proporción. Una foto vertical de 3840×5760
   sale a 1333×2000, no a 2000×3000.

   WIDTHS son las variantes pequeñas del srcset, esas sí por ancho. */
const MAX_SIDE = 2000;
const QUALITY = 85;
const WIDTHS = [400, 800, 1400];
const CONCURRENCY = 6;

const PHOTO = /\.(jpe?g|png)$/i;
const FORCE = process.argv.includes('--force');

/* ── recorrido de originals/ ─────────────────────────────────────── */

const dirs = (dir) => readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
  .map((e) => e.name)
  .sort((a, b) => a.localeCompare(b, 'es'));

/** Todas las fotos bajo un directorio, ordenadas por carpeta y nombre. */
function photosUnder(dir) {
  const out = [];
  (function walk(current) {
    const entries = readdirSync(current, { withFileTypes: true })
      .filter((e) => !e.name.startsWith('.') && e.name !== 'Icon\r')
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (PHOTO.test(entry.name)) out.push(path);
    }
  })(dir);
  return out;
}

/* Nombre del grupo a partir de la carpeta que cuelga del proyecto.
   FOTOS no es un grupo; PIEZAS solo lo es si no lleva subcarpetas. */
function groupOf(projectDir, file) {
  const segments = relative(projectDir, file).split('/').slice(0, -1)
    .filter((s) => s.toUpperCase() !== 'FOTOS');
  if (segments.length > 1 && segments[0].toUpperCase() === 'PIEZAS') segments.shift();
  if (!segments.length) return null;
  return { slug: slugify(segments.join('-')), name: titleize(segments.join(' / ')) };
}

/** La FICHA .rtf de un proyecto, si la hay. */
function fichaOf(projectDir) {
  const file = readdirSync(projectDir).find((n) => /^FICHA .*\.rtf$/i.test(n));
  return file ? join(projectDir, file) : null;
}

/* ── conversión ──────────────────────────────────────────────────── */

async function dimensions(file) {
  const { stdout } = await run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  const w = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const h = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
  return { w, h };
}

async function toWebp(source, out, width) {
  const args = ['-q', String(QUALITY), '-quiet', '-mt'];
  if (width) args.push('-resize', String(width), '0');
  await run('cwebp', [...args, source, '-o', out]);
}

/**
 * Una foto -> hasta cuatro .webp. Devuelve el registro para el JSON.
 * @returns {{src: string, w: number, h: number, source: string}}
 */
async function convert(source, dir, name, cache) {
  const stat = statSync(source);
  const key = relative(ROOT, source);
  const cached = cache[key];
  const base = join(dir, `${name}.webp`);

  if (!FORCE && cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size
      && cached.name === name && existsSync(base)) {
    return { ...cached.image, cached: true };
  }

  const { w, h } = await dimensions(source);
  // el tope va sobre el lado largo, sea el ancho o el alto
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const outW = Math.round(w * scale);
  const outH = Math.round(h * scale);

  await toWebp(source, base, scale < 1 ? outW : null);
  for (const width of WIDTHS) {
    if (width >= outW) continue;   // no se agranda nada
    await toWebp(source, join(dir, `${name}-${width}.webp`), width);
  }

  const image = { src: `${relative(ROOT, base)}`, w: outW, h: outH, source: key };
  cache[key] = { mtimeMs: stat.mtimeMs, size: stat.size, name, image };
  return image;
}

/** Ejecuta `task` sobre cada elemento con un límite de tareas a la vez. */
async function pool(items, limit, task) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await task(items[i], i);
    }
  }));
  return results;
}

/* ── ingesta ─────────────────────────────────────────────────────── */

const readJson = (file, fallback) =>
  existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback;

/** Mezcla superficial por claves; los arrays del override sustituyen. */
function applyOverride(project, override) {
  if (!override) return project;
  const out = { ...project };
  for (const [key, value] of Object.entries(override)) {
    if (key.startsWith('_')) continue;   // notas del archivo, no contenido
    out[key] = value && !Array.isArray(value) && typeof value === 'object'
      ? { ...(out[key] || {}), ...value }
      : value;
  }
  return out;
}

async function ingestProject(categoryDir, categorySlug, name, cache) {
  const dir = join(categoryDir, name);
  const slug = slugify(name);
  const outDir = join(IMG, categorySlug, slug);
  mkdirSync(outDir, { recursive: true });

  const files = photosUnder(dir);
  const images = await pool(files, CONCURRENCY, async (file, i) => {
    const group = groupOf(dir, file);
    const record = await convert(file, outDir, `${slug}-${String(i + 1).padStart(2, '0')}`, cache);
    return { ...record, alt: '', ...(group ? { group: group.slug } : {}) };
  });

  const groups = [];
  for (const file of files) {
    const group = groupOf(dir, file);
    if (group && !groups.some((g) => g.slug === group.slug)) groups.push(group);
  }

  const ficha = fichaOf(dir);
  const { raw, ...meta } = ficha ? parseFicha(ficha) : { title: {}, synopsis: {}, credits: {} };

  return {
    slug,
    category: categorySlug,
    source: relative(ROOT, dir),
    title: Object.keys(meta.title).length ? meta.title : { es: titleize(name) },
    synopsis: meta.synopsis,
    credits: meta.credits,
    ...(groups.length ? { groups } : {}),
    images: images.map(({ cached, ...rest }) => rest),
  };
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`No encuentro ${relative(ROOT, SOURCE)}/. Copia ahí el material de la clienta.`);
    process.exit(1);
  }

  const cache = FORCE ? {} : readJson(CACHE, {});
  const overrides = readJson(OVERRIDES, {});
  mkdirSync(PROJECTS, { recursive: true });

  const index = [];
  for (const category of dirs(SOURCE)) {
    const categorySlug = slugify(category);
    const categoryDir = join(SOURCE, category);

    for (const name of dirs(categoryDir)) {
      const project = applyOverride(
        await ingestProject(categoryDir, categorySlug, name, cache),
        overrides[slugify(name)]
      );

      writeFileSync(join(PROJECTS, `${project.slug}.json`), JSON.stringify(project, null, 2) + '\n');
      index.push({ slug: project.slug, category: project.category, images: project.images.length });
      console.log(`${project.category}/${project.slug}`.padEnd(34) + `${project.images.length} fotos`);
    }
  }

  writeFileSync(CACHE, JSON.stringify(cache, null, 0));
  const total = index.reduce((n, p) => n + p.images, 0);
  console.log(`\n${index.length} proyectos, ${total} fotos.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
