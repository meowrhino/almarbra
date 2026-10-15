/* data/ + projects/ -> dist/

   Dos plantillas y ya:

     dist/index.html                    portada: el mapa
     dist/<lista>/index.html            cada lista (textil/, foto/)
     dist/about/index.html              el about
     dist/projects/<slug>/index.html    ficha técnica y galería en scroll
                                        vertical

   Una vez por idioma: el del sitio en la raíz y los demás en su carpeta
   (dist/en/, dist/ca/…), cada página con sus hreflang.

   Más lo que pide un sitio estático: 404.html, sitemap.xml, robots.txt,
   .nojekyll, _headers y favicon.svg, y una copia de css/, js/ y
   las fotos (dist/media/). dist/ no se commitea: lo publica la Action
   (.github/workflows/deploy.yml).

   Antes de escribir nada, valida: un JSON roto, una foto que no está o un
   una foto de `portada` o `mapa` que no está paran el build con un mensaje, y
   la web publicada se queda como estaba.

   El sitio funciona entero sin JavaScript: sin él el mapa son las fotos
   seguidas, y las listas y el about son páginas. Con él: js/mapa.js monta el mapa,
   js/transicion.js tapa y destapa al cambiar de página, js/hilos.js da
   la forma a los hilos, js/telar.js teje el fondo del about y
   js/hilo.js dibuja el de los proyectos.

     node build/build.mjs      (npm run build)

   Lo que se edita:

     data/site.json          título, dirección, descripción, idiomas, las
                             listas con su nombre y sus proyectos, el menú,
                             colores, email, redes y la mezcla del mapa
     data/about.json         el texto del about, por idioma
     projects/<slug>/project.json    cada proyecto: título, texto,
                             créditos, fotos, portada y mapa (ver
                             build/proyectos.mjs) */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { loadProjects } from './proyectos.mjs';

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const OUT = join(ROOT, 'dist');

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

/** Un JSON roto para el build diciendo cuál y dónde. */
function read(file) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  try { return JSON.parse(text); } catch (e) { fail(`${file} no es un JSON válido: ${e.message}`); }
}

const site = read('data/site.json');
if (!site.url) fail('falta "url" en data/site.json: la dirección donde se publica la web');
const about = read('data/about.json');

/* Las páginas se enlazan entre sí con rutas relativas; solo lo que se lee
   desde fuera —canonical, og:image, sitemap— y la 404 necesitan la
   dirección entera. */
const abs = (path) => new URL(path, site.url).href;
const lang = site.lang || 'es';

/** Escapa lo que va al documento; en atributos, también las comillas. */
const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (v) => esc(v).replace(/"/g, '&quot;');

/* Los idiomas. Cada página sale una vez por idioma: el del sitio en la
   raíz y los demás en su carpeta (en/, ca/). `cur` es el de la página
   que se está escribiendo (ver «escribir», abajo). */
const LANGS = site.langs || [lang];
let cur = lang;
const prefix = (l) => (l === lang ? '' : `${l}/`);

/** El valor en el idioma de la página; si falta, el del sitio, o el
    primero que haya. */
const has = (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v));
const t = (field) => (field ? [field[cur], field[lang], ...Object.values(field)].find(has) ?? null : null);

/** Lo mismo, ya pintado (por defecto, escapado). */
const tr = (field, render = esc) => {
  const value = t(field);
  return value == null ? '' : render(value);
};

/* ── imágenes ────────────────────────────────────────────────────── */

/* Las fotos viven en projects/<slug>/img/ junto a su project.json, y en la
   web se sirven desde media/<slug>/ (ahí las copia el build), aparte de
   las páginas: así _headers les da su caché larga sin tocar el HTML. */
