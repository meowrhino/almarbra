/* La transición: siempre que se cambia de página o de vista, la pantalla
   se tapa de blanco, se cambia y se destapa en la página nueva.

   La de por defecto, «barrido»: una ola de píxeles de colores barre la
   pantalla en diagonal y deja blanco detrás; en la página nueva otra ola
   sigue en el mismo sentido y la destapa. Baja al entrar en un proyecto,
   sube al volver, y entre las vistas va de lado.

   El sentido dice adónde se va:

     entrar en un proyecto     hacia delante
     volver de un proyecto     hacia atrás
     about · mapa · lista      hacia delante si vas a la de la derecha
                               del menú, hacia atrás si a la izquierda

   Los colores: los del proyecto si se entra o se sale de uno; si no, los
   de todos. Al cambiar de página, lo que falta (destapar) lo hace la
   página nueva: el sentido, los colores y el punto pasan por
   sessionStorage, y el <head> la tapa antes de pintar (build/build.mjs).
   Con atrás y adelante del navegador, también, desde el centro.

   PRUEBAS: cuatro maneras, la de data-transicion en <html> (el panel de
   js/pruebas.js):

     barrido   la ola en diagonal (la de por defecto)
     circulo   el blanco se abre en círculo desde el clic y en la página
               nueva se cierra hacia él; hacia atrás, al revés
     pixeles   se deshace en cuadrados, alguno de color, despacio
     lineas    líneas que salen de los bordes y van torciendo

   La usa js/mapa.js para mapa, lista y about (window.transicion).

   Aquí también entran las fotos: cada una aparece cuando ha llegado. */

