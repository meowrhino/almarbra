/* content/ -> .html

   Dos plantillas y ya:

     index.html          portada: la foto con «entrar» y, debajo, los
                         proyectos
     <slug>/index.html   ficha técnica y galería en scroll vertical

   El sitio funciona entero sin JavaScript: «entrar» es un enlace a un
   ancla y el desplazamiento suave lo hace el navegador. El único script,
   js/scatter.js, solo desperdiga los proyectos de la portada; sin él
   salen en una lista normal.

     node build/build.mjs      (npm run build)

   Las páginas se generan; no se editan a mano. Lo que se edita es
   content/. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WIDTHS, variant } from './formats.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');

const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const site = read('content/site.json');
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

/* De cada foto hay varias anchuras en img/ (ver build/ingest.mjs). El
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

function page({ title, body, base = '', bodyClass = null, scripts = [] }) {
  return `<!DOCTYPE html>
<html lang="${attr(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title ? `${title} — ${site.title}` : site.title)}</title>
<meta name="description" content="${attr(site.description || '')}">
${site.noindex ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="stylesheet" href="${attr(base)}css/style.css${version('css/style.css')}">
</head>
<body${bodyClass ? ` class="${attr(bodyClass)}"` : ''}>
${body}
${scripts.map((s) => `<script src="${attr(base)}${s}${version(s)}" defer></script>`).join('\n')}
</body>
</html>
`;
}

/* ── portada ─────────────────────────────────────────────────────── */

/* La foto de la portada cabe entera en la pantalla (ver .hero en
   css/style.css): en una ventana apaisada la limita el alto y ocupa
   `proporción` × 100dvh de ancho; en una vertical, los 100vw. */
const heroSizes = (image) => {
  const vh = Math.round((image.w / image.h) * 100);
  return `(min-aspect-ratio: ${image.w}/${image.h}) ${vh}vh, 100vw`;
};

/** La imagen que representa a un proyecto: `cover`, o la primera. */
const coverOf = (project) =>
  project.images.find((i) => i.src === project.cover) || project.images[0];

function homePage(projects) {
  /* Los proyectos salen en el orden de siempre: js/scatter.js los
     desperdiga en el navegador, con posiciones nuevas en cada carga.
     `short` es el nombre corto para la portada, cuando el título entero
     no cabe (ver content/overrides.json). */
  const items = projects.map((project) => {
    const cover = coverOf(project);
    return `<li><a href="${attr(project.slug)}/">
${cover ? img(cover, { sizes: '(max-width: 700px) 25vw, 12vw' }) : ''}
<span>${esc(t(project.short) || t(project.title) || project.slug)}</span>
</a></li>`;
  });

  return page({
    title: null,
    bodyClass: 'home',
    scripts: ['js/scatter.js'],
    body: `<h1 class="sr-only">${esc(site.title)}</h1>

<section class="hero">
${img(hero, { eager: true, sizes: heroSizes(hero) })}
<a class="enter" href="#proyectos">${esc(home.enter || 'entrar')}</a>
</section>

<div id="proyectos">
<p class="signature">${esc(site.title)}</p>

<nav class="projects">
<ul>
${items.join('\n')}
</ul>
</nav>
</div>`,
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

function projectPage(project) {
  const base = '../';   // las páginas cuelgan de <slug>/

  /* La primera foto se carga con prioridad; las demás, según hagan falta. */
  const gallery = groups(project).map(({ name, images }, g) =>
    `<section class="group">\n${name ? `<h2>${esc(name)}</h2>\n` : ''}`
    + images.map((image, i) =>
        `<figure>${img(image, { base, sizes: '100vw', cap: true, eager: g === 0 && i === 0 })}</figure>`
      ).join('\n')
    + '\n</section>'
  );

  return page({
    title: t(project.title),
    base,
    bodyClass: 'project',
    body: `<header class="bar">
<a href="${attr(base)}">${esc(site.title)}</a>
</header>

<article>
<div class="ficha">
<h1>${esc(t(project.title) || project.slug)}</h1>
${synopsis(t(project.synopsis))}
${credits(t(project.credits))}
</div>

${gallery.join('\n\n')}
</article>

<footer class="bar">
<a href="${attr(base)}#proyectos">← proyectos</a>
</footer>`,
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
  .map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')))
  .sort((a, b) => rank(a.category) - rank(b.category)
    || a.category.localeCompare(b.category)
    || a.slug.localeCompare(b.slug));

writeFileSync(join(ROOT, 'index.html'), homePage(projects));
console.log('index.html'.padEnd(32) + `${projects.length} proyectos`);

for (const project of projects) {
  mkdirSync(join(ROOT, project.slug), { recursive: true });
  writeFileSync(join(ROOT, project.slug, 'index.html'), projectPage(project));
  console.log(`${project.slug}/`.padEnd(32) + `${project.images.length} fotos`);
}

writeFileSync(
  join(ROOT, 'robots.txt'),
  site.noindex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n'
);

console.log(`\n${projects.length + 1} páginas.`);
