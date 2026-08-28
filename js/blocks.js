/* ---------------------------------------------------------------
   Renderiza el árbol de bloques de una página.

   row      -> fila de la rejilla de 12 columnas
   gallery  -> slideshow o montessori (delega en su módulo)
   image    -> imagen suelta, normalmente enlace a un proyecto
   text     -> pie o párrafo
   --------------------------------------------------------------- */

window.APP = window.APP || {};

window.APP.blocks = (function (dom, APP) {
  'use strict';

  var el = dom.el;
  var COLUMNS = 12;

  function image(block) {
    var img = el('img', {
      src: block.src,
      alt: block.alt || '',
      width: block.w || null,
      height: block.h || null,
      loading: 'lazy'
    });

    return el('figure', { class: 'figure' }, [
      block.href ? el('a', { href: block.href }, [img]) : img
    ]);
  }

  function text(block) {
    return el('p', { class: 'caption', text: block.text });
  }

  function gallery(block) {
    var mount = el('section', {});
    if (block.mode === 'slideshow') APP.slideshow.render(mount, block);
    else APP.gallery.render(mount, block);
    return mount;
  }

  function row(block) {
    var cols = (block.cols || []).map(function (col) {
      var node = el('div', { class: 'col' }, (col.blocks || []).map(render));
      node.style.width = ((col.span / COLUMNS) * 100).toFixed(4) + '%';
      return node;
    });
    return el('div', { class: 'row' }, cols);
  }

  function render(block) {
    if (!block) return null;
    if (block.type === 'row') return row(block);
    if (block.type === 'gallery') return gallery(block);
    if (block.type === 'image') return image(block);
    if (block.type === 'text') return text(block);
    return null;
  }

  function mountAll(mount, page) {
    var blocks = (page && page.blocks) || [];
    blocks.forEach(function (block) {
      var node = render(block);
      if (node) mount.appendChild(node);
    });
  }

  return { render: render, mountAll: mountAll };
})(window.APP.dom, window.APP);
