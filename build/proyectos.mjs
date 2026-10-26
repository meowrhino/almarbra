/* Los proyectos, como los usan build.mjs y preview.mjs.

     <lista>/<slug>/project.json        título, texto, créditos, fotos…
     <lista>/<slug>/img/1.webp …        sus fotos, como las saca imgToWeb

   Cada lista de data/site.json («lists»: textil, foto) es una carpeta, y
   sus proyectos van dentro. Salen en el orden de la lista; uno que está
   en la carpeta y no en la lista no sale en la web.

   Las fotos se nombran por su número, sin .webp («1», «2»…: todas son
   .webp), en el orden en que van. El ancho y el alto no se escriben: se
   leen del propio .webp.

   Como paginas.mjs, no toca el disco (lo usa también el navegador): lo
   que hay en él se lo pasa quien lo llama. Aquí está también cómo se lee
   un JSON (leerJSON) y se comprueba con su esquema de schema/ (validar):
   lo mismo para el build y la vista previa. */

/** Ancho y alto de un .webp, de su cabecera (los primeros 30 bytes, un
    Uint8Array); null si no es un WebP de verdad (un .jpg renombrado,
    por ejemplo). */
export function webpSize(b) {
  const ascii = (at, n) => String.fromCharCode(...b.subarray(at, at + n));
  if (b.length < 30 || ascii(0, 4) !== 'RIFF' || ascii(8, 4) !== 'WEBP') return null;
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const u24 = (at) => v.getUint16(at, true) | (v.getUint8(at + 2) << 16);
  const chunk = ascii(12, 4);
  if (chunk === 'VP8X') return { w: 1 + u24(24), h: 1 + u24(27) };
  if (chunk === 'VP8L') {
    const bits = v.getUint32(21, true);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return { w: v.getUint16(26, true) & 0x3fff, h: v.getUint16(28, true) & 0x3fff };   // VP8
}

/** Lee un JSON y, si está mal, dice dónde (línea y columna). */
export function leerJSON(texto, nombre) {
  try { return JSON.parse(texto); }
  catch (e) {
    let donde = '';
    const lc = /line (\d+) column (\d+)/.exec(e.message);
    const pos = /position (\d+)/.exec(e.message);
    if (lc) donde = ` (línea ${lc[1]}, columna ${lc[2]})`;
    else if (pos) {
      const antes = texto.slice(0, +pos[1]).split('\n');
      donde = ` (línea ${antes.length}, columna ${antes.at(-1).length + 1})`;
    } else {
      // una coma de más ("Unexpected token ']'") no trae posición: se busca la coma
      const coma = /,\s*[\]}]/.exec(texto);
      if (coma) donde = ` (línea ${texto.slice(0, coma.index).split('\n').length}: sobra la coma del final)`;
    }
    const err = new Error(`${nombre} no es un JSON válido${donde}. Suele ser una coma de más `
      + `o de menos, o unas comillas sin cerrar. Detalle: ${e.message}`);
    err.json = true;
    throw err;
  }
}

/** Lo que dice schema/<tipo>.json, comprobado también aquí (copiado de
    oriol, con patternProperties para las notas «_…»): lo que VS Code
    subraya en rojo, el build lo para y la vista previa lo enseña. */
