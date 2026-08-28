/* ---------------------------------------------------------------
   Datos globales: título y navegación (tal como están en el original).
   Se cargan como script clásico para que la web funcione también
   abriendo los .html a pelo (file://), sin servidor.
   --------------------------------------------------------------- */

window.SITE = window.SITE || {};

window.SITE.title = 'Almudena González';
window.SITE.home = 'index.html';

/* Cada entrada:
   id         -> identificador (coincide con data-page de cada .html)
   label      -> texto visible
   href       -> destino
   muted      -> true = color rosado apagado
   external   -> true = abre en pestaña nueva
   disabledOn -> ids de página donde se muestra sin enlace         */
window.SITE.nav = [
  { id: 'textile-art',    label: 'Textile Art',          href: 'textile-art.html' },
  { id: 'fashion',        label: 'Fashion',              href: 'fashion.html', muted: true },
  { id: 'collabs',        label: 'Collabs',              href: 'collabs.html' },
  { id: 'personal-works', label: 'Personal&nbsp; works', href: 'personal-works.html', disabledOn: ['home'] },
  { id: 'instagram',      label: 'Instagram',            href: 'https://www.instagram.com/almarbra_/', external: true },
  { id: 'contact',        label: 'Contact',              href: 'contact.html' }
];
