import { esc } from '../ui.js';

function markedText(text, ranges) {
  const merged = [];
  for (const range of ranges.slice().sort((a, b) => a.start - b.start)) {
    const previous = merged[merged.length - 1];
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ start: range.start, end: range.end });
  }
  let html = '', cursor = 0;
  for (const range of merged) {
    html += esc(text.slice(cursor, range.start));
    html += `<mark class="reader-highlight">${esc(text.slice(range.start, range.end))}</mark>`;
    cursor = range.end;
  }
  return html + esc(text.slice(cursor));
}

export function renderChapter(chapter, passage = null) {
  return `<div class="reader-columns-head"><span>Castellano</span><span lang="el">Ἑλληνικά · Griego</span></div>
    ${chapter.paragraphs.map(p => {
      const selected = passage && [...passage.es, ...passage.gr].some(r => r.paragraph === p.number);
      return `<article class="reader-paragraph ${selected ? 'reader-paragraph--selected' : ''}" data-paragraph="${p.number}">
        <div class="reader-paragraph__number">§ ${p.number}</div>
        <div class="reader-columns">
        ${['es', 'gr'].map(lang => `<div lang="${lang === 'gr' ? 'el' : 'es'}" class="reader-text">${markedText(p[lang], (passage?.[lang] || []).filter(r => r.paragraph === p.number))}</div>`).join('')}
        </div>
      </article>`;
    }).join('')}`;
}

export function chapterNavigation(book, chapterNumber) {
  const index = book.chapters.findIndex(c => c.number === chapterNumber);
  return `<nav class="reader-navigation" aria-label="Navegar capítulos">
    <button type="button" data-reader-direction="-1" ${index <= 0 ? 'disabled' : ''}>← Capítulo anterior</button>
    <label>Capítulo <select data-reader-chapter aria-label="Elegir capítulo">${book.chapters.map(c => `<option value="${c.number}" ${c.number === chapterNumber ? 'selected' : ''}>${c.number}</option>`).join('')}</select></label>
    <button type="button" data-reader-direction="1" ${index >= book.chapters.length - 1 ? 'disabled' : ''}>Capítulo siguiente →</button>
    </nav>`;
}
