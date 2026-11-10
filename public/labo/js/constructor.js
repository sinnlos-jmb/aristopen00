// Representación explícita de la pregunta. No interpreta lenguaje libre ni genera tesis.
import { normalize, sourceGroup, matchCriterion, groupParagraphs, snippet } from './buscar.js';
export const OPERATIONS={abierta:'Revisar una afirmación / relación',identidad:'¿X es lo mismo que Y?',condicion:'¿X es condición de Y?',suficiencia:'¿X basta para Y?',existencia:'¿Hay / existe X?'};
export const emptyBuilder=()=>({version:1,intent:'',slots:[null,null,null],depth:'normal',operation:'abierta',signatureId:null});
export function cleanBuilder(raw,corpus,model){
 const b=emptyBuilder();if(!raw||typeof raw!=='object'||(raw.version!=null&&raw.version!==1))return b;
 b.intent=model.intents.some(x=>x.id===raw.intent)?raw.intent:'';
 b.slots=Array.from({length:3},(_,i)=>typeof raw.slots?.[i]==='string'&&corpus.criterionById.has(raw.slots[i])?raw.slots[i]:null);
 b.depth=['breve','normal','ampliada'].includes(raw.depth)?raw.depth:'normal';
 b.operation=OPERATIONS[raw.operation]?raw.operation:'abierta';
 b.signatureId=model.faqs.some(f=>f.signatures.some(s=>s.id===raw.signatureId))?raw.signatureId:null;
 return b;
}
export const isEdge=x=>x?.type==='functional_edge'||x?.type==='graph_edge';
const objectTypes=new Set(['functional_category','functional_node','static_concept','static_sense']);
export function equivalent(a,b,corpus){
 if(a===b)return true;const x=corpus.criterionById.get(a),y=corpus.criterionById.get(b);
 return Boolean(x&&y&&objectTypes.has(x.type)&&objectTypes.has(y.type)&&x.type!=='static_sense'&&y.type!=='static_sense'&&x.entityId===y.entityId);
}
export function functionalIds(id,corpus){
 const x=corpus.criterionById.get(id);if(!x)return [];
 if(x.type==='functional_node'||x.type==='functional_category')return [x.entityId];
 return [...new Set([...(corpus.criterionById.has(`func:${x.entityId}`)?[x.entityId]:[]),...(x.anchors||[]).map(a=>a.id.replace(/^func:/,''))])];
}
export function validation(b,corpus,model){
 const intent=model.intents.find(x=>x.id===b.intent),objects=b.slots.filter(Boolean),errors=[];
 if(!b.slots[0])errors.push('Elegí el objeto principal. Podés empezar por cualquier campo.');
 if(!intent)errors.push('Elegí qué querés averiguar sobre el objeto.');
 if(intent){
  if(objects.length<intent.minObjects)errors.push(`Esta pregunta necesita al menos ${intent.minObjects} objetos.`);
  if(objects.length>intent.maxObjects)errors.push(`Esta pregunta admite ${intent.maxObjects} objeto${intent.maxObjects===1?'':'s'}. Se conservan tus selecciones: quitá los complementos o cambiá la intención.`);
  for(const id of objects){const x=corpus.criterionById.get(id);if(!x||!intent.types.includes(x.type))errors.push('El tipo de objeto no es compatible: para desarrollar una arista elegí «Explicar» o «Examinar».');}
  if(b.intent==='examinar'&&['identidad','condicion','suficiencia'].includes(b.operation)&&objects.length<2&&!isEdge(corpus.criterionById.get(objects[0])))errors.push('Esta afirmación necesita dos términos o una arista completa.');
  if(b.intent==='enumerar'&&!model.classifications.some(c=>c.objects.some(id=>equivalent(id,b.slots[0],corpus))))errors.push('Todavía no hay una clasificación explícita codificada para este objeto. Podés explorar el tema; no se contará automáticamente el árbol.');
 }
 if(b.slots[2]&&!b.slots[1])errors.push('Completá el primer complemento antes del segundo. Tu selección se conserva.');
 for(let i=0;i<objects.length;i++)if(objects.slice(0,i).some(x=>equivalent(x,objects[i],corpus)))errors.push('Hay dos posiciones que designan el mismo objeto. Quitá una o elegí un sentido diferente.');
 return {complete:!errors.length,errors:[...new Set(errors)],intent};
}
function sameArguments(wanted,actual,intent,corpus){
 if(wanted.length!==actual.length)return false;
 if(['relacionar','distinguir'].includes(intent)){
  const remaining=actual.slice();for(const id of wanted){const i=remaining.findIndex(a=>equivalent(a,id,corpus));if(i<0)return false;remaining.splice(i,1);}return true;
 }
 return wanted.every((a,i)=>equivalent(a,actual[i],corpus));
}
export function faqMatches(b,corpus,model){
 const args=b.slots.filter(Boolean);
 return model.faqs.map(f=>{
  const exact=f.signatures.filter(s=>s.intent===b.intent&&sameArguments(s.arguments,args,b.intent,corpus)&&(!s.context||s.id===b.signatureId)&&(!s.operation||s.operation===b.operation));
  const topic=f.signatures.some(s=>s.arguments.some(a=>args.some(x=>equivalent(x,a,corpus))));
  return exact.length?{faq:f,kind:'exacta',signatures:exact}:topic?{faq:f,kind:'temática',signatures:[]}:null;
 }).filter(Boolean).sort((a,b)=>(a.kind==='exacta'?-1:0)-(b.kind==='exacta'?-1:0)||a.faq.question.localeCompare(b.faq.question,'es'));
}
export function edgeMatches(b,corpus,model){
 const args=b.slots.filter(Boolean),first=corpus.criterionById.get(args[0]);
 if(isEdge(first))return model.edges.filter(e=>e.id===first.id).map(edge=>({edge,exactObject:true,covered:args.slice(0,1)}));
 const nucleus=new Set(functionalIds(args[0],corpus));
 return model.edges.flatMap(e=>{
  if(e.type!=='functional_edge')return [];
  const connected=nucleus.has(e.from)||nucleus.has(e.to);if(!connected)return [];
  const complements=args.slice(1).filter(a=>{
   const ids=new Set(functionalIds(a,corpus));
   return (nucleus.has(e.from)&&ids.has(e.to))||(nucleus.has(e.to)&&ids.has(e.from));
  });
  if(args.length>1&&!complements.length)return [];
  const covered=args.length>1?[args[0],...complements]:args.slice(0,1);
  const allowed=['explorar','explicar','relacionar','localizar'].includes(b.intent)||model.relations[e.relation]?.intents.includes(b.intent);
  return allowed?[{edge:e,exactObject:false,covered}]:[];
 });
}
export function questionText(b,corpus,model){
 const selected=model.faqs.flatMap(f=>f.signatures).find(s=>s.id===b.signatureId);
 if(selected&&selected.intent===b.intent&&sameArguments(selected.arguments,b.slots.filter(Boolean),b.intent,corpus)&&(!selected.operation||selected.operation===b.operation))return selected.label;
 const label=i=>corpus.criterionById.get(b.slots[i])?.label||'…',intent=model.intents.find(x=>x.id===b.intent);
 if(!intent)return b.slots[0]?`¿Qué querés averiguar sobre ${label(0)}?`:'Elegí un tema o una intención para empezar.';
 if(b.intent==='relacionar')return `Relacionar ${label(0)} con ${label(1)}${b.slots[2]?` y ${label(2)}`:''}.`;
 if(b.intent==='distinguir')return `Distinguir ${b.slots.filter(Boolean).map((_,i)=>label(i)).join(' de ')}.`;
 if(b.intent==='examinar'&&isEdge(corpus.criterionById.get(b.slots[0]))&&b.operation!=='abierta'){
  const treatment={identidad:'si afirma una identidad',condicion:'si afirma una condición',suficiencia:'si afirma una condición suficiente',existencia:'si está documentada esta conexión'}[b.operation];
  return `Examinar ${treatment}: ${label(0)}.`;
 }
 if(b.intent==='examinar'&&!isEdge(corpus.criterionById.get(b.slots[0]))){
  if(b.operation==='existencia')return `¿Hay / existe ${label(0)}?`;
  if(b.operation==='identidad')return `¿${label(0)} es lo mismo que ${label(1)}?`;
  if(b.operation==='condicion')return `¿${label(0)} es condición de ${label(1)}?`;
  if(b.operation==='suficiencia')return `¿${label(0)} basta para ${label(1)}?`;
 }
 return `${intent.verb} ${label(0)}${b.slots[1]?` en relación con ${label(1)}`:''}${b.slots[2]?` y ${label(2)}`:''}.`;
}
export function recommendIntents(b,corpus,model){
 const scores=new Map(),ids=b.slots.filter(Boolean);
 for(const f of model.faqs)for(const s of f.signatures)if(s.arguments.some(a=>ids.some(x=>equivalent(a,x,corpus))))scores.set(s.intent,(scores.get(s.intent)||0)+2);
 const edge=model.edges.find(e=>e.id===b.slots[0]);if(edge)for(const i of model.relations[edge.relation]?.intents||[])scores.set(i,(scores.get(i)||0)+4);
 return scores;
}
export function affinity(x,b,corpus,model){
 const selected=b.slots.filter(Boolean).map(id=>corpus.criterionById.get(id)).filter(Boolean);
 if(selected.some(y=>x.type==='static_sense'&&(x.conceptId===y.entityId||x.anchors?.some(a=>functionalIds(y.id,corpus).includes(a.id.replace(/^func:/,''))))))return {score:100,reason:'Sentido vinculado al tema'};
 if(selected.some(y=>equivalent(y.id,x.id,corpus)))return {score:90,reason:'Mismo concepto en otro árbol'};
 const current=new Set(selected.flatMap(y=>isEdge(y)?[y.from,y.to]:functionalIds(y.id,corpus))),target=new Set(isEdge(x)?[x.from,x.to]:functionalIds(x.id,corpus));
 if([...target].some(t=>current.has(t)))return {score:75,reason:'Ancla o extremo compartido'};
 if(model.edges.some(e=>e.type==='functional_edge'&&((current.has(e.from)&&target.has(e.to))||(current.has(e.to)&&target.has(e.from)))))return {score:55,reason:'Vecino en la red funcional'};
 if(model.faqs.some(f=>f.signatures.some(s=>s.arguments.some(a=>selected.some(y=>equivalent(a,y.id,corpus)))&&s.arguments.some(a=>equivalent(a,x.id,corpus)))))return {score:40,reason:'Comparte una firma de FAQ'};
 return {score:0,reason:'Otras opciones · sin afinidad codificada'};
}
export function searchBuilder(corpus,model,b,options={}){
 const valid=validation(b,corpus,model);if(!valid.complete)return {results:[],plan:{valid,faqs:[],edges:[]}};
 const faqs=faqMatches(b,corpus,model),edges=edgeMatches(b,corpus,model),selected=b.slots.filter(Boolean);
 const sources=new Set(options.sources?.length?options.sources:['paragraphs']),scope=options.scope==='all'?'all':'en1';
 const primaryRoutes=new Map();
 const route=(p,rank,reason)=>{const old=primaryRoutes.get(p);if(!old||rank>old.rank)primaryRoutes.set(p,{rank,reason});};
 for(const f of faqs.filter(x=>x.kind==='exacta'))for(const p of f.faq.passages)for(const n of p.paragraphs)route(n,p.role==='responde'?5:p.role==='matiza'?4:1,`FAQ coincidente · ${p.role} · ${p.ref}. El vínculo orienta la recuperación, no sustituye el pasaje.`);
 for(const {edge} of edges)for(const n of edge.paragraphs)route(n,3,`Referencia de la arista ${edge.label} · ${edge.relationLabel||edge.relation}. No implica equivalencia ni inferencia automática.`);
 if(b.intent==='enumerar')for(const c of model.classifications.filter(c=>c.objects.some(id=>equivalent(id,b.slots[0],corpus)))){
  // Esta clasificación lleva una referencia explícita, no se cuenta el catálogo.
  for(const n of c.paragraphs)route(n,5,`Clasificación explícita: ${c.label} · ${c.ref}; no es un recuento de nodos.`);
 }
 const edgeByFragment=new Map(edges.map(x=>[x.edge.fragmentId,x]));const raw=[];
 for(const item of corpus.fragments){
  if(!item.scopes.includes(scope)||!sources.has(sourceGroup(item)))continue;
  const matches=selected.map(id=>matchCriterion(corpus,item,id)).filter(Boolean);
  const passage=item.source==='texto'?primaryRoutes.get(item.meta.paragraph):null,edgeHit=edgeByFragment.get(item.id);
  const full=matches.length===selected.length;let rank=passage?.rank||0;
  if(edgeHit)rank=Math.max(rank,edgeHit.exactObject?5:4);else if(matches.length)rank=Math.max(rank,full?2:1);
  let lexical=false;
  if(!rank){const labels=selected.map(id=>corpus.criterionById.get(id)).filter(x=>x&&x.type!=='static_sense').map(x=>normalize(x.label));lexical=labels.some(l=>l.length>=4&&item.normalized.includes(l));if(!lexical)continue;}
  const score=rank*2000+matches.length*200+matches.reduce((n,m)=>n+m.score,0);
  const reasons=[...(passage?[passage.reason]:[]),...(edgeHit?[`Arista ${edgeHit.exactObject?'seleccionada':'candidata'} · se conserva su dirección: ${edgeHit.edge.label}.`]:[]),...matches.map(m=>m.reason),...(lexical?['Coincidencia léxica contextual; no se comprobó el enlace solicitado.']:[])];
  if(!passage&&!edgeHit&&matches.length)reasons.unshift(full?'Coinciden los objetos, pero no se verificó la afirmación solicitada.':'Coincidencia parcial de objetos; no responde por sí sola toda la pregunta.');
  raw.push({item,rank,score,reasons,matches,crossing:matches.length,snippet:snippet(item.text,'',b.depth==='breve'?220:b.depth==='ampliada'?740:340)});
 }
 const results=groupParagraphs(raw,corpus,'').sort((a,b)=>b.crossing-a.crossing||b.rank-a.rank||b.score-a.score||a.item.title.localeCompare(b.item.title,'es')).slice(0,Math.max(5,Math.min(50,Number(options.limit)||20)));
 const plan={valid,faqs,edges,referenceOnly:edges.filter(x=>!x.edge.paragraphs.length),excludedEdgeSources:[...new Set(edges.filter(x=>!sources.has(x.edge.source)).map(x=>x.edge.source))]};
 return {results,plan};
}
