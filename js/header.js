/* ---------------------------------------------------------------
   Pinta título + navegación a partir de SITE.title y SITE.nav.
   Marca como activa la entrada cuyo id coincide con data-page.

   Monta sobre [data-header]. El marcado resultante es idéntico al
   que había escrito a mano en cada .html: no cambia nada de diseño.
   --------------------------------------------------------------- */

window.APP = window.APP || {};

window.APP.header = (function (dom) {
  'use strict';

  var el = dom.el;

  function navItem(item, page) {
    var isCurrent = item.id === page;
    var isDisabled = !item.href || (item.disabledOn || []).indexOf(page) !== -1;

    /* página actual: texto plano, sin enlace */
    if (isCurrent) {
      return el('li', { class: 'is-current', html: item.label });
    }

    /* entrada sin destino: span apagado */
    if (isDisabled) {
      return el('li', {}, [el('span', { class: 'is-disabled', html: item.label })]);
    }

    var link = el('a', {
      href: item.href,
      html: item.label,
      target: item.external ? '_blank' : null,
      rel: item.external ? 'noopener' : null
    });

    return el('li', { class: item.muted ? 'is-muted' : null }, [link]);
  }

  function render(mount, config) {
    var page = config.page;
    var isHome = page === 'home';

    var title = el('h1', { class: 'site-title' }, [
      el('a', {
        href: config.home,
        text: config.title,
        class: isHome ? null : 'is-current'
      })
    ]);

    var list = el('ul', {}, config.nav.map(function (item) {
      return navItem(item, page);
    }));

    var nav = el('nav', { class: 'site-nav' }, [list]);

    mount.appendChild(title);
    mount.appendChild(nav);
  }

  return { render: render };
})(window.APP.dom);
