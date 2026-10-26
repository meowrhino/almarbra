/* El dibujo de la transición: lo que se ve al cambiar de página. El
   mecanismo —cuándo se tapa, cuánto se espera, atrás y adelante— es el
   de la casa, igual en todas las webs (js/transicion.js, que va detrás
   de este y usa window.dibujo). El loader del centro, en css/style.css.

   Un barrido: una ola de píxeles de colores barre la pantalla en
   diagonal y la deja entera en blanco. En blanco se espera a que lo
   nuevo esté listo, y entonces otra ola sigue en el mismo sentido y lo
   destapa. Baja al entrar en un proyecto, sube al volver, y entre las
   vistas va de lado.

   El sentido dice adónde se va:

     entrar en un proyecto     hacia delante
     volver de un proyecto     hacia atrás
     mapa · listas · about     hacia delante si vas a la de la derecha
                               del menú, hacia atrás si a la izquierda
     otro idioma               de lado, hacia delante

   Los colores: los del proyecto si se entra o se sale de uno; si no, los
   de todos.

   El loader (la espera en blanco, si pasa de medio segundo): un hilo en
   el centro, distinto cada vez (js/hilos.js), que se cose, se queda y se
   desteje por donde vino, y vuelta a empezar; de su color, o de unos
   pocos a puntadas. El de reserva, sin JavaScript, en css/style.css
   (`carga`). Cuando la página está lista el hilo acaba de destejerse y
   la ola que destapa nace en su punta.

   Cada sitio tiene su grano (LOOK): la ola que tapa lleva el del sitio
   del que se va, y la que destapa, el del que se llega.

   Cada ola, la que tapa y la que destapa, con su frente: la línea por
   donde avanza —lo inclinada que va y cómo se curva— sale distinta cada
   vez, y se mueve mientras avanza. */

