/* Slugs ASCII a partir de nombres con acentos, mayúsculas y espacios.
   "EDITORIAL MODA" -> "editorial-moda", "CORPÓREA" -> "corporea" */

export function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // fuera diacríticos
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

const MINOR = new Set(['y', 'e', 'de', 'del', 'la', 'las', 'el', 'los', 'i', 'en', 'a']);

/** Nombre legible: "RIO DE LA PLATA" -> "Rio de la Plata" */
export function titleize(value) {
  return String(value)
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(/(\s+|\/)/)
    .map((word, i) => (i > 0 && MINOR.has(word) ? word : word.replace(/^\p{L}/u, (c) => c.toUpperCase())))
    .join('');
}
