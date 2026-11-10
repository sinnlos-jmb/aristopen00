import { esc } from '../ui.js';
import { QUESTION_CASES, evaluateQuestionCase } from '../lab/questionCases.js';

export function renderQuestionBench() {
  const evaluations = QUESTION_CASES.map(item => evaluateQuestionCase(item));
  const agreements = evaluations.filter(e => e.checks.agrees).length;
  const rows = evaluations.map(e => {
    const expectedMode = e.expected.primaryMode || '— (no evaluado)';
    const observedMode = e.observed.primaryMode || '—';
    const conceptStatus = e.checks.conceptMatches ? 'Coincide' : `Diverge: faltan ${e.checks.missing.join(', ') || '—'}; sobran ${e.checks.unexpected.join(', ') || '—'}`;
    const modeStatus = e.checks.modeEvaluated
      ? (e.checks.modeMatches ? 'Coincide' : 'Diverge')
      : 'Sin criterio editorial todavía';
    const triggerWords = e.observed.triggers.map(t => `${t.word} → ${t.conceptId}`).join(' · ') || 'Ninguno';
    return `<tr>
      <td><strong>${esc(e.pregunta)}</strong><p class="hint">${esc(e.criterio)}</p></td>
      <td>${esc(e.expected.conceptIds.join(', '))}<br><small>Modo: ${esc(expectedMode)}</small></td>
      <td>${esc(e.observed.conceptIds.join(', ') || 'Ninguno')}<br><small>Modo: ${esc(observedMode)}</small><br><small>Activadores: ${esc(triggerWords)}</small></td>
      <td>${esc(conceptStatus)}<br><small>${esc(modeStatus)}</small></td>
      <td><button type="button" class="lab-btn lab-btn--ghost" data-question-case="${esc(e.id)}">Inspeccionar</button></td>
    </tr>`;
  }).join('');

  return `<section class="lab-card" id="lab-question-bench">
    <h2>Preguntas de control · etapa 1</h2>
    <p class="hint">${agreements} de ${evaluations.length} coinciden con los criterios provisorios de reconocimiento.
    Esta comparación examina solo <code>analyze()</code>: no mide verdad filosófica, calidad de respuesta ni acierto del trayecto.</p>
    <div class="lab-ranking-wrap"><table class="lab-ranking">
      <thead><tr><th>Pregunta y criterio</th><th>Esperado</th><th>Detectado</th><th>Evaluación</th><th>Detalle</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <p class="hint">«Inspeccionar» carga la pregunta en el Inspector del motor para ver su decisión de FAQ, alternativas y plan; esas fases no se puntúan en esta etapa.</p>
  </section>`;
}
