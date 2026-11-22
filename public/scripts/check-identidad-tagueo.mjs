import assert from 'node:assert/strict';
import { auditarIdentidadYTagueo } from '../js/lab/identityTaggingAudit.js';

const input = () => ({
  estatico:{raices:[{id:'phusis',label:'Naturaleza',gr:'φύσις',sentidos:[{id:'origen'}],hijos:[{id:'techne',label:'Técnica'}]}]},
  funcional:{categorias:[{id:'I',label:'Categoría',hijos:[{id:'phusis',label:'Naturaleza',gr:'φύσις'},{id:'energeia',label:'Actividad',remite_a:['phusis#origen']}]}],aristas:[{id:'e1',de:'phusis',a:'energeia',rel:'produce',voz:'textual',ref:'EN I'}]},
  tags:{version:'test',unidades:[{id:'u1',parrafos:[1],subunidades:[{id:'s1',conceptos_clave:['phusis'],relaciones:[{de:'expresión libre',rel:'hace',a:'techne',destinos:[{arista:'e1'}]}]}]}],parrafos:[{parrafo:1,estado:'propuesto',conceptos:[{c:'phusis',s:'origen',n:'central'}]}],faqs:[{id:'faq1',arbol:{nodo:'energeia'}}]},
});
const baseline = auditarIdentidadYTagueo(input());
assert.equal(baseline.resumen.conceptosEstaticos,2);
assert.equal(baseline.resumen.identidadesCompartidas,1);
assert.equal(baseline.resumen.remisionesExplicitas,1);
assert.equal(baseline.resumen.errores,0,'No exigir remite_a a un ID compartido; FAQ puede apuntar a funcional; extremos pueden ser texto libre.');
assert.equal(baseline.identidades.find(x=>x.id==='phusis').clase,'compartido');
assert.equal(baseline.remisiones[0].sentido,'origen');
assert.equal(baseline.resumen.destinosReferencianArista,1);
const mutation = input();
mutation.funcional.categorias[0].hijos[1].remite_a=['phusis#inexistente'];
mutation.funcional.aristas[0].a='inexistente';
mutation.tags.parrafos[0].conceptos.push({c:'techne',s:'no_existe',n:'central',via:'ver',implicito:true});
mutation.tags.unidades[0].subunidades[0].conceptos_clave.push('otro');
mutation.tags.unidades[0].subunidades[0].relaciones[0].destinos[0].arista='otra_arista';
const r = auditarIdentidadYTagueo(mutation);
const codes = new Set(r.hallazgos.filter(h=>h.nivel==='error').map(h=>h.codigo));
for (const k of ['REMISION_INVALIDA','ARISTA_EXTREMO_INVALIDO','TAG_SENTIDO_INVALIDO','CONCEPTO_CLAVE_INVALIDO','DESTINO_ARISTA_INVALIDA','VIA_IMPLICITA_SIN_CITA']) assert.ok(codes.has(k),`Debe detectar ${k}`);
assert.ok(r.resumen.errores >= 6);
const copy = input();copy.estatico.raices[0].gr='φύσις (otra forma)';
const alt = auditarIdentidadYTagueo(copy);
assert.equal(alt.resumen.errores,0);
assert.ok(alt.hallazgos.some(h=>h.codigo==='GRIEGO_COMPARTIDO_DIFERENTE'&&h.nivel==='revision'));
console.log('OK: identidades compartidas, remisiones, corpus editorial, referencias y clasificación no destructiva.');
