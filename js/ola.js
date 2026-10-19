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
   de todos. El primero es también el del loader (`carga`).

   Cada ola, la que tapa y la que destapa, con su frente: la línea por
   donde avanza —lo inclinada que va y cómo se curva— sale distinta cada
   vez, y se mueve mientras avanza. */

(() => {
  const root = document.documentElement;

  const TIME = 1.9;    // segundos en tapar, y otros tantos en destapar
  const BAND = 2;      // píxeles de color en el frente de la ola
  const C = 6;         // lado de un píxel de la ola, en px

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const ctx = veil.getContext('2d');

  const colorOf = (el) => el.style.getPropertyValue('--c').trim();
  /* Los de lo que hay a la vista; en el about, que no tiene, los de todos
     los proyectos (data-colores). */
  const allColors = () => [...new Set([...document.querySelectorAll('[style*="--c"]')].map(colorOf)
    .concat(JSON.parse(document.querySelector('[data-colores]')?.dataset.colores || '[]')).filter(Boolean))];
  const pick = (colors) => colors[Math.floor(Math.random() * colors.length)];

  const bg = () => getComputedStyle(root).getPropertyValue('--bg');

  /* La página de una dirección; en la vista previa (build/preview.mjs)
     va en ?p=. */
  const where = (url) => url.searchParams.get('p') || url.pathname;

  /* Dónde está una dirección: los proyectos, al fondo; las vistas (el
     mapa, las listas, el about), en el orden del menú, por la carpeta
     (/textil/, /en/about/…); la portada, el mapa. */
  const ORDER = [...document.querySelectorAll('.top nav [data-to]')].map((a) => a.dataset.to);
  const place = (url) => {
    if (where(url).includes('/projects/')) return 'proyecto';
    const parts = where(url).split('/');
    return ORDER.find((view) => parts.includes(view)) || 'mapa';
  };

  /* De un sitio a otro: eje (para el barrido) y sentido. Al mismo sitio
     (otro idioma), de lado. */
  function way(from, to) {
    if (from === to) return { axis: 'x', sign: 1 };
    if (from === 'proyecto' || to === 'proyecto') return { axis: 'y', sign: to === 'proyecto' ? 1 : -1 };
    return { axis: 'x', sign: ORDER.indexOf(to) >= ORDER.indexOf(from) ? 1 : -1 };
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

  function wave({ colors, dir, W, H }) {
    const along = Math.ceil((dir.axis === 'y' ? H : W) / C);
    const across = Math.ceil((dir.axis === 'y' ? W : H) / C);
    const tilt = Math.random() * 0.35;
    const from = line(along, across, dir.sign, tilt);
    const to = line(along, across, dir.sign, tilt);
    const [k, phase] = [2 + Math.random() * 4, Math.random() * 7];
    const low = Math.min(...from, ...to) - RIPPLE;   // que empiece en el turno 0
    /* El retraso de cada línea en el momento t (de 0 a 1). */
    const lag = (t) => from.map((a, i) => a + (to[i] - a) * t
      + RIPPLE * Math.sin((i / across) * k * 2 * Math.PI + phase + t * 9) - low);
    const cells = [];
    for (let y = 0; y < H; y += C) {
      for (let x = 0; x < W; x += C) {
        const [a, b] = dir.axis === 'y' ? [y, x] : [x, y];
        const step = Math.floor(a / C);
        cells.push({ x, y, step: dir.sign > 0 ? step : along - 1 - step, line: Math.floor(b / C), tint: pick(colors) });
      }
    }
    const end = along + Math.max(...from, ...to) + RIPPLE - low + BAND + 1;
    return { cells, lag, end };
  }

  /* Un fotograma: cada píxel, tapado (blanco), en la ola (color) o abierto. */
  function paint({ cells, lag }, t, front, cover, white) {
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
  function play({ colors, dir, cover }) {
    const dpr = devicePixelRatio || 1;
    const W = innerWidth;
    const H = innerHeight;
    veil.width = W * dpr;
    veil.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    veil.style.opacity = 1;
    const white = bg();
    const ola = wave({ colors: colors?.length ? colors : allColors(), dir, W, H });

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
      return { colors, dir: from ? way(place(from), place(to)) : { axis: 'y', sign: -1 }, carga: colors[0] };
    },
    tapar: ({ colors, dir }) => play({ colors, dir, cover: true }),
    destapar: ({ colors, dir }) => play({ colors, dir, cover: false }),
  };
})();
