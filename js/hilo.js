/* El hilo de la página de un proyecto, de su color.

   Baja por toda la página ondulando de lado a lado, por encima de las
   fotos, con dos ondas —una larga y otra más corta— para que no se
   repita. La forma (escalones, diagonal…) la pone js/hilos.js, como a
   todos los hilos de la web. Se dibuja según se baja. */

(() => {
  const root = document.documentElement;
  if (!document.querySelector('.project article')) return;

  let svg = null;
  let curve = [];   // los puntos, cada 3 px de alto
  const p1 = Math.random() * 6;
  const p2 = Math.random() * 6;

  function draw() {
    svg?.remove();
    const W = root.clientWidth;
    const H = root.scrollHeight;
    curve = [];
    for (let y = 0; y <= H; y += 3) {
      curve.push({ x: W / 2 + (W / 2 - 24) * Math.sin(y / 500 + p1) * (0.75 + 0.25 * Math.sin(y / 230 + p2)), y });
    }
    svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'hilo');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<path d="${hilos.path(curve)}"/>`;
    document.body.prepend(svg);
    const total = svg.firstChild.getTotalLength();
    svg.firstChild.style.strokeDasharray = total + 1;
    svg.total = total;
    reveal();
  }

  /* El hilo llega hasta el fondo de la pantalla: la parte del largo que
     toca a esa altura de la página. */
  function reveal() {
    if (!svg) return;
    const shown = Math.min(1, (scrollY + innerHeight) / root.scrollHeight);
    svg.firstChild.style.strokeDashoffset = (svg.total + 1) * (1 - shown);
  }

  addEventListener('scroll', reveal, { passive: true });
  addEventListener('resize', draw);
  addEventListener('load', draw);
  addEventListener('pruebas', (e) => { if (e.detail === 'hilos') draw(); });
  draw();
})();
