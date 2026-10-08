/* La transición: siempre que se cambia de página o de vista, una ola de
   píxeles de colores barre la pantalla y la deja en blanco; se cambia, y
   otra ola sigue en el mismo sentido y destapa lo nuevo. Como si la tela
   pasara por delante.

   El sentido dice hacia dónde se va:

     entrar en un proyecto     baja (de arriba abajo)
     volver de un proyecto     sube (al revés)
     about · mapa · lista      de lado, en el orden del menú: hacia la
                               derecha si vas a la de la derecha, y al
                               revés

   Los colores: los del proyecto si se entra o se sale de uno; si no, los
   de todos. Al cambiar de página, lo que falta (destapar) lo hace la
   página nueva: el sentido y los colores pasan por sessionStorage, y el
   <head> la tapa antes de pintar (build/build.mjs). Con atrás y adelante
   del navegador, también, al revés.

   La usa js/mapa.js para mapa, lista y about (window.transicion). */

(() => {
  const root = document.documentElement;
  const KEY = 'almarbra-transicion';
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const FRAMES = 28;   // fotogramas en tapar, y otros tantos en destapar
  const C = 12;        // lado de cada píxel
  const BAND = 5;      // píxeles de color en la ola

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const ctx = veil.getContext('2d');

  const colorOf = (el) => el.style.getPropertyValue('--c').trim();
  const allColors = () => [...new Set([...document.querySelectorAll('[style*="--c"]')].map(colorOf).filter(Boolean))];
  const pick = (colors) => colors[Math.floor(Math.random() * colors.length)];

  /* Dónde está una dirección: los proyectos, al fondo; en la portada, por
     el hash, en el orden del menú. */
  const ORDER = { about: 0, mapa: 1, lista: 2 };
  const place = (url) => (url.pathname.includes('/projects/')
    ? 'proyecto'
    : { '#about': 'about', '#lista': 'lista' }[url.hash] || 'mapa');

  /* De un sitio a otro: eje y sentido. */
  function way(from, to) {
    if (from === 'proyecto' || to === 'proyecto') return { axis: 'y', sign: to === 'proyecto' ? 1 : -1 };
    return { axis: 'x', sign: ORDER[to] >= ORDER[from] ? 1 : -1 };
  }

  /* La ola. `cover`: detrás de ella queda blanco. `!cover`: la pantalla
     empieza en blanco y detrás de la ola queda lo de debajo. Las líneas
     van de través al avance, cada una un poco más tarde que la anterior
     —por eso va en diagonal— y con algo de azar. */
  function play({ colors, axis, sign, cover }) {
    const dpr = devicePixelRatio || 1;
    const W = innerWidth;
    const H = innerHeight;
    veil.width = W * dpr;
    veil.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    veil.style.opacity = 1;

    const along = Math.ceil((axis === 'y' ? H : W) / C);   // píxeles en el sentido del avance
    const across = Math.ceil((axis === 'y' ? W : H) / C);
    const lines = Array.from({ length: across }, (_, i) => ({
      lag: (sign > 0 ? i : across - 1 - i) * 0.4 + Math.random() * 3,
      tint: Array.from({ length: BAND }, () => pick(colors)),
    }));
    const span = along + BAND + across * 0.4 + 3;
    const bg = getComputedStyle(root).getPropertyValue('--bg');

    /* Un tramo [a, b) de la línea i, en píxeles, ya del derecho. */
    const rect = (i, a, b) => {
      if (b <= a) return;
      const p = sign > 0 ? a : along - b;
      if (axis === 'y') ctx.fillRect(i * C, p * C, C, (b - a) * C);
      else ctx.fillRect(p * C, i * C, (b - a) * C, C);
    };

    return new Promise((done) => {
      let frame = 0;
      const step = () => {
        frame += 1;
        ctx.clearRect(0, 0, W, H);
        lines.forEach((line, i) => {
          const front = Math.floor((frame / FRAMES) * span - line.lag);
          const tail = Math.max(0, Math.min(along, front - BAND));
          ctx.fillStyle = bg;
          if (cover) rect(i, 0, tail);
          else rect(i, Math.max(0, Math.min(along, front)), along);
          for (let k = 0; k < BAND; k++) {
            const at = front - BAND + k;
            if (at < 0 || at >= along) continue;
            ctx.fillStyle = line.tint[k];
            rect(i, at, at + 1);
          }
        });
        if (frame < FRAMES) requestAnimationFrame(step);
        else {
          if (!cover) { ctx.clearRect(0, 0, W, H); veil.style.opacity = 0; }
          done();
        }
      };
      step();
    });
  }

  const cover = (colors, dir) => (still ? Promise.resolve() : play({ colors, ...dir, cover: true }));
  const uncover = (colors, dir) => {
    root.classList.remove('tapada');
    return still ? Promise.resolve() : play({ colors, ...dir, cover: false });
  };

  /* Al llegar a una página tapada (el <head> pone .tapada): se destapa en
     el sentido en que se venía; con atrás o adelante, hacia arriba. */
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
    const here = place(new URL(location.href));
    const there = place(to);
    const own = colorOf(a) || colorOf(document.body);
    const colors = own ? [own] : allColors();
    const dir = way(here, there);
    cover(colors, dir).then(() => {
      try { sessionStorage.setItem(KEY, JSON.stringify({ colors, dir })); } catch { /* sin él, se destapa igual */ }
      location.href = to.href;
    });
  });

  /* Volver con atrás a una página que el navegador guardó tal cual: está
     tapada, se destapa hacia arriba. */
  addEventListener('pageshow', (e) => {
    if (e.persisted) uncover(allColors(), { axis: 'y', sign: -1 });
  });

  arrive();

  window.transicion = { cover, uncover, way, colors: allColors };
})();
