/* Páginas de los proyectos reales (los de content/projects/).

   Salen a proyectos/: un índice y una página por proyecto. Es una
   maqueta provisional a propósito —el diseño está por decidir—, pero
   con todo el contenido delante: fotos por grupos, sinopsis y créditos.

   El clon de amargor.es sigue en las páginas de la raíz, sin tocar. */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { tag, escape } from './html.mjs';
import { srcset, sizes, ratio } from './images.mjs';

const DIR = 'content/projects';
const OUT = 'proyectos';

/** Todos los proyectos, en el orden del índice de la ingesta. */
export function loadProjects(root) {
  const dir = join(root, DIR);
  const files = readdirSync(dir).filter((n) => n.endsWith('.json') && n !== 'index.json');
  return files
    .map((file) => JSON.parse(readFileSync(join(dir, file), 'utf8')))
    .sort((a, b) => a.category.localeCompare(b.category) || a.slug.localeCompare(b.slug));
}

/** Rutas que hay que generar: el índice y una por proyecto. */
export function projectRoutes(projects, lang) {
  return [
    { id: 'proyectos', file: `${OUT}/index.html`, title: 'Proyectos', depth: 1, kind: 'index' },
    ...projects.map((project) => ({
      id: `proyecto-${project.slug}`,
      file: `${OUT}/${project.slug}.html`,
      title: text(project.title, lang),
      depth: 1,
      kind: 'project',
      project,
    })),
  ];
}

/** Valor en el idioma pedido, con el primero que haya de reserva. */
function text(field, lang) {
  if (!field) return null;
  return field[lang] ?? Object.values(field)[0] ?? null;
}

/* ── piezas de la página ─────────────────────────────────────────── */

function photo(item, root, widthPct, eager) {
  const src = `../${item.src}`;
  return tag('img', {
    src,
    srcset: srcset(item.src, root)?.replace(/(^|, )img\//g, '$1../img/'),
    sizes: sizes(widthPct),
    width: item.w,
    height: item.h,
    alt: item.alt || '',
    style: ratio(item) ? `aspect-ratio: ${ratio(item)}` : null,
    loading: eager ? null : 'lazy',
    decoding: 'async',
    fetchpriority: eager ? 'high' : null,
  });
}

function creditList(credits) {
  if (!credits?.length) return '';
  const items = credits.map((credit) =>
    tag('li', {}, [
      tag('span', { class: 'credit__role' }, escape(credit.role)),
      credit.url
        ? tag('a', { href: credit.url, target: '_blank', rel: 'noopener' }, escape(credit.name || credit.url))
        : escape(credit.name),
    ])
  );
  return tag('ul', { class: 'credits' }, items);
}

function synopsis(value) {
  if (!value) return '';
  return value
    .split(/\n{2,}/)
    .map((paragraph) => tag('p', {}, escape(paragraph).replace(/\n/g, '<br>')))
    .join('\n');
}

/** Fotos agrupadas: [{ group, items }] respetando el orden del JSON. */
function byGroup(project) {
  if (!project.groups?.length) return [{ group: null, items: project.images }];
  const names = new Map(project.groups.map((g) => [g.slug, g.name]));
  const buckets = new Map();
  for (const image of project.images) {
    const key = image.group ?? '';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(image);
  }
  return [...buckets].map(([key, items]) => ({ group: key ? names.get(key) || key : null, items }));
}

export function renderProject(project, { root, lang }) {
  const sections = byGroup(project).map(({ group, items }, g) =>
    tag('section', { class: 'project__group' }, [
      group ? tag('h2', {}, escape(group)) : null,
      tag('div', { class: 'project__photos' },
        items.map((item, i) => tag('figure', {}, photo(item, root, 45, g === 0 && i === 0)))),
    ])
  );

  return tag('article', { class: 'project' }, [
    tag('header', { class: 'project__intro' }, [
      tag('h1', {}, escape(text(project.title, lang) || project.slug)),
      tag('p', { class: 'project__meta' }, `${project.category} · ${project.images.length} fotos`),
      synopsis(text(project.synopsis, lang)),
      creditList(text(project.credits, lang)),
    ]),
    ...sections,
  ]);
}

export function renderIndex(projects, { root, lang }) {
  const categories = [...new Set(projects.map((p) => p.category))];

  const blocks = categories.map((category) => {
    const cards = projects.filter((p) => p.category === category).map((project) => {
      const cover = project.images[0];
      return tag('li', { class: 'card' },
        tag('a', { href: `${project.slug}.html` }, [
          cover ? photo(cover, root, 25, false) : null,
          tag('span', {}, escape(text(project.title, lang) || project.slug)),
        ]));
    });
    return tag('section', { class: 'catalogue' }, [
      tag('h2', {}, escape(category.replace(/-/g, ' '))),
      tag('ul', { class: 'cards' }, cards),
    ]);
  });

  return tag('div', { class: 'catalogue-page' }, [
    tag('p', { class: 'note' },
      'Maqueta de trabajo: todo el material de la clienta, sin diseño todavía.'),
    ...blocks,
  ]);
}
