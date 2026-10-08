/* La portada: el mapa, la lista y el paso de una a otra.

   El mapa son las fotos de todos los proyectos, por zonas, en un plano
   más grande que la pantalla, que se arrastra con el ratón y se recorre
   con el dedo o la rueda (es un scroll normal). Las fotos de un mismo
   proyecto van unidas por un hilo fino de su color, que serpentea como
   las líneas de anaelleblin.com y se dibuja al cargar. Todo cae en un
   sitio distinto en cada carga. Los botones + y − acercan y alejan.

   La vista la dice el hash: #mapa, #lista o #about (el nombre). El menú
   son enlaces a esos hashes, así que atrás y adelante funcionan solos.
   Al cambiar, la transición de js/transicion.js, de lado.

   Sin este archivo la portada es la lista (ver css/style.css). */

(() => {
  const root = document.documentElement;
  const map = document.getElementById('mapa');
  const world = map.querySelector('.world');
  const pins = [...world.querySelectorAll('.pin')];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const colorOf = (el) => el.style.getPropertyValue('--c');
  const palette = [...new Set(pins.map(colorOf))];

  const DENSITY = 0.15;  // cuánto del plano tapan las fotos
  const REACH = 230;     // hasta dónde se apartan las fotos de un proyecto de la primera
  const MARGIN = 60;     // aire entre las fotos y el borde del plano

  /* ── el mapa ───────────────────────────────────────────────────── */

  const hits = (a, b, gap) =>
    a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

  /* Pone (o vuelve a poner) la forma a un hilo a partir de sus puntos. */
  const shape = (el) => el.setAttribute('d', hilos.path(el.pts));

  /* Los hilos de la lista los escribe el build con sus puntos en
     data-pts; aquí se les pone la forma que toque. */
  const listPaths = [...document.querySelectorAll('.row svg path[data-pts]')];
  for (const el of listPaths) el.pts = el.dataset.pts.split(' ').map((xy) => { const [x, y] = xy.split(','); return { x: +x, y: +y }; });
  /* En la lista, lo mismo que en el mapa: al pasar por una fila su hilo
     se vuelve a coser. */
  for (const el of listPaths) {
    el.ends = [el.pts[0], el.pts[el.pts.length - 1]];
    el.closest('.row').addEventListener('pointerenter', () => redraw(el));
  }
  const reshape = () => { for (const el of [...listPaths, ...world.querySelectorAll('.threads path')]) shape(el); };
  reshape();

  let built = false;

  /* Sin tamaño (pestaña aún sin pintar, oculta) no se monta: el plano
     saldría infinito. Se reintenta al cambiar el tamaño. */
  function build() {
    if (built || !map.clientWidth || !map.clientHeight) return;
    built = true;
    const boxes = pins.map((pin) => ({ w: pin.offsetWidth, h: pin.offsetHeight }));
    const total = boxes.reduce((s, b) => s + b.w * b.h, 0);
    const aspect = map.clientWidth / map.clientHeight;
    const W = Math.round(Math.max(map.clientWidth, Math.sqrt((total / DENSITY) * aspect)));
    const H = Math.round(Math.max(map.clientHeight, W / aspect));
    world.style.width = `${W}px`;
    world.style.height = `${H}px`;

    /* Por zonas: primero la primera foto de cada proyecto, en cualquier
       sitio y separadas entre sí; luego el resto de cada proyecto
       alrededor de la suya, a REACH px como mucho. Las zonas se tocan y
       se mezclan un poco por los bordes. Si no hay hueco se va aflojando.

       La mezcla (content/mapa.json, de 0 a 100, en data-mezcla) tira de
       cada foto desde su zona hacia un sitio cualquiera del plano: con 0
       son zonas limpias; con 100, todo revuelto. */
    const mix = Number(map.dataset.mezcla ?? 50) / 100;
    const anywhere = (size, of) => MARGIN + Math.random() * (of - size - 2 * MARGIN);
    const first = pins.map((pin, i) => i === 0 || pins[i - 1].dataset.p !== pin.dataset.p);
    const order = [...pins.keys()].sort((a, b) => first[b] - first[a]);
    const anchors = new Map();   // proyecto -> la caja de su primera foto
    const spots = [];

    for (const i of order) {
      const pin = pins[i];
      const p = pin.dataset.p;
      const { w, h } = boxes[i];
      const home = anchors.get(p);
      let gap = home ? 18 : 18 + 142 * (1 - mix);
      let reach = REACH;
      let spot = null;
      for (let t = 0; t < 800 && !spot; t++) {
        if (t && t % 100 === 0) { gap /= 2; reach *= 1.3; }
        let x = anywhere(w, W);
        let y = anywhere(h, H);
        if (home) {
          x += (1 - mix) * (home.x + home.w / 2 - w / 2 + (Math.random() * 2 - 1) * reach - x);
          y += (1 - mix) * (home.y + home.h / 2 - h / 2 + (Math.random() * 2 - 1) * reach - y);
        }
        x = Math.max(MARGIN, Math.min(W - w - MARGIN, x));
        y = Math.max(MARGIN, Math.min(H - h - MARGIN, y));
        const box = { x, y, w, h, p, pin };
        if (t === 799 || !spots.some((b) => hits(box, b, gap))) spot = box;   // ponytail: plano lleno, se pisa; bajar DENSITY
      }
      if (!home) anchors.set(p, spot);
      spots.push(spot);
      pin.style.left = `${spot.x}px`;
      pin.style.top = `${spot.y}px`;
    }

    /* La entrada: primero salen los huecos, del centro de la pantalla
       hacia fuera (--d, el retraso de cada uno), y luego cada foto se
       funde en el suyo cuando ha llegado (css/style.css). Pasado el
       rato, las que lleguen tarde —al moverse por el plano— entran sin
       esperar. */
    const far = Math.hypot(W, H) / 2;
    for (const s of spots) {
      const d = Math.hypot(s.x + s.w / 2 - W / 2, s.y + s.h / 2 - H / 2) / far;
      s.pin.style.setProperty('--d', `${Math.round(d * 1400)}ms`);
    }
    setTimeout(() => map.classList.add('listo'), 2600);

    /* Los hilos, en un SVG del tamaño del plano: cada foto se une a la
       más cercana de su proyecto de las que ya estaban, así que cada
       proyecto es un árbol. Se dibujan solos al cargar (css/style.css),
       cada uno con su retraso. */
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'threads');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    world.prepend(svg);

    const seen = new Map();   // proyecto -> centros de sus fotos ya unidas
    for (const s of spots) {
      const to = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
      const before = seen.get(s.p) || [];
      seen.set(s.p, [...before, to]);
      if (!before.length) continue;
      const from = before.reduce((a, b) => (Math.hypot(a.x - to.x, a.y - to.y) < Math.hypot(b.x - to.x, b.y - to.y) ? a : b));
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.pts = hilos.wander(from, to);
      shape(path);
      path.setAttribute('pathLength', '1');
      path.ends = [from, to];
      path.setAttribute('stroke', colorOf(s.pin));
      path.dataset.p = s.p;
      path.style.animationDelay = `${(0.4 + Math.random() * 0.8).toFixed(2)}s`;   // después de los huecos
      svg.append(path);
    }

    setZoom(1);
  }

  /* Descose un hilo y lo vuelve a coser por otro camino, entre los
     mismos extremos, y lo dibuja de nuevo. */
  function redraw(el) {
    if (still) return;
    el.pts = hilos.wander(...el.ends);
    shape(el);
    el.style.animation = 'none';
    el.getBBox();   // para que la animación vuelva a empezar
    el.style.animation = `draw .7s ease-out ${(Math.random() * 0.2).toFixed(2)}s forwards`;
  }

  /* Al pasar por una foto se enciende su proyecto y el resto se apaga.
     Y sus hilos se descosen y se vuelven a coser: cada vez que se pasa,
     salen con otra forma. */
  let lit = null;
  function light(p) {
    if (p === lit) return;
    lit = p;
    map.classList.toggle('dim', p !== null);
    for (const el of world.querySelectorAll('[data-p]')) {
      const on = el.dataset.p === p;
      el.classList.toggle('on', on);
      if (on && el.pts) redraw(el);
    }
  }
  world.addEventListener('pointerover', (e) => light(e.target.closest('.pin')?.dataset.p ?? null));
  world.addEventListener('pointerleave', () => light(null));

  /* Arrastrar con el ratón. Con el dedo ya lo hace el scroll. Si se ha
     arrastrado, el clic de al soltar no abre el proyecto. */
  let drag = null;
  map.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button === 0) drag = { x: e.clientX, y: e.clientY, moved: false };
  });
  addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) { drag.moved = true; map.classList.add('dragging'); }
    map.scrollBy(-dx, -dy);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  addEventListener('pointerup', () => {
    map.classList.remove('dragging');
    setTimeout(() => { drag = null; });
  });
  map.addEventListener('click', (e) => { if (drag?.moved) e.preventDefault(); }, true);
  map.addEventListener('dragstart', (e) => e.preventDefault());

  /* ── el zoom ───────────────────────────────────────────────────── */

  /* A saltos, sin animación: cinco escalones con un − y un + abajo en
     el centro, como una balanza. En el del medio pesan igual; cuanto más
     cerca, más grande el + y más pequeño el −, y al revés. A tope, el
     otro queda en nada, pero se ve (SIZES, el trazo en px).
     Acerca o aleja sobre el centro de la pantalla. */
  const ZOOMS = [0.5, 0.7, 1, 1.4, 2];
  const SIZES = [4, 6, 10, 17, 26];
  const zoomBox = document.querySelector('.zoom');
  const [minus, plus] = zoomBox.querySelectorAll('button');
  let zoom = 1;

  const weigh = (b, s) => {
    b.style.setProperty('--s', `${s}px`);
    b.style.setProperty('--t', `${Math.max(2, Math.round(s / 6))}px`);
  };

  function setZoom(z) {
    const cx = (map.scrollLeft + map.clientWidth / 2) / zoom;
    const cy = (map.scrollTop + map.clientHeight / 2) / zoom;
    const firstTime = !world.style.zoom;
    zoom = z;
    world.style.zoom = z;
    if (firstTime) map.scrollTo((world.offsetWidth * z - map.clientWidth) / 2, (world.offsetHeight * z - map.clientHeight) / 2);
    else map.scrollTo(cx * z - map.clientWidth / 2, cy * z - map.clientHeight / 2);
    const i = ZOOMS.indexOf(z);
    weigh(plus, SIZES[i]);
    weigh(minus, SIZES[SIZES.length - 1 - i]);
  }

  zoomBox.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const i = ZOOMS.indexOf(zoom);
    const z = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + Number(b.dataset.step)))];
    if (z !== zoom) setZoom(z);
  });

  /* ── el about: el telar ─────────────────────────────────────────── */

  /* Detrás del texto, como en un telar: hilos de borde a borde, la
     trama en horizontal y la urdimbre en vertical, de los colores de los
     proyectos. Cada uno entra por un lado y se teje muy despacio (GROW
     s), se queda (HOLD), se desteje en el mismo sentido —la cola sigue a
     la punta— y, tras un respiro, vuelve a entrar en otro sitio. La forma
     no cambia: lo único que se mueve es la punta. Pocos a la vez
     (STRANDS) y sin pasar por el texto. */
  const STRANDS = 5;
  const GROW = 40;
  const HOLD = 15;
  const FPS = 24;
  const back = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  back.setAttribute('class', 'fondo');
  back.setAttribute('aria-hidden', 'true');
  const about = document.getElementById('about');
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

  /* Se teje solo con el about a la vista: el primer hilo nace al entrar,
     que antes el texto no tiene sitio. */
  const start = performance.now();
  let last = 0;
  (function loop(now) {
    requestAnimationFrame(loop);
    if (root.dataset.vista !== 'about' || document.hidden || now - last < 1000 / FPS) return;
    last = now;
    weave((now - start) / 1000);
  })(start);
  /* ponytail: al cambiar el tamaño de la ventana, los que ya están se
     quedan con el de antes; los nuevos ya nacen con el nuevo. */

  /* ── la vista ──────────────────────────────────────────────────── */

  const wanted = () => ({ '#lista': 'lista', '#about': 'about' }[location.hash] || 'mapa');

  /* La vista se apunta para el «back» de los proyectos (build/build.mjs). */
  function show(view) {
    root.dataset.vista = view;
    if (view !== 'about') try { sessionStorage.setItem('almarbra-vista', view); } catch { /* sin él, back va a la lista */ }
    scrollTo(0, 0);
    if (view === 'mapa') build();
  }

  show(wanted());

  addEventListener('resize', () => { if (root.dataset.vista === 'mapa') build(); });

  /* PRUEBAS: lo que cambia el panel (js/pruebas.js). */
  addEventListener('pruebas', (e) => { if (e.detail === 'hilos') reshape(); });

  /* Cambiar de vista: la transición (js/transicion.js), de lado, en el
     orden del menú. */
  addEventListener('hashchange', async () => {
    const view = wanted();
    const from = root.dataset.vista;
    if (view === from) return;
    const dir = transicion.way(from, view);
    await transicion.cover(palette, dir);
    show(view);
    await transicion.uncover(palette, dir);
  });
})();