const pub = (src) => src.replace(/^projects\//, 'media/');

/* De cada foto hay una sola, la de imgToWeb (2000 px de lado largo).
   El mapa, que las enseña pequeñas y a docenas, usa las suyas: las hace
   el build (abajo, `mini`). La clienta solo sube las grandes.

   `cap` limita la foto a su ancho real: las verticales rondan los 1333
   de ancho, y sin este tope se ampliarían en pantallas grandes y se
   verían blandas. */
function img(image, { base = '', eager = false, cap = false } = {}) {
  return `<img src="${attr(base + pub(image.src))}"`
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

/* Lo que tiene que estar en <html> antes de pintar, para que no asome
   nada que no toca:

     .js           hay JavaScript: las fotos esperan a haber llegado para
                   aparecer (css/style.css)
     .tapada       se llega desde otra página de la web, o con atrás y
                   adelante: la página nace tapada para que la transición
                   la destape (js/transicion.js); si ese script no llegara,
                   el CSS la destapa sola a los 5 s
     .tapando      con atrás y adelante, mientras la ola tapa la foto que
                   el navegador guarda de la página de antes (una View
                   Transition): la página nueva, transparente salvo la ola.
                   window.revelada dice si la hay (js/transicion.js) */
const HEAD_SCRIPT = `<script>{
const html = document.documentElement;
html.classList.add('js');
let back = false;
try {
  back = !sessionStorage.getItem('almarbra-transicion') && performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && (back || sessionStorage.getItem('almarbra-transicion'))) html.classList.add('tapada');
} catch {}
window.revelada = 'onpagereveal' in window ? new Promise((done) => addEventListener('pagereveal', (e) => {
  const vt = e.viewTransition;
  if (vt && back && html.classList.contains('tapada')) { html.classList.add('tapando'); done(vt); }
  else { vt?.ready.catch(() => {}); vt?.skipTransition(); done(null); }   // saltarla rechaza ready: sin error en la consola
}, { once: true })) : Promise.resolve(null);
}</script>
`;

const LOCALES = { es: 'es_ES', en: 'en_GB', ca: 'ca_ES' };

/* La imagen al compartir (og:image): 1200×630 en JPG, que es lo que
   esperan WhatsApp, Instagram, LinkedIn y compañía. La de un proyecto, su
   portada entera sobre blanco, con aire; la de la portada de la web, las
   portadas de los primeros proyectos en fila.

   Las hace el build con ffmpeg (en la Action lo instala el workflow) en
   .cache/og/, con nombre según las fotos de las que sale, así que solo se
   rehacen si cambia la portada o su foto; y las copia a dist/. Sin ffmpeg
   se comparte la portada tal cual y se avisa. */
const OG_W = 1200;
const OG_H = 630;
const AIR = 48;      // margen blanco alrededor, en px
const MOSAIC = 6;    // portadas en la de la portada
const FIT = `scale=${OG_W - 2 * AIR}:${OG_H - 2 * AIR}:force_original_aspect_ratio=decrease,pad=${OG_W}:${OG_H}:(ow-iw)/2:(oh-ih)/2:white`;
let ffmpeg = true;
const ogs = new Map();

/** Hace (o saca de la caché) la og:image `out` (su ruta en dist/) a partir
    de las fotos `srcs`; devuelve `out`, o null si no ha podido. */
function ogImage(out, srcs, filter) {
  if (ogs.has(out)) return ogs.get(out);
  const key = createHash('sha1').update(srcs.join('|')).digest('hex').slice(0, 12);
  const cached = join(ROOT, '.cache', 'og', `${key}.jpg`);
  const newest = Math.max(...srcs.map((src) => statSync(join(ROOT, src)).mtimeMs));
  let ok = existsSync(cached) && statSync(cached).mtimeMs >= newest;
  if (!ok && ffmpeg) {
    try {
      mkdirSync(dirname(cached), { recursive: true });
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...srcs.flatMap((src) => ['-i', join(ROOT, src)]), ...filter, '-q:v', '3', cached]);
      ok = true;
    } catch {
      ffmpeg = false;
      console.warn('⚠ sin ffmpeg (brew install ffmpeg): al compartir sale la portada tal cual');
    }
  }
  if (ok) cpSync(cached, join(OUT, out));
  ogs.set(out, ok ? out : null);
  return ogs.get(out);
}

const projectOg = (project) => ogImage(`media/${project.slug}/og.jpg`, [project.cover.src], ['-vf', FIT]);

/** Las portadas de los primeros `projects`, en fila: la de la portada
    (og.jpg) y la de cada lista (og-<lista>.jpg). */
function mosaicOg(out, projects) {
  const picks = projects.slice(0, MOSAIC).map((p) => p.cover.src);
  const row = picks.map((_, i) => `[${i}:v]scale=-2:440,pad=iw+24:ih:12:0:white[p${i}]`).join(';');
  return ogImage(out, picks, ['-filter_complex', `${row};${picks.map((_, i) => `[p${i}]`).join('')}hstack=inputs=${picks.length},${FIT}`]);
}

