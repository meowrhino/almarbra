/* El hilo de la página de un proyecto, de su color.

   Baja por la página ondulando de lado a lado y se inventa según avanza:
   la punta apunta a un sitio del otro lado y, cuando llega, elige otro.
   Cada vez cambia lo lejos que cruza (de un poco a todo el ancho) y lo
   que baja hasta allí (DROP: una curva cerrada o una barrida larga), así
   que no sale una onda igual a otra. Y tiembla, como los hilos del mapa.
   La forma, a escalones de píxel, la pone js/hilos.js.

   Solo hay hilo en la pantalla: lo que se sale (KEEP px más allá) se
   borra, y al volver se teje otro. Se teje desde donde estás hacia
   donde vas, con dos puntas, una abajo y otra arriba: deprisa hasta el
   85 % de la pantalla (EDGE) —a CHASE del scroll, o a CALM si no hay—
   y el último trozo, hasta el borde, más despacio (SLOW). Al abrir la
   página, la primera pantalla va mucho más deprisa (OPEN).

   Va dos veces: una debajo de las fotos y el texto, entera, y otra
   encima, apagada (css/style.css). */

(() => {
  const root = document.documentElement;
  if (!document.querySelector('.project article')) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const OPEN = 1400;  // px de hilo por segundo, la primera pantalla
  const CALM = 220;   // px de hilo por segundo, sin scroll
  const SLOW = 70;    // px de hilo por segundo, en el último trozo
  const CHASE = 1.5;  // px de hilo por px de scroll: con menos de ~1,3 se queda atrás
  const EDGE = 0.85;  // hasta dónde de la pantalla va deprisa
  const KEEP = 120;   // px de hilo que se guardan fuera de la pantalla
  const STEP = 3;     // px de hilo entre punto y punto
  const DROP = [140, 620];   // lo que baja cada curva, en px, de tanto a tanto
  const SIDE = 24;    // lo más cerca del borde que llega

  const layer = (name) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `hilo ${name}`);
    svg.setAttribute('aria-hidden', 'true');
    svg.append(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
    document.body.prepend(svg);
    return svg;
  };
  const layers = [layer('debajo'), layer('encima')];

  let W = root.clientWidth;
  const ph = Math.random() * 7;   // el temblor, el mismo en las dos puntas

  /* Los puntos, de arriba a abajo. Cada uno guarda por dónde iba la
     punta (bx, sin temblor; turn, el rumbo hacia abajo; run, el largo),
     para que una punta pueda salir de él cuando se borra lo de más allá. */
  let pts = [];
  let down = null;
  let up = null;

  /* Un sitio al que ir: al otro lado —a veces cerca, a veces al otro
     borde— y más abajo (o más arriba, la punta de subir). */
  function aim(h) {
    const far = 0.3 + Math.random() * 0.7;
    h.goal = h.x < W / 2 ? h.x + far * (W - SIDE - h.x) : h.x - far * (h.x - SIDE);
    h.goalY = h.y + h.dir * (DROP[0] + Math.random() * (DROP[1] - DROP[0]));
  }

  /* Una punta que sale de un punto, hacia abajo (1) o hacia arriba (-1). */
  function from(p, dir) {
    const h = { dir, x: p.bx, y: p.y, turn: dir * p.turn, run: p.run, budget: 0 };
    aim(h);
    return h;
  }

  /* Volver a empezar: un punto suelto en y, en cualquier sitio. */
  function seed(y) {
    const x = SIDE + Math.random() * (W - 2 * SIDE);
    pts = [{ x, y, bx: x, turn: 0, run: 0 }];
    down = from(pts[0], 1);
    up = from(pts[0], -1);
  }

  /* Un paso: gira un poco hacia su sitio y avanza. El temblor (una onda
     corta, de lado) va solo en el dibujo, no en el rumbo. */
  function grow(h) {
    const want = Math.atan2(h.goal - h.x, Math.max(1, (h.goalY - h.y) * h.dir));
    h.turn += (want - h.turn) * 0.06 + (Math.random() - 0.5) * 0.08;
    h.turn = Math.max(-1.3, Math.min(1.3, h.turn));   // que no se tumbe: siempre avanza
    h.x = Math.max(SIDE / 2, Math.min(W - SIDE / 2, h.x + STEP * Math.sin(h.turn)));
    h.y += h.dir * STEP * Math.cos(h.turn);
    h.run += h.dir * STEP;
    if ((h.goalY - h.y) * h.dir <= 0) aim(h);
    const p = { x: h.x + 6 * Math.sin(h.run / 28 + ph), y: h.y, bx: h.x, turn: h.dir * h.turn, run: h.run };
    if (h.dir > 0) pts.push(p);
    else pts.unshift(p);
  }

  /* Lo que se sale de la pantalla, fuera; y la punta de ese lado sale
     del último que queda. Si no queda nada (un salto largo), se empieza
     otra vez, por el lado del que se viene. */
  function trim(top, bottom) {
    if (!pts.length || pts[0].y > bottom || pts[pts.length - 1].y < top) {
      seed(pts.length && pts[0].y > bottom ? bottom : top);
      return;
    }
    if (pts[0].y < top - 2 * KEEP) {
      while (pts[1] && pts[1].y < top - KEEP) pts.shift();
      up = from(pts[0], -1);
    }
    if (pts[pts.length - 1].y > bottom + 2 * KEEP) {
      while (pts[pts.length - 2] && pts[pts.length - 2].y > bottom + KEEP) pts.pop();
      down = from(pts[pts.length - 1], 1);
    }
  }

  /* ponytail: se rehace el `d` entero en cada paso; son unos cientos de
     puntos, los de una pantalla. */
  function paint() {
    const d = hilos.path(pts);
    for (const svg of layers) svg.firstChild.setAttribute('d', d);
  }

  function fit() {
    const w = root.clientWidth;
    if (w !== W && pts.length) {
      /* otro ancho: lo tejido se estira o se encoge con la página */
      for (const p of pts) { p.x *= w / W; p.bx *= w / W; }
      for (const h of [down, up]) { h.x *= w / W; h.goal *= w / W; }
    }
    W = w;
    for (const svg of layers) {
      svg.setAttribute('width', W);
      svg.setAttribute('height', root.scrollHeight);
    }
    paint();
    wake();
  }

  /* Una punta, en un fotograma: deprisa hasta `fast` y luego, a SLOW,
     hasta `end`. Lo que da cada fotograma se va guardando (h.budget) y se
     gasta a pasos enteros, que a poca velocidad no da para uno en cada
     fotograma. */
  function weave(h, fast, end, quick, dt) {
    const before = (y, to) => (h.dir > 0 ? y < to : y > to);
    if (still) { while (before(h.y, end)) grow(h); return; }
    if (!before(h.y, end)) { h.budget = 0; return; }
    h.budget += (before(h.y, fast) ? quick : SLOW) * dt;
    for (; h.budget >= STEP && before(h.y, end); h.budget -= STEP) grow(h);
  }

  /* speed: px de scroll por segundo, que se va calmando */
  let speed = 0;
  let lastY = scrollY;
  let lastT = 0;
  let scrollT = 0;
  let running = false;
  let opening = true;   // hasta que se llena la primera pantalla

  function step(now) {
    const dt = Math.min(0.1, (now - (lastT || now)) / 1000);
    lastT = now;
    const h = innerHeight;
    const top = Math.max(0, scrollY);
    const bottom = Math.min(root.scrollHeight, scrollY + h);
    trim(top, bottom);
    const quick = opening ? OPEN : Math.max(CALM, speed * CHASE);
    weave(down, opening ? bottom : scrollY + h * EDGE, bottom, quick, dt);
    weave(up, scrollY + h * (1 - EDGE), top, quick, dt);
    speed *= 0.92;
    paint();
    running = down.y < bottom || up.y > top;
    if (!running) opening = false;
    if (running) requestAnimationFrame(step);
    else lastT = 0;
  }

  function wake() {
    if (running) return;
    running = true;
    requestAnimationFrame(step);
  }

  addEventListener('scroll', () => {
    const now = performance.now();
    const dy = Math.abs(scrollY - lastY);
    lastY = scrollY;
    speed = Math.max(speed, (dy / Math.max(16, now - (scrollT || now))) * 1000);
    scrollT = now;
    wake();
  }, { passive: true });

  addEventListener('resize', fit);
  addEventListener('load', fit);
  seed(scrollY);
  fit();
})();
