// N1-U.19.3.5f: expediente editorial de solo lectura. No cambia ni aprueba tags.
const arr=x=>Array.isArray(x)?x:[];
const GROUPS=Object.freeze(['energeia_acto','energeia_actividad','ergon_obra','ergon_funcion']);
export const REVIEW_CASES=Object.freeze([
 ['n01','1094a3-6','Actividad y obra: superioridad de la obra solo cuando el fin es aparte.'],
 ['n02','1098a7-8','Función humana como actividad según razón; mantener la fórmula condicional.'],
 ['n03','1098a8-12','Excelencia de la misma función en género; no confundir praxis y técnica.'],
 ['n04','1098a16-18','Preservar la definición íntegra, con la cláusula de virtud completa.'],
 ['n04','1098a18-20','Vida entera: condición temporal, no una segunda especie de virtud.'],
 ['n05','1098b31-1099a3','Posesión y ejercicio: una disposición puede permanecer inactiva.'],
 ['n06','1097a34-b6','Elegir virtud por sí misma y por la felicidad; no tratarla como instrumento externo.'],
 ['n07','1103a7-10','Disposiciones elogiables: no anticipar la definición completa del Libro II.'],
 ['n08','1100b7-11','Primacía de las actividades virtuosas; no negar la dependencia de bienes externos.'],
 ['n09','1101a19-21','Bienaventuranza humana y finitud: no deducir una tesis sobre el alma separada.'],
 ['n10','1099b18-20','Aprendizaje y cultivo: mantener abierta la investigación de habituación.'],
 ['n11','1094b11-14','Rigor de argumentos según la naturaleza del asunto; no relativismo.'],
 ['n12','1098a3-5','Poseer razón y obedecerla: no reducir la vida racional a argumentar.'],
 ['n13','1095b4-8','El hecho como principio: no identificarlo con una mera certeza del interlocutor.'],
 ['n14','1102a2-4','Felicidad como principio y causa: no identificar sin examen causas formal y final.'],
 ['n15','1094b10-11','Lo más divino del bien común: no identificar el calificativo con el dios.'],
 ['n16','1102b31-33','Palabra y deseo: la persuasión no garantiza virtud; lenguaje sigue candidato.']
]);
export const TRANSITION_NOTES=Object.freeze({
 'n05/n03':{movimiento:'Retorno a una distinción',nota:'Preguntar qué hace excelente la función, antes de concluir que basta con ejercerla.'},
 'n06/n02':{movimiento:'Retorno a una distinción',nota:'Reexaminar lo propio del ser humano para precisar el fin elegido por sí mismo.'},
 'n11/n13':{movimiento:'Retorno al principio del conocer',nota:'Examinar el punto de partida del razonamiento; no atribuir un presupuesto al lector.'},
 'n13/n14':{movimiento:'Apertura al fin',nota:'Contrastar principio del conocer y principio de la acción; no deducir uno del otro.'},
 'n04/n14':{movimiento:'Apertura al fin',nota:'Examinar en qué sentido el bien humano puede orientar las demás acciones.'},
 'n06/n14':{movimiento:'Apertura al fin',nota:'Desde lo elegido por sí mismo, preguntar cómo el fin puede ser principio.'}
});
// Inventario de relaciones explícitas del funcional; no incluye jerarquías o tags.
export function inventoryFunctional(graph,families={}){
 const byType=new Map();
 for(const edge of arr(graph?.edges)){
  if(edge.tipo!=='arista_funcional')continue;
  const rel=typeof edge.rel==='string'&&edge.rel.trim()?edge.rel:'(sin tipo)';
  if(!byType.has(rel))byType.set(rel,{rel,total:0,textual:0,nuestra:0,otraVoz:0,sinRef:0,coincidencia:Object.hasOwn(families,rel)?families[rel]:null});
  const row=byType.get(rel);row.total++;
  if(edge.voz==='textual')row.textual++;else if(edge.voz==='nuestra')row.nuestra++;else row.otraVoz++;
  if(!String(edge.ref??'').trim())row.sinRef++;
 }
 return [...byType.values()].sort((a,b)=>a.rel.localeCompare(b.rel,'es'));
}
// Identidad propuesta: no pretende resolver offsets ni equivalencias entre ediciones.
export function paragraphKey(e){
 if(e?.obra!=='EN'||!Number.isInteger(e.libro)||e.libro<1||!Number.isInteger(e.parrafo_local)||e.parrafo_local<1)throw Error('Identidad documental incompleta');
 return `${e.obra}:${e.libro}:p${e.parrafo_local}`;
}
export function reviewSnapshot(pilot,check){
 const issues=[];const nodes=new Map(arr(pilot?.nucleos).map(n=>[n.id,n]));
 const active=check?.concepts??new Map();const graph=check?.graph;
 const cases=REVIEW_CASES.map(([id,subunidad,criterio])=>{
  const n=nodes.get(id);const evidence=arr(n?.evidencias).find(e=>e.subunidad===subunidad);
  if(!evidence)issues.push(`Caso sin evidencia: ${id}/${subunidad}`);
  let key=null;if(evidence)try{key=paragraphKey(evidence);}catch{issues.push(`Identidad inválida: ${id}/${subunidad}`);}
  return {id,subunidad,criterio,evidence,key,incidencias:arr(check?.issues).filter(x=>x.id===id).length};
 });
 const changes=GROUPS.map(id=>{
  const p=arr(pilot?.cambios_jerarquia).find(c=>c.id===id);const n=active.get(`estatico:${id}`);
  if(!p||p.actual!=='especie'||p.propuesta!=='agrupacion')issues.push(`Propuesta histórica no localizada: ${id}`);
  const current=n?.source?.rel??null;
  const status=!p||!n?'no_resuelto':n.parent!==p.padre?'padre_distinto':current===p.actual?'base_coincide':current===p.propuesta?'ya_agrupacion_revisar':'clasificacion_distinta';
  return {id,padre:p?.padre,actual:current,propuesta:p?.propuesta,status};
 });
 const candidate=arr(pilot?.propuestas_sentidos).find(s=>s.concepto==='estatico:logos'&&s.id==='lenguaje');
 const language=active.get('estatico:logos');
 if(!candidate||candidate.estado==='confirmado')issues.push('Falta propuesta independiente de logos#lenguaje');
 const languageStatus=!language?'concepto_ausente':arr(language.source?.sentidos).some(s=>s.id==='lenguaje')?'ya_registrado_revisar':'candidato';
 const known=new Set(arr(pilot?.transiciones).map(t=>`${t.de}/${t.a}`));
 for(const key of Object.keys(TRANSITION_NOTES))if(!known.has(key))issues.push(`Nota sin transición: ${key}`);
 return {cases,changes,languageStatus,issues,functional:inventoryFunctional(graph,pilot?.familias_relacion),graphAvailable:Array.isArray(graph?.edges),graphIssues:arr(graph?.issues).length};
}
export function renderEditorialReview(pilot,check,history,esc){
 const r=reviewSnapshot(pilot,check),e=x=>esc(String(x??'—'));
 const row=history.length>1?TRANSITION_NOTES[`${history.at(-2)}/${history.at(-1)}`]:null;
 const caseCount=r.cases.filter(c=>c.evidence&&c.key).length;
 const candidates=arr(pilot.pruebas_tagueo);
 return `<section class="nuc-card"><details><summary>19.3.5f · Consolidación filosófica y editorial (propuesta)</summary>
 <p>Expediente de solo lectura. Ningún cambio se aplica al árbol, MariaDB, traducción ni catálogo de núcleos. Las coincidencias estructurales no constituyen aprobaciones editoriales.</p>
 <h3>Enérgeia y érgon</h3><p>Recomendación: agrupaciones semánticas, sin comprometer una división unívoca en especies. Dýnamis queda pendiente.</p>
 ${r.changes.map(c=>`<p><b>${e(c.id)}</b> · ${e(c.actual)} → ${e(c.propuesta)} · ${e(c.status)}</p>`).join('')}
 <h3>Lógos y palabra</h3><p>Propuesta logos#lenguaje: ${e(r.languageStatus)}. Se conserva razón en EN I.13. Política I.2 es referencia externa.</p>
 <h3>Casos de revisión</h3><p>${caseCount}/${r.cases.length} referencias del expediente localizadas en el catálogo. Incidencias del núcleo se indican por separado; no se certifican offsets ni interpretación.</p>
 ${r.cases.map(c=>`<details><summary>${e(c.id)} · ${e(c.subunidad)} · ${c.incidencias} incidencias del núcleo</summary><p>${e(c.criterio)}</p><p lang="grc">${e(c.evidence?.gr_ancla)}</p><p>Identidad propuesta: ${e(c.key)}</p></details>`).join('')}
 <h3>Dos pruebas de tagueo pendientes</h3>${candidates.map(c=>`<p><b>${e(c.subunidad)}</b> · ${e(c.concepto)} · ${e(c.propuesta)}<br><span lang="grc">${e(c.ancla)}</span></p>`).join('')}
 <h3>Relaciones del funcional</h3><p>${r.graphAvailable?`${r.functional.length} tipos activos; ${r.graphIssues} incidencias del constructor del grafo.`:'Inventario activo no disponible.'} Coincidencia de nombre con una familia contextual no es clasificación confirmada. Sin referencia no equivale automáticamente a error filosófico.</p>
 ${r.functional.map(f=>`<p><b>${e(f.rel)}</b> · ${f.total} aristas · textual ${f.textual} · nuestra ${f.nuestra} · otra voz ${f.otraVoz} · sin referencia ${f.sinRef}${f.coincidencia?' · coincidencia nominal: '+e(f.coincidencia):''}</p>`).join('')}
 <h3>Retorno y apertura</h3>${Object.entries(TRANSITION_NOTES).map(([k,v])=>`<p><b>${e(k)} · ${e(v.movimiento)}</b> — ${e(v.nota)}</p>`).join('')}
 <p>«¿Ser feliz es hacer lo que me gusta?» sigue como ensayo editorial: examinar placer, bien y actividad antes de abrir la pregunta por los fines. Aún falta un núcleo específico del placer; no fingir un recorrido textual completo.</p>
 <h3>Preparación Libro II</h3><p>Propuesta de clave documental: obra/libro/párrafo local; subunidad con unidad y referencia Bekker; versión textual y ancla independientes. No migrar hasta verificar numeración y offsets de ambos libros.</p>
 ${r.issues.length?`<p role="alert">${e(r.issues.join(' · '))}</p>`:'<p>Referencias internas del expediente localizadas. Aprobación editorial pendiente.</p>'}</details>
 ${row?`<p class="nuc-note"><b>${e(row.movimiento)}:</b> ${e(row.nota)} (nota de navegación, no inferencia).</p>`:''}</section>`;
}
