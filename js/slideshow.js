/* ---------------------------------------------------------------
   Slideshow: construye el marcado desde datos y lo controla.
   Autoplay opcional, flechas, teclado, arrastre/swipe, contador y
   carga perezosa de la siguiente imagen.
   --------------------------------------------------------------- */

window.APP = window.APP || {};

window.APP.slideshow = (function (dom) {
  'use strict';

  var el = dom.el;
  var qs = dom.qs;
  var qsa = dom.qsa;

  var SWIPE_MIN = 40; // px mínimos de arrastre para cambiar de imagen

  var ARROWS = {
    prev: '21,29 10,18 21,7',
    next: '15,7 26,18 15,29'
  };

  function arrow(direction, label) {
    return el('button', {
      type: 'button',
      class: 'slideshow__arrow slideshow__arrow--' + direction,
      'aria-label': label,
      html: '<svg viewBox="0 0 36 36" aria-hidden="true"><polyline points="' +
            ARROWS[direction] + '"/></svg>'
    });
  }

  function slide(item, index) {
    /* solo la primera se carga de entrada; el resto va en data-src */
    var img = el('img', {
      src: index === 0 ? item.src : null,
      'data-src': index === 0 ? null : item.src,
      width: item.w || null,
      height: item.h || null,
      alt: item.alt || ''
    });

    return el('figure', { class: 'slide' }, [
      img,
      item.caption ? el('figcaption', { text: item.caption }) : null
    ]);
  }

  function build(mount, items) {
    var track = el('div', { class: 'slideshow__track' }, items.map(slide));

    var counter = el('div', { class: 'slideshow__counter' }, [
      el('span', { 'data-current': true, text: '1' }),
      document.createTextNode(' / '),
      el('span', { 'data-total': true, text: String(items.length) })
    ]);

    mount.appendChild(arrow('prev', 'Anterior'));
    mount.appendChild(track);
    mount.appendChild(arrow('next', 'Siguiente'));
    mount.appendChild(counter);
  }

  function control(root, options) {
    var slides = qsa('.slide', root);
    if (!slides.length) return;

    var current = qs('[data-current]', root);
    var delay = options.autoplay || 0;
    var index = 0;
    var timer = null;

    function preload(position) {
      var target = slides[(position + slides.length) % slides.length];
      var img = target && qs('img[data-src]', target);
      if (!img) return;
      img.src = img.getAttribute('data-src');
      img.removeAttribute('data-src');
    }

    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (node, i) {
        node.classList.toggle('is-active', i === index);
      });
      if (current) current.textContent = String(index + 1);
      preload(index + 1);
    }

    function restart() {
      clearInterval(timer);
      if (!delay) return;
      timer = setInterval(function () { show(index + 1); }, delay);
    }

    function go(step) {
      show(index + step);
      restart();
    }

    qs('.slideshow__arrow--prev', root).addEventListener('click', function () { go(-1); });
    qs('.slideshow__arrow--next', root).addEventListener('click', function () { go(1); });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    });

    var startX = null;
    root.addEventListener('pointerdown', function (event) { startX = event.clientX; });
    root.addEventListener('pointerup', function (event) {
      if (startX === null) return;
      var distance = event.clientX - startX;
      startX = null;
      if (Math.abs(distance) > SWIPE_MIN) go(distance < 0 ? 1 : -1);
    });

    /* no gastar ciclos con la pestaña en segundo plano */
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) clearInterval(timer);
      else restart();
    });

    show(0);
    preload(1);
    restart();
  }

  function render(mount, block) {
    var items = (block && block.items) || [];
    if (!items.length) return;

    mount.className = dom.cls('slideshow', block.full && 'slideshow--full');
    build(mount, items);
    control(mount, block);
  }

  return { render: render };
})(window.APP.dom);
