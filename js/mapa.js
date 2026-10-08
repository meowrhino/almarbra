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

  /* Un hilo de a a b: la recta, desviada por dos ondas —una larga, que
     lo curva entero, y otra corta, que lo hace temblar— que se apagan en
     los extremos para que salga y llegue justo al centro de cada foto.
     Da los puntos; la forma (escalones, diagonal…) la pone js/hilos.js. */
  function thread(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const waves = 0.5 + Math.random() * 1.5;
    const amp = (0.06 + Math.random() * 0.12) * len * (Math.random() < 0.5 ? -1 : 1);
    const wobble = Math.min(14, len * 0.04);
    const phase = Math.random() * Math.PI * 2;
    const n = Math.max(8, Math.ceil(len / 8));
    return Array.from({ length: n + 1 }, (_, k) => {
      const t = k / n;
      const off = Math.sin(Math.PI * t) * (amp * Math.sin(Math.PI * waves * t + phase / 4) + wobble * Math.sin((t * len) / 35 + phase));
      return { x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off };
    });
  }

  /* Pone (o vuelve a poner) la forma a un hilo a partir de sus puntos. */
  const shape = (el) => el.setAttribute('d', hilos.path(el.pts));

  /* Los hilos de la lista los escribe el build con sus puntos en
     data-pts; aquí se les pone la forma que toque. */
  const listPaths = [...document.querySelectorAll('.row svg path[data-pts]')];
  for (const el of listPaths) el.pts = el.dataset.pts.split(' ').map((xy) => { const [x, y] = xy.split(','); return { x: +x, y: +y }; });
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
        const box = { x, y, w, h, p };
        if (t === 799 || !spots.some((b) => hits(box, b, gap))) spot = box;   // ponytail: plano lleno, se pisa; bajar DENSITY
      }
      if (!home) anchors.set(p, spot);
      spots.push(spot);
      pin.style.left = `${spot.x}px`;
      pin.style.top = `${spot.y}px`;
    }

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
      path.pts = thread(from, to);
      shape(path);
      path.setAttribute('pathLength', '1');
      path.ends = [from, to];
      path.setAttribute('stroke', colorOf(pins.find((pin) => pin.dataset.p === s.p)));
      path.dataset.p = s.p;
      path.style.animationDelay = `${(Math.random() * 0.8).toFixed(2)}s`;
      svg.append(path);
    }

    setZoom(1);
  }

  /* Al pasar por una foto se enciende su proyecto y el resto se apaga.
     Y sus hilos se descosen y se vuelven a coser por otro camino: cada
     vez que se pasa, salen con otra forma y se dibujan de nuevo. */
  let lit = null;
  function light(p) {
    if (p === lit) return;
    lit = p;
    map.classList.toggle('dim', p !== null);
    for (const el of world.querySelectorAll('[data-p]')) {
      const on = el.dataset.p === p;
      el.classList.toggle('on', on);
      if (!on || !el.pts || still) continue;
      el.pts = thread(...el.ends);
      shape(el);
      el.style.animation = 'none';
      el.getBBox();   // para que la animación vuelva a empezar
      el.style.animation = `draw .7s ease-out ${(Math.random() * 0.2).toFixed(2)}s forwards`;
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

  /* A saltos, sin animación: cinco escalones, una raya cada uno en la
     columna de la derecha. Acerca o aleja sobre el centro de la pantalla. */
  const ZOOMS = [0.5, 0.7, 1, 1.4, 2];
  const zoomBox = document.querySelector('.zoom');
  const ticks = zoomBox.querySelector('.ticks');
  let zoom = 1;

  for (const z of [...ZOOMS].reverse()) {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1;
    b.dataset.z = z;
    ticks.append(b);
  }

  function setZoom(z) {
    const cx = (map.scrollLeft + map.clientWidth / 2) / zoom;
    const cy = (map.scrollTop + map.clientHeight / 2) / zoom;
    const firstTime = !world.style.zoom;
    zoom = z;
    world.style.zoom = z;
    if (firstTime) map.scrollTo((world.offsetWidth * z - map.clientWidth) / 2, (world.offsetHeight * z - map.clientHeight) / 2);
    else map.scrollTo(cx * z - map.clientWidth / 2, cy * z - map.clientHeight / 2);
    for (const b of ticks.children) b.classList.toggle('on', Number(b.dataset.z) === z);
  }

  zoomBox.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    const i = ZOOMS.indexOf(zoom);
    const z = b.dataset.z ? Number(b.dataset.z) : ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, i + Number(b.dataset.step)))];
    if (z !== zoom) setZoom(z);
  });

  /* ── la vista ──────────────────────────────────────────────────── */

  const wanted = () => ({ '#lista': 'lista', '#about': 'about' }[location.hash] || 'mapa');

  function show(view) {
    root.dataset.vista = view;
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
