/* Ingesta del material de la clienta.

     originals/<CATEGORÍA>/<PROYECTO>/…/foto.jpg   +   FICHA <PROYECTO>.rtf
        ->  projects/<proyecto>/NN.webp  (y 400/, 800/, 1400/NN.webp)
        ->  projects/<proyecto>/proyecto.json, si aún no existe

   Convierte cada foto a WebP —el tamaño y la calidad, en formats.mjs—
   más sus variantes pequeñas para el srcset. Cada foto se llama por el
   número de su archivo («07.jpg» → 07.webp); si el nombre no es un
   número, por su sitio en el original.

   proyecto.json se escribe solo la primera vez, con el título, la
   sinopsis y los créditos de la ficha y la lista de fotos. Desde ahí es
   de quien lo edite: la ingesta no lo vuelve a tocar, solo avisa de las
   fotos nuevas que no estén en él. Un proyecto nuevo tampoco sale en la
   web hasta que se pone en una lista de content/web.json.

   Las subcarpetas de un proyecto (las de PIEZAS de Roma) son grupos: van
   en «grupos», cada uno con su nombre y sus fotos. FOTOS no es grupo.

   Es idempotente: se apoya en originals/.cache.json y solo vuelve a
   convertir lo que haya cambiado de tamaño o fecha.

     node build/ingest.mjs            # solo lo nuevo
     node build/ingest.mjs --force    # todo otra vez */

import { execFile } from 'node:child_process';
import {
  existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { parseFicha } from './ficha.mjs';
import { MAX_SIDE, QUALITY, WIDTHS } from './formats.mjs';
import { variant } from './proyectos.mjs';
import { slugify, titleize } from './slug.mjs';

const run = promisify(execFile);
const ROOT = resolve(fileURLToPath(import.meta.url), '../..');

const SOURCE = join(ROOT, 'originals');
const PROJECTS = join(ROOT, 'projects');
const CACHE = join(SOURCE, '.cache.json');

const CONCURRENCY = 6;   // conversiones a la vez

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

/* El grupo de una foto: la carpeta que cuelga del proyecto. FOTOS no es
   grupo; PIEZAS solo lo es si no lleva subcarpetas. */
function groupOf(projectDir, file) {
  const segments = relative(projectDir, file).split('/').slice(0, -1)
    .filter((s) => !/^fotos$/i.test(s));
  if (segments.length > 1 && segments[0].toUpperCase() === 'PIEZAS') segments.shift();
  return segments.length ? titleize(segments.join(' / ')) : null;
}

/** La FICHA .rtf de un proyecto, si la hay. */
function fichaOf(projectDir) {
  const file = readdirSync(projectDir).find((n) => /^FICHA .*\.rtf$/i.test(n));
  return file ? join(projectDir, file) : null;
}

/* Los créditos de la ficha vienen por idioma, la misma gente en cada
   uno: se juntan en una lista, con el rol por idioma (o un texto, si es
   igual en todos). Una línea con varios enlaces se queda con el primero.
   ponytail: si un idioma trae otra gente u otro orden, mandan los del
   primero; se corrige a mano en proyecto.json. */
function mergeCredits(byLang) {
  const langs = Object.keys(byLang);
  return (byLang[langs[0]] || []).map((c, i) => {
    const roles = Object.fromEntries(langs.map((l) => [l, byLang[l][i]?.role || c.role]));
    const role = new Set(Object.values(roles)).size === 1 ? c.role : roles;
    return { role, name: c.name, ...(c.url ? { url: c.url } : {}) };
  });
}

/* «03 KALTBULT MAGAZINE» -> 'KALTBULT MAGAZINE' */
const nameOf = (folder) => folder.replace(/^\d+\s+/, '');

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
  mkdirSync(resolve(out, '..'), { recursive: true });
  await run('cwebp', [...args, source, '-o', out]);
}

/** Una foto -> hasta cuatro .webp. */
async function convert(source, out, cache) {
  const stat = statSync(source);
  const key = relative(ROOT, source);
  const cached = cache[key];
  if (!FORCE && cached && cached.mtimeMs === stat.mtimeMs && cached.size === stat.size
      && cached.out === relative(ROOT, out) && existsSync(out)) return;

  const { w, h } = await dimensions(source);
  // el tope va sobre el lado largo, sea el ancho o el alto
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const outW = Math.round(w * scale);

  await toWebp(source, out, scale < 1 ? outW : null);
  for (const width of WIDTHS) {
    if (width >= outW) continue;   // no se agranda nada
    await toWebp(source, variant(out, width), width);
  }
  cache[key] = { mtimeMs: stat.mtimeMs, size: stat.size, out: relative(ROOT, out) };
}

