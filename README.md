# almarbra

Portfolio de **Almudena González**. Sitio estático de verdad: el contenido vive en
JSON, un script escupe un `.html` por proyecto en `dist/`, y el navegador solo
recibe HTML, CSS e imágenes. Sigue la receta de
[meowrhino/JAMstack](https://github.com/meowrhino/JAMstack), como polroig. **Cero dependencias**, y el JavaScript de navegador son cinco archivos pequeños: el mapa, la transición, los hilos, el hilo de los proyectos y el telar del about.

**Para actualizar la web (la clienta): [GUIA.md](GUIA.md).**

Fondo blanco, Helvetica (la del sistema: nada que descargar) en minúscula y las
fotos mandando, unidas por hilos de píxeles del color de cada proyecto.

**La interfaz**, igual en todas las páginas: el nombre arriba a la izquierda
(lleva siempre a la portada); **mapa · textil · foto · about** arriba a la derecha,
con lo que está puesto marcado; el idioma (**es · en · ca**) abajo a la
derecha, salvo en el mapa. Todo sin fondo y en `difference`, para que se lea
sobre las fotos.

- **portada** (`/`): el **mapa**. Las dos **listas**, **diaris** y el **about** son páginas
  propias: `/textil/`, `/foto/`, `/diaris/`, `/about/` (y en `/en/`, `/ca/`); las
  direcciones viejas con `#` (`/#about`) redirigen. En el mapa salen los
  proyectos de las dos.

  Diaris: las fotos de `diaris/` (`1.webp`, `2.webp`…, sin JSON), en tres
  columnas como un tumblr (dos en el móvil), barajadas en cada visita por un
  script al pintar; sin JavaScript, en su orden. El build las publica a
  1000 px (sharp, `.cache/diaris/`). Cada hueco, con la trama de un color de
  los proyectos mientras llega su foto.

  El mapa es la idea de anaelleblin.com: las fotos de todos los proyectos,
  más o menos por zonas (la mezcla, `mix`), en un plano que se arrastra, y las de
  un mismo proyecto unidas por un hilo fino de su color, que serpentea y se
  dibuja al cargar. Al lado de cada hilo, una pelusa de píxeles sueltos, como
  si se deshilachara. Al pasar por una foto se enciende su proyecto, le brota
  alrededor un halo de píxeles de su color, y sus hilos se descosen y se
  vuelven a coser por otro camino (con su pelusa nueva). Abajo en el centro, el
  zoom: «− 70% +», como el menú (se abre al 70 %; el número se puede
  escribir).

  Las listas: una por cada una de `lists` en `data/site.json`, cada una su
  vista en el menú, en ese orden. Sin JavaScript salen las dos
  seguidas, con su nombre encima. Dentro, en zigzag: un proyecto a la
  izquierda con su nombre debajo, el siguiente a la derecha y más abajo, y
  así, sin solaparse y con aire entre una y otra, como en anaelleblin.com.
  En el móvil, una columna, alternando también de lado.

  Los hilos del mapa van a media luz; al pasar por una foto, los de su
  proyecto se encienden del todo. Sin desenfoque bajo las franjas: el
  `difference` ya las deja leer sobre las fotos.

  El about: el texto de `data/about.json` arriba a la izquierda, bajo el
  nombre; debajo, el email y el Instagram, y quién hizo la web. Detrás, un telar: hilos de borde a borde, en horizontal y en
  vertical, que se tejen muy despacio, se quedan y se destejen.

  **Al cargar**, primero salen los huecos de las fotos —una trama de píxeles
  del color de su proyecto—, del centro de la pantalla hacia fuera; luego se
  dibujan los hilos y cada foto entra fundiéndose en su hueco cuando ha
  llegado. En la lista y las galerías, las fotos también entran fundiéndose.

  **Siempre que se cambia de página o de vista**, una ola de píxeles de
  colores barre la pantalla en diagonal y la deja en blanco; se cambia, y en
  la página nueva otra ola sigue en el mismo sentido y la destapa
  (el dibujo, `js/ola.js`; el mecanismo, `js/transicion.js`). Cada ola con su frente, distinto cada vez, que se
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
  Las palabras del menú y el nombre de las listas, en `data/site.json`.

  Los hilos van a escalones de 2 px: siguen la curva, pero se ve que están
  hechos de píxeles. Solo cambian de casilla cuando la curva se ha ido tres
  cuartos de una, para que no vayan y vuelvan entre dos (eso los dentaba).

  Lo de píxeles de antes (mapa de calor, halos alrededor de las fotos, ruido
  de color, lista con cuadrados) está en la rama `pixel`; las otras formas de
  hilo y de transición que se probaron (escalera, diagonal, liso; círculo,
  píxeles, líneas) y el panel de `?pruebas`, en el historial, antes de
  «Limpieza»; las hilachas (una nube de píxeles con la forma del tejido de
  cada proyecto) y su panel, antes de «Fuera las hilachas».
- **proyecto** (`/projects/<slug>/`): una columna de 800 px centrada y con
  aire alrededor —ficha técnica arriba, galería en scroll vertical debajo y,
  al final, un **back** centrado que vuelve a la vista de la que se venía (el
  mapa o una lista; si no, la lista del proyecto)—. Un hilo de su color baja ondulando de lado a lado y **se inventa
  según avanza** (`js/hilo.js`): la punta apunta a un sitio del otro lado,
  más abajo, y al llegar elige otro, así que no sale una onda igual a otra.
  Solo hay hilo en la pantalla: se teje al ritmo del scroll hasta el 85 % y
  más despacio hasta el borde, al abrir la página mucho más deprisa, y lo que
  se sale se borra; al volver, se teje otro. Va por debajo de las fotos y el
  texto (opaco, con 1rem de aire, como el del about): se ve en el blanco,
  nunca encima de una foto ni de una letra.

## Lo que se cambia sin tocar código

Cada proyecto en su carpeta, con todo lo suyo: `projects/<slug>/project.json`
y sus fotos en `img/` (`1.webp`, `2.webp`…). Lo general, en `data/`. Cada
JSON general lleva arriba una nota (`"_"`) que dice qué se puede poner. Se edita,
se hace push y en un par de minutos está publicado.

| archivo | qué |
|---|---|
| `projects/<slug>/project.json` | el proyecto: título, texto, créditos, su color, fotos, portada y mapa (una foto de `img/` que está en `map` y no en `photos` sale solo en el mapa) |
| `diaris/` | las fotos de diaris, `1.webp`, `2.webp`…: salen todas, barajadas |
| `data/site.json` | título, dominio (`url`, `null` hasta que lo haya), descripción (por idioma), idiomas, **las listas con su nombre y sus proyectos** (`lists`), el menú, colores, email, Instagram (`instagram`, solo el usuario), otras redes (`social`) y la mezcla del mapa (`mix`: 0 por zonas, 100 todo revuelto; ahora 50) |
| `data/about.json` | el texto del about, en es / en / ca, como lista de párrafos (vacío = sale el español) |

```bash
npm ci            # una vez: sharp, para las fotos del mapa y las og
npm run build     # data/ + projects/ -> dist/
npm run serve     # dist/ en http://localhost:8000
npm run dev       # build + serve
LENTO=2000 npm run serve   # cada página tarda 2 s: para ver el loader
```

**La vista previa, con Live Server** (la de la clienta, sin Node): Go Live en
la raíz abre `index.html`, que carga `build/preview.mjs` y pinta la página de
`?p=/ruta/` con las mismas plantillas que el build (`build/paginas.mjs`),
leyendo los JSON y la cabecera de cada foto (Range: no las baja enteras). Lo
que no puede hacer sin disco: las fotos pequeñas del mapa (usa las grandes) y
las og. Si algo está mal, sale el mismo error que daría el build.

**Cada JSON lleva arriba su `"$schema"`** (`schema/site.json`, `about.json`,
`project.json`): VS Code explica cada campo al pasar el ratón, los propone al
escribir y subraya en rojo uno mal escrito o del tipo que no es. El build y la
vista previa validan con los mismos ficheros (`validar`, en
`build/proyectos.mjs`, el de oriol). Si se añade un campo, va también en el
esquema.

**Un proyecto oculto**: en `lists`, `{ "project": "roma", "visible": false }`.
Tiene su página (con `noindex`), pero no sale en el mapa, las listas, el about
ni el sitemap.

## Estructura

```
projects/<slug>/        un proyecto, todo junto
  project.json                     título, texto, créditos, fotos, portada, mapa
  img/1.webp img/2.webp …          sus fotos, tal cual salen de imgToWeb

data/site.json          título, url, idiomas, listas, menú, colores, contacto y mezcla
data/about.json         el texto del about

build/proyectos.mjs     lee los proyectos en el orden de las listas y valida (build y vista previa)
build/paginas.mjs       las plantillas: datos -> HTML, sin tocar el disco
build/build.mjs         data/ + projects/ -> dist/, validando antes
build/preview.mjs       la vista previa en el navegador (index.html, Live Server)
build/serve.mjs         servidor local de dist/
index.html              la vista previa (no se publica)
schema/                 lo que puede llevar cada JSON (VS Code, build y vista previa)

css/transicion.css      la transición de la casa: igual en todas las webs (JAMstack)
css/style.css           todo el estilo (y el dibujo de la transición: el loader)
js/mapa.js              el mapa (con su halo y su pelusa)
js/telar.js             el telar de detrás del about
js/transicion.js        la transición de la casa (igual en todas las webs) y la entrada de las fotos
js/ola.js               el dibujo de la transición: la ola de píxeles
js/hilos.js             la curva y la forma de todos los hilos
js/hilo.js              el hilo de la página de un proyecto
favicon.svg             dos hilos de píxeles

_headers                caché por carpeta (Cloudflare; GitHub Pages lo ignora)
wrangler.jsonc          la copia de Almudena, en su Cloudflare (Workers Builds)
.github/workflows/      nuestra copia: build y publicación en cada push a main; si falla, un issue
GUIA.md                 para Almudena
TRASPASO.md             la lista para pasarle su copia
CLAUDE.md               para Claude: qué hacer si el build falla

dist/                   GENERADO por el build — FUERA DE GIT
  index.html
  projects/<slug>/index.html
  en/  ca/                         lo mismo en cada idioma
  404.html  sitemap.xml  robots.txt  .nojekyll  _headers
  og.jpg                           la imagen para compartir de la portada
  css/  js/                        copia tal cual
  media/<slug>/img/                las fotos de cada proyecto
  media/<slug>/mapa/               las del mapa, a 600 px (sharp, desde .cache/)
  media/<slug>/og.jpg              la imagen para compartir (sharp, desde .cache/)
```

En git va **solo el fuente**: `data/`, `projects/` y el código. Las páginas no
se commitean; las escribe la Action. En la web las fotos se sirven desde
`media/<slug>/` y no junto a la página de su proyecto, para que `_headers` les dé
su caché larga sin dársela al HTML.

## Un proyecto

```jsonc
// projects/roma/project.json
{
  "title":    { "es": "ROMA: CIUDAD EN RUINAS…", "en": "ROME: RUINS…" },
  "short":    { "es": "roma" },                // nombre corto para el mapa (si no, el título)
  "text":     { "es": ["primer párrafo", "segundo párrafo"] },
  "credits":  [                               // uno por persona; el rol por idioma, o un texto si es igual
    { "role": { "es": "Modelo", "en": "Model", "ca": "Model" }, "name": "…", "url": "https://…" },
    { "role": "Make up & hair", "name": "…" }
  ],
  "color":    "#982F0C",                      // si no, el que le toque de site.json
  "cover":    ["10"],                         // la portada: la de la lista y al compartir
  "map":      ["2", "3", "5"],                // las del mapa
  "photos":   ["1", "2", "3"]                 // la galería, en este orden
}
```

- Las fotos se nombran por **su número**, sin `.webp` (todas lo son): `"3"` es
  `img/3.webp`. El orden de `photos` es el de la galería: para reordenar,
  se mueven en la lista; para quitar una, se borra de la lista.
- El ancho y el alto **no se escriben**: el build los lee del propio `.webp`.
- `cover` y `map` tienen que estar entre las fotos; si no, el build para y
  dice cuál. Sin `cover`, la primera foto. Sin `map`, va la portada y cinco
  más, repartidas por la galería.
- Por grupos (Roma, en tres piezas), `groups` en vez de `photos`:
  `"groups": [{ "name": "Laocoonte", "photos": ["1", "2", …] }, …]`.
- **Los créditos**: una lista, una persona por línea, con su enlace. Dos
  seguidas con el mismo rol lo comparten en la web (salen una debajo de otra).
- **Los textos largos** (`text`, y el about) son una **lista de párrafos**.
  Un salto de línea dentro de un párrafo (`\n`) se queda, como en los versos de
  Roma.
- Las claves que empiezan por `_` son notas, no contenido.
- **El nombre del proyecto es el de su carpeta**, y es su dirección:
  `projects/roma/` → `/projects/roma/`.

- Los campos van **en inglés** (como en todas las webs nuevas, ver JAMstack);
  lo que se escribe, en `es`, `en` y `ca` (`ca`, el código ISO: el mismo de
  `hreflang` y de `/ca/`).

**En qué lista sale, y en qué orden**: `lists` en `data/site.json`, cada una
con su nombre en el menú y sus proyectos.

```json
"lists": {
  "textil": { "name": { "es": "textil", "en": "textile", "ca": "tèxtil" }, "projects": ["corporea", "cuerpo-esquema", …] },
  "foto":   { "name": { "es": "foto", "en": "photo", "ca": "foto" },       "projects": ["sicky-magazine", "vein-magazine", …] }
}
```

Un proyecto que no está en ninguna lista no sale en la web (el build avisa).
Los colores de `colors` se reparten en este orden.

## Fotos nuevas: con imgToWeb

Las fotos se preparan con [imgToWeb](https://github.com/meowrhino/imgToWeb), en
el navegador: WebP a calidad 85 y con el lado largo topado a 2000 px, y las
numera solas (`1.webp`, `2.webp`…) en el orden en que se dejan; arrastrándolas
se reordenan y se renumeran. Una sola versión de cada foto: nada más que hacer.

**Un proyecto nuevo**:

1. una carpeta en `projects/` con su nombre en minúsculas y con guiones
   (`projects/nuevo-proyecto/`): es su dirección, `/projects/nuevo-proyecto/`;
2. dentro, las fotos que saca imgToWeb en `img/`, y un `project.json` (lo más
   fácil: copiar el de otro y cambiarlo);
3. su nombre en los `projects` de una lista de `data/site.json`, donde tenga que
   salir.

Y ya: las fotos pequeñas del mapa y la imagen para compartir las hace el build.

**Fotos en un proyecto que ya está**: se dejan en su `img/` con el número
siguiente y se añaden a `photos`. Para rehacer el orden entero, imgToWeb con
todas otra vez.

**El mapa** no usa las grandes: enseña las fotos a 170 px como mucho (340 con
el zoom), y bajarse 94 de 2000 px eran 30 MB. El build hace de cada foto del mapa
una de 600 px con sharp (en `.cache/mapa/`, fuera de git, y solo las que no
estén o hayan cambiado; desde cero, unos 4 s) y las publica en
`media/<slug>/mapa/`: 5 MB. Desde cero, con las imágenes para compartir, el build
tarda unos 5 s; con la caché, menos de uno. La clienta no ve nada de esto. sharp
lo instala `npm ci` (en la Action, en Workers Builds y en local). Sin él, el
build avisa y el mapa usa las grandes.

El resto —las listas y las galerías— usa las grandes, con `loading="lazy"`; en
las galerías cada foto lleva un `max-width` con su ancho real (las verticales
rondan los 1333 px) para que no se amplíe en pantallas grandes.

El material original de la clienta no está en el repo (1,2 GB): lo guarda ella.
Las fotos de los 16 proyectos de octubre salieron de ahí con la misma
conversión; la ingesta que lo hacía (y leía las FICHAS `.rtf`) está en el
historial, hasta el commit `18ba9b4`.

## El build

`build/build.mjs` escribe `dist/` entera desde cero: `index.html` y un
`projects/<slug>/index.html` por proyecto, así que las direcciones quedan
`/projects/roma/`, `/projects/sicky-magazine/`… Son dos plantillas y ya, y
salen una vez por idioma (`/`, `/en/`, `/ca/`).

**El SEO**, en cada página:

- `title` y `description` (en un proyecto, el primer párrafo de la sinopsis;
  en la portada, la de `data/site.json`), en su idioma.
- `canonical`, `hreflang` de los tres idiomas y `x-default` (el español).
- `og:*` y `twitter:card`, con su imagen de 1200×630 en JPG (abajo): al
  compartir un proyecto se ve ese proyecto.
- JSON-LD: en la portada, `Person` (con `email` y `sameAs` si se ponen en
  `data/site.json`); en cada proyecto, `CreativeWork` con ella de autora.
- `<main>`, un solo `h1` y `alt` en las fotos de la galería: el suyo si lo
  tiene en el JSON y si no, el título del proyecto y el del grupo.
- `favicon.svg` y `theme-color`.

Más `404.html` (con `noindex`), `sitemap.xml` con las tres versiones de cada
página y `robots.txt`.

**Antes de escribir nada, valida.** Un JSON con una coma de menos, una foto que no
está en su carpeta, una `cover` o `map` que no está entre las fotos, o una
lista que nombra un proyecto que no existe paran el build con el archivo y lo que
pasa:

```
✗ projects/helen/project.json no es un JSON válido (línea 8, columna 3). …
✗ projects/helen/project.json: "covr" no es un campo de aquí (¿mal escrito?). Los que hay: …
✗ projects/helen: no encuentro img/99.webp
✗ projects/helen: en «map», 7 no está entre sus fotos
```

En la Action eso sale en rojo, la web publicada se queda como estaba y se abre
un issue con esas líneas (etiqueta `build`), que se cierra solo al volver a
publicar. Cómo arreglarlo: `CLAUDE.md`.

### Publicar

**Dos copias, un repo** (JAMstack, receta regla 8). La nuestra: cada push a
`main` lanza `.github/workflows/deploy.yml` (`npm ci`, `node build/build.mjs`) y
sube `dist/` a GitHub Pages, en `meowrhino.github.io/almarbra/`; solo corre en
`meowrhino` (`if: github.repository_owner`). La de Almudena: Workers Builds en
su Cloudflare, con `wrangler.jsonc` (`TRASPASO.md`). El build sabe dónde está:
con `GITHUB_ACTIONS`, la dirección de github.io y `noindex`; si no, la raíz con
el `url` de `data/site.json` (`null` hasta que haya dominio: entonces
`noindex`, y los canonical desde la raíz). Tarda un par de minutos; verde es
publicado.

En GitHub, *Settings → Pages → Source* tiene que estar en **GitHub Actions**.

En `data/site.json`, `colors` da un color por proyecto, en el orden de
`lists`: nombres de CSS de las cuatro
familias de Maroon, MediumSpringGreen, Turquoise y Violet, alternadas para que
dos proyectos seguidos no sean de la misma. Un proyecto con `color` en
su `project.json` usa el suyo. Si a alguno no le llega color, el build para y
lo dice.

El ancho de la columna de un proyecto —800 px— vive en `--col`, en
`css/style.css`, y `build/build.mjs` lo repite en el `sizes` de cada foto para
que el navegador no se baje una más grande de la cuenta. Si cambia uno, cambia el
otro.

## El JavaScript de navegador

El mapa cambia **en cada carga**, así que no se hornea: el HTML trae las fotos
(las de `map`, ver arriba) y `js/mapa.js` las reparte por todo el plano, sin
pisarse y por zonas: primero la primera foto de cada proyecto, separadas entre
sí, y luego el resto alrededor de la suya (`REACH`). La mezcla (`mix`) de
`data/site.json` tira de cada foto desde su zona hacia un sitio cualquiera
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

La transición: el mecanismo es el de la casa, igual en todas las webs
(`js/transicion.js`, `css/transicion.css` y el `<script>` del `<head>`;
JAMstack, patrones.md §6c), y el dibujo es de almarbra: `js/ola.js` (que
le da a la casa `window.dibujo`) y el loader en `css/style.css`. La ola, un
lienzo a toda la pantalla,
`TIME` segundos para tapar y otros tantos para destapar, a tiempo (dura lo
mismo en una pantalla de 60 Hz que en una de 120; si el navegador se
atasca, la ola se para y sigue, no salta). Hace de pantalla de carga: entre
las dos olas espera en blanco a que lo nuevo esté listo —la página montada y
las fotos que quedan a la vista, `WAIT` como mucho— y `HOLD` más. La
pantalla se parte en píxeles de `C` px, cada uno con su turno: la fila que
le toca en el sentido de la ola más un retraso por línea: el frente, que va
de una curva suave a otra mientras avanza (las dos al azar, con algo de
inclinación) y lleva encima una onda corta de un píxel (`RIPPLE`) que lo hace
moverse. Se tapa cuando le llega y se destapa igual, y
la ola lleva `BAND` píxeles de color delante. Los enlaces a otra página de la
web se interceptan: se tapa, se apunta en `sessionStorage` el sentido y los
colores, y se va; la página nueva nace tapada (un `<script>` en el `<head>`
le pone `.tapada`) y se destapa en ese sentido. Si el script no llegara, el
CSS la destapa sola a los 5 s. Con atrás y adelante del navegador
no hay clic que interceptar (y el evento `navigate` no se deja cancelar
entre páginas): con `@view-transition` el navegador deja una foto quieta de
la página de antes, la nueva se pone transparente salvo el lienzo
(`.tapando`) y la ola la tapa; luego se destapa como siempre.

El hilo de los proyectos, `js/hilo.js`: dos puntas, una hacia abajo y otra
hacia arriba, que dan pasos de 3 px girando poco a poco hacia su sitio. Los
mandos, arriba del archivo: `OPEN` (la primera pantalla), `CALM` (sin
scroll), `CHASE` (con scroll), `SLOW` y `EDGE` (el último trozo), `KEEP` (lo
que se guarda fuera de la pantalla antes de borrarse) y `DROP` (lo que baja
cada curva). El del about, en `js/telar.js`: `STRANDS` (cuántos hilos),
`GROW` y `HOLD` (lo que tardan en tejerse y lo que se quedan).

El plano es un scroll normal: con el dedo o la rueda va solo, y el ratón lo
arrastra. El zoom va a saltos, cinco escalones (`ZOOMS`), con la propiedad CSS
`zoom`, y acerca sobre el centro de la pantalla. Sus mandos, abajo en el
centro y en `difference` como el menú, para que se vean sobre las fotos; lo
que mide cada uno en cada escalón, en `SIZES`.

Cada vista es una página (el build pone `data-vista` en su `<html>` y
`aria-current` en su enlace del menú); la ola las une como al entrar en un
proyecto, de lado y en el orden del menú. Otro `<script>` en el `<head>`, en
todas las páginas, pone lo que no puede esperar: `.js` y si
la página nace tapada (`headScript`, en `build/paginas.mjs`).

**Sin JavaScript la portada son las listas**, seguidas, que es también lo que leen el teclado
y los lectores de pantalla: el mapa va con `aria-hidden`.

El CSS y los scripts se enlazan con `?v=<hash>` de su contenido: un deploy nunca deja a nadie con
estilos viejos en caché.

Todas las páginas llevan `noindex` y `robots.txt` bloquea el sitio mientras no
haya dominio (y siempre en github.io).

## Lanzar

El Instagram y el email ya están. Lo que falta es el dominio.

**1. En `data/site.json`:**

- `"instagram": "usuario"` (solo el usuario, con o sin @): sale al pie del about
  como `@usuario`, y en el JSON-LD como `sameAs` (Google une la web con la
  cuenta). Otras redes, en `"social"`, con la dirección entera.
- `"email": "…"`: al pie del about, delante de las redes. Vacío, no sale.
- `"url": "https://eldominio.com"`: el dominio. De ahí salen los canonical, los
  `hreflang`, las `og:image`, el sitemap y los enlaces de la 404; con él, fuera
  el `noindex` y `robots.txt` abre con su `Sitemap:`. Los demás enlaces son
  relativos: no hay que tocar nada más. Solo en **su** copia: en github.io
  manda la Action.

**2. El dominio**, en su copia: Workers Builds en su Cloudflare y el dominio en
*Custom domains*, paso a paso en `TRASPASO.md`. Nuestra copia sigue en
github.io, sin indexar.

**3. Comprobar**, ya publicada:

- [Rich Results Test](https://search.google.com/test/rich-results) con la portada
  y un proyecto: tiene que salir la `Person` y el `CreativeWork`.
- Pegar un enlace en WhatsApp o en el [Post Inspector de LinkedIn](https://www.linkedin.com/post-inspector/):
  su `og.jpg`.
- Dar de alta el dominio en [Search Console](https://search.google.com/search-console)
  y mandarle `sitemap.xml`.

**Las imágenes para compartir** (og:image) las hace el build: 1200×630 en JPG,
que es lo que esperan WhatsApp, Instagram y LinkedIn. La de cada proyecto es su
portada entera sobre blanco; la de la portada de la web, las portadas de los seis
primeros proyectos en fila (y la de cada lista, las suyas). Con sharp, en
`.cache/og/` con nombre según las fotos de las que sale: solo se rehacen si
cambia una portada. Sin sharp, el build avisa y se comparte la portada tal
cual.

## Los 16 proyectos

Del envío del 12 de octubre de 2026, con el mapa y las portadas del 14. Las
fotos, numeradas seguidas en cada proyecto (1, 2, 3…), como las numera imgToWeb.

**Textil** (6): Corpórea (16) · Cuerpo Esquema (3) · Light Beam Digital (8) ·
Mattering (15) · Roma (16, en tres piezas: Laocoonte, Río de la Plata, Virgen) ·
Unbound Threads (6) — 64 fotos.

**Foto** (10; en el material, EDITORIAL MODA), en este orden: Sicky Magazine · Vein Magazine ·
Kaltbult Magazine · Teeth Magazine · Herdes Magazine · Águeda · Lula Japan
Magazine · Cap Magazine · Sicky Magazine (II) · Helen — 130 fotos.

194 fotos. La 03 de Cuerpo Esquema es una captura de Photoshop que la clienta
mandó solo en su carpeta `MAPA`, con otro nombre: va a propósito, en la galería y
en el mapa.

### Lo que falta

- **El orden de los textiles**: sus carpetas no llevan número; van por orden
  alfabético hasta que diga otro (se cambia en `lists`).
- **Las sinopsis de Light Beam Digital, Mattering y Unbound Threads** son la de
  Cuerpo Esquema con el nombre cambiado, a propósito (la clienta, 14/10): es el
  mismo proyecto. Los tres vienen sin catalán.
- **Águeda va corta de resolución**: sus fotos están por debajo de 1400 px. En la
  columna de 800 se defiende, pero no aguanta más.
- El about en inglés y catalán es traducción provisional: que lo revise ella.

## Historia

Antes de esto el repo era un clon de **amargor.es**, el Cargo.site viejo, hecho
para tenerlo de referencia. Está en el historial hasta el commit anterior a
«Empezar el diseño de cero», por si hiciera falta mirarlo.
