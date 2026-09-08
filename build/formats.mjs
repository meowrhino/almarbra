/* Los formatos de imagen, en un solo sitio.

   `build/ingest.mjs` los escribe y `build/build.mjs` los busca para
   montar el srcset: si los dos no coinciden, o se generan variantes que
   nadie pide o se piden variantes que no existen. Por eso viven aquí y
   no duplicados en cada archivo. */

/* La conversión es la de meowrhino/imgToWeb, que es la de todos los
   sitios: calidad 0.85 y el LADO LARGO —no el ancho— topado a 2000 px,
   manteniendo la proporción. Una foto vertical de 3840×5760 sale a
   1333×2000, no a 2000×3000. */
export const MAX_SIDE = 2000;
export const QUALITY = 85;

/** Variantes pequeñas del srcset. Estas sí van por ancho. */
export const WIDTHS = [400, 800, 1400];

/** Ruta de una variante: img/foo.webp + 800 -> img/foo-800.webp */
export const variant = (src, width) => src.replace(/\.webp$/, `-${width}.webp`);
