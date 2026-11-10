// Los diagramas leen datos de una revisión del servidor; no existe fallback a *.data.js.
const file=decodeURIComponent(location.pathname.split('/').pop()||'');
const query=new URLSearchParams(location.search);
const revision=query.get('revision');
const status=document.createElement('p');
status.id='graph-load-status';status.setAttribute('role','status');status.textContent='Cargando datos del grafo…';
document.getElementById('stage').prepend(status);
function fail(message){
 status.setAttribute('role','alert');status.textContent=message;
 for(const selector of ['#svg','#zoomTools','header .tools']){const el=document.querySelector(selector);if(el){el.setAttribute('hidden','');el.style.display='none';}}
}
function validate(x){
 if(!x.revision||x.graph?.file!==file||!Array.isArray(x.indice)||!x.indice.some(g=>g.file===file&&g.id===x.graph.id))throw Error('La respuesta del grafo está incompleta.');
 const d=x.datos;
 if(!d||!Array.isArray(d.NODES)||!d.NODES.length||!Array.isArray(d.EDGES)||!d.FIELDS||typeof d.FIELDS!=='object'||Array.isArray(d.FIELDS)||!Array.isArray(d.COLLAPSED))throw Error('Los datos del grafo están incompletos.');
 const ids=new Set(d.NODES.map(n=>n?.id));
 if(ids.size!==d.NODES.length||d.NODES.some(n=>typeof n?.id!=='string'||!n.id||typeof n.label!=='string'||!Number.isFinite(n.x)||!Number.isFinite(n.y))||new Set(d.EDGES.map(e=>e?.id)).size!==d.EDGES.length||d.EDGES.some(e=>typeof e?.id!=='string'||!e.id||!ids.has(e.source)||!ids.has(e.target))||d.COLLAPSED.some(id=>!ids.has(id)))throw Error('El grafo contiene nodos o relaciones inválidos.');
}
function script(src){return new Promise((resolve,reject)=>{const el=document.createElement('script');el.src=src;el.onload=resolve;el.onerror=()=>reject(Error(`No se pudo cargar el motor del grafo: ${src}`));document.body.append(el);});}
try{
 const url=new URL('/api/labo/grafos/'+encodeURIComponent(file),location.origin);if(revision)url.searchParams.set('revision',revision);
 const response=await fetch(url,{cache:'no-store'});let payload;try{payload=await response.json();}catch{throw Error('La respuesta del servidor es inválida.');}
 if(!response.ok)throw Error(response.status===409?'Los datos cambiaron. Recargá la página desde la que abriste este grafo.':payload.error||`No se pudo cargar el grafo (${response.status}).`);
 validate(payload);if(revision&&payload.revision!==revision)throw Error('El grafo pertenece a otra revisión.');
 window.AGORA_GRAPH_REVISION=payload.revision;
 window.GRAPH_INDEX=payload.indice;
 window.NODES=payload.datos.NODES;window.EDGES=payload.datos.EDGES;window.FIELDS=payload.datos.FIELDS;window.COLLAPSED=payload.datos.COLLAPSED;
 await script('./js/grafos.js');await script('./js/calif.js');await script('./js/donde.js');
 const edge=query.get('arista');if(edge){if(!window.EDGES.some(e=>e.id===edge)||typeof window.selectLinkedEdge!=='function')throw Error('No se encontró la relación solicitada en el grafo.');window.selectLinkedEdge(edge);}
 // El puente se carga tras el motor y usa la misma revisión del grafo.
 await import('./reader-bridge.js');
 status.remove();
 window.AGORA_GRAPH_READY=true;window.dispatchEvent(new Event('agora-grafo-listo'));
}catch(error){fail(error.message||'No se pudo cargar el grafo.');window.AGORA_GRAPH_READY=true;window.dispatchEvent(new Event('agora-grafo-listo'));}
