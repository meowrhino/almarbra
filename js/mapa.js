/* La portada: el mapa, la lista y el paso de una a otra.

   El mapa son las fotos de todos los proyectos, por zonas, en un plano
   más grande que la pantalla, que se arrastra con el ratón y se recorre
   con el dedo o la rueda (es un scroll normal). Las fotos de un mismo
   proyecto van unidas por un hilo fino de su color, que serpentea como
   las líneas de anaelleblin.com y se dibuja al cargar. Todo cae en un
   sitio distinto en cada carga. Los botones + y − acercan y alejan.

   La vista la dice el hash: #mapa, #lista o #about (el nombre). El menú son enlaces a esos
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
     los extremos para que salga y llegue justo al centro de cada foto.
     Y a escalones: cada punto se pega a una rejilla de STEP px y de uno a
     otro se va en horizontal y luego en vertical (como build/build.mjs). */
  const STEP = 4;
  const snap = (v) => Math.round(v / STEP) * STEP;

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
    let last = null;
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const ends = Math.sin(Math.PI * t);
      const off = ends * (amp * Math.sin(Math.PI * waves * t + phase / 4) + wobble * Math.sin((t * len) / 35 + phase));
      const x = snap(a.x + dx * t + nx * off);
      const y = snap(a.y + dy * t + ny * off);
      if (!last) d = `M${x} ${y}`;
      else d += `${x !== last.x ? `H${x}` : ''}${y !== last.y ? `V${y}` : ''}`;
      last = { x, y };
    }
    return d;
  }

  let built = false;

  /* Sin tamaño (pestaña aún sin pintar, oculta) no se monta: el plano
     saldría infinito. Se reintenta al cambiar el tamaño. */
  function build() {
    if (built || !map.clientWidth || !map.clientHeight) return;
    built = true;
    world.querySelector('.threads')?.remove();
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

       PRUEBAS: la mezcla (data-mezcla, de 0 a 100) tira de cada foto
       desde su zona hacia un sitio cualquiera del plano: con 0 son zonas
       limpias; con 100, todo revuelto. */
    const mix = Number(root.dataset.mezcla ?? 50) / 100;
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

  /* ── la transición ─────────────────────────────────────────────

     Un lienzo a toda la pantalla tapa, se cambia de vista y se destapa.
     Mientras tapa, el fondo se va poniendo del color de la página y
     encima se dibuja algo. PRUEBAS: tres maneras, la que diga
     data-transicion en <html> (js/pruebas.js). */

  const FRAMES = 30;   // fotogramas en tapar

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const vctx = veil.getContext('2d');
  const pick = (colors) => colors[Math.floor(Math.random() * colors.length)];

  /* Líneas: cada una sale de un borde hacia dentro y va torciendo al
     azar, a escalones de STEP px. */
  function lineas(colors, W, H) {
    const walkers = Array.from({ length: 60 }, () => {
      const side = Math.floor(Math.random() * 4);
      const x = side === 1 ? W : side === 3 ? 0 : Math.random() * W;
      const y = side === 2 ? H : side === 0 ? 0 : Math.random() * H;
      const angle = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 1.6;
      return { x: snap(x), y: snap(y), angle, turn: (Math.random() - 0.5) * 0.08, color: pick(colors) };
    });
    return () => {
      for (const w of walkers) {
        vctx.strokeStyle = w.color;
        vctx.beginPath();
        vctx.moveTo(w.x, w.y);
        for (let k = 0; k < 6; k++) {
          w.turn += (Math.random() - 0.5) * 0.05;
          w.angle += w.turn;
          const x = snap(w.x + Math.cos(w.angle) * 7);
          const y = snap(w.y + Math.sin(w.angle) * 7);
          vctx.lineTo(x, w.y);
          vctx.lineTo(x, y);
          w.x = x;
          w.y = y;
        }
        vctx.stroke();
      }
    };
  }

  /* Telar: primero cae la urdimbre —rayas verticales finas— y luego la
     trama la cruza fila a fila, de arriba abajo, una pasada a la derecha
     y la siguiente a la izquierda, como la lanzadera. */
  function telar(colors, W, H) {
    const R = 6;
    const rows = Math.ceil(H / R);
    const ink = getComputedStyle(root).getPropertyValue('--dim');
    return (f) => {
      vctx.fillStyle = ink;
      const warp = Math.min(1, f / (FRAMES * 0.4)) * H;
      const prev = Math.min(1, (f - 1) / (FRAMES * 0.4)) * H;
      for (let x = R / 2; x < W; x += R) vctx.fillRect(x, prev, 1, warp - prev);
      for (let i = 0; i < rows; i++) {
        const start = (i / rows) * FRAMES * 0.6;
        const span = FRAMES * 0.35;
        const a = Math.max(0, Math.min(1, (f - 1 - start) / span)) * W;
        const b = Math.max(0, Math.min(1, (f - start) / span)) * W;
        if (b <= a) continue;
        vctx.fillStyle = colors[i % colors.length];
        vctx.fillRect(i % 2 ? W - b : a, i * R + 2, b - a, 3);
      }
    };
  }

  /* Ovillo: hilos que dan vueltas en cuadrado del borde hacia dentro,
     como cuando se devana. Uno por color, hasta tres, entrelazados. */
  function ovillo(colors, W, H) {
    const strands = [...new Set(colors)].sort(() => Math.random() - 0.5).slice(0, 3);
    const gap = 8 * strands.length;
    const speed = (W * H) / gap / FRAMES;
    const yarns = strands.map((color, k) => {
      const inset = 2 + k * 8;
      return { color, x: inset, y: inset, dir: 0, l: inset, t: inset, r: W - inset, b: H - inset };
    });
    return () => {
      for (const s of yarns) {
        vctx.strokeStyle = s.color;
        vctx.beginPath();
        vctx.moveTo(s.x, s.y);
        let left = speed;
        while (left > 0 && s.l < s.r && s.t < s.b) {
          const to = [s.r, s.b, s.l, s.t][s.dir];
          const at = s.dir % 2 ? s.y : s.x;
          const run = Math.min(left, Math.abs(to - at));
          const sign = s.dir < 2 ? 1 : -1;
          if (s.dir % 2) s.y += sign * run; else s.x += sign * run;
          vctx.lineTo(s.x, s.y);
          left -= run;
          if (run === Math.abs(to - at)) {
            if (s.dir === 0) s.t += gap; else if (s.dir === 1) s.r -= gap; else if (s.dir === 2) s.b -= gap; else s.l += gap;
            s.dir = (s.dir + 1) % 4;
          }
        }
        vctx.stroke();
      }
    };
  }

  const STYLES = { lineas, telar, ovillo };

  function cover(colors) {
    const dpr = devicePixelRatio || 1;
    veil.width = innerWidth * dpr;
    veil.height = innerHeight * dpr;
    vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vctx.lineWidth = 2;
    vctx.lineCap = 'square';
    vctx.lineJoin = 'miter';
    veil.style.transition = 'none';
    veil.style.opacity = 1;
    const draw = (STYLES[root.dataset.transicion] || lineas)(colors, innerWidth, innerHeight);

    return new Promise((done) => {
      let frame = 0;
      const step = () => {
        frame += 1;
        veil.style.backgroundColor = `color-mix(in srgb, var(--bg) ${Math.round((frame / FRAMES) * 100)}%, transparent)`;
        draw(frame);
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

  const wanted = () => ({ '#lista': 'lista', '#about': 'about' }[location.hash] || 'mapa');

  function show(view) {
    root.dataset.vista = view;
    scrollTo(0, 0);
    if (view === 'mapa') build();
  }

  show(wanted());

  addEventListener('resize', () => { if (root.dataset.vista === 'mapa') build(); });

  /* PRUEBAS: al cambiar la mezcla en el panel (js/pruebas.js), se
     reparte otra vez. */
  addEventListener('mezcla', () => {
    built = false;
    world.style.zoom = '';
    if (root.dataset.vista === 'mapa') build();
  });

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
