/* content/ + media/ -> dist/

   Dos plantillas y ya:

     dist/index.html                    portada: el mapa y la lista de
                                        proyectos, con el menú arriba
     dist/projects/<slug>/index.html    ficha técnica y galería en scroll
                                        vertical

   Más lo que pide un sitio estático: 404.html, sitemap.xml, robots.txt,
   .nojekyll y _headers, y una copia de css/, js/ y media/. dist/ no se
   commitea: lo publica la Action (.github/workflows/deploy.yml).

   Antes de escribir nada, valida: un JSON roto, una foto que no está o un
   `cover` que no es de ninguna foto paran el build con un mensaje, y la
   web publicada se queda como estaba.

   El sitio funciona entero sin JavaScript: sin él la portada es la
   lista. El único script, js/mapa.js, monta el mapa y la transición de
   píxeles entre mapa y lista.

     node build/build.mjs      (npm run build)

   Lo que se edita es content/. */

import { createHash } from 'node:crypto';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WIDTHS, variant } from './formats.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const OUT = join(ROOT, 'dist');

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

/** Un JSON roto para el build diciendo cuál y dónde. */
function read(file) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  try { return JSON.parse(text); } catch (e) { fail(`${file} no es un JSON válido: ${e.message}`); }
}

const site = read('content/site.json');
if (!site.url) fail('falta "url" en content/site.json: la dirección donde se publica la web');

/* Las páginas se enlazan entre sí con rutas relativas; solo lo que se lee
   desde fuera —canonical, og:image, sitemap— y la 404 necesitan la
   dirección entera. */
const abs = (path) => new URL(path, site.url).href;
const lang = site.lang || 'es';
const home = site.home || {};

/* La foto de la portada no es de ningún proyecto: la ingesta la saca de
   originals/PORTADA/ y la deja aquí con sus medidas (ver
   build/ingest.mjs). */
const hero = read('content/home.json').hero;

