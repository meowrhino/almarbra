/* El selector de idioma del centro de la barra. El texto que tiene
   traducción ya está en la página en todos los idiomas (data-l, ver
   build/build.mjs) y el CSS enseña el de data-idioma en <html>; esto
   solo lo cambia, lo marca y lo recuerda en este navegador. */

(() => {
  const root = document.documentElement;
  const box = document.querySelector('.idiomas');
  if (!box) return;

  const paint = () => {
    root.lang = root.dataset.idioma;
    for (const b of box.children) b.setAttribute('aria-pressed', b.value === root.dataset.idioma);
  };

  box.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    root.dataset.idioma = b.value;
    try { localStorage.setItem('almarbra-idioma', b.value); } catch { /* sin almacenamiento: vale para esta página */ }
    paint();
  });

  paint();
})();
