/* El hilo de la página de un proyecto, de su color.

   Baja por toda la página ondulando de lado a lado, por encima de las
   fotos, con dos ondas —una larga y otra más corta— para que no se
   repita. Va a escalones de STEP px, como los hilos del mapa, y se dibuja
   según se baja. */

(() => {
  const root = document.documentElement;
  if (!document.querySelector('.project article')) return;

  const STEP = 3;   // la casilla de la rejilla, en px
  const snap = (v) => Math.round(v / STEP) * STEP;
  let svg = null;
  let marks = [];   // [y, largo del hilo hasta ahí], para dibujarlo según se baja

  function draw() {
    svg?.remove();
    const W = root.clientWidth;
    const H = root.scrollHeight;
    const p1 = Math.random() * 6;
    const p2 = Math.random() * 6;

    /* A pasos de una casilla en vertical: en cada uno, el hilo va a su x
       en horizontal y baja una. */
    let d = '';
    let last = null;
    let len = 0;
    marks = [];
    for (let y = 0; y <= H; y += STEP) {
      const x = snap(W / 2 + (W / 2 - 24) * Math.sin(y / 500 + p1) * (0.75 + 0.25 * Math.sin(y / 230 + p2)));
      d += last === null ? `M${x} ${y}` : `${x !== last ? `H${x}` : ''}V${y}`;
      len += last === null ? 0 : Math.abs(x - last) + STEP;
      marks.push([y, len]);
      last = x;
    }

    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hilo');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path d="${d}" stroke-dasharray="${len + 1}"/>`;
    document.body.prepend(svg);
    reveal();
  }

  /* El hilo llega hasta el fondo de la pantalla. */
  function reveal() {
    if (!svg) return;
    const i = Math.min(marks.length - 1, Math.floor((scrollY + innerHeight) / STEP));
    svg.firstChild.style.strokeDashoffset = marks[marks.length - 1][1] + 1 - marks[i][1];
  }

  addEventListener('scroll', reveal, { passive: true });
  addEventListener('resize', draw);
  addEventListener('load', draw);
  draw();
})();
