/* La portada: el mapa, la lista y el paso de una vista a otra.

   El mapa son las fotos de todos los proyectos, por zonas, en un plano
   más grande que la pantalla, que se arrastra con el ratón y se recorre
   con el dedo o la rueda (es un scroll normal). Las fotos de un mismo
   proyecto van unidas por un hilo fino de su color, que serpentea como
   las líneas de anaelleblin.com y se dibuja al cargar. Todo cae en un
   sitio distinto en cada carga. Los botones + y − acercan y alejan.
   (El telar del about, en js/telar.js.)

   La vista la dice el hash: #mapa, #lista o #about. El menú
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

  /* En la lista, lo mismo que en el mapa: al pasar por una fila su hilo
     se vuelve a coser entre sus extremos (data-ends, del build). */
  for (const el of document.querySelectorAll('.row svg path[data-ends]')) {
    el.ends = el.dataset.ends.split(' ').map((xy) => { const [x, y] = xy.split(','); return { x: +x, y: +y }; });
    el.closest('.row').addEventListener('pointerenter', () => redraw(el));
  }

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

    /* Los píxeles, en otro SVG entre los hilos y las fotos. Cada uno es
       un cuadrado de PX px, en la rejilla de los hilos:

         halo      muchos, alrededor de la foto por la que se pasa; brota
                   al pasar y se borra al irse
         pelusa    sueltos al lado de los hilos, como si se deshilacharan;
                   un <path> por hilo, que se rehace cuando el hilo se
                   recose */
    pixels = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pixels.setAttribute('class', 'pixeles');
    pixels.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.after(pixels);

    for (const s of spots) spotOf.set(s.pin, s);
    halo = layer('halo', null, 'none');
    for (const path of svg.querySelectorAll('path')) {
      path.fluff = layer('pelusa', path.dataset.p, path.getAttribute('stroke'));
      path.fluff.style.animationDelay = `${(parseFloat(path.style.animationDelay) + 1.2).toFixed(2)}s`;
      fluff(path);
    }

    setZoom(1);
  }

  /* ── los píxeles ───────────────────────────────────────────────── */

  const PX = 2;
  const snap = (v) => Math.round(v / PX) * PX;
  const dot = (x, y) => `M${snap(x)} ${snap(y)}h${PX}v${PX}h-${PX}z`;
  const bell = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;   // de -1 a 1, más cerca de 0
  let pixels = null;
  const spotOf = new Map();   // foto -> su caja en el plano
  let halo = null;

  function layer(name, p, color) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('class', name);
    el.setAttribute('fill', color);
    if (p !== null) el.dataset.p = p;
    pixels.append(el);
    return el;
  }

  /* Alrededor de una foto, hasta R px de su borde: en cada casilla, un
     píxel o no, según `chance` de la distancia al borde. Cada uno que
     sale, a `each`, con su distancia. */
  function around(b, R, chance, each) {
    for (let y = b.y - R; y < b.y + b.h + R; y += PX) {
      for (let x = b.x - R; x < b.x + b.w + R; x += PX) {
        const dist = Math.hypot(Math.max(b.x - x, 0, x - b.x - b.w), Math.max(b.y - y, 0, y - b.y - b.h));
        if (dist > 0 && Math.random() < chance(dist)) each(dist, dot(x, y));
      }
    }
  }

  /* El halo de la foto por la que se pasa: brota de ella hacia fuera, una
     franja de RING px cada dos fotogramas (medio segundo, más o menos), y
     al irse se borra igual, de dentro hacia fuera. */
  const RING = 4;
  let haloRings = [];   // las franjas puestas, de dentro hacia fuera
  let haloRun = 0;

  /* Cada dos fotogramas, `tick`, hasta que devuelva false; se corta si
     entretanto empieza otra (run). */
  function everyOther(run, tick) {
    let odd = false;
    (function frame() {
      if (run !== haloRun) return;
      odd = !odd;
      if (still) { while (tick()); return; }
      if (!odd || tick()) requestAnimationFrame(frame);
    })();
  }

  let glowing = null;
  function glow(pin) {
    if (pin === glowing) return;
    glowing = pin;
    const run = ++haloRun;
    if (!halo) return;
    const show = () => halo.setAttribute('d', haloRings.flat().join(''));
    const b = spotOf.get(pin);
    if (!b) {   // de dentro hacia fuera: se van quitando las de dentro
      everyOther(run, () => { haloRings.shift(); show(); return haloRings.length > 0; });
      return;
    }
    const rings = [];
    around(b, 60, (d) => 0.55 * Math.exp(-d / 16), (d, dot) => { (rings[Math.floor(d / RING)] ||= []).push(dot); });
    halo.setAttribute('fill', colorOf(pin));
    haloRings = [];
    let k = 0;
    everyOther(run, () => { haloRings.push(rings[k++] || []); show(); return k < rings.length; });
  }

  /* La pelusa de un hilo: de vez en cuando, a un lado o al otro, un
     píxel (o unos pocos juntos) apartado unos px. */
  function lint(el) {
    const dots = [];
    el.pts.forEach((p, i) => {
      const q = el.pts[i + 1];
      if (!q || Math.random() > 0.5) return;
      const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
      const off = (2 + Math.random() * 12) * (Math.random() < 0.5 ? -1 : 1);
      const x = p.x - ((q.y - p.y) / len) * off;
      const y = p.y + ((q.x - p.x) / len) * off;
      dots.push(dot(x, y));
      if (Math.random() < 0.35) dots.push(dot(x + PX * (Math.random() < 0.5 ? 1 : -1), y + PX * Math.round(bell())));
    });
    return dots;
  }

  /* La primera vez, de golpe (la entrada la hace el CSS). */
  function fluff(el) {
    el.fluff.dots = lint(el);
    el.fluff.setAttribute('d', el.fluff.dots.join(''));
  }

  /* Al recoserse el hilo: la pelusa de antes se va con él, de golpe; y
     la nueva va saliendo, a saltos y sin orden, cuando el hilo nuevo ya
     está cosido. */
  function refluff(el) {
    const f = el.fluff;
    const run = (f.run || 0) + 1;
    f.run = run;
    const shuffle = () => Math.random() - 0.5;
    const next = lint(el).sort(shuffle);
    const shown = [];
    const into = Math.ceil(next.length / 24);   // sale en 24 fotogramas
    let n = 0;
    f.dots = shown;
    f.setAttribute('d', '');
    (function frame() {
      if (f.run !== run) return;   // se ha vuelto a recoser
      n += 1;
      if (n > 48) {   // a los 48, el hilo ya está cosido
        shown.push(...next.splice(0, into));
        f.setAttribute('d', shown.join(''));
      }
      if (n <= 48 || next.length) requestAnimationFrame(frame);
    })();
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
    if (el.fluff) refluff(el);
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
      if (on && el.ends) redraw(el);
    }
  }
  world.addEventListener('pointerover', (e) => {
    const pin = e.target.closest('.pin');
    light(pin?.dataset.p ?? null);
    glow(pin);
  });
  world.addEventListener('pointerleave', () => { light(null); glow(null); });

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

  /* ── la vista ──────────────────────────────────────────────────── */

  const wanted = () => ({ '#lista': 'lista', '#about': 'about' }[location.hash] || 'mapa');

  /* La vista se apunta para el «back» de los proyectos (build/build.mjs). */
  function show(view) {
    root.dataset.vista = view;
    for (const a of document.querySelectorAll('.idiomas a')) a.hash = view;   // otro idioma, en la misma vista
    if (view !== 'about') try { sessionStorage.setItem('almarbra-vista', view); } catch { /* sin él, back va a la lista */ }
    scrollTo(0, 0);
    if (view === 'mapa') build();
  }

  show(wanted());

  addEventListener('resize', () => { if (root.dataset.vista === 'mapa') build(); });

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
