/* La portada: el mapa, la lista y el paso de una a otra.

   El mapa son las fotos de cada proyecto desperdigadas por un plano más
   grande que la pantalla, que se arrastra con el ratón y se recorre con
   el dedo o la rueda (es un scroll normal). Las fotos de un mismo
   proyecto van unidas por un camino de píxeles de su color, que crece
   desde la portada del proyecto. Todo cae en un sitio distinto en cada
   carga.

   La vista la dice el hash: #mapa o #lista. El menú son enlaces a esos
   hashes, así que atrás y adelante funcionan solos. Al cambiar, la
   pantalla se tapa de píxeles de colores, se cambia y se destapa. Lo
   mismo al entrar en un proyecto.

   Sin este archivo la portada es la lista (ver css/style.css). */

(() => {
  const root = document.documentElement;
  const map = document.getElementById('mapa');
  const world = map.querySelector('.world');
  const pins = [...world.querySelectorAll('.pin')];
  const palette = [...new Set(pins.map((p) => p.style.getPropertyValue('--c')))];
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const PX = 5;          // un píxel del camino, en px de pantalla
  const DENSITY = 0.12;  // cuánto del plano tapan las fotos
  const MARGIN = 60;     // aire entre las fotos y el borde del plano

  /* ── el mapa ───────────────────────────────────────────────────── */

  const hits = (a, b, gap) =>
    a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

  const center = (b) => [Math.floor((b.x + b.w / 2) / PX), Math.floor((b.y + b.h / 2) / PX)];

  /* Un camino de píxel en píxel, en escalera: casi siempre avanza hacia
     el destino, a veces se desvía un paso. */
  function walk([x, y], [tx, ty], cols, rows) {
    const cells = [];
    while (x !== tx || y !== ty) {
      cells.push([x, y]);
      const dx = tx - x;
      const dy = ty - y;
      if (Math.random() < 0.18) {
        if (Math.random() < 0.5) x += Math.random() < 0.5 ? 1 : -1;
        else y += Math.random() < 0.5 ? 1 : -1;
        x = Math.max(0, Math.min(cols - 1, x));
        y = Math.max(0, Math.min(rows - 1, y));
      } else if (Math.random() < Math.abs(dx) / (Math.abs(dx) + Math.abs(dy))) x += Math.sign(dx);
      else y += Math.sign(dy);
    }
    return cells;
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

    /* Primero las portadas, separadas entre sí, y luego el resto de cada
       proyecto cerca de la suya. Si no hay hueco se va aflojando. */
    const placed = [];
    const groups = new Map();   // proyecto -> sus cajas, la portada primero
    const order = [...pins.keys()].sort((a, b) => pins[b].classList.contains('cover') - pins[a].classList.contains('cover'));

    for (const i of order) {
      const pin = pins[i];
      const { w, h } = boxes[i];
      const home = groups.get(pin.dataset.p)?.[0];
      let gap = home ? 24 : 220;
      let reach = 240;
      let spot = null;
      let x;
      let y;

      for (let t = 0; t < 800 && !spot; t++) {
        if (t && t % 100 === 0) { gap /= 2; reach *= 1.4; }
        x = home ? home.x + home.w / 2 - w / 2 + (Math.random() * 2 - 1) * reach : MARGIN + Math.random() * (W - w - 2 * MARGIN);
        y = home ? home.y + home.h / 2 - h / 2 + (Math.random() * 2 - 1) * reach : MARGIN + Math.random() * (H - h - 2 * MARGIN);
        x = Math.max(MARGIN, Math.min(W - w - MARGIN, x));
        y = Math.max(MARGIN, Math.min(H - h - MARGIN, y));
        const box = { x, y, w, h };
        if (!placed.some((b) => hits(box, b, gap))) spot = box;
      }
      spot ||= { x, y, w, h };   // ponytail: plano lleno, se pisa; subir DENSITY no, bajarla

      placed.push(spot);
      if (!groups.has(pin.dataset.p)) groups.set(pin.dataset.p, []);
      groups.get(pin.dataset.p).push(spot);
      pin.style.left = `${spot.x}px`;
      pin.style.top = `${spot.y}px`;
    }

    /* Los caminos: un lienzo por proyecto, de un píxel por celda, que el
       CSS estira sin suavizar. Cada foto se une a la más cercana de las
       que ya estaban, así que crece en árbol desde la portada. */
    const cols = Math.ceil(W / PX);
    const rows = Math.ceil(H / PX);
    const paths = [];

    for (const [p, spots] of groups) {
      const canvas = document.createElement('canvas');
      canvas.width = cols;
      canvas.height = rows;
      canvas.dataset.p = p;
      world.prepend(canvas);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = pins.find((pin) => pin.dataset.p === p).style.getPropertyValue('--c');

      spots.slice(1).forEach((spot, k) => {
        const from = spots.slice(0, k + 1).reduce((a, b) =>
          Math.hypot(a.x - spot.x, a.y - spot.y) < Math.hypot(b.x - spot.x, b.y - spot.y) ? a : b);
        paths.push({ ctx, cells: walk(center(from), center(spot), cols, rows), i: 0 });
      });
    }

    const grow = () => {
      let left = false;
      for (const path of paths) {
        for (let k = 0; k < 4 && path.i < path.cells.length; k++) path.ctx.fillRect(...path.cells[path.i++], 1, 1);
        left ||= path.i < path.cells.length;
      }
      if (left) requestAnimationFrame(grow);
    };
    if (still) for (const path of paths) path.cells.forEach((c) => path.ctx.fillRect(...c, 1, 1));
    else grow();

    map.scrollTo((W - map.clientWidth) / 2, (H - map.clientHeight) / 2);
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

  /* ── la transición: píxeles de colores ─────────────────────────── */

  const CELL = 32;     // lado de un píxel de la tapa
  const FRAMES = 14;   // fotogramas en tapar, y otros tantos en destapar

  const veil = document.createElement('canvas');
  veil.className = 'veil';
  document.body.append(veil);
  const vctx = veil.getContext('2d');

  function pixels(cover) {
    if (cover) {
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
          if (cover) { vctx.fillStyle = palette[Math.floor(Math.random() * palette.length)]; vctx.fillRect(x, y, 1, 1); }
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
    await pixels(true);
    show(view);
    await pixels(false);
  });

  /* Entrar en un proyecto: se tapa y luego se va. Al volver con atrás,
     la página sale de la caché tal cual, tapada: se destapa. */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="projects/"]');
    if (!a || still || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    pixels(true).then(() => { location.href = a.href; });
  });
  addEventListener('pageshow', (e) => { if (e.persisted) pixels(false); });
})();
