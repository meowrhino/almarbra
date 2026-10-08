/* El hilo de fondo de la página de un proyecto, de su color.

   Baja por toda la página de lado a lado, con dos ondas, a escalones de
   3 px como los hilos del mapa. Son dos copias: una por debajo de la
   columna, que la tapa, y otra por encima, recortada a franjas de la
   columna, una sí y una no: así el hilo entra y sale de la tela como
   una costura. Se va dibujando según se baja. */

(() => {
  const root = document.documentElement;
  const article = document.querySelector('.project article');
  if (!article) return;

  const STEP = 3;     // la casilla de la rejilla, en px
  const BAND = 220;   // alto de cada tramo por encima o por debajo
  const snap = (v) => Math.round(v / STEP) * STEP;
  let svgs = [];

  function draw() {
    for (const old of svgs) old.remove();
    const W = root.clientWidth;
    const H = root.scrollHeight;
    const p1 = Math.random() * 6;
    const p2 = Math.random() * 6;

    /* A pasos de una casilla en vertical: en cada uno, el hilo va a su x
       en horizontal y baja una. */
    let d = '';
    let last = null;
    for (let y = 0; y <= H; y += STEP) {
      const x = snap(W / 2 + (W / 2 - 24) * Math.sin(y / 500 + p1) * (0.75 + 0.25 * Math.sin(y / 230 + p2)));
      d += last === null ? `M${x} ${y}` : `${x !== last ? `H${x}` : ''}V${y}`;
      last = x;
    }

    const col = article.getBoundingClientRect();
    const top = col.top + scrollY;
    const bands = Array.from({ length: Math.ceil(col.height / BAND) }, (_, k) =>
      k % 2 ? `<rect x="${col.left}" y="${top + k * BAND}" width="${col.width}" height="${BAND}"/>` : '').join('');

    svgs = ['', 'encima'].map((over) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', `hilo ${over}`);
      svg.setAttribute('width', W);
      svg.setAttribute('height', H);
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = over
        ? `<clipPath id="costura">${bands}</clipPath><path pathLength="1" clip-path="url(#costura)" d="${d}"/>`
        : `<path pathLength="1" d="${d}"/>`;
      document.body.prepend(svg);
      return svg;
    });
    reveal();
  }

  function reveal() {
    const shown = Math.min(1, (scrollY + innerHeight) / root.scrollHeight);
    for (const svg of svgs) svg.lastChild.style.strokeDashoffset = 1 - shown;
  }

  addEventListener('scroll', reveal, { passive: true });
  addEventListener('resize', draw);
  addEventListener('load', draw);
  draw();
})();