(() => {
  const root = document.documentElement;

  const TIME = 1.9;    // segundos en tapar, y otros tantos en destapar

  /* El grano de cada sitio: el lado del píxel de la ola (c, en px) y
     cuántos píxeles de color lleva en el frente (band). Un proyecto,
     fino y con una banda ancha de su color; el mapa, grueso; diaris
     baja y sube como un feed; el about y contacto, de lado y fino. */
  const LOOK = {
    proyecto: { c: 4, band: 4 },
    mapa: { c: 8, band: 2 },
    diaris: { c: 6, band: 3, axis: 'y' },
    about: { c: 6, band: 1 },
    contacto: { c: 6, band: 1 },
  };
  const look = (at) => LOOK[at] || { c: 6, band: 2 };

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const ctx = veil.getContext('2d');

  const colorOf = (el) => el.style.getPropertyValue('--c').trim();
  /* Unos pocos colores de la lista, al azar: los del loader. */
  const few = (colors) => [...colors].sort(() => Math.random() - 0.5).slice(0, 4);
  /* El loader de reserva (CSS): de un color, o de unos pocos a tramos. */
  const carga = (colors) => (colors.length < 2 ? colors[0]
    : `linear-gradient(90deg, ${colors.map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`).join(', ')})`);
  /* Los de lo que hay a la vista; en el about, que no tiene, los de todos
     los proyectos (data-colores). */
  const allColors = () => [...new Set([...document.querySelectorAll('[style*="--c"]')].map(colorOf)
    .concat(JSON.parse(document.querySelector('[data-colores]')?.dataset.colores || '[]')).filter(Boolean))];
  const pick = (colors) => colors[Math.floor(Math.random() * colors.length)];

  const bg = () => getComputedStyle(root).getPropertyValue('--bg');

  /* La página de una dirección; en la vista previa (build/preview.mjs)
     va en ?p=. */
  const where = (url) => url.searchParams.get('p') || url.pathname;

  /* Dónde está una dirección: los proyectos (/textil/roma/), al fondo;
     las vistas (el mapa, las listas, diaris, el about), en el orden del
     menú, por la carpeta (/textil/, /en/about/…); la portada, el mapa. */
  const ORDER = [...document.querySelectorAll('.top nav [data-to]')].map((a) => a.dataset.to);
  const place = (url) => {
    const parts = where(url).split('/').filter((part) => part && part !== 'index.html');
    const at = parts.findIndex((part) => ORDER.includes(part));
    if (at >= 0 && parts[at + 1]) return 'proyecto';   // /textil/roma/: un proyecto de la lista
    return parts[at] || 'mapa';
  };

  /* De un sitio a otro: eje (para el barrido) y sentido. Al mismo sitio
     (otro idioma), de lado. */
  function way(from, to) {
    if (from === to) return { axis: 'x', sign: 1 };
    if (from === 'proyecto' || to === 'proyecto') return { axis: 'y', sign: to === 'proyecto' ? 1 : -1 };
    const sign = ORDER.indexOf(to) >= ORDER.indexOf(from) ? 1 : -1;
    return { axis: look(to).axis || look(from).axis || 'x', sign };
  }

  /* ── la ola ────────────────────────────────────────────────────────

     La pantalla en píxeles de C px, cada uno con su turno: la fila (o
     columna) que le toca en el sentido de la ola, más un retraso por
     línea que hace el frente. El píxel se tapa de blanco cuando le llega
     el turno y se destapa igual; delante del frente, BAND píxeles de
     color.

     El frente no es rígido: va de una línea suave a otra mientras avanza
     (las dos al azar, con algo de inclinación) y por encima le corre una
     onda corta, de un píxel, que lo hace moverse. */

  function line(along, across, sign, tilt) {
    /* Entre 3 y 7 puntos de lado a lado, cada uno más adelantado o más
       atrasado (de nada a un cuarto de la pantalla), unidos con curvas. */
    const depth = along * (0.04 + Math.random() * 0.22);
    const knots = Array.from({ length: 3 + Math.floor(Math.random() * 5) }, () => (Math.random() * 2 - 1) * depth);
    const curve = (u) => {   // u de 0 a 1, de un lado al otro
      const f = u * (knots.length - 1);
      const k = Math.min(knots.length - 2, Math.floor(f));
      const t = (1 - Math.cos((f - k) * Math.PI)) / 2;
      return knots[k] + (knots[k + 1] - knots[k]) * t;
    };
    return Array.from({ length: across }, (_, i) => (sign > 0 ? i : across - 1 - i) * tilt + curve(i / Math.max(1, across - 1)));
  }

  const RIPPLE = 1.2;   // lo que se mueve la onda corta, en píxeles de la ola

  /* Desde un punto (`at`, la punta del loader): el turno es lo que hay
     desde el punto, en el eje de la ola, hacia un lado o hacia el otro:
     una franja que crece. */
  function wave({ colors, dir, W, H, C, BAND, at }) {
    const L = dir.axis === 'y' ? H : W;
    const a0 = at && (dir.axis === 'y' ? at.y : at.x);
    const along = Math.ceil((at ? Math.max(a0, L - a0) : L) / C);
    const across = Math.ceil((dir.axis === 'y' ? W : H) / C);
    const tilt = Math.random() * 0.35;
    const from = line(along, across, dir.sign, tilt);
    const to = line(along, across, dir.sign, tilt);
    const [k, phase] = [2 + Math.random() * 4, Math.random() * 7];   // en redondo, ondas enteras
    const low = Math.min(...from, ...to) - RIPPLE;   // que empiece en el turno 0
    /* El retraso de cada línea en el momento t (de 0 a 1). */
    const lag = (t) => from.map((a, i) => a + (to[i] - a) * t
      + RIPPLE * Math.sin((i / across) * k * 2 * Math.PI + phase + t * 9) - low);
    const cells = [];
    for (let y = 0; y < H; y += C) {
      for (let x = 0; x < W; x += C) {
        const [a, b] = dir.axis === 'y' ? [y, x] : [x, y];
        let step = Math.floor((at ? Math.abs(a + C / 2 - a0) : a) / C);
        if (!at && dir.sign < 0) step = along - 1 - step;
        cells.push({ x, y, step, line: Math.floor(b / C), tint: pick(colors) });
      }
    }
    const end = along + Math.max(...from, ...to) + RIPPLE - low + BAND + 1;
    return { cells, lag, end };
  }

  /* Un fotograma: cada píxel, tapado (blanco), en la ola (color) o abierto. */
  function paint({ cells, lag, C, BAND }, t, front, cover, white) {
    const now = lag(t);
    const fills = new Map();
    const add = (color) => fills.get(color) || fills.set(color, new Path2D()).get(color);
    for (const c of cells) {
      const key = c.step + now[c.line];
      const covered = cover ? key < front - BAND : key >= front;
      if (key >= front - BAND && key < front) add(c.tint).rect(c.x, c.y, C, C);
      else if (covered) add(white).rect(c.x, c.y, C, C);
    }
    for (const [color, p] of fills) { ctx.fillStyle = color; ctx.fill(p); }
  }

  /* A tiempo, no a fotogramas: dura lo mismo en una pantalla de 60 Hz
     que en una de 120. */
  function play({ colors, dir, cover, at, C, BAND }) {
    const dpr = devicePixelRatio || 1;
    const W = innerWidth;
    const H = innerHeight;
    veil.width = W * dpr;
    veil.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    veil.style.opacity = 1;
    const white = bg();
    const ola = { ...wave({ colors: colors?.length ? colors : allColors(), dir, W, H, C, BAND, at }), C, BAND };

    /* Avanza a tramos de 1/30 s como mucho: si el navegador se atasca
       (montando el mapa, decodificando fotos), la ola se para y sigue, en
       vez de saltar hasta casi el final. */
    return new Promise((done) => {
      let t = 0;
      let last = performance.now();
      const step = (now = last) => {
        t = Math.min(1, t + Math.min(1 / 30, Math.max(0, now - last) / 1000) / TIME);
        last = now;
        ctx.clearRect(0, 0, W, H);
        paint(ola, t, t * ola.end, cover, white);
        if (t < 1) requestAnimationFrame(step);
        else {
          if (!cover) { ctx.clearRect(0, 0, W, H); veil.style.opacity = 0; }
          done();
        }
      };
      step();
    });
  }

  /* ── el loader ─────────────────────────────────────────────────────

     Sale cuando se espera en blanco (.cargando en la página vieja,
     .tapada en la nueva) si pasa de medio segundo, y se va al destapar.
     Un SVG fijo en el centro con un hilo que se cose (la punta avanza)
     y se desteje (la cola la sigue), y con cada vuelta, otro hilo. */

  const LW = 140;   // ancho del hilo del loader, en px
  const LH = 60;
  let loader = null;

  const NS = 'http://www.w3.org/2000/svg';

  /* Los colores a puntadas de 10 a 20 px: un degradado SVG a saltos,
     a lo ancho del hilo. */
  function stitches(grad, colors) {
    grad.replaceChildren();
    for (let x = 0; x < LW;) {
      const w = 10 + Math.random() * 10;
      const c = pick(colors);
      for (const at of [x, Math.min(LW, x + w)]) {
        const stop = document.createElementNS(NS, 'stop');
        stop.setAttribute('offset', `${(at / LW) * 100}%`);
        stop.setAttribute('stop-color', c);
        grad.append(stop);
      }
      x += w;
    }
  }

  function knit(colors) {
    if (loader || !colors.length) return;
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'carga');
    svg.setAttribute('viewBox', `0 0 ${LW} ${LH}`);
    svg.setAttribute('aria-hidden', 'true');
    const grad = document.createElementNS(NS, 'linearGradient');
    grad.id = 'puntadas';
    grad.setAttribute('gradientUnits', 'userSpaceOnUse');
    grad.setAttribute('x2', LW);
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('pathLength', '1');
    path.setAttribute('stroke', 'url(#puntadas)');
    svg.append(grad, path);
    document.body.append(svg);
    root.classList.add('hilado');
    const me = { svg, path, anim: null, tip: null, over: false };
    const turn = () => {
      if (me.over) return;
      const a = { x: 6, y: LH / 2 + (Math.random() - 0.5) * 24 };
      const b = { x: LW - 6, y: LH / 2 + (Math.random() - 0.5) * 24 };
      path.setAttribute('d', hilos.path(hilos.wander(a, b)));
      stitches(grad, colors);
      me.tip = b;
      me.anim = path.animate([
        { strokeDashoffset: 1 },
        { strokeDashoffset: 0, offset: 0.45 },
        { strokeDashoffset: 0, offset: 0.6 },
        { strokeDashoffset: -1 },
      ], { duration: 2200, easing: 'ease-in-out' });
      me.anim.onfinish = turn;
    };
    turn();
    loader = me;
  }

  /* El remate: el hilo acaba de destejerse, deprisa, y dice dónde queda
     su punta (en la pantalla), para que la ola nazca ahí. */
  async function unknit() {
    if (!loader) return null;
    const me = loader;
    loader = null;
    me.over = true;
    const now = Number(me.anim?.currentTime) || 0;
    me.anim?.cancel();
    const off = now < 990 ? 1 - now / 990 : now < 1320 ? 0 : -(now - 1320) / 880;
    await me.path.animate([{ strokeDashoffset: off }, { strokeDashoffset: -1 }], { duration: 300 * Math.max(0.2, 1 + off), easing: 'ease-in', fill: 'forwards' }).finished.catch(() => {});
    const r = me.svg.getBoundingClientRect();
    me.svg.remove();
    root.classList.remove('hilado');
    return { x: r.left + (me.tip.x / LW) * r.width, y: r.top + (me.tip.y / LH) * r.height };
  }

  /* Cuándo: a los 0,5 s de esperar, como el de reserva. En la página
     nueva, con los colores que dejó la de antes; en la vieja, los de
     la ola que acaba de tapar (`waiting`). */
  let waiting = null;
  const tick = () => setTimeout(() => {
    if (root.classList.contains('cargando') || root.classList.contains('tapada')) knit(few(waiting?.colors || allColors()));
  }, 500);
  new MutationObserver(() => { if (root.classList.contains('cargando')) tick(); }).observe(root, { attributeFilter: ['class'] });
  if (root.classList.contains('tapada')) {
    try { waiting = JSON.parse(sessionStorage.getItem('transicion')); } catch { /* los de la página */ }
    tick();
  }

  /* Una página que vuelve de la caché del navegador vuelve como se fue:
     tapada. Se limpia, para que la ola tape la foto de antes. */
  addEventListener('pageshow', (e) => { if (e.persisted) ctx.clearRect(0, 0, veil.width, veil.height); });

  window.dibujo = {
    /* Al pulsar un enlace, los colores del enlace o de la página (si es
       un proyecto). Con atrás y adelante, los del proyecto si se sale de
       uno o se entra; sin saber de dónde se viene, todos y hacia atrás. */
    datos(from, to, link) {
      let own = null;
      if (link) own = colorOf(link) || colorOf(document.body);
      else if (from) {
        const back = [...document.querySelectorAll('a[href][style*="--c"]')].find((a) => where(new URL(a.href)) === where(from));
        own = place(to) === 'proyecto' ? colorOf(document.body) : back && colorOf(back);
      }
      const colors = own ? [own] : allColors();
      const [here, there] = [from ? place(from) : null, place(to)];
      return {
        colors,
        dir: from ? way(here, there) : { axis: 'y', sign: -1 },
        carga: carga(few(colors)),
        de: look(here || there),   // el grano con que se tapa, y con que se destapa
        a: look(there),
      };
    },
    tapar: (datos) => { waiting = datos; return play({ ...datos, cover: true, C: datos.de.c, BAND: datos.de.band }); },
    destapar: async ({ colors, dir, a }) => play({ colors, dir, cover: false, at: await unknit(), C: a.c, BAND: a.band }),
  };
})();
