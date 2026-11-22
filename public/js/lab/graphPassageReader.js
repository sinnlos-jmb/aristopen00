// Checkpoint 9B: lectura dentro del explorador contextual.
// Usa exclusivamente los pasajes localizados por el lector de Ágora, sin reinterpretar tags
// ni buscar el tramo más cercano si una subunidad carece de anclas válidas.
import { renderChapter, chapterNavigation } from '../reader/render.js';

export function localizarSubunidadEnBiblioteca(library, subId) {
  if (!library || typeof subId !== 'string' || !subId) return { ok: false, motivo: 'Subunidad no identificada.' };
  const passage = library.passages?.[subId];
  const issue = (library.issues || []).filter(x => x.id === subId).map(x => x.message);
  if (!passage) return { ok: false,
    motivo: issue.join(' ') || 'No se localizaron las anclas de esta subunidad en el texto fuente. No se seleccionó un pasaje aproximado.' };
  const book = (library.books || []).find(b => b.id === passage.book);
  const chapter = book?.chapters?.find(c => c.number === passage.chapter);
  if (!book || !chapter) return { ok: false, motivo: 'La referencia existe, pero no se encontró el libro o capítulo correspondiente.' };
  const es = Array.isArray(passage.es) && passage.es.length > 0;
  const gr = Array.isArray(passage.gr) && passage.gr.length > 0;
  if (!es && !gr) return { ok: false, motivo: 'El pasaje no tiene anclas localizadas en ninguna de las dos lenguas.' };
  return { ok: true, passage, book, chapter, avisos: issue,
    idiomas: { es, gr } };
}

export function representarLecturaContextual(model, chapterNumber = model?.passage?.chapter) {
  if (!model?.ok) throw new Error('No hay un pasaje validado para leer.');
  const chapter = model.book.chapters.find(c => c.number === chapterNumber);
  if (!chapter) throw new Error('Capítulo no disponible.');
  const actual = model.passage.chapter === chapterNumber;
  const passage = actual ? model.passage : null;
  const nav = chapterNavigation(model.book, chapterNumber);
  const title = `Libro ${model.book.id} · Capítulo ${chapterNumber}`;
  const avisoIdiomas = actual && (!model.idiomas.es || !model.idiomas.gr)
    ? `No se pudo localizar con exactitud el tramo en ${model.idiomas.es ? 'griego' : 'castellano'}; esa lengua se muestra sin resaltado.` : '';
  return {
    title,
    navigationHtml: nav,
    passageHtml: renderChapter(chapter, passage),
    message: [avisoIdiomas, ...model.avisos].filter(Boolean).join(' '),
    highlighted: actual,
    reference: actual ? model.passage.bekker : null,
  };
}

