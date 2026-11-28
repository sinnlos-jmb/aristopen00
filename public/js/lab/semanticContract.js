// V1: contrato editorial de solo lectura. No promueve propuestas al catálogo.
const arr = x => Array.isArray(x) ? x : [];
const nonempty = x => typeof x === 'string' && !!x.trim();
const states = new Set(['propuesto','discusion','confirmado']);
const voices = new Set(['textual','nuestra']);
export function inspectSemanticContract(pilot){
 const issues=[], err=(id,message)=>issues.push({id,message});
 const need=(id,obj,keys)=>{for(const k of keys)if(!nonempty(obj?.[k]))err(id,`Campo requerido: ${k}`);};
 const editorial=(id,obj)=>{if(!states.has(obj?.estado))err(id,'Estado editorial inválido');if(!voices.has(obj?.voz))err(id,'Voz inválida');};
 if(pilot?.schema!=='agora.articulaciones.v1')err('catalogo','Versión de contrato desconocida');
 for(const k of ['nucleos','transiciones','recorridos','propuestas_sentidos','notas_hermeneuticas'])if(!Array.isArray(pilot?.[k]))err('catalogo',`Lista requerida: ${k}`);
 const families=new Set(['determinativa','clasificatoria','teleologica','condicional','dinamica','metodologica','contrastiva']);
 const proposals=new Set(), noteIds=new Set(), ids=new Set(arr(pilot?.nucleos).map(n=>n?.id));
 for(const s of arr(pilot?.propuestas_sentidos)){const key=`${s.concepto}#${s.id}`;need(key,s,['concepto','id','label','def','referencia','fuente','alcance']);editorial(key,s);if(s.estado==='confirmado')err(key,'Una propuesta no sustituye el catálogo confirmado');if(proposals.has(key))err(key,'Propuesta repetida');proposals.add(key);}
 for(const h of arr(pilot?.notas_hermeneuticas)){need(h.id,h,['id','concepto','autor','obra','referencia','url','texto']);editorial(h.id,h);if(h.voz!=='nuestra')err(h.id,'La nota hermenéutica no es voz textual de Aristóteles');if(noteIds.has(h.id)||!Array.isArray(h.nucleos)||!h.nucleos.length||h.nucleos.some(id=>!ids.has(id)))err(h.id,'Vínculo hermenéutico inválido');noteIds.add(h.id);}
 for(const n of arr(pilot?.nucleos)){
  need(n.id,n,['id','unidad','formulacion','funcion_argumentativa','limite','pregunta_continuacion']);editorial(n.id,n);
  for(const k of ['evidencias','manifestaciones','relaciones'])if(!Array.isArray(n[k])||!n[k].length)err(n.id,`Lista no vacía requerida: ${k}`);
  for(const e of arr(n.evidencias)){need(n.id,e,['obra','unidad','subunidad','gr_ancla']);if(e.obra!=='EN'||e.libro!==1||!Number.isInteger(e.parrafo_local)||e.parrafo_local<1||e.unidad!==n.unidad)err(n.id,'Identidad documental inválida para el piloto EN I');}
  for(const m of arr(n.manifestaciones)){
   need(n.id,m,['id','concepto','papel_local','determinacion','ancla']);
   if(!/^(estatico|funcional):.+$/.test(m.concepto||''))err(n.id,'Identidad conceptual sin espacio de nombres');
   if(typeof m.expreso!=='boolean'||!Number.isInteger(m.evidencia)||m.evidencia<0||m.evidencia>=arr(n.evidencias).length)err(n.id,'Manifestación sin evidencia válida');
   if(m.sentido!=null&&!nonempty(m.sentido))err(n.id,'Sentido registrado inválido');
   if(m.sentido_candidato!==undefined){if(m.sentido!=null||!proposals.has(`${m.concepto}#${m.sentido_candidato}`)||m.expreso!==false||!nonempty(m.justificacion_implicito))err(n.id,'Sentido candidato sin propuesta o justificación implícita');if(n.estado==='confirmado')err(n.id,'Núcleo confirmado con sentido todavía candidato');}
   if(m.funcion_sintactica!==undefined&&!nonempty(m.funcion_sintactica))err(n.id,'Función sintáctica vacía');
  }
  for(const r of arr(n.relaciones)){need(n.id,r,['de','a','rel','justificacion']);editorial(n.id,r);if(!families.has(pilot.familias_relacion?.[r.rel]))err(n.id,'Relación sin familia editorial: '+r.rel);}
 }
 for(const t of arr(pilot?.transiciones)){need('transiciones',t,['de','a','tipo','pregunta','justificacion']);editorial('transiciones',t);}
 return issues;
}
// Comprobación adicional sobre referencias reales, sin inventar sentidos activos.
export function inspectProposedSenses(pilot,graph){const index=new Map(arr(graph?.nodes).map(n=>[n.uid,n]));return arr(pilot?.propuestas_sentidos).map(s=>({id:`${s.concepto}#${s.id}`,estado:!index.has(s.concepto)?'concepto_ausente':arr(index.get(s.concepto).source?.sentidos).some(x=>x.id===s.id)?'ya_registrado_revisar':'propuesto'}));}
export function notesFor(pilot,id){return arr(pilot.notas_hermeneuticas).filter(n=>arr(n.nucleos).includes(id));}
