/* La vista previa: la web entera sin build, para Live Server.

   La web de verdad no existe hasta que el build la escribe en dist/
   (en la Action, al publicar). Esto la pinta en el navegador con las
   mismas plantillas (build/paginas.mjs), leyendo los JSON y las fotos
   tal cual están en la carpeta. La página va en ?p=:

     index.html?p=/en/projects/roma/

   Lo que el navegador no puede hacer, no lo hace: el mapa usa las fotos
   grandes (las pequeñas las hace el build) y no hay imágenes para
   compartir. Lo demás se ve igual. Si algo está mal, lo dice como el
   build: lo que lo pararía, en vez de la página. Los avisos del build
   (⚠: una carpeta que no está en ninguna lista) aquí no salen: el
   navegador no puede ver qué carpetas hay. */

import { esc, sitio } from './paginas.mjs';
import { leerJSON, loadDiaris, loadProjects, photoSrcs, slugOf, validar, webpSize } from './proyectos.mjs';

const write = (html) => { document.open(); document.write(html); document.close(); };

const oops = (title, lines) => write(`<!DOCTYPE html><meta charset="utf-8"><title>vista previa — error</title>
<body style="margin:0;padding:clamp(24px,6vw,80px);font:18px/1.5 system-ui,sans-serif;background:#fff;color:#000">
<h1 style="font-weight:400;color:#c00">${esc(title)}</h1>
${lines.map((l) => `<p style="max-width:70ch">${esc(l)}</p>`).join('\n')}
<p>Arréglalo y guarda: esta página se recarga sola.</p></body>`);

/** Un JSON de la carpeta, o undefined si no está; si está roto, lo dice. */
async function json(at) {
  const r = await fetch(at, { cache: 'no-cache' });
  return r.ok ? leerJSON(await r.text(), at) : undefined;
}

/** El ancho y alto de una foto, de sus primeros bytes (no hace falta
    bajarla entera: Live Server entiende Range); undefined si no está. */
async function size(src) {
  const r = await fetch(src, { cache: 'no-store', headers: { Range: 'bytes=0-29' } }).catch(() => null);
  if (!r?.ok) return undefined;
  const reader = r.body.getReader();
  let bytes = new Uint8Array(0);
  while (bytes.length < 30) {
    const { done, value } = await reader.read();
    if (done) break;
    const more = new Uint8Array(bytes.length + value.length);
    more.set(bytes);
    more.set(value, bytes.length);
    bytes = more;
  }
  reader.cancel();
  return webpSize(bytes);
}

async function start() {
  /* Todo lo que hay que leer, antes: el navegador no puede mirar qué
     hay en una carpeta, así que pide los proyectos de las listas y las
     fotos que nombra cada uno. */
  const site = await json('data/site.json');
  const about = await json('data/about.json');
  if (!site || !about) return oops('No encuentro los datos', ['Falta data/site.json o data/about.json.']);
  const slugs = Object.values(site.lists || {}).flatMap((list) => list?.projects || []).map(slugOf).filter((slug) => typeof slug === 'string');
  const files = new Map(await Promise.all(slugs.map(async (slug) => {
    const at = `projects/${slug}/project.json`;
    return [at, await json(at)];
  })));
  /* Lo mismo que comprueba el build con schema/ (en VS Code, subrayado en rojo). */
  const schemas = Object.fromEntries(await Promise.all(['site', 'about', 'project'].map(async (type) => [type, await json(`schema/${type}.json`)])));
  const invalid = [...validar(site, schemas.site, 'data/site.json'), ...validar(about, schemas.about, 'data/about.json'),
    ...[...files].filter(([, data]) => data).flatMap(([at, data]) => validar(data, schemas.project, at))];
  if (invalid.length) return oops('Así no se publicaría', invalid);

  const srcs = slugs.flatMap((slug) => {
    const data = files.get(`projects/${slug}/project.json`);
    return data ? photoSrcs(slug, data) : [];
  });
  const sizes = new Map(await Promise.all(srcs.map(async (src) => [src, await size(src)])));

  const { projects, errors } = loadProjects(site, { json: (at) => files.get(at), size: (src) => sizes.get(src) });
  if (errors.length) return oops('Así no se publicaría', errors);

  /* diaris/: 1.webp, 2.webp…, hasta la primera que no esté. */
  const numbers = [];
  for (let n = 1; ; n++) {
    const wh = await size(`diaris/${n}.webp`);
    if (wh === undefined) break;
    sizes.set(`diaris/${n}.webp`, wh);
    numbers.push(n);
  }
  const { images: diaris, errors: diarisErrors } = loadDiaris(numbers, (src) => sizes.get(src));
  if (diarisErrors.length) return oops('Así no se publicaría', diarisErrors);

  const web = sitio({ site: { ...site, noindex: true }, about, projects, diaris, preview: true });

  /* ?p=/en/projects/roma/ → en, projects/roma/ */
  let path = (new URLSearchParams(location.search).get('p') || '/').replace(/^\/+/, '');
  if (path && !path.endsWith('/')) path += '/';
  const first = path.split('/')[0];
  const l = web.LANGS.includes(first) && first !== web.lang ? first : web.lang;
  if (l !== web.lang) path = path.slice(first.length + 1);
  const html = web.paths.includes(path) && web.render(l, path);
  if (!html) return oops('Esta página no existe', [`No hay ninguna página en ${location.search}. Si es un proyecto, mira que esté en «lists» de data/site.json.`]);
  write(html);
}

start().catch((e) => (e.json
  ? oops('Hay un error en un JSON', [e.message])
  : oops('La vista previa ha fallado', [e.message])));
