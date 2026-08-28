/* Helpers mínimos para escribir HTML como texto. Sin dependencias. */

const VOID_TAGS = new Set(['img', 'br', 'hr', 'meta', 'link', 'input', 'source']);

/** Escapa texto que va a parar al documento. */
export function escape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escapa un valor de atributo (además de lo anterior, las comillas). */
export function escapeAttr(value) {
  return escape(value).replace(/"/g, '&quot;');
}

/**
 * Serializa atributos.
 *   null / undefined / false  -> se omite el atributo
 *   true                      -> atributo sin valor
 */
function attrs(map) {
  return Object.entries(map || {})
    .filter(([, v]) => v !== null && v !== undefined && v !== false && v !== '')
    .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeAttr(v)}"`))
    .join('');
}

/**
 * Construye una etiqueta.
 *   tag('p', { class: 'x' }, 'hola')
 *   tag('ul', {}, [tag('li', {}, 'a'), tag('li', {}, 'b')])
 * El contenido se inserta tal cual: ya debe venir escapado.
 */
export function tag(name, attributes, children) {
  const open = `<${name}${attrs(attributes)}>`;
  if (VOID_TAGS.has(name)) return open;
  return `${open}${join(children)}</${name}>`;
}

/** Aplana y concatena hijos, ignorando los vacíos. */
export function join(children) {
  if (children === null || children === undefined || children === false) return '';
  if (Array.isArray(children)) return children.map(join).join('');
  return String(children);
}

/** Indenta un bloque de HTML ya serializado (solo cosmético). */
export function indent(html, level = 1) {
  const pad = '  '.repeat(level);
  return html.split('\n').map((line) => (line ? pad + line : line)).join('\n');
}
