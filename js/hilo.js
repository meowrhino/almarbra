/* El hilo de la página de un proyecto, de su color.

   Baja por los márgenes, ondulando, y cruza la columna solo por el hueco
   entre una foto y la siguiente, de un lado al otro: cose las fotos, sin
   tapar ninguna. Donde entra y sale de la columna deja un cuadradito, el
   agujero de la aguja. Va a escalones de STEP px, como los hilos del
   mapa, y se dibuja según se baja. */

(() => {
  const root = document.documentElement;
  const article = document.querySelector('.project article');
  if (!article) return;

  const STEP = 3;   // la casilla de la rejilla, en px
  const HOLE = 6;   // lado del agujero
  const snap = (v) => Math.round(v / STEP) * STEP;
  let svg = null;
  let holes = [];
  let marks = [];   // [y, largo del hilo hasta ahí], para dibujarlo según se baja

  function draw() {
    svg?.remove();
    const W = root.clientWidth;
    const H = root.scrollHeight;
    const col = article.getBoundingClientRect();
    const phase = Math.random() * 6;

    /* El centro de cada margen, y lo que se aparta de él al ondular. */
    const margin = [col.left, W - col.right];
    const mx = (side, y) => {
      const m = margin[side];
      const c = side ? col.right + m / 2 : m / 2;
      return c + (m / 2 - STEP) * 0.6 * Math.sin(y / 170 + phase + side);
    };

    /* Los huecos entre dos fotos seguidas del mismo grupo (entre grupos
       va el nombre del grupo: ahí no se cruza). */
    const gaps = [];
    for (const group of document.querySelectorAll('.group')) {
      const pics = [...group.querySelectorAll('figure img')].map((img) => img.getBoundingClientRect());
      for (let i = 1; i < pics.length; i++) {
        const top = pics[i - 1].bottom + scrollY;
        const bottom = pics[i].top + scrollY;
        if (bottom - top > 2 * STEP) gaps.push({ top, bottom });
      }
    }

    const pts = [];
    holes = [];
    let side = Math.random() < 0.5 ? 0 : 1;
    let y = 0;
    for (const gap of gaps) {
      const mid = (gap.top + gap.bottom) / 2;
      for (; y < mid; y += STEP) pts.push({ x: mx(side, y), y });
      /* La pasada de un margen al otro, combada un poco dentro del hueco. */
      const x0 = mx(side, mid);
      const x1 = mx(1 - side, mid);
      const sag = (gap.bottom - gap.top) * 0.3;
      const n = Math.ceil(Math.abs(x1 - x0) / STEP);
      const at = (x) => mid + sag * Math.sin(Math.PI * ((x - x0) / (x1 - x0)));
      for (let k = 0; k <= n; k++) {
        const x = x0 + ((x1 - x0) * k) / n;
        pts.push({ x, y: at(x) });
      }
      for (const edge of [col.left, col.right]) holes.push({ x: edge, y: at(edge) });
      side = 1 - side;
      y = mid + STEP;
    }
    for (; y <= H; y += STEP) pts.push({ x: mx(side, y), y });

    let d = '';
    let last = null;
    let len = 0;
    marks = [];
    for (const p of pts) {
      const x = snap(p.x);
      const py = snap(p.y);
      if (!last) d = `M${x} ${py}`;
      else {
        d += `${x !== last.x ? `H${x}` : ''}${py !== last.y ? `V${py}` : ''}`;
        len += Math.abs(x - last.x) + Math.abs(py - last.y);
      }
      marks.push([py, len]);
      last = { x, y: py };
    }

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hilo');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path d="${d}" stroke-dasharray="${len + 1}"/>`
      + holes.map((h) => `<rect x="${snap(h.x) - HOLE / 2}" y="${snap(h.y) - HOLE / 2}" width="${HOLE}" height="${HOLE}"/>`).join('');
    document.body.prepend(svg);
    reveal();
  }

  /* El hilo llega hasta el fondo de la pantalla; los agujeros se
     encienden cuando el hilo pasa por ellos. */
  function reveal() {
    if (!svg) return;
    const edge = scrollY + innerHeight;
    let lo = 0;
    let hi = marks.length - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (marks[m][0] <= edge) lo = m; else hi = m - 1;
    }
    const total = marks[marks.length - 1]?.[1] ?? 0;
    svg.firstChild.style.strokeDashoffset = total + 1 - (marks[lo]?.[1] ?? 0);
    svg.querySelectorAll('rect').forEach((r, i) => r.classList.toggle('on', holes[i].y < edge));
  }

  addEventListener('scroll', reveal, { passive: true });
  addEventListener('resize', draw);
  addEventListener('load', draw);
  draw();
})();
