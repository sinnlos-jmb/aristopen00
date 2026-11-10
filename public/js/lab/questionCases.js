import { analyze } from './analyze.js';

// Hipótesis editoriales de prueba. No son verdades del corpus ni trayectos prescriptivos.
// En una fase posterior se podrán añadir referencias a FAQ curadas y criterios de recorrido.
export const QUESTION_CASES = Object.freeze([
  {
    id: 'naturaleza',
    pregunta: '¿Qué es la naturaleza?',
    expected: { conceptIds: ['phusis'], primaryMode: 'definir' },
    criterio: '«Naturaleza» debe activar phusis en una pregunta de definición.',
  },
  {
    id: 'physis-acentuada',
    pregunta: '¿Qué es la phýsis?',
    expected: { conceptIds: ['phusis'], primaryMode: 'definir' },
    criterio: 'La grafía transliterada acentuada debería reconocerse igual que «naturaleza».',
  },
  {
    id: 'arete',
    pregunta: '¿Qué significa areté?',
    expected: { conceptIds: ['arete'], primaryMode: 'definir' },
    criterio: 'Reconocimiento del término griego transliterado e intención definitoria.',
  },
  {
    id: 'relacion',
    pregunta: '¿Cómo se relacionan naturaleza y virtud?',
    expected: { conceptIds: ['phusis', 'arete'], primaryMode: 'relacionar' },
    criterio: 'Identificar ambos términos y priorizar relación frente al «cómo» genérico.',
  },
  {
    id: 'contemplacion',
    pregunta: '¿La felicidad es contemplación?',
    expected: { conceptIds: ['eudaimonia', 'theoria'], primaryMode: null },
    criterio: 'Se verifica la detección conceptual; la interpretación de una pregunta polar queda abierta.',
  },
]);

// Compara reconocimiento léxico y de intención, no corrección filológica ni calidad del diálogo.
// Aceptar un análisis externo facilita contrastar la salida de simulate() sin volver a procesar.
export function evaluateQuestionCase(questionCase, analysis = analyze(questionCase.pregunta)) {
  const expectedIds = [...new Set(questionCase.expected.conceptIds)];
  const foundIds = [...new Set(analysis.conceptos.map(c => c.id))];
  const missing = expectedIds.filter(id => !foundIds.includes(id));
  const unexpected = foundIds.filter(id => !expectedIds.includes(id));
  const expectedMode = questionCase.expected.primaryMode;
  const modeEvaluated = expectedMode !== null && expectedMode !== undefined;
  const actualMode = analysis.primaryMode?.id || null;
  const modeMatches = modeEvaluated ? expectedMode === actualMode : null;
  const conceptMatches = missing.length === 0 && unexpected.length === 0;

  return {
    id: questionCase.id,
    pregunta: questionCase.pregunta,
    criterio: questionCase.criterio,
    expected: { conceptIds: expectedIds, primaryMode: expectedMode },
    observed: {
      normalized: analysis.normalized,
      conceptIds: foundIds,
      // Las palabras son evidencias que analyze() reporta, no una explicación semántica de su elección.
      triggers: analysis.conceptos.map(c => ({ word: c.word, conceptId: c.id })),
      modes: analysis.modos.map(m => m.id),
      primaryMode: actualMode,
    },
    checks: {
      conceptMatches,
      missing,
      unexpected,
      modeEvaluated,
      modeMatches,
      agrees: conceptMatches && modeMatches !== false,
    },
    level: 'reconocimiento_lexico',
  };
}
