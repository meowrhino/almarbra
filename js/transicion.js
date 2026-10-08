/* La transición: siempre que se cambia de página o de vista, la pantalla
   se tapa de blanco, se cambia y se destapa en la página nueva.

   Un barrido: una ola de píxeles de colores barre la pantalla en
   diagonal y la deja entera en blanco. Hace de pantalla de carga: se
   espera en blanco a que lo nuevo esté listo —la página montada y las
   fotos que se van a ver, ya llegadas— y entonces otra ola sigue en el
   mismo sentido y lo destapa. Baja al entrar en un proyecto, sube al
   volver, y entre las vistas va de lado.

   El sentido dice adónde se va:

     entrar en un proyecto     hacia delante
     volver de un proyecto     hacia atrás
     mapa · lista · about      hacia delante si vas a la de la derecha
                               del menú, hacia atrás si a la izquierda

   Los colores: los del proyecto si se entra o se sale de uno; si no, los
   de todos. Al cambiar de página, lo que falta (destapar) lo hace la
   página nueva: el sentido y los colores pasan por sessionStorage, y el
   <head> la tapa antes de pintar (build/build.mjs). Con atrás y
   adelante del navegador, también.

   Cada ola, la que tapa y la que destapa, con su frente: la línea por
   donde avanza —lo inclinada que va y cómo ondula— sale distinta cada
   vez.

   La usa js/mapa.js para mapa, lista y about (window.transicion).

   Aquí también entran las fotos: cada una aparece cuando ha llegado. */

