/* La forma de los hilos, la misma en toda la web: los del mapa, los de la
   lista, el de la página de un proyecto y las líneas de la transición. Se
   le da la curva en puntos y devuelve el `d` de un <path>.

   Para que no salgan dientes, el hilo solo cambia de casilla cuando la
   curva ya se ha ido tres cuartos de una: así no va y vuelve entre dos
   cuando pasa justo por el borde.

   PRUEBAS: cuatro formas, la de data-hilos en <html> (js/pruebas.js):
     escalera  a escalones de 3 px, en horizontal y luego en vertical
     fina      lo mismo a 2 px: el escalón casi no se ve
     diagonal  de casilla en casilla de 3 px, pero cada escalón suelto se
               corta en diagonal: se ve pixel, sin dientes
     liso      la curva tal cual, sin rejilla */

window.hilos = (() => {
  const GRID = { escalera: 3, fina: 2, diagonal: 3, liso: 0 };
  const mode = () => {
    const m = document.documentElement.dataset.hilos;
    return m in GRID ? m : 'escalera';
  };

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

  function path(points, m = mode()) {
    const g = GRID[m];
    if (!points.length) return '';
    if (!g) return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
    const c = cells(points, g);
    let d = `M${c[0][0] * g} ${c[0][1] * g}`;
    for (let i = 1; i < c.length; i++) {
      const [a, b, n] = [c[i - 1], c[i], c[i + 1]];
      /* diagonal: un escalón de una casilla en cada sentido (a → b → n,
         con b en la esquina) se corta en diagonal de a a n. */
      if (m === 'diagonal' && n && Math.abs(n[0] - a[0]) === 1 && Math.abs(n[1] - a[1]) === 1) {
        d += `L${n[0] * g} ${n[1] * g}`;
        i += 1;
        continue;
      }
      d += b[0] !== a[0] ? `H${b[0] * g}` : `V${b[1] * g}`;
    }
    return d;
  }

  return { path, mode };
})();
