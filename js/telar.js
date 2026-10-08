/* El about: detrás del texto, como en un telar: hilos de borde a borde, la
   trama en horizontal y la urdimbre en vertical, de los colores de los
   proyectos. Cada uno entra por un lado y se teje muy despacio (GROW
   s), se queda (HOLD), se desteje en el mismo sentido —la cola sigue a
   la punta— y, tras un respiro, vuelve a entrar en otro sitio. La forma
   no cambia: lo único que se mueve es la punta. Pocos a la vez
   (STRANDS) y sin pasar por el texto. */

(() => {
  const root = document.documentElement;
  const about = document.getElementById('about');
  if (!about) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Los colores de los proyectos, de la lista. */
  const palette = [...new Set([...document.querySelectorAll('#lista [style*="--c"]')].map((el) => el.style.getPropertyValue('--c')))];

  const STRANDS = 5;   // hilos a la vez
  const GROW = 40;     // s en tejerse, y otros tantos en destejerse
  const HOLD = 15;     // s que se queda entero
  const FPS = 24;      // va tan despacio que no pide más
  const back = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  back.setAttribute('class', 'fondo');
  back.setAttribute('aria-hidden', 'true');
  about.prepend(back);
  const text = about.querySelector('div');

  /* Un sitio libre en [from, to], o cualquiera si no queda hueco. */
  const lane = (from, to, all) => (to - from > 80 ? from + Math.random() * (to - from) : 40 + Math.random() * (all - 80));

  /* Una vida nueva: dirección, sitio, sentido y color. */
  function born(s, t) {
    const W = innerWidth;
    const H = innerHeight;
    const box = text.getBoundingClientRect();
    const ida = Math.random() < 0.5;   // el sentido, como la lanzadera
    let a;
    let b;
    if (s.weft) {
      const y = lane(box.bottom + 40, H - 40, H);
      [a, b] = [{ x: -10, y }, { x: W + 10, y: y + (Math.random() - 0.5) * 120 }];
    } else {
      const x = lane(box.right + 40, W - 40, W);
      [a, b] = [{ x, y: -10 }, { x: x + (Math.random() - 0.5) * 120, y: H + 10 }];
    }
    s.el.setAttribute('d', hilos.path(ida ? hilos.wander(a, b) : hilos.wander(b, a)));
    s.el.setAttribute('stroke', palette[Math.floor(Math.random() * palette.length)]);
    s.from = t;
    s.life = 2 * GROW + HOLD + 3 + Math.random() * 12;   // con el respiro del final
  }

  const strands = Array.from({ length: STRANDS }, (_, i) => {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('pathLength', '1');
    back.append(el);
    return { el, weft: i % 2 === 0, from: 0, life: -1 };
  });

  /* Cuánto se ve. El dash: positivo, se ve el principio; negativo, se
     ha ido la cola. */
  const ease = (x) => x * x * (3 - 2 * x);
  function dash(age) {
    if (still) return 0;
    if (age < GROW) return 1 - ease(age / GROW);
    if (age < GROW + HOLD) return 0;
    return -ease(Math.min(1, (age - GROW - HOLD) / GROW));
  }

  function weave(t) {
    strands.forEach((s, i) => {
      if (s.life < 0) {
        born(s, t);
        s.from = t - (i / STRANDS) * (GROW + HOLD);   // no todos a la vez
      } else if (t - s.from > s.life) born(s, t);
      s.el.style.strokeDashoffset = dash(t - s.from);
    });
  }

  /* El bucle solo corre con el about a la vista (data-vista, que pone
     js/mapa.js): el primer hilo nace al entrar, que antes el texto no
     tiene sitio. */
  const start = performance.now();
  let last = 0;
  let looming = false;
  function loom(now) {
    if (root.dataset.vista !== 'about') { looming = false; return; }
    requestAnimationFrame(loom);
    if (document.hidden || now - last < 1000 / FPS) return;
    last = now;
    weave((now - start) / 1000);
  }

  function wake() {
    if (root.dataset.vista !== 'about' || looming) return;
    looming = true;
    requestAnimationFrame(loom);
  }
  new MutationObserver(wake).observe(root, { attributeFilter: ['data-vista'] });
  wake();
  /* ponytail: al cambiar el tamaño de la ventana, los que ya están se
     quedan con el de antes; los nuevos ya nacen con el nuevo. */

})();