/* `og`, la de 1200×630 si la hay; si no, `image` tal cual. */
function shareImage(image, og) {
  if (og) {
    return `<meta property="og:image" content="${attr(abs(og))}">
<meta property="og:image:width" content="${OG_W}">
<meta property="og:image:height" content="${OG_H}">
<meta property="og:image:type" content="image/jpeg">
`;
  }
  return `<meta property="og:image" content="${attr(abs(pub(image.src)))}">
<meta property="og:image:width" content="${image.w}">
<meta property="og:image:height" content="${image.h}">
`;
}

/* Datos para los buscadores (JSON-LD). `<` escapado, para que nada
   cierre el <script> antes de tiempo. */
const ld = (data) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c')}</script>\n`;

/* Quién es: va en la portada, y como autora en cada proyecto. «social»
   en data/site.json, si las hay, van en sameAs. */
const person = () => ({
  '@type': 'Person',
  name: site.title,
  url: site.url,
  description: paras(t(about))[0] || t(site.description),
  ...(site.email ? { email: site.email } : {}),
  ...(site.social?.length ? { sameAs: site.social } : {}),
});

/* Al pie del about: el email y las redes de data/site.json (de
   Instagram sale @usuario; de lo demás, el nombre del sitio), y quién
   hizo la web. */
function contact() {
  const handle = (url) => {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const user = u.pathname.split('/').filter(Boolean)[0];
    return host === 'instagram.com' && user ? `@${user}` : host.replace(/\.[a-z]+$/, '');
  };
  const links = [
    ...(site.email ? [`<a href="mailto:${attr(site.email)}">${esc(site.email)}</a>`] : []),
    ...(site.social || []).map((url) => `<a href="${attr(url)}" target="_blank" rel="noopener me">${esc(handle(url))}</a>`),
  ];
  return (links.length ? `\n<p class="contacto">${links.join('\n')}</p>` : '')
    + '\n<p class="credito">web: <a href="https://meowrhino.studio" target="_blank" rel="noopener">meowrhino</a></p>';
}

/* `path` es la dirección de la página dentro del sitio, sin el idioma
   ('' la portada, 'projects/roma/' un proyecto); sin ella no hay
   canonical, hreflang ni og, que es lo que pasa en la 404. `root` va de
   la página a la raíz del sitio, donde están css/, js/ y media/. `image` (y `og`, su versión de 1200×630, ya en dist/) es la que sale al
   compartir el enlace. */
function page({ title, body, root = '', vista = null, bodyClass = null, bodyStyle = null, scripts = [], path = null, description = null, image = null, og = null, head = '' }) {
  const full = title ? `${title} — ${site.title}` : site.title;
  const desc = description || t(site.description) || '';
  const alternates = LANGS.length > 1
    ? [...LANGS, 'x-default'].map((l) => `<link rel="alternate" hreflang="${l}" href="${attr(abs(prefix(l === 'x-default' ? lang : l) + path))}">\n`).join('')
    : '';
  const share = path === null ? '' : `<link rel="canonical" href="${attr(abs(prefix(cur) + path))}">
${alternates}<meta property="og:type" content="website">
<meta property="og:site_name" content="${attr(site.title)}">
<meta property="og:title" content="${attr(full)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${attr(abs(prefix(cur) + path))}">
${image ? shareImage(image, og) : ''}<meta property="og:locale" content="${LOCALES[cur] || cur}">
<meta name="twitter:card" content="summary_large_image">
`;
  return `<!DOCTYPE html>
<html lang="${attr(cur)}"${vista ? ` data-vista="${attr(vista)}"` : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${attr(desc)}">
${share}${site.noindex || path === null ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="icon" href="${attr(root)}favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#ffffff">
<link rel="stylesheet" href="${attr(root)}css/style.css${version('css/style.css')}">
${HEAD_SCRIPT}${head}</head>
<body${bodyClass ? ` class="${attr(bodyClass)}"` : ''}${bodyStyle ? ` style="${attr(bodyStyle)}"` : ''}>
${body}
${['js/hilos.js', 'js/transicion.js', ...scripts].map((s) => `<script src="${attr(root)}${s}${version(s)}" defer></script>`).join('\n')}
</body>
</html>
`;
}

/* ── portada ─────────────────────────────────────────────────────── */

