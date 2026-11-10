// Verifica procedencia y alcance de la evidencia sin navegador ni base de datos.
import assert from 'node:assert/strict';
import { buildEvidenceAudit } from '../js/lab/evidenceAudit.js';
import { renderEvidenceAudit } from '../js/views/labEvidenceView.js';

const S = {
  U: { unidad: { id: 'unidad', titulo: '<Unidad>', parrafos: [6, 7] } },
  SUB: {
    '1094b14-19': { titulo: '<Pasaje>', unidad: 'unidad', conceptos_clave: ['kalon', 'phusis'], movimientos: ['contraste'], voz_texto: ['A?'], relaciones: [{ rel: 'contrasta' }] },
    '1094b19-24': { titulo: 'Otro tramo', unidad: 'unidad', conceptos_clave: ['akribeia'], movimientos: [] },
  },
  MOM: { '1094b14-19': { m: { id: 'II', titulo: 'Diversidad de bienes' } } },
  TP: {
    6: { conceptos: [
      { c: 'phusis', s: 'por_naturaleza', n: 'presente' },
      { c: 'phusis', s: 'del_asunto', n: 'presente', implicito: true },
      { c: 'otro', n: 'central' },
    ] },
    7: { conceptos: [ { c: 'dikaiosune', n: 'central' } ] },
  },
};
const diagnosis = { analysis: { conceptos: [{ id: 'phusis', word: 'naturaleza' }] } };
const result = buildEvidenceAudit(S, { diagnosis, plan: [] });
assert.equal(result.planConfirmado, false);
assert.equal(result.tipo, 'candidatos_por_indice');
assert.equal(result.total, 1);
assert.deepEqual(result.mostrados[0].conceptosCoincidentes, ['phusis']);
assert.deepEqual(result.mostrados[0].contextoUnidad.map(x => x.parrafo), [6]);
assert.equal(result.mostrados[0].contextoUnidad[0].tags[0].sentido, 'por_naturaleza');
assert.equal(result.mostrados[0].contextoUnidad[0].tags[1].implicito, true);
assert.equal(result.mostrados[0].vinculoTagSubunidad, 'no_acreditado');
assert.equal(result.mostrados[0].momento.titulo, 'Diversidad de bienes');

const rendered = renderEvidenceAudit(result);
assert.match(rendered, /Evidencia editorial/);
assert.match(rendered, /contexto de unidad/);
assert.match(rendered, /sentido: por_naturaleza/);
assert.match(rendered, /Candidatos documentales/);
assert.match(rendered, /&lt;Pasaje&gt;/);
assert.doesNotMatch(rendered, /<Pasaje>|<Unidad>/);
assert.doesNotMatch(rendered, /<style|\sstyle=/i);

const executed = buildEvidenceAudit(S, { diagnosis, plan: [{ id: '1094b14-19' }] });
assert.equal(executed.planConfirmado, true);
assert.equal(executed.mostrados[0].fundamentoCandidato, 'paso_del_plan');
assert.match(renderEvidenceAudit(executed), /Pasajes del plan efectivamente generado/);

const noDetection = buildEvidenceAudit(S, { diagnosis: { analysis: { conceptos: [] } }, plan: [] });
assert.equal(noDetection.total, 0);
assert.match(renderEvidenceAudit(noDetection), /No hay subunidades/);

const withoutTags = buildEvidenceAudit({ ...S, TP: {} }, { diagnosis, plan: [] });
assert.equal(withoutTags.total, 1);
assert.deepEqual(withoutTags.mostrados[0].contextoUnidad, []);
assert.match(renderEvidenceAudit(withoutTags), /Esto no prueba ausencia del concepto/);

const limited = buildEvidenceAudit(S, { diagnosis, plan: [] }, { limit: 0 });
assert.equal(limited.total, 1);
assert.equal(limited.mostrados.length, 0);
console.log('OK: evidencia de subunidad, contexto de tags, alcance y seguridad de presentación.');
