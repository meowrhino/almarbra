/* Desperdiga los proyectos por la segunda pantalla de la portada, con
   coordenadas nuevas en cada carga.

   Sin este archivo la página funciona igual: los proyectos salen en una
   lista normal, que es lo que dice el CSS por defecto. Esto solo la
   convierte en un desorden, así que si el JavaScript no llega o falla no
   se pierde nada.

   Se colocan midiendo de verdad cada proyecto —no a ojo—, así que nunca
   se pisan ni se salen de la pantalla, y se recolocan al girar el móvil
   o cambiar el tamaño de la ventana. */

(() => {
  const list = document.querySelector('.projects ul');
  if (!list) return;

  const items = [...list.children];
  if (!items.length) return;

  const TRIES = 500;          // tiradas por proyecto antes de ceder
  const GAPS = [24, 12, 6, 0]; // separación mínima que se va pidiendo, en px

  /** Cuánto se solapan dos cajas, en área. 0 = no se tocan. */
  function overlap(a, b, gap) {
    const dx = Math.min(a.x + a.w + gap, b.x + b.w) - Math.max(a.x - gap, b.x);
    const dy = Math.min(a.y + a.h + gap, b.y + b.h) - Math.max(a.y - gap, b.y);
    return dx > 0 && dy > 0 ? dx * dy : 0;
  }

  /* Se tira una posición al azar y se descarta si pisa a alguno de los
     ya puestos. Si tras muchas tiradas no cabe con la separación que se
     pide, se cede; y si ni pegados caben, se queda la tirada que menos
     solape —nunca una a ciegas—. */
  function place(boxes, area) {
    const placed = [];

    for (const box of boxes) {
      const spanX = Math.max(0, area.w - box.w);
      const spanY = Math.max(0, area.h - box.h);
      let spot = null;
      let best = null;
      let bestCost = Infinity;

      for (const gap of GAPS) {
        for (let t = 0; t < TRIES; t++) {
          const candidate = { x: Math.random() * spanX, y: Math.random() * spanY, w: box.w, h: box.h };
          const cost = placed.reduce((sum, p) => sum + overlap(candidate, p, gap), 0);
          if (cost === 0) { spot = candidate; break; }
          if (cost < bestCost) { bestCost = cost; best = candidate; }
        }
        if (spot) break;
      }

      placed.push(spot || best);
    }

    return placed;
  }

  /** Deja la lista como estaba: la de reserva, en columna. */
  function reset() {
    list.classList.remove('is-scattered');
    for (const item of items) { item.style.left = ''; item.style.top = ''; }
  }

  function scatter() {
    /* Primero se pasa al modo desperdigado y se sueltan las posiciones
       viejas: así cada proyecto coge el ancho que le toca por CSS y se
       le puede medir el alto de verdad antes de colocarlo. */
    list.classList.add('is-scattered');
    for (const item of items) { item.style.left = ''; item.style.top = ''; }

    const area = list.getBoundingClientRect();
    const boxes = items.map((item) => {
      const r = item.getBoundingClientRect();
      return { w: r.width, h: r.height };
    });

    /* Si no hay superficie que repartir —la pestaña aún no se ha pintado,
       la página está oculta, la ventana es diminuta— no se coloca nada:
       se deja la lista normal, que siempre se lee. Al aparecer o crecer,
       el resize vuelve a llamar aquí. */
    const cabe = boxes.every((b) => b.w > 0 && b.h > 0 && b.w <= area.width && b.h <= area.height);
    if (!cabe) { reset(); return; }

    place(boxes, { w: area.width, h: area.height }).forEach((spot, i) => {
      items[i].style.left = `${spot.x}px`;
      items[i].style.top = `${spot.y}px`;
    });
  }

  scatter();

  /* Las portadas entran con `loading=lazy` y ancho automático: si alguna
     acaba midiendo distinto de lo previsto, se recoloca al terminar de
     cargarse todo. */
  addEventListener('load', scatter, { once: true });

  /* Al cambiar el tamaño cambian los anchos, así que hay que repartir
     otra vez. Se espera a que pare de moverse para no hacerlo en cada
     píxel del arrastre. */
  let pending;
  addEventListener('resize', () => {
    clearTimeout(pending);
    pending = setTimeout(scatter, 150);
  });
})();
