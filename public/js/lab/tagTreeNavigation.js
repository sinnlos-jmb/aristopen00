// View-only state; no catalogue mutations or inferred edges.
export const TREE_WHEEL_SENSITIVITY = 1.8;
export function hierarchyIndex(graph,tree){
 const nodes=new Map(graph.nodes.filter(n=>n.tree===tree&&n.depth>=0).map(n=>[n.uid,n]));
 const children=new Map();for(const n of nodes.values())if(nodes.has(n.parent)){const list=children.get(n.parent)||[];list.push(n.uid);children.set(n.parent,list);}
 return {nodes,children};
}
export function branchDescendants(index,id,depth=2){
 const seen=new Set([id]),out=[],queue=[[id,0]];
 while(queue.length){const [parent,d]=queue.shift();if(d>=depth)continue;for(const child of index.children.get(parent)||[])if(!seen.has(child)){seen.add(child);out.push(child);queue.push([child,d+1]);}}
 return out;
}
export function toggleTreeBranch(index,prefs,id,visible){
 if(!index.children.get(id)?.length)return false;
 const descendants=branchDescendants(index,id,Infinity);
 // The first gesture collapses a partly or fully visible branch. Afterwards
 // its explicit state wins, even if filters hide some of the descendants.
 const mode=prefs.branches.get(id);
 const open=mode==='open'||(mode!=='closed'&&descendants.some(n=>visible.has(n)));
 for(const child of descendants)prefs.branches.delete(child);
 prefs.branches.set(id,open?'closed':'open');
 if(!open&&descendants.some(n=>index.nodes.get(n).depth>=2))prefs.layers.add('deep');
 if(!open&&descendants.some(n=>index.nodes.get(n).depth===1))prefs.layers.add('main');
 return true;
}
export function branchVisibility(graph,tree,branches){
 const index=hierarchyIndex(graph,tree),added=new Set(),hidden=new Set();
 for(const [id,mode] of branches||[]){if(!index.nodes.has(id))continue;for(const n of branchDescendants(index,id,Infinity))(mode==='closed'?hidden:added).add(n);}
 return {added,hidden};
}
export const newTreeLayout=()=>({positions:new Map(),camera:null});
const finite=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
export function captureTreeLayout(layout,cy){
 if(!cy)return;cy.nodes().forEach(n=>{const p=n.position();if(finite(p))layout.positions.set(n.id(),{x:p.x,y:p.y});});
 const pan=cy.pan(),zoom=cy.zoom();if(finite(pan)&&Number.isFinite(zoom)&&zoom>0)layout.camera={pan:{x:pan.x,y:pan.y},zoom};
}
// Existing positions win; new nodes avoid overlapping known positions.
export function positionTreeElements(elements,layout){
 const occupied=[...layout.positions.values()];return elements.map(e=>{
  if(e.group!=='nodes')return e;const id=e.data.id;let p=layout.positions.get(id);
  if(!finite(p)){p={...e.position};while(occupied.some(q=>Math.abs(q.x-p.x)<245&&Math.abs(q.y-p.y)<80))p.y+=105;layout.positions.set(id,p);occupied.push(p);}
  return {...e,position:{...p}};
 });
}
export function exportTreeLayouts(revision,layouts,prefs){
 return {schema:'agora.tag-tree-layouts.v1',revision,trees:Object.fromEntries(Object.entries(layouts).map(([tree,l])=>[tree,{positions:Object.fromEntries(l.positions),camera:l.camera,layers:[...prefs[tree].layers],depth:prefs[tree].depth,root:prefs[tree].root,span:'all',branches:Object.fromEntries(prefs[tree].branches)}]))};
}
// Incremental update: never rerun layout or change the camera on filter/branch changes.
export function syncTreeElements(cy,elements){
 const ids=new Set(elements.map(e=>e.data.id));cy.batch(()=>{
  cy.edges().filter(e=>!ids.has(e.id())).forEach(e=>e.remove());cy.nodes().filter(n=>!ids.has(n.id())).forEach(n=>n.remove());
  const missing=elements.filter(e=>!cy.getElementById(e.data.id).length);cy.add(missing);
  for(const e of elements){const item=cy.getElementById(e.data.id);if(item.length){const {id,source,target,...data}=e.data;item.data(data);}}
 });
}
