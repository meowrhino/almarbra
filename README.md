# almarbra

Clon en HTML / CSS / JS vainilla de **amargor.es** (portfolio de Almudena González,
originalmente en Cargo.site), pensado como base de trabajo para rehacer el sitio.

Se abre con doble clic en `index.html`. No necesita servidor ni build.

## Estructura

```
index.html            home (slideshow)
textile-art.html      TEXTILE ART
fashion.html          EDITORIALES
collabs.html          COLLABS
personal-works.html   PERSONAL WORKS  (vacía también en el original)
overseas.html         proyecto enlazado desde Textile Art
corporea.html         proyecto enlazado desde Textile Art
contact.html          contacto y CV

data/site.js          título y navegación
data/pages.js         contenido de cada página (bloques)

js/dom.js             utilidades: el() / qs() / qsa()
js/header.js          título + navegación, marca la página activa
js/slideshow.js       slideshow: autoplay, flechas, teclado, swipe
js/gallery.js         galería montessori (posición libre)
js/blocks.js          renderiza el árbol de bloques
js/app.js             arranque

css/style.css         todo el estilo
img/*.webp            37 imágenes
```

Cada `.html` es solo un esqueleto: `data-page` en el `<body>`, un `<div data-header>`
y un `<main data-content>`. Todo lo demás sale de `data/`.

## Cómo cambiar contenido

Todo está en `data/pages.js`, indexado por el `data-page` de cada archivo.
Tipos de bloque:

```js
{ type: 'gallery', mode: 'slideshow', items: [ { src, w, h } ] }
{ type: 'gallery', mode: 'montessori', height: 268.62, items: [ { src, w, h, x, y, width } ] }
{ type: 'image', src, w, h, href }
{ type: 'text',  text }
{ type: 'row',   cols: [ { span, blocks } ] }        // rejilla de 12
```

En las galerías *montessori*, `x`, `y` y `width` van en **% del ancho del contenedor**
(igual que en Cargo). El CSS lo reproduce con `margin-top` en % sobre elementos
absolutos, que se resuelve contra el ancho, y reserva el alto con `padding-bottom`.

La navegación se toca en un solo sitio, `data/site.js`.

## Imágenes

Descargadas del sitio original y convertidas a WebP (ancho máx. 2000 px, calidad 80):
148 MB de originales → 7,1 MB.

Los nombres siguen `<pagina>-NN.webp` en el orden en que aparecen.

**Son fotografías de la autora.** Están aquí como material de trabajo para el rediseño;
antes de publicar nada hay que contar con su permiso y, idealmente, partir de sus
originales.

## Diferencias conocidas con el original

- La vista móvil del original usa una rejilla propia de Cargo (2 columnas); aquí, por
  debajo de 900 px, las galerías pasan a columna simple.
- El badge de Cargo y el panel de administración no se han replicado.
- En el original el enlace de Instagram de la home apunta a una cuenta distinta que el
  del resto de páginas; aquí se ha unificado.
