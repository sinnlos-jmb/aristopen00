import { GRAPH_RESOURCES } from '../bot/resources.js';

export function createGraphModal() {
  const dialog = document.createElement('dialog');
  dialog.className = 'graph-modal';
  dialog.setAttribute('aria-labelledby', 'graph-modal-title');
  dialog.innerHTML = `<header class="reader-modal-head"><h2 id="graph-modal-title"></h2>
    <button type="button" aria-label="Cerrar grafo">×</button></header>
    <p class="graph-modal-help">Seleccioná nodos y relaciones para leer sus fichas. Las citas disponibles abren el texto bilingüe; al cerrarlo volvés al grafo.</p>
    <iframe title="Grafo interactivo" class="graph-frame"></iframe>`;
  document.body.appendChild(dialog);
  const frame = dialog.querySelector('iframe');
  let opener = null;
  const close = () => {
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); opener?.focus(); }
    frame.removeAttribute('src');
  };
  dialog.querySelector('button').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('close', () => { frame.removeAttribute('src'); if (opener?.isConnected) opener.focus(); });
  // Escape dentro del iframe debe volver al diálogo cuando no hay una ficha o
  // un modal interno abierto. El motor del grafo maneja primero esos casos.
  let detachKey = () => {};
  frame.addEventListener('load', () => {
    detachKey();
    const doc = frame.contentDocument, win = frame.contentWindow;
    if (!doc || !win) return;
    const onKey = event => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      if (doc.querySelector('dialog[open], #modal:not([hidden]), #linkModal:not([hidden])')) return;
      event.preventDefault();
      close();
    };
    // El motor instala primero su propio Escape, incluso al cargar datos en forma asíncrona.
    const attach = () => doc.addEventListener('keydown', onKey);
    if (win.AGORA_GRAPH_READY) attach();
    else win.addEventListener('agora-grafo-listo', attach, {once:true});
    detachKey = () => {win.removeEventListener('agora-grafo-listo', attach);doc.removeEventListener('keydown', onKey);};
  });
  return {
    open(id, trigger) {
      const graph = GRAPH_RESOURCES[id];
      if (!graph) return;
      opener = trigger || document.activeElement;
      dialog.querySelector('h2').textContent = graph.label;
      if (!dialog.open) {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
      }
      frame.title = graph.label;
      frame.src = graph.url;
    },
    destroy() { detachKey(); if (dialog.open) close(); dialog.remove(); },
  };
}
