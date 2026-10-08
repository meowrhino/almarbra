/* PRUEBAS: un panel para elegir, de lo que aún se está decidiendo, qué
   variante se ve, en la web de verdad. Se abre con ?pruebas en la
   dirección y se cierra con la ×; lo elegido se recuerda en este
   navegador. Cada elección va a <html> (data-hilos, data-transicion…) y
   se avisa con el evento `pruebas` a quien tenga que rehacer algo.

     hilos       la forma de todos los hilos (js/hilos.js)
     transicion  cómo se tapa y se destapa al cambiar de página
                 (js/transicion.js)

   Lo que no se toque, lo que haya por defecto. Cuando se decida, este archivo se va. */

(() => {
  const root = document.documentElement;
  const KEY = 'almarbra-pruebas';
  const OPTIONS = {
    hilos: ['escalera', 'fina', 'diagonal', 'liso'],
    transicion: ['circulo', 'barrido', 'puntos', 'pixeles', 'lineas'],
  };
  const DEFAULTS = { hilos: 'escalera', transicion: 'circulo' };

  const store = (key, value) => {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch { /* sin almacenamiento: vale para esta página */ }
  };
  const stored = (key) => { try { return localStorage.getItem(key); } catch { return null; } };

  if (new URLSearchParams(location.search).has('pruebas')) store(`${KEY}-panel`, '1');
  if (!stored(`${KEY}-panel`)) return;

  const panel = document.createElement('div');
  panel.className = 'pruebas';
  panel.innerHTML = Object.entries(OPTIONS).map(([key, values]) =>
    `<div><b>${key}</b>${values.map((v) => `<button type="button" data-k="${key}" data-v="${v}">${v}</button>`).join('')}</div>`
  ).join('') + '<button type="button" class="x" aria-label="cerrar el panel">×</button>';
  document.body.append(panel);

  const paint = () => {
    for (const b of panel.querySelectorAll('[data-k]')) {
      b.setAttribute('aria-pressed', (root.dataset[b.dataset.k] ?? DEFAULTS[b.dataset.k]) === b.dataset.v);
    }
  };
  paint();

  panel.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('x')) { store(`${KEY}-panel`, null); panel.remove(); return; }
    root.dataset[b.dataset.k] = b.dataset.v;
    store(KEY, JSON.stringify(Object.fromEntries(Object.keys(OPTIONS).filter((k) => root.dataset[k]).map((k) => [k, root.dataset[k]]))));
    paint();
    dispatchEvent(new CustomEvent('pruebas', { detail: b.dataset.k }));
  });
})();
