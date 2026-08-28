/* Cabecera: título del sitio y navegación.
   La entrada activa se marca según el id de la página que se está
   construyendo. */

import { tag, escape } from './html.mjs';

function navItem(item, pageId) {
  const isCurrent = item.id === pageId;
  const isDisabled = !item.href || (item.disabledOn || []).includes(pageId);
  // las etiquetas del original llevan espacios duros; van tal cual
  const label = item.label;

  if (isCurrent) return tag('li', { class: 'is-current' }, label);
  if (isDisabled) return tag('li', {}, tag('span', { class: 'is-disabled' }, label));

  return tag(
    'li',
    { class: item.muted ? 'is-muted' : null },
    tag(
      'a',
      {
        href: item.href,
        target: item.external ? '_blank' : null,
        rel: item.external ? 'noopener' : null,
      },
      label
    )
  );
}

export function renderHeader(site, pageId) {
  const isHome = pageId === 'home';

  const title = tag(
    'h1',
    { class: 'site-title' },
    tag(
      'a',
      { href: site.home, class: isHome ? null : 'is-current', 'aria-current': isHome ? 'page' : null },
      escape(site.title)
    )
  );

  const list = tag('ul', {}, site.nav.map((item) => navItem(item, pageId)));
  const nav = tag('nav', { class: 'site-nav', 'aria-label': 'Principal' }, list);

  return title + '\n' + nav;
}
