/* Renderiza el árbol de bloques de una página a HTML estático.

   row      -> fila de la rejilla de 12 columnas
   gallery  -> slideshow o lienzo montessori
   image    -> imagen suelta, normalmente enlace a un proyecto
   text     -> pie o párrafo

   El slideshow se pinta con todas sus diapositivas ya en el HTML: sin
   JS se ven todas en columna, y el controlador solo añade el
   comportamiento por encima. */

import { tag, escape } from './html.mjs';
import { srcset, sizes, ratio } from './images.mjs';

const COLUMNS = 12;

/** <img> con srcset, sizes y relación de aspecto. */
function image(item, { root, widthPct, eager = false }) {
  return tag('img', {
    src: item.src,
    srcset: srcset(item.src, root),
    sizes: sizes(widthPct),
    width: item.w || null,
    height: item.h || null,
    alt: item.alt || '',
    style: ratio(item) ? `aspect-ratio: ${ratio(item)}` : null,
    loading: eager ? null : 'lazy',
    decoding: 'async',
    fetchpriority: eager ? 'high' : null,
  });
}

/** Envuelve en <a> solo si el bloque tiene destino. */
function link(href, children) {
  return href ? tag('a', { href }, children) : children;
}

function slideshow(block, context) {
  const items = block.items || [];

  const slides = items.map((item, i) =>
    tag('figure', { class: `slide${i === 0 ? ' is-active' : ''}` }, [
      image(item, { ...context, eager: i === 0 }),
      item.caption ? tag('figcaption', {}, escape(item.caption)) : null,
    ])
  );

  return tag(
    'section',
    { class: 'slideshow', 'data-slideshow': true, 'data-autoplay': block.autoplay || null },
    tag('div', { class: 'slideshow__track' }, slides)
  );
}

function montessori(block, context) {
  const items = (block.items || []).map((item) => {
    // x / width / y van en % del ANCHO del contenedor (ver css/style.css)
    const style = [
      item.x !== undefined ? `left:${item.x}%` : null,
      item.width !== undefined ? `width:${item.width}%` : null,
      item.y !== undefined ? `margin-top:${item.y}%` : null,
    ].filter(Boolean).join(';');

    return tag('figure', { class: 'gallery__item', style: style || null }, [
      link(item.href, image(item, { ...context, widthPct: item.width })),
      item.caption ? tag('figcaption', {}, escape(item.caption)) : null,
    ]);
  });

  return tag(
    'section',
    {
      class: 'gallery gallery--montessori',
      style: block.height ? `padding-bottom:${block.height}%` : null,
    },
    items
  );
}

/* Imagen suelta. `scale` es el data-scale de Cargo: el % del ancho de
   su columna que ocupa la imagen. Sin él se pintaría a ancho completo. */
function figure(block, context) {
  const widthPct = block.scale || context.widthPct;
  return tag(
    'figure',
    { class: 'figure', style: block.scale ? `width:${block.scale}%` : null },
    link(block.href, image(block, { ...context, widthPct }))
  );
}

function text(block) {
  return tag('p', { class: 'caption' }, escape(block.text));
}

function row(block, context) {
  const cols = (block.cols || []).map((col) =>
    tag(
      'div',
      { class: 'col', style: `width:${((col.span / COLUMNS) * 100).toFixed(4)}%` },
      (col.blocks || []).map((child) =>
        render(child, { ...context, widthPct: (col.span / COLUMNS) * 100 })
      )
    )
  );
  return tag('div', { class: 'row' }, cols);
}

/** Punto de entrada: un bloque -> HTML. */
export function render(block, context) {
  if (!block) return '';
  switch (block.type) {
    case 'row':     return row(block, context);
    case 'gallery': return block.mode === 'slideshow' ? slideshow(block, context) : montessori(block, context);
    case 'image':   return figure(block, context);
    case 'text':    return text(block);
    default:        return '';
  }
}

/** Una página entera -> HTML. */
export function renderPage(page, context) {
  return (page?.blocks || []).map((block) => render(block, context)).join('\n');
}
