# almarbra

Portfolio de **Almudena González**. Sitio estático de verdad: el contenido vive en
JSON, un script escupe un `.html` por proyecto en `dist/`, y el navegador solo
recibe HTML, CSS e imágenes. Sigue la receta de
[meowrhino/JAMstack](https://github.com/meowrhino/JAMstack), como polroig. **Cero dependencias**, y el JavaScript de navegador son tres archivos pequeños: el mapa, el hilo de los proyectos y el idioma.

Fondo blanco. El menú va arriba en todas las páginas: el nombre a la
izquierda, el idioma en el centro, **mapa** y **lista** a la derecha. Dos
pantallas:

- **portada** (`/`): el **mapa** (`#mapa`) o la **lista** (`#lista`), como el
  túnel y la lista de oriol-colomer. El mapa es la idea de anaelleblin.com: las
  fotos de todos los proyectos, más o menos por zonas (la `mezcla`), en un plano que se arrastra, con zoom
  (+ y −), y las de un mismo proyecto unidas por un hilo fino de su color, que
  serpentea y se dibuja al cargar. Al pasar por una foto se enciende su
  proyecto. La lista: una franja por proyecto con la portada a un lado —una a la
  izquierda, la siguiente a la derecha— y un hilo de su color que sale de la
  foto y acaba en el título, al otro lado. Entre mapa y lista la pantalla se
  llena de líneas que se dibujan solas; al entrar en un proyecto, de su color.

  En la portada, el nombre abre el **about** (`#about`): la foto de la
  portada y el texto de `content/about.json`.

  **Idiomas**: es · en · ca en el centro de la barra. Lo traducido va en la
  página en los tres (`data-l`) y se ve el elegido (`js/idioma.js`, que lo
  recuerda); si falta un idioma, sale el español. Los textos de la
  interfaz y las categorías, en `content/textos.json`.

  Los hilos van a escalones de 3 px: siguen la curva, pero se ve que están
  hechos de píxeles.

  Las otras opciones que se probaron (fondo negro; lista en índice, hilo o
  muestrario; transición de telar u ovillo; fondo de proyecto con tinte o
  trama) están en el commit «Pruebas con panel…», abriendo `?pruebas`.

  Lo de píxeles (mapa de calor, halos, ruido de color, lista con cuadrados) se
  quedó en la rama `pixel`.
- **proyecto** (`/projects/<slug>/`): una columna de 640 px centrada y con aire alrededor
  —ficha técnica arriba, galería en scroll vertical debajo—. Un
  hilo de su color baja por los márgenes y cruza la columna solo por el hueco
  entre dos fotos, cosiéndolas, con un agujero donde entra y sale; se dibuja al bajar.

## Lo que se cambia sin tocar código

Todo en `content/`, un archivo por cosa. Cada uno lleva arriba una nota (`"_"`)
que dice qué se puede poner. Se edita, se hace push y en un par de minutos está
publicado.

| archivo | qué |
|---|---|
| `about.json` | el texto del about, en es / en / ca (vacío = sale el español) |
| `textos.json` | las palabras del menú y el nombre de cada categoría, por idioma |
| `mapa.json` | `mezcla`, de 0 (por zonas) a 100 (todo revuelto); ahora 50 |
| `proyectos.json` | por proyecto: `title`, `synopsis`, `short`, `cover`, `color`, `drop` |
| `web.json` | título, dirección, idiomas, orden de categorías, colores |

Lo de `proyectos.json` se aplica al hacer el build, así que cambiar un título o
una portada no pide reingerir; solo `drop` (quitar fotos) necesita
`npm run ingest`. `content/projects/` y `content/home.json` los escribe la
ingesta: no se tocan a mano.

```bash
npm run ingest    # originals/ -> media/*.webp + content/projects/*.json
npm run build     # content/ + media/ -> dist/
npm run serve     # dist/ en http://localhost:8000
npm run dev       # build + serve
```

## Estructura

```
originals/              material de la clienta — FUERA DE GIT
  <CATEGORÍA>/<PROYECTO>/…/*.jpg + FICHA <PROYECTO>.rtf
  PORTADA/*.png                    la foto de la portada, aparte

content/web.json        título, url, idiomas, orden y colores
content/about.json      el texto del about
content/textos.json     menú y categorías, por idioma
content/mapa.json       la mezcla del mapa
content/proyectos.json  correcciones a mano por proyecto
content/home.json       GENERADO: la foto de la portada y sus medidas
content/projects/*.json GENERADO por la ingesta

build/ingest.mjs        originals/ -> media/ + content/projects/
build/ficha.mjs         lector de las FICHAS .rtf
build/formats.mjs       tamaño y calidad de los WebP, en un solo sitio
build/slug.mjs          slugs y nombres legibles
build/build.mjs         content/ + media/ -> dist/, validando antes
build/serve.mjs         servidor local de dist/ (y de pruebas/)

css/style.css           todo el estilo
js/mapa.js              el mapa y la transición de líneas
js/hilo.js              el hilo de fondo de la página de un proyecto
js/idioma.js            el selector de idioma
media/<slug>/           GENERADO por la ingesta: 825 webp, 133 MB
media/portada/          GENERADO: la foto que sale al compartir la portada

_headers                caché por carpeta (Cloudflare; GitHub Pages lo ignora)
wrangler.jsonc          para cuando pase a Cloudflare Workers
.github/workflows/      build y publicación en cada push a main

dist/                   GENERADO por el build — FUERA DE GIT
  index.html
  projects/<slug>/index.html
  404.html  sitemap.xml  robots.txt  .nojekyll  _headers
  css/  js/  media/                copia tal cual
```

En git va **solo el fuente**: `content/`, `media/` y el código. Las páginas no se
commitean; las escribe la Action.

## La ingesta

`npm run ingest` se come `originals/` entero:

1. convierte cada foto a WebP a `media/<proyecto>/<proyecto>-NN.webp`,
   más tres variantes pequeñas para el `srcset` —400, 800 y 1400 px de ancho—
   (946 MB → 133 MB);
2. lee la FICHA `.rtf` con `textutil` y saca título, sinopsis y créditos
   (rol, nombre, enlace) **en los tres idiomas** de la ficha: es, en, ca;
3. escribe `content/projects/<proyecto>.json`.

`originals/PORTADA/` no es una categoría: es la foto que abre el sitio. Sale a
`media/portada/portada.webp` y a `content/home.json`. Cambiar la portada es dejar
otra foto ahí y volver a ingerir. Es un PNG con transparencia y `cwebp` la
conserva: en la web se ve la pieza recortada sobre el fondo de la página, con los
flecos al aire.

Es idempotente: se apoya en `content/.media-cache.json` y solo reconvierte lo que
haya cambiado. Sin cambios tarda menos de un segundo. `npm run ingest -- --force`
rehace todo. Al terminar cada proyecto borra los `.webp` que ya no genera, así que
quitar una foto del original o cambiar el tamaño no deja huérfanos en `media/`.

**La conversión es la de `meowrhino/imgToWeb`**, que es la de todos los sitios:
calidad **0.85** y el **lado largo** topado a **2000 px**, con la proporción
intacta. Está en `build/formats.mjs`, que leen tanto la ingesta —que los escribe—
como el build —que los busca para el `srcset`—; si no coincidieran, se generarían
variantes que nadie pide o se pedirían variantes que no existen. Ojo: el tope es el lado largo, no el ancho — una foto vertical de
3840×5760 sale a 1333×2000, no a 2000×3000. Por eso las verticales rondan los
1333 px de ancho, y en las galerías cada foto lleva un `max-width` con su ancho
real para que no se amplíe en pantallas grandes.

No genera una variante más ancha que el original, así que el `srcset` de cada foto
lista solo los anchos que existen de verdad.

**Los originales no están en git.** Si se pierde `originals/`, `media/` sigue ahí
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
  "images":   [ { "src": "media/roma/roma-01.webp", "w": 2000, "h": 3016,
                  "source": "originals/…/7047 - ….jpg", "alt": "", "group": "laocoonte" } ]
}
```

`source` en cada imagen dice de qué original salió: para volver atrás sin adivinar.

### Qué fotos van al mapa: `home` y `noHome`

Dentro de la carpeta de cada proyecto en `originals/`, las fotos que estén en
una carpeta **`home`** salen en el mapa de la portada; las de **`noHome`**, solo
en la página del proyecto. Las dos carpetas pueden ir a cualquier profundidad
(`FOTOS/home/`, `PIEZAS/VIRGEN/home/`…) y no cuentan como grupo. Después,
`npm run ingest`. Un proyecto sin carpeta `home` manda al mapa su portada y
cinco fotos más, repartidas por su galería.

### content/proyectos.json

`content/projects/*.json` lo **reescribe la ingesta cada vez**, así que editarlo a
mano no sirve de nada. Las correcciones van aquí, indexadas por slug, y se aplican
encima del JSON recién generado (en la ingesta y otra vez en el build):

```jsonc
{
  "roma": {
    "title": { "es": "ROMA: CIUDAD EN RUINAS, IDENTIDAD EN CONSTRUCCIÓN" },
    "short": { "es": "roma" },                     // nombre corto para la portada
    "cover": "media/roma/roma-12.webp",       // la foto que lo representa
    "color": "Maroon",                        // su color, si no el que le toque
    "drop": ["virgen_13colores.jpg"]          // fotos del original que no entran
  }
}
```

`drop` lo lee la ingesta: esas fotos no se convierten y sus `.webp` se borran.
Las demás no se renumeran (el número sale del sitio en el original), así que
quitar una no rompe ningún `cover`. Ahora mismo fuera: las cuatro
preparaciones de color del jacquard (tres de Cuerpo Esquema y una de Roma).

`cover` y `short` son solo para la portada; sin `cover` se usa la primera foto del
proyecto, y sin `short`, el título entero. Las claves que empiezan por `_` son
notas, no contenido.

Ahora mismo hay cinco correcciones: los títulos es/en de ROMA venían intercambiados
en la ficha, las dos SICKY se llamaban igual, y las tres series textiles llevan
portada elegida a mano (la primera foto de Cuerpo Esquema es una captura de
pantalla).

## El build

`build/build.mjs` escribe `dist/` entera desde cero: `index.html` y un
`projects/<slug>/index.html` por proyecto, así que las direcciones quedan
`/projects/roma/`, `/projects/sicky-magazine/`… Son dos plantillas y ya. Cada
página lleva su `title`, `description` (el primer párrafo de la sinopsis),
`canonical` y `og:*` con la foto de portada del proyecto, para que al compartir un
enlace se vea ese proyecto y no la portada genérica. Más `404.html`,
`sitemap.xml` y `robots.txt`.

**Antes de escribir nada, valida.** Un JSON con una coma de menos, una foto que no
está en `media/` o un `cover` que no es de ninguna foto paran el build con el
archivo y lo que pasa:

```
✗ content/projects/helen.json no es un JSON válido: … (line 3 column 3)
✗ helen: no encuentro media/helen/helen-99.webp
```

En la Action eso sale en rojo y la web publicada se queda como estaba.

### Publicar

Cada push a `main` lanza `.github/workflows/deploy.yml`: `node build/build.mjs` y
sube `dist/` a GitHub Pages. La ingesta no corre ahí (necesita `originals/`,
`cwebp` y `sips`): `media/` y `content/` llegan ya hechos. Tarda un par de minutos;
en la pestaña **Actions** de GitHub, verde es publicado.

En GitHub, *Settings → Pages → Source* tiene que estar en **GitHub Actions**.

En `content/web.json`, `order` dice en qué orden salen las categorías y
`colors` da un color por proyecto, en ese orden: nombres de CSS de las cuatro
familias de Maroon, MediumSpringGreen, Turquoise y Violet, alternadas para que
dos proyectos seguidos no sean de la misma. Un proyecto con `color` en
`proyectos.json` usa el suyo. Si a alguno no le llega color, el build para y
lo dice.

La foto de `originals/PORTADA/` ya no sale en la web: es la `og:image` de la
portada, la que se ve al compartir el enlace.

El ancho de la columna de un proyecto —640 px— vive en `--col`, en
`css/style.css`, y `build/build.mjs` lo repite en el `sizes` de cada foto para
que el navegador no se baje una más grande de la cuenta. Si cambia uno, cambia el
otro.

## Lo único de navegador: js/mapa.js

El mapa cambia **en cada carga**, así que no se hornea: el HTML trae las fotos
(las de `home`, ver arriba) y `js/mapa.js` las reparte por todo el plano, sin
pisarse y por zonas: primero la primera foto de cada proyecto, separadas entre
sí, y luego el resto alrededor de la suya (`REACH`). La `mezcla` de
`content/mapa.json` tira de cada foto desde su zona hacia un sitio cualquiera
del plano: 0 son zonas limpias, 100 todo revuelto.

Las fotos de un mismo proyecto van unidas por hilos —cada una con la más
cercana de las que ya estaban, así que cada proyecto es un árbol—. Cada hilo es
la recta entre los dos centros desviada por dos ondas, una larga que lo curva
entero y otra corta que lo hace temblar, apagadas en los extremos, recorrida
a pasos de una casilla de 3 px (`STEP`) y dibujada a escalones. Van en un SVG
del tamaño del plano, con el grueso fijo a cualquier zoom, y se dibujan solos al
cargar, cada uno con su retraso. La misma receta está en `build/build.mjs` para
el hilo de la lista. Los mandos, arriba de `js/mapa.js`: `DENSITY` (lo juntas que
van las fotos) y `REACH` (lo ancha que es la zona de un proyecto).

La transición entre mapa y lista: 60 líneas salen de los bordes y van torciendo
al azar, a escalones como los hilos, mientras el fondo se pone blanco; se
cambia de vista y todo se funde (`LINES`, `FRAMES`). Entre mapa, lista y
about.

El plano es un scroll normal: con el dedo o la rueda va solo, y el ratón lo
arrastra. El zoom va a saltos, cinco escalones (`ZOOMS`), con la propiedad CSS
`zoom`, y acerca sobre el centro de la pantalla.

La vista la dice el hash, así que atrás y adelante funcionan y se puede enlazar
`/#lista`. Un `<script>` de una línea en el `<head>` la pone antes de pintar.

**Sin JavaScript la portada es la lista**, que es también lo que leen el teclado
y los lectores de pantalla: el mapa va con `aria-hidden`.

El CSS se enlaza con `?v=<hash>` de su contenido: un deploy nunca deja a nadie con
estilos viejos en caché.

Todas las páginas llevan `noindex` y `robots.txt` bloquea el sitio, hasta que haya
web de verdad. **Al lanzar**, en `content/web.json`:

- `"url"`: la dirección definitiva (ahora `https://meowrhino.github.io/almarbra/`).
  De ahí salen el canonical, las `og:image`, el sitemap y los enlaces de la 404.
- `"noindex": false`: quita el meta y abre `robots.txt` con su `Sitemap:`.

Si pasa a Cloudflare, `wrangler.jsonc` y `_headers` ya están: en Workers Builds,
comando `node build/build.mjs`.

## Los 13 proyectos

**Editorial moda** (10): Águeda · Cap Magazine · Helen · Herdes Magazine ·
Kaltbult Magazine · Lula Japan Magazine · Sicky Magazine · Sicky Magazine (II) ·
Teeth Magazine · Vein Magazine — 143 fotos.

**Textil** (3): Corpórea (17) · Cuerpo Esquema (80) · Roma (15, en tres piezas:
Laocoonte, Río de la Plata, Virgen) — 112 fotos.

255 fotos.

### Lo que hay que mirar antes de diseñar

- **Águeda va corta de resolución**: sus 9 fotos están por debajo de 1400 px (la
  menor, 541). En la columna de 800 se defiende —las que no llegan se quedan
  centradas a su ancho real en vez de ampliarse—, pero no aguanta un hero a
  pantalla completa. Habría que pedirle los originales.
- **Cuerpo Esquema** mezcla 24 fotos de piezas con 59 capturas de pantalla y
  recursos: son dos cosas distintas y 19 bajan de 1400 px. Hay que decidir qué
  entra en la web.
- Las fichas traen **es / en / ca** y se pueden ver con el selector, pero los
  tres van en la misma página: Google solo indexa el español. Si hace falta
  que se encuentre en inglés, habrá que generar páginas `/en/…`.
- El about solo está en español.
- Ninguna imagen tiene `alt`. El campo está vacío en las 259, listo para escribirlo.
- Las diez editoriales de moda salen con la primera foto de portada. Si alguna no
  es la buena, se cambia con `cover` en `content/proyectos.json`.

## pruebas/ — el visualizador de nodos

Fuera del sitio y fuera del build: `pruebas/` son tres maquetas para enseñarle a la
clienta, que pidió «algo como un visualizador de nodos» donde los proyectos formen
un tejido. `node pruebas/datos.mjs` saca de `content/` lo que necesitan y lo deja en
`pruebas/datos.js` (un global, para que abran también con doble clic).
No se publican: no entran en `dist/`. Con `npm run serve` se abren en
`/pruebas/` y sus enlaces a los proyectos llevan a las páginas de `dist/`.

El hilo no es decorativo: sale de las fichas. Dos proyectos van unidos si comparten
a alguien del equipo —28 personas, 22 uniones— y cada persona tiene su color, el
mismo en las tres maquetas. Las tres series textiles no traen ficha de equipo: las
enhebra la técnica.

- `pruebas/portada.html` — **la que va a la web**: la portada de verdad con los
  proyectos cableados. Siguen cayendo al azar en cada carga —el reparto es el de
  `js/scatter.js`, sin tocar— y se cablean los que quedan cerca: se ordenan todas las
  distancias y se corta donde salen ~1,3 cables por proyecto, más el vecino más cercano
  de quien se hubiera quedado solo. Lo que lo separa de una constelación no es dónde
  caen, es el cable: cada ficha lleva un conector a cada costado y el cable sale en
  horizontal, entra en horizontal y da la vuelta si el destino le queda detrás. Un solo
  color, sin significados. La tecla `r` reparte otra vez.
- `pruebas/cables.html` — nodos y cables, como el editor del vídeo.
- `pruebas/telar.html` — urdimbre de personas, trama de proyectos.
- `pruebas/tejido.html` — la tela viva, con física.

Cuando se decida una, se rehace en serio; esto se borra.

## Historia

Antes de esto el repo era un clon de **amargor.es**, el Cargo.site viejo, hecho
para tenerlo de referencia. Está en el historial hasta el commit anterior a
«Empezar el diseño de cero», por si hiciera falta mirarlo.