/* Las fotos del mapa salen a 170 px como mucho (340 con el zoom): las de
   2000 serían 30 MB de golpe. Así que el build hace de cada una otra de
   MINI px de ancho con cwebp, en .cache/mapa/ (solo si no está o la foto
   ha cambiado), y la publica en media/<slug>/mapa/. En la Action, cwebp
   lo instala el workflow. Sin cwebp, el mapa usa las grandes y se avisa. */
const MINI = 600;
let cwebp = true;

function mini(image) {
  const slug = image.src.split('/')[1];
  const out = join(ROOT, '.cache', 'mapa', slug, image.file);
  const src = join(ROOT, image.src);
  if (!existsSync(out) || statSync(out).mtimeMs < statSync(src).mtimeMs) {
    if (!cwebp) return image;
    try {
      mkdirSync(dirname(out), { recursive: true });
      execFileSync('cwebp', ['-q', '85', '-quiet', '-resize', String(Math.min(MINI, image.w)), '0', src, '-o', out]);
    } catch {
      cwebp = false;
      console.warn('⚠ sin cwebp (brew install webp): el mapa usa las fotos grandes');
      return image;
    }
  }
  return { ...image, src: `projects/${slug}/mapa/${image.file}` };
}

/* Al mapa van las fotos de «map» (su project.json). Un proyecto sin
   ellas manda su portada y unas cuantas más, repartidas a lo largo de su
   galería. La portada (`cover`) es la de «portada», o la primera. */
const PER_PROJECT = 6;

function mapImages(project) {
  if (project.map.length) return project.map;
  const { cover } = project;
  const rest = project.images.filter((i) => i !== cover);
  const n = Math.min(PER_PROJECT - 1, rest.length);
  return [cover, ...Array.from({ length: n }, (_, k) => rest[Math.floor((k * rest.length) / n)])];
}

/* Una lista (textil, foto): una página por cada una de data/site.json,
   con su nombre encima (solo sin JavaScript: con él, ya está marcado en
   el menú). Dentro, en zigzag: un proyecto a la izquierda con su nombre
   debajo, el siguiente a la derecha y más abajo, y así. Cada uno ocupa
   dos filas de la rejilla y el siguiente empieza en la segunda: por eso
   se solapan a media altura (css/style.css). Las verticales, más
   estrechas que las apaisadas, para que no se coman la pantalla. */
function listItem(root, home, project, i) {
  const { cover } = project;
  const width = cover.h > cover.w ? 70 : 100;
  return `<li style="grid-row:${i + 1} / span 2"><a class="row" href="${attr(home)}projects/${attr(project.slug)}/" style="--c:${attr(project.color)}">
<div class="pic" style="width:${width}%">${img(cover, { base: root })}</div>
<h3>${tr(project.title) || esc(project.slug)}</h3>
</a></li>`;
}

function list(root, home, projects) {
  const cats = Map.groupBy(projects, (p) => p.category);
  return [...cats].map(([category, items]) => `<section class="cat" id="${attr(category)}">
<h1>${label(category)}</h1>
<ol>
${items.map((p, i) => listItem(root, home, p, i)).join('\n')}
</ol>
</section>`).join('\n\n');
}

/* Las vistas, en el orden del menú: el mapa (la portada), una página
   por lista y el about. Cada una, su dirección: '' , 'textil/', 'about/'. */
const LISTS = Object.keys(site.lists || {});
const VIEWS = ['mapa', ...LISTS, 'about'];
const viewPath = (view) => (view === 'mapa' ? '' : `${view}/`);
/* El nombre de una vista en el menú: el de su lista, o el de «menu»
   (las vistas mapa y about, y el back de los proyectos). */
const MENU = { mapa: 'map', about: 'about', volver: 'back' };
const label = (view) => tr(site.lists?.[view]?.name || site.menu?.[MENU[view]]) || esc(view.replace(/-/g, ' '));

/** El menú de arriba, igual en todas las páginas. El nombre lleva
    siempre a la portada. A la derecha, mapa, las listas y about, con la
    que está puesta marcada (aria-current). Abajo, la misma página en los
    otros idiomas. `home` va de la página a la portada de su idioma;
    `root`, a la raíz del sitio. */