export function validar(dato, esquema, fichero) {
  const TIPO = { string: 'un texto entre comillas', number: 'un número', boolean: 'true o false',
                 array: 'una lista [ … ]', object: 'un bloque { … }', null: 'null' };
  const tipo = v => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  // un $ref lleva a su $defs; lo de al lado (la description) manda
  const def = s => (s.$ref ? { ...esquema.$defs[s.$ref.split('/').pop()], ...s, $ref: undefined } : s);
  const tipoOk = (v, s) => !s.type || [].concat(s.type).includes(tipo(v));
  function mirar(v, s, camino) {
    s = def(s);
    const donde = camino.length ? `"${camino.join(' → ')}"` : 'el fichero';
    const pista = s.description ? ` (${s.description})` : '';
    if (s.anyOf) {
      const opciones = s.anyOf.map(def);
      if (opciones.some(o => !mirar(v, o, camino).length)) return [];
      const suya = opciones.find(o => tipoOk(v, o));
      return suya ? mirar(v, suya, camino) : [`${donde} no vale así${pista}`];
    }
    if (!tipoOk(v, s)) return [`${donde} tiene que ser ${[].concat(s.type).map(t => TIPO[t]).join(' o ')}${pista}`];
    const e = [];
    if (s.enum && !s.enum.includes(v)) e.push(`${donde}: "${v}" no vale; tiene que ser ${s.enum.map(x => `"${x}"`).join(', ')}`);
    if (s.pattern && typeof v === 'string' && !new RegExp(s.pattern).test(v)) e.push(`${donde}: "${v}" no tiene la forma que toca${pista}`);
    if (s.minimum != null && typeof v === 'number' && v < s.minimum) e.push(`${donde} tiene que ser ${s.minimum} o más`);
    if (Array.isArray(v)) {
      if (s.maxItems != null && v.length > s.maxItems) e.push(`${donde}: como mucho ${s.maxItems}`);
      if (s.items) v.forEach((x, i) => e.push(...mirar(x, s.items, [...camino, String(i + 1)])));
    } else if (tipo(v) === 'object') {
      for (const r of s.required || []) if (!(r in v)) e.push(`falta "${r}"${camino.length ? ` en ${donde}` : ''}`);
      for (const [k, x] of Object.entries(v)) {
        const patron = Object.entries(s.patternProperties || {}).find(([p]) => new RegExp(p).test(k));
        if (s.properties?.[k]) e.push(...mirar(x, s.properties[k], [...camino, k]));
        else if (patron) e.push(...mirar(x, patron[1], [...camino, k]));
        else if (typeof s.additionalProperties === 'object') e.push(...mirar(x, s.additionalProperties, [...camino, k]));
        else if (s.additionalProperties === false) {
          const hay = Object.keys(s.properties || {}).filter(p => p !== '$schema' && p !== '_');
          e.push(`"${[...camino, k].join(' → ')}" no es un campo de aquí (¿mal escrito?). Los que hay: ${hay.join(', ')}`);
        }
      }
    }
    return e;
  }
  return mirar(dato, esquema, []).map(m => `${fichero}: ${m}`);
}

/** Las fotos de diaris/ (1.webp, 2.webp…, de imgToWeb), por su número
    (`numbers`, los que hay). Sin JSON: salen todas, barajadas en cada
    visita. */
export function loadDiaris(numbers, size) {
  const errors = [];
  const images = numbers.map((n) => {
    const file = `${n}.webp`;
    const src = `diaris/${file}`;
    const wh = size(src);
    if (!wh) { errors.push(`diaris/${file} no es un WebP de verdad (pásala por imgToWeb)`); return null; }
    return { name: String(n), file, src, ...wh };
  }).filter(Boolean);
  return { images, errors };
}

/** El slug de una entrada de una lista: "roma" o { "project": "roma", "visible": false }. */
export const slugOf = (entry) => (typeof entry === 'string' ? entry : entry?.project);

const fileOf = (name) => `${String(name).replace(/\.webp$/, '')}.webp`;

/** Las fotos que nombra un project.json, con su ruta (la vista previa
    las pide antes de leer los proyectos). */
export const photoSrcs = (dir, data) => [...new Set([data.photos, data.map, ...[].concat(data.groups || []).map((g) => g?.photos)]
  .flatMap((list) => (Array.isArray(list) ? list : []))
  .map((name) => `${dir}/img/${fileOf(name)}`))];

/**
 * Lee los proyectos en el orden de site.lists, y mira lo general de
 * data/site.json. Lo del disco, de quien llama:
 *
 *   json(at)     el JSON de `at` ya leído, o undefined si no está
 *   size(src)    el ancho y alto de una foto (webpSize), null si no es
 *                un WebP, o undefined si no está
 *   folders      las carpetas de proyecto que hay («textil/roma»…), para
 *                avisar de las que no salen; o null si no se sabe
 *
 * Devuelve los proyectos y lo que esté mal, para que el build pare o
 * avise.
 */
