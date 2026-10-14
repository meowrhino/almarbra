/* Los proyectos, como los usa build.mjs.

     projects/<slug>/project.json       título, texto, créditos, fotos…
     projects/<slug>/img/1.webp …       sus fotos, como las saca imgToWeb

   Salen en el orden de las listas de data/site.json («lists»): la
   lista en la que está un proyecto es su categoría. Uno que no está en
   ninguna no sale en la web.

   Las fotos se nombran por su número, sin .webp («1», «2»…: todas son
   .webp), en el orden en que van. El ancho y el alto no se escriben: se
   leen del propio .webp. */

import { closeSync, existsSync, openSync, readdirSync, readSync } from 'node:fs';
import { join } from 'node:path';

/** Ancho y alto de un .webp, de su cabecera (los primeros 30 bytes);
    null si no es un WebP de verdad (un .jpg renombrado, por ejemplo). */
export function webpSize(file) {
  const b = Buffer.alloc(30);
  const fd = openSync(file, 'r');
  readSync(fd, b, 0, 30, 0);
  closeSync(fd);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };   // VP8
}

/**
 * Lee projects/ en el orden de site.lists. `read` lee un JSON (el del
 * build para con un mensaje si está roto). Devuelve los proyectos y lo
 * que esté mal, para que el build pare o avise.
 */
/* Los campos que entiende un project.json. Otro (un «covr», un
   «photo») se avisa: casi seguro que está mal escrito. Los que empiezan
   por _ son notas. */
const FIELDS = new Set(['title', 'short', 'text', 'credits', 'color', 'cover', 'map', 'photos', 'groups']);

export function loadProjects(root, site, read) {
  const errors = [];
  const warnings = [];
  const lists = site.lists || {};
  const dir = join(root, 'projects');
  const folders = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);

  const projects = [];
  for (const [category, { projects: slugs = [] }] of Object.entries(lists)) {
    for (const slug of slugs) {
      if (projects.some((p) => p.slug === slug)) { errors.push(`«${slug}» está dos veces en las listas de data/site.json`); continue; }
      const at = `projects/${slug}/project.json`;
      if (!existsSync(join(root, at))) { errors.push(`la lista «${category}» de data/site.json nombra «${slug}», y no hay ${at}`); continue; }

      const data = read(at);
      for (const key of Object.keys(data)) {
        if (!key.startsWith('_') && !FIELDS.has(key)) warnings.push(`${at}: «${key}» no es un campo que use la web (¿mal escrito?)`);
      }
      /* Lo que tiene que ser una lista, que lo sea: si no, un mensaje
         claro y no un error de JavaScript. */
      const list = (value, field) => {
        if (value == null) return [];
        if (Array.isArray(value)) return value;
        errors.push(`${at}: «${field}» tiene que ser una lista, entre corchetes: ["1", "2"]`);
        return [];
      };
      if (data.title && typeof data.title !== 'object') errors.push(`${at}: «title» va por idioma: { "es": "…", "en": "…" }`);
      list(data.credits, 'credits');

      const image = (name) => {
        const file = `${String(name).replace(/\.webp$/, '')}.webp`;
        const src = `projects/${slug}/img/${file}`;
        if (!existsSync(join(root, src))) { errors.push(`projects/${slug}: no encuentro img/${file}`); return null; }
        const size = webpSize(join(root, src));
        if (!size) { errors.push(`projects/${slug}: img/${file} no es un WebP de verdad (pásala por imgToWeb)`); return null; }
        return { name: file.replace(/\.webp$/, ''), file, src, ...size };
      };
      /* Las fotos van en «photos», o por grupos en «groups» (Roma). */
      const groups = list(data.groups, 'groups').concat(data.groups ? [] : [{ name: null, photos: data.photos }])
        .map((g) => ({ name: g.name, images: list(g.photos, 'photos').map(image).filter(Boolean) }));
      const images = groups.flatMap((g) => g.images);
      if (!images.length) errors.push(`projects/${slug}: no tiene fotos`);

      /* Las de «cover» y «map» tienen que estar entre sus fotos. */
      const pick = (field) => [].concat(data[field] || []).map((name) => {
        const found = images.find((i) => i.name === String(name).replace(/\.webp$/, ''));
        if (!found) errors.push(`projects/${slug}: en «${field}», ${name} no está entre sus fotos`);
        return found;
      }).filter(Boolean);

      projects.push({
        ...data,
        slug,
        category,
        groups,
        images,
        cover: pick('cover')[0] || images[0],
        map: pick('map'),
      });
    }
  }

  for (const slug of folders) {
    if (!projects.some((p) => p.slug === slug) && !errors.some((e) => e.includes(`«${slug}»`))) {
      warnings.push(`projects/${slug} no está en ninguna lista de data/site.json: no sale en la web`);
    }
  }

  /* Un color por proyecto: el suyo («color») o el de data/site.json
     que le toque por orden; si hay menos colores que proyectos, se
     vuelve a empezar. */
  const colors = site.colors || [];
  projects.forEach((p, i) => { p.color ||= colors[i % colors.length]; });

  return { projects, errors, warnings };
}
