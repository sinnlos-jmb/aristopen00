// Proyección visual de un catálogo editorial verificado. No cambia la consulta original.
export function expandGraph(base, catalog, roots, depth=2){
  const nodes=new Map(base.nodes.map(n=>[n.id,n]));
  const edges=new Map(base.edges.map(e=>[e.id,e]));
  const allNodes=new Map([...catalog.nodes,...base.nodes].map(n=>[n.id,n]));
  const allEdges=[...new Map([...catalog.edges,...base.edges].map(e=>[e.id,e])).values()]
    .filter(e=>allNodes.has(e.from)&&allNodes.has(e.to));
  const adjacency=new Map();
  for(const e of allEdges){for(const [a,b] of [[e.from,e.to],[e.to,e.from]]){
    if(!adjacency.has(a))adjacency.set(a,[]);adjacency.get(a).push({b,e});
  }}
  for(const root of roots){
    if(!allNodes.has(root))continue;
    const distances=new Map([[root,0]]),queue=[root];
    for(let i=0;i<queue.length;i++){
      const a=queue[i],d=distances.get(a); if(d>=Math.min(2,Math.max(0,depth)))continue;
      for(const {b,e} of adjacency.get(a)||[]){
        if(!distances.has(b)){distances.set(b,d+1);queue.push(b);}
        edges.set(e.id,e);nodes.set(b,allNodes.get(b));
      }
    }
    nodes.set(root,allNodes.get(root));
  }
  return {nodes:[...nodes.values()],edges:[...edges.values()]};
}
// Al colapsar una raíz, las expansiones que dependen de ella desaparecen;
// se conservan las raíces alcanzables desde el resultado y otras ramas abiertas.
export function pruneRoots(base,catalog,roots){
  const valid=new Set(), pending=new Set(roots);
  let changed=true;
  while(changed){changed=false;const reachable=new Set(expandGraph(base,catalog,valid).nodes.map(n=>n.id));
    for(const id of pending){if(reachable.has(id)){valid.add(id);pending.delete(id);changed=true;}}
  }
  return valid;
}
