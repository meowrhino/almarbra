/* Las plantillas de la web: los datos -> el HTML de cada página.

   Las usan dos:

     build/build.mjs     en Node, al publicar: escribe dist/
     build/preview.mjs   en el navegador, con Live Server: pinta la
                         página al vuelo, leyendo los JSON

   Por eso este archivo no toca el disco: lo que necesita de él (las
   fotos pequeñas del mapa, las og:image, el ?v= de cada archivo) se lo
   pasa quien lo llama, en sitio() (al final).

   Las páginas:

     index.html                    portada: el mapa
     <lista>/index.html            cada lista (textil/, foto/)
     diaris/index.html             las fotos de diaris/, barajadas
     about/index.html              el about
     contacto/index.html           la foto de contacto/, el email y las redes
     <lista>/<slug>/index.html     cada proyecto: ficha técnica y
                                   galería en scroll vertical

   Una vez por idioma: el del sitio en la raíz y los demás en su carpeta
   (en/, ca/…), cada página con sus hreflang. Y la 404. */

/* Lo de la web que se está pintando (ver sitio()). */
let site;
let about;
let preview;
let version;
let mini;
let projectOg;
let mosaicOg;
let lang;
let LANGS;
let LISTS;
let VIEWS;
let diaris;
let contactPhoto;

/* Las páginas se enlazan entre sí con rutas relativas; solo lo que se lee
   desde fuera —canonical, og:image, sitemap— y la 404 necesitan la
   dirección entera (`url`, que pone el build: la de GitHub Pages o el
   dominio); sin ella, desde la raíz. */
export const abs = (path) => (site.url ? new URL(path, site.url).href : `/${path}`);

