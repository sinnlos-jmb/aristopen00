import {normalizeWithOffsets} from '../reader/text.js';
const arr=x=>Array.isArray(x)?x:[];
const norm=x=>normalizeWithOffsets(String(x??'')).value;
export function containsAnchor(text,anchor){const needle=norm(anchor);return !!needle&&norm(text).includes(needle);}
export function inspectNuclei(pilot,graph,book,subunits=null){
 const issues=[], issue=(id,message)=>issues.push({id,message});
 const nodes=new Map(), concepts=new Map(arr(graph?.nodes).map(n=>[n.uid,n]));
 const paragraphs=new Map(book.chapters.flatMap(c=>c.paragraphs.map(p=>[p.number,p])));
 const subs=subunits??new Set(arr(graph?.asociaciones).filter(a=>a.tipo==='tag_subunidad').map(a=>`${a.unidad}/${a.subunidad}`));
 const edgeIds=new Set(arr(graph?.edges).map(e=>e.source?.id).filter(Boolean));
 for(const n of arr(pilot?.nucleos)){
  if(!n.id||nodes.has(n.id)){issue(n.id,'ID de núcleo ausente o duplicado');continue;}
  nodes.set(n.id,n); const local=new Set();
  for(const e of arr(n.evidencias)){
   if(e.obra!=='EN'||e.libro!==1||e.unidad!==n.unidad||!subs.has(`${e.unidad}/${e.subunidad}`))issue(n.id,`Referencia no resuelta: ${e.unidad}/${e.subunidad}`);
   if(!containsAnchor(paragraphs.get(e.parrafo_local)?.gr,e.gr_ancla))issue(n.id,`Ancla griega no localizada en §${e.parrafo_local}: ${e.gr_ancla}`);
  }
  for(const m of arr(n.manifestaciones)){
   if(!m.id||local.has(m.id))issue(n.id,'Manifestación sin ID único');local.add(m.id);
   const c=concepts.get(m.concepto);if(!c)issue(n.id,`Concepto no resuelto: ${m.concepto}`);
   else if(m.sentido!=null&&!arr(c.source?.sentidos).some(s=>s.id===m.sentido))issue(n.id,`Sentido no resuelto: ${m.concepto}#${m.sentido}`);
   const e=n.evidencias?.[m.evidencia];if(!e)issue(n.id,`Manifestación sin evidencia: ${m.id}`);
   else if(m.expreso&&!containsAnchor(paragraphs.get(e.parrafo_local)?.gr,m.ancla))issue(n.id,`Manifestación sin ancla: ${m.id}`);
  }
  for(const r of arr(n.relaciones))if(!local.has(r.de)||!local.has(r.a))issue(n.id,'Relación con extremo local inexistente');
  for(const id of arr(n.aristas_funcionales_existentes))if(!edgeIds.has(id))issue(n.id,`Arista funcional no resuelta: ${id}`);
 }
 const transitions=new Map();for(const t of arr(pilot.transiciones)){
  const key=`${t.de}/${t.a}`;if(!nodes.has(t.de)||!nodes.has(t.a)||transitions.has(key)||!t.justificacion)issue('transiciones',`Transición inválida: ${key}`);else transitions.set(key,t);
 }
 const routeIds=new Set();for(const r of arr(pilot.recorridos)){
  if(!r.id||routeIds.has(r.id)||!r.orden?.length||r.orden.some(id=>!nodes.has(id)))issue('recorridos',`Recorrido inválido: ${r.id}`);
  routeIds.add(r.id);for(let i=1;i<(r.orden?.length??0);i++)if(!transitions.has(`${r.orden[i-1]}/${r.orden[i]}`))issue('recorridos',`Falta transición: ${r.orden[i-1]} → ${r.orden[i]}`);
 }
 return {issues,nodes,concepts,paragraphs,transitions,graph};
}
export function continuations(pilot,id){return arr(pilot.transiciones).filter(t=>t.de===id);}
export function anchorMarkup(text,anchor,esc){const source=normalizeWithOffsets(text),needle=norm(anchor),i=needle?source.value.indexOf(needle):-1;if(i<0)return esc(text);const start=source.offsets[i],last=source.offsets[i+needle.length-1];let end=last+String.fromCodePoint(text.codePointAt(last)).length;while(end<text.length&&/\p{M}/u.test(text[end]))end++;return esc(text.slice(0,start))+'<mark>'+esc(text.slice(start,end))+'</mark>'+esc(text.slice(end));}
