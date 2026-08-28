/* ---------------------------------------------------------------
   Galería "montessori": cada imagen se coloca con x / y / width en
   % del ANCHO del contenedor, igual que el original.

   Truco de maquetación: en un elemento posicionado en absoluto los
   márgenes en % se resuelven contra el ancho del bloque contenedor,
   así que `margin-top: y%` reproduce el eje vertical del original y
   `padding-bottom: height%` reserva el alto de la galería.
   --------------------------------------------------------------- */

window.APP = window.APP || {};

window.APP.gallery = (function (dom) {
  'use strict';

  var el = dom.el;

  function figure(item) {
    var img = el('img', {
      src: item.src,
      alt: item.alt || '',
      width: item.w || null,
      height: item.h || null,
      loading: 'lazy'
    });

    var node = el('figure', { class: 'gallery__item' }, [
      item.href ? el('a', { href: item.href }, [img]) : img,
      item.caption ? el('figcaption', { text: item.caption }) : null
    ]);

    if (item.x !== undefined) node.style.left = item.x + '%';
    if (item.width !== undefined) node.style.width = item.width + '%';
    if (item.y !== undefined) node.style.marginTop = item.y + '%';

    return node;
  }

  function render(mount, block) {
    var items = (block && block.items) || [];
    if (!items.length) return;

    mount.className = 'gallery gallery--montessori';
    if (block.height) mount.style.paddingBottom = block.height + '%';

    items.forEach(function (item) {
      mount.appendChild(figure(item));
    });
  }

  return { render: render };
})(window.APP.dom);
