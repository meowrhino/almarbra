/* El hilo de la página de un proyecto, de su color.

   Baja por toda la página ondulando de lado a lado, por encima de las
   fotos, con dos ondas —una larga y otra más corta— para que no se
   repita. La forma (escalones, diagonal…) la pone js/hilos.js, como a
   todos los hilos de la web.

   Se teje desde donde estás hacia donde vas: al bajar, la punta va a la
   velocidad del scroll (o a CALM, si no hay) hasta el 85 % de la
   pantalla (EDGE), y el último trozo, hasta el borde, despacio (SLOW).
   Al subir, lo mismo hacia arriba, si arriba no había hilo. Lo tejido
   se queda. */

(() => {
  const root = document.documentElement;
  if (!document.querySelector('.project article')) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CALM = 220;   // px de hilo por segundo, sin scroll
  const SLOW = 50;    // px de hilo por segundo, en el último trozo
  const EDGE = 0.85;  // hasta dónde de la pantalla va deprisa
  const STEP = 3;     // un punto de la curva cada tantos px de alto

  let path = null;
  let svg = null;
  let along = [];     // el largo del hilo hasta cada punto
  let total = 0;
  let pace = 0;       // px de hilo por px de scroll
  let lo = null;      // lo tejido va de lo a hi, en px de hilo
  let hi = null;
  const p1 = Math.random() * 6;
  const p2 = Math.random() * 6;

  /* El largo del hilo a la altura y de la página. */
  const at = (y) => along[Math.max(0, Math.min(along.length - 1, Math.floor(y / STEP)))] ?? 0;

  /* Solo se rehace si cambia el ancho o el alto de la página, no al
     asomar la barra del navegador del móvil. */
  let size = '';
  function draw(force) {
    const W = root.clientWidth;
    const H = root.scrollHeight;
    if (force !== true && `${W}x${H}` === size) return;
    size = `${W}x${H}`;
    const share = total && lo !== null ? [lo / total, hi / total] : null;
    svg?.remove();

    const points = [];
    along = [];
    let length = 0;
    for (let y = 0; y <= H; y += STEP) {
      const p = { x: W / 2 + (W / 2 - 24) * Math.sin(y / 500 + p1) * (0.75 + 0.25 * Math.sin(y / 230 + p2)), y };
      const q = points[points.length - 1];
      if (q) length += Math.hypot(p.x - q.x, p.y - q.y);
      points.push(p);
      along.push(length);
    }
    total = length;
    pace = total / H;
    /* la primera vez nace arriba de la pantalla */
    [lo, hi] = share ? share.map((f) => f * total) : [at(scrollY), at(scrollY)];

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hilo');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('aria-hidden', 'true');
    path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', hilos.path(points));
    /* el largo en las mismas unidades que `along`: a escalones el
       trazo es algo más largo que la curva, y así no se descuadra */
    path.setAttribute('pathLength', total);
    svg.append(path);
    document.body.prepend(svg);
    paint();
    wake();
  }

  /* Se ve de lo a hi: un trazo de nada, un hueco hasta lo, el trazo y
     el resto hueco. */
  const paint = () => { path.style.strokeDasharray = `0 ${lo} ${hi - lo} ${total}`; };

  /* speed: px de scroll por segundo, que se va calmando */
  let speed = 0;
  let lastY = scrollY;
  let lastT = 0;
  let scrollT = 0;
  let running = false;

  function step(now) {
    const dt = Math.min(0.1, (now - (lastT || now)) / 1000);
    lastT = now;
    const h = innerHeight;
    const bottom = at(scrollY + h);
    const top = at(scrollY);
    if (still) {
      hi = Math.max(hi, bottom);
      lo = Math.min(lo, top);
    } else {
      const quick = Math.max(CALM, speed * pace) * dt;
      if (hi < bottom) hi = Math.min(bottom, hi + (hi < at(scrollY + h * EDGE) ? quick : SLOW * dt));
      if (lo > top) lo = Math.max(top, lo - (lo > at(scrollY + h * (1 - EDGE)) ? quick : SLOW * dt));
    }
    speed *= 0.92;
    paint();
    running = hi < bottom || lo > top;
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

  addEventListener('resize', draw);
  addEventListener('load', draw);
  addEventListener('pruebas', (e) => { if (e.detail === 'hilos') draw(true); });
  draw();
})();