function topBar({ home = '', root = '', path = null, view = null }) {
  const link = (to) => `<a href="${attr(home + viewPath(to))}" data-to="${attr(to)}"${to === view ? ' aria-current="page"' : ''}>${label(to)}</a>`;
  const langs = path !== null && LANGS.length > 1
    ? `<div class="idiomas">${LANGS.map((l) => `<a href="${attr(root + prefix(l) + path)}" hreflang="${l}" lang="${l}"${l === cur ? ' aria-current="true"' : ''}>${l}</a>`).join('')}</div>`
    : '';
  return `<header class="top">
<a href="${attr(home)}" class="name">${esc(site.title)}</a>
${langs}
<nav>
${VIEWS.map(link).join('\n')}
</nav>
</header>`;
}

/* El «back» de un proyecto vuelve a la vista de la que se venía (el mapa
   o una lista): cada una se apunta al abrirse. */
const remember = (view) => `<script>try { sessionStorage.setItem('almarbra-vista', '${viewPath(view)}') } catch {}</script>\n`;

/* Las direcciones de antes eran vistas con # (/#textil, /#about): llevan
   a su página. */
const OLD_HASH = `<script>{ const v = location.hash.slice(1); if (${JSON.stringify(VIEWS)}.includes(v) && v !== 'mapa') location.replace(v + '/') }</script>\n`;

/* De la página de una vista: '' en el idioma del sitio, '../' en los demás,
   y un '../' más si no es la portada. */
const viewRoot = (view) => (view === 'mapa' ? '' : '../') + (cur === lang ? '' : '../');

/* Los colores de los proyectos, para el telar del about y la ola de la
   transición en las páginas que no tienen ninguno a la vista. */
const palette = (projects) => JSON.stringify([...new Set(projects.map((p) => p.color))]);

function mapPage(projects) {
  const root = viewRoot('mapa');
  /* El mapa: las fotos de cada proyecto, sin posición. js/mapa.js las
     reparte en cada carga y las une con hilos del color del proyecto.
     Es solo para la vista: quien navega con teclado o lector de
     pantalla tiene las listas. */
  const pins = projects.flatMap((project, p) => mapImages(project).map((image, i) => {
    const long = [170, 120, 145][i % 3];   // de tres tamaños, para que no parezca una rejilla
    const width = Math.round((long * image.w) / Math.max(image.w, image.h));
    return `<a class="pin" href="projects/${attr(project.slug)}/" tabindex="-1" data-p="${p}" style="--c:${attr(project.color)};width:${width}px">`
      + img(mini(image), { base: root })
      + `<span>${tr(project.short || project.title) || esc(project.slug)}</span></a>`;
  }));

  return page({
    title: null,
    path: '',
    root,
    vista: 'mapa',
    image: projects[0].cover,
    og: mosaicOg('og.jpg', projects),
    bodyClass: 'home',
    head: OLD_HASH + remember('mapa') + ld(person()),
    scripts: ['js/mapa.js'],
    body: `<h1 class="sr-only">${esc(site.title)}</h1>
${topBar({ root, path: '', view: 'mapa' })}

<main>
<section id="mapa" aria-hidden="true" data-mezcla="${site.mix ?? 50}">
<div class="world">
${pins.join('\n')}
</div>
</section>

<div class="zoom" aria-hidden="true">
<button type="button" data-step="-1" tabindex="-1">−</button>
<button type="button" data-step="1" tabindex="-1">+</button>
</div>
</main>`,
  });
}

function listPage(category, projects) {
  const root = viewRoot(category);
  const items = projects.filter((p) => p.category === category);
  return page({
    title: t(site.lists[category].name) || category,
    path: viewPath(category),
    root,
    vista: category,
    image: items[0].cover,
    og: mosaicOg(`og-${category}.jpg`, items),
    head: remember(category),
    scripts: ['js/lista.js'],
    body: `${topBar({ home: '../', root, path: viewPath(category), view: category })}

<main>
<section id="lista">
${list(root, '../', items)}
</section>
</main>`,
  });
}

function aboutPage(projects) {
  const root = viewRoot('about');
  return page({
    title: t(site.menu?.about) || 'about',
    path: viewPath('about'),
    root,
    vista: 'about',
    description: paras(t(about))[0],
    image: projects[0].cover,
    og: mosaicOg('og.jpg', projects),
    head: ld(person()),
    scripts: ['js/telar.js'],
    body: `${topBar({ home: '../', root, path: viewPath('about'), view: 'about' })}

<main>
<section id="about" data-colores="${attr(palette(projects))}">
<div>${tr(about, prose)}${contact()}</div>
</section>
</main>`,
  });
}

