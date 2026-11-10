import { esc } from '../ui.js';

function renderParrafo(p) {
  return `<li><strong>Párrafo ${esc(p.parrafo)}</strong>: ${p.tags.map(t => {
    const sense = t.sentido ? ` · sentido: ${esc(t.sentido)}` : ' · sentido sin especificar';
    const level = t.nivel ? ` · nivel: ${esc(t.nivel)}` : '';
    const implicit = t.implicito ? ' · implícito' : ' · no marcado como implícito';
    const detail = [t.via && `vía: ${t.via}`, t.recurso && `recurso: ${t.recurso}`].filter(Boolean).join(' · ');
    return `<span>${esc(t.concepto)}${sense}${level}${implicit}${detail ? ` · ${esc(detail)}` : ''}</span>`;
  }).join(' / ')}</li>`;
}

// No confundir la lista de candidatos con un trayecto ejecutado.
export function renderEvidenceAudit(audit) {
  const intro = audit.planConfirmado
    ? 'Pasajes del plan efectivamente generado por el motor.'
    : 'Candidatos documentales obtenidos del índice de conceptos clave; el bot NO seleccionó este trayecto.';
  const rows = audit.mostrados.map((c, i) => `<details class="lab-evidence-item">
    <summary><strong>${i + 1}. ${esc(c.id)}</strong> · ${esc(c.titulo)}
      ${c.conceptosCoincidentes.length ? ` · claves: ${esc(c.conceptosCoincidentes.join(', '))}` : ''}</summary>
    <dl class="lab-facts">
      <dt>Unidad</dt><dd>${esc(c.unidad.titulo || '—')} (${esc(c.unidad.id || '—')})</dd>
      <dt>Momento</dt><dd>${esc(c.momento?.titulo || 'No especificado')}</dd>
      <dt>Fundamento de inclusión</dt><dd>${c.fundamentoCandidato === 'paso_del_plan' ? 'Paso registrado en el plan real' : 'Coincidencia en conceptos_clave de la subunidad'}</dd>
      <dt>Movimientos</dt><dd>${esc(c.movimientos.join(', ') || 'No registrados')}</dd>
      <dt>Voces del texto</dt><dd>${esc(c.vocesTexto.join(', ') || 'No registradas')} <small>(códigos editoriales)</small></dd>
      <dt>Relaciones en la subunidad</dt><dd>${c.relacionesRegistradas} (sin verificar aquí su validez inferencial)</dd>
    </dl>
    <p><strong>Tags del contexto de unidad</strong> <small>— pertenecen a párrafos, no específicamente a esta subunidad</small></p>
    ${c.contextoUnidad.length
      ? `<ul>${c.contextoUnidad.map(renderParrafo).join('')}</ul>`
      : '<p class="hint">Sin tags coincidentes en los párrafos disponibles para esta unidad. Esto no prueba ausencia del concepto.</p>'}
  </details>`).join('');
  return `<section class="lab-panel" id="lab-evidence-audit">
    <h3>Evidencia editorial · etapa 2</h3>
    <p class="hint">${esc(intro)} ${esc(audit.nota)}</p>
    <p>${audit.total} ${audit.planConfirmado ? (audit.total === 1 ? 'paso recuperado del plan' : 'pasos recuperados del plan') : (audit.total === 1 ? 'subunidad candidata' : 'subunidades candidatas')}${audit.total > audit.mostrados.length ? ` · se muestran ${audit.mostrados.length}` : ''}.</p>
    ${rows || '<p class="lab-empty">No hay subunidades vinculables con los conceptos reconocidos en este análisis.</p>'}
    <p class="hint">No hay puntuación hermenéutica en esta etapa. Una coincidencia de conceptos o tags no demuestra una inferencia ni justifica un salto entre nodos.</p>
  </section>`;
}
