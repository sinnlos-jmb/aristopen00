// Pruebas del experimento editorial: registran divergencias sin arreglar el léxico del motor.
import assert from 'node:assert/strict';
import { QUESTION_CASES, evaluateQuestionCase } from '../js/lab/questionCases.js';
import { renderQuestionBench } from '../js/views/labQuestionBench.js';
import { analyze } from '../js/lab/analyze.js';

const byId = id => evaluateQuestionCase(QUESTION_CASES.find(item => item.id === id));
const nature = byId('naturaleza');
assert.equal(nature.checks.agrees, true);
assert.deepEqual(nature.observed.triggers, [{ word: 'naturaleza', conceptId: 'phusis' }]);

const physis = byId('physis-acentuada');
assert.equal(physis.checks.agrees, false);
assert.deepEqual(physis.checks.missing, ['phusis']);
assert.equal(physis.observed.primaryMode, 'definir');

const relation = byId('relacion');
assert.equal(relation.checks.agrees, true);
assert.equal(relation.observed.primaryMode, 'relacionar');

const polar = byId('contemplacion');
assert.equal(polar.checks.modeEvaluated, false);
assert.equal(polar.checks.modeMatches, null);
assert.deepEqual(polar.observed.conceptIds, ['eudaimonia', 'theoria']);

assert.deepEqual(byId('arete').observed.conceptIds, ['arete']);
assert.equal(analyze('¿Qué es la phýsis?').normalized, 'que es la physis');

const html = renderQuestionBench();
assert.match(html, /Preguntas de control/);
assert.match(html, /data-question-case="physis-acentuada"/);
assert.match(html, /Diverge/);
assert.doesNotMatch(html, /<style|\sstyle=/i);
console.log('OK: 5 preguntas de control, expectativas y divergencias explícitas (sin alterar el motor).');