/* ── proyecto ────────────────────────────────────────────────────── */

/* Los créditos: una lista, un nombre (y su enlace) por persona; el rol,
   por idioma, o un texto si es igual en todos. Dos seguidos con el mismo
   rol lo comparten. */
function credits(list) {
  if (!list?.length) return '';
  const role = (c) => (typeof c.role === 'string' ? c.role : t(c.role)) || '';
  const rows = list.map((c, i) => {
    const name = c.url
      ? `<a href="${attr(c.url)}" target="_blank" rel="noopener">${esc(c.name || c.url)}</a>`
      : esc(c.name);
    return `${i && role(list[i - 1]) === role(c) ? '' : `<dt>${esc(role(c))}</dt>`}<dd>${name}</dd>`;
  });
  return `<dl class="credits">\n${rows.join('\n')}\n</dl>`;
}

/** El primer párrafo de la sinopsis, cortado para el meta description. */
function summary(text) {
  const first = (paras(text)[0] || '').replace(/\s+/g, ' ').trim();
  return first.length > 160 ? `${first.slice(0, 157).replace(/\s+\S*$/, '').replace(/[\s.,;:]+$/, '')}…` : first;
}

/* Los textos largos (el de un proyecto, el about) son una lista de párrafos; un
   texto suelto también vale, partido por las líneas en blanco. Un salto
   de línea dentro de un párrafo se queda. */
function paras(text) {
  return [].concat(text || []).flatMap((p) => p.split(/\n{2,}/)).filter((p) => p.trim());
}

const prose = (text) => paras(text).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n');

function projectPage(project) {
  const home = '../../';   // las páginas cuelgan de projects/<slug>/
  const root = home + (cur === lang ? '' : '../');
  const path = `projects/${project.slug}/`;

  const title = t(project.title) || project.slug;
  const description = summary(t(project.text));

  /* La primera foto se carga con prioridad; las demás, según hagan
     falta. Sin `alt` propio, el título del proyecto y el del grupo. */
  const gallery = project.groups.map(({ name, images }, g) =>
    `<section class="group">\n${name ? `<h2>${esc(name)}</h2>\n` : ''}`
    + images.map((image, i) =>
        `<figure>${img({ ...image, alt: [title, name].filter(Boolean).join(' — ') }, { base: root, cap: true, eager: g === 0 && i === 0 })}</figure>`
      ).join('\n')
    + '\n</section>'
  );

  return page({
    title,
    path,
    description,
    image: project.cover,
    og: projectOg(project),
    head: ld({
      '@type': 'CreativeWork',
      name: title,
      ...(description ? { description } : {}),
      url: abs(prefix(cur) + path),
      inLanguage: cur,
      genre: t(site.lists?.[project.category]?.name) || project.category,
      image: project.images.slice(0, 10).map((i) => abs(pub(i.src))),   // con unas pocas basta
      creator: person(),
    }),
    root,
    bodyClass: 'project',
    bodyStyle: `--c:${project.color}`,
    scripts: ['js/hilo.js'],
    body: `${topBar({ home, root, path })}

<main>
<article>
<div class="ficha">
<h1>${esc(title)}</h1>
${tr(project.text, prose)}
${credits(project.credits)}
</div>

${gallery.join('\n\n')}
</article>
</main>

<footer class="bar">
<a href="${attr(home + viewPath(project.category))}" class="back">${label('volver')}</a>
</footer>
<script>try { const v = sessionStorage.getItem('almarbra-vista'); if (v != null) document.querySelector('.back').href = '${home}' + v; } catch {}</script>`,
  });
}

/* La 404 la sirve el hosting en cualquier dirección que no exista, a
   cualquier profundidad: por eso sus enlaces parten de la raíz del sitio
   (la ruta de `url`, que en GitHub Pages es /almarbra/) y no de donde
   esté. */
function notFoundPage() {
  const base = new URL(site.url).pathname;
  return page({
    title: 'no encontrada',
    root: base,
    bodyClass: 'project',
    body: `${topBar({ home: base, root: base })}

<main>
<article>
<div class="ficha">
<h1>esta página no existe</h1>
<p><a href="${attr(base + viewPath(LISTS[0]))}">ver los proyectos</a></p>
</div>
</article>
</main>`,
  });
}

/* ── build ───────────────────────────────────────────────────────── */

