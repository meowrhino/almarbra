/* El hilo de una lista: cose las portadas en su orden, en zigzag, de una
   a la siguiente. Cada tramo, del color del proyecto del que sale; la
   forma, la de todos los hilos (js/hilos.js).

   Se va dibujando al bajar: cada tramo llega hasta el 85 % de la
   pantalla (EDGE), con un poco de retraso (la transición del CSS), así
   que al abrir se cose solo lo que se ve. Como el de un proyecto, va dos
   veces: una debajo de las fotos, entera, y otra encima, apagada. */

(() => {
  const root = document.documentElement;
  const rows = [...document.querySelectorAll('#lista .row')];
  if (rows.length < 2) return;
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EDGE = 0.85;

  const NS = 'http://www.w3.org/2000/svg';
  const layers = ['debajo', 'encima'].map((name) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', `hilo cose ${name}`);
    svg.setAttribute('aria-hidden', 'true');
    document.body.prepend(svg);
    return svg;
  });

  let spans = [];   // { y0, y1, paths }

  /* El centro de cada portada, en la página (no en la pantalla). */
  const center = (row) => {
    const r = row.querySelector('.pic').getBoundingClientRect();
    return { x: r.left + scrollX + r.width / 2, y: r.top + scrollY + r.height / 2 };
  };

  function sew() {
    for (const svg of layers) {
      svg.replaceChildren();
      svg.setAttribute('width', root.clientWidth);
      svg.setAttribute('height', root.scrollHeight);
    }
    const points = rows.map(center);
    spans = points.slice(1).map((b, i) => {
      const a = points[i];
      const d = hilos.path(hilos.wander(a, b));
      const paths = layers.map((svg) => {
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('pathLength', '1');
        path.style.setProperty('--c', rows[i].style.getPropertyValue('--c'));
        svg.append(path);
        return path;
      });
      return { y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y), paths };
    });
    draw();
  }

  /* Cuánto de cada tramo se ve: hasta donde llega el borde. */
  function draw() {
    const edge = scrollY + innerHeight * EDGE;
    for (const { y0, y1, paths } of spans) {
      const f = still ? 1 : Math.max(0, Math.min(1, (edge - y0) / Math.max(1, y1 - y0)));
      for (const path of paths) path.style.strokeDashoffset = 1 - f;
    }
  }

  let frame = 0;
  addEventListener('scroll', () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); }, { passive: true });
  addEventListener('resize', sew);
  addEventListener('load', sew);   // por si las letras o las fotos mueven algo al llegar
  sew();
})();
