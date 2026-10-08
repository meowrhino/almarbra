/* content/ + media/ -> dist/

   Dos plantillas y ya:

     dist/index.html                    portada: el mapa, la lista de
                                        proyectos y el about
     dist/projects/<slug>/index.html    ficha técnica y galería en scroll
                                        vertical

   Una vez por idioma: el del sitio en la raíz y los demás en su carpeta
   (dist/en/, dist/ca/…), cada página con sus hreflang.

   Más lo que pide un sitio estático: 404.html, sitemap.xml, robots.txt,
   .nojekyll, _headers y favicon.svg, y una copia de css/, js/, media/ y
   fonts/. dist/ no se commitea: lo publica la Action
   (.github/workflows/deploy.yml).

   Antes de escribir nada, valida: un JSON roto, una foto que no está o un
   `cover` que no es de ninguna foto paran el build con un mensaje, y la
   web publicada se queda como estaba.

   El sitio funciona entero sin JavaScript: sin él la portada es la
   lista. Con él: js/mapa.js monta el mapa y cambia de vista,
   js/transicion.js tapa y destapa al cambiar de página, js/hilos.js da
   la forma a los hilos (y aquí se importa para los de la lista) y
   js/hilo.js dibuja el de los proyectos.

     node build/build.mjs      (npm run build)

   Lo que se edita es content/:

     web.json        título, dirección, descripción, idiomas, orden de
                     categorías y colores
     about.json      el texto del about, por idioma
     textos.json     el menú y las categorías, por idioma
     mapa.json       la mezcla del mapa (0 por zonas, 100 revuelto)
     proyectos.json  cambios a mano por proyecto: título, nombre corto,
                     portada, color… (se aplican aquí y en la ingesta)

   content/projects/ y content/home.json los escribe la ingesta: no se
   tocan a mano. */

import { createHash } from 'node:crypto';
import {
  cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { WIDTHS, variant } from './formats.mjs';
import '../js/hilos.js';   // globalThis.hilos: la curva y la forma de los hilos, como en el navegador

const { hilos } = globalThis;

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const OUT = join(ROOT, 'dist');

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

/** Un JSON roto para el build diciendo cuál y dónde. */
function read(file) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  try { return JSON.parse(text); } catch (e) { fail(`${file} no es un JSON válido: ${e.message}`); }
}

const site = read('content/web.json');
if (!site.url) fail('falta "url" en content/web.json: la dirección donde se publica la web');
const about = read('content/about.json');
const textos = read('content/textos.json');
const mapa = read('content/mapa.json');
const changes = read('content/proyectos.json');

/* Las páginas se enlazan entre sí con rutas relativas; solo lo que se lee
   desde fuera —canonical, og:image, sitemap— y la 404 necesitan la
   dirección entera. */
const abs = (path) => new URL(path, site.url).href;
const lang = site.lang || 'es';

/* La foto de la portada no es de ningún proyecto: la ingesta la saca de
   originals/PORTADA/ y la deja aquí con sus medidas (ver
   build/ingest.mjs). */
const hero = read('content/home.json').hero;

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
const t = (field) => (field ? field[cur] || field[lang] || Object.values(field).find(Boolean) || null : null);

/** Lo mismo, ya pintado (por defecto, escapado). */
const tr = (field, render = esc) => {
  const value = t(field);
  return value == null ? '' : render(value);
};

/* ── imágenes ────────────────────────────────────────────────────── */

/* De cada foto hay varias anchuras en media/ (ver build/ingest.mjs). El
   srcset lista solo las que existen: de un original pequeño no se genera
   una variante más ancha que él. */
function srcset(image, base) {
  const found = WIDTHS
    .filter((w) => existsSync(join(ROOT, variant(image.src, w))))
    .map((w) => `${base}${variant(image.src, w)} ${w}w`);
  return found.length ? [...found, `${base}${image.src} ${image.w}w`].join(', ') : null;
}

/* `cap` limita la foto a su ancho real. Como la ingesta topa el lado
   largo a 2000 px, las verticales rondan los 1333 de ancho: sin este
   tope se ampliarían en pantallas grandes y se verían blandas. */