export function loadProjects(site, { json, size, folders = null }) {
  const errors = [];
  const warnings = [];
  const lists = site.lists || {};

  const projects = [];
  for (const [category, { projects: entries = [] }] of Object.entries(lists)) {
    for (const entry of entries) {
      const slug = slugOf(entry);
      if (typeof slug !== 'string') continue;   // lo dice el esquema
      if (projects.some((p) => p.slug === slug)) { errors.push(`«${slug}» está dos veces en las listas de data/site.json`); continue; }
      const dir = `${category}/${slug}`;
      const at = `${dir}/project.json`;
      const data = json(at);
      if (data === undefined) {
        const elsewhere = (folders || []).find((f) => f.endsWith(`/${slug}`));
        errors.push(`la lista «${category}» de data/site.json nombra «${slug}», y no hay ${at}`
          + (elsewhere ? ` (está en ${elsewhere}/: muévela a ${category}/, o pásala a la lista «${elsewhere.split('/')[0]}»)` : ''));
        continue;
      }
      /* Lo que tiene que ser una lista, que lo sea: si no, un mensaje
         claro y no un error de JavaScript. */
      const list = (value, field) => {
        if (value == null) return [];
        if (Array.isArray(value)) return value;
        errors.push(`${at}: «${field}» tiene que ser una lista, entre corchetes: ["1", "2"]`);
        return [];
      };
      if (data.title && typeof data.title !== 'object') errors.push(`${at}: «title» va por idioma: { "es": "…", "en": "…" }`);
      list(data.credits, 'credits');

      const image = (name) => {
        const file = fileOf(name);
        const src = `${dir}/img/${file}`;
        const wh = size(src);
        if (wh === undefined) { errors.push(`${dir}: no encuentro img/${file}`); return null; }
        if (!wh) { errors.push(`${dir}: img/${file} no es un WebP de verdad (pásala por imgToWeb)`); return null; }
        return { name: file.replace(/\.webp$/, ''), file, src, ...wh };
      };
      /* Las fotos van en «photos», o por grupos en «groups» (Roma). */
      const groups = list(data.groups, 'groups').concat(data.groups ? [] : [{ name: null, photos: data.photos }])
        .map((g) => ({ name: g.name, images: list(g.photos, 'photos').map(image).filter(Boolean) }));
      const images = groups.flatMap((g) => g.images);
      if (!images.length) errors.push(`${dir}: no tiene fotos`);

      /* La de «cover» tiene que estar entre sus fotos; las de «map», no:
         una de img/ que no está en «photos» sale solo en el mapa. */
      const pick = (field) => [].concat(data[field] || []).map((name) => {
        const found = images.find((i) => i.name === String(name).replace(/\.webp$/, ''));
        if (!found && field === 'map') return image(name);
        if (!found) errors.push(`${dir}: en «${field}», ${name} no está entre sus fotos`);
        return found;
      }).filter(Boolean);

      projects.push({
        ...data,
        slug,
        dir,
        category,
        hidden: entry.visible === false,
        groups,
        images,
        cover: pick('cover')[0] || images[0],
        map: pick('map'),
      });
    }
  }

  for (const dir of folders || []) {
    const [category, slug] = dir.split('/');
    if (!projects.some((p) => p.dir === dir) && !errors.some((e) => e.includes(`«${slug}»`))) {
      warnings.push(`${dir} no está en la lista «${category}» de data/site.json: no sale en la web`);
    }
  }

  /* Cada proyecto, su color, en su project.json. */
  for (const project of projects) {
    if (!project.color) errors.push(`${project.dir}/project.json: falta «color», el de su hilo y sus huecos: "color": "#5B9DC8"`);
  }
  for (const category of Object.keys(lists)) {
    if (!projects.some((p) => p.category === category && !p.hidden)) errors.push(`data/site.json: la lista «${category}» no tiene ningún proyecto a la vista`);
  }
  if (!(site.mix >= 0 && site.mix <= 100)) errors.push(`data/site.json: «mix» va de 0 a 100 y es ${JSON.stringify(site.mix)}`);

  return { projects, errors, warnings };
}
