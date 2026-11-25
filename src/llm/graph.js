// N1-U.18.2. Proyección de solo lectura del catálogo editorial, nunca aristas inferidas.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
const arr=v=>Array.isArray(v)?v:[];
const norm=v=>String(v||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase();
const slugs={proemio:'proemio','faq.etica.intro':'etica','faq.agathon.pros_hen':'bien','faq.lab.felicidad':'felicidad','faq.lab.ergon':'ergon','faq.lab.alma':'alma','faq.lab.virtudes':'virtudes'};
export async function loadEditorialGraph(publicDir,revision,index){
  const names=['n1u5-fichas-explicativas','n1u6-puentes-explicativos','n1u7-fichas-red-piloto'];
  const [a,b,c]=await Promise.all(names.map(n=>readFile(path.join(publicDir,'lab',n+'.json'),'utf8').then(JSON.parse)));
  return buildEditorialGraph([a,b,c],revision,index);
}
export function buildEditorialGraph([a,b,c],revision,index){
  if(!revision||![a,b,c].every(f=>f?.fuente?.revision===revision))throw Error('Revisión editorial incompatible.');
  const nodes=new Map(),edges=[],docs=new Map(index.documents.filter(d=>d.kind==='subunidad'&&d.es&&d.gr).map(d=>[d.id,d]));
  const fichas=[...arr(a.fichas),...arr(c.fichas)];
  for(const f of fichas){
    if(!Object.hasOwn(slugs,f.id)||nodes.has(f.id))continue;
    nodes.set(f.id,{id:f.id,type:'ficha',title:String(f.titulo),url:'/#/fichas/'+slugs[f.id],estado:f.fuente_editorial?.estado||'documento_editorial',introduccion:arr(f.introduccion).length?f.introduccion.join(' ').slice(0,900):String(f.introduccion||'').slice(0,900)});
    const supports=[...arr(f.apoyos),...arr(f.pasos),...arr(b.puentes).filter(p=>p.ficha_id===f.id).flatMap(p=>arr(p.apoyos))];
    for(const p of supports){
      const id='sub:'+p.sub_id,d=docs.get(id);
      if(!d||edges.some(e=>e.from===f.id&&e.to===id))continue;
      nodes.set(id,{id,type:'pasaje',title:d.title,reference:d.reference});
      edges.push({id:`apoyo:${f.id}:${id}`,from:f.id,to:id,label:'apoyo documental',type:'apoyo',estado:'selección editorial',rol:String(p.rol||p.titulo||'').slice(0,160)});
    }
  }
  for(const e of arr(c.red?.relaciones))if(nodes.get(e.desde)?.type==='ficha'&&nodes.get(e.hacia)?.type==='ficha'){
    edges.push({id:e.id,from:e.desde,to:e.hacia,label:e.nombre,type:'relacion',estado:c.red.estado||'relación editorial propuesta'});
  }
  if(!nodes.size)throw Error('No hay fichas compatibles.');
  return {nodes,edges,docs};
}
const str=(description)=>({type:'string',description});
const def=(name,description,properties,required)=>({type:'function',function:{name,description,parameters:{type:'object',properties,required,additionalProperties:false}}});
export const GRAPH_TOOLS=[
  def('buscar_nodos','Buscar fichas y pasajes vinculados por palabras del título o referencia. Usá los IDs devueltos.',{query:str('Palabras o referencia Bekker')},['query']),
  def('explorar_subgrafo','Recorrer relaciones editoriales entre fichas y, opcionalmente, sus apoyos documentales. No crea relaciones.',{id:str('ID de ficha'),depth:{type:'integer',minimum:1,maximum:3},direction:{type:'string',enum:['ambas','saliente','entrante']},supports:{type:'boolean'}},['id','depth']),
  def('buscar_caminos','Buscar un camino mínimo entre dos fichas, hasta tres aristas, en ambos sentidos; conserva dirección registrada.',{from:str('ID origen'),to:str('ID destino')},['from','to']),
  def('obtener_ficha','Consultar introducción y apoyos registrados de una ficha.',{id:str('ID de ficha')},['id']),
  def('obtener_evidencia','Pedir hasta cuatro pasajes por IDs exactos de los apoyos. Los textos se verifican contra el corpus activo.',{ids:{type:'array',items:str('ID sub:...'),minItems:1,maxItems:4}},['ids']),
  def('buscar_pasajes','Buscar subunidades en el corpus activo con términos concretos, incluyendo referencias o palabras griegas. Recuperación léxica, no arista editorial.',{query:str('Términos de búsqueda')},['query']),
];
const publicNode=n=>{const {introduccion,...rest}=n;return rest;};
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=200;
export function runGraphTool(graph,name,args,{search,addSource,addFicha}){
  const {nodes,edges,docs}=graph;
  if(!args||typeof args!=='object'||Array.isArray(args))throw Error('Argumentos inválidos');
  const keys={buscar_nodos:['query'],explorar_subgrafo:['id','depth','direction','supports'],buscar_caminos:['from','to'],obtener_ficha:['id'],obtener_evidencia:['ids'],buscar_pasajes:['query']}[name];
  if(!keys||Object.keys(args).some(k=>!keys.includes(k)))throw Error('Operación o argumentos no admitidos');
  const ficha=id=>{if(!text(id)||nodes.get(id)?.type!=='ficha')throw Error('Ficha desconocida');return nodes.get(id);};
  const pack=(ids,es,extra={})=>({nodes:[...new Set(ids)].filter(id=>nodes.has(id)).map(id=>publicNode(nodes.get(id))),edges:es,...extra});
  const relations=edges.filter(e=>e.type==='relacion');
  if(name==='buscar_nodos'){
    if(!text(args.query))throw Error('Consulta inválida');const terms=norm(args.query).split(/\s+/).filter(Boolean);
    const result=[...nodes.values()].map(n=>({n,score:terms.filter(t=>norm(`${n.id} ${n.title} ${n.reference||''}`).includes(t)).length})).filter(x=>x.score).sort((a,b)=>b.score-a.score||Number(b.n.type==='ficha')-Number(a.n.type==='ficha')).slice(0,12);
    return pack(result.map(x=>x.n.id),[]);
  }
  if(name==='explorar_subgrafo'){
    ficha(args.id);if(!Number.isInteger(args.depth)||args.depth<1||args.depth>3||!['ambas','saliente','entrante'].includes(args.direction??'ambas')||(args.supports!==undefined&&typeof args.supports!=='boolean'))throw Error('Profundidad o dirección inválida');
    const visited=new Set([args.id]),selected=new Map();let front=[args.id];
    for(let i=0;i<args.depth;i++){const next=[];for(const id of front)for(const e of relations){
      const target=e.from===id&&args.direction!=='entrante'?e.to:e.to===id&&args.direction!=='saliente'?e.from:null;
      if(!target)continue;selected.set(e.id,e);if(!visited.has(target)){visited.add(target);next.push(target);}
    }front=next;}
    if(args.supports){for(const e of edges.filter(e=>e.type==='apoyo'&&visited.has(e.from)).slice(0,18)){selected.set(e.id,e);visited.add(e.to);}}
    return pack([...visited],[...selected.values()]);
  }
  if(name==='buscar_caminos'){
    ficha(args.from);ficha(args.to);const queue=[{id:args.from,ids:[args.from],es:[]}];const seen=new Set([args.from]);
    for(let i=0;i<queue.length;i++){const p=queue[i];if(p.id===args.to)return pack(p.ids,p.es,{found:true});if(p.es.length===3)continue;
      for(const e of relations){const next=e.from===p.id?e.to:e.to===p.id?e.from:null;if(next&&!seen.has(next)){seen.add(next);queue.push({id:next,ids:[...p.ids,next],es:[...p.es,e]});}}}
    return pack([args.from,args.to],[],{found:false});
  }
  if(name==='obtener_ficha'){
    const f=ficha(args.id);addFicha(f);const supports=edges.filter(e=>e.type==='apoyo'&&e.from===f.id);
    return pack([f.id,...supports.map(e=>e.to)],supports,{introduccion:f.introduccion});
  }
  let hits;
  if(name==='obtener_evidencia'){
    if(!Array.isArray(args.ids)||!args.ids.length||args.ids.length>4||args.ids.some(id=>!text(id)||!docs.has(id)))throw Error('ID documental desconocido o límite superado');
    hits=[...new Set(args.ids)].map(id=>docs.get(id));
  }else{
    if(!text(args.query))throw Error('Consulta inválida');hits=search(args.query).slice(0,4).map(d=>docs.get(d.id)).filter(Boolean);
  }
  const evidence=hits.map(addSource).filter(Boolean);
  // Solo apoyos existentes; los hits léxicos sin vínculo aparecen como documentos, no aristas.
  return {nodes:evidence.map(d=>nodes.has(d.id)?publicNode(nodes.get(d.id)):{id:d.id,type:'pasaje',title:d.title,reference:d.reference}),edges:[],evidence};
}