/* Borra los .webp que la ingesta ya no genera (una foto quitada del
   original), para que no se queden en el repo sin que nadie los use. */
function sweep(dir, names) {
  const keep = new Set(names.flatMap((n) => [join(dir, n), ...WIDTHS.map((w) => variant(join(dir, n), w))]));
  let removed = 0;
  for (const sub of ['', ...WIDTHS.map(String)]) {
    const at = join(dir, sub);
    if (!existsSync(at)) continue;
    for (const name of readdirSync(at)) {
      const file = join(at, name);
      if (name.endsWith('.webp') && !keep.has(file)) { rmSync(file); removed += 1; }
    }
  }
  return removed;
}

/** Ejecuta `task` sobre cada elemento con un límite de tareas a la vez. */
async function pool(items, limit, task) {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) await task(items[next++]);
  }));
}

/* ── ingesta ─────────────────────────────────────────────────────── */

async function ingestProject(dir, slug, cache) {
  const outDir = join(PROJECTS, slug);

  const photos = photosUnder(dir).map((file, i) => {
    const own = basename(file).match(/^(\d+)\.[a-z]+$/i);
    return { file, name: `${String(own ? Number(own[1]) : i + 1).padStart(2, '0')}.webp`, group: groupOf(dir, file) };
  });
  await pool(photos, CONCURRENCY, ({ file, name }) => convert(file, join(outDir, name), cache));
  const names = photos.map((p) => p.name);
  const swept = sweep(outDir, names);

  const json = join(outDir, 'proyecto.json');
  if (existsSync(json)) {
    const data = JSON.parse(readFileSync(json, 'utf8'));
    const listed = new Set([...(data.fotos || []), ...(data.grupos || []).flatMap((g) => g.fotos)]);
    const missing = names.filter((n) => !listed.has(n));
    return { swept, note: missing.length ? `   fotos que no están en su proyecto.json: ${missing.join(', ')}` : '' };
  }

  const { raw, ...meta } = fichaOf(dir) ? parseFicha(fichaOf(dir)) : { title: {}, synopsis: {}, credits: {} };
  const groups = [...new Set(photos.map((p) => p.group))];
  const data = {
    title: Object.keys(meta.title).length ? meta.title : { es: titleize(nameOf(basename(dir))) },
    synopsis: meta.synopsis,
    credits: mergeCredits(meta.credits),
    portada: names.slice(0, 1),
    mapa: [],
    ...(groups.some(Boolean)
      ? { grupos: groups.map((g) => ({ nombre: g, fotos: photos.filter((p) => p.group === g).map((p) => p.name) })) }
      : { fotos: names }),
  };
  writeFileSync(json, JSON.stringify(data, null, 2) + '\n');
  return { swept, note: '   NUEVO: ponlo en una lista de content/web.json' };
}

async function main() {
  if (!existsSync(SOURCE)) {
    console.error(`No encuentro ${relative(ROOT, SOURCE)}/. Copia ahí el material de la clienta.`);
    process.exit(1);
  }

  const cache = FORCE || !existsSync(CACHE) ? {} : JSON.parse(readFileSync(CACHE, 'utf8'));
  const made = new Set();

  for (const category of dirs(SOURCE)) {
    for (const folder of dirs(join(SOURCE, category))) {
      /* Dos con el mismo nombre (las dos SICKY MAGAZINE): la segunda, -02. */
      const base = slugify(nameOf(folder));
      let slug = base;
      for (let k = 2; made.has(slug); k++) slug = `${base}-${String(k).padStart(2, '0')}`;
      made.add(slug);

      const { swept, note } = await ingestProject(join(SOURCE, category, folder), slug, cache);
      console.log(`projects/${slug}`.padEnd(32) + (swept ? `(${swept} .webp huérfanos borrados)` : '') + note);
    }
  }

  /* Lo que está en projects/ y no en originals/ no se borra: su
     proyecto.json puede llevar trabajo. Solo se avisa. */
  for (const slug of dirs(PROJECTS)) {
    if (!made.has(slug)) console.log(`projects/${slug}`.padEnd(32) + 'no viene de originals/ (no se toca)');
  }

  writeFileSync(CACHE, JSON.stringify(cache));
  console.log(`\n${made.size} proyectos.`);
}

main().catch((error) => { console.error(error); process.exit(1); });