function img(image, { base = '', sizes = '100vw', eager = false, cap = false } = {}) {
  const set = srcset(image, base);
  return `<img src="${attr(base + image.src)}"${set ? ` srcset="${attr(set)}" sizes="${attr(sizes)}"` : ''}`
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
  else { vt?.skipTransition(); done(null); }
}, { once: true })) : Promise.resolve(null);
}</script>
`;

const LOCALES = { es: 'es_ES', en: 'en_GB', ca: 'ca_ES' };

/* La foto al compartir: la de media/og/<og>.jpg, 1200×630, si está
   (build/og.mjs, npm run og). Si no, la variante de 1400 px de `image`,
   que pesa mucho menos que la grande. */
const OG = existsSync(join(ROOT, 'media/og/og.json')) ? read('media/og/og.json') : {};

function shareImage(image, og) {
  if (og && existsSync(join(ROOT, `media/og/${og}.jpg`))) {
    return `<meta property="og:image" content="${attr(abs(`media/og/${og}.jpg`))}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
`;
  }
  const w = image.w > 1400 && existsSync(join(ROOT, variant(image.src, 1400))) ? 1400 : image.w;
  const src = w === image.w ? image.src : variant(image.src, w);
  return `<meta property="og:image" content="${attr(abs(src))}">
<meta property="og:image:width" content="${w}">
<meta property="og:image:height" content="${Math.round((image.h * w) / image.w)}">
`;
}

/* Datos para los buscadores (JSON-LD). `<` escapado, para que nada
   cierre el <script> antes de tiempo. */
const ld = (data) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...data }).replace(/</g, '\\u003c')}</script>\n`;

/* Quién es: va en la portada, y como autora en cada proyecto. «redes»
   en content/web.json, si las hay, van en sameAs. */
const person = () => ({
  '@type': 'Person',
  name: site.title,
  url: site.url,
  description: t(about)?.split(/\n{2,}/)[0] || t(site.description),
  ...(site.email ? { email: site.email } : {}),
  ...(site.redes?.length ? { sameAs: site.redes } : {}),
});

/* Al pie del about: el email y las redes de content/web.json. De
   Instagram sale @usuario; de lo demás, el nombre del sitio. */
function contact() {
  const handle = (url) => {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const user = u.pathname.split('/').filter(Boolean)[0];
    return host === 'instagram.com' && user ? `@${user}` : host.replace(/\.[a-z]+$/, '');
  };
  const links = [
    ...(site.email ? [`<a href="mailto:${attr(site.email)}">${esc(site.email)}</a>`] : []),
    ...(site.redes || []).map((url) => `<a href="${attr(url)}" target="_blank" rel="noopener me">${esc(handle(url))}</a>`),
  ];
  return links.length ? `\n<p class="contacto">${links.join('\n')}</p>` : '';
}

/* `path` es la dirección de la página dentro del sitio, sin el idioma
   ('' la portada, 'projects/roma/' un proyecto); sin ella no hay
   canonical, hreflang ni og, que es lo que pasa en la 404. `root` va de
   la página a la raíz del sitio, donde están css/, js/, media/ y
   fonts/. `image` (y `og`, su versión de media/og/) es la que sale al
   compartir el enlace. */
