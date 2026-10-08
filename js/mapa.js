/* La portada: el mapa, la lista y el paso de una a otra.

   El mapa son las fotos de todos los proyectos, por zonas, en un plano
   más grande que la pantalla, que se arrastra con el ratón y se recorre
   con el dedo o la rueda (es un scroll normal). Las fotos de un mismo
   proyecto van unidas por un hilo fino de su color, que serpentea como
   las líneas de anaelleblin.com y se dibuja al cargar. Todo cae en un
   sitio distinto en cada carga. Los botones + y − acercan y alejan.

   La vista la dice el hash: #mapa o #lista. El menú son enlaces a esos
   hashes, así que atrás y adelante funcionan solos. Al cambiar, la
   pantalla se llena de líneas que se van dibujando solas, se cambia y se
   funde. Al entrar en un proyecto, las líneas son de su color.

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
     los extremos para que salga y llegue justo al centro de cada foto. */
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
    let d = '';
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const ends = Math.sin(Math.PI * t);
      const off = ends * (amp * Math.sin(Math.PI * waves * t + phase / 4) + wobble * Math.sin((t * len) / 35 + phase));
      d += `${k ? 'L' : 'M'}${(a.x + dx * t + nx * off).toFixed(1)} ${(a.y + dy * t + ny * off).toFixed(1)}`;
    }
    return d;
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
       se mezclan un poco por los bordes. Si no hay hueco se va aflojando. */
    const first = pins.map((pin, i) => i === 0 || pins[i - 1].dataset.p !== pin.dataset.p);
    const order = [...pins.keys()].sort((a, b) => first[b] - first[a]);
    const anchors = new Map();   // proyecto -> la caja de su primera foto
    const spots = [];

    for (const i of order) {
      const pin = pins[i];
      const p = pin.dataset.p;
      const { w, h } = boxes[i];
      const home = anchors.get(p);
      let gap = home ? 18 : 160;
      let reach = REACH;
      let spot = null;
      for (let t = 0; t < 800 && !spot; t++) {
        if (t && t % 100 === 0) { gap /= 2; reach *= 1.3; }
        let x = home ? home.x + home.w / 2 - w / 2 + (Math.random() * 2 - 1) * reach : MARGIN + Math.random() * (W - w - 2 * MARGIN);
        let y = home ? home.y + home.h / 2 - h / 2 + (Math.random() * 2 - 1) * reach : MARGIN + Math.random() * (H - h - 2 * MARGIN);
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
      path.setAttribute('d', thread(from, to));
      path.setAttribute('pathLength', '1');
      path.setAttribute('stroke', colorOf(pins.find((pin) => pin.dataset.p === s.p)));
      path.dataset.p = s.p;
      path.style.animationDelay = `${(Math.random() * 0.8).toFixed(2)}s`;
      svg.append(path);
    }

    setZoom(1);
  }

  /* Al pasar por una foto se enciende su proyecto y el resto se apaga. */
  let lit = null;
  function light(p) {
    if (p === lit) return;
    lit = p;
    map.classList.toggle('dim', p !== null);
    for (const el of world.querySelectorAll('[data-p]')) el.classList.toggle('on', el.dataset.p === p);
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

  /* ── la transición: líneas que se dibujan solas ────────────────── */

  const LINES = 60;    // cuántas líneas a la vez
  const FRAMES = 24;   // fotogramas en tapar
  const STRIDE = 16;   // px que avanza cada línea por paso (tres pasos por fotograma)

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const vctx = veil.getContext('2d');

  /* Tapa: cada línea sale de un borde hacia dentro y va torciendo al
     azar, mientras el fondo se oscurece hasta el negro. */
  function cover(colors) {
    const dpr = devicePixelRatio || 1;
    veil.width = innerWidth * dpr;
    veil.height = innerHeight * dpr;
    vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vctx.lineWidth = 1.5;
    vctx.lineCap = 'round';
    veil.style.transition = 'none';
    veil.style.opacity = 1;

    const walkers = Array.from({ length: LINES }, () => {
      const side = Math.floor(Math.random() * 4);
      const x = side === 1 ? innerWidth : side === 3 ? 0 : Math.random() * innerWidth;
      const y = side === 2 ? innerHeight : side === 0 ? 0 : Math.random() * innerHeight;
      const angle = Math.atan2(innerHeight / 2 - y, innerWidth / 2 - x) + (Math.random() - 0.5) * 1.6;
      return { x, y, angle, turn: (Math.random() - 0.5) * 0.08, color: colors[Math.floor(Math.random() * colors.length)] };
    });

    return new Promise((done) => {
      let frame = 0;
      const step = () => {
        frame += 1;
        veil.style.backgroundColor = `rgba(0, 0, 0, ${frame / FRAMES})`;
        for (const w of walkers) {
          vctx.strokeStyle = w.color;
          vctx.beginPath();
          vctx.moveTo(w.x, w.y);
          for (let k = 0; k < 3; k++) {
            w.turn += (Math.random() - 0.5) * 0.05;
            w.angle += w.turn;
            w.x += Math.cos(w.angle) * STRIDE;
            w.y += Math.sin(w.angle) * STRIDE;
            vctx.lineTo(w.x, w.y);
          }
          vctx.stroke();
        }
        if (frame < FRAMES) requestAnimationFrame(step);
        else done();
      };
      step();
    });
  }

  /** Destapa: lo dibujado se funde y se borra. */
  function uncover() {
    veil.style.transition = 'opacity .4s';
    veil.style.opacity = 0;
    return new Promise((done) => setTimeout(() => {
      vctx.clearRect(0, 0, veil.width, veil.height);
      veil.style.backgroundColor = 'transparent';
      done();
    }, 400));
  }

  /* ── la vista ──────────────────────────────────────────────────── */

  const wanted = () => (location.hash === '#lista' ? 'lista' : 'mapa');

  function show(view) {
    root.dataset.vista = view;
    scrollTo(0, 0);
    if (view === 'mapa') build();
  }

  show(wanted());

  addEventListener('resize', () => { if (root.dataset.vista === 'mapa') build(); });

  addEventListener('hashchange', async () => {
    const view = wanted();
    if (view === root.dataset.vista) return;
    if (still) { show(view); return; }
    await cover(palette);
    show(view);
    await uncover();
  });

  /* Entrar en un proyecto: líneas de su color y luego se va. Al volver
     con atrás, la página sale de la caché tal cual, tapada: se destapa. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="projects/"]');
    if (!a || still || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    cover([colorOf(a)]).then(() => { location.href = a.href; });
  });
  addEventListener('pageshow', (e) => { if (e.persisted) uncover(); });
})();
