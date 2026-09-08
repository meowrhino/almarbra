/* content/ -> .html

   Dos plantillas y ya:

     index.html      portada: la foto a pantalla completa con «entrar»
                     y, debajo, la lista de proyectos
     <slug>/index.html   ficha técnica y galería en scroll vertical

   El sitio no lleva JavaScript. «Entrar» es un enlace a un ancla y el
   navegador hace el desplazamiento suave él solo: la foto sube y
   aparecen los proyectos.

     node build/build.mjs      (npm run build)

   Las páginas se generan; no se editan a mano. Lo que se edita es
   content/. */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const WIDTHS = [400, 800, 1400];

const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const site = read('content/site.json');
const lang = site.lang || 'es';
const home = site.home || {};

/** Escapa lo que va al documento; en atributos, también las comillas. */
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (v) => esc(v).replace(/"/g, '&quot;');

/** El valor en el idioma del sitio, con el primero que haya de reserva.
    `short` es el nombre corto para la lista de la portada, cuando el
    título completo no cabe (ver content/overrides.json). */
const t = (field) => (field ? field[lang] ?? Object.values(field)[0] ?? null : null);

/* ── imágenes ────────────────────────────────────────────────────── */

/* De cada foto hay hasta cuatro anchos en img/ (ver build/ingest.mjs).
   El srcset lista solo los que existen: de un original pequeño no se
   genera una variante más ancha que él. */
function srcset(image, base) {
  const stem = image.src.replace(/\.webp$/, '');
  const found = WIDTHS
    .filter((w) => existsSync(join(ROOT, `${stem}-${w}.webp`)))
    .map((w) => `${base}${stem}-${w}.webp ${w}w`);
  return found.length ? [...found, `${base}${image.src} ${image.w}w`].join(', ') : null;
}

function img(image, { base = '', sizes = '100vw', eager = false } = {}) {
  const set = srcset(image, base);
  return `<img src="${attr(base + image.src)}"${set ? ` srcset="${attr(set)}" sizes="${attr(sizes)}"` : ''}`
    + ` width="${image.w}" height="${image.h}" alt="${attr(image.alt || '')}"`
    + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">';
}

/* ── documento ───────────────────────────────────────────────────── */

/* ?v=<hash> para que un deploy no deje a nadie con el CSS viejo en caché. */
const version = (file) =>
  existsSync(join(ROOT, file))
    ? `?v=${createHash('sha1').update(readFileSync(join(ROOT, file))).digest('hex').slice(0, 8)}`
    : '';

function page({ title, body, base = '', bodyClass = null }) {
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
</body>
</html>
`;
}

/* ── portada ─────────────────────────────────────────────────────── */

/** La imagen que representa a un proyecto: `cover`, o la primera. */
const coverOf = (project) =>
  project.images.find((i) => i.src === project.cover) || project.images[0];

function homePage(projects) {
  const hero = { src: home.hero, w: 2000, h: 3000, alt: '' };

  const items = projects.map((project) => {
    const cover = coverOf(project);
    return `<li><a href="${attr(project.slug)}/">
${cover ? img(cover, { sizes: '(max-width: 700px) 30vw, 15vw' }) : ''}
<span>${esc(t(project.short) || t(project.title) || project.slug)}</span>
</a></li>`;
  });

  /* La textura va en el atributo style, no en una variable CSS: dentro
     de una variable el url() se resolvería contra css/, no contra el
     documento, y la ruta saldría mal. */
  const texture = home.texture ? ` style="background-image: url('${attr(home.texture)}')"` : '';

  return page({
    title: null,
    bodyClass: 'home',
    body: `<h1 class="sr-only">${esc(site.title)}</h1>

<section class="hero">
${img(hero, { eager: true })}
<a class="enter" href="#proyectos">${esc(home.enter || 'entrar')}</a>
</section>

<nav class="projects" id="proyectos"${texture}>
<ul>
${items.join('\n')}
</ul>
</nav>

<footer class="signature">${esc(site.title)}</footer>`,
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
  if (!project.groups?.length) return [[null, project.images]];
  const names = new Map(project.groups.map((g) => [g.slug, g.name]));
  const buckets = new Map();
  for (const image of project.images) {
    const key = image.group ?? '';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(image);
  }
  return [...buckets].map(([key, images]) => [key ? names.get(key) || key : null, images]);
}

function projectPage(project) {
  const base = '../';   // las páginas cuelgan de <slug>/

  const gallery = groups(project).map(([name, images], g) =>
    `<section class="group">\n${name ? `<h2>${esc(name)}</h2>\n` : ''}`
    + images.map((image, i) =>
        `<figure>${img(image, { base, sizes: '(max-width: 700px) 100vw, 70vw', eager: g === 0 && i === 0 })}</figure>`
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
