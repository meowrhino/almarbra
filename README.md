# almarbra

Clon de **amargor.es** (portfolio de Almudena González, originalmente en Cargo.site)
en HTML / CSS / JS vainilla, generado estáticamente. Base de trabajo para rehacer el sitio.

En línea: https://meowrhino.github.io/almarbra/

## Cómo funciona

Sitio estático de verdad: el contenido vive en JSON, un script de build escupe un
`.html` completo por página, y el JS del navegador solo añade el comportamiento del
slideshow. Sin JS las fotos se siguen viendo, en columna.

```bash
npm run build     # genera los .html a partir de content/
npm run serve     # servidor local en http://localhost:8000
npm run dev       # build + serve
```

No hay dependencias: solo Node para el build y Python para el servidor.
Los `.html` generados se commitean, así que GitHub Pages los sirve sin más.

## Estructura

```
content/site.json     título, navegación, rutas, meta
content/pages.json    contenido de cada página (bloques)

build/index.mjs       orquesta el build
build/layout.mjs      esqueleto del documento
build/header.mjs      título + navegación
build/blocks.mjs      bloques -> HTML
build/images.mjs      srcset / sizes / aspect-ratio
build/html.mjs        helpers de etiquetas y escapado

js/slideshow.js       único JS de navegador (~4 KB)
css/style.css         todo el estilo
img/                  111 webp: 37 fotos × 3 anchos

*.html                GENERADOS — no editar a mano
```

## Cómo cambiar contenido

Todo en `content/`, y luego `npm run build`.

`site.json` lleva el título, la navegación y las rutas (id → archivo → título).
`pages.json` lleva los bloques de cada página, indexados por ese id:

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

## Imágenes

Descargadas del original y convertidas a WebP en tres anchos —800, 1400 y 2000 px—
para servir por `srcset`. De 148 MB de originales a 11 MB.

Nombres: `<pagina>-NN.webp` (2000 px, el que va en `src`) más `-800` y `-1400`.

Para añadir una foto: mete el WebP en `img/`, genera las variantes y añádela a
`content/pages.json`.

```bash
dwebp foto.webp -o /tmp/f.png && cwebp -q 78 -resize 800 0 /tmp/f.png -o img/foto-800.webp
```

**Son fotografías de la autora.** Están aquí como material de trabajo para el rediseño;
antes de publicar nada hay que contar con su permiso y, idealmente, partir de sus
originales. Mientras tanto, todas las páginas llevan `noindex` y `robots.txt` bloquea
el sitio entero: se controla desde `noindex` en `content/site.json`.

## Diferencias conocidas con el original

- La vista móvil del original usa una rejilla propia de Cargo (2 columnas); aquí, por
  debajo de 900 px, las galerías pasan a columna simple.
- El badge de Cargo y su panel de administración no se han replicado.
- En el original el enlace de Instagram de la home apunta a una cuenta distinta que el
  del resto de páginas; aquí se ha unificado.
