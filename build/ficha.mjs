/* Lector de las FICHAS de la clienta (.rtf).

   Cada ficha trae el mismo proyecto repetido en castellano, inglés y
   catalán, en ese orden. Vienen en dos formatos:

   a) editoriales: un solo TITULO y tres bloques de créditos seguidos,
      separados por líneas en blanco.
   b) textiles: TITULO + SINOPSIS repetidos, un TITULO por idioma.

   De ahí salen título, sinopsis y créditos (rol, nombre, enlace) por
   idioma. El texto plano original se guarda en `raw` para repasarlo. */

import { execFileSync } from 'node:child_process';

const LANGS = ['es', 'en', 'ca'];
const TITLE_LINE = /^\s*(?:TITULO|TÍTULO|TITLE|TITOL|TÍTOL)\s*:\s*(.*)$/i;
const SYNOPSIS_LINE = /^\s*(?:SINOPSIS|SYNOPSIS)\s*:\s*(.*)$/i;
const CREDIT_LINE = /^\s*([^:]{2,60}?)\s*:\s*(.*)$/;
const URL = /https?:\/\/[^\s]+/g;
const IG_HANDLE = /^(https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.]+\/?)/;

/** .rtf -> texto plano, con textutil (viene con macOS). */
export function rtfToText(file) {
  return execFileSync('textutil', ['-convert', 'txt', '-stdout', file], {
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
}

/* En las fichas hay enlaces con el rol siguiente pegado detrás
   ("...barbaramattel/Set design :"). Se corta el perfil de Instagram
   por el final del usuario y lo pegado pasa a su propia línea. */
function normalize(text) {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/(instagram\.com\/[A-Za-z0-9_.]+\/)(?=\S)/g, '$1\n');
}

/** Deja el enlace en el perfil, sin lo que venga detrás. */
function cleanUrl(url) {
  const ig = url.match(IG_HANDLE);
  return ig ? ig[1] : url.replace(/[.,;]+$/, '');
}

/* Una línea "Rol: Nombre https://…" -> { role, name, url }. */
function parseCredit(role, rest) {
  const urls = (rest.match(URL) || []).map(cleanUrl);
  const name = rest.replace(URL, '').replace(/\s*&\s*$/, '').replace(/\s{2,}/g, ' ').trim();
  if (!name && !urls.length) return null;
  return {
    role: role.trim(),
    name,
    url: urls[0] || null,
    ...(urls.length > 1 ? { urls } : {}),
  };
}

/** Agrupa las líneas en bloques contiguos, separados por líneas vacías. */
function blocksOf(lines) {
  const blocks = [];
  let current = [];
  for (const line of lines) {
    if (line.trim()) current.push(line);
    else if (current.length) { blocks.push(current); current = []; }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

const isTitleBlock = (block) => TITLE_LINE.test(block[0]);
const isSynopsisBlock = (block) => SYNOPSIS_LINE.test(block[0]);
const isCreditBlock = (block) => block.some((l) => CREDIT_LINE.test(l));

/** Bloques de sinopsis y de continuación -> un texto con sus párrafos. */
function synopsisText(blocks) {
  return blocks
    .map((block) => block.map((l) => l.replace(SYNOPSIS_LINE, '$1').trim()).join('\n'))
    .join('\n\n')
    .trim();
}

/**
 * Ficha completa.
 * @returns {{ title: object, synopsis: object, credits: object, raw: string }}
 */
export function parseFicha(file) {
  const raw = normalize(rtfToText(file));
  const blocks = blocksOf(raw.split('\n'));
  const out = { title: {}, synopsis: {}, credits: {}, raw };

  // Cada TITULO abre una sección; sin títulos no hay nada que leer.
  const starts = blocks.map((b, i) => (isTitleBlock(b) ? i : -1)).filter((i) => i >= 0);
  if (!starts.length) return out;

  const sections = starts.map((start, i) => blocks.slice(start, starts[i + 1] ?? blocks.length));

  // (b) textiles: una sección por idioma.
  if (sections.length > 1) {
    sections.slice(0, LANGS.length).forEach((section, i) => {
      const lang = LANGS[i];
      const title = section[0][0].match(TITLE_LINE)[1].trim();
      if (title) out.title[lang] = title;

      const rest = section.slice(1);
      const synopsisAt = rest.findIndex(isSynopsisBlock);
      if (synopsisAt >= 0) {
        const text = synopsisText(rest.slice(synopsisAt).filter((b) => !isCreditBlock(b) || isSynopsisBlock(b)));
        if (text) out.synopsis[lang] = text;
      }

      const credits = rest.filter((b) => isCreditBlock(b) && !isSynopsisBlock(b)).flat()
        .map((l) => { const m = l.match(CREDIT_LINE); return m && parseCredit(m[1], m[2]); })
        .filter(Boolean);
      if (credits.length) out.credits[lang] = credits;
    });
    return out;
  }

  // (a) editoriales: un solo título y un bloque de créditos por idioma.
  const [section] = sections;
  const title = section[0][0].match(TITLE_LINE)[1].trim();
  for (const lang of LANGS) if (title) out.title[lang] = title;

  section.slice(1).filter(isCreditBlock).slice(0, LANGS.length).forEach((block, i) => {
    const credits = block
      .map((l) => { const m = l.match(CREDIT_LINE); return m && parseCredit(m[1], m[2]); })
      .filter(Boolean);
    if (credits.length) out.credits[LANGS[i]] = credits;
  });

  return out;
}
