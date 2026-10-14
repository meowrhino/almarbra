# Cómo actualizar tu web

Hola, Almudena. Esta guía es para que puedas cambiar tu web tú misma: añadir un
proyecto, cambiar fotos o textos, cambiar qué sale en el mapa… Todo se hace
desde el navegador, en GitHub, sin instalar nada.

> **La regla de oro**: solo tocas **dos carpetas**: `projects/` (tus proyectos)
> y `content/` (lo general de la web). Lo demás es el código: mejor no tocarlo.

Cuando guardas un cambio, la web se actualiza sola en **2 o 3 minutos**. Si te
equivocas en algo, la web **no se rompe**: se queda como estaba hasta que lo
arregles (abajo, en *Si algo va mal*).

---

## 0. Antes de empezar (solo la primera vez)

1. Hazte una cuenta en [github.com](https://github.com) y pásanos tu nombre de
   usuario.
2. Te pasamos **una copia de la web a tu cuenta**: desde ese momento es tuya y
   vive en `https://github.com/TU-USUARIO/almarbra`. Ahí es donde haces los
   cambios de esta guía.

Y para preparar las fotos, **imgToWeb**: https://meowrhino.github.io/imgToWeb/
(la convierte al formato de la web, `.webp`, del tamaño justo, y las numera).
**Ábrelo en Chrome o Firefox**, no en Safari: Safari no sabe hacer `.webp` y
imgToWeb se salta las fotos.

---

## 1. Cómo está organizado

```
projects/                     ← tus proyectos, uno por carpeta
  roma/
    proyecto.json             ← los textos del proyecto
    img/                      ← sus fotos: 1.webp, 2.webp, 3.webp…
  helen/
    proyecto.json
    img/
  …
content/
  web.json                    ← qué proyectos salen y en qué orden, tu email, Instagram…
  about.json                  ← el texto del about
  textos.json                 ← las palabras del menú
```

El **nombre de la carpeta** de un proyecto es su dirección en la web:
`projects/roma/` → `tuweb.com/projects/roma/`. Va en minúsculas, sin tildes ni
espacios (con guiones: `nuevo-proyecto`).

---

## 2. Cómo se edita un archivo en GitHub

1. Entra en el archivo (por ejemplo `projects/helen/proyecto.json`).
2. Pulsa el **lápiz** ✏️ (arriba a la derecha del archivo).
3. Cambia lo que quieras.
4. Pulsa **Commit changes…** (botón verde), escribe en una línea qué has
   cambiado ("texto de helen") y otra vez **Commit changes**.

Ya está: en 2-3 minutos sale en la web.

**Para subir fotos**: entra en la carpeta (`projects/helen/img/`), pulsa
**Add file → Upload files**, arrastra las fotos y **Commit changes**.

---

## 3. Lo que más vas a hacer

### Cambiar un texto de un proyecto

En su `proyecto.json`. Los textos van en los tres idiomas: `es`, `en`, `ca`. Si
uno se queda vacío, sale el español.

La sinopsis es una **lista de párrafos**, cada uno entre comillas y separados por
comas:

```json
"synopsis": {
  "es": ["Primer párrafo.", "Segundo párrafo."],
  "en": ["First paragraph.", "Second paragraph."],
  "ca": ["Primer paràgraf.", "Segon paràgraf."]
}
```

### Cambiar qué fotos salen en el mapa, o la portada

En su `proyecto.json`, por el **número** de la foto (`"5"` es la `5.webp` de su
carpeta `img/`):

```json
"portada": ["8"],
"mapa": ["1", "3", "5", "8"],
```

- `portada`: la foto que sale en la lista y cuando alguien comparte el enlace.
- `mapa`: las que salen en el mapa de la portada.

### Cambiar el orden de las fotos, o quitar una

En `fotos`, el orden es el de la galería. Para cambiarlo, mueve los números;
para quitar una, bórrala de la lista (la foto puede quedarse en `img/`, no
pasa nada):

```json
"fotos": ["1", "2", "4", "3", "5"]
```

### Añadir fotos a un proyecto

1. Pásalas por imgToWeb. **Ojo**: imgToWeb las numera desde el 1. Si el
   proyecto ya tiene 16 fotos, cámbiales el nombre a 17, 18… antes de subirlas,
   o pasa por imgToWeb **todas** las fotos del proyecto otra vez (en el orden
   que quieras) y súbelas todas, sustituyendo las de antes.
2. Súbelas a su carpeta `img/`.
3. Añade sus números a `fotos` en el `proyecto.json`.

### Cambiar el orden de los proyectos, o esconder uno

En `content/web.json`, en `listas`. Hay dos, **textil** y **foto**, cada una con
los nombres de las carpetas de sus proyectos, en el orden en que salen:

```json
"listas": {
  "textil": ["corporea", "cuerpo-esquema", "light-beam-digital", "mattering", "roma", "unbound-threads"],
  "foto": ["sicky-magazine", "vein-magazine", "kaltbult-magazine", …]
}
```

- Para **cambiar el orden**, mueve los nombres.
- Para **esconder** un proyecto sin borrarlo, quítalo de la lista. Para que
  vuelva, lo pones otra vez.
- Para **pasarlo de lista**, lo mueves de una a la otra.

### Cambiar el about, tu email o tu Instagram

- El texto, en `content/about.json` (igual que la sinopsis: lista de párrafos
  en `es`, `en` y `ca`).
- El email y el Instagram, en `content/web.json`: `"email"` y `"redes"`.

---

## 4. Añadir un proyecto nuevo

1. **Las fotos**: pásalas por imgToWeb en el orden en que quieras que salgan
   (puedes arrastrarlas para ordenarlas) y descarga el zip.
2. **La carpeta y sus textos**: en GitHub, entra en `projects/`, pulsa
   **Add file → Create new file** y en el nombre escribe
   `nuevo-proyecto/proyecto.json` (al escribir la barra `/`, se crea la
   carpeta). Pega dentro el contenido de otro `proyecto.json` (por ejemplo el
   de `helen`) o el de abajo, y cámbialo. **Commit changes**.
3. **Las fotos**: en tu ordenador, mete las fotos del zip en una carpeta que
   se llame `img`. En GitHub, entra en `projects/nuevo-proyecto/`, pulsa
   **Add file → Upload files** y arrastra **la carpeta `img`** entera (en
   Chrome se puede arrastrar una carpeta y GitHub la respeta). **Commit
   changes**.
4. **Que salga**: en `content/web.json`, añade `"nuevo-proyecto"` a la lista
   `textil` o `foto`, donde quieras que salga.

Un `proyecto.json` mínimo:

```json
{
  "title": { "es": "NUEVO PROYECTO", "en": "NEW PROJECT", "ca": "NOU PROJECTE" },
  "synopsis": {
    "es": ["Texto."],
    "en": ["Text."],
    "ca": ["Text."]
  },
  "credits": [
    { "role": { "es": "Fotografía", "en": "Photography", "ca": "Fotografia" }, "name": "Almudena González", "url": "https://www.instagram.com/almarbra_/" },
    { "role": "Make up & hair", "name": "Nombre Apellido", "url": "https://www.instagram.com/usuario/" }
  ],
  "portada": ["1"],
  "mapa": ["1", "2", "3"],
  "fotos": ["1", "2", "3", "4"]
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
| `synopsis` | el texto, lista de párrafos por idioma | `{ "es": ["Uno.", "Dos."] }` |
| `credits` | quién hizo qué: una persona por línea | ver arriba |
| `portada` | la foto de la lista y de compartir | `["8"]` |
| `mapa` | las fotos del mapa | `["1", "3", "5"]` |
| `fotos` | la galería, en orden | `["1", "2", "3"]` |
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

**Cómo saber si ha ido bien**: en GitHub, pestaña **Actions**. Lo último que
has guardado sale con un círculo:

- 🟢 verde: publicado.
- 🟡 amarillo: publicándose (2-3 minutos).
- 🔴 rojo: no se ha publicado, y **la web sigue como estaba**. Entra, pulsa en
  **build** y verás una línea con ✗ que dice qué pasa y dónde. Por ejemplo:

  ```
  ✗ projects/helen/proyecto.json no es un JSON válido: … (line 12 column 5)
  ✗ projects/helen: en «mapa», 9 no está entre sus fotos
  ✗ la lista «foto» de content/web.json nombra «helenn», y no hay projects/helenn/proyecto.json
  ```

  Arréglalo (el número de línea te dice dónde mirar), guarda otra vez, y listo.

Si no ves qué es, escríbeme con el mensaje en rojo y lo miramos.
