/* Los hilos de las listas (textil, foto): de la foto de cada proyecto
   sale un hilo de su color hasta la foto del siguiente, y de esa, otro
   del color del siguiente. Sale y entra por el lado de dentro: el
   derecho de una foto que está a la izquierda, el izquierdo de una que
   está a la derecha, a media altura. La forma, la de todos (js/hilos.js); se cose
   solo, como los del mapa (css/style.css), cuando la foto a la que va
   asoma en pantalla: así van saliendo al bajar. */

(() => {
  const lists = [...document.querySelectorAll('.cat ol')];
  if (!lists.length) return;

  function sew(ol) {
    ol.querySelector('.threads')?.remove();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'threads');
    svg.setAttribute('aria-hidden', 'true');
    const box = ol.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    const rows = [...ol.querySelectorAll('.row')];
    const at = (row) => {
      const r = row.querySelector('.pic').getBoundingClientRect();
      const inner = r.left + r.width / 2 < box.left + box.width / 2 ? r.right : r.left;
      return { x: inner - box.left, y: r.top + r.height / 2 - box.top };
    };
    const seen = new IntersectionObserver((hits) => hits.forEach((h) => {
      if (!h.isIntersecting) return;
      h.target.thread.classList.add('cosido');
      seen.unobserve(h.target);
    }), { rootMargin: '0px 0px -15% 0px' });
    rows.slice(0, -1).forEach((row, i) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', hilos.path(hilos.wander(at(row), at(rows[i + 1]))));
      path.setAttribute('pathLength', '1');
      path.setAttribute('stroke', row.style.getPropertyValue('--c'));
      svg.append(path);
      rows[i + 1].thread = path;
      seen.observe(rows[i + 1]);
    });
    ol.append(svg);   // al final: delante cambiaría qué <li> es par y cuál impar (el zigzag)
  }

  lists.forEach(sew);
  let timer;
  addEventListener('resize', () => { clearTimeout(timer); timer = setTimeout(() => lists.forEach(sew), 200); });
})();