// Adaptador UI autónomo para minimizar cambios en labGraphPilotView.js.
// No persiste nada: los estados, agrupadores y posiciones pertenecen al modal existente.
export function crearLectorTextual9B({ dialogo, inspector, obtenerBiblioteca }) {
  if (!dialogo || !inspector || typeof obtenerBiblioteca !== 'function') throw new Error('Lector contextual sin dependencias.');
  if (!document.querySelector('link[data-agora-reader-9b]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = '/css/lab-graph-reader-9b.css';
    css.dataset.agoraReader9b = '1'; document.head.append(css);
  }
  const inner = dialogo.querySelector('.lab-graph-text-dialog-inner');
  if (!inner) throw new Error('Falta el contenedor del explorador textual.');
  const section = document.createElement('section');
  section.id = 'gv-text-reader-9b';
  section.className = 'lab-graph-text-reader-9b';
  section.hidden = true;
  section.innerHTML = `
    <div class="lab-graph-text-reader-head-9b">
      <button type="button" class="lab-btn lab-btn--ghost" data-9b-back>← Volver al grafo textual</button>
      <div><h3 id="gv-text-reader-title-9b">Lectura</h3><p class="hint" id="gv-text-reader-ref-9b"></p></div>
    </div>
    <div id="gv-text-reader-navigation-9b" class="lab-graph-text-reader-navigation-9b"></div>
    <div id="gv-text-reader-body-9b" class="lab-graph-text-reader-body-9b" tabindex="0"></div>
    <p id="gv-text-reader-message-9b" class="hint" role="status" aria-live="polite"></p>`;
  inner.append(section);
  const $ = selector => section.querySelector(selector);
  let model = null, chapterNumber = null, requestId = 0, lastFocus = null;

  function actualizar() {
    if (!model?.ok) return;
    const view = representarLecturaContextual(model, chapterNumber);
    $('#gv-text-reader-title-9b').textContent = view.title;
    $('#gv-text-reader-ref-9b').textContent = view.reference
      ? `Subunidad: ${model.passage.title || model.passage.id} · Bekker ${Array.isArray(view.reference) ? view.reference.join('–') : view.reference}`
      : 'Capítulo de contexto · sin resaltado fuera del pasaje seleccionado';
    $('#gv-text-reader-navigation-9b').innerHTML = view.navigationHtml;
    $('#gv-text-reader-body-9b').innerHTML = view.passageHtml;
    $('#gv-text-reader-message-9b').textContent = view.message;
    const body = $('#gv-text-reader-body-9b');
    body.scrollTop = 0;
    if (view.highlighted) {
      // Permite localizar el fragmento dentro del capítulo sin perder el contexto.
      const selected = body.querySelector('.reader-paragraph--selected');
      if (selected) requestAnimationFrame(() => { if (!section.hidden) body.scrollTop = Math.max(0, selected.offsetTop - body.offsetTop - 24); });
    }
  }

  function mostrar() {
    section.hidden = false;
    dialogo.classList.add('lab-graph-text-dialog--reading-9b');
    $('[data-9b-back]').focus({ preventScroll: true });
  }
  function volver() {
    ++requestId; model = null; chapterNumber = null;
    dialogo.classList.remove('lab-graph-text-dialog--reading-9b');
    section.hidden = true;
    $('#gv-text-reader-body-9b').replaceChildren();
    // Reactiva el tamaño del canvas Cytoscape sin recalcular su layout ni su zoom.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    if (lastFocus?.isConnected && dialogo.open) lastFocus.focus({ preventScroll: true });
    lastFocus = null;
  }
  async function abrir(subId) {
    if (!dialogo.open) return;
    const ticket = ++requestId;
    lastFocus = document.activeElement;
    model = null; chapterNumber = null;
    mostrar();
    $('#gv-text-reader-title-9b').textContent = 'Preparando lectura…';
    $('#gv-text-reader-ref-9b').textContent = '';
    $('#gv-text-reader-navigation-9b').replaceChildren();
    $('#gv-text-reader-body-9b').replaceChildren();
    $('#gv-text-reader-message-9b').textContent = 'Buscando las anclas en el texto original.';
    try {
      const library = await obtenerBiblioteca();
      if (ticket !== requestId || !dialogo.open) return;
      model = localizarSubunidadEnBiblioteca(library, subId);
      if (!model.ok) {
        $('#gv-text-reader-title-9b').textContent = 'Pasaje no localizado';
        $('#gv-text-reader-message-9b').textContent = model.motivo;
        return;
      }
      chapterNumber = model.passage.chapter;
      actualizar();
    } catch (error) {
      if (ticket !== requestId || !dialogo.open) return;
      $('#gv-text-reader-title-9b').textContent = 'No se pudo cargar el texto';
      $('#gv-text-reader-message-9b').textContent = String(error?.message || error);
    }
  }
  inspector.addEventListener('click', event => {
    const button = event.target.closest('[data-tm-read-sub]');
    if (button && dialogo.open) { event.preventDefault(); void abrir(button.dataset.tmReadSub); }
  });
  section.addEventListener('click', event => {
    if (event.target.closest('[data-9b-back]')) { volver(); return; }
    const button = event.target.closest('[data-reader-direction]');
    if (!button || !model?.ok) return;
    const idx = model.book.chapters.findIndex(c => c.number === chapterNumber);
    const next = model.book.chapters[idx + Number(button.dataset.readerDirection)];
    if (next) { chapterNumber = next.number; actualizar(); }
  });
  section.addEventListener('change', event => {
    if (!event.target.matches('[data-reader-chapter]') || !model?.ok) return;
    const next = model.book.chapters.find(c => c.number === Number(event.target.value));
    if (next) { chapterNumber = next.number; actualizar(); }
  });
  dialogo.addEventListener('close', volver);
  return { abrir, volver };
}
