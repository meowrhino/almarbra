# Cómo actualizar tu web

Hola, Almudena. Esta guía es para que puedas cambiar tu web tú misma: añadir un
proyecto, cambiar fotos o textos, cambiar qué sale en el mapa… Todo se hace
desde **Visual Studio Code** (VS Code), un programa gratuito: abres el archivo,
lo cambias, y con dos clics sale en la web.

> **La regla de oro**: solo tocas **tus carpetas**: `projects/` (tus
> proyectos), `diaris/` (sus fotos), `about/` y `contacto/` (sus fotos) y
> `data/` (lo general de la web). Lo demás es el código: mejor no tocarlo.

Cuando guardas un cambio, la web se actualiza sola en **2 o 3 minutos**. Si te
equivocas en algo, la web **no se rompe**: se queda como estaba hasta que lo
arregles (abajo, en *Si algo va mal*).

---

## 0. Antes de empezar (solo la primera vez)

1. Hazte una cuenta en [github.com](https://github.com) y pásanos tu nombre de
   usuario.
2. Te pasamos **una copia de la web a tu cuenta**: desde ese momento es tuya y
   vive en `https://github.com/almarbra/almudena`.
3. Instala **Visual Studio Code**: https://code.visualstudio.com
4. Ábrelo y trae la web a tu ordenador: a la izquierda, el icono de las ramas
   (**Source Control**) → **Clone Repository** → **Clone from GitHub** → entra
   con tu cuenta → elige `almarbra/almudena` → elige una carpeta de tu
   ordenador → **Open**. Si te pide instalar Git, acepta.

A partir de aquí, la web es esa carpeta: cada vez que abras VS Code, se abre
ahí.

5. Instala **Live Server**, para ver los cambios antes de subirlos: a la
   izquierda, el icono de los cuadraditos (**Extensions**) → busca
   `Live Server` (el de Ritwick Dey) → **Install**. Abajo a la derecha sale
   un botón **Go Live**.

Para preparar las fotos, **imgToWeb**: https://meowrhino.github.io/imgToWeb/
(las convierte al formato de la web, `.webp`, del tamaño justo, y las numera).
**Ábrelo en Chrome o Firefox**, no en Safari: Safari no sabe hacer `.webp` y
imgToWeb se salta las fotos.

---

## 1. Cómo está organizado

```
projects/                     ← todos los proyectos, uno por carpeta
  roma/
    project.json              ← los textos del proyecto
    img/                      ← sus fotos: 1.webp, 2.webp, 3.webp…
  helen/
    project.json
    img/
  …
  …
diaris/                       ← las fotos de diaris: 1.webp, 2.webp, 3.webp…
contacto/                     ← la foto de contacto: 1.webp
about/                        ← la foto del about: la que diga data/about.json
data/
  site.json                   ← qué proyectos salen y en qué orden, tu email, Instagram, el menú…
  about.json                  ← el texto del about
```

El **nombre de la carpeta** de un proyecto, junto con la lista en la que lo
pones en `data/site.json`, es su dirección en la web: `projects/roma/` en la
lista `textil` → `tuweb.com/textil/roma/`. Va en minúsculas, sin tildes ni
espacios (con guiones: `nuevo-proyecto`).

---

## 2. Cómo se hace un cambio con VS Code

1. **Antes de nada, baja la última versión**: en la barra de abajo del todo,
   pulsa las flechas ⟳ (**Sync**). Así tienes lo que hay publicado.
2. En la columna de la izquierda, abre el archivo (por ejemplo
   `projects/helen/project.json`) y cambia lo que quieras. Guarda con **Cmd+S**.
   Si algo sale **subrayado en rojo**, hay una coma o unas comillas mal:
   arréglalo antes de seguir (punto 6).
3. **Míralo**: pulsa **Go Live** (abajo a la derecha). Se abre tu web en el
   navegador, tal como quedará, y cada vez que guardas se recarga sola. Si
   algo está mal, en vez de la web sale un aviso en rojo que dice qué y dónde
   (punto 6). Esta vista es solo para ti: no se publica nada hasta el paso 5.
4. A la izquierda, el icono de las ramas (**Source Control**): escribe en una
   línea qué has cambiado ("texto de helen") y pulsa **Commit**.
5. Pulsa **Sync Changes** (el mismo botón azul).

Ya está: en 2-3 minutos sale en la web.

**Para añadir fotos**: arrastra los archivos a su carpeta `img/` (por ejemplo
`projects/helen/img/`) en la columna de la izquierda de VS Code, y luego los
pasos 3 a 5.

En la vista previa el mapa tarda un poco más en cargar que en la web de
verdad: usa las fotos grandes (las pequeñas se hacen al publicar). Es normal.

---

## 3. Lo que más vas a hacer

### Cambiar un texto de un proyecto

En su `project.json`. Los nombres de los campos van en inglés (`title`, el
título; `text`, el texto…: la tabla del punto 5 los explica todos), y lo que
escribes, en los tres idiomas: `es`, `en`, `ca`. Si uno se queda vacío, sale el
español.

El texto es una **lista de párrafos**, cada uno entre comillas y separados por
comas:

```json
"text": {
  "es": ["Primer párrafo.", "Segundo párrafo."],
  "en": ["First paragraph.", "Second paragraph."],
  "ca": ["Primer paràgraf.", "Segon paràgraf."]
}
```

### Cambiar qué fotos salen en el mapa, o la portada

En su `project.json`, por el **número** de la foto (`"5"` es la `5.webp` de su
carpeta `img/`):

```json
"cover": ["8"],
"map": ["1", "3", "5", "8"],
```

- `cover` (portada): la foto que sale en la lista y cuando alguien comparte el
  enlace.
- `map` (mapa): las que salen en el mapa de la portada. Puede llevar una que
  no esté en `photos`: sale solo en el mapa, y no en la página del proyecto.

### Cambiar el orden de las fotos, o quitar una

En `photos`, el orden es el de la galería. Para cambiarlo, mueve los números;
para quitar una, bórrala de la lista (la foto puede quedarse en `img/`, no
pasa nada):

```json
"photos": ["1", "2", "4", "3", "5"]
```

### Añadir fotos a un proyecto

1. Pásalas por imgToWeb. **Ojo**: imgToWeb las numera desde el 1. Si el
   proyecto ya tiene 16 fotos, cámbiales el nombre a 17, 18… antes de subirlas,
   o pasa por imgToWeb **todas** las fotos del proyecto otra vez (en el orden
   que quieras) y súbelas todas, sustituyendo las de antes.
2. Súbelas a su carpeta `img/`.
3. Añade sus números a `photos` en el `project.json`.

### Un vídeo en un proyecto

Un vídeo va como una foto más, por su número. Se prepara con **videoToWeb**:
https://meowrhino.github.io/videoToWeb/ (en Chrome o Firefox), con la opción
**fotograma** activada: de cada vídeo salen dos archivos, el vídeo (`.webm`) y
su fotograma (`.poster.webp`), que es lo que se ve mientras llega y lo que sale
en el mapa y al compartir. Los dos van a `img/` con el mismo número:
`img/5.webm` y `img/5.poster.webp`, y en el JSON se pone `"5"` como con una
foto (en `photos`, `cover` o `map`). En la web se ve en bucle y sin sonido.

Cuanto más corto, mejor: un vídeo de minutos pesa decenas de MB y tarda en
llegar; para la web lo mejor es un trozo de unos segundos en bucle. Un
archivo no puede pasar de **25 MB**: si pasa, la web no se publica.

### Diaris: añadir o quitar fotos

En diaris salen **todas** las fotos de la carpeta `diaris/`, en otro orden cada
vez que alguien entra. No hay JSON: solo las fotos.

- **Añadir**: pásalas por imgToWeb y súbelas a `diaris/`. Como imgToWeb numera
  desde el 1, si ya hay 66, cámbiales el nombre a 67, 68… antes de subirlas.
- **Quitar**: borra la foto de `diaris/`, y cambia el nombre de la última al
  número que ha quedado libre (si borras la 12 y hay 66, la 66 pasa a ser la
  12). Si queda un hueco, la web sale bien, pero la vista previa se para ahí.

### Cambiar el orden de los proyectos, o esconder uno

En `data/site.json`, en `lists`. Hay dos, **textil** y **foto** (las dos
carpetas), cada una con su nombre en el menú (`name`) y los nombres de las
carpetas de sus proyectos (`projects`), en el orden en que salen:

```json
"lists": {
  "textil": {
    "name": { "es": "textil", "en": "textile", "ca": "tèxtil" },
    "projects": ["corporea", "cuerpo-esquema", "light-beam-digital", "mattering", "roma", "unbound-threads"]
  },
  "foto": {
    "name": { "es": "foto", "en": "photo", "ca": "foto" },
    "projects": ["sicky-magazine", "vein-magazine", "kaltbult-magazine", …]
  }
}
```

- Para **cambiar el orden**, mueve los nombres.
- Para **esconder** un proyecto sin borrarlo, cambia su nombre por
  `{ "project": "roma", "visible": false }`. Sigue teniendo su página (puedes
  mandar el enlace a quien quieras), pero no sale en el mapa, en las listas ni
  en Google, y no pierde su sitio: para que vuelva, pones otra vez `"roma"`.
- Para **quitarlo del todo**, bórralo de la lista (la carpeta se puede quedar).
- Para **pasarlo de lista**, mueves su nombre de una lista a la otra en
  `data/site.json`. La carpeta no se toca.

### Cambiar el about, tu email, tu Instagram o la foto de contacto

- El texto del about, en `data/about.json` (igual que el de un proyecto: lista
  de párrafos en `es`, `en` y `ca`).
- El email y el Instagram salen en **contacto**. Se cambian en
  `data/site.json`: `"email"` y `"instagram"`. En el Instagram, solo tu
  usuario, sin la @: `"instagram": "almarbra_"`.
- La foto de contacto: pásala por imgToWeb y súbela a la carpeta `contacto/`
  con el nombre `1.webp`. Para cambiarla, sustituye esa. Sin foto, la página
  sale con el email y el Instagram solos.
- Si un JSON se te descoloca, **Format Document** en VS Code (clic derecho
  dentro del archivo) lo deja como estaba: los nuestros van ya con ese formato.
- La foto del about: está en la carpeta `about/` y `data/about.json` dice cuál
  en `"photo"`, con el nombre del archivo sin el `.webp`: `"photo": "about"`
  es `about/about.webp`. Para cambiarla, pásala por imgToWeb, súbela a
  `about/` y pon su nombre en `"photo"`. Sin `"photo"`, sale solo el texto.

### Que la web se abra en negro

En `data/site.json`, `"theme": "dark"` (en negro, con el color neón de cada
proyecto) o `"theme": "light"` (en blanco). Quien la visita lo puede cambiar
con el botón ◐ de abajo a la izquierda, y se le queda lo que eligió.

---

## 4. Añadir un proyecto nuevo

1. **Las fotos**: pásalas por imgToWeb en el orden en que quieras que salgan
   (puedes arrastrarlas para ordenarlas) y descarga el zip.
2. **La carpeta**: en VS Code, **copia la carpeta de otro proyecto** (por
   ejemplo `projects/helen/`: clic derecho → Copy, y Paste sobre `projects/`)
   y cámbiale el nombre a `nuevo-proyecto`.
3. **Las fotos**: borra las de su `img/` y arrastra ahí las del zip.
4. **Los textos**: abre su `project.json` y cámbialo (abajo, uno mínimo).
5. **Que salga**: en `data/site.json`, añade `"nuevo-proyecto"` a los
   `projects` de su lista (`textil` o `foto`, la de su carpeta), donde quieras
   que salga.
6. **Commit** y **Sync Changes** (punto 2).

Un `project.json` mínimo:

```json
{
  "$schema": "../../schema/project.json",
  "title": { "es": "NUEVO PROYECTO", "en": "NEW PROJECT", "ca": "NOU PROJECTE" },
  "text": {
    "es": ["Texto."],
    "en": ["Text."],
    "ca": ["Text."]
  },
  "credits": [
    { "role": { "es": "Fotografía", "en": "Photography", "ca": "Fotografia" }, "name": "Almudena González", "url": "https://www.instagram.com/almarbra_/" },
    { "role": "Make up & hair", "name": "Nombre Apellido", "url": "https://www.instagram.com/usuario/" }
  ],
  "color": "#5B9DC8",
  "neon": "#33AFFF",
  "cover": ["1"],
  "map": ["1", "2", "3"],
  "photos": ["1", "2", "3", "4"]
}
```

La imagen que sale al compartir el enlace (en WhatsApp, Instagram…) y las fotos
pequeñas del mapa **se hacen solas**: no tienes que hacer nada.

---

## 5. Qué va en cada campo de un proyecto

| campo | qué es | ejemplo |
|---|---|---|
| `title` | el título, por idioma | `{ "es": "ROMA", "en": "ROME", "ca": "ROMA" }` |
| `short` | *(opcional)* un nombre corto para el mapa | `{ "es": "roma" }` |
| `text` | el texto, lista de párrafos por idioma | `{ "es": ["Uno.", "Dos."] }` |
| `credits` | quién hizo qué: una persona por línea | ver arriba |
| `color` | su color: el de su hilo, sus huecos y la ola | `"#982F0C"` |
| `neon` | el mismo color en versión neón, para el modo oscuro (el botón ◐ de abajo a la izquierda); si no está, se usa `color` | `"#FF6633"` |
| `cover` | la portada: la foto de la lista y de compartir | `["8"]` |
| `map` | las fotos del mapa | `["1", "3", "5"]` |
| `photos` | la galería, en orden | `["1", "2", "3"]` |
| `groups` | *(en vez de `photos`)* la galería por partes, cada una con su nombre, como en Roma | `[{ "name": "Virgen", "photos": ["10", "11"] }]` |
| `description` | *(opcional)* la frase que sale en Google y al compartir | `{ "es": "…", "en": "…", "ca": "…" }` |

En `credits`, el rol (`role`) va por idioma; si es igual en los tres, basta con
escribirlo una vez: `"role": "Make up & hair"`. El enlace (`url`) es opcional.

Las líneas que empiezan por `"_` son notas (por ejemplo `"_borrador"`): no salen
en la web.

**VS Code te ayuda**: al pasar el ratón por un campo te dice qué es, al empezar
a escribir uno nuevo te propone los que hay, y uno mal escrito (`"covr"`) o del
tipo que no es sale **subrayado en rojo**. Lo sabe por la primera línea de cada
`.json` (`"$schema": …`): no la borres.

### Qué sale en Google y al compartir

| dónde | de qué campo |
|---|---|
| el título | la portada: `title` de `data/site.json`; un proyecto: su `title` |
| la frase de debajo | la portada y las listas: `description` de `data/site.json`; el about: su primer párrafo; un proyecto: su `description` o, si no hay, el primer párrafo de `text` |
| la imagen al compartir | un proyecto: su `cover`, entera sobre blanco (la hace la web al publicar); la portada y cada lista: las portadas de sus primeros proyectos, en fila |

Un proyecto escondido (`"visible": false`) no sale en Google.

---

## 6. Si algo va mal

**Casi siempre es una coma o unas comillas.** Lo ves antes de subirlo: con
**Go Live**, en vez de la web sale el aviso en rojo. En un `.json`:

- cada texto va entre comillas dobles: `"así"`;
- entre dos cosas de una lista va una coma: `["1", "2", "3"]`;
- **después de la última, no**: `["1", "2", "3",]` ✗.

**Cómo saber si ha ido bien**: en github.com, en tu web
(`github.com/almarbra/almudena`), al lado del último cambio (encima de la
lista de archivos) sale un círculo:

- 🟢 verde: publicado.
- 🟡 amarillo: publicándose (2-3 minutos).
- 🔴 rojo: no se ha publicado, y **la web sigue como estaba**. Pulsa en él →
  **Details**, y al final verás una línea con ✗ que dice qué pasa y dónde. Por
  ejemplo:

  ```
  ✗ projects/helen/project.json no es un JSON válido (línea 12, columna 5). …
  ✗ projects/helen/project.json: "covr" no es un campo de aquí (¿mal escrito?). Los que hay: …
  ✗ projects/helen: no encuentro img/9.webp
  ✗ projects/helen: en «cover», 9 no está entre sus fotos
  ✗ la lista «foto» de data/site.json nombra «helenn», y no hay projects/helenn/project.json
  ```

  Arréglalo en VS Code (el número de línea te dice dónde mirar; con **Go
  Live** verás que vuelve a salir la web), y otra vez **Commit** y **Sync
  Changes**.

Si no ves qué es, escríbeme con el mensaje en rojo y lo miramos.
