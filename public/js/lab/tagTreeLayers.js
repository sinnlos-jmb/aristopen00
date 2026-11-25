import {branchVisibility} from './tagTreeNavigation.js';
// N1-U.19.3.2: pure view projection, never writes the catalogue.
export const TREE_LAYERS = Object.freeze([
 ['roots','Raíces y categorías'], ['main','Conceptos principales'],
 ['deep','Subconceptos, partes y divisiones'], ['senses','Sentidos registrados'],
 ['cross','Aristas funcionales transversales'], ['refs','Remisiones entre árboles'],
 ['docs','Tags y apoyos documentales'], ['faqs','FAQ con anclaje funcional']
]);
export const ESSENTIAL = Object.freeze(['roots','main','cross']);
export const HIERARCHY = Object.freeze(['roots','main','deep','cross']);
const arr = v => Array.isArray(v) ? v : [];
const str = v => String(v ?? '');
const uid = (...parts) => parts.map(x=>encodeURIComponent(str(x))).join(':');
export function maxTreeDepth(graph, tree) {
 return Math.max(0, ...graph.nodes.filter(n=>n.tree===tree).map(n=>n.depth));
}
export function layeredTree(graph, tree, {layers=ESSENTIAL, depth=1, root='', faqs=[], branches=new Map()}={}) {
 const on = new Set(layers), index = new Map(graph.nodes.map(n=>[n.uid,n]));
 const max = maxTreeDepth(graph,tree), level=Math.max(0,Math.min(max, Number.isFinite(Number(depth))?Math.floor(Number(depth)):1));
 const branch = n => { if(!root)return true; const seen=new Set(); for(let x=n;x&&!seen.has(x.uid);x=index.get(x.parent)){if(x.uid===root)return true;seen.add(x.uid);}return false; };
 const nodes=new Map(), edges=new Map();
 const {added,hidden}=branchVisibility(graph,tree,branches);
 const add=n=>{if(!nodes.has(n.uid))nodes.set(n.uid,n);};
 const edge=e=>{if(nodes.has(e.desde)&&nodes.has(e.hacia)&&!edges.has(e.uid))edges.set(e.uid,e);};
 for(const n of graph.nodes){
   if(n.tree!==tree||n.depth<0||(n.depth>level&&!added.has(n.uid))||hidden.has(n.uid)||!branch(n))continue;
   if(on.has(n.depth===0?'roots':n.depth===1?'main':'deep'))add(n);
 }
 // Category nodes are registered metadata, not a fabricated hierarchy.
 if(on.has('roots')&&tree==='estatico')for(const n of graph.nodes.filter(n=>n.tipo==='categoria_aristotelica')){
   if(graph.edges.some(e=>e.tipo==='categoria_explicita'&&e.hacia===n.uid&&nodes.has(e.desde)))add(n);
 }
 for(const e of graph.edges)if(e.tipo!=='arista_funcional'||on.has('cross'))edge(e);
 const base=[...nodes.values()];
 function sense(n,s,context=false){const key=uid('sentido',n.uid,s.id);add({uid:key,id:str(s.id),tree:n.tree,tipo:'sentido_registrado',label:str(s.label||s.id),gr:str(s.gr),depth:null,parent:null,context,owner:n.uid,source:s,parrafosDirectos:null});
 edge({uid:uid('sentido-de',key,n.uid),tipo:'sentido_de',desde:key,hacia:n.uid,label:'sentido de',fuente:'estatico.sentidos',ref:str(s.ref),voz:str(s.voz)});return key;}
 if(on.has('senses'))for(const n of base)if(n.tree==='estatico')for(const s of arr(n.source?.sentidos))if(s?.id!=null)sense(n,s);
 if(on.has('refs'))for(const r of graph.remisiones){
  const a=index.get(r.desde),b=index.get(r.hacia);if(!a||!b)continue;
  const here=tree==='funcional'?a:b,other=tree==='funcional'?b:a;
  if(!base.some(n=>n.uid===here.uid))continue;
  add({...other,context:true});let target=b.uid;
  if(r.sentido){const s=arr(b.source?.sentidos).find(s=>str(s.id)===str(r.sentido));if(!s)continue;target=sense(b,s,true);}
  edge({uid:uid('remision',a.uid,target),tipo:'remision_editorial',desde:a.uid,hacia:target,label:'remite a',sentido:r.sentido,fuente:r.fuente});
 }
 // Only actual static tags, never inherited tags assigned to a subunit.
 if(on.has('docs'))for(const [i,t] of graph.asociaciones.entries()){
   if(!base.some(n=>n.uid===t.concepto))continue;
   const isPar=t.tipo==='tag_parrafo', key=isPar?uid('parrafo',t.parrafo):uid('subunidad',t.unidad,t.subunidad);
   const ref=Array.isArray(t.bekker)?t.bekker.join('–'):str(t.bekker||t.source?.ref);
   add({uid:key,id:str(isPar?t.parrafo:t.subunidad),tree,tipo:isPar?'parrafo_documental':'subunidad_documental',label:isPar?`Párrafo ${t.parrafo}`:ref||str(t.subunidad),gr:'',depth:null,parent:null,source:{ref,unidad:t.unidad,parrafo:t.parrafo,subunidad:t.subunidad},parrafosDirectos:null});
   const target=t.concepto;
   edge({uid:uid('tag',key,target,i),tipo:t.tipo,desde:key,hacia:target,label:isPar?'tag de párrafo':'concepto clave',fuente:isPar?'tags.parrafos.conceptos':t.fuente,ref,sentido:t.source?.s,rol:t.source?.n,source:t.source});
 }
 // Existing tagueo uses FAQ.arbol.nodo and tambien[].nodo as functional anchors.
 if(on.has('faqs')&&tree==='funcional')for(const f of arr(faqs)){
  if(f?.id==null)continue;
  for(const [anchor,role] of [[f.arbol,'foco principal'],...arr(f.tambien).map(x=>[x,'también'])]){
   const target=`funcional:${str(anchor?.nodo)}`;if(!base.some(n=>n.uid===target))continue;
   const key=uid('faq',f.id);add({uid:key,id:str(f.id),tree,tipo:'faq_editorial',label:str(f.pregunta||f.id),gr:'',depth:null,parent:null,source:{pregunta:f.pregunta},parrafosDirectos:null});
   edge({uid:uid('faq-foco',key,target,role),tipo:'foco_faq',desde:key,hacia:target,label:role,fuente:role==='también'?'tags.faqs.tambien':'tags.faqs.arbol'});
  }
 }
 return {nodes:[...nodes.values()],edges:[...edges.values()],depth:level};
}
// Compact positions for the visible forest; independent from the permanent catalogue.
export function layeredElements(p){
 const base=p.nodes.filter(n=>n.depth>=0&&n.depth!==null&&!n.context), ids=new Set(base.map(n=>n.uid));
 const kids=new Map(), pos=new Map();let row=0;
 for(const n of base)if(ids.has(n.parent)){if(!kids.has(n.parent))kids.set(n.parent,[]);kids.get(n.parent).push(n.uid);}
 function walk(id,d){const ys=(kids.get(id)||[]).map(c=>walk(c,d+1));const y=ys.length?(ys[0]+ys.at(-1))/2:row++*105;pos.set(id,{x:d*310,y});return y;}
 for(const n of base)if(!ids.has(n.parent)){walk(n.uid,0);row+=.35;}
 const cats=p.nodes.filter(n=>n.tipo==='categoria_aristotelica');cats.forEach((n,i)=>pos.set(n.uid,{x:-310,y:i*105}));
 const maxX=Math.max(0,...[...pos.values()].map(x=>x.x));let i=0;
 for(const n of p.nodes)if(!pos.has(n.uid)){pos.set(n.uid,{x:maxX+310+Math.floor(i/Math.max(6,Math.ceil(row)))*310,y:(i%Math.max(6,Math.ceil(row)))*105});i++;}
 return [...p.nodes.map(n=>({group:'nodes',data:{id:n.uid,label:n.label+(n.gr?'\n'+n.gr:''),tipo:n.tipo,context:n.context?'si':'no',rel:n.source?.rel||''},position:pos.get(n.uid)})),...p.edges.map(e=>({group:'edges',data:{id:e.uid,source:e.desde,target:e.hacia,tipo:e.tipo,label:e.label||e.rel||'jerarquía'}}))];
}
