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
     Se recorre a pasos de STEP px y se pasa a escalones (`stairs`). */
  const STEP = 3;
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
    const n = Math.max(8, Math.ceil(len / STEP));
    return stairs(Array.from({ length: n + 1 }, (_, k) => {
      const t = k / n;
      const off = Math.sin(Math.PI * t) * (amp * Math.sin(Math.PI * waves * t + phase / 4) + wobble * Math.sin((t * len) / 35 + phase));
      return { x: a.x + dx * t + nx * off, y: a.y + dy * t + ny * off };
    }), STEP);
  }

  /* Una curva a escalones, como en una pantalla de pocos píxeles: va de
     casilla en casilla de una rejilla de `g`, en horizontal y luego en
     vertical. Para que no salga dentada, solo cambia de casilla cuando
     la curva ya se ha ido tres cuartos de casilla: así no va y vuelve
     entre dos cuando pasa justo por el borde. (Igual en build/build.mjs
     y js/hilo.js.) */
  function stairs(points, g) {
    let d = '';
    let cx = null;
    let cy = null;
    for (const p of points) {
      const px = p.x / g;
      const py = p.y / g;
      if (cx === null) {
        cx = Math.round(px);
        cy = Math.round(py);
        d = `M${cx * g} ${cy * g}`;
        continue;
      }
      let nx = cx;
      let ny = cy;
      while (px - nx > 0.75) nx += 1;
      while (nx - px > 0.75) nx -= 1;
      while (py - ny > 0.75) ny += 1;
      while (ny - py > 0.75) ny -= 1;
      if (nx !== cx) d += `H${nx * g}`;
      if (ny !== cy) d += `V${ny * g}`;
      cx = nx;
      cy = ny;
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
      path.setAttribute('d', thread(from, to));
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
      el.classList.toggle('on', el.dataset.p === p);
      if (el.dataset.p !== p || !el.ends || still) continue;
      el.setAttribute('d', thread(...el.ends));
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

  /* ── la transición ─────────────────────────────────────────────

     Un lienzo a toda la pantalla tapa, se cambia de vista y se destapa.
     Hay cuatro; cuál, lo dice «transicion» en content/mapa.json, y para
     probar, ?transicion=… en la dirección. Al entrar en un proyecto, del
     color de ese proyecto.

       puntos   punto de cruz: la pantalla se borda de equis, del centro
                hacia fuera
       pixeles  se deshace en cuadrados, alguno de color
       barrido  una ola de píxeles de colores baja en diagonal y deja la
                página en blanco
       lineas   líneas que salen de los bordes y van torciendo */

  const FRAMES = 30;   // fotogramas en tapar

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const vctx = veil.getContext('2d');
  const pick = (colors) => colors[Math.floor(Math.random() * colors.length)];
  const bg = () => getComputedStyle(root).getPropertyValue('--bg');
  const shuffle = (list) => list.map((v) => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);

  /* De una rejilla de C px, las casillas en el orden en que se tapan:
     `order` da a cada una su turno (menor, antes). */
  function cells(C, W, H, order) {
    const list = [];
    for (let y = 0; y < H; y += C) for (let x = 0; x < W; x += C) list.push({ x, y, t: order(x, y) });
    return list.sort((a, b) => a.t - b.t);
  }

  /* Va sacando casillas de la lista, a partes iguales en cada fotograma. */
  const share = (list, f, paint) => {
    const from = Math.floor((list.length * (f - 1)) / FRAMES);
    const to = Math.floor((list.length * f) / FRAMES);
    for (let i = from; i < to; i++) paint(list[i]);
  };

  function puntos(colors, W, H) {
    const C = 14;
    const list = cells(C, W, H, (x, y) => Math.hypot(x - W / 2, y - H / 2) + Math.random() * 260);
    const white = bg();
    return (f) => share(list, f, ({ x, y }) => {
      vctx.fillStyle = white;
      vctx.fillRect(x, y, C, C);
      vctx.strokeStyle = pick(colors);
      vctx.beginPath();
      vctx.moveTo(x + 3, y + 3); vctx.lineTo(x + C - 3, y + C - 3);
      vctx.moveTo(x + C - 3, y + 3); vctx.lineTo(x + 3, y + C - 3);
      vctx.stroke();
    });
  }

  function pixeles(colors, W, H) {
    const C = 24;
    const list = shuffle(cells(C, W, H, () => 0));
    const white = bg();
    return (f) => share(list, f, ({ x, y }) => {
      vctx.fillStyle = Math.random() < 0.12 ? pick(colors) : white;
      vctx.fillRect(x, y, C, C);
    });
  }

  function barrido(colors, W, H) {
    const C = 12;
    const BAND = 5;   // casillas de color en la ola
    const cols = Array.from({ length: Math.ceil(W / C) }, (_, i) => ({
      x: i * C,
      lag: i * 0.5 + Math.random() * 3,
      tint: Array.from({ length: BAND }, () => pick(colors)),
    }));
    const rows = Math.ceil(H / C);
    const span = rows + BAND + cols.length * 0.5 + 3;
    const white = bg();
    return (f) => {
      for (const col of cols) {
        const front = Math.floor((f / FRAMES) * span - col.lag);
        for (let k = 0; k < BAND; k++) {
          const row = front - k;
          if (row < 0 || row >= rows) continue;
          vctx.fillStyle = col.tint[k];
          vctx.fillRect(col.x, row * C, C, C);
        }
        const done = front - BAND;
        if (done >= 0) {
          vctx.fillStyle = white;
          vctx.fillRect(col.x, 0, C, Math.min(rows, done + 1) * C);
        }
      }
    };
  }

  function lineas(colors, W, H) {
    const walkers = Array.from({ length: 60 }, () => {
      const side = Math.floor(Math.random() * 4);
      const x = side === 1 ? W : side === 3 ? 0 : Math.random() * W;
      const y = side === 2 ? H : side === 0 ? 0 : Math.random() * H;
      const angle = Math.atan2(H / 2 - y, W / 2 - x) + (Math.random() - 0.5) * 1.6;
      return { x: snap(x), y: snap(y), angle, turn: (Math.random() - 0.5) * 0.08, color: pick(colors) };
    });
    return (f) => {
      veil.style.backgroundColor = `color-mix(in srgb, var(--bg) ${Math.round((f / FRAMES) * 100)}%, transparent)`;
      for (const w of walkers) {
        vctx.strokeStyle = w.color;
        vctx.beginPath();
        vctx.moveTo(w.x, w.y);
        for (let k = 0; k < 14; k++) {
          w.turn += (Math.random() - 0.5) * 0.02;
          w.angle += w.turn / 4;
          const x = snap(w.x + Math.cos(w.angle) * STEP);
          const y = snap(w.y + Math.sin(w.angle) * STEP);
          vctx.lineTo(x, w.y);
          vctx.lineTo(x, y);
          w.x = x;
          w.y = y;
        }
        vctx.stroke();
      }
    };
  }

  const STYLES = { puntos, pixeles, barrido, lineas };
  const style = STYLES[new URLSearchParams(location.search).get('transicion')] || STYLES[map.dataset.transicion] || puntos;

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
    const draw = style(colors, innerWidth, innerHeight);

    return new Promise((done) => {
      let frame = 0;
      const step = () => {
        frame += 1;
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

  addEventListener('hashchange', async () => {
    const view = wanted();
    if (view === root.dataset.vista) return;
    if (still) { show(view); return; }
    await cover(palette);
    show(view);
    await uncover();
  });

  /* Entrar en un proyecto: la transición, de su color, y luego se va. Al volver
     con atrás, la página sale de la caché tal cual, tapada: se destapa. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="projects/"]');
    if (!a || still || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    cover([colorOf(a)]).then(() => { location.href = a.href; });
  });
  addEventListener('pageshow', (e) => { if (e.persisted) uncover(); });
})();
