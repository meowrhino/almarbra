/* content/ -> .html

   Un archivo por proyecto más un índice, en la raíz. HTML plano y
   semántico, sin una sola clase de más: el diseño se pone en
   css/style.css, que ahora mismo está vacío.

     node build/build.mjs      (npm run build)

   Las páginas se generan; no se editan a mano. Lo que se edita es
   content/. */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const WIDTHS = [400, 800, 1400];

const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));
const site = read('content/site.json');
const lang = site.lang || 'es';

/** Escapa lo que va al documento; en atributos, también las comillas. */
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (v) => esc(v).replace(/"/g, '&quot;');

/** El valor en el idioma del sitio, con el primero que haya de reserva. */
const t = (field) => (field ? field[lang] ?? Object.values(field)[0] ?? null : null);

/* ── imágenes ────────────────────────────────────────────────────── */

/* De cada foto hay hasta cuatro anchos en img/ (ver build/ingest.mjs).
   El srcset lista solo los que existen: de los originales pequeños no
   se genera una variante más ancha que el original. */
function srcset(image) {
  const base = image.src.replace(/\.webp$/, '');
  const found = WIDTHS
    .filter((w) => existsSync(join(ROOT, `${base}-${w}.webp`)))
    .map((w) => `${base}-${w}.webp ${w}w`);
  return found.length ? [...found, `${image.src} ${image.w}w`].join(', ') : null;
}

function img(image, { sizes = '100vw', eager = false } = {}) {
  const set = srcset(image);
  return `<img src="${attr(image.src)}"${set ? ` srcset="${attr(set)}" sizes="${attr(sizes)}"` : ''}`
    + ` width="${image.w}" height="${image.h}" alt="${attr(image.alt || '')}"`
    + (eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async">';
}

/* ── documento ───────────────────────────────────────────────────── */

/* ?v=<hash> para que un deploy no deje a nadie con el CSS viejo en caché. */
const version = (file) =>
  existsSync(join(ROOT, file))
    ? `?v=${createHash('sha1').update(readFileSync(join(ROOT, file))).digest('hex').slice(0, 8)}`
    : '';

function page({ title, body }) {
  return `<!DOCTYPE html>
<html lang="${attr(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title ? `${title} — ${site.title}` : site.title)}</title>
<meta name="description" content="${attr(site.description || '')}">
${site.noindex ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="stylesheet" href="css/style.css${version('css/style.css')}">
</head>
<body>
${body}
</body>
</html>
`;
}

/* ── contenido ───────────────────────────────────────────────────── */

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
  const sections = groups(project).map(([name, images], g) =>
    `<section>\n${name ? `<h2>${esc(name)}</h2>\n` : ''}`
    + images.map((image, i) => `<figure>${img(image, { eager: g === 0 && i === 0 })}</figure>`).join('\n')
    + '\n</section>'
  );

  return page({
    title: t(project.title),
    body: `<header>
<p><a href="index.html">${esc(site.title)}</a></p>
</header>

<article>
<h1>${esc(t(project.title) || project.slug)}</h1>
${synopsis(t(project.synopsis))}
${credits(t(project.credits))}

${sections.join('\n\n')}
</article>`,
  });
}

function indexPage(projects) {
  const categories = [...new Set(projects.map((p) => p.category))];

  const lists = categories.map((category) => {
    const items = projects.filter((p) => p.category === category).map((project) =>
      `<li><a href="${attr(project.slug)}.html">`
      + (project.images[0] ? img(project.images[0], { sizes: '(max-width: 700px) 100vw, 25vw' }) : '')
      + `<span>${esc(t(project.title) || project.slug)}</span></a></li>`
    );
    return `<section>\n<h2>${esc(category.replace(/-/g, ' '))}</h2>\n<ul>\n${items.join('\n')}\n</ul>\n</section>`;
  });

  return page({
    title: null,
    body: `<header>
<h1>${esc(site.title)}</h1>
</header>

<main>
${lists.join('\n\n')}
</main>`,
  });
}

/* ── build ───────────────────────────────────────────────────────── */

const dir = join(ROOT, 'content', 'projects');
const projects = readdirSync(dir)
  .filter((n) => n.endsWith('.json') && n !== 'index.json')
  .map((n) => JSON.parse(readFileSync(join(dir, n), 'utf8')))
  .sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug));

writeFileSync(join(ROOT, 'index.html'), indexPage(projects));
console.log('index.html'.padEnd(30) + `${projects.length} proyectos`);

for (const project of projects) {
  writeFileSync(join(ROOT, `${project.slug}.html`), projectPage(project));
  console.log(`${project.slug}.html`.padEnd(30) + `${project.images.length} fotos`);
}

writeFileSync(
  join(ROOT, 'robots.txt'),
  site.noindex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n'
);

console.log(`\n${projects.length + 1} páginas.`);