(() => {
  const root = document.documentElement;
  const KEY = 'almarbra-transicion';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FRAMES = 28;   // fotogramas en tapar, y otros tantos en destapar
  const BAND = 5;      // píxeles de color en el frente de la ola

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const ctx = veil.getContext('2d');

  const colorOf = (el) => el.style.getPropertyValue('--c').trim();
  const allColors = () => [...new Set([...document.querySelectorAll('[style*="--c"]')].map(colorOf).filter(Boolean))];
  const pick = (colors, rnd = Math.random) => colors[Math.floor(rnd() * colors.length)];

  /* El azar de la transición sale de una semilla: con la misma semilla
     y la misma pantalla, el mismo dibujo. Así destapar parte justo de lo
     que dejó tapado la tapa —los mismos píxeles, del mismo color—, en
     esta página o en la siguiente (la semilla pasa por sessionStorage). */
  const seeded = (n) => () => {
    n = (n + 0x6d2b79f5) | 0;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let seed = 0;
  const bg = () => getComputedStyle(root).getPropertyValue('--bg');

  /* Dónde está una dirección: los proyectos, al fondo; en la portada, por
     el hash, en el orden del menú. */
  const ORDER = { about: 0, mapa: 1, lista: 2 };
  const place = (url) => (url.pathname.includes('/projects/')
    ? 'proyecto'
    : { '#about': 'about', '#lista': 'lista' }[url.hash] || 'mapa');

  /* De un sitio a otro: eje (para el barrido) y sentido. */
  function way(from, to) {
    if (from === 'proyecto' || to === 'proyecto') return { axis: 'y', sign: to === 'proyecto' ? 1 : -1 };
    return { axis: 'x', sign: ORDER[to] >= ORDER[from] ? 1 : -1 };
  }

  /* El último sitio donde se ha tocado la pantalla: de ahí sale la ola.
     Si hace rato, o no hay, del centro. */
  let touch = null;
  addEventListener('pointerdown', (e) => { touch = { x: e.clientX, y: e.clientY, t: Date.now() }; }, true);
  const origin = () => (touch && Date.now() - touch.t < 1500
    ? { x: touch.x, y: touch.y }
    : { x: innerWidth / 2, y: innerHeight / 2 });

  /* ── las maneras ───────────────────────────────────────────────────

     Casi todas son una rejilla de casillas, cada una con su turno
     (`key`): la casilla se tapa cuando le llega el turno y se destapa en
     el mismo orden, o en el contrario si la manera lleva `back` (el
     círculo: lo último en taparse es lo primero en verse, y el blanco se
     cierra). Las olas llevan delante BAND casillas de color. `frames`, si
     la manera va a otro ritmo. */

  function grid(C, W, H, key) {
    const cells = [];
    for (let y = 0; y < H; y += C) for (let x = 0; x < W; x += C) cells.push({ x, y, key: key(x + C / 2, y + C / 2) });
    return cells;
  }

  /* Distancia al punto, en casillas, con un temblor para que el círculo
     no salga de compás. */
  const ring = (o, C, wobble, rnd) => {
    const phase = rnd() * 6;
    return (x, y) => Math.hypot(x - o.x, y - o.y) / C
      + wobble * (Math.sin(Math.atan2(y - o.y, x - o.x) * 5 + phase) + rnd());
  };

  const STYLES = {
    circulo({ colors, dir, o, W, H, rnd }) {
      const C = 12;
      const far = Math.max(...[[0, 0], [W, 0], [0, H], [W, H]].map(([x, y]) => Math.hypot(x - o.x, y - o.y))) / C + 3;
      const dist = ring(o, C, 1, rnd);
      const cells = grid(C, W, H, (x, y) => (dir.sign > 0 ? dist(x, y) : far - dist(x, y)));
      for (const c of cells) c.tint = pick(colors, rnd);
      return { C, cells, band: BAND, back: true };
    },
    barrido({ colors, dir, W, H, rnd }) {
      const C = 12;
      const along = Math.ceil((dir.axis === 'y' ? H : W) / C);
      const across = Math.ceil((dir.axis === 'y' ? W : H) / C);
      const lag = Array.from({ length: across }, (_, i) => (dir.sign > 0 ? i : across - 1 - i) * 0.4 + rnd() * 3);
      const cells = grid(C, W, H, (x, y) => {
        const [a, b] = dir.axis === 'y' ? [y, x] : [x, y];
        const step = Math.floor(a / C);
        return (dir.sign > 0 ? step : along - 1 - step) + lag[Math.floor(b / C)];
      });
      for (const c of cells) c.tint = pick(colors, rnd);
      return { C, cells, band: BAND };
    },
    pixeles({ colors, W, H, rnd }) {
      const C = 24;
      const cells = grid(C, W, H, () => rnd());
      for (const c of cells) if (rnd() < 0.08) c.fill = pick(colors, rnd);
      return { C, cells, band: 0, frames: 70 };
    },
  };

  /* Un fotograma de una rejilla: cada casilla, tapada (blanco, o su color
     si lo tiene), en la ola (color) o abierta. `top` es el último turno:
     para destapar al revés, el turno se le resta. */
  function paint({ C, cells, band, back }, front, cover, top, white) {
    const fills = new Map();
    const add = (color) => fills.get(color) || fills.set(color, new Path2D()).get(color);
    for (const c of cells) {
      const k = !cover && back ? top - c.key : c.key;
      const covered = cover ? k < front - band : k >= front;
      const inBand = band && k >= front - band && k < front;
      if (inBand) add(c.tint).rect(c.x, c.y, C, C);
      else if (covered) add(c.fill || white).rect(c.x, c.y, C, C);
    }
    for (const [color, p] of fills) { ctx.fillStyle = color; ctx.fill(p); }
  }

  /* Las líneas no son rejilla: caminos que crecen, con la forma de los
     hilos (js/hilos.js), mientras el fondo se va poniendo blanco. Para
     destapar, se funde. */
  function lineas({ colors, W, H }) {
    const walkers = Array.from({ length: 60 }, () => {
      const side = Math.floor(Math.random() * 4);
      const x = side === 1 ? W : side === 3 ? 0 : Math.random() * W;
      const y = side === 2 ? H : side === 0 ? 0 : Math.random() * H;
      const angle = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 1.6;
      return { pts: [{ x, y }], angle, turn: (Math.random() - 0.5) * 0.08, color: pick(colors) };
    });
    ctx.lineWidth = 2;
    return (f) => {
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = f / FRAMES;
      ctx.fillStyle = bg();
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
      for (const w of walkers) {
        for (let k = 0; k < 6; k++) {
          const at = w.pts[w.pts.length - 1];
          w.turn += (Math.random() - 0.5) * 0.04;
          w.angle += w.turn / 2;
          w.pts.push({ x: at.x + Math.cos(w.angle) * 7, y: at.y + Math.sin(w.angle) * 7 });
        }
        ctx.strokeStyle = w.color;
        ctx.stroke(new Path2D(window.hilos ? hilos.path(w.pts) : w.pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join('')));
      }
    };
  }

  /* ── tapar y destapar ─────────────────────────────────────────── */

  const styleName = () => {
    const asked = new URLSearchParams(location.search).get('transicion') || root.dataset.transicion;
    return asked in STYLES || asked === 'lineas' ? asked : 'barrido';
  };

  let last = null;   // el punto de la última tapa, para destapar desde él

  function play({ colors, dir, o, cover }) {
    const dpr = devicePixelRatio || 1;
    const W = innerWidth;
    const H = innerHeight;
    veil.width = W * dpr;
    veil.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    veil.style.transition = 'none';
    veil.style.opacity = 1;
    const name = styleName();
    const white = bg();

    /* Las líneas destapan fundiéndose. */
    if (name === 'lineas' && !cover) {
      veil.style.transition = 'opacity .4s';
      veil.style.opacity = 0;
      return new Promise((done) => setTimeout(() => { ctx.clearRect(0, 0, W, H); done(); }, 400));
    }

    let frames = FRAMES;
    const frame = name === 'lineas'
      ? lineas({ colors, W, H })
      : (() => {
        const g = STYLES[name]({ colors, dir, o, W, H, rnd: seeded(seed) });
        frames = g.frames || FRAMES;
        const top = Math.max(...g.cells.map((c) => c.key));
        const end = top + g.band + 1;
        return (f) => {
          ctx.clearRect(0, 0, W, H);
          paint(g, (f / frames) * end, cover, top, white);
        };
      })();

    return new Promise((done) => {
      let f = 0;
      const step = () => {
        f += 1;
        frame(f);
        if (f < frames) requestAnimationFrame(step);
        else {
          if (!cover) { ctx.clearRect(0, 0, W, H); veil.style.opacity = 0; }
          done();
        }
      };
      step();
    });
  }

  function cover(colors, dir, o = origin()) {
    last = o;
    seed = Math.floor(Math.random() * 2 ** 31);
    return still ? Promise.resolve() : play({ colors, dir, o, cover: true });
  }

  function uncover(colors, dir, o = last || origin(), from = seed) {
    root.classList.remove('tapada');
    seed = from;
    return still ? Promise.resolve() : play({ colors, dir, o, cover: false });
  }

  /* Al llegar a una página tapada (el <head> pone .tapada): se destapa en
     el sentido en que se venía y desde el mismo punto; con atrás o
     adelante, hacia atrás y desde el centro. */
  function arrive() {
    let pending = null;
    try { pending = JSON.parse(sessionStorage.getItem(KEY)); sessionStorage.removeItem(KEY); } catch { /* nada */ }
    if (!root.classList.contains('tapada')) return;
    const colors = pending?.colors?.length ? pending.colors : allColors();
    const o = pending?.at
      ? { x: pending.at.x * innerWidth, y: pending.at.y * innerHeight }
      : { x: innerWidth / 2, y: innerHeight / 2 };
    uncover(colors, pending?.dir || { axis: 'y', sign: -1 }, o, pending?.seed ?? 0);
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
    /* Con teclado no hay punto: del centro del enlace. */
    const box = a.getBoundingClientRect();
    const o = e.detail ? { x: e.clientX, y: e.clientY } : { x: box.left + box.width / 2, y: box.top + box.height / 2 };
    cover(colors, dir, o).then(() => {
      try {
        sessionStorage.setItem(KEY, JSON.stringify({ colors, dir, seed, at: { x: o.x / innerWidth, y: o.y / innerHeight } }));
      } catch { /* sin él, se destapa igual, desde el centro */ }
      location.href = to.href;
    });
  });

  /* Volver con atrás a una página que el navegador guardó tal cual: está
     tapada, se destapa hacia atrás. */
  addEventListener('pageshow', (e) => {
    if (e.persisted) uncover(allColors(), { axis: 'y', sign: -1 }, { x: innerWidth / 2, y: innerHeight / 2 });
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
