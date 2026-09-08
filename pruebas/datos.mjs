/* Saca de content/ los datos que necesitan las pruebas de tejido y los
   deja en pruebas/datos.js como un objeto global, para que los
   prototipos abran también con doble clic (sin servidor, sin fetch).

     node pruebas/datos.mjs

   Esto es material de prueba: no entra en el build del sitio. */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const read = (f) => JSON.parse(readFileSync(join(ROOT, f), 'utf8'));

const site = read('content/site.json');
const lang = site.lang || 'es';
const overrides = read('content/overrides.json');

const proyectos = readdirSync(join(ROOT, 'content/projects'))
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const p = read(`content/projects/${f}`);
    const o = overrides[p.slug] || {};
    const title = (o.title || p.title || {})[lang] || p.slug;
    const short = (o.short || {})[lang] || title;
    const cover = o.cover || p.cover || (p.images[0] && p.images[0].src);
    const credits = (p.credits && p.credits[lang]) || [];
    return {
      slug: p.slug,
      titulo: title,
      corto: short,
      categoria: p.category,
      fotos: p.images.length,
      cover,
      /* la variante de 400 px que escribe la ingesta: en el tejido las
         portadas salen pequeñas y no hace falta bajarse la grande */
      mini: cover ? cover.replace(/\.webp$/, '-400.webp') : null,
      w: (p.images.find((i) => i.src === cover) || p.images[0] || {}).w || 1,
      h: (p.images.find((i) => i.src === cover) || p.images[0] || {}).h || 1,
      equipo: credits
        .filter((c) => c.name)
        .flatMap((c) => String(c.name).split(/\s*&\s*|\s*,\s*/).map((name) => ({ rol: c.role || '', name: name.trim() })))
        .filter((c) => c.name),
    };
  })
  .sort((a, b) => (a.categoria === b.categoria ? 0 : a.categoria === 'textil' ? -1 : 1));

/* Las personas: cada una con los proyectos en los que aparece. El hilo
   del tejido es la gente que se repite de una editorial a otra. */
const personas = new Map();
for (const p of proyectos) {
  for (const { rol, name } of p.equipo) {
    if (!personas.has(name)) personas.set(name, { name, roles: new Set(), proyectos: [] });
    const persona = personas.get(name);
    persona.roles.add(rol);
    if (!persona.proyectos.includes(p.slug)) persona.proyectos.push(p.slug);
  }
}

/* Almudena está en todo: como hilo no dice nada, así que fuera del
   tejido (se queda como firma, no como nodo). */
personas.delete('Almudena González');

const gente = [...personas.values()]
  .map((p) => ({ name: p.name, roles: [...p.roles], proyectos: p.proyectos }))
  .sort((a, b) => b.proyectos.length - a.proyectos.length || a.name.localeCompare(b.name));

/* Aristas proyecto–proyecto: comparten a alguien del equipo. Las tres
   series textiles no tienen ficha de equipo, así que se enhebran entre
   ellas por la técnica: son las piezas de telar. */
const enlaces = [];
for (let i = 0; i < proyectos.length; i++) {
  for (let j = i + 1; j < proyectos.length; j++) {
    const a = proyectos[i], b = proyectos[j];
    const comun = gente.filter((g) => g.proyectos.includes(a.slug) && g.proyectos.includes(b.slug));
    if (comun.length) {
      enlaces.push({ a: a.slug, b: b.slug, por: comun.map((g) => g.name), tipo: 'equipo' });
    } else if (a.categoria === 'textil' && b.categoria === 'textil') {
      enlaces.push({ a: a.slug, b: b.slug, por: ['telar'], tipo: 'telar' });
    }
  }
}

const datos = { proyectos, gente, enlaces };
writeFileSync(
  join(ROOT, 'pruebas/datos.js'),
  `/* GENERADO por pruebas/datos.mjs — no editar a mano. */\nwindow.TEJIDO = ${JSON.stringify(datos, null, 2)};\n`
);

console.log(`${proyectos.length} proyectos · ${gente.length} personas · ${enlaces.length} enlaces`);
console.log(gente.slice(0, 12).map((g) => `${g.proyectos.length}× ${g.name} (${g.roles.join(', ')})`).join('\n'));
