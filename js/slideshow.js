/* ---------------------------------------------------------------
   Controlador de slideshow.

   El HTML ya viene con todas las diapositivas puestas por el build;
   esto solo añade comportamiento encima: flechas, contador, autoplay,
   teclado y arrastre. Sin JS las fotos se ven igual, en columna.

   Se activa sobre cualquier [data-slideshow] de la página.
   --------------------------------------------------------------- */

(function () {
  'use strict';

  var SWIPE_MIN = 40;        // px de arrastre para pasar de imagen
  var FADE_MS = 500;         // debe cuadrar con la transición del CSS

  var ARROWS = {
    prev: { points: '21,29 10,18 21,7', label: 'Anterior' },
    next: { points: '15,7 26,18 15,29', label: 'Siguiente' }
  };

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (attrs[key] !== null) node.setAttribute(key, attrs[key]);
    });
    if (html) node.innerHTML = html;
    return node;
  }

  function arrow(direction) {
    var spec = ARROWS[direction];
    return el('button', {
      type: 'button',
      class: 'slideshow__arrow slideshow__arrow--' + direction,
      'aria-label': spec.label
    }, '<svg viewBox="0 0 36 36" aria-hidden="true"><polyline points="' + spec.points + '"/></svg>');
  }

  function counter(total) {
    var node = el('div', { class: 'slideshow__counter', 'aria-hidden': 'true' },
                  '<span data-current>1</span> / <span data-total>' + total + '</span>');
    return node;
  }

  function prefersReducedMotion() {
    return window.matchMedia &&
           window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function init(root) {
    var slides = [].slice.call(root.querySelectorAll('.slide'));
    if (slides.length < 2) return;      // con una sola foto no hay nada que controlar

    root.appendChild(arrow('prev'));
    root.appendChild(arrow('next'));
    root.appendChild(counter(slides.length));
    root.classList.add('is-interactive');

    var current = root.querySelector('[data-current]');
    var delay = parseInt(root.getAttribute('data-autoplay'), 10) || 0;
    if (prefersReducedMotion()) delay = 0;

    var index = slides.findIndex(function (s) { return s.classList.contains('is-active'); });
    if (index < 0) index = 0;
    var timer = null;

    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle('is-active', i === index);
        slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      });
      if (current) current.textContent = String(index + 1);
    }

    function restart() {
      clearInterval(timer);
      if (delay) timer = setInterval(function () { show(index + 1); }, delay);
    }

    function go(step) {
      show(index + step);
      restart();
    }

    root.querySelector('.slideshow__arrow--prev').addEventListener('click', function () { go(-1); });
    root.querySelector('.slideshow__arrow--next').addEventListener('click', function () { go(1); });

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

    show(index);
    restart();
  }

  function start() {
    [].forEach.call(document.querySelectorAll('[data-slideshow]'), function (root) {
      try {
        init(root);
      } catch (error) {
        console.error('[slideshow] no se pudo activar', error);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
