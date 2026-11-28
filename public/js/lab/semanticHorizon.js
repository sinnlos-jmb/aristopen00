// Criterios editoriales de navegación, no afirmaciones sobre el lector ni el ser.
export const ORIENTATIONS = Object.freeze([
 ['libre','Sin preferencia'], ['praxis','Vida práctica'], ['principios','Principios y fines']
]);
export function orderedContinuations(pilot,id,orientation='libre'){
 const ts=(pilot.transiciones||[]).filter(t=>t.de===id);
 if(orientation==='libre')return ts;
 // Priorizar una transición registrada. No excluir otras ni crear aristas.
 return [...ts.filter(t=>t.orientaciones?.includes(orientation)),...ts.filter(t=>!t.orientaciones?.includes(orientation))];
}
export function openHorizons(pilot,id){return (pilot.horizontes_abiertos||[]).filter(h=>h.desde===id&&h.estado==='pendiente');}
export function inspectHorizons(pilot){
 const issues=[], ids=new Set(pilot.nucleos.map(n=>n.id)), valid=new Set(ORIENTATIONS.slice(1).map(([id])=>id));
 for(const r of pilot.recorridos){const h=r.horizonte;if(!h?.presupuesto_posible||!h.suelo_textual||!Array.isArray(h.interrogantes)||!h.interrogantes.length)issues.push({id:r.id,message:'Horizonte incompleto'});}
 for(const t of pilot.transiciones)if(t.orientaciones!==undefined&&(!Array.isArray(t.orientaciones)||t.orientaciones.some(x=>!valid.has(x))))issues.push({id:'transiciones',message:`Orientación desconocida: ${t.de}/${t.a}`});
 const hs=new Set();for(const h of pilot.horizontes_abiertos||[]){if(!h.id||hs.has(h.id)||!ids.has(h.desde)||!h.pregunta||!h.referencias?.length||h.estado!=='pendiente')issues.push({id:h.id,message:'Horizonte abierto inválido'});hs.add(h.id);}
 return issues;
}
