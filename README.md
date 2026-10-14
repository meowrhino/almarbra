# almarbra

Portfolio de **Almudena González**. Sitio estático de verdad: el contenido vive en
JSON, un script escupe un `.html` por proyecto en `dist/`, y el navegador solo
recibe HTML, CSS e imágenes. Sigue la receta de
[meowrhino/JAMstack](https://github.com/meowrhino/JAMstack), como polroig. **Cero dependencias**, y el JavaScript de navegador son cuatro archivos pequeños: el mapa, la transición, los hilos y el hilo de los proyectos.

Fondo blanco, Helvetica (la del sistema: nada que descargar) en minúscula y las
fotos mandando, unidas por hilos de píxeles del color de cada proyecto.

**La interfaz**, igual en todas las páginas: el nombre arriba a la izquierda
(lleva siempre a la portada); **mapa · textil · foto · about** arriba a la derecha,
con lo que está puesto marcado; el idioma (**es · en · ca**) abajo a la
derecha, salvo en el mapa. Todo sin fondo y en `difference`, para que se lea
sobre las fotos.

- **portada** (`/`): el **mapa** (`#mapa`), una de las dos **listas**
  (`#textil`, `#foto`) o el **about** (`#about`). En el mapa salen los
  proyectos de las dos.

  El mapa es la idea de anaelleblin.com: las fotos de todos los proyectos,
  más o menos por zonas (la `mezcla`), en un plano que se arrastra, y las de
  un mismo proyecto unidas por un hilo fino de su color, que serpentea y se
  dibuja al cargar. Al lado de cada hilo, una pelusa de píxeles sueltos, como
  si se deshilachara. Al pasar por una foto se enciende su proyecto, le brota
  alrededor un halo de píxeles de su color, y sus hilos se descosen y se
  vuelven a coser por otro camino (con su pelusa nueva). Abajo en el centro, el
  zoom: un − y un + que pesan como una balanza (en el zoom de partida son
  iguales; cuanto más cerca, más grande el + y más pequeño el −).

  Las listas: una por cada una de `listas` en `content/web.json`, cada una su
  vista en el menú, en el orden de `listas`. Sin JavaScript salen las dos
  seguidas, con su nombre encima. Dentro, en zigzag: un proyecto a la
  izquierda con su nombre debajo, el siguiente a la derecha y más abajo, y
  así, solapándose a media altura. Sin hilos. En el móvil, una columna,
  alternando también de lado.

  Los hilos del mapa van a media luz; al pasar por una foto, los de su
  proyecto se encienden del todo. Sin desenfoque bajo las franjas: el
  `difference` ya las deja leer sobre las fotos.

  El about: el texto de `content/about.json` arriba a la izquierda, bajo el
  nombre; debajo, el email y el Instagram, y quién hizo la web. Detrás, un telar: hilos de borde a borde, en horizontal y en
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
  se sale se borra; al volver, se teje otro. Va entero sobre el blanco y al
  20 % sobre las fotos y el texto.

## Lo que se cambia sin tocar código

Cada proyecto en su carpeta, con todo lo suyo: `projects/<slug>/proyecto.json`
y sus fotos en `img/` (`1.webp`, `2.webp`…). Lo general, en `content/`. Cada
JSON general lleva arriba una nota (`"_"`) que dice qué se puede poner. Se edita,
se hace push y en un par de minutos está publicado.

| archivo | qué |
|---|---|
| `projects/<slug>/proyecto.json` | el proyecto: título, sinopsis, créditos, fotos, portada y mapa (abajo) |
| `content/web.json` | título, dirección, descripción (por idioma), idiomas, **las listas con sus proyectos**, colores, email, redes y `mezcla` del mapa (0 por zonas, 100 todo revuelto; ahora 50) |
| `content/about.json` | el texto del about, en es / en / ca, como lista de párrafos (vacío = sale el español) |
| `content/textos.json` | las palabras del menú y el nombre de cada lista, por idioma |

```bash
npm run build     # content/ + projects/ -> dist/
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
projects/<slug>/        un proyecto, todo junto
  proyecto.json                    título, sinopsis, créditos, fotos, portada, mapa
  img/1.webp img/2.webp …          sus fotos, tal cual salen de imgToWeb

content/web.json        título, url, idiomas, listas, colores, contacto y mezcla
content/about.json      el texto del about
content/textos.json     menú y listas, por idioma

build/proyectos.mjs     lee projects/ en el orden de las listas (build y og)
build/build.mjs         content/ + projects/ -> dist/, validando antes
build/serve.mjs         servidor local de dist/
build/watch.mjs         rehace dist/ al guardar (para Live Server)

css/style.css           todo el estilo
js/mapa.js              el mapa (con su halo y su pelusa), las listas y el cambio de vista
js/telar.js             el telar de detrás del about
js/transicion.js        la transición al cambiar de página o de vista, y la entrada de las fotos
js/hilos.js             la curva y la forma de todos los hilos (también la usa el build)
js/hilo.js              el hilo de la página de un proyecto
favicon.svg             dos hilos de píxeles

_headers                caché por carpeta (Cloudflare; GitHub Pages lo ignora)
wrangler.jsonc          para cuando pase a Cloudflare Workers
.github/workflows/      build y publicación en cada push a main

dist/                   GENERADO por el build — FUERA DE GIT
  index.html
  projects/<slug>/index.html
  en/  ca/                         lo mismo en cada idioma
  404.html  sitemap.xml  robots.txt  .nojekyll  _headers
  og.jpg                           la imagen para compartir de la portada
  css/  js/                        copia tal cual
  media/<slug>/img/                las fotos de cada proyecto
  media/<slug>/mapa/               las del mapa, a 600 px (cwebp, desde .cache/)
  media/<slug>/og.jpg              la imagen para compartir (ffmpeg, desde .cache/)
```

En git va **solo el fuente**: `content/`, `projects/` y el código. Las páginas no
se commitean; las escribe la Action. En la web las fotos se sirven desde
`media/<slug>/` y no junto a la página de su proyecto, para que `_headers` les dé
su caché larga sin dársela al HTML.

## Un proyecto

```jsonc
// projects/roma/proyecto.json
{
  "title":    { "es": "ROMA: CIUDAD EN RUINAS…", "en": "ROME: RUINS…" },
  "short":    { "es": "roma" },                // nombre corto para el mapa (si no, el título)
  "synopsis": { "es": ["primer párrafo", "segundo párrafo"] },
  "credits":  [                               // uno por persona; el rol por idioma, o un texto si es igual
    { "role": { "es": "Modelo", "en": "Model", "ca": "Model" }, "name": "…", "url": "https://…" },
    { "role": "Make up & hair", "name": "…" }
  ],
  "color":    "#982F0C",                      // si no, el que le toque de web.json
  "portada":  ["10"],                         // la que sale en la lista y al compartir
  "mapa":     ["2", "3", "5"],
  "fotos":    ["1", "2", "3"]                 // la galería, en este orden
}
```

- Las fotos se nombran por **su número**, sin `.webp` (todas lo son): `"3"` es
  `img/3.webp`. El orden de `fotos` es el de la galería: para reordenar,
  se mueven en la lista; para quitar una, se borra de la lista.
- El ancho y el alto **no se escriben**: el build los lee del propio `.webp`.
- `portada` y `mapa` tienen que estar entre las fotos; si no, el build para y
  dice cuál. Sin `portada`, la primera foto. Sin `mapa`, va la portada y cinco
  más, repartidas por la galería.
- Por grupos (Roma, en tres piezas), `grupos` en vez de `fotos`:
  `"grupos": [{ "nombre": "Laocoonte", "fotos": ["1", "2", …] }, …]`.
- **Los créditos**: una lista, una persona por línea, con su enlace. Dos
  seguidas con el mismo rol lo comparten en la web (salen una debajo de otra).
- **Los textos largos** (`synopsis`, y el about) son una **lista de párrafos**.
  Un salto de línea dentro de un párrafo (`\n`) se queda, como en los versos de
  Roma.
- Las claves que empiezan por `_` son notas, no contenido.
- **El nombre del proyecto es el de su carpeta**, y es su dirección:
  `projects/roma/` → `/projects/roma/`.

**En qué lista sale, y en qué orden**: `listas` en `content/web.json`.

```json
"listas": {
  "textil": ["corporea", "cuerpo-esquema", "light-beam-digital", …],
  "foto":   ["sicky-magazine", "vein-magazine", …]
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
2. dentro, las fotos que saca imgToWeb en `img/`, y un `proyecto.json` (lo más
   fácil: copiar el de otro y cambiarlo);
3. su nombre en una lista de `content/web.json` (`listas`), donde tenga que
   salir.

Y ya: las fotos pequeñas del mapa y la imagen para compartir las hace el build.

**Fotos en un proyecto que ya está**: se dejan en su `img/` con el número
siguiente y se añaden a `fotos`. Para rehacer el orden entero, imgToWeb con
todas otra vez.

**El mapa** no usa las grandes: enseña las fotos a 170 px como mucho (340 con
el zoom), y bajarse 94 de 2000 px eran 30 MB. El build hace de cada foto del mapa
una de 600 px con `cwebp` (en `.cache/mapa/`, fuera de git, y solo las que no
estén o hayan cambiado; desde cero, unos 4 s) y las publica en
`media/<slug>/mapa/`: 5 MB. Desde cero, con las imágenes para compartir, el build
tarda unos 6 s; con la caché, menos de uno. La clienta no ve nada de esto. En la Action, `cwebp`
lo instala el workflow; en local, `brew install webp`. Sin él, el build avisa y el
mapa usa las grandes.

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
  en la portada, la de `content/web.json`), en su idioma.
- `canonical`, `hreflang` de los tres idiomas y `x-default` (el español).
- `og:*` y `twitter:card`, con su imagen de 1200×630 en JPG (abajo): al
  compartir un proyecto se ve ese proyecto.
- JSON-LD: en la portada, `Person` (con `email` y `sameAs` si se ponen en
  `content/web.json`); en cada proyecto, `CreativeWork` con ella de autora.
- `<main>`, un solo `h1` y `alt` en las fotos de la galería: el suyo si lo
  tiene en el JSON y si no, el título del proyecto y el del grupo.
- `favicon.svg` y `theme-color`.

Más `404.html` (con `noindex`), `sitemap.xml` con las tres versiones de cada
página y `robots.txt`.

**Antes de escribir nada, valida.** Un JSON con una coma de menos, una foto que no
está en su carpeta, una `portada` o `mapa` que no está entre las fotos, o una
lista que nombra un proyecto que no existe paran el build con el archivo y lo que
pasa:

```
✗ projects/helen/proyecto.json no es un JSON válido: … (line 3 column 3)
✗ projects/helen: no encuentro 99.webp
✗ projects/helen: en «mapa», 07.webp no está entre sus fotos
```

En la Action eso sale en rojo y la web publicada se queda como estaba.

### Publicar

Cada push a `main` lanza `.github/workflows/deploy.yml`: `node build/build.mjs` y
sube `dist/` a GitHub Pages, con `cwebp` instalado antes para las fotos del mapa.
Tarda un par de minutos;
en la pestaña **Actions** de GitHub, verde es publicado.

En GitHub, *Settings → Pages → Source* tiene que estar en **GitHub Actions**.

En `content/web.json`, `colors` da un color por proyecto, en el orden de
`listas`: nombres de CSS de las cuatro
familias de Maroon, MediumSpringGreen, Turquoise y Violet, alternadas para que
dos proyectos seguidos no sean de la misma. Un proyecto con `color` en
su `proyecto.json` usa el suyo. Si a alguno no le llega color, el build para y
lo dice.

El ancho de la columna de un proyecto —800 px— vive en `--col`, en
`css/style.css`, y `build/build.mjs` lo repite en el `sizes` de cada foto para
que el navegador no se baje una más grande de la cuenta. Si cambia uno, cambia el
otro.

## El JavaScript de navegador

El mapa cambia **en cada carga**, así que no se hornea: el HTML trae las fotos
(las de `mapa`, ver arriba) y `js/mapa.js` las reparte por todo el plano, sin
pisarse y por zonas: primero la primera foto de cada proyecto, separadas entre
sí, y luego el resto alrededor de la suya (`REACH`). La `mezcla` de
`content/web.json` tira de cada foto desde su zona hacia un sitio cualquiera
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
le toca en el sentido de la ola más un retraso por línea: el frente, que va
de una curva suave a otra mientras avanza (las dos al azar, con algo de
inclinación) y lleva encima una onda corta de un píxel (`RIPPLE`) que lo hace
moverse. Se tapa cuando le llega y se destapa igual, y
la ola lleva `BAND` píxeles de color delante. Los enlaces a otra página de la
web se interceptan: se tapa, se apunta en `sessionStorage` el sentido y los
colores, y se va; la página nueva nace tapada (un `<script>` en el `<head>`
le pone `.tapada`) y se destapa en ese sentido. Si el script no llegara, el
CSS la destapa sola a los 5 s. Mapa, lista y about son la misma página: ahí
la llama `js/mapa.js` al cambiar el hash. Con atrás y adelante del navegador
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

La vista la dice el hash, así que atrás y adelante funcionan y se puede enlazar
`/#textil`. Un `<script>` en el `<head>` la pone antes de pintar, con un
`<style>` que esconde las otras listas y marca la vista en el menú (dependen de
las listas que haya, así que los escribe el build); otro, en
todas las páginas, pone lo demás que no puede esperar: `.js` y si
la página nace tapada (`HEAD_SCRIPT`, en `build/build.mjs`).

**Sin JavaScript la portada son las listas**, seguidas, que es también lo que leen el teclado
y los lectores de pantalla: el mapa va con `aria-hidden`.

El CSS y los scripts se enlazan con `?v=<hash>` de su contenido: un deploy nunca deja a nadie con
estilos viejos en caché.

Todas las páginas llevan `noindex` y `robots.txt` bloquea el sitio, hasta que haya
web de verdad.

## Lanzar

El Instagram y el email ya están. Lo que falta es el dominio.

**1. En `content/web.json`:**

- `"redes": ["https://www.instagram.com/usuario/"]`: sale al pie del about como
  `@usuario`, y en el JSON-LD como `sameAs` (Google une la web con la cuenta).
- `"email": "…"`: al pie del about, delante de las redes. Vacío, no sale.
- `"url": "https://eldominio.com/"`: la dirección definitiva, con la `/` del
  final. De ahí salen los canonical, los `hreflang`, las `og:image`, el sitemap
  y los enlaces de la 404. Los demás enlaces son relativos: no hay que tocar nada más.
- `"noindex": false`: quita el meta y abre `robots.txt` con su `Sitemap:`.

**2. El dominio**, una de dos:

- **GitHub Pages** (como ahora): en el repo, *Settings → Pages → Custom domain*,
  el dominio. En el DNS del dominio, cuatro registros `A` a `185.199.108.153`,
  `185.199.109.153`, `185.199.110.153` y `185.199.111.153`, y un `CNAME` de `www`
  a `meowrhino.github.io`. Cuando GitHub dé el certificado, *Enforce HTTPS*.
- **Cloudflare Workers** (lo que pide la receta: `_headers` con la caché,
  sin el límite de 10 min de GitHub): Workers Builds conectado al repo;
  `wrangler.jsonc` ya está y el comando es `node build/build.mjs`. Luego, el
  dominio en *Custom domains*. Si se hace así, borrar
  `.github/workflows/deploy.yml` para no publicar dos veces.

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
primeros proyectos en fila. Con ffmpeg (en la Action lo instala el workflow; en
local, `brew install ffmpeg`), en `.cache/og/` con nombre según las fotos de las
que sale: solo se rehacen si cambia una portada. Sin ffmpeg, el build avisa y se
comparte la portada tal cual.

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
  alfabético hasta que diga otro (se cambia en `listas`).
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
