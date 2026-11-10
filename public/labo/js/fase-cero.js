import {compatibleModelHash} from './compatibilidad.js';
// Secuenciador editorial. Un clic es una decisión, no una prueba de comprensión.
export const ZERO_KEY='eni.labo.fase0.v1';
const str=(v,n=4000)=>typeof v==='string'?v.slice(0,n):'';
const date=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():'';
export const freshZero=m=>({version:1,modelHash:m.contentHash,first:null,current:null,page:'home',topics:Object.fromEntries(m.topics.map(t=>[t.id,{index:0,stage:'explanation',done:false,clarified:[]}])),logs:Object.fromEntries([...m.topics.map(t=>t.id),'closure'].map(id=>[id,[]])),attempts:[],pending:[],relation:null,closeStage:'menu',closed:false});
export const missingZero=(s,t)=>t.requires.filter(id=>!s.topics[id]?.done);
export const allZero=(s,m)=>m.topics.every(t=>s.topics[t.id]?.done);
export function cleanZero(raw,m){
 if(raw?.version!==1||!compatibleModelHash(raw.modelHash,m))throw Error('El registro no corresponde a esta versión de la fase cero.');
 const s=freshZero(m),ids=new Set(m.topics.map(t=>t.id));s.first=ids.has(raw.first)?raw.first:null;s.current=ids.has(raw.current)?raw.current:null;
 for(const t of m.topics){const x=raw.topics?.[t.id];if(!x)continue;const done=x.done===true;s.topics[t.id]={index:done?2:Math.max(0,Math.min(2,Number.isInteger(x.index)?x.index:0)),stage:done?'finished':['explanation','example','debate'].includes(x.stage)?x.stage:'explanation',done,clarified:[...new Set((Array.isArray(x.clarified)?x.clarified:[]).filter(v=>typeof v==='string'&&/^\d:(explanation|example|debate)$/.test(v)))]};}
 for(const t of m.topics)if(s.topics[t.id].done&&missingZero(s,t).length)throw Error('El registro contiene conceptos completados sin sus antecedentes.');
 for(const id of [...ids,'closure'])s.logs[id]=(Array.isArray(raw.logs?.[id])?raw.logs[id]:[]).slice(-120).filter(x=>x&&['bot','user'].includes(x.role)).map(x=>({role:x.role,text:str(x.text),kind:['explanation','example','debate','clarify','choice','relation','final','notice','inquiry'].includes(x.kind)?x.kind:'notice',card:Number.isInteger(x.card)&&x.card>=0&&x.card<3?x.card:null,relation:m.relations.some(r=>r.id===x.relation)?x.relation:null,createdAt:date(x.createdAt)}));
 s.attempts=(Array.isArray(raw.attempts)?raw.attempts:[]).slice(-100).filter(x=>ids.has(x?.topic)).map(x=>({topic:x.topic,missing:(Array.isArray(x.missing)?x.missing:[]).filter(v=>ids.has(v)),text:str(x.text),createdAt:date(x.createdAt)}));
 s.pending=(Array.isArray(raw.pending)?raw.pending:[]).slice(-100).filter(x=>typeof x?.text==='string').map(x=>({text:str(x.text,2000),topic:ids.has(x.topic)?x.topic:null,card:Number.isInteger(x.card)?Math.max(0,Math.min(2,x.card)):null,createdAt:date(x.createdAt)}));
 s.relation=m.relations.some(r=>r.id===raw.relation)?raw.relation:null;s.closeStage=allZero(s,m)&&s.relation&&['relation','final'].includes(raw.closeStage)?raw.closeStage:'menu';s.closed=allZero(s,m)&&raw.closed===true;
 s.page=['home','gate','lesson','closure'].includes(raw.page)?raw.page:'home';
 if(['gate','lesson'].includes(s.page)&&!s.current)s.page='home';
 if(s.page==='lesson'&&(s.topics[s.current].done||missingZero(s,m.topics.find(t=>t.id===s.current)).length))s.page='home';
 if(s.page==='closure'&&!allZero(s,m))s.page='home';return s;
}
export function zeroLabel(s,m){const t=m.topics.find(t=>t.id===s.current),p=s.topics[t?.id];if(!p)return '';return p.stage==='explanation'?'Mostrame el pasaje':p.stage==='example'?'Veamos el problema':p.index<2?'Sigamos con la ficha siguiente':'Terminar este concepto';}
export function transitionZero(state,a,m){
 const s=cleanZero(state,m),t=m.topics.find(t=>t.id===(a.topic||s.current));
 const push=(id,role,text,kind='notice',card=null,relation=null)=>{s.logs[id].push({role,text,kind,card,relation,createdAt:new Date().toISOString()});s.logs[id]=s.logs[id].slice(-120);};
 const invite=()=>{if(!s.logs.closure.length)push('closure','bot','Recorrimos las nueve fichas. Volvamos al concepto que elegiste al comienzo, ahora relacionado con los otros. Podés aceptar mi propuesta o elegir otra relación.');};
 if(a.type==='home'){s.page='home';return s;}
 if(a.type==='closure'){if(allZero(s,m)){s.page='closure';s.closeStage='menu';invite();}return s;}
 if(a.type==='relation'&&allZero(s,m)){const r=m.relations.find(r=>r.id===a.relation);if(!r)return s;s.page='closure';s.relation=r.id;s.closeStage='relation';push('closure','user',`Quiero relacionar ${r.title.toLowerCase()}.`,'choice',null,r.id);push('closure','bot',r.explanation,'relation',null,r.id);return s;}
 if(a.type==='final'&&allZero(s,m)&&s.closeStage==='relation'){s.closeStage='final';push('closure','user','Retomemos la definición de felicidad.','choice',null,s.relation);push('closure','bot',m.final.text,'final',null,s.relation);return s;}
 if(a.type==='finish'&&allZero(s,m)&&s.closeStage==='final'){push('closure','user','Terminemos por ahora.','choice',null,s.relation);push('closure','bot','La fase cero queda recorrida. Volver a una tarjeta abrirá este registro; los conceptos pendientes no se dan por explicados.');s.closed=true;s.page='home';return s;}
 if(!t)return s;const p=s.topics[t.id];
 if(a.type==='select'){
  s.first ||= t.id;s.current=t.id;if(p.done){s.page='home';return s;}
  const missing=missingZero(s,t);if(missing.length){s.page='gate';s.attempts.push({topic:t.id,missing,text:m.dependencyIntro+' '+t.dependencyReason,createdAt:new Date().toISOString()});s.attempts=s.attempts.slice(-100);return s;}
  s.page='lesson';if(!s.logs[t.id].length){push(t.id,'user',`Quiero empezar por ${t.title.toLowerCase()}.`,'choice');push(t.id,'bot',t.cards[p.index].explanation,'explanation',p.index);}return s;
 }
 if(a.type==='inquiry'&&str(a.text,2000).trim()){
  const text=str(a.text,2000).trim();s.pending.push({text,topic:t.id,card:p.index,createdAt:new Date().toISOString()});s.pending=s.pending.slice(-100);push(t.id,'user',text,'inquiry',p.index);push(t.id,'bot','Guardé tu inquietud en este navegador para revisión. No la convierto en una respuesta ni cambia el avance de las fichas.','notice',p.index);return s;
 }
 if(s.page!=='lesson'||missingZero(s,t).length||p.done)return s;
 const c=t.cards[p.index];
 if(a.type==='clarify'){
  const key=`${p.index}:${p.stage}`;if(p.clarified.includes(key))return s;p.clarified.push(key);push(t.id,'user','Necesito una aclaración.','choice',p.index);push(t.id,'bot',p.stage==='debate'?'No hace falta elegir un autor para continuar. Estas son lecturas que debemos contrastar con sus razones y con el texto; cuando los énfasis son compatibles lo señalamos, en vez de inventar una disputa.':c.clarification,'clarify',p.index);return s;
 }
 if(a.type!=='advance')return s;
 push(t.id,'user',zeroLabel(s,m),'choice',p.index);
 if(p.stage==='explanation'){p.stage='example';push(t.id,'bot',c.example,'example',p.index);}
 else if(p.stage==='example'){p.stage='debate';push(t.id,'bot',c.debate.question,'debate',p.index);}
 else if(p.index<2){p.index++;p.stage='explanation';push(t.id,'bot',t.cards[p.index].explanation,'explanation',p.index);}
 else{p.done=true;p.stage='finished';push(t.id,'bot',`Terminamos las tres fichas de ${t.title.toLowerCase()}. La tarjeta queda en gris y abre el registro de este diálogo. Esto no certifica comprensión.`);s.page=allZero(s,m)?'closure':'home';if(s.page==='closure')invite();}
 return s;
}
export const exportZero=(s,m)=>({format:'eni-labo-fase-cero',version:1,exportedAt:new Date().toISOString(),modelHash:m.contentHash,state:cleanZero(s,m)});
export function importZero(x,m){if(x?.format!=='eni-labo-fase-cero'||x.version!==1||!compatibleModelHash(x.modelHash,m))throw Error('No es una exportación compatible de la fase cero.');return cleanZero(x.state,m);}