/** Escapa lo que va al documento; en atributos, también las comillas. */
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (v) => esc(v).replace(/"/g, '&quot;');

/** El valor en el idioma del sitio, con el primero que haya de reserva. */
const t = (field) => (field ? field[lang] ?? Object.values(field)[0] ?? null : null);

/* ── imágenes ────────────────────────────────────────────────────── */

/* De cada foto hay varias anchuras en media/ (ver build/ingest.mjs). El
   srcset lista solo las que existen: de un original pequeño no se genera
   una variante más ancha que él. */
function srcset(image, base) {
  const found = WIDTHS
    .filter((w) => existsSync(join(ROOT, variant(image.src, w))))
    .map((w) => `${base}${variant(image.src, w)} ${w}w`);
  return found.length ? [...found, `${base}${image.src} ${image.w}w`].join(', ') : null;
}

/* `cap` limita la foto a su ancho real. Como la ingesta topa el lado
   largo a 2000 px, las verticales rondan los 1333 de ancho: sin este
   tope se ampliarían en pantallas grandes y se verían blandas. */
function img(image, { base = '', sizes = '100vw', eager = false, cap = false } = {}) {
  const set = srcset(image, base);
  return `<img src="${attr(base + image.src)}"${set ? ` srcset="${attr(set)}" sizes="${attr(sizes)}"` : ''}`
    + ` width="${image.w}" height="${image.h}" alt="${attr(image.alt || '')}"`
    + (cap ? ` style="max-width:${image.w}px"` : '')
    + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">';
}

/* ── documento ───────────────────────────────────────────────────── */

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

/* `path` es la dirección de la página dentro del sitio ('' la portada,
   'projects/roma/' un proyecto); sin ella no hay canonical ni og, que es
   lo que pasa en la 404. `image` es la que sale al compartir el enlace. */
function page({ title, body, base = '', bodyClass = null, scripts = [], path = null, description = null, image = null, head = '' }) {
  const full = title ? `${title} — ${site.title}` : site.title;
  const desc = description || site.description || '';
  const share = path === null ? '' : `<link rel="canonical" href="${attr(abs(path))}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(site.title)}">
<meta property="og:title" content="${attr(full)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${attr(abs(path))}">
${image ? `<meta property="og:image" content="${attr(abs(image.src))}">
<meta property="og:image:width" content="${image.w}">
<meta property="og:image:height" content="${image.h}">
` : ''}<meta name="twitter:card" content="summary_large_image">
`;
  return `<!DOCTYPE html>
<html lang="${attr(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${attr(desc)}">
${share}${site.noindex ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="stylesheet" href="${attr(base)}css/style.css${version('css/style.css')}">
${head}</head>
<body${bodyClass ? ` class="${attr(bodyClass)}"` : ''}>
${body}
${scripts.map((s) => `<script src="${attr(base)}${s}${version(s)}" defer></script>`).join('\n')}
</body>
</html>
`;
}

/* ── portada ─────────────────────────────────────────────────────── */

/** La imagen que representa a un proyecto: `cover`, o la primera. */
const coverOf = (project) =>
  project.images.find((i) => i.src === project.cover) || project.images[0];

/* Al mapa van las fotos de la carpeta `home` de cada proyecto (ver
   build/ingest.mjs). Un proyecto que aún no la tiene manda su portada y
   unas cuantas más, repartidas a lo largo de su galería. */
const PER_PROJECT = 6;

function mapImages(project) {
  const home = project.images.filter((i) => i.home);
  if (home.length) return home;
  const cover = coverOf(project);
  const rest = project.images.filter((i) => i !== cover);
  const n = Math.min(PER_PROJECT - 1, rest.length);
  return [cover, ...Array.from({ length: n }, (_, k) => rest[Math.floor((k * rest.length) / n)])];
}

/* Una fila de la lista: una franja de proporción fija (1000×600) con la
   portada a un lado y, alrededor, cuadrados del color del proyecto,
   apretados junto a la foto y cada vez más sueltos al alejarse. Todo va
   en coordenadas de la franja —el SVG y la foto, en %—, así que los
   cuadrados quedan alrededor de la foto a cualquier ancho. Sale distinto
   en cada build. */
const ROW = { w: 1000, h: 600, side: 60, sq: 20 };

function listRow(project, i) {
  const cover = coverOf(project);
  let h = 470;
  let w = (h * cover.w) / cover.h;
  if (w > 560) { w = 560; h = (w * cover.h) / cover.w; }
  const x = i % 2 ? ROW.w - ROW.side - w : ROW.side;
  const y = (ROW.h - h) / 2;
  const S = ROW.sq;

  const squares = [];
  for (let n = 0; n < 6000; n++) {
    const sx = Math.round(Math.random() * (ROW.w - S));
    const sy = Math.round(Math.random() * (ROW.h - S));
    if (sx > x && sy > y && sx + S < x + w && sy + S < y + h) continue;   // tapado por la foto
    const dx = Math.max(x - sx - S / 2, 0, sx + S / 2 - x - w);
    const dy = Math.max(y - sy - S / 2, 0, sy + S / 2 - y - h);
    if (Math.random() > 0.006 + 0.8 * Math.exp(-Math.hypot(dx, dy) / 60)) continue;
    if (squares.some(([qx, qy]) => Math.abs(qx - sx) < S + 6 && Math.abs(qy - sy) < S + 6)) continue;
    squares.push([sx, sy]);
  }

  const pct = (v, of) => `${+((v / of) * 100).toFixed(2)}%`;
  const edge = i % 2 ? `right:${pct(ROW.w - x - w, ROW.w)}` : `left:${pct(x, ROW.w)}`;

  return `<li><a class="row${i % 2 ? ' flip' : ''}" href="projects/${attr(project.slug)}/" style="--c:${attr(project.color)}">
<svg viewBox="0 0 ${ROW.w} ${ROW.h}" aria-hidden="true"><path d="${squares.map(([qx, qy]) => `M${qx} ${qy}h${S}v${S}h-${S}z`).join('')}"/></svg>
<div class="pic" style="left:${pct(x, ROW.w)};top:${pct(y, ROW.h)};width:${pct(w, ROW.w)}">${img(cover, { sizes: `${Math.round((w / ROW.w) * 100)}vw` })}</div>
<h2 style="${edge};top:${pct(y + h, ROW.h)}">${esc(t(project.title) || project.slug)} <small>${esc(project.category.replace(/-/g, ' '))} · ${project.images.length}</small></h2>
</a></li>`;
}

/** El menú de arriba, igual en todas las páginas. */
function topBar(base = '') {
  return `<header class="top">
<a href="${attr(base)}./">${esc(site.title)}</a>
<nav>
<a href="${attr(base)}#mapa">${esc(home.map || 'mapa')}</a>
<a href="${attr(base)}#lista">${esc(home.list || 'lista')}</a>
</nav>
</header>`;
}

/* La vista sale del hash (#mapa o #lista) y se pone en <html> antes de
   pintar, para que no asome la otra. Sin JavaScript no se pone nada y
   el CSS enseña la lista. */
const VIEW_SCRIPT = `<script>document.documentElement.dataset.vista = location.hash === '#lista' ? 'lista' : 'mapa'</script>
`;

function homePage(projects) {
  /* El mapa: las fotos de cada proyecto, sin posición. js/mapa.js las
     reparte en cada carga y las une con píxeles del color del proyecto.
     Es solo para la vista: quien navega con teclado o lector de
     pantalla tiene la lista. */
  const pins = projects.flatMap((project, p) => mapImages(project).map((image, i) => {
    const long = [170, 120, 145][i % 3];   // de tres tamaños, para que no parezca una rejilla
    const width = Math.round((long * image.w) / Math.max(image.w, image.h));
    return `<a class="pin" href="projects/${attr(project.slug)}/" tabindex="-1" data-p="${p}" style="--c:${attr(project.color)};width:${width}px">`
      + img(image, { sizes: `${width * 2}px` })
      + `<span>${esc(t(project.short) || t(project.title) || project.slug)}</span></a>`;
  }));

  const rows = projects.map(listRow);

  return page({
    title: null,
    path: '',
    image: hero,
    bodyClass: 'home',
    head: VIEW_SCRIPT,
    scripts: ['js/mapa.js'],
    body: `<h1 class="sr-only">${esc(site.title)}</h1>
${topBar()}

<section id="mapa" aria-hidden="true">
<div class="world">
${pins.join('\n')}
</div>
</section>

<div class="zoom" aria-hidden="true">
<button type="button" data-step="1" tabindex="-1"><svg viewBox="0 0 5 5"><path d="M2 0h1v5h-1zM0 2h5v1h-5z"/></svg></button>
<div class="ticks"></div>
<button type="button" data-step="-1" tabindex="-1"><svg viewBox="0 0 5 5"><path d="M0 2h5v1h-5z"/></svg></button>
</div>

<section id="lista">
<ol>
${rows.join('\n')}
</ol>
</section>`,
  });
}

/* ── proyecto ────────────────────────────────────────────────────── */

function credits(list) {
  if (!list?.length) return '';
  const rows = list.map((c) => {
    const name = c.url
      ? `<a href="${attr(c.url)}" target="_blank" rel="noopener">${esc(c.name || c.url)}</a>`
      : esc(c.name);
    return `<dt>${esc(c.role)}</dt><dd>${name}</dd>`;
  });
  return `<dl class="credits">\n${rows.join('\n')}\n</dl>`;
}

/** El primer párrafo de la sinopsis, cortado para el meta description. */
function summary(text) {
  const first = (text || '').split(/\n{2,}/)[0].replace(/\s+/g, ' ').trim();
  return first.length > 160 ? `${first.slice(0, 157).replace(/\s+\S*$/, '').replace(/[\s.,;:]+$/, '')}…` : first;
}

const synopsis = (text) =>
  text ? text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n') : '';

/** Las fotos por grupo, en el orden del JSON. Sin grupos, una sola tanda. */
function groups(project) {
  if (!project.groups?.length) return [{ name: null, images: project.images }];

  const names = new Map(project.groups.map((g) => [g.slug, g.name]));
  const buckets = new Map();
  for (const image of project.images) {
    const key = image.group ?? '';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(image);
  }

  return [...buckets].map(([key, images]) => ({
    name: key ? names.get(key) || key : null,
    images,
  }));
}

/* Las fotos del proyecto van en una columna de 800 px como mucho, con
   aire a los lados; por debajo de ahí ocupan el ancho que quede. El 800
   sale de `--col` en css/style.css: si cambia allí, cambia aquí. */
const GALLERY_SIZES = '(min-width: 896px) 800px, 100vw';

function projectPage(project) {
  const base = '../../';   // las páginas cuelgan de projects/<slug>/

  /* La primera foto se carga con prioridad; las demás, según hagan falta. */
  const gallery = groups(project).map(({ name, images }, g) =>
    `<section class="group">\n${name ? `<h2>${esc(name)}</h2>\n` : ''}`
    + images.map((image, i) =>
        `<figure>${img(image, { base, sizes: GALLERY_SIZES, cap: true, eager: g === 0 && i === 0 })}</figure>`
      ).join('\n')
    + '\n</section>'
  );

  return page({
    title: t(project.title),
    path: `projects/${project.slug}/`,
    description: summary(t(project.synopsis)),
    image: coverOf(project),
    base,
    bodyClass: 'project',
    body: `${topBar(base)}

<article style="--c:${attr(project.color)}">
<div class="ficha">
<h1>${esc(t(project.title) || project.slug)}</h1>
${synopsis(t(project.synopsis))}
${credits(t(project.credits))}
</div>

${gallery.join('\n\n')}
</article>

<footer class="bar">
<a href="${attr(base)}#lista">← proyectos</a>
</footer>`,
  });
}

/* La 404 la sirve el hosting en cualquier dirección que no exista, a
   cualquier profundidad: por eso sus enlaces parten de la raíz del sitio
   (la ruta de `url`, que en GitHub Pages es /almarbra/) y no de donde
   esté. */
function notFoundPage() {
  const base = new URL(site.url).pathname;
  return page({
    title: 'no encontrada',
    base,
    bodyClass: 'project',
    body: `${topBar(base)}

<article>
<div class="ficha">
<h1>esta página no existe</h1>
<p><a href="${attr(base)}#lista">ver los proyectos</a></p>
</div>
</article>`,
  });
}

/* ── build ───────────────────────────────────────────────────────── */

const dir = join(ROOT, 'content', 'projects');
const order = site.order || [];
const rank = (category) => {
  const i = order.indexOf(category);
  return i < 0 ? order.length : i;
};

const projects = readdirSync(dir)
  .filter((n) => n.endsWith('.json'))
  .map((n) => read(`content/projects/${n}`))
  .sort((a, b) => rank(a.category) - rank(b.category)
    || a.category.localeCompare(b.category)
    || a.slug.localeCompare(b.slug));

/* Un color por proyecto, en el orden de arriba, sin repetir: si hay más
   proyectos que colores en content/site.json, el build para. */
const colors = site.colors || [];
projects.forEach((project, i) => { project.color = colors[i]; });

/* ── validar, antes de tocar dist/ ───────────────────────────────── */

const errors = [];
if (colors.length < projects.length) {
  errors.push(`hay ${projects.length} proyectos y ${colors.length} colores en content/site.json: falta(n) ${projects.length - colors.length}`);
}
const seen = new Set();
if (!existsSync(join(ROOT, hero.src))) errors.push(`no encuentro la foto de la portada: ${hero.src}`);
for (const project of projects) {
  if (seen.has(project.slug)) errors.push(`hay dos proyectos con el slug «${project.slug}»`);
  seen.add(project.slug);
  if (!project.images?.length) errors.push(`${project.slug}: no tiene fotos`);
  for (const image of project.images || []) {
    if (!existsSync(join(ROOT, image.src))) errors.push(`${project.slug}: no encuentro ${image.src}`);
  }
  if (project.cover && !project.images?.some((i) => i.src === project.cover)) {
    errors.push(`${project.slug}: el cover ${project.cover} no es ninguna de sus fotos (content/overrides.json)`);
  }
}
if (errors.length) fail(`${errors.join('\n  ')}\n\nNo se escribe nada hasta que se arregle.`);

/* ── escribir ────────────────────────────────────────────────────── */

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const d of ['css', 'js', 'media']) cpSync(join(ROOT, d), join(OUT, d), { recursive: true });
cpSync(join(ROOT, '_headers'), join(OUT, '_headers'));

writeFileSync(join(OUT, 'index.html'), homePage(projects));
console.log('index.html'.padEnd(32) + `${projects.length} proyectos`);

for (const project of projects) {
  mkdirSync(join(OUT, 'projects', project.slug), { recursive: true });
  writeFileSync(join(OUT, 'projects', project.slug, 'index.html'), projectPage(project));
  console.log(`projects/${project.slug}/`.padEnd(32) + `${project.images.length} fotos`);
}

writeFileSync(join(OUT, '404.html'), notFoundPage());

writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['', ...projects.map((p) => `projects/${p.slug}/`)].map((p) => `  <url><loc>${esc(abs(p))}</loc></url>`).join('\n')}
</urlset>
`);

writeFileSync(
  join(OUT, 'robots.txt'),
  site.noindex ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${abs('sitemap.xml')}\n`
);

// GitHub Pages: servir los archivos tal cual, sin pasar por Jekyll
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`\n✓ dist/: ${projects.length + 1} páginas, 404, sitemap y robots.`);
