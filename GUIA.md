# Cómo actualizar tu web

Hola, Almudena. Esta guía es para que puedas cambiar tu web tú misma: añadir un
proyecto, cambiar fotos o textos, cambiar qué sale en el mapa… Todo se hace
desde **Visual Studio Code** (VS Code), un programa gratuito: abres el archivo,
lo cambias, y con dos clics sale en la web.

> **La regla de oro**: solo tocas **dos carpetas**: `projects/` (tus proyectos)
> y `data/` (lo general de la web). Lo demás es el código: mejor no tocarlo.

Cuando guardas un cambio, la web se actualiza sola en **2 o 3 minutos**. Si te
equivocas en algo, la web **no se rompe**: se queda como estaba hasta que lo
arregles (abajo, en *Si algo va mal*).

---

## 0. Antes de empezar (solo la primera vez)

1. Hazte una cuenta en [github.com](https://github.com) y pásanos tu nombre de
   usuario.
2. Te pasamos **una copia de la web a tu cuenta**: desde ese momento es tuya y
   vive en `https://github.com/TU-USUARIO/almarbra`.
3. Instala **Visual Studio Code**: https://code.visualstudio.com
4. Ábrelo y trae la web a tu ordenador: a la izquierda, el icono de las ramas
   (**Source Control**) → **Clone Repository** → **Clone from GitHub** → entra
   con tu cuenta → elige `TU-USUARIO/almarbra` → elige una carpeta de tu
   ordenador → **Open**. Si te pide instalar Git, acepta.

A partir de aquí, la web es esa carpeta: cada vez que abras VS Code, se abre
ahí.

Para preparar las fotos, **imgToWeb**: https://meowrhino.github.io/imgToWeb/
(las convierte al formato de la web, `.webp`, del tamaño justo, y las numera).
**Ábrelo en Chrome o Firefox**, no en Safari: Safari no sabe hacer `.webp` y
imgToWeb se salta las fotos.

---

## 1. Cómo está organizado

```
projects/                     ← tus proyectos, uno por carpeta
  roma/
    project.json              ← los textos del proyecto
    img/                      ← sus fotos: 1.webp, 2.webp, 3.webp…
  helen/
    project.json
    img/
  …
data/
  site.json                   ← qué proyectos salen y en qué orden, tu email, Instagram, el menú…
  about.json                  ← el texto del about
```

El **nombre de la carpeta** de un proyecto es su dirección en la web:
`projects/roma/` → `tuweb.com/projects/roma/`. Va en minúsculas, sin tildes ni
espacios (con guiones: `nuevo-proyecto`).

---

## 2. Cómo se hace un cambio con VS Code

1. **Antes de nada, baja la última versión**: en la barra de abajo del todo,
   pulsa las flechas ⟳ (**Sync**). Así tienes lo que hay publicado.
2. En la columna de la izquierda, abre el archivo (por ejemplo
   `projects/helen/project.json`) y cambia lo que quieras. Guarda con **Cmd+S**.
   Si algo sale **subrayado en rojo**, hay una coma o unas comillas mal:
   arréglalo antes de seguir (punto 6).
3. A la izquierda, el icono de las ramas (**Source Control**): escribe en una
   línea qué has cambiado ("texto de helen") y pulsa **Commit**.
4. Pulsa **Sync Changes** (el mismo botón azul).

Ya está: en 2-3 minutos sale en la web.

**Para añadir fotos**: arrastra los archivos a su carpeta `img/` (por ejemplo
`projects/helen/img/`) en la columna de la izquierda de VS Code, y luego los
pasos 3 y 4.

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
- `map` (mapa): las que salen en el mapa de la portada.

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

### Cambiar el orden de los proyectos, o esconder uno

En `data/site.json`, en `lists`. Hay dos, **textil** y **foto**, cada una con su
nombre en el menú (`name`) y los nombres de las carpetas de sus proyectos
(`projects`), en el orden en que salen:

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
- Para **esconder** un proyecto sin borrarlo, quítalo de la lista. Para que
  vuelva, lo pones otra vez.
- Para **pasarlo de lista**, lo mueves de una a la otra.

### Cambiar el about, tu email o tu Instagram

- El texto, en `data/about.json` (igual que el de un proyecto: lista de párrafos
  en `es`, `en` y `ca`).
- El email y el Instagram, en `data/site.json`: `"email"` y `"social"`.

---

## 4. Añadir un proyecto nuevo

1. **Las fotos**: pásalas por imgToWeb en el orden en que quieras que salgan
   (puedes arrastrarlas para ordenarlas) y descarga el zip.
2. **La carpeta**: en VS Code, **copia la carpeta de otro proyecto** (por
   ejemplo `projects/helen/`: clic derecho → Copy, y Paste sobre `projects/`) y
   cámbiale el nombre a `nuevo-proyecto`.
3. **Las fotos**: borra las de su `img/` y arrastra ahí las del zip.
4. **Los textos**: abre su `project.json` y cámbialo (abajo, uno mínimo).
5. **Que salga**: en `data/site.json`, añade `"nuevo-proyecto"` a los
   `projects` de la lista `textil` o `foto`, donde quieras que salga.
6. **Commit** y **Sync Changes** (punto 2).

Un `project.json` mínimo:

```json
{
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
| `cover` | la portada: la foto de la lista y de compartir | `["8"]` |
| `map` | las fotos del mapa | `["1", "3", "5"]` |
| `photos` | la galería, en orden | `["1", "2", "3"]` |
| `groups` | *(en vez de `photos`)* la galería por partes, cada una con su nombre, como en Roma | `[{ "name": "Virgen", "photos": ["10", "11"] }]` |
| `color` | *(opcional)* su color, si no le toca uno solo | `"#982F0C"` |

En `credits`, el rol (`role`) va por idioma; si es igual en los tres, basta con
escribirlo una vez: `"role": "Make up & hair"`. El enlace (`url`) es opcional.

Las líneas que empiezan por `"_` son notas (por ejemplo `"_borrador"`): no salen
en la web.

---

## 6. Si algo va mal

**Casi siempre es una coma o unas comillas.** En un `.json`:

- cada texto va entre comillas dobles: `"así"`;
- entre dos cosas de una lista va una coma: `["1", "2", "3"]`;
- **después de la última, no**: `["1", "2", "3",]` ✗.

**Cómo saber si ha ido bien**: en github.com, en tu web
(`github.com/TU-USUARIO/almarbra`), pestaña **Actions**. Lo último que has
subido sale con un círculo:

- 🟢 verde: publicado.
- 🟡 amarillo: publicándose (2-3 minutos).
- 🔴 rojo: no se ha publicado, y **la web sigue como estaba**. Entra, pulsa en
  **build** y verás una línea con ✗ que dice qué pasa y dónde. Por ejemplo:

  ```
  ✗ projects/helen/project.json no es un JSON válido: … (line 12 column 5)
  ✗ projects/helen: en «map», 9 no está entre sus fotos
  ✗ la lista «foto» de data/site.json nombra «helenn», y no hay projects/helenn/project.json
  ```

  Arréglalo en VS Code (el número de línea te dice dónde mirar), y otra vez
  **Commit** y **Sync Changes**.

Si no ves qué es, escríbeme con el mensaje en rojo y lo miramos.