/** Escapa lo que va al documento; en atributos, también las comillas. */
export const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (v) => esc(v).replace(/"/g, '&quot;');

/* Los idiomas. Cada página sale una vez por idioma: el del sitio en la
   raíz y los demás en su carpeta (en/, ca/). `cur` es el de la página
   que se está pintando (ver render(), abajo). */
let cur;
export const prefix = (l) => (l === lang ? '' : `${l}/`);

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

/* Las fotos viven en <lista>/<slug>/img/ junto a su project.json, y en la
   web se sirven desde media/<slug>/ (ahí las copia el build), aparte de
   las páginas: así _headers les da su caché larga sin tocar el HTML. En
   la vista previa, donde están. */
const pub = (src) => (preview ? src : `media/${src}`);

/* De cada foto hay una sola, la de imgToWeb (2000 px de lado largo).
   El mapa, que las enseña pequeñas y a docenas, usa las suyas: las hace
   el build (build/build.mjs, `mini`). La clienta solo sube las grandes.

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

/* Lo que tiene que estar en <html> antes de pintar, para que no asome
   nada que no toca:

     .js           hay JavaScript: las fotos esperan a haber llegado para
                   aparecer (css/style.css)
     .tapada       se llega desde otra página de la web, o con atrás y
                   adelante: la página nace tapada para que la transición
                   la destape (js/transicion.js); si ese script no llegara,
                   el CSS la destapa sola a los 5 s (css/transicion.css)
     .tapando      con atrás y adelante, mientras la ola tapa la foto que
                   el navegador guarda de la página de antes (una View
                   Transition): la página nueva, transparente salvo la ola.
                   window.revelada dice si la hay (js/transicion.js)

   Es el de la transición de la casa, igual en todas las webs (salvo .js,
   de almarbra). En la vista previa la página se pinta cuando el
   navegador ya ha revelado index.html: no hay View Transition que
   esperar. */
const headScript = () => `<script>{
const html = document.documentElement;
html.classList.add('js');
let back = false;
try {
  const d = JSON.parse(sessionStorage.getItem('transicion'));
  back = !d && performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  if (d?.carga) html.style.setProperty('--carga', d.carga);   // el color del loader, del dibujo
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && (back || d)) html.classList.add('tapada');
} catch {}
window.revelada = ${preview ? 'false' : "'onpagereveal' in window"} ? new Promise((done) => addEventListener('pagereveal', (e) => {
  const vt = e.viewTransition;
  if (vt && back && html.classList.contains('tapada')) { html.classList.add('tapando'); done(vt); }
  else { vt?.ready.catch(() => {}); vt?.skipTransition(); done(null); }   // saltarla rechaza ready: sin error en la consola
}, { once: true })) : Promise.resolve(null);
}</script>
`;

export const OG_W = 1200;
export const OG_H = 630;

const LOCALES = { es: 'es_ES', en: 'en_GB', ca: 'ca_ES' };

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

/* Quién es: va en la portada, y como autora en cada proyecto. El
   Instagram y las redes de data/site.json, si las hay, van en sameAs. */
const ig = () => site.instagram?.replace(/^@/, '');
const socials = () => [...(ig() ? [`https://www.instagram.com/${ig()}/`] : []), ...(site.social || [])];
const person = () => ({
  '@type': 'Person',
  name: site.title,
  ...(site.url ? { url: site.url } : {}),
  description: paras(t(about))[0] || t(site.description),
  ...(site.email ? { email: site.email } : {}),
  ...(socials().length ? { sameAs: socials() } : {}),
});

/* En contacto: el email, el Instagram y las redes de data/site.json (de
   Instagram sale @usuario; de lo demás, el nombre del sitio). */
function contact() {
  const handle = (url) => {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const user = u.pathname.split('/').filter(Boolean)[0];
    return host === 'instagram.com' && user ? `@${user}` : host.replace(/\.[a-z]+$/, '');
  };
  const links = [
    ...(site.email ? [`<a href="mailto:${attr(site.email)}">${esc(site.email)}</a>`] : []),
    ...socials().map((url) => `<a href="${attr(url)}" target="_blank" rel="noopener me">${esc(handle(url))}</a>`),
  ];
  return links.length ? `\n<p class="contacto">${links.join('\n')}</p>` : '';
}

/* `path` es la dirección de la página dentro del sitio, sin el idioma
   ('' la portada, 'textil/roma/' un proyecto); sin ella no hay
   canonical, hreflang ni og, que es lo que pasa en la 404. `root` va de
   la página a la raíz del sitio, donde están css/, js/ y media/. `image` (y `og`, su versión de 1200×630, ya en dist/) es la que sale al
   compartir el enlace. */
function page({ title, body, root = '', vista = null, bodyClass = null, bodyStyle = null, scripts = [], path = null, description = null, image = null, og = null, head = '', noindex = false }) {
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
${share}${site.noindex || noindex || path === null ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="icon" href="${attr(root)}favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#ffffff">
<link rel="stylesheet" href="${attr(root)}css/transicion.css${version('css/transicion.css')}">
<link rel="stylesheet" href="${attr(root)}css/style.css${version('css/style.css')}">
${headScript()}${head}</head>
<body${bodyClass ? ` class="${attr(bodyClass)}"` : ''}${bodyStyle ? ` style="${attr(bodyStyle)}"` : ''}>
${body}
${['js/hilos.js', 'js/ola.js', 'js/transicion.js', ...scripts].map((s) => `<script src="${attr(root)}${s}${version(s)}" defer></script>`).join('\n')}
</body>
</html>
`;
}

/* ── portada ─────────────────────────────────────────────────────── */

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
   debajo, el siguiente a la derecha y más abajo, y así: cada uno en su
   fila de la rejilla, sin solaparse (css/style.css). Las verticales, más
   estrechas que las apaisadas, para que no se coman la pantalla. */
function listItem(root, home, project, i) {
  const { cover } = project;
  const width = cover.h > cover.w ? 70 : 100;
  return `<li style="grid-row:${i + 1}"><a class="row" href="${attr(home)}${attr(project.dir)}/" style="--c:${attr(project.color)}">
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
const viewPath = (view) => (view === 'mapa' ? '' : `${view}/`);
/* El nombre de una vista en el menú: el de su lista, o el de «menu»
   (las vistas mapa y about, y el back de los proyectos). */
const MENU = { mapa: 'map', diaris: 'diaris', about: 'about', contacto: 'contact', volver: 'back' };
const label = (view) => tr(site.lists?.[view]?.name || site.menu?.[MENU[view]]) || esc(view.replace(/-/g, ' '));

/** El menú de arriba, igual en todas las páginas. El nombre lleva
    siempre a la portada. A la derecha, mapa, las listas y about, con la
    que está puesta marcada (aria-current). Abajo, la misma página en los
    otros idiomas. `home` va de la página a la portada de su idioma;
    `root`, a la raíz del sitio. */
function topBar({ home = '', root = '', path = null, view = null }) {
  const link = (to) => `<a href="${attr(home + viewPath(to))}" data-to="${attr(to)}"${to === view ? ' aria-current="page"' : ''}>${label(to)}</a>`;
  const langs = path !== null && LANGS.length > 1
    ? `<div class="idiomas">${LANGS.map((l) => `<a href="${attr(preview ? `?p=/${prefix(l)}${path}` : root + prefix(l) + path)}" hreflang="${l}" lang="${l}"${l === cur ? ' aria-current="true"' : ''}>${l}</a>`).join('')}</div>`
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
const oldHash = () => (preview ? '' : `<script>{ const v = location.hash.slice(1); if (${JSON.stringify(VIEWS)}.includes(v) && v !== 'mapa') location.replace(v + '/') }</script>\n`);

/* De la página de una vista: '' en el idioma del sitio, '../' en los demás,
   y un '../' más si no es la portada. En la vista previa todas las
   páginas son index.html?p=…: la raíz está al lado y los enlaces van a
   ?p= (`homeOf`). */
const viewRoot = (view) => (preview ? '' : (view === 'mapa' ? '' : '../') + (cur === lang ? '' : '../'));
const homeOf = (home) => (preview ? `?p=/${prefix(cur)}` : home);

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
    return `<a class="pin" href="${attr(homeOf(''))}${attr(project.dir)}/" tabindex="-1" data-p="${p}" style="--c:${attr(project.color)};width:${width}px">`
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
    head: oldHash() + remember('mapa') + ld(person()),
    scripts: ['js/mapa.js'],
    body: `<h1 class="sr-only">${esc(site.title)}</h1>
${topBar({ home: homeOf(''), root, path: '', view: 'mapa' })}

<main>
<section id="mapa" aria-hidden="true" data-mezcla="${site.mix ?? 50}">
<div class="world">
${pins.join('\n')}
</div>
</section>

<div class="zoom" aria-hidden="true">
<button type="button" data-step="-1" tabindex="-1">−</button>
<input class="nivel" value="70%" inputmode="numeric" maxlength="4" tabindex="-1" aria-label="zoom">
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
    body: `${topBar({ home: homeOf('../'), root, path: viewPath(category), view: category })}

<main>
<section id="lista">
${list(root, homeOf('../'), items)}
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
    body: `${topBar({ home: homeOf('../'), root, path: viewPath('about'), view: 'about' })}

<main>
<section id="about" data-colores="${attr(palette(projects))}">
<div>${tr(about, prose)}</div>
<p class="credito">web: <a href="https://meowrhino.studio" target="_blank" rel="noopener">meowrhino</a></p>
</section>
</main>`,
  });
}

/* Diaris: las fotos de diaris/ en columnas, como un tumblr, barajadas
   en cada visita (sin JavaScript, en su orden). Cada hueco, con la trama
   de un color de los proyectos mientras llega su foto. */
/* Contacto: como el about pero en el centro y más pequeño: la foto de
   contacto/ (1.webp, si está) y debajo el email y las redes. Detrás, el
   mismo telar (js/telar.js). */
function contactPage(projects) {
  const root = viewRoot('contacto');
  const name = t(site.menu?.contact) || 'contacto';
  return page({
    title: name,
    path: viewPath('contacto'),
    root,
    vista: 'contacto',
    image: contactPhoto || projects[0].cover,
    og: contactPhoto ? null : mosaicOg('og.jpg', projects),
    head: ld(person()),
    scripts: ['js/telar.js'],
    body: `${topBar({ home: homeOf('../'), root, path: viewPath('contacto'), view: 'contacto' })}

<main>
<section id="contacto" data-colores="${attr(palette(projects))}">
<h1 class="sr-only">${esc(name)}</h1>
<div>${contactPhoto ? `<figure>${img({ ...contactPhoto, alt: site.title }, { base: root, eager: true })}</figure>` : ''}${contact()}</div>
</section>
</main>`,
  });
}

function diarisPage(projects) {
  const root = viewRoot('diaris');
  const colors = [...new Set(projects.map((p) => p.color))];
  const name = t(site.menu?.diaris) || 'diaris';
  return page({
    title: name,
    path: viewPath('diaris'),
    root,
    vista: 'diaris',
    image: diaris[0],
    og: mosaicOg('og-diaris.jpg', diaris.map((image) => ({ cover: image }))),
    body: `${topBar({ home: homeOf('../'), root, path: viewPath('diaris'), view: 'diaris' })}

<main>
<section id="diaris">
<h1 class="sr-only">${esc(name)}</h1>
<ul>
${diaris.map((image, i) => `<li style="--c:${attr(colors[i % colors.length])}">${img({ ...image, alt: name }, { base: root })}</li>`).join('\n')}
</ul>
<script>{ const ul = document.currentScript.previousElementSibling; for (let i = ul.children.length; i > 1; i--) ul.append(ul.children[Math.floor(Math.random() * i)]); }</script>
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
  const home = homeOf('../../');   // las páginas cuelgan de <lista>/<slug>/
  const root = preview ? '' : `../../${cur === lang ? '' : '../'}`;
  const path = `${project.dir}/`;

  const title = t(project.title) || project.slug;
  const description = t(project.description) || summary(t(project.text));

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
    noindex: project.hidden,   // oculto: tiene su página, pero no sale en Google
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
<h1>${esc(title).split(/(?<=,) /).map((part) => `<span>${part}</span>`).join(' ')}</h1>
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
  const base = site.url ? new URL(site.url).pathname : '/';
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

/* ── la web ──────────────────────────────────────────────────────── */

/**
 * La web con sus datos. Lo que pasa quien llama:
 *
 *   site, about           data/site.json y data/about.json
 *   projects              los proyectos, ya leídos (build/proyectos.mjs)
 *   diaris                las fotos de diaris/ (loadDiaris)
 *   contactPhoto          la foto de contacto/1.webp, o null
 *   preview               true en la vista previa: las fotos, donde
 *                         están, y los enlaces, a index.html?p=/ruta/
 *   version(file)         el ?v=<hash> de un archivo de css/ o js/
 *   mini(image)           la foto pequeña del mapa
 *   projectOg(project),   la og:image de 1200×630 de un proyecto o de
 *   mosaicOg(out, list)   una vista, ya en dist/; o null
 *
 * Devuelve las direcciones (`paths`, sin el idioma: '', 'textil/',
 * 'textil/roma/'…; `listed`, las mismas sin los ocultos, para el
 * sitemap) y render(l, path), el HTML de una en el idioma `l`.
 */
export function sitio(opts) {
  ({ site, about } = opts);
  preview = Boolean(opts.preview);
  version = opts.version || (() => '');
  mini = opts.mini || ((image) => image);
  projectOg = opts.projectOg || (() => null);
  mosaicOg = opts.mosaicOg || (() => null);
  lang = site.lang || 'es';
  LANGS = site.langs || [lang];
  LISTS = Object.keys(site.lists || {});
  diaris = opts.diaris || [];
  contactPhoto = opts.contactPhoto || null;
  VIEWS = ['mapa', ...LISTS, ...(diaris.length ? ['diaris'] : []), 'about', 'contacto'];
  cur = lang;

  /* Los ocultos («visible»: false en la lista) tienen su página, pero no
     salen en el mapa, en las listas, en el about ni en el sitemap. */
  const { projects } = opts;
  const shown = projects.filter((p) => !p.hidden);
  const paths = [...VIEWS.map(viewPath), ...projects.map((p) => `${p.dir}/`)];
  const listed = paths.filter((path) => !projects.some((p) => p.hidden && path === `${p.dir}/`));

  function render(l, path) {
    cur = l;
    if (path === '') return mapPage(shown);
    if (path === 'about/') return aboutPage(shown);
    if (path === 'diaris/' && diaris.length) return diarisPage(shown);
    if (path === 'contacto/') return contactPage(shown);
    const list = LISTS.find((view) => path === viewPath(view));
    if (list) return listPage(list, shown);
    const project = projects.find((p) => path === `${p.dir}/`);
    return project ? projectPage(project) : null;
  }

  const notFound = () => { cur = lang; return notFoundPage(); };

  return { lang, LANGS, LISTS, paths, listed, render, notFound };
}
