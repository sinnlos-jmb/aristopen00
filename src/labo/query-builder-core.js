// Derivado del generador existente: no lee archivos ni accede a la base por su cuenta.
import crypto from 'node:crypto';
const DEFAULT_POLICY = {intents:['explicar','examinar'],inferential:false,defaultPolicy:true,note:'Política conservadora por defecto: revisarla y registrarla en tools/query-builder.editorial.json.'};
export function generarConstructor({editorial,tags,functional,corpus}, warn = () => {}) {
const criteria=new Map(corpus.catalog.criteria.map(x=>[x.id,x]));
const point=(p,c,l)=>Number(p)*100+(c==='b'?50:0)+Number(l);
function range(ref) {
 const m=String(ref||'').replace(/[–—]/g,'-').match(/^(\d{4})([ab])(\d+)(?:\s*-\s*(?:(\d{4})?([ab]))?(\d+))?$/);
 return m ? [point(m[1],m[2],m[3]), point(m[4]||m[1],m[5]||m[2],m[6]||m[3])] : null;
}
const paras=corpus.fragments.filter(x=>x.source==='texto' && x.language==='es').map(x=>({number:x.meta.paragraph,chapter:x.meta.chapter,span:range(x.bekker[0])&&[range(x.bekker[0])[0],range(x.bekker[1])[1]]}));
const overlap=(a,b)=>a&&b&&a[0]<=b[1]&&b[0]<=a[1];
function paragraphsForRef(ref) {
 if(String(ref).startsWith('u:')) {
  const u=tags.unidades.find(u=>u.id===ref.slice(2));
  return u ? [...new Set(u.parrafos||[])] : [];
 }
 const r=range(ref);
 return paras.filter(p=>overlap(r,p.span)).map(p=>p.number);
}
// Solo se resuelven citas explícitas de EN I. Las referencias externas siguen siendo bibliografía.
function edgeParagraphs(ref) {
 let inEN=false; const spans=[]; const chapters=[];
 for(const piece of String(ref||'').split(';')) {
  const t=piece.trim();
  if(/^EN\s/.test(t)) inEN=true;
  else if(/^(?:Phys\.|De An\.|Met\.|EE\b|Pol\.|Top\.)/.test(t)) inEN=false;
  if(!inEN)continue;
  if(/^(?:EN\s+)?I(?:\.|,|\s)/.test(t)) {
   const matches=[...t.matchAll(/\d{4}[ab]\d+(?:[–-](?:(?:\d{4})?[ab])?\d+)?/g)];
   for(const m of matches){const r=range(m[0]);if(r)spans.push(r);}
   if(!matches.length){const m=t.match(/I\.(\d+)(?:[–-](\d+))?/);if(m)for(let n=+m[1];n<=+(m[2]||m[1]);n++)chapters.push(n);}
  }
 }
 return [...new Set(paras.filter(p=>spans.some(s=>overlap(s,p.span))||chapters.includes(p.chapter)).map(p=>p.number))];
}
const intentIds=new Set(editorial.intents.map(x=>x.id));
const unsigned=tags.faqs.filter(f=>!(f.firmas||[]).length);
unsigned.forEach(f=>warn(`FAQ sin firmas en el tagueo, queda fuera del selector: ${f.id}`));
const faqs=tags.faqs.filter(f=>(f.firmas||[]).length).map(f=>{
 const authored=f.firmas;
 const draft=(f.respuesta||[]).map(a=>({text:a.t,ref:a.ref,subunit:a.sub||null,voice:a.voz,role:a.rol,status:a.estado??null,paragraphs:paragraphsForRef(String(a.ref||'').replace(/^EN I\.\d+,\s*/,''))}));
 return {id:f.id,question:f.pregunta,variants:f.variantes||[],sourceStatus:f.estado||null,
  answerStatus:!draft.length?'pendiente_redaccion_y_revision':draft.every(a=>a.status==='borrador')?'borrador':'requiere_revision_de_estado',signatureSource:'tagueo',
  ...(draft.length?{answerDraft:draft}:{}),
  signatures:authored.map((s,i)=>{
   if(!intentIds.has(s.intent))throw Error(`Intención inválida: ${f.id}`);
   for(const a of s.arguments)if(!criteria.has(a))throw Error(`Argumento inexistente: ${f.id}: ${a}`);
   return {...s,id:`${f.id}:${i+1}`,label:s.label||f.pregunta};
  }),
  passages:(f.pasajes||[]).map(p=>({ref:p.ref,role:p.rol,paragraphs:paragraphsForRef(p.ref)})),
  url:`../tagueo/#/faq/${f.id}`};
});
const policies=Object.fromEntries(Object.entries(editorial.relations).filter(([r])=>{
 if(functional.relaciones_arista[r])return true;warn(`Política editorial de una relación que ya no está en el funcional, se ignora: ${r}`);return false;}));
for(const r of Object.keys(functional.relaciones_arista))if(!policies[r]){
 warn(`Relación funcional sin política editorial, recibe la conservadora (explicar, examinar; no inferencial): ${r}`);policies[r]=DEFAULT_POLICY;}
const edges=corpus.catalog.criteria.filter(x=>x.type==='functional_edge'||x.type==='graph_edge').map(x=>({
 id:x.id,type:x.type,from:x.from,to:x.to,relation:x.relation,label:x.label,greek:x.greek,voices:x.voices,voiceStatus:x.voiceStatus,ref:x.ref,
 paragraphs:edgeParagraphs(x.ref),...(x.refCf?{refCf:x.refCf,paragraphsCf:edgeParagraphs(x.refCf)}:{}),source:x.type==='functional_edge'?'functional_edges':'graph_edges',
 fragmentId:x.type==='functional_edge'?`funcional:arista:${x.entityId}`:`grafo:${x.file}:arista:${x.entityId}`,
 ...x.type==='functional_edge'?{relationLabel:functional.relaciones_arista[x.relation]}:{}
}));
// El id de las aristas de grafo se toma del corpus, nunca se adivina.
for(const e of edges)if(e.type==='graph_edge'){
 const c=criteria.get(e.id);const fragment=corpus.fragments.find(x=>x.source==='grafo'&&x.kind==='arista'&&x.meta?.file===c.file&&x.meta?.edge===c.entityId);
 e.fragmentId=fragment?.id||corpus.fragments.find(x=>x.kind==='arista'&&x.criteria.some(y=>y.id===e.id))?.id||null;
}
const model={version:'query-builder-v1',editorialStatus:editorial.status,corpusHash:corpus.contentHash,intents:editorial.intents,
 relations:Object.fromEntries(Object.entries(policies).map(([id,v])=>[id,{label:functional.relaciones_arista[id],...v}])),
 faqs,edges,classifications:editorial.classifications.map(c=>({...c,paragraphs:paragraphsForRef(c.ref)})),examples:editorial.examples,
 policy:{maxObjects:3,automaticAnswers:false,automaticInference:false,unstructuredIsEvidence:false,scopeAndSourcesAreMandatory:true}};
model.contentHash=crypto.createHash('sha256').update(JSON.stringify(model)).digest('hex');

return model;
}
