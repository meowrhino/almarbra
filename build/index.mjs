/* Build del sitio.
   Lee content/*.json y escribe un .html estático por página.
   Sin dependencias: `npm run build` o `node build/index.mjs`. */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { layout } from './layout.mjs';
import { renderHeader } from './header.mjs';
import { renderPage } from './blocks.mjs';
import { indent } from './html.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const read = (file) => JSON.parse(readFileSync(join(ROOT, file), 'utf8'));

const site = read('content/site.json');
const pages = read('content/pages.json');

/** <title> de cada página: la home lleva solo el nombre. */
function documentTitle(route) {
  return route.title ? `${route.title} — ${site.title}` : site.title;
}

let written = 0;
for (const route of site.routes) {
  const page = pages[route.id];
  if (!page) {
    console.warn(`· sin contenido para "${route.id}", se genera vacía`);
  }

  const html = layout({
    site,
    title: documentTitle(route),
    pageId: route.id,
    bodyClass: route.body,
    header: indent(renderHeader(site, route.id), 2),
    content: indent(renderPage(page, { root: ROOT }), 2),
  });

  writeFileSync(join(ROOT, route.file), html);
  written += 1;
  console.log(`${route.file.padEnd(22)} ${(page?.blocks || []).length} bloques`);
}

// robots.txt acorde a la política de indexado
writeFileSync(
  join(ROOT, 'robots.txt'),
  site.noindex ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n'
);

console.log(`\n${written} páginas generadas.`);
