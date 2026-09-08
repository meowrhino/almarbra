# almarbra

Portfolio de **Almudena González**. Sitio estático de verdad: el contenido vive en
JSON, un script de build escupe un `.html` completo por página, y el navegador solo
recibe HTML, CSS y unos 4 KB de JS. Sin dependencias: Node para el build, nada más.

En línea: https://meowrhino.github.io/almarbra/

```bash
npm run ingest    # originals/ -> img/*.webp + content/projects/*.json
npm run build     # content/ -> .html
npm run serve     # http://localhost:8000
npm run dev       # build + serve
```

## Dos capas

El sitio tiene ahora mismo dos cosas dentro, a propósito:

| dónde | qué es | estado |
|---|---|---|
| `/*.html` | clon de amargor.es (el Cargo.site viejo) | **referencia de diseño**, congelado |
| `/proyectos/*.html` | el material real de la clienta | **maqueta de trabajo**, sin diseño |

El clon está para mirarlo mientras se decide el diseño nuevo. Las páginas de
`proyectos/` son fea a posta: enseñan todo el contenido —fotos, sinopsis,
créditos— para poder trabajar sobre él. Cuando haya diseño se tira
`css/projects.css` y se reescribe el render; **el contenido no se toca**, que
para eso está separado.

## El material de la clienta

`originals/` (946 MB, fuera de git) tiene la carpeta tal cual la mandó ella:

```
originals/
  EDITORIAL MODA/<PROYECTO>/FOTOS/*.jpg  + FICHA <PROYECTO>.rtf
  TEXTIL/<PROYECTO>/PIEZAS/<PIEZA>/*.jpg + FICHA <PROYECTO>.rtf
```

`npm run ingest` lo mastica entero:

1. convierte cada foto a WebP en cuatro anchos —400, 800, 1400 y 2000— a
   `img/<categoría>/<proyecto>/<proyecto>-NN.webp` (946 MB → 170 MB);
2. lee la FICHA `.rtf` con `textutil` y saca título, sinopsis y créditos
   (rol, nombre, enlace) **en los tres idiomas** de la ficha: es, en, ca;
3. escribe `content/projects/<proyecto>.json`.

Es idempotente: se apoya en `content/.media-cache.json` y solo reconvierte lo
que haya cambiado. Volver a lanzarlo sin cambios tarda menos de un segundo.
`npm run ingest -- --force` rehace todo.

**Los originales no están en git.** Si se pierde `originals/`, `img/` sigue ahí
pero ya no se puede volver a generar en otra calidad. Copia de seguridad aparte.

### Un proyecto

```jsonc
{
  "slug": "roma",
  "category": "textil",
  "source": "originals/TEXTIL/ROMA",
  "title":    { "es": "ROMA: CIUDAD EN RUINAS…", "en": "ROME: RUINS…" },
  "synopsis": { "es": "Ruinas, base para construir…", "en": "…" },
  "credits":  { "es": [ { "role": "Fotografía", "name": "…", "url": "https://…" } ] },
  "groups":   [ { "slug": "laocoonte", "name": "Laocoonte" } ],   // subcarpetas de PIEZAS
  "images":   [ { "src": "img/textil/roma/roma-01.webp", "w": 2000, "h": 3016,
                  "source": "originals/…/7047 - ….jpg", "alt": "", "group": "laocoonte" } ]
}
```

`source` en cada imagen dice de qué original salió: sirve para volver atrás sin
adivinar.

### Corregir a mano

`content/projects/*.json` lo pisa la ingesta. Las correcciones van en
`content/overrides.json`, indexado por slug, y se aplican encima:

```jsonc
{ "roma": { "title": { "es": "ROMA: CIUDAD EN RUINAS, IDENTIDAD EN CONSTRUCCIÓN" } } }
```

Ya hay dos ahí: en la ficha de ROMA los títulos es/en venían cambiados, y las dos
SICKY se llamaban igual. Las claves que empiezan por `_` son notas, no contenido.

## Los 13 proyectos

**Editorial moda** (10): Águeda · Cap Magazine · Helen · Herdes Magazine ·
Kaltbult Magazine · Lula Japan Magazine · Sicky Magazine · Sicky Magazine (II) ·
Teeth Magazine · Vein Magazine — 143 fotos.

