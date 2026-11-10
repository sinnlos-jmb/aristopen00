// Biblioteca: capítulos cargados en el DOM sólo cuando el usuario los abre.
import { esc } from '../ui.js';
import { renderChapter } from '../reader/render.js';
import { renderCatalogHeader, renderSiteFooter } from './shared.js';

export async function createReadingView(App) {
  const el = document.createElement('div');
  el.className = 'scrollable has-scroll catalog-view reading-catalog';
  let chapters = new Map();
  let loading = false;

  function chapterKey(book, chapter) { return `${book}:${chapter}`; }

  // Un único listener para todos los capítulos, incluso después de reintentar.
  el.addEventListener('toggle', event => {
    const details = event.target;
    if (!details.matches?.('.reader-chapter') || !details.open) return;
    const content = details.querySelector('.reader-chapter-content');
    if (!content || content.dataset.loaded === 'true') return;
    const chapter = chapters.get(chapterKey(content.dataset.book, content.dataset.chapter));
    if (!chapter) {
      content.textContent = 'No se encontró el capítulo solicitado.';
      return;
    }
    try {
      content.innerHTML = renderChapter(chapter);
      content.dataset.loaded = 'true';
    } catch (error) {
      content.textContent = `No se pudo mostrar este capítulo: ${error.message}`;
    }
  }, true); // El evento toggle no burbujea; lo capturamos en la raíz.

  async function loadAndRender() {
    if (loading) return;
    loading = true;
    el.innerHTML = '<div class="reading-catalog__loading" role="status">Recargando la biblioteca…</div>';
    try {
      const library = await App.getLibrary();
      const books = library.books || [];
      chapters = new Map(books.flatMap(book => book.chapters.map(chapter => [
        chapterKey(String(book.id), String(chapter.number)), chapter,
      ])));
      el.innerHTML = `
        <div class="catalog-view__content catalog-view__content--reading">
          ${renderCatalogHeader({
            eyebrow: 'Biblioteca',
            title: 'Ética nicomáquea',
            description: 'Texto original y traducción al castellano. El texto se carga progresivamente; el tagueo avanza por capítulos.',
          })}
          ${books.map((book, index) => `
            <details class="reader-book" ${index === 0 ? 'open' : ''}>
              <summary><span>Libro ${esc(book.id)} · ${esc(book.title)}</span><span class="reader-summary__icon" aria-hidden="true">↓</span></summary>
              ${book.chapters.map(chapter => `
                <details class="reader-chapter">
                  <summary><span>Capítulo ${esc(chapter.number)}</span><span class="reader-summary__icon" aria-hidden="true">+</span></summary>
                  <div class="reader-chapter-content" data-book="${esc(book.id)}" data-chapter="${esc(chapter.number)}"></div>
                </details>`).join('')}
            </details>`).join('')}
        </div>
        ${renderSiteFooter()}`;
    } catch (error) {
      el.innerHTML = `<div class="empty reading-catalog__error">
        <p>No se pudo conectar al servidor Bekker: ${esc(error.message)}</p>
        <button type="button" class="btn btn--primary" data-retry>Reintentar conexión</button>
      </div>`;
    } finally {
      loading = false;
    }
  }

  el.addEventListener('click', event => {
    if (event.target.closest('[data-retry]')) loadAndRender();
  });

  await loadAndRender();
  return { el };
}
