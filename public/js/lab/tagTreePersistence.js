// Versioned view state only. The same bounded validator is used by the API.
export const LAYOUT_SCHEMA='agora.tag-tree-layouts.v1';
export const TREE_KEYS=['estatico','funcional'];
export const LAYOUT_KEY='agora.tag-trees.last.v1';
export const NAMED_KEY='agora.tag-trees.named.v1';
const layerKeys=['roots','main','deep','senses','cross','refs','docs','faqs'];
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=()=>{throw new Error('Disposición JSON inválida o fuera de los límites admitidos.');};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=512&&!['__proto__','constructor','prototype'].includes(v)&&!/[\u0000-\u001f]/.test(v);
const coordinate=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e8;
const point=v=>{if(!object(v)||!coordinate(v.x)||!coordinate(v.y))fail();return {x:v.x,y:v.y};};
export function layoutName(v){if(typeof v!=='string'||!v.trim()||v.trim().length>80||['.','..'].includes(v.trim())||/[\u0000-\u001f\u007f/\\]/.test(v))throw Error('Nombre de disposición inválido (1–80 caracteres).');return v.trim().normalize('NFC');}
export function validateTreeLayout(v){
 if(!object(v)||v.schema!==LAYOUT_SCHEMA||typeof v.revision!=='string'||v.revision.length>128||!object(v.trees))fail();
 const trees={};
 for(const key of TREE_KEYS){const t=v.trees[key];if(!object(t)||!object(t.positions)||!object(t.branches)||!Array.isArray(t.layers)||t.layers.length>8||t.layers.some(k=>!layerKeys.includes(k))||!Number.isInteger(t.depth)||t.depth<0||t.depth>100||!(t.root===''||id(t.root)))fail();
  const entries=Object.entries(t.positions),branches=Object.entries(t.branches);if(entries.length>10000||branches.length>10000||entries.some(([k])=>!id(k))||branches.some(([k,s])=>!id(k)||!['open','closed'].includes(s)))fail();
  let camera=null;if(t.camera!==null){if(!object(t.camera)||typeof t.camera.zoom!=='number'||!Number.isFinite(t.camera.zoom)||t.camera.zoom<.015||t.camera.zoom>3)fail();camera={zoom:t.camera.zoom,pan:point(t.camera.pan)};}
  trees[key]={positions:Object.fromEntries(entries.map(([k,p])=>[k,point(p)])),camera,layers:[...new Set(t.layers)],depth:t.depth,root:t.root,span:'all',branches:Object.fromEntries(branches),labels:t.labels===true};
 }
 if(v.activeTree!==undefined&&!TREE_KEYS.includes(v.activeTree))fail();
 const result={schema:LAYOUT_SCHEMA,revision:v.revision,activeTree:v.activeTree||'estatico',trees};
 if(new TextEncoder().encode(JSON.stringify(result)).length>2_000_000)fail();return result;
}
// Keep matching IDs across revisions; never move a retained position. Unknown IDs
// are reported and discarded in the working copy, not written to the corpus.
export function restoreTreeLayout(raw,graph,available){const v=validateTreeLayout(raw),prefs={},layouts={};let omitted=0;
 for(const key of TREE_KEYS){const t=v.trees[key],nodes=new Map(graph.nodes.filter(n=>n.tree===key&&n.depth>=0&&n.depth!==null).map(n=>[n.uid,n]));const valid=available[key];
  const positions=new Map(Object.entries(t.positions).filter(([k])=>{if(valid.has(k))return true;omitted++;return false;}));
  const branches=new Map(Object.entries(t.branches).filter(([k])=>{if(nodes.has(k)&&[...nodes.values()].some(n=>n.parent===k))return true;omitted++;return false;}));
  const root=graph.roots[key].includes(t.root)?t.root:'';if(t.root&&!root)omitted++;
  prefs[key]={layers:new Set(t.layers),depth:Math.min(t.depth,Math.max(0,...[...nodes.values()].map(n=>n.depth))),root,branches,labels:t.labels};layouts[key]={positions,camera:t.camera};
 }
 return {tree:v.activeTree,prefs,layouts,omitted,changedRevision:v.revision!==graph.revision};
}
export function readLastLayout(storage){const raw=storage?.getItem(LAYOUT_KEY);return raw?validateTreeLayout(JSON.parse(raw)):null;}
export function writeLastLayout(storage,v){if(!storage)throw Error('Almacenamiento local no disponible.');storage.setItem(LAYOUT_KEY,JSON.stringify(validateTreeLayout(v)));}
export function readNamedLayouts(storage){const raw=storage?.getItem(NAMED_KEY);if(!raw)return [];const rows=JSON.parse(raw);if(!Array.isArray(rows)||rows.length>20)fail();return rows.map(r=>({name:layoutName(r.name),layout:validateTreeLayout(r.layout)}));}
export function saveNamedLayout(storage,name,v){if(!storage)throw Error('Almacenamiento local no disponible.');name=layoutName(name);const rows=readNamedLayouts(storage).filter(r=>r.name!==name);if(rows.length>=20)throw Error('Máximo 20 disposiciones locales.');rows.push({name,layout:validateTreeLayout(v)});storage.setItem(NAMED_KEY,JSON.stringify(rows));return rows;}
