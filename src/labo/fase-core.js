import crypto from 'node:crypto';
export function generarFase(e,c){
const ids=new Set(e.topics.map(t=>t.id)),seen=new Set(),active=new Set();
function walk(id){if(active.has(id))throw Error('Dependencias circulares');if(seen.has(id))return;active.add(id);const t=e.topics.find(t=>t.id===id);if(!t)throw Error('Antecedente inexistente');t.requires.forEach(walk);active.delete(id);seen.add(id);}e.topics.forEach(t=>walk(t.id));
const all=[...e.topics.flatMap(t=>t.cards),...e.relations,e.final,{paragraphs:e.dependencyParagraphs}];
for(const n of all){for(const p of n.paragraphs)for(const l of ['es','gr'])if(!c.fragments.some(f=>f.id===`texto:p${p}:${l}`))throw Error('Pasaje ausente');if(n.debate)for(const p of n.debate.positions)if(!e.sources.some(s=>s.id===p.source))throw Error('Fuente ausente');}
if(e.topics.length!==3||e.topics.some(t=>t.cards.length!==3))throw Error('Se requieren tres conceptos de tres fichas');
const m={...e,corpusHash:c.contentHash};m.contentHash=crypto.createHash('sha256').update(JSON.stringify(m)).digest('hex');return m;
}
