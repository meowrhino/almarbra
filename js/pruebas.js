/* PRUEBAS: un panel para elegir, de cada cosa, qué variante se ve —el
   fondo, la lista, la transición, el fondo de los proyectos y cuánto se
   mezclan los proyectos en el mapa— y verlas
   en la web de verdad. Se abre con ?pruebas en la dirección y se cierra
   con la ×; lo elegido se recuerda en este navegador. La variante se
   pone en <html> (data-fondo, data-lista…) y el CSS hace el resto.

   También monta el hilo de fondo de los proyectos, que es lo único de
   las variantes que necesita JavaScript fuera de la portada.

   Cuando se decida, este archivo se va. */

(() => {
  const root = document.documentElement;
  const KEY = 'almarbra-pruebas';
  const OPTIONS = {
    fondo: ['blanco', 'negro'],
    lista: ['franjas', 'indice', 'hilo', 'muestrario'],
    transicion: ['lineas', 'telar', 'ovillo'],
    proyecto: ['liso', 'tinte', 'trama', 'hilo'],
    mezcla: ['0', '25', '50', '75', '100'],
  };

  const store = (key, value) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch { /* sin almacenamiento: vale para esta página */ }
  };
  const stored = (key) => { try { return localStorage.getItem(key); } catch { return null; } };

  /* ── el hilo de fondo de un proyecto ───────────────────────────── */

  /* Baja por toda la página de lado a lado, con dos ondas, a escalones
     de 4 px. Son dos copias: una por debajo de la columna, que la tapa,
     y otra por encima, recortada a franjas de la columna, una sí y una
     no: así el hilo entra y sale de la tela como una costura. Se va
     dibujando según se baja. */
  const BAND = 220;
  let svgs = [];
  function hilo() {
    const article = document.querySelector('.project article');
    if (root.dataset.proyecto !== 'hilo' || !article) return;
    for (const old of svgs) old.remove();
    const W = root.clientWidth;
    const H = root.scrollHeight;
    const p1 = Math.random() * 6;
    const p2 = Math.random() * 6;
    const snap = (v) => Math.round(v / 4) * 4;
    let d = '';
    let last = null;
    for (let y = 0; y <= H; y += 12) {
      const x = snap(W / 2 + (W / 2 - 24) * Math.sin(y / 500 + p1) * (0.75 + 0.25 * Math.sin(y / 230 + p2)));
      const sy = snap(y);
      d += last !== null ? `${x !== last ? `H${x}` : ''}V${sy}` : `M${x} ${sy}`;
      last = x;
    }
    const col = article.getBoundingClientRect();
    const top = col.top + scrollY;
    const bands = Array.from({ length: Math.ceil(col.height / BAND) }, (_, k) =>
      k % 2 ? `<rect x="${col.left}" y="${top + k * BAND}" width="${col.width}" height="${BAND}"/>` : '').join('');
    svgs = ['', 'encima'].map((over) => {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', `fondo-hilo ${over}`);
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
  addEventListener('resize', hilo);
  addEventListener('load', hilo);
  hilo();

  /* ── el panel ──────────────────────────────────────────────────── */

  if (new URLSearchParams(location.search).has('pruebas')) store(`${KEY}-panel`, '1');
  if (!stored(`${KEY}-panel`)) return;

  const panel = document.createElement('div');
  panel.className = 'pruebas';
  panel.innerHTML = Object.entries(OPTIONS).map(([key, values]) =>
    `<div><b>${key}</b>${values.map((v) => `<button type="button" data-k="${key}" data-v="${v}">${v}</button>`).join('')}</div>`
  ).join('') + '<button type="button" class="x" aria-label="cerrar el panel">×</button>';
  document.body.append(panel);

  const paint = () => {
    for (const b of panel.querySelectorAll('[data-k]')) b.setAttribute('aria-pressed', root.dataset[b.dataset.k] === b.dataset.v);
  };
  paint();

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('x')) { store(`${KEY}-panel`, null); panel.remove(); return; }
    root.dataset[b.dataset.k] = b.dataset.v;
    store(KEY, JSON.stringify(Object.fromEntries(Object.keys(OPTIONS).map((k) => [k, root.dataset[k]]))));
    paint();
    if (b.dataset.k === 'proyecto') hilo();
    if (b.dataset.k === 'mezcla') dispatchEvent(new Event('mezcla'));
  });
})();
