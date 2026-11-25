// N1-U.19.3.1 — proyección de los catálogos activos; no modifica el tagueo.
// Las aristas jerárquicas van del hijo al padre, como semanticProjection.js.
const text = v => v == null ? '' : String(v);
const arr = v => Array.isArray(v) ? v : [];
const uid = (tree,id) => `${tree}:${id}`;
export function buildTagTrees({estatico, funcional, tags, revision} = {}) {
  if (!Array.isArray(estatico?.raices) || !Array.isArray(funcional?.categorias) || !Array.isArray(funcional?.aristas)) throw Error('Catálogos estático y funcional incompletos.');
  const issues=[], nodes=[], edges=[], index=new Map(), roots={estatico:[],funcional:[]};
  const staticIds=new Set();
  const counts=new Map();
  for(const p of arr(tags?.parrafos)) for(const c of arr(p.conceptos)) if(c?.c != null){const set=counts.get(text(c.c))||new Set();set.add(p.parrafo);counts.set(text(c.c),set);}
  function add(n){if(index.has(n.uid)){issues.push({tipo:'id_duplicado',id:n.uid});return false;} index.set(n.uid,n);nodes.push(n);return true;}
  function edge(tipo,from,to,extra={}){if(!index.has(from)||!index.has(to)){issues.push({tipo:'extremo_no_resuelto',relacion:tipo,desde:from,hacia:to});return;}edges.push({uid:`arista:${edges.length+1}`,tipo,desde:from,hacia:to,...extra});}
  function walk(tree,raw,parent=null,depth=0){if(!raw || raw.id==null || text(raw.id)===''){issues.push({tipo:'id_ausente',tree});return;}
    const id=text(raw.id), key=uid(tree,id), {hijos,...source}=raw;
    const tipo=tree==='funcional'?(depth===0?'categoria_funcional':staticIds.has(id)?'concepto_compartido':'nodo_funcional'):(depth===0?'raiz_estatica':raw.rel==='division'?'division':'concepto_estatico');
    if(!add({uid:key,id,tree,tipo,label:text(raw.label||id),gr:text(raw.gr),depth,parent,source,parrafosDirectos:tree==='estatico'?(counts.get(id)?.size||0):null}))return;
    if(tree==='estatico')staticIds.add(id);
    if(parent)edge('jerarquia',key,parent,{tree,rel:text(raw.rel),voz:text(raw.voz),ref:text(raw.ref),fuente:`${tree}.hijos`});else roots[tree].push(key);
    for(const c of arr(hijos))walk(tree,c,key,depth+1);
  }
  estatico.raices.forEach(n=>walk('estatico',n));funcional.categorias.forEach(n=>walk('funcional',n));
  for(const e of funcional.aristas){edge('arista_funcional',uid('funcional',e.de),uid('funcional',e.a),{tree:'funcional',rel:text(e.rel),label:text(e.label),voz:text(e.voz),ref:text(e.ref),fuente:'funcional.aristas',source:e});}
  // Categorías aristotélicas explícitas: agrupación de metadatos, no un concepto nuevo.
  // No convertir una categoría heredada en una nueva afirmación editorial.
  const categories=new Map();
  for(const n of nodes.filter(n=>n.tree==='estatico')){const c=n.source.categoria;if(!c||(!c.gr&&!c.label))continue;
    const key=JSON.stringify([text(c.gr),text(c.label)]);let cat=categories.get(key);
    if(!cat){cat={uid:`categoria:${encodeURIComponent(key)}`,id:key,tree:'estatico',tipo:'categoria_aristotelica',label:text(c.label||c.gr),gr:text(c.gr),depth:-1,parent:null,source:{gr:c.gr,label:c.label},parrafosDirectos:null};categories.set(key,cat);add(cat);}
    edge('categoria_explicita',n.uid,cat.uid,{tree:'estatico',rel:'categoria_registrada',voz:text(c.voz),ref:text(c.ref),nota:text(c.nota),fuente:'estatico.categoria',source:c});
  }
  const identidades=nodes.filter(n=>n.tree==='funcional'&&staticIds.has(n.id)).map(n=>({id:n.id,estatico:uid('estatico',n.id),funcional:n.uid,fuente:'id compartido'}));
  const remisiones=[];
  for(const n of nodes.filter(n=>n.tree==='funcional'))for(const r of arr(n.source.remite_a)){
    const [id,sense]=text(r).split('#'),st=index.get(uid('estatico',id));
    if(!st||(sense&&!arr(st.source.sentidos).some(s=>text(s.id)===sense))){issues.push({tipo:'remision_no_resuelta',desde:n.uid,referencia:r});continue;}
    remisiones.push({desde:n.uid,hacia:st.uid,sentido:sense||null,fuente:'funcional.remite_a'});
  }
  const asociaciones=[];
  for(const p of arr(tags?.parrafos))for(const c of arr(p.conceptos)){
    if(!staticIds.has(text(c?.c))){issues.push({tipo:'tag_no_resuelto',parrafo:p.parrafo,id:c?.c});continue;}
    asociaciones.push({tipo:'tag_parrafo',parrafo:p.parrafo,concepto:uid('estatico',c.c),source:c});
  }
  for(const u of arr(tags?.unidades))for(const sub of arr(u.subunidades))for(const c of arr(sub.conceptos_clave)){
    if(!staticIds.has(text(c))){issues.push({tipo:'tag_subunidad_no_resuelto',subunidad:sub.id,id:c});continue;}
    asociaciones.push({tipo:'tag_subunidad',unidad:u.id,subunidad:sub.id,bekker:sub.bekker,concepto:uid('estatico',c),fuente:'tags.unidades.subunidades.conceptos_clave'});
  }
  return {schema:'agora.tag-trees.v1',revision:text(revision),nodes,edges,roots,issues,identidades,remisiones,asociaciones,versiones:{estatico:text(estatico.version),funcional:text(funcional.version)}};
}
export function projectTree(graph, tree, {cross=true,categories=true}={}){
  const nodes=graph.nodes.filter(n=>n.tree===tree&&(categories||n.tipo!=='categoria_aristotelica'));
  const ids=new Set(nodes.map(n=>n.uid));
  return {nodes,edges:graph.edges.filter(e=>ids.has(e.desde)&&ids.has(e.hacia)&&(cross||e.tipo!=='arista_funcional'))};
}
// Distribución por árbol: nodos completos, raíces al lado izquierdo y hojas ordenadas.
export function treePositions(graph,tree){const nodes=graph.nodes.filter(n=>n.tree===tree);const kids=new Map();for(const n of nodes){if(n.parent){if(!kids.has(n.parent))kids.set(n.parent,[]);kids.get(n.parent).push(n.uid);}}
  const pos=new Map();let row=0;const walk=(id,depth)=>{const children=kids.get(id)||[];const ys=children.map(c=>walk(c,depth+1));const y=ys.length?(ys[0]+ys.at(-1))/2:row++*92;pos.set(id,{x:depth*290,y});return y;};
  for(const id of graph.roots[tree]){walk(id,0);row++;}
  nodes.filter(n=>n.tipo==='categoria_aristotelica').forEach((n,i)=>pos.set(n.uid,{x:-290,y:i*110}));return pos;
}
export function treeElements(graph,tree,options={}){const p=projectTree(graph,tree,options),pos=treePositions(graph,tree);return [...p.nodes.map(n=>({group:'nodes',data:{id:n.uid,label:n.label+(n.gr?'\n'+n.gr:''),tipo:n.tipo},position:pos.get(n.uid)})),...p.edges.map(e=>({group:'edges',data:{id:e.uid,source:e.desde,target:e.hacia,tipo:e.tipo,label:e.label||e.rel||'jerarquía'}}))];}
