/* Los proyectos, como los usan build.mjs y og.mjs.

     projects/<slug>/proyecto.json      título, sinopsis, créditos, fotos…
     projects/<slug>/01.webp …          sus fotos (y 400/, 800/, 1400/)

   Salen en el orden de las listas de content/web.json («listas»): la
   lista en la que está un proyecto es su categoría. Uno que no está en
   ninguna no sale en la web.

   Las fotos se nombran por archivo («01.webp»), en el orden en que van.
   El ancho y el alto no se escriben: se leen del propio .webp. */

import { closeSync, existsSync, openSync, readdirSync, readSync } from 'node:fs';
import { join } from 'node:path';

/** Ruta de una variante: projects/roma/01.webp + 800 -> projects/roma/800/01.webp */
export const variant = (src, width) => src.replace(/([^/]+)$/, `${width}/$1`);

/** Ancho y alto de un .webp, de su cabecera (los primeros 30 bytes). */
export function webpSize(file) {
  const b = Buffer.alloc(30);
  const fd = openSync(file, 'r');
  readSync(fd, b, 0, 30, 0);
  closeSync(fd);
  const chunk = b.toString('ascii', 12, 16);
  if (chunk === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };   // VP8
}

/**
 * Lee projects/ en el orden de site.listas. `read` lee un JSON (el del
 * build para con un mensaje si está roto). Devuelve los proyectos y lo
 * que esté mal, para que el build pare o avise.
 */
export function loadProjects(root, site, read) {
  const errors = [];
  const warnings = [];
  const listas = site.listas || {};
  const dir = join(root, 'projects');
  const folders = readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);

  const projects = [];
  for (const [category, slugs] of Object.entries(listas)) {
    for (const slug of slugs) {
      if (projects.some((p) => p.slug === slug)) { errors.push(`«${slug}» está dos veces en las listas de content/web.json`); continue; }
      if (!existsSync(join(dir, slug, 'proyecto.json'))) { errors.push(`la lista «${category}» de content/web.json nombra «${slug}», y no hay projects/${slug}/proyecto.json`); continue; }

      const data = read(`projects/${slug}/proyecto.json`);
      const image = (file) => {
        const src = `projects/${slug}/${file}`;
        if (!existsSync(join(root, src))) { errors.push(`projects/${slug}: no encuentro ${file}`); return null; }
        return { file, src, ...webpSize(join(root, src)) };
      };
      /* Las fotos van en «fotos», o por grupos en «grupos» (Roma). */
      const groups = (data.grupos || [{ nombre: null, fotos: data.fotos || [] }])
        .map((g) => ({ name: g.nombre, images: (g.fotos || []).map(image).filter(Boolean) }));
      const images = groups.flatMap((g) => g.images);
      if (!images.length) errors.push(`projects/${slug}: no tiene fotos`);

      /* Las de «portada» y «mapa» tienen que estar entre sus fotos. */
      const pick = (field) => [].concat(data[field] || []).map((file) => {
        const found = images.find((i) => i.file === file);
        if (!found) errors.push(`projects/${slug}: en «${field}», ${file} no está entre sus fotos`);
        return found;
      }).filter(Boolean);

      projects.push({
        ...data,
        slug,
        category,
        groups,
        images,
        cover: pick('portada')[0] || images[0],
        map: pick('mapa'),
      });
    }
  }

  for (const slug of folders) {
    if (!projects.some((p) => p.slug === slug) && !errors.some((e) => e.includes(`«${slug}»`))) {
      warnings.push(`projects/${slug} no está en ninguna lista de content/web.json: no sale en la web`);
    }
  }

  /* Un color por proyecto: el suyo («color») o el de content/web.json
     que le toque por orden; si hay menos colores que proyectos, se
     vuelve a empezar. */
  const colors = site.colors || [];
  projects.forEach((p, i) => { p.color ||= colors[i % colors.length]; });

  return { projects, errors, warnings };
}
