import { buildStore } from '../../js/store.js';
import { buildLibrary, parseBook, resolveCitation } from '../../js/reader/text.js';
import { createPassageModal, citationHTML } from '../../js/reader/modal.js';

// El mismo lector funciona tanto en una página independiente como dentro del
// iframe del chat. El modal pertenece al documento del grafo y preserva su vista.
let libraryPromise = null;
const App = {
  getLibrary() {
    if (!libraryPromise) libraryPromise = (async () => {
      const url = new URL('/api/labo/lectura', location.origin);
      url.searchParams.set('revision', window.AGORA_GRAPH_REVISION);
      const response = await fetch(url, {cache:'no-store'});
      const data = await response.json();
      if (!response.ok) throw Error(response.status === 409 ? 'Los datos cambiaron; volvé a abrir el grafo.' : data.error || 'No se pudo cargar el texto.');
      if (data.revision !== window.AGORA_GRAPH_REVISION || typeof data.txt !== 'string' || !data.tags?.unidades || !data.tags?.faqs) throw Error('El texto y el grafo no pertenecen a la misma revisión.');
      return buildLibrary([parseBook(data.txt)], buildStore(data.tags));
    })().catch(error => { libraryPromise = null; throw error; });
    return libraryPromise;
  },
};
const reader = createPassageModal(App);
const info = document.getElementById('info');
let revision = 0;

async function linkReferences() {
  const request = ++revision;
  const references = [...info.querySelectorAll('.ref')];
  if (!references.length) return;
  try {
    const library = await App.getLibrary();
    if (request !== revision) return;
    observer.disconnect();
    for (const ref of references) {
      // Incluye ref_cf, manteniendo sus estilos y las referencias externas.
      const walker = document.createTreeWalker(ref, NodeFilter.SHOW_TEXT);
      const texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      for (const text of texts) {
        if (text.parentElement.closest('[data-citation]')) continue;
        const template = document.createElement('template');
        template.innerHTML = citationHTML(text.textContent);
        template.content.querySelectorAll('[data-citation]').forEach(button => {
          if (!resolveCitation(library, button.dataset.citation)) button.replaceWith(button.textContent);
        });
        text.replaceWith(template.content);
      }
    }
    observer.observe(info, { childList: true, subtree: true });
  } catch (error) {
    // La ficha y sus referencias siguen legibles si no se puede cargar la fuente.
    if (request === revision && !info.querySelector('.graph-reader-error')) {
      const note = document.createElement('p');
      note.className = 'graph-reader-error';
      note.textContent = error.message || 'No se pudo cargar el texto bilingüe. Volvé a seleccionar la ficha para reintentar.';
      observer.disconnect();
      info.appendChild(note);
      observer.observe(info, { childList: true, subtree: true });
    }
  }
}
const observer = new MutationObserver(linkReferences);
observer.observe(info, { childList: true, subtree: true });
info.addEventListener('click', event => {
  const citation = event.target.closest('[data-citation]');
  if (citation) { event.preventDefault(); reader.open(citation.dataset.citation, citation); }
});
// El motor clásico escucha Escape en document; el lector tiene prioridad sobre
// el cierre de la ficha para conservar la selección al regresar del texto.
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.querySelector('.reader-modal[open]')) event.stopImmediatePropagation();
}, true);
window.addEventListener('pagehide', () => { observer.disconnect(); reader.destroy(); });
linkReferences();
