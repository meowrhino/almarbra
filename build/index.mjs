/* Build del sitio.

   Dos capas que conviven:

   1. el clon de amargor.es (content/site.json + content/pages.json),
      que se queda en la raíz como referencia de diseño;
   2. el material real de la clienta (content/projects/*.json, que
      genera build/ingest.mjs), que sale a proyectos/.

   Sin dependencias: `npm run build` o `node build/index.mjs`. */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { layout } from './layout.mjs';
import { renderHeader } from './header.mjs';
import { renderPage } from './blocks.mjs';
import { indent, tag, escape } from './html.mjs';
import { loadProjects, projectRoutes, renderProject, renderIndex } from './projects.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));

const site = read('content/site.json');
const pages = read('content/pages.json');
const lang = site.defaultLang || site.lang || 'es';

/** Hash corto del contenido de un archivo, para versionar assets. */
function hash(file) {
  return createHash('sha1').update(readFileSync(join(ROOT, file))).digest('hex').slice(0, 8);
}

const ASSETS = ['css/style.css', 'css/projects.css', 'js/slideshow.js'];
const assets = Object.fromEntries(ASSETS.map((file) => [file, hash(file)]));

/** <title> de cada página: la home lleva solo el nombre. */
function documentTitle(route) {
  return route.title ? `${route.title} — ${site.title}` : site.title;
}

function write(route, { header, content, ...options }) {
  const html = layout({
    site,
    title: documentTitle(route),
    pageId: route.id,
    bodyClass: route.body,
    header: indent(header, 2),
    content: indent(content, 2),
    assets,
    depth: route.depth || 0,
    ...options,
  });

  const file = join(ROOT, route.file);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

/* ── 1. el clon ──────────────────────────────────────────────────── */

for (const route of site.routes) {
  const page = pages[route.id];
  if (!page) console.warn(`· sin contenido para "${route.id}", se genera vacía`);

  write(route, {
    header: renderHeader(site, route.id),
    content: renderPage(page, { root: ROOT }),
  });
  console.log(`${route.file.padEnd(28)} ${(page?.blocks || []).length} bloques`);
}

/* ── 2. los proyectos ────────────────────────────────────────────── */

/* Cabecera propia: desde proyectos/ los enlaces del clon no valen. */
function projectsHeader(current) {
  const title = tag('h1', { class: 'site-title' },
    tag('a', { href: '../index.html' }, escape(site.title)));
  const nav = tag('nav', { class: 'site-nav' },
    tag('ul', {}, [
      tag('li', { class: current === 'proyectos' ? 'is-current' : null },
        current === 'proyectos' ? 'Proyectos' : tag('a', { href: 'index.html' }, 'Proyectos')),
      tag('li', {}, tag('a', { href: '../index.html' }, 'Clon amargor.es')),
    ]));
  return title + '\n' + nav;
}

const projects = loadProjects(ROOT);
const options = { styles: ['css/projects.css'], scripts: [] };

for (const route of projectRoutes(projects, lang)) {
  write(route, {
    ...options,
    header: projectsHeader(route.kind === 'index' ? 'proyectos' : route.project.slug),
    content: route.kind === 'index'
      ? renderIndex(projects, { root: ROOT, lang })
      : renderProject(route.project, { root: ROOT, lang }),
  });
  console.log(`${route.file.padEnd(28)} ${route.project ? `${route.project.images.length} fotos` : `${projects.length} proyectos`}`);
}

/* ── robots ──────────────────────────────────────────────────────── */

writeFileSync(
  join(ROOT, 'robots.txt'),
  site.noindex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n'
);

console.log(`\n${site.routes.length} páginas del clon + ${projects.length + 1} de proyectos.`);
