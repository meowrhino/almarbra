/* ---------------------------------------------------------------
   Arranque. Lee data-page del <body> y monta la cabecera más los
   bloques de contenido de esa página.

   <div data-header>   -> título + navegación
   <main data-content> -> bloques de SITE.pages[<data-page>]

   Si un montaje falla, el resto de la página sigue funcionando.
   --------------------------------------------------------------- */

(function (APP, SITE) {
  'use strict';

  var dom = APP.dom;

  function safely(label, task) {
    try {
      task();
    } catch (error) {
      console.error('[app] fallo montando ' + label, error);
    }
  }

  function start() {
    var page = document.body.getAttribute('data-page') || 'home';

    var header = dom.qs('[data-header]');
    if (header) {
      safely('header', function () {
        APP.header.render(header, {
          page: page,
          title: SITE.title,
          home: SITE.home,
          nav: SITE.nav || []
        });
      });
    }

    var content = dom.qs('[data-content]');
    if (content) {
      safely('content:' + page, function () {
        APP.blocks.mountAll(content, (SITE.pages || {})[page]);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window.APP, window.SITE || {});
