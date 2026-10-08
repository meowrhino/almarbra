/* La portada: el mapa, la lista y el paso de una a otra.

   El mapa son las fotos de todos los proyectos, mezcladas, por un plano
   más grande que la pantalla, que se arrastra con el ratón y se recorre
   con el dedo o la rueda (es un scroll normal). Debajo, píxeles del
   color de cada proyecto: muchos alrededor de cada foto, que se van
   soltando al alejarse, y caminos curvos de píxeles sueltos que unen las
   fotos de un mismo proyecto, como las líneas de anaelleblin.com. Todo
   cae en un sitio distinto en cada carga. Los botones + y − acercan y
   alejan.

   La vista la dice el hash: #mapa o #lista. El menú son enlaces a esos
   hashes, así que atrás y adelante funcionan solos. Al cambiar, la
   pantalla se tapa de píxeles, se cambia y se destapa. Al entrar en un
   proyecto se tapa de píxeles de su color.

   Sin este archivo la portada es la lista (ver css/style.css). */

(() => {
  const root = document.documentElement;
  const map = document.getElementById('mapa');
  const world = map.querySelector('.world');
  const pins = [...world.querySelectorAll('.pin')];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const colorOf = (el) => el.style.getPropertyValue('--c');
  const palette = [...new Set(pins.map(colorOf))];

  const DOT = 6;         // lado de un píxel, en px
  const STEP = 11;       // en el halo, como mucho un píxel por casilla de STEP px
  const HALO = 0.7;      // qué parte de las casillas se llena pegado a la foto
  const FADE = 35;       // en cuántos px se suelta el halo (a 3×FADE ya casi no queda)
  const GAIT = 18;       // en los caminos, un paso cada GAIT px...
  const TRAIL = 0.45;    // ...y en cada paso, la probabilidad de que haya píxel
  const DENSITY = 0.11;  // cuánto del plano tapan las fotos
  const MARGIN = 60;     // aire entre las fotos y el borde del plano

  /* ── el mapa ───────────────────────────────────────────────────── */

  const hits = (a, b, gap) =>
    a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

  let built = false;
  let paint = () => {};   // vuelve a pintar los píxeles; lo define build()
  let lit = null;         // el proyecto encendido al pasar por encima

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

    /* Cada foto, en cualquier sitio del plano donde no pise a otra: los
       proyectos quedan mezclados. Si no hay hueco se va aflojando. */
    const spots = [];
    pins.forEach((pin, i) => {
      const { w, h } = boxes[i];
      let gap = 40;
      let spot = null;
      for (let t = 0; t < 800 && !spot; t++) {
        if (t && t % 200 === 0) gap /= 2;
        const box = { x: MARGIN + Math.random() * (W - w - 2 * MARGIN), y: MARGIN + Math.random() * (H - h - 2 * MARGIN), w, h };
        if (t === 799 || !spots.some((b) => hits(box, b, gap))) spot = box;   // ponytail: plano lleno, se pisa; bajar DENSITY
      }
      spot.p = Number(pin.dataset.p);
      spots.push(spot);
      pin.style.left = `${spot.x}px`;
      pin.style.top = `${spot.y}px`;
    });

    /* Los píxeles, por proyecto. `r` es la tirada de cada uno: al
       cargar se van encendiendo de menor a mayor. */
    const dots = [];
    const add = (p, x, y) => (dots[p] ||= []).push({ x: x - DOT / 2, y: y - DOT / 2, r: Math.random() });

    /* El halo: el plano en casillas de STEP px y, en cada una, un píxel o
       ninguno, más probable cuanto más cerca de la foto, corrido al azar
       dentro de la casilla para que no se vea la rejilla. Una casilla
       solo se llena una vez, aunque le lleguen dos fotos. */
    const cols = Math.ceil(W / STEP);
    const rows = Math.ceil(H / STEP);
    const taken = new Uint8Array(cols * rows);
    for (const s of spots) {
      const x0 = Math.max(0, Math.floor((s.x - 4 * FADE) / STEP));
      const x1 = Math.min(cols - 1, Math.ceil((s.x + s.w + 4 * FADE) / STEP));
      const y0 = Math.max(0, Math.floor((s.y - 4 * FADE) / STEP));
      const y1 = Math.min(rows - 1, Math.ceil((s.y + s.h + 4 * FADE) / STEP));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const c = y * cols + x;
          if (taken[c]) continue;
          const cx = (x + Math.random()) * STEP;
          const cy = (y + Math.random()) * STEP;
          const d = Math.hypot(Math.max(s.x - cx, 0, cx - s.x - s.w), Math.max(s.y - cy, 0, cy - s.y - s.h));
          if (Math.random() < HALO * Math.exp(-d / FADE)) { taken[c] = 1; add(s.p, cx, cy); }
        }
      }
    }

    /* Los caminos: cada foto se une a la más cercana de su proyecto de
       las que ya estaban, así que cada proyecto es un árbol. El camino es
       una curva en S (Bézier con los dos tiradores desviados a lados al
       azar) y se recorre a pasos, dejando un píxel en algunos. */
    const byProject = new Map();
    for (const s of spots) {
      const center = { x: s.x + s.w / 2, y: s.y + s.h / 2 };
      const before = byProject.get(s.p) || [];
      if (before.length) {
        const from = before.reduce((a, b) => (Math.hypot(a.x - center.x, a.y - center.y) < Math.hypot(b.x - center.x, b.y - center.y) ? a : b));
        const dx = center.x - from.x;
        const dy = center.y - from.y;
        const len = Math.hypot(dx, dy);
        const bend = () => (Math.random() * 2 - 1) * 0.45;   // cuánto se curva, en largos del camino
        const c1 = { x: from.x + dx / 3 - dy * bend(), y: from.y + dy / 3 + dx * bend() };
        const c2 = { x: from.x + (2 * dx) / 3 - dy * bend(), y: from.y + (2 * dy) / 3 + dx * bend() };
        const steps = Math.ceil(len / GAIT);
        for (let k = 0; k <= steps; k++) {
          if (Math.random() >= TRAIL) continue;
          const t = k / steps;
          const u = 1 - t;
          add(s.p,
            u * u * u * from.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * center.x + (Math.random() - 0.5) * 4,
            u * u * u * from.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * center.y + (Math.random() - 0.5) * 4);
        }
      }
      byProject.set(s.p, [...before, center]);
    }

    const colors = [];
    for (const pin of pins) colors[pin.dataset.p] = colorOf(pin);

    /* Un lienzo a la mitad de resolución que el plano: los píxeles caen
       cada 2 px, que a la vista ya es «en cualquier sitio», y el CSS lo
       estira sin suavizar. */
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(W / 2);
    canvas.height = Math.ceil(H / 2);
    world.prepend(canvas);
    const ctx = canvas.getContext('2d');

    /* `amount` (0–1) es qué parte de los píxeles se enseña: al cargar
       sube poco a poco y el mapa se enciende. Con un proyecto encendido,
       los demás se quedan a un cuarto. */
    paint = (amount = 1) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((list, p) => {
        ctx.fillStyle = colors[p];
        ctx.globalAlpha = lit === null || p === lit ? 1 : 0.25;
        for (const d of list) if (d.r < amount) ctx.fillRect(Math.round(d.x / 2), Math.round(d.y / 2), DOT / 2, DOT / 2);
      });
    };

    if (still) paint();
    else {
      const start = performance.now();
      const grow = (now) => {
        const t = Math.min(1, (now - start) / 900);
        paint(t);
        if (t < 1) requestAnimationFrame(grow);
      };
      requestAnimationFrame(grow);
    }

    setZoom(1);
  }

  /* Al pasar por una foto se enciende su proyecto y el resto se apaga. */
  function light(p) {
    if (p === lit) return;
    lit = p;
    map.classList.toggle('dim', p !== null);
    for (const pin of pins) pin.classList.toggle('on', Number(pin.dataset.p) === p);
    paint();
  }
  world.addEventListener('pointerover', (e) => {
    const pin = e.target.closest('.pin');
    light(pin ? Number(pin.dataset.p) : null);
  });
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

  /* A saltos, sin animación: cinco escalones, cada uno un cuadrado en la
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
    const first = !world.style.zoom;
    zoom = z;
    world.style.zoom = z;
    if (first) map.scrollTo((world.offsetWidth * z - map.clientWidth) / 2, (world.offsetHeight * z - map.clientHeight) / 2);
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

  /* ── la transición: píxeles grandes ────────────────────────────── */

  const CELL = 72;     // lado de un píxel de la tapa
  const FRAMES = 14;   // fotogramas en tapar, y otros tantos en destapar

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const vctx = veil.getContext('2d');

  /** Tapa (con `colors`) o destapa la pantalla, píxel a píxel al azar. */
  function pixels(colors) {
    if (colors) {
      veil.width = Math.ceil(innerWidth / CELL);
      veil.height = Math.ceil(innerHeight / CELL);
    }
    const cells = [];
    for (let y = 0; y < veil.height; y++) for (let x = 0; x < veil.width; x++) cells.push([x, y]);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const per = Math.ceil(cells.length / FRAMES);

    return new Promise((done) => {
      const step = () => {
        for (const [x, y] of cells.splice(0, per)) {
          if (colors) { vctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]; vctx.fillRect(x, y, 1, 1); }
          else vctx.clearRect(x, y, 1, 1);
        }
        if (cells.length) requestAnimationFrame(step);
        else done();
      };
      step();
    });
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
    await pixels(palette);
    show(view);
    await pixels(null);
  });

  /* Entrar en un proyecto: se tapa de su color y luego se va. Al volver
     con atrás, la página sale de la caché tal cual, tapada: se destapa. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="projects/"]');
    if (!a || still || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    pixels([colorOf(a)]).then(() => { location.href = a.href; });
  });
  addEventListener('pageshow', (e) => { if (e.persisted) pixels(null); });
})();
