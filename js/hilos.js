/* Los hilos, los mismos en toda la web: los del mapa, los de la lista,
   el del about y el de la página de un proyecto.

     hilos.wander(a, b)   la curva de a a b, en puntos
     hilos.path(puntos)   el `d` de un <path> con esa curva, ya con su forma

   Lo usa también el build (build/build.mjs), que lo importa para dibujar
   los hilos de la lista sin JavaScript: por eso se cuelga de globalThis y
   no toca el documento si no lo hay.

   La forma: a escalones de GRID px, en horizontal y luego en vertical;
   el escalón casi no se ve, pero se nota que está hecho de píxeles. Para
   que no salgan dientes, el hilo solo cambia de casilla cuando la curva
   ya se ha ido tres cuartos de una: así no va y vuelve entre dos cuando
   pasa justo por el borde. */

globalThis.hilos = (() => {
  const GRID = 2;

  /* La recta de a a b, desviada por dos ondas —una larga, que la curva
     entera, y otra corta, que la hace temblar— que se apagan en los
     extremos, para que salga y llegue justo a a y a b. */
  function wander(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const waves = 0.5 + Math.random() * 1.5;
    const amp = (0.06 + Math.random() * 0.12) * len * (Math.random() < 0.5 ? -1 : 1);
    const wobble = Math.min(14, len * 0.04);
    const phase = Math.random() * Math.PI * 2;
    const n = Math.max(8, Math.ceil(len / 8));
    return Array.from({ length: n + 1 }, (_, k) => {
      const t = k / n;
      const off = Math.sin(Math.PI * t) * (amp * Math.sin(Math.PI * waves * t + phase / 4) + wobble * Math.sin((t * len) / 35 + phase));
      return { x: a.x + dx * t - (dy / len) * off, y: a.y + dy * t + (dx / len) * off };
    });
  }

  /* La curva a pasos de `g` como mucho, para no saltarse casillas. */
  function dense(points, g) {
    return points.flatMap((p, i) => {
      const q = points[i - 1];
      if (!q) return [p];
      const n = Math.max(1, Math.ceil(Math.hypot(p.x - q.x, p.y - q.y) / g));
      return Array.from({ length: n }, (_, k) => ({
        x: q.x + ((p.x - q.x) * (k + 1)) / n,
        y: q.y + ((p.y - q.y) * (k + 1)) / n,
      }));
    });
  }

  /* Las casillas por las que pasa, con la histéresis de tres cuartos. */
  function cells(points, g) {
    const out = [];
    let cx = null;
    let cy = null;
    for (const p of dense(points, g)) {
      const px = p.x / g;
      const py = p.y / g;
      if (cx === null) { cx = Math.round(px); cy = Math.round(py); out.push([cx, cy]); continue; }
      let nx = cx;
      let ny = cy;
      while (px - nx > 0.75) nx += 1;
      while (nx - px > 0.75) nx -= 1;
      while (py - ny > 0.75) ny += 1;
      while (ny - py > 0.75) ny -= 1;
      if (nx === cx && ny === cy) continue;
      /* Si salta en las dos a la vez, primero en horizontal: escalón. */
      if (nx !== cx && ny !== cy) out.push([nx, cy]);
      out.push([nx, ny]);
      cx = nx;
      cy = ny;
    }
    return out;
  }

  function path(points) {
    const g = GRID;
    if (!points.length) return '';
    const c = cells(points, g);
    const steps = [];   // [orden, valor]; dos H o dos V seguidas son una
    for (let i = 1; i < c.length; i++) {
      const [a, b] = [c[i - 1], c[i]];
      const [cmd, v] = b[0] !== a[0] ? ['H', b[0] * g] : ['V', b[1] * g];
      const last = steps[steps.length - 1];
      if (last?.[0] === cmd) last[1] = v;
      else steps.push([cmd, v]);
    }
    return `M${c[0][0] * g} ${c[0][1] * g}${steps.map(([cmd, v]) => cmd + v).join('')}`;
  }

  return { wander, path };
})();
