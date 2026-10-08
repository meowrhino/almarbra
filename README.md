# almarbra

Portfolio de **Almudena González**. Sitio estático de verdad: el contenido vive en
JSON, un script escupe un `.html` por proyecto en `dist/`, y el navegador solo
recibe HTML, CSS e imágenes. Sigue la receta de
[meowrhino/JAMstack](https://github.com/meowrhino/JAMstack), como polroig. **Cero dependencias**, y el JavaScript de navegador son cuatro archivos pequeños: el mapa, la transición, los hilos y el hilo de los proyectos.

Fondo blanco, tipografía mono (DM Mono, servida desde la propia web, sin Google) en minúscula y las
fotos mandando, unidas por hilos de píxeles del color de cada proyecto.

**La interfaz**, igual en todas las páginas: el nombre arriba a la izquierda
(lleva siempre a la portada); **mapa · lista · about** arriba a la derecha,
con lo que está puesto marcado; el idioma (**es · en · ca**) abajo a la
derecha, salvo en el mapa. Todo sin fondo y en `difference`, para que se lea
sobre las fotos.

- **portada** (`/`): el **mapa** (`#mapa`), la **lista** (`#lista`) o el
  **about** (`#about`).

  El mapa es la idea de anaelleblin.com: las fotos de todos los proyectos,
  más o menos por zonas (la `mezcla`), en un plano que se arrastra, y las de
  un mismo proyecto unidas por un hilo fino de su color, que serpentea y se
  dibuja al cargar. Al pasar por una foto se enciende su proyecto y sus hilos
  se descosen y se vuelven a coser por otro camino. Abajo en el centro, el
  zoom: un − y un + que pesan como una balanza (en el zoom de partida son
  iguales; cuanto más cerca, más grande el + y más pequeño el −).

  La lista: una franja por proyecto con la portada a un lado —una a la
  izquierda, la siguiente a la derecha— y un hilo de su color que sale de la
  foto y acaba en el título, al otro lado. Al pasar por una, su hilo se
  vuelve a coser.

  El about: el texto de `content/about.json` arriba a la izquierda, bajo el
  nombre, y detrás un telar: hilos de borde a borde, en horizontal y en
  vertical, que se tejen muy despacio, se quedan y se destejen.

  **Al cargar**, primero salen los huecos de las fotos —una trama de píxeles
  del color de su proyecto—, del centro de la pantalla hacia fuera; luego se
  dibujan los hilos y cada foto entra fundiéndose en su hueco cuando ha
  llegado. En la lista y las galerías, las fotos también entran fundiéndose.

  **Siempre que se cambia de página o de vista**, una ola de píxeles de
  colores barre la pantalla en diagonal y la deja en blanco; se cambia, y en
  la página nueva otra ola sigue en el mismo sentido y la destapa
  (`js/transicion.js`). Cada ola con su frente, distinto cada vez, que se
  va doblando y se mueve mientras avanza. Al entrar
  en un proyecto baja, al volver sube; entre mapa, lista y about va de lado,
  en el orden del menú. Al entrar o salir de un proyecto, de su color.
  También con atrás y adelante del navegador: ahí no se puede tapar antes
  de irse, así que la página nueva tapa una foto quieta de la de antes
  (View Transitions; donde no las hay, nace en blanco).

  **Idiomas**: una página por idioma. El español en la raíz (`/`,
  `/projects/roma/`) y los otros en su carpeta (`/en/…`, `/ca/…`), cada
  una con sus `hreflang`, para que Google indexe cada idioma aparte. El
  selector de abajo lleva a la misma página en otro idioma (en la portada,
  a la misma vista), con su ola. Si falta una traducción, sale el español.
  Los textos de la interfaz y las categorías, en `content/textos.json`.

  Los hilos van a escalones de 2 px: siguen la curva, pero se ve que están
  hechos de píxeles. Solo cambian de casilla cuando la curva se ha ido tres
  cuartos de una, para que no vayan y vuelvan entre dos (eso los dentaba).

  Lo de píxeles de antes (mapa de calor, halos alrededor de las fotos, ruido
  de color, lista con cuadrados) está en la rama `pixel`; las otras formas de
  hilo y de transición que se probaron (escalera, diagonal, liso; círculo,
  píxeles, líneas) y el panel de `?pruebas`, en el historial, antes de
  «Limpieza».
- **proyecto** (`/projects/<slug>/`): una columna de 800 px centrada y con
  aire alrededor —ficha técnica arriba, galería en scroll vertical debajo y,
  al final, un **back** centrado que vuelve al mapa o a la lista, a la que se
  venía—. Un hilo de su color baja ondulando de lado a lado y **se inventa
  según avanza** (`js/hilo.js`): la punta apunta a un sitio del otro lado,
  más abajo, y al llegar elige otro, así que no sale una onda igual a otra.
  Solo hay hilo en la pantalla: se teje al ritmo del scroll hasta el 85 % y
  más despacio hasta el borde, al abrir la página mucho más deprisa, y lo que
  se sale se borra; al volver, se teje otro. Va entero sobre el blanco y al
  20 % sobre las fotos y el texto.

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
| `web.json` | título, dirección, descripción (por idioma), idiomas, orden de categorías, colores |

Lo de `proyectos.json` se aplica al hacer el build, así que cambiar un título o
una portada no pide reingerir; solo `drop` (quitar fotos) necesita
`npm run ingest`. `content/projects/` y `content/home.json` los escribe la
ingesta: no se tocan a mano.

```bash
npm run ingest    # originals/ -> media/*.webp + content/projects/*.json
npm run build     # content/ + media/ -> dist/
npm run serve     # dist/ en http://localhost:8000
npm run dev       # build + serve
npm run watch     # rehace dist/ cada vez que se guarda algo
```

**Con Live Server de VS Code**: la web no está en la raíz, la escribe el
build en `dist/`. `.vscode/settings.json` le dice a Live Server que sirva
`dist/`, y `.vscode/tasks.json` arranca `npm run watch` al abrir la carpeta
(la primera vez VS Code pregunta si se permiten tareas automáticas: sí). Así,
al guardar se rehace `dist/` y Live Server recarga solo. Si no se permite la
tarea, `npm run watch` en una terminal hace lo mismo.

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
build/serve.mjs         servidor local de dist/
build/watch.mjs         rehace dist/ al guardar (para Live Server)

css/style.css           todo el estilo
js/mapa.js              el mapa, la lista y el about (con su telar)
js/transicion.js        la transición al cambiar de página o de vista, y la entrada de las fotos
js/hilos.js             la curva y la forma de todos los hilos (también la usa el build)
js/hilo.js              el hilo de la página de un proyecto
media/<slug>/           GENERADO por la ingesta: 825 webp, 133 MB
media/portada/          GENERADO: la foto que sale al compartir la portada
fonts/                  DM Mono en woff2 (400 y 500, latin y latin-ext)

_headers                caché por carpeta (Cloudflare; GitHub Pages lo ignora)
wrangler.jsonc          para cuando pase a Cloudflare Workers
.github/workflows/      build y publicación en cada push a main

dist/                   GENERADO por el build — FUERA DE GIT
  index.html
  projects/<slug>/index.html
  en/  ca/                         lo mismo en cada idioma
  404.html  sitemap.xml  robots.txt  .nojekyll  _headers
  css/  js/  media/  fonts/        copia tal cual
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
enlace se vea ese proyecto y no la portada genérica. La portada lleva además
un JSON-LD `Person` (con `sameAs` si se ponen `"redes"` en `content/web.json`).
Más `404.html`, `sitemap.xml` y `robots.txt`.

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

El ancho de la columna de un proyecto —800 px— vive en `--col`, en
`css/style.css`, y `build/build.mjs` lo repite en el `sizes` de cada foto para
que el navegador no se baje una más grande de la cuenta. Si cambia uno, cambia el
otro.

## El JavaScript de navegador

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
y pasada a la forma de los hilos. Las dos cosas son de `js/hilos.js`
(`wander` y `path`), que también importa `build/build.mjs` para el hilo de la
lista: la misma receta en el navegador y en el build. Van en un SVG del tamaño
del plano, con el grueso fijo a cualquier zoom, y se dibujan solos al cargar,
cada uno con su retraso. Los mandos, arriba de `js/mapa.js`: `DENSITY` (lo juntas que
van las fotos) y `REACH` (lo ancha que es la zona de un proyecto).

La transición vive en `js/transicion.js`: un lienzo a toda la pantalla,
`TIME` segundos para tapar y otros tantos para destapar, a tiempo (dura lo
mismo en una pantalla de 60 Hz que en una de 120; si el navegador se
atasca, la ola se para y sigue, no salta). Hace de pantalla de carga: entre
las dos olas espera en blanco a que lo nuevo esté listo —la página montada y
las fotos que quedan a la vista, `WAIT` como mucho— y `HOLD` más. La
pantalla se parte en píxeles de `C` px, cada uno con su turno: la fila que
le toca en el sentido de la ola más un retraso por línea —una curva suave
entre unos pocos puntos al azar, y algo de inclinación, distinta en cada
ola—; se tapa cuando le llega y se destapa igual, y
la ola lleva `BAND` píxeles de color delante. Los enlaces a otra página de la
web se interceptan: se tapa, se apunta en `sessionStorage` el sentido y los
colores, y se va; la página nueva nace tapada (un `<script>` en el `<head>`
le pone `.tapada`) y se destapa en ese sentido. Si el script no llegara, el
CSS la destapa sola a los 5 s. Mapa, lista y about son la misma página: ahí
la llama `js/mapa.js` al cambiar el hash.

El hilo de los proyectos, `js/hilo.js`: dos puntas, una hacia abajo y otra
hacia arriba, que dan pasos de 3 px girando poco a poco hacia su sitio. Los
mandos, arriba del archivo: `OPEN` (la primera pantalla), `CALM` (sin
scroll), `CHASE` (con scroll), `SLOW` y `EDGE` (el último trozo), `KEEP` (lo
que se guarda fuera de la pantalla antes de borrarse) y `DROP` (lo que baja
cada curva). El del about, en `js/mapa.js`: `STRANDS` (cuántos hilos),
`GROW` y `HOLD` (lo que tardan en tejerse y lo que se quedan).

El plano es un scroll normal: con el dedo o la rueda va solo, y el ratón lo
arrastra. El zoom va a saltos, cinco escalones (`ZOOMS`), con la propiedad CSS
`zoom`, y acerca sobre el centro de la pantalla. Sus mandos, abajo en el
centro y en `difference` como el menú, para que se vean sobre las fotos; lo
que mide cada uno en cada escalón, en `SIZES`.

La vista la dice el hash, así que atrás y adelante funcionan y se puede enlazar
`/#lista`. Un `<script>` en el `<head>` la pone antes de pintar; otro, en
todas las páginas, pone lo demás que no puede esperar: `.js` y si
la página nace tapada (`HEAD_SCRIPT`, en `build/build.mjs`).

**Sin JavaScript la portada es la lista**, que es también lo que leen el teclado
y los lectores de pantalla: el mapa va con `aria-hidden`.

El CSS y los scripts se enlazan con `?v=<hash>` de su contenido: un deploy nunca deja a nadie con
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
- El about solo está en español: en `/en/` y `/ca/` sale el español hasta
  que se escriba en `content/about.json`.
- Ninguna imagen tiene `alt`. El campo está vacío en las 259, listo para escribirlo.
- Las diez editoriales de moda salen con la primera foto de portada. Si alguna no
  es la buena, se cambia con `cover` en `content/proyectos.json`.

## Historia

Antes de esto el repo era un clon de **amargor.es**, el Cargo.site viejo, hecho
para tenerlo de referencia. Está en el historial hasta el commit anterior a
«Empezar el diseño de cero», por si hiciera falta mirarlo.
