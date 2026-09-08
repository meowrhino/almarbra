# almarbra

Portfolio de **Almudena González**. Sitio estático de verdad: el contenido vive en
JSON, un script escupe un `.html` por proyecto, y el navegador solo recibe HTML,
CSS e imágenes. **Cero dependencias y cero JavaScript de navegador.**

Dos pantallas:

- **portada** (`/`): la foto a todo el ancho y sin recortar —se ve entera— con
  «entrar» encima. Debajo, otra pantalla de 100dvh en negro con la firma arriba y
  los proyectos desperdigados. «Entrar» es un ancla y el desplazamiento suave lo
  hace el navegador: por eso no hace falta JavaScript.
- **proyecto** (`/<slug>/`): ficha técnica —título, sinopsis y créditos— y la
  galería en scroll vertical.

```bash
npm run ingest    # originals/ -> img/*.webp + content/projects/*.json
npm run build     # content/ -> *.html
npm run serve     # http://localhost:8000
npm run dev       # build + serve
```

## Estructura

```
originals/              material de la clienta — FUERA DE GIT
  <CATEGORÍA>/<PROYECTO>/…/*.jpg + FICHA <PROYECTO>.rtf

content/site.json       título, idioma, meta
content/overrides.json  correcciones a mano
content/projects/*.json GENERADO por la ingesta

build/ingest.mjs        originals/ -> img/ + content/projects/
build/ficha.mjs         lector de las FICHAS .rtf
build/slug.mjs          slugs y nombres legibles
build/build.mjs         content/ -> *.html
build/serve.mjs         servidor local

css/style.css           todo el estilo
img/<categoría>/<slug>/ GENERADO: 825 webp, 133 MB
index.html              GENERADO — no editar a mano
<slug>/index.html       GENERADO — no editar a mano
```

## La ingesta

`npm run ingest` se come `originals/` entero:

1. convierte cada foto a WebP a `img/<categoría>/<proyecto>/<proyecto>-NN.webp`,
   más tres variantes pequeñas para el `srcset` —400, 800 y 1400 px de ancho—
   (946 MB → 133 MB);
2. lee la FICHA `.rtf` con `textutil` y saca título, sinopsis y créditos
   (rol, nombre, enlace) **en los tres idiomas** de la ficha: es, en, ca;
3. escribe `content/projects/<proyecto>.json`.

Es idempotente: se apoya en `content/.media-cache.json` y solo reconvierte lo que
haya cambiado. Sin cambios tarda menos de un segundo. `npm run ingest -- --force`
rehace todo.

**La conversión es la de `meowrhino/imgToWeb`**, que es la de todos los sitios:
calidad **0.85** y el **lado largo** topado a **2000 px**, con la proporción
intacta. Ojo: el tope es el lado largo, no el ancho — una foto vertical de
3840×5760 sale a 1333×2000, no a 2000×3000. Por eso las verticales rondan los
1333 px de ancho, y en las galerías cada foto lleva un `max-width` con su ancho
real para que no se amplíe en pantallas grandes.

No genera una variante más ancha que el original, así que el `srcset` de cada foto
lista solo los anchos que existen de verdad.

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

`source` en cada imagen dice de qué original salió: para volver atrás sin adivinar.

### content/overrides.json

`content/projects/*.json` lo **reescribe la ingesta cada vez**, así que editarlo a
mano no sirve de nada. Las correcciones van aquí, indexadas por slug, y se aplican
encima del JSON recién generado:

```jsonc
{
  "roma": {
    "title": { "es": "ROMA: CIUDAD EN RUINAS, IDENTIDAD EN CONSTRUCCIÓN" },
    "short": { "es": "roma" },                     // nombre corto para la portada
    "cover": "img/textil/roma/roma-12.webp"        // la foto que lo representa
  }
}
```

`cover` y `short` son solo para la portada; sin `cover` se usa la primera foto del
proyecto, y sin `short`, el título entero. Las claves que empiezan por `_` son
notas, no contenido.

Ahora mismo hay cinco correcciones: los títulos es/en de ROMA venían intercambiados
en la ficha, las dos SICKY se llamaban igual, y las tres series textiles llevan
portada elegida a mano (la primera foto de Cuerpo Esquema es una captura de
pantalla).

## El build

`build/build.mjs` genera `index.html` y un `<slug>/index.html` por proyecto, así
que las direcciones quedan `/roma/`, `/sicky-magazine/`… Son dos plantillas y ya.

Lo que se cambia sin tocar código, en `content/site.json`:

```jsonc
"home": {
  "enter": "entrar",                                             // la palabra de la portada
  "hero":  "img/textil/cuerpo-esquema/cuerpo-esquema-62.webp",   // la foto grande
  "seed":  1                                                     // baraja la colocación
},
"order": ["textil", "editorial-moda"]                            // en qué orden salen
```

La ruta de `hero` es la de `img/`: cualquier foto ya ingerida sirve, y cambiarla es
editar una línea y `npm run build`.

Los proyectos de la segunda pantalla van desperdigados de verdad: el build tira
posiciones al azar y descarta las que pisan a otro proyecto, aflojando la
separación que exige si no encuentra hueco. Nunca se solapan ni se salen del
borde. Hay dos repartos, uno para pantalla ancha y otro para móvil, porque las
cajas no miden lo mismo; van en `--x/--y` y `--mx/--my` y la hoja de estilo elige
con una media query.

La misma `seed` da siempre la misma colocación, así que el HTML es estable y no
hace falta JavaScript. Para barajar de nuevo, se cambia el número.

El CSS se enlaza con `?v=<hash>` de su contenido: un deploy nunca deja a nadie con
estilos viejos en caché.

Todas las páginas llevan `noindex` y `robots.txt` bloquea el sitio, hasta que haya
web de verdad. Se controla con `noindex` en `content/site.json`.

## Los 13 proyectos

**Editorial moda** (10): Águeda · Cap Magazine · Helen · Herdes Magazine ·
Kaltbult Magazine · Lula Japan Magazine · Sicky Magazine · Sicky Magazine (II) ·
Teeth Magazine · Vein Magazine — 143 fotos.

**Textil** (3): Corpórea (17) · Cuerpo Esquema (83) · Roma (16, en tres piezas:
Laocoonte, Río de la Plata, Virgen) — 116 fotos.

259 fotos, 825 WebP, 133 MB.

### Lo que hay que mirar antes de diseñar

- **Águeda va corta de resolución**: sus 9 fotos están por debajo de 1400 px (la
  menor, 541). No aguanta un hero a pantalla completa. Habría que pedirle los
  originales.
- **Cuerpo Esquema** mezcla 24 fotos de piezas con 59 capturas de pantalla y
  recursos: son dos cosas distintas y 19 bajan de 1400 px. Hay que decidir qué
  entra en la web.
- Las fichas traen **es / en / ca**. Ahora se pinta solo el castellano (`lang` en
  `site.json`); los otros dos están en el JSON, esperando a que el diseño diga si
  hay selector.
- Ninguna imagen tiene `alt`. El campo está vacío en las 259, listo para escribirlo.
- Las diez editoriales de moda salen con la primera foto de portada. Si alguna no
  es la buena, se cambia con `cover` en `content/overrides.json`.

## Historia

Antes de esto el repo era un clon de **amargor.es**, el Cargo.site viejo, hecho
para tenerlo de referencia. Está en el historial hasta el commit anterior a
«Empezar el diseño de cero», por si hiciera falta mirarlo.
