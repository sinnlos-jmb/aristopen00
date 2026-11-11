import assert from 'node:assert/strict';
import { clasificarFaq, validarQuery } from '../services/user-queries.contract.js';
const faqs = [
  { id: 'faq.phusis', pregunta: '¿Qué es la naturaleza?', variantes: ['Naturaleza: qué significa'] },
  { id: 'faq.arete', pregunta: '¿Qué es la excelencia?', variantes: [] },
];
assert.deepEqual(clasificarFaq('¿Qué es la naturaleza?', faqs).faqId, 'faq.phusis');
assert.equal(clasificarFaq('Naturaleza: qué significa', faqs).estado, 'variante');
assert.equal(clasificarFaq('Naturaleza y felicidad', faqs).estado, 'sin_match_exacto');
assert.equal(clasificarFaq('¿Qué es la naturaleza?', [faqs[0], { ...faqs[0], id: 'otra' }]).estado, 'multiple');
const p = { textoInicial: 'Naturaleza y felicidad', estado: 'conforme', consulta: {
  tema: 'phusis', intencion: 'relacionar', destino: 'mi experiencia', nivel: null, extension: 'breve', origen: null,
}, bitacora: [
  { tipo: 'inicio' },
  { tipo: 'respuesta', datos: { pregunta: 'destino', opcion: { fuente: 'texto_libre', textoBuscado: 'mi experiencia' } } },
  { tipo: 'cierre', estado: 'conforme' },
] };
assert.deepEqual(validarQuery(p).agregados, [{ campo: 'destino', texto: 'mi experiencia' }]);
assert.throws(() => validarQuery({ ...p, estado: 'en_refinamiento' }), /cerrada/);
assert.throws(() => validarQuery({ ...p, bitacora: [{ tipo: 'inicio' }] }), /Bitácora|cierre/);
console.log('OK: validación de consultas y coincidencia textual FAQ sin MariaDB.');