const { projects, errors, warnings } = loadProjects(ROOT, site, read);

for (const project of projects) {
  if (!project.color) errors.push(`${project.slug}: no tiene color; añade uno a «colors» en data/site.json o ponle «color» en su project.json`);
}
if (!projects.length) errors.push('data/site.json: no hay proyectos en «lists»');
if (!(site.mix >= 0 && site.mix <= 100)) errors.push(`data/site.json: «mix» va de 0 a 100 y es ${JSON.stringify(site.mix)}`);
for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) fail(`${errors.join('\n  ')}\n\nNo se escribe nada hasta que se arregle.`);

/* ── escribir ────────────────────────────────────────────────────── */

/* Un build a la vez: con `npm run watch` en marcha (VS Code lo arranca
   solo), un build a mano vaciaría dist/ mientras el otro la llena. El
   segundo espera a que acabe el primero; un candado de hace más de un
   minuto es de un build que se cayó, y no cuenta. */
const LOCK = join(ROOT, '.cache', 'build.lock');
mkdirSync(dirname(LOCK), { recursive: true });
for (let tries = 0; ; tries++) {
  try { mkdirSync(LOCK); break; } catch {
    if (tries > 600 || Date.now() - statSync(LOCK).mtimeMs > 60_000) { rmSync(LOCK, { recursive: true, force: true }); continue; }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);   // 0,1 s
  }
}
process.on('exit', () => rmSync(LOCK, { recursive: true, force: true }));

/* Se vacía dist/ pero no se borra la carpeta: Live Server la está
   sirviendo (build/watch.mjs) y si desaparece deja de mirarla. */
mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(OUT)) rmSync(join(OUT, name), { recursive: true, force: true, maxRetries: 5 });
for (const d of ['css', 'js']) cpSync(join(ROOT, d), join(OUT, d), { recursive: true });
for (const f of ['_headers', 'favicon.svg']) cpSync(join(ROOT, f), join(OUT, f));
/* Las fotos de cada proyecto, sin su JSON, y las del mapa las copia
   después, al escribir la portada (`mini`). */
for (const p of projects) {
  cpSync(join(ROOT, 'projects', p.slug), join(OUT, 'media', p.slug), { recursive: true, filter: (f) => !f.endsWith('.json') });
}

const paths = [...VIEWS.map(viewPath), ...projects.map((p) => `projects/${p.slug}/`)];

for (const l of LANGS) {
  cur = l;
  const at = join(OUT, prefix(l));
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, 'index.html'), mapPage(projects));
  for (const view of [...LISTS, 'about']) {
    mkdirSync(join(at, view), { recursive: true });
    writeFileSync(join(at, view, 'index.html'), view === 'about' ? aboutPage(projects) : listPage(view, projects));
  }
  for (const project of projects) {
    mkdirSync(join(at, 'projects', project.slug), { recursive: true });
    writeFileSync(join(at, 'projects', project.slug, 'index.html'), projectPage(project));
  }
  console.log(`${prefix(l) || '/'}`.padEnd(8) + `mapa, ${LISTS.join(', ')}, about y ${projects.length} proyectos`);
}

/* Las fotos pequeñas del mapa, que `mini` ha dejado en .cache/mapa/. */
for (const p of projects) {
  const minis = join(ROOT, '.cache', 'mapa', p.slug);
  if (existsSync(minis)) cpSync(minis, join(OUT, 'media', p.slug, 'mapa'), { recursive: true });
}

cur = lang;
writeFileSync(join(OUT, '404.html'), notFoundPage());

writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${LANGS.flatMap((l) => paths.map((p) => `  <url><loc>${esc(abs(prefix(l) + p))}</loc>${
  LANGS.length > 1 ? LANGS.map((o) => `<xhtml:link rel="alternate" hreflang="${o}" href="${esc(abs(prefix(o) + p))}"/>`).join('') : ''
}</url>`)).join('\n')}
</urlset>
`);

writeFileSync(
  join(OUT, 'robots.txt'),
  site.noindex ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nSitemap: ${abs('sitemap.xml')}\n`
);

// GitHub Pages: servir los archivos tal cual, sin pasar por Jekyll
writeFileSync(join(OUT, '.nojekyll'), '');

console.log(`\n✓ dist/: ${paths.length} páginas × ${LANGS.length} idiomas, 404, sitemap y robots.`);
