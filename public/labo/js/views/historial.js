import {
  clearInteractions, deleteInteraction, exportInteractions,
  importInteractions, listInteractions,
} from '../historial.js';
import { downloadJson, esc, formatDate, toast } from '../ui.js';
import { href } from '../router.js';
import { SOURCE_GROUPS } from '../buscar.js';

export async function render(root, app) {
  const rows = await listInteractions();
  root.innerHTML = `
    <div class="page-head">
      <div>
        <div class="eyebrow">Evaluación local</div>
        <h1>Historial</h1>
        <p>Consultas, resultados y evaluaciones guardados únicamente en este navegador.</p>
      </div>
      <div class="toolbar">
        <button id="export-history" type="button"${rows.length ? '' : ' disabled'}>Exportar JSON</button>
        <button id="import-history" type="button">Importar JSON</button>
        <button id="clear-history" class="danger" type="button"${rows.length ? '' : ' disabled'}>Borrar todo</button>
        <input id="import-file" type="file" accept="application/json,.json" hidden>
      </div>
    </div>
    <div class="history-list">
      ${rows.length ? rows.map(row => historyCard(row, app.corpus)).join('') : '<div class="empty">Todavía no hay consultas guardadas. Cada búsqueda enviada crea una entrada.</div>'}
    </div>
  `;
  root.querySelector('#export-history').addEventListener('click', async () => {
    const data = await exportInteractions(app.corpus);
    downloadJson(data, `eni-labo-historial-${new Date().toISOString().slice(0, 10)}.json`);
    toast('Historial exportado.');
  });
  const input = root.querySelector('#import-file');
  root.querySelector('#import-history').addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const count = await importInteractions(JSON.parse(await file.text()));
      toast(`${count} consulta${count === 1 ? '' : 's'} importada${count === 1 ? '' : 's'}.`);
      await render(root, app);
    } catch (error) { toast(error.message); }
  });
  root.querySelector('#clear-history').addEventListener('click', async () => {
    if (!confirm('¿Borrar todo el historial local y sus evaluaciones?')) return;
    await clearInteractions();
    toast('Historial borrado.');
    await render(root, app);
  });
  root.querySelectorAll('[data-delete]').forEach(button => button.addEventListener('click', async () => {
    await deleteInteraction(button.dataset.delete);
    toast('Consulta eliminada.');
    await render(root, app);
  }));
}

function historyCard(row, corpus) {
  const rating = row.evaluation?.rating;
  const ratingLabel = rating === 'acertado' ? 'Acertado' : rating === 'parcial' ? 'Parcial' : rating === 'desacertado' ? 'Desacertado' : 'Sin evaluar';
  return `<article class="history-card">
    <div class="history-top">
      <div>
        <div class="tags"><span class="tag source">${row.builder ? 'Constructor guiado' : row.criteria?.length ? 'Estructurada' : 'Léxica'}</span><span class="tag ${rating || ''}">${ratingLabel}</span></div>
        <h2>${esc(row.query || row.criteria?.map(x => x.label).join(' + ') || 'Exploración conceptual')}</h2>
        <p>${row.evaluation?.comment ? esc(row.evaluation.comment) : 'Sin comentario de evaluación.'}</p>
      </div>
      <span class="count">${formatDate(row.createdAt)}</span>
    </div>
    <div class="history-meta">
      <span>${row.config?.scope === 'all' ? 'Todo el material' : 'EN libro I'}</span>
      ${row.criteria?.length ? `<span>Criterios: ${esc(row.criteria.map(x => x.label).join(' · '))}</span>` : ''}
      <span>Fuentes: ${esc((row.sources?.length ? row.sources : ['paragraphs']).map(id => SOURCE_GROUPS[id]?.label || id).join(' · '))}</span>
      ${row.builder ? `<span>Intención: ${esc(row.builder.intent)} · ${esc(row.builder.depth)} · ${esc(row.builder.operation || 'abierta')}</span>` : ''}
      <span>${row.results?.length || 0} resultados</span>
      <span>${row.selectedIds?.length || 0} en el dossier</span>
      ${row.evaluation?.issues?.length ? `<span>Problemas: ${esc(row.evaluation.issues.join(', '))}</span>` : ''}
    </div>
    <div class="history-actions">
      <a class="button" href="${href('buscar', {
        q: row.builder ? null : row.query,
        qb: row.builder ? JSON.stringify(row.builder) : null,
        mode: row.builder ? null : 'libre',
        scope: row.config?.scope || 'en1',
        c: row.builder ? null : row.criteria?.map(x => x.id).filter(id => corpus.criterionById.has(id)).join(',') || '',
        src: (row.sources?.length ? row.sources : ['paragraphs']).filter(id => SOURCE_GROUPS[id]).join(','),
      })}">Repetir búsqueda</a>
      <button class="danger" type="button" data-delete="${row.id}">Eliminar</button>
    </div>
  </article>`;
}