**Textil** (3): Corpórea (17) · Cuerpo Esquema (83) · Roma (16, en tres piezas:
Laocoonte, Río de la Plata, Virgen) — 116 fotos.

259 fotos en total, 903 WebP (no se genera una variante más ancha que el original).

### Lo que hay que mirar antes de diseñar

- **Águeda va corta de resolución**: las 9 fotos están por debajo de 1400 px (la
  menor, 541 px). No aguanta un hero a pantalla completa. Habría que pedirle los
  originales.
- **Cuerpo Esquema** mezcla 24 fotos de piezas con 59 capturas de pantalla y
  recursos: son dos cosas distintas y 19 de ellas bajan de 1400 px. Hay que
  decidir qué entra en la web.
- Las fichas traen **es / en / ca**. Ahora se pinta solo el castellano
  (`defaultLang` en `site.json`); los otros dos idiomas están en el JSON,
  esperando a que el diseño diga si hay selector.
- Ninguna imagen tiene `alt`. Está el campo vacío en cada una, listo.

## Estructura del repo

```
originals/              material de la clienta — FUERA DE GIT
content/projects/       un JSON por proyecto — GENERADO por la ingesta
content/overrides.json  correcciones a mano, se aplican encima
content/site.json       título, navegación, rutas, meta
content/pages.json      bloques del clon de amargor.es

build/ingest.mjs        originals/ -> img/ + content/projects/
build/ficha.mjs         lector de las FICHAS .rtf (es/en/ca)
build/slug.mjs          slugs y nombres legibles
build/index.mjs         orquesta el build
build/projects.mjs      páginas de proyectos/
build/layout.mjs        esqueleto del documento
build/header.mjs        título + navegación del clon
build/blocks.mjs        bloques -> HTML
build/images.mjs        srcset / sizes / aspect-ratio
build/html.mjs          helpers de etiquetas y escapado
build/serve.mjs         servidor estático de desarrollo

css/style.css           estilo del clon
css/projects.css        maqueta de trabajo — a tirar cuando haya diseño
js/slideshow.js         único JS de navegador (~4 KB)
img/                    1051 webp (148 del clon + 903 de los proyectos)

*.html, proyectos/      GENERADOS — no editar a mano
```

## El clon: cómo cambiar su contenido

Todo en `content/`, y luego `npm run build`.

`site.json` lleva el título, la navegación y las rutas (id → archivo → título).
`pages.json` lleva los bloques de cada página, indexados por ese id:

```js
{ type: 'gallery', mode: 'slideshow', items: [ { src, w, h } ] }
{ type: 'gallery', mode: 'montessori', height: 268.62, items: [ { src, w, h, x, y, width } ] }
{ type: 'image', src, w, h, href, scale }   // scale = % del ancho de su columna
{ type: 'text',  text }
{ type: 'row',   cols: [ { span, blocks } ] }        // rejilla de 12
```

En las galerías *montessori*, `x`, `y` y `width` van en **% del ancho del contenedor**
(igual que en Cargo). El CSS lo reproduce con `margin-top` en % sobre elementos
absolutos, que se resuelve contra el ancho, y reserva el alto con `padding-bottom`.

## Imágenes del clon

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

## Notas de fidelidad del clon

La geometría está verificada contra el original a la misma anchura: en Fashion, el
contenedor mide lo mismo (1052 px) y la galería alcanza el mismo alto (2826 px).

El lienzo va **a sangre**: el padding lateral lo llevan la cabecera y los pies, no la
página. Si se le pone padding al contenedor, todos los % se descuadran.

El CSS y el JS se enlazan con `?v=<hash>` del contenido, así que un deploy nunca deja
a nadie con estilos viejos en caché.

## Diferencias conocidas del clon con el original

- La vista móvil del original usa una rejilla propia de Cargo (2 columnas); aquí, por
  debajo de 900 px, las galerías pasan a columna simple.
- El badge de Cargo y su panel de administración no se han replicado.
- En el original el enlace de Instagram de la home apunta a una cuenta distinta que el
  del resto de páginas; aquí se ha unificado.
- Cargo recorta a cuadrado la imagen de OVERSEAS en Textile Art; aquí se ve entera.
- La imagen de CORPÓREA sale un 4% más pequeña que en el original: su `scale` se aplica
  sobre el área interior de la columna y no sobre el ancho total.
