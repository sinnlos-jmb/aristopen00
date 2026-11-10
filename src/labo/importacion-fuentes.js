// Funciones para una futura importación inicial; no crean transacciones ni se ejecutan solas.
// El llamador debe abrir una transacción y hacer respaldo antes de usarlas.
import { registrarModeloAnterior } from './compatibilidad.js';
import { parseJson } from '../utils/record.js';
import { GRAFOS_KEY,TEXTO_KEY,EDITORIAL_KEY,validarFuentes } from './snapshot.js';

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));
  return value;
}
const iguales=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function prepararEditorialConLegados(editorial, modelosAnteriores={}) {
  const legados={};
  for(const tipo of ['bot','fase']) {
    const modelos=modelosAnteriores[tipo]||[];
    if(!Array.isArray(modelos))throw Error('La lista de modelos anteriores debe ser un arreglo.');
    legados[tipo]=modelos.map(modelo=>registrarModeloAnterior(modelo,editorial[tipo]));
  }
  return {...editorial,legados};
}
export function documentosParaCorpus(textRaw, g, editorial) {
  validarFuentes({tags:{unidades:[],faqs:[]},estatico:{raices:[]},funcional:{categorias:[],aristas:[]},textRaw,...g,editorial});
  return {[TEXTO_KEY]:textRaw,[GRAFOS_KEY]:g,[EDITORIAL_KEY]:editorial};
}
export async function compararFuentes(db, documentos, {bloquear=false} = {}) {
  const keys=Object.keys(documentos);
  if (keys.length !== 3 || !keys.includes(TEXTO_KEY) || !keys.includes(GRAFOS_KEY) || !keys.includes(EDITORIAL_KEY)) throw Error('Conjunto de fuentes inválido.');
  const rows=await db.query(`SELECT clave, contenido FROM documentos WHERE clave IN (?, ?, ?)${bloquear?' FOR UPDATE':''}`,keys);
  const actual=new Map(rows.map(r=>[r.clave,parseJson(r.contenido)]));
  return keys.map(clave=>({clave,estado:!actual.has(clave)?'ausente':iguales(actual.get(clave),documentos[clave])?'idéntico':'diferente'}));
}
export async function insertarFuentesFaltantes(conn, documentos) {
  const plan=await compararFuentes(conn,documentos,{bloquear:true});
  const conflictos=plan.filter(p=>p.estado==='diferente');
  if (conflictos.length) throw Error(`Fuentes diferentes: ${conflictos.map(x=>x.clave).join(', ')}. No se reemplazó nada.`);
  for(const p of plan.filter(x=>x.estado==='ausente'))
    await conn.query('INSERT INTO documentos (clave, contenido) VALUES (?, ?)',[p.clave,JSON.stringify(documentos[p.clave])]);
  const verificado=await compararFuentes(conn,documentos);
  if(verificado.some(x=>x.estado!=='idéntico'))throw Error('La verificación de fuentes falló; cancelar la transacción.');
  return plan;
}
