/* ---------------------------------------------------------------
   Utilidades mínimas de DOM. Sin dependencias.
   --------------------------------------------------------------- */

window.APP = window.APP || {};

window.APP.dom = (function () {
  'use strict';

  /* Crea un elemento.
     el('a', { href: '#', class: 'x', html: 'texto' }, [hijos]) */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);

    Object.keys(attrs || {}).forEach(function (key) {
      var value = attrs[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'html') node.innerHTML = value;
      else if (key === 'text') node.textContent = value;
      else node.setAttribute(key, value === true ? '' : value);
    });

    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });

    return node;
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function qsa(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* Junta clases ignorando vacíos: cls('a', cond && 'b') */
  function cls() {
    return Array.prototype.filter.call(arguments, Boolean).join(' ') || null;
  }

  return { el: el, qs: qs, qsa: qsa, cls: cls };
})();