(() => {
  const root = document.documentElement;
  const KEY = 'almarbra-transicion';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const TIME = 1.4;    // segundos en tapar, y otros tantos en destapar
  const HOLD = 250;    // ms en blanco, como mínimo, entre tapar y destapar
  const WAIT = 2500;   // ms que se espera, como mucho, a que lo nuevo esté listo
  const BAND = 5;      // píxeles de color en el frente de la ola
  const C = 12;        // lado de un píxel de la ola, en px

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const ctx = veil.getContext('2d');

  const colorOf = (el) => el.style.getPropertyValue('--c').trim();
  const allColors = () => [...new Set([...document.querySelectorAll('[style*="--c"]')].map(colorOf).filter(Boolean))];
  const pick = (colors) => colors[Math.floor(Math.random() * colors.length)];

  const bg = () => getComputedStyle(root).getPropertyValue('--bg');

  /* Dónde está una dirección: los proyectos, al fondo; en la portada, por
     el hash, en el orden del menú. */
  const ORDER = { mapa: 0, lista: 1, about: 2 };
  const place = (url) => (url.pathname.includes('/projects/')
    ? 'proyecto'
    : { '#about': 'about', '#lista': 'lista' }[url.hash] || 'mapa');

  /* De un sitio a otro: eje (para el barrido) y sentido. */
  function way(from, to) {
    if (from === 'proyecto' || to === 'proyecto') return { axis: 'y', sign: to === 'proyecto' ? 1 : -1 };
    return { axis: 'x', sign: ORDER[to] >= ORDER[from] ? 1 : -1 };
  }

  /* ── la ola ────────────────────────────────────────────────────────

     La pantalla en píxeles de C px, cada uno con su turno: la fila (o
     columna) que le toca en el sentido de la ola, más un retraso por
     línea que hace el frente: una inclinación, una onda larga y un
     temblor, los tres al azar en cada ola. El píxel se tapa
     de blanco cuando le llega el turno y se destapa igual; delante del
     frente, BAND píxeles de color. */

  function wave({ colors, dir, W, H }) {
    const along = Math.ceil((dir.axis === 'y' ? H : W) / C);
    const across = Math.ceil((dir.axis === 'y' ? W : H) / C);
    const tilt = 0.15 + Math.random() * 0.6;
    const swell = 2 + Math.random() * 6;
    const period = 4 + Math.random() * 14;
    const phase = Math.random() * 7;
    const lag = Array.from({ length: across }, (_, i) => (dir.sign > 0 ? i : across - 1 - i) * tilt
      + swell * Math.sin(i / period + phase) + Math.random() * 2);
    const low = Math.min(...lag);   // que empiece en el turno 0, sin píxeles ya tapados
    const cells = [];
    for (let y = 0; y < H; y += C) {
      for (let x = 0; x < W; x += C) {
        const [a, b] = dir.axis === 'y' ? [y, x] : [x, y];
        const step = Math.floor(a / C);
        cells.push({ x, y, key: (dir.sign > 0 ? step : along - 1 - step) + lag[Math.floor(b / C)] - low, tint: pick(colors) });
      }
    }
    return cells;
  }

  /* Un fotograma: cada píxel, tapado (blanco), en la ola (color) o abierto. */
  function paint(cells, front, cover, white) {
    const fills = new Map();
    const add = (color) => fills.get(color) || fills.set(color, new Path2D()).get(color);
    for (const c of cells) {
      const covered = cover ? c.key < front - BAND : c.key >= front;
      if (c.key >= front - BAND && c.key < front) add(c.tint).rect(c.x, c.y, C, C);
      else if (covered) add(white).rect(c.x, c.y, C, C);
    }
    for (const [color, p] of fills) { ctx.fillStyle = color; ctx.fill(p); }
  }

  /* ── tapar y destapar ─────────────────────────────────────────── */

  /* A tiempo, no a fotogramas: dura lo mismo en una pantalla de 60 Hz
     que en una de 120. */
  function play({ colors, dir, cover }) {
    const dpr = devicePixelRatio || 1;
    const W = innerWidth;
    const H = innerHeight;
    veil.width = W * dpr;
    veil.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    veil.style.opacity = 1;
    const white = bg();
    const cells = wave({ colors, dir, W, H });
    const end = Math.max(...cells.map((c) => c.key)) + BAND + 1;

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
        paint(cells, t * end, cover, white);
        if (t < 1) requestAnimationFrame(step);
        else {
          if (!cover) { ctx.clearRect(0, 0, W, H); veil.style.opacity = 0; }
          done();
        }
      };
      step();
    });
  }

  const cover = (colors, dir) => (still ? Promise.resolve() : play({ colors, dir, cover: true }));

  const wait = (ms) => new Promise((done) => setTimeout(done, ms));

  /* Lo que se espera en blanco: que la página esté montada (los demás
     scripts, que van detrás de este, ya han corrido) y que hayan llegado
     las fotos que quedan a la vista; como mucho WAIT. Y luego HOLD, para
     que el blanco se vea entero. */
  async function ready() {
    if (document.readyState === 'loading') await new Promise((done) => addEventListener('DOMContentLoaded', done, { once: true }));
    const seen = [...document.images].filter((img) => {
      if (img.complete) return false;
      const r = img.getBoundingClientRect();
      return r.width && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    });
    const arrived = seen.map((img) => new Promise((done) => {
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }));
    await Promise.race([Promise.all(arrived), wait(WAIT)]);
    await wait(HOLD);
  }

  /* Destapa cuando lo nuevo está listo. Bajo el blanco, el mapa no hace
     su entrada a pasos (css/style.css): ya está entero al destaparse. */
  async function uncover(colors, dir) {
    document.getElementById('mapa')?.classList.add('listo');
    if (!still) await ready();
    root.classList.remove('tapada');
    if (!still) await play({ colors, dir, cover: false });
  }

  /* Al llegar a una página tapada (el <head> pone .tapada): se destapa en
     el sentido en que se venía; con atrás o adelante, hacia atrás. */
  function arrive() {
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch { /* nada */ }
    if (!root.classList.contains('tapada')) return;
    const colors = pending?.colors?.length ? pending.colors : allColors();
    uncover(colors, pending?.dir || { axis: 'y', sign: -1 });
  }

  /* Los enlaces a otra página de la web: se tapa, se apunta lo que falta
     y se va. Los de la misma página (solo cambia el hash) los lleva
     js/mapa.js. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || still || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const to = new URL(a.href, location.href);
    if (to.origin !== location.origin) return;
    if (to.pathname === location.pathname && to.search === location.search) return;
    e.preventDefault();
    const own = colorOf(a) || colorOf(document.body);
    const colors = own ? [own] : allColors();
    const dir = way(place(new URL(location.href)), place(to));
    cover(colors, dir).then(() => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ colors, dir }));
      } catch { /* sin él, se destapa igual, con todos los colores y hacia atrás */ }
      location.href = to.href;
    });
  });

  /* Volver con atrás a una página que el navegador guardó tal cual: está
     tapada, se destapa hacia atrás. */
  addEventListener('pageshow', (e) => {
    if (e.persisted) uncover(allColors(), { axis: 'y', sign: -1 });
  });

  arrive();

  /* Y las fotos de la página: cada una aparece cuando ha llegado (.ok;
     el fundido y el orden, en css/style.css). Las que fallen, también:
     mejor el hueco que nada. */
  for (const img of document.images) {
    if (img.complete) img.classList.add('ok');
    else for (const type of ['load', 'error']) img.addEventListener(type, () => img.classList.add('ok'), { once: true });
  }

  window.transicion = { cover, uncover, way };
})();
