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
 * @param {number}  o.depth    carpetas de profundidad respecto a la raíz
 * @param {string[]} o.styles  hojas de estilo (rutas desde la raíz)
 * @param {string[]} o.scripts scripts (rutas desde la raíz)
 */
export function layout({
  site, title, pageId, bodyClass, header, content, assets = {}, depth = 0,
  styles = ['css/style.css'], scripts = ['js/slideshow.js'],
}) {
  // ?v=<hash> para que un deploy no deje a nadie con el CSS viejo en caché
  const base = '../'.repeat(depth);
  const versioned = (path) => `${base}${path}${assets[path] ? `?v=${assets[path]}` : ''}`;
  const links = styles.map((s) => `<link rel="stylesheet" href="${versioned(s)}">`).join('\n');
  const tags = scripts.map((s) => `<script src="${versioned(s)}" defer></script>`).join('\n');

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
${links}
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

${tags}
</body>
</html>
`;
}
