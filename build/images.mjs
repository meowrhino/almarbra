/* Imágenes responsive.

   De cada foto hay tres anchos en img/:
     nombre-800.webp   nombre-1400.webp   nombre.webp (2000, por defecto)

   Aquí se arma el srcset y se estima el `sizes` a partir del ancho que
   la imagen ocupa en la maqueta, para que el navegador no descargue
   2000 px cuando va a pintar 300. */

import { existsSync } from 'node:fs';
import { join as joinPath, dirname, basename, extname } from 'node:path';

const VARIANTS = [400, 800, 1400];
const DEFAULT_WIDTH = 2000;

/** Ruta de una variante: img/foo.webp + 800 -> img/foo-800.webp */
function variant(src, width) {
  const dir = dirname(src);
  const name = basename(src, extname(src));
  return `${dir}/${name}-${width}${extname(src)}`;
}

/** srcset con las variantes que existan en disco. */
export function srcset(src, root) {
  const entries = VARIANTS
    .map((w) => [variant(src, w), w])
    .filter(([path]) => existsSync(joinPath(root, path)))
    .map(([path, w]) => `${path} ${w}w`);

  if (!entries.length) return null;
  entries.push(`${src} ${DEFAULT_WIDTH}w`);
  return entries.join(', ');
}

/**
 * `sizes` aproximado.
 * @param {number|null} widthPct ancho del hueco en % del contenedor (montessori)
 */
export function sizes(widthPct) {
  if (!widthPct) return '(max-width: 900px) 100vw, 60vw';
  const desktop = Math.max(5, Math.round(widthPct));
  return `(max-width: 900px) 100vw, ${desktop}vw`;
}

/** Relación de aspecto para reservar el hueco y evitar saltos de maqueta. */
export function ratio(item) {
  return item.w && item.h ? `${item.w} / ${item.h}` : null;
}
