import assert from 'node:assert/strict';
import { agruparFaqs, idGrupoFaq, normalizarTiposVisibles } from '../js/lab/graphFaqGrouping.js';
import { normalizarDisposicion } from '../js/lab/graphLayoutPersistence.js';
const n = (id, tipo) => ({ group: 'nodes', data: { id, tipo, label: id } });
const e = (id, source, target, tipo = 'foco_faq') => ({ group: 'edges', data: { id, source, target, tipo, fuente: 'corpus' } });
const corpus = [n('concepto_estatico:arete', 'concepto_estatico'), n('concepto_estatico:phusis', 'concepto_estatico'),
  n('faq:1', 'faq'), n('faq:2', 'faq'), n('faq:3', 'faq'), n('unidad:1', 'unidad'),
  e('e1', 'faq:1', 'concepto_estatico:arete'), e('e2', 'faq:2', 'concepto_estatico:arete'),
  e('e3', 'faq:3', 'concepto_estatico:phusis'), e('e4', 'concepto_estatico:arete', 'concepto_estatico:phusis', 'arista_funcional')];
const opts = { focos: ['concepto_estatico:arete', 'concepto_estatico:phusis'] };
const collapsed = agruparFaqs(corpus, opts);
const gid = idGrupoFaq('concepto_estatico:arete');
assert.equal(collapsed.grupos.length, 1);
assert.equal(collapsed.agrupadas, 2);
assert(collapsed.elementos.some(x => x.data.id === gid && x.data.agrupadorFaq));
assert(!collapsed.elementos.some(x => x.data.id === 'faq:1'));
assert(!collapsed.elementos.some(x => x.data.id === 'e1'));
assert(collapsed.elementos.some(x => x.data.id === 'e4'));
assert(collapsed.elementos.some(x => x.data.id === 'faq:3'));
const expanded = agruparFaqs(corpus, { ...opts, expandidos: new Set([gid]) });
assert(expanded.elementos.some(x => x.data.id === 'faq:1'));
assert(!expanded.elementos.some(x => x.data.id === 'e1')); // el vínculo documental permanece en la proyección original
assert(expanded.elementos.some(x => x.data.aristaOriginalId === 'e1' && x.data.source === gid && x.data.target === 'faq:1'));
assert(expanded.elementos.some(x => x.data.id === `enlace:${gid}` && x.data.source === 'concepto_estatico:arete'));
assert(expanded.elementos.some(x => x.data.id === gid));
const hidden = agruparFaqs(corpus, { ...opts, tiposVisibles: { faq: false, concepto_estatico: false, unidad: false } });
assert(!hidden.elementos.some(x => x.data.tipo === 'faq' || x.data.tipo === 'unidad'));
assert(hidden.elementos.some(x => x.data.id === 'concepto_estatico:arete')); // focos protegidos
assert.equal(hidden.elementos.filter(x => x.group === 'edges').length, 1);
assert.equal(normalizarTiposVisibles({ faq: false }).faq, false);
assert.equal(normalizarTiposVisibles({ faq: false }).unidad, true);
const focusFaq = agruparFaqs(corpus, { focos: ['faq:1', 'concepto_estatico:arete'] });
assert(focusFaq.elementos.some(x => x.data.id === 'faq:1'));
assert(!focusFaq.elementos.some(x => x.data.id === gid));
const prefs = normalizarDisposicion({ tiposVisibles: { faq: false, unidad: false }, faqExpandidas: [gid], titulos: { e4: 'Condición' } });
assert.equal(prefs.tiposVisibles.faq, false);
assert.deepEqual(prefs.faqExpandidas, [gid]);
assert.equal(prefs.titulos.e4, 'Condición');
console.log('OK: FAQ agrupadas, expansión reversible, relaciones originales y filtros con focos protegidos.');
