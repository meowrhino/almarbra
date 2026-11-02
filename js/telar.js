/* El about (y contacto): detrás del texto, como en un telar: hilos de borde a borde, la
   trama en horizontal y la urdimbre en vertical, de los colores de los
   proyectos. Cada uno entra por un lado y se teje muy despacio (GROW
   s), se queda (HOLD), se desteje en el mismo sentido —la cola sigue a
   la punta— y, tras un respiro, vuelve a entrar en otro sitio. La forma
   no cambia: lo único que se mueve es la punta. Pocos a la vez
   (STRANDS) y sin pasar por el texto: nacen a un lado, y si la curva
   se mete en él, se tira otra. */

(() => {
  const root = document.documentElement;
  const about = document.getElementById('about') || document.getElementById('contacto');
  if (!about) return;
  const VISTA = about.id;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Los colores de los proyectos (data-colores, del build). */
  const palette = JSON.parse(about.dataset.colores || '[]');

  const STRANDS = 5;   // hilos a la vez
  const GROW = 40;     // s en tejerse, y otros tantos en destejerse
  const HOLD = 15;     // s que se queda entero
  const FPS = 24;      // va tan despacio que no pide más
  const back = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  back.setAttribute('class', 'fondo');
  back.setAttribute('aria-hidden', 'true');
  about.prepend(back);
  const text = about.querySelector('div');
  /* Lo que no se pisa: el texto, y en las franjas de arriba y abajo el
     nombre, el menú, el crédito y los idiomas; por el blanco entre
     ellos, sí se pasa. */
  const solid = [text, ...document.querySelectorAll('.top .name, .top nav, .credito, .idiomas')];

  const AIR = 24;   // px entre un hilo y las letras, como poco

  /* Un sitio libre en el eje: lo que queda entre las sombras de todo lo
     sólido (el texto y la foto, el nombre, el menú…) proyectadas en él,
     a suertes entre los huecos; si no queda ninguno, null. Devuelve el
     sitio y el margen que le queda hasta el borde del hueco. */
  function lane(weft, rects, all) {
    const taken = rects.map((r) => (weft ? [r.top - AIR, r.bottom + AIR] : [r.left - AIR, r.right + AIR])).sort((p, q) => p[0] - q[0]);
    const gaps = [];
    let at = 10;
    for (const [a, b] of taken) { if (a - at > 20) gaps.push([at, a]); at = Math.max(at, b); }
    if (all - 10 - at > 20) gaps.push([at, all - 10]);
    if (!gaps.length) return null;
    const [a, b] = gaps[Math.floor(Math.random() * gaps.length)];
    const spot = a + 10 + Math.random() * (b - a - 20);
    return [spot, Math.min(spot - a, b - spot)];
  }

  const hits = (p, r) => p.x > r.left - AIR && p.x < r.right + AIR && p.y > r.top - AIR && p.y < r.bottom + AIR;

  /* Una curva de lado a lado que no toque nada: hasta diez intentos; si
     no hay manera (el texto ocupa casi todo), null. */
  function strand(weft, W, H) {
    const rects = solid.map((el) => el.getBoundingClientRect());
    let pts = null;
    for (let i = 0; i < 10; i++) {
      const found = lane(weft, rects, weft ? H : W);
      if (!found) break;
      const [at, room] = found;
      const drift = (Math.random() - 0.5) * Math.min(120, room * 0.4);   // el otro extremo, un poco más allá
      let a;
      let b;
      if (weft) {
        [a, b] = [{ x: -10, y: at }, { x: W + 10, y: at + drift }];
      } else {
        [a, b] = [{ x: at, y: -10 }, { x: at + drift, y: H + 10 }];
      }
      const try_ = Math.random() < 0.5 ? hilos.wander(a, b, room) : hilos.wander(b, a, room);   // el sentido, como la lanzadera
      if (!try_.some((p) => rects.some((r) => hits(p, r)))) { pts = try_; break; }
    }
    return pts;
  }

  /* Una vida nueva: dirección, sitio, sentido y color. */
  function born(s, t) {
    const W = innerWidth;
    const H = innerHeight;
    /* Si en su eje no hay hueco (la foto y el texto llenan el alto), va
       por el otro; si tampoco, este turno no sale. */
    const pts = strand(s.weft, W, H) || strand(!s.weft, W, H);
    s.el.setAttribute('d', pts ? hilos.path(pts) : '');
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
    if (root.dataset.vista !== VISTA) { looming = false; return; }
    requestAnimationFrame(loom);
    if (document.hidden || now - last < 1000 / FPS) return;
    last = now;
    weave((now - start) / 1000);
  }

  function wake() {
    if (root.dataset.vista !== VISTA || looming) return;
    looming = true;
    requestAnimationFrame(loom);
  }
  new MutationObserver(wake).observe(root, { attributeFilter: ['data-vista'] });
  wake();
  /* ponytail: al cambiar el tamaño de la ventana, los que ya están se
     quedan con el de antes; los nuevos ya nacen con el nuevo. */

})();
