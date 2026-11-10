import { esc } from '../ui.js';
import { resolveCitation } from './text.js';
import { chapterNavigation, renderChapter } from './render.js';

export function createPassageModal(App) {
  const dialog = document.createElement('dialog');
  dialog.className = 'reader-modal';
  dialog.setAttribute('aria-labelledby', 'reader-modal-title');
  document.body.appendChild(dialog);
  let book = null, chapterNumber = null, passage = null, opener = null, destroyed = false;
  const close = () => {
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };
  dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus(); });
  dialog.addEventListener('cancel', () => { if (opener?.isConnected) opener.focus(); });
  dialog.addEventListener('click', e => {
    if (e.target === dialog || e.target.closest('[data-reader-close]')) { close(); return; }
    const direction = e.target.closest('[data-reader-direction]');
    if (direction && book) {
      const index = book.chapters.findIndex(c => c.number === chapterNumber);
      const next = book.chapters[index + Number(direction.dataset.readerDirection)];
      if (next) { chapterNumber = next.number; render(false); }
    }
  });
  dialog.addEventListener('change', e => {
    if (e.target.matches('[data-reader-chapter]')) { chapterNumber = Number(e.target.value); render(false); }
  });
  function render(highlight) {
    const chapter = book.chapters.find(c => c.number === chapterNumber);
    const target = passage?.chapter === chapterNumber ? passage : null;
    dialog.innerHTML = `<header class="reader-modal-head"><div><h2 id="reader-modal-title" tabindex="-1">Libro ${esc(book.id)} · Capítulo ${chapterNumber}</h2>
      <p>${target ? `${esc(target.title)} · ${esc(target.id)}` : esc(book.title)}</p></div><button type="button" data-reader-close aria-label="Cerrar lectura">×</button></header>
      ${chapterNavigation(book, chapterNumber)}
      ${target?.approximate ? '<p class="reader-anchor-note">Este pasaje aún no tiene subdivisión tagueada. Se resalta el párrafo completo localizado por las marcas Bekker del original.</p>' : ''}
      ${target && (!target.es.length || !target.gr.length) ? '<p class="reader-anchor-note">El fragmento exacto se resalta en la lengua con ancla disponible; la otra columna conserva el párrafo paralelo completo.</p>' : ''}
      <div class="reader-modal-body" tabindex="0" aria-label="Texto del capítulo en castellano y griego">${renderChapter(chapter, target)}</div>`;
    dialog.querySelector('#reader-modal-title').focus();
    const body = dialog.querySelector('.reader-modal-body');
    body.scrollTop = 0;
    if (highlight) {
      const selected = body.querySelector('.reader-paragraph--selected');
      selected?.scrollIntoView?.({ block: 'start', behavior: 'instant' });
    }
  }
  async function open(reference, trigger) {
    opener = trigger || document.activeElement;
    dialog.innerHTML = '<header class="reader-modal-head"><h2 id="reader-modal-title">Cargando texto…</h2><button type="button" data-reader-close aria-label="Cerrar lectura">×</button></header>';
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    try {
      const library = await App.getLibrary();
      if (destroyed || !dialog.open) return;
      passage = resolveCitation(library, reference);
      if (!passage) throw new Error('Este pasaje no está disponible en el texto cargado. Actualmente se ofrece el libro I.');
      book = library.books.find(b => b.id === passage.book);
      chapterNumber = passage.chapter;
      render(true);
    } catch (error) {
      if (!destroyed && dialog.open) dialog.innerHTML = `<header class="reader-modal-head"><h2 id="reader-modal-title">Lectura de la cita</h2><button type="button" data-reader-close aria-label="Cerrar lectura">×</button></header><p class="reader-anchor-note">${esc(error.message)}</p>`;
    }
  }
  return { open, destroy() { destroyed = true; close(); dialog.remove(); } };
}

// Cada referencia se enlaza por separado, preservando citas de otras obras.
export function citationHTML(text) {
  const value = String(text || '');
  const re = /\d{4}[ab]\d+(?:[–—-](?:\d{4})?[ab]?\d+)?/g;
  let html = '', last = 0;
  for (const match of value.matchAll(re)) {
    html += esc(value.slice(last, match.index));
    const page = Number(match[0].slice(0, 4));
    html += page >= 1094 && page <= 1103
      ? `<button type="button" class="citation-link" data-citation="${esc(match[0])}" aria-label="Leer pasaje ${esc(match[0])}">${esc(match[0])}</button>`
      : esc(match[0]);
    last = match.index + match[0].length;
  }
  return html + esc(value.slice(last));
}