function page({ title, body, root = '', bodyClass = null, bodyStyle = null, scripts = [], path = null, description = null, image = null, og = null, head = '' }) {
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
<html lang="${attr(cur)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${attr(desc)}">
${share}${site.noindex || path === null ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="icon" href="${attr(root)}favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#ffffff">
<link rel="preload" href="${attr(root)}fonts/dm-mono-400.woff2" as="font" type="font/woff2" crossorigin>
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

/** La imagen que representa a un proyecto: `cover`, o la primera. */
const coverOf = (project) =>
  project.images.find((i) => i.src === project.cover) || project.images[0];

/* Al mapa van las fotos de la carpeta `home` de cada proyecto (ver
   build/ingest.mjs). Un proyecto que aún no la tiene manda su portada y
   unas cuantas más, repartidas a lo largo de su galería. */
const PER_PROJECT = 6;

function mapImages(project) {
  const home = project.images.filter((i) => i.home);
  if (home.length) return home;
  const cover = coverOf(project);
  const rest = project.images.filter((i) => i !== cover);
  const n = Math.min(PER_PROJECT - 1, rest.length);
  return [cover, ...Array.from({ length: n }, (_, k) => rest[Math.floor((k * rest.length) / n)])];
}

const pct = (v, of) => `${+((v / of) * 100).toFixed(2)}%`;
const meta = (project) => `${tr(textos.categorias?.[project.category]) || esc(project.category.replace(/-/g, ' '))} · ${project.images.length}`;

/* Una fila de la lista: una franja de proporción fija (1000×500) con la
   portada a un lado y, del centro de la foto al otro lado, un hilo de su
   color que acaba en el título. Todo va en coordenadas de la franja —el
   SVG, la foto y el título, en %—, así que el hilo llega a su sitio a
   cualquier ancho. Sale distinto en cada build. */
const ROW = { w: 1000, h: 500, side: 50 };

function listRow(root, project, i) {
  const cover = coverOf(project);
  let h = 400;
  let w = (h * cover.w) / cover.h;
  if (w > 520) { w = 520; h = (w * cover.h) / cover.w; }
  const flip = i % 2 === 1;
  const x = flip ? ROW.w - ROW.side - w : ROW.side;
  const y = (ROW.h - h) / 2;
  const end = { x: flip ? ROW.side + 10 : ROW.w - ROW.side - 10, y: ROW.h * (0.3 + Math.random() * 0.4) };

  /* Los extremos van también en data-ends, para que js/mapa.js lo vuelva
     a coser entre ellos al pasar por encima. */
  const pts = hilos.wander({ x: x + w / 2, y: y + h / 2 }, end);
  const ends = [pts[0], pts[pts.length - 1]].map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const edge = flip ? `left:${pct(ROW.side, ROW.w)}` : `right:${pct(ROW.side, ROW.w)}`;

  return `<li><a class="row${flip ? ' flip' : ''}" href="projects/${attr(project.slug)}/" style="--c:${attr(project.color)}">
<svg viewBox="0 0 ${ROW.w} ${ROW.h}" aria-hidden="true"><path pathLength="1" d="${hilos.path(pts)}" data-ends="${ends}"/></svg>
<div class="pic" style="left:${pct(x, ROW.w)};top:${pct(y, ROW.h)};width:${pct(w, ROW.w)}">${img(cover, { base: root, sizes: `${Math.round((w / ROW.w) * 100)}vw` })}</div>
<h2 style="${edge};top:${pct(end.y, ROW.h)}">${tr(project.title) || esc(project.slug)} <small>${meta(project)}</small></h2>
</a></li>`;
}

/** El menú de arriba, igual en todas las páginas. El nombre lleva
    siempre a la portada. A la derecha, mapa, lista y about, con lo que
    está puesto marcado (css/style.css). Abajo, la misma página en los
    otros idiomas. `home` va de la página a la portada de su idioma;
    `root`, a la raíz del sitio. */
function topBar({ home = '', root = '', path = null }) {
  const link = (to) => `<a href="${attr(home)}#${to}" data-to="${to}">${tr(textos.menu?.[to]) || to}</a>`;
  const langs = path !== null && LANGS.length > 1
    ? `<div class="idiomas">${LANGS.map((l) => `<a href="${attr(root + prefix(l) + path)}" hreflang="${l}" lang="${l}"${l === cur ? ' aria-current="true"' : ''}>${l}</a>`).join('')}</div>`
    : '';
  return `<header class="top">
<a href="${attr(home)}#mapa" class="name">${esc(site.title)}</a>
${langs}
<nav>
${link('mapa')}
${link('lista')}
${link('about')}
</nav>
</header>`;
}

/* La vista sale del hash (#mapa, #lista o #about) y se pone en <html> antes de
   pintar, para que no asome la otra. Sin JavaScript no se pone nada y
   el CSS enseña la lista. */
const VIEW_SCRIPT = `<script>document.documentElement.dataset.vista = { '#lista': 'lista', '#about': 'about' }[location.hash] || 'mapa'</script>
`;

function homePage(projects) {
  const root = cur === lang ? '' : '../';
  /* El mapa: las fotos de cada proyecto, sin posición. js/mapa.js las
     reparte en cada carga y las une con hilos del color del proyecto.
     Es solo para la vista: quien navega con teclado o lector de
     pantalla tiene la lista. */
  const pins = projects.flatMap((project, p) => mapImages(project).map((image, i) => {
    const long = [170, 120, 145][i % 3];   // de tres tamaños, para que no parezca una rejilla
    const width = Math.round((long * image.w) / Math.max(image.w, image.h));
    return `<a class="pin" href="projects/${attr(project.slug)}/" tabindex="-1" data-p="${p}" style="--c:${attr(project.color)};width:${width}px">`
      + img(image, { base: root, sizes: `${width * 2}px` })
      + `<span>${tr(project.short || project.title) || esc(project.slug)}</span></a>`;
  }));

  const rows = projects.map((project, i) => listRow(root, project, i));

  return page({
    title: null,
    path: '',
    root,
    image: hero,
    og: 'portada',
    bodyClass: 'home',
    head: VIEW_SCRIPT + ld(person()),
    scripts: ['js/mapa.js', 'js/telar.js'],
    body: `<h1 class="sr-only">${esc(site.title)}</h1>
${topBar({ root, path: '' })}

<main>
<section id="mapa" aria-hidden="true" data-mezcla="${mapa.mezcla ?? 50}">
<div class="world">
${pins.join('\n')}
</div>
</section>

<div class="zoom" aria-hidden="true">
<button type="button" data-step="-1" tabindex="-1">−</button>
<button type="button" data-step="1" tabindex="-1">+</button>
</div>

<section id="about">
<div>${tr(about, synopsis)}${contact()}</div>
</section>

<section id="lista">
<ol>
${rows.join('\n')}
</ol>
</section>
</main>`,
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

/** El primer párrafo de la sinopsis, cortado para el meta description. */
function summary(text) {
  const first = (text || '').split(/\n{2,}/)[0].replace(/\s+/g, ' ').trim();
  return first.length > 160 ? `${first.slice(0, 157).replace(/\s+\S*$/, '').replace(/[\s.,;:]+$/, '')}…` : first;
}

const synopsis = (text) =>
  text ? text.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n') : '';

/** Las fotos por grupo, en el orden del JSON. Sin grupos, una sola tanda. */
function groups(project) {
  if (!project.groups?.length) return [{ name: null, images: project.images }];

  const names = new Map(project.groups.map((g) => [g.slug, g.name]));
  const buckets = new Map();
  for (const image of project.images) {
    const key = image.group ?? '';
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(image);
  }

  return [...buckets].map(([key, images]) => ({
    name: key ? names.get(key) || key : null,
    images,
  }));
}

/* Las fotos del proyecto van en una columna de 800 px como mucho, con
   aire a los lados; por debajo de ahí ocupan el ancho que quede. El 800
   sale de `--col` en css/style.css: si cambia allí, cambia aquí. */
const GALLERY_SIZES = '(min-width: 896px) 800px, 100vw';

function projectPage(project) {
  const home = '../../';   // las páginas cuelgan de projects/<slug>/
  const root = home + (cur === lang ? '' : '../');
  const path = `projects/${project.slug}/`;

  const title = t(project.title) || project.slug;
  const description = summary(t(project.synopsis));

  /* La primera foto se carga con prioridad; las demás, según hagan
     falta. Sin `alt` propio, el título del proyecto y el del grupo. */
  const gallery = groups(project).map(({ name, images }, g) =>
    `<section class="group">\n${name ? `<h2>${esc(name)}</h2>\n` : ''}`
    + images.map((image, i) =>
        `<figure>${img({ ...image, alt: image.alt || [title, name].filter(Boolean).join(' — ') }, { base: root, sizes: GALLERY_SIZES, cap: true, eager: g === 0 && i === 0 })}</figure>`
      ).join('\n')
    + '\n</section>'
  );

  return page({
    title,
    path,
    description,
    image: coverOf(project),
    og: project.slug,
    head: ld({
      '@type': 'CreativeWork',
      name: title,
      ...(description ? { description } : {}),
      url: abs(prefix(cur) + path),
      inLanguage: cur,
      genre: t(textos.categorias?.[project.category]) || project.category,
      image: project.images.slice(0, 10).map((i) => abs(i.src)),   // con unas pocas basta
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
${tr(project.synopsis, synopsis)}
${tr(project.credits, credits)}
</div>

${gallery.join('\n\n')}
</article>
</main>

<footer class="bar">
<a href="${attr(home)}#lista" class="back">${tr(textos.menu?.volver) || 'back'}</a>
</footer>
<script>try { const v = sessionStorage.getItem('almarbra-vista'); if (v) document.querySelector('.back').hash = v; } catch {}</script>`,
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
<p><a href="${attr(base)}#lista">ver los proyectos</a></p>
</div>
</article>
</main>`,
  });
}

/* ── build ───────────────────────────────────────────────────────── */

const dir = join(ROOT, 'content', 'projects');
const order = site.order || [];
const rank = (category) => {
  const i = order.indexOf(category);
  return i < 0 ? order.length : i;
};

/* Los cambios a mano de content/proyectos.json, por encima del JSON de
   la ingesta: así cambiar un título o una portada no pide reingerir.
   Por claves; los textos por idioma se mezclan. `drop` y las notas (_)
   no: `drop` ya lo usó la ingesta. */
function applyChanges(project) {
  const out = { ...project };
  for (const [key, value] of Object.entries(changes[project.slug] || {})) {
    if (key.startsWith('_') || key === 'drop') continue;
    out[key] = value && !Array.isArray(value) && typeof value === 'object' ? { ...(out[key] || {}), ...value } : value;
  }
  return out;
}

const projects = readdirSync(dir)
  .filter((n) => n.endsWith('.json'))
  .map((n) => applyChanges(read(`content/projects/${n}`)))
  .sort((a, b) => rank(a.category) - rank(b.category)
    || a.category.localeCompare(b.category)
    || a.slug.localeCompare(b.slug));

/* Un color por proyecto: el suyo si lo tiene en content/proyectos.json,
   y si no el de content/web.json que le toque por orden. Si a alguno no
   le llega ninguno, el build para. */
const colors = site.colors || [];
projects.forEach((project, i) => { project.color ||= colors[i]; });

/* ── validar, antes de tocar dist/ ───────────────────────────────── */

const errors = [];
for (const project of projects) {
  if (!project.color) errors.push(`${project.slug}: no tiene color; añade uno a «colors» en content/web.json o ponle «color» en content/proyectos.json`);
}
if (!(mapa.mezcla >= 0 && mapa.mezcla <= 100)) errors.push(`content/mapa.json: «mezcla» va de 0 a 100 y es ${JSON.stringify(mapa.mezcla)}`);
const seen = new Set();
if (!existsSync(join(ROOT, hero.src))) errors.push(`no encuentro la foto de la portada: ${hero.src}`);
for (const project of projects) {
  if (seen.has(project.slug)) errors.push(`hay dos proyectos con el slug «${project.slug}»`);
  seen.add(project.slug);
  if (!project.images?.length) errors.push(`${project.slug}: no tiene fotos`);
  for (const image of project.images || []) {
    if (!existsSync(join(ROOT, image.src))) errors.push(`${project.slug}: no encuentro ${image.src}`);
  }
  if (project.cover && !project.images?.some((i) => i.src === project.cover)) {
    errors.push(`${project.slug}: el cover ${project.cover} no es ninguna de sus fotos (content/proyectos.json)`);
  }
}
if (errors.length) fail(`${errors.join('\n  ')}\n\nNo se escribe nada hasta que se arregle.`);

/* Las og:image (build/og.mjs) no paran el build: sin ellas se comparte la
   foto tal cual. Pero si falta alguna o la portada ha cambiado, se avisa. */
const stale = projects.filter((p) => OG[p.slug] !== coverOf(p).src).map((p) => p.slug);
if (stale.length) console.warn(`⚠ og:image que faltan o son de otra portada: ${stale.join(', ')}. Hazlas con npm run og.\n`);

/* ── escribir ────────────────────────────────────────────────────── */

/* Se vacía dist/ pero no se borra la carpeta: Live Server la está
   sirviendo (build/watch.mjs) y si desaparece deja de mirarla. */
mkdirSync(OUT, { recursive: true });
for (const name of readdirSync(OUT)) rmSync(join(OUT, name), { recursive: true, force: true, maxRetries: 5 });
for (const d of ['css', 'js', 'media', 'fonts']) cpSync(join(ROOT, d), join(OUT, d), { recursive: true });
for (const f of ['_headers', 'favicon.svg']) cpSync(join(ROOT, f), join(OUT, f));

const paths = ['', ...projects.map((p) => `projects/${p.slug}/`)];

for (const l of LANGS) {
  cur = l;
  const at = join(OUT, prefix(l));
  mkdirSync(at, { recursive: true });
  writeFileSync(join(at, 'index.html'), homePage(projects));
  for (const project of projects) {
    mkdirSync(join(at, 'projects', project.slug), { recursive: true });
    writeFileSync(join(at, 'projects', project.slug, 'index.html'), projectPage(project));
  }
  console.log(`${prefix(l) || '/'}`.padEnd(8) + `portada y ${projects.length} proyectos`);
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
