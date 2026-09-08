# almarbra

Portfolio de **Almudena González**. Sitio estático de verdad: el contenido vive en
JSON, un script escupe un `.html` por proyecto, y el navegador solo recibe HTML,
CSS e imágenes. **Cero dependencias y cero JavaScript de navegador.**

El diseño está por hacer: `css/style.css` está vacío a propósito.

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

css/style.css           VACÍO — aquí empieza el diseño
img/<categoría>/<slug>/ GENERADO: 903 webp
*.html                  GENERADOS — no editar a mano
```

## La ingesta

`npm run ingest` se come `originals/` entero:

1. convierte cada foto a WebP en cuatro anchos —400, 800, 1400 y 2000— a
   `img/<categoría>/<proyecto>/<proyecto>-NN.webp` (946 MB → 170 MB);
2. lee la FICHA `.rtf` con `textutil` y saca título, sinopsis y créditos
   (rol, nombre, enlace) **en los tres idiomas** de la ficha: es, en, ca;
3. escribe `content/projects/<proyecto>.json`.

Es idempotente: se apoya en `content/.media-cache.json` y solo reconvierte lo que
haya cambiado. Sin cambios tarda menos de un segundo. `npm run ingest -- --force`
rehace todo.

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
{ "roma": { "title": { "es": "ROMA: CIUDAD EN RUINAS, IDENTIDAD EN CONSTRUCCIÓN" } } }
```

Hay dos puestas: en la ficha de ROMA los títulos es/en venían intercambiados, y las
dos SICKY se llamaban igual. Las claves que empiezan por `_` son notas, no contenido.

## El build

`build/build.mjs` genera `index.html` y un `<slug>.html` por proyecto, en la raíz.
HTML plano y semántico, sin una sola clase de más —`header`, `h1`, `article`,
`section`, `figure`, `dl.credits`— para no condicionar el diseño. Los ganchos de
CSS se ponen cuando se sepa qué se quiere.

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

259 fotos, 903 WebP.

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

## Historia

Antes de esto el repo era un clon de **amargor.es**, el Cargo.site viejo, hecho
para tenerlo de referencia. Está en el historial hasta el commit anterior a
«Empezar el diseño de cero», por si hiciera falta mirarlo.
