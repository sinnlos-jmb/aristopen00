// La fuente conserva el texto y los párrafos originales. Las anclas se comparan
// sin diacríticos, puntuación ni marcas Bekker, conservando sus offsets originales.
export function normalizeWithOffsets(text) {
  let value = '';
  const offsets = [];
  const ignored = /\[\d+\]|\b\d{4}[ab]\b/g;
  const clean = text.replace(ignored, match => ' '.repeat(match.length));
  for (let i = 0; i < clean.length;) {
    const char = String.fromCodePoint(clean.codePointAt(i));
    const normalized = char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/ς/g, 'σ');
    for (const letter of normalized) {
      if (/[\p{L}\p{N}]/u.test(letter)) { value += letter; offsets.push(i); }
    }
    i += char.length;
  }
  offsets.push(text.length);
  return { value, offsets };
}

export function parseBook(text, { id = 'I', title = 'El bien humano y la felicidad' } = {}) {
  const chapters = [];
  let chapter = null, paragraph = null, greek = false;
  const finish = () => {
    if (!paragraph) return;
    paragraph.es = paragraph.es.join('\n').trim();
    paragraph.gr = paragraph.gr.join('\n').trim();
    if (!paragraph.es || !paragraph.gr) throw new Error(`Párrafo ${paragraph.number}: falta una de las lenguas.`);
    chapter.paragraphs.push(paragraph);
    paragraph = null;
  };
  for (const raw of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const line = raw.trim();
    if (/^\d+$/.test(line)) {
      finish();
      chapter = { number: Number(line), book: id, paragraphs: [] };
      chapters.push(chapter);
    } else if (/^\{\s*"parrafo_nro"/.test(line)) {
      finish();
      if (!chapter) throw new Error('Párrafo sin capítulo.');
      const metadata = JSON.parse(line);
      paragraph = { number: metadata.parrafo_nro, chapter: chapter.number, book: id, es: [], gr: [] };
      greek = false;
    } else if (paragraph && line && !/^[─═]+$/.test(line)) {
      if (!greek && /^(?:\d{4}[ab]\s*)?(?:\[\d+\]\s*)?[\u0370-\u03ff\u1f00-\u1fff]/u.test(line)) greek = true;
      paragraph[greek ? 'gr' : 'es'].push(raw.trim());
    }
  }
  finish();
  if (!chapters.length) throw new Error('No se encontraron capítulos en el texto.');
  let page = 1094, column = 'a', line = 1;
  const position = () => page * 1000 + (column === 'b' ? 100 : 0) + line;
  for (const c of chapters) for (const p of c.paragraphs) {
    p.bekkerStart = position();
    for (const match of p.gr.matchAll(/(\d{4})([ab])|\[(\d+)\]/g)) {
      if (match[1]) { page = Number(match[1]); column = match[2]; line = 1; }
      else line = Number(match[3]);
    }
    p.bekkerEnd = position();
  }
  return { id, title, chapters };
}

function languageIndex(book, language) {
  const pieces = [];
  let text = '';
  for (const chapter of book.chapters) for (const paragraph of chapter.paragraphs) {
    const start = text.length;
    text += paragraph[language];
    pieces.push({ paragraph: paragraph.number, chapter: chapter.number, start, end: text.length });
    text += '\n';
  }
  return { text, pieces, ...normalizeWithOffsets(text) };
}

function findAnchor(index, anchor, chapterNumber = null) {
  if (!anchor?.inicio || !anchor?.fin) return null;
  const startNeedle = normalizeWithOffsets(anchor.inicio).value;
  const endNeedle = normalizeWithOffsets(anchor.fin).value;
  if (!startNeedle || !endNeedle) return null;
  let start = index.value.indexOf(startNeedle);
  while (start >= 0 && chapterNumber !== null && !index.pieces.some(p => p.chapter === chapterNumber && p.start <= index.offsets[start] && p.end > index.offsets[start])) {
    start = index.value.indexOf(startNeedle, start + 1);
  }
  if (start < 0) return null;
  const endStart = index.value.indexOf(endNeedle, start);
  if (endStart < 0) return null;
  const from = index.offsets[start];
  // El último carácter es seguido por posibles signos de puntuación, que quedan
  // fuera del mark sin alterar el texto fuente.
  const last = index.offsets[endStart + endNeedle.length - 1];
  const to = last + String.fromCodePoint(index.text.codePointAt(last)).length;
  const pieces = index.pieces.filter(p => p.start < to && p.end > from);
  if (!pieces.length || pieces.some(p => p.chapter !== pieces[0].chapter)) return null;
  return { chapter: pieces[0].chapter, ranges: pieces.map(p => ({
    paragraph: p.paragraph, start: Math.max(from, p.start) - p.start,
    end: Math.min(to, p.end) - p.start,
  })) };
}

export function buildLibrary(books, S) {
  const passages = {};
  const issues = [];
  const bookId = S.repo.libroTagueado();
  const book = books.find(b => b.id === bookId);
  if (book) {
    const indexes = { es: languageIndex(book, 'es'), gr: languageIndex(book, 'gr') };
    for (const sub of Object.values(S.SUB || {})) {
      const es = findAnchor(indexes.es, sub.es_ancla);
      const gr = findAnchor(indexes.gr, sub.gr_ancla, es?.chapter ?? null);
      const chapter = es?.chapter || gr?.chapter;
      if (!chapter) { issues.push({ id: sub.id, message: 'No se localizaron las anclas en el texto fuente.' }); continue; }
      if (es && gr && es.chapter !== gr.chapter) {
        issues.push({ id: sub.id, message: 'Las anclas de las dos lenguas apuntan a capítulos distintos.' }); continue;
      }
      if (!es || !gr) issues.push({ id: sub.id, message: `Sin ancla exacta en ${es ? 'griego' : 'castellano'}; se muestra el párrafo paralelo.` });
      passages[sub.id] = { id: sub.id, title: sub.titulo, bekker: sub.bekker,
        book: bookId, chapter, es: es?.ranges || [], gr: gr?.ranges || [] };
    }
  }
  return { books, passages, issues };
}

// Extrae el texto de un pasaje (o de un rango de pasajes) para una lengua dada.
// Los rangos de `passage[lang]` son offsets relativos al párrafo indicado.
export function passageText(book, passage, lang = 'es') {
  const chapter = book.chapters.find(c => c.number === passage.chapter);
  if (!chapter) return '';
  return (passage[lang] || []).map(range => {
    const paragraph = chapter.paragraphs.find(p => p.number === range.paragraph);
    return paragraph ? paragraph[lang].slice(range.start, range.end) : '';
  }).join('\n');
}

export function parseBekker(reference) {
  const matches = String(reference).replace(/[–—]/g, '-').match(/\d{4}[ab]\d+(?:-(?:\d{4})?[ab]?\d+)?/g) || [];
  return matches.map(text => {
    const m = /^(\d{4})([ab])(\d+)(?:-(?:(\d{4}))?([ab])?(\d+))?$/.exec(text);
    const position = (page, col, line) => Number(page) * 1000 + (col === 'b' ? 100 : 0) + Number(line);
    return { text, start: position(m[1], m[2], m[3]), end: position(m[4] || m[1], m[5] || m[2], m[6] || m[3]) };
  });
}

export function resolveCitation(library, reference) {
  if (!library) return null;
  if (library.passages[reference]) return library.passages[reference];
  const ranges = parseBekker(Array.isArray(reference) ? reference.join('–') : reference);
  // Sólo se resuelve el primer rango: las referencias adicionales pueden ser de
  // otros libros u obras y nunca se sustituyen por el pasaje más cercano.
  const target = ranges[0];
  if (!target) return null;
  const entries = Object.values(library.passages);
  const exact = entries.find(p => {
    const own = parseBekker(p.id)[0];
    return own?.start === target.start && own.end === target.end;
  });
  if (exact) return exact;
  const overlaps = entries.filter(p => {
    const own = parseBekker(p.id)[0];
    // Solape estricto: un pasaje que sólo "toca" el borde del rango pedido
    // (own.start === target.end) no forma parte de la cita y no debe arrastrarse.
    return own && own.start < target.end && own.end > target.start;
  }).sort((a, b) => parseBekker(a.id)[0].start - parseBekker(b.id)[0].start);
  if (!overlaps.length) {
    for (const book of library.books) {
      const paragraphs = book.chapters.flatMap(c => c.paragraphs);
      const selected = paragraphs.filter(p => p.bekkerStart <= target.end && p.bekkerEnd >= target.start);
      if (!selected.length) continue;
      const chapter = selected[0].chapter;
      const parallel = selected.filter(p => p.chapter === chapter);
      return { id: target.text, title: 'Pasaje sin subdivisión tagueada', book: book.id, chapter,
        approximate: true, es: parallel.map(p => ({ paragraph: p.number, start: 0, end: p.es.length })),
        gr: parallel.map(p => ({ paragraph: p.number, start: 0, end: p.gr.length })) };
    }
    return null;
  }
  const first = overlaps[0];
  const sameChapter = overlaps.filter(p => p.book === first.book && p.chapter === first.chapter);
  return { ...first, es: sameChapter.flatMap(p => p.es), gr: sameChapter.flatMap(p => p.gr) };
}

export async function loadLibrary(S) {
  const response = await fetch('/api/texto/EN_libro1_v8.txt', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`No se pudo cargar el texto (${response.status}).`);
  return buildLibrary([parseBook(await response.text())], S);
}
