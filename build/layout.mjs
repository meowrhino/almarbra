/* Esqueleto del documento. Todo lo que se repite en las 8 páginas
   vive aquí y en ningún otro sitio. */

import { escapeAttr, escape } from './html.mjs';

const FONT = 'https://fonts.googleapis.com/css2?family=Karla:wght@200;300;400;700&display=swap';

/**
 * @param {object}  o
 * @param {string}  o.title    contenido de <title>
 * @param {string}  o.pageId   id de la página (va en data-page)
 * @param {string}  o.bodyClass clase extra del <body>
 * @param {string}  o.header   HTML de la cabecera
 * @param {string}  o.content  HTML del contenido
 */
export function layout({ site, title, pageId, bodyClass, header, content, assets = {} }) {
  // ?v=<hash> para que un deploy no deje a nadie con el CSS viejo en caché
  const css = `css/style.css${assets.css ? `?v=${assets.css}` : ''}`;
  const js = `js/slideshow.js${assets.js ? `?v=${assets.js}` : ''}`;

  return `<!DOCTYPE html>
<html lang="${escapeAttr(site.lang || 'es')}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escapeAttr(site.description || '')}">
${site.noindex ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<script>document.documentElement.className = 'js';</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${FONT}">
<link rel="stylesheet" href="${css}">
</head>
<body data-page="${escapeAttr(pageId)}"${bodyClass ? ` class="${escapeAttr(bodyClass)}"` : ''}>

<div class="page">
  <header class="site-header">
${header}
  </header>

  <main class="content">
${content}
  </main>
</div>

<script src="${js}" defer></script>
</body>
</html>
`;
}
