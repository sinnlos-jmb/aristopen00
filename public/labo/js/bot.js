import {compatibleModelHash} from './compatibilidad.js';
// Motor determinista. Selecciona guiones editoriales; no genera respuestas ni certifica aprendizaje.
import { normalize } from './buscar.js';
export const BOT_KEY='eni.labo.bot.v1';
export const freshState=model=>({version:1,modelHash:model.contentHash,first:null,current:null,page:'home',lessons:{},reviewed:[],returned:[],pending:[],events:[],feedback:{}});
export const canReturn=(s,m)=>m.topics.every(t=>s.reviewed.includes(t.id));
const text=(s,n=2000)=>typeof s==='string'?s.slice(0,n):'';
const date=s=>typeof s==='string'&&Number.isFinite(Date.parse(s))?new Date(s).toISOString():'';
export function cleanState(raw,model){
 if(!raw||raw.version!==1||!compatibleModelHash(raw.modelHash,model))throw new Error('El registro no corresponde a esta versión del recorrido.');
 const s=freshState(model),ids=new Set(model.topics.map(t=>t.id));
 s.first=ids.has(raw.first)?raw.first:null;s.current=ids.has(raw.current)?raw.current:null;
 s.reviewed=[...new Set((Array.isArray(raw.reviewed)?raw.reviewed:[]).filter(x=>ids.has(x)))];
 s.returned=canReturn(s,model)?[...new Set((Array.isArray(raw.returned)?raw.returned:[]).filter(x=>ids.has(x)))]:[];
 for(const t of model.topics){const old=raw.lessons?.[t.id];if(!old)continue;const route=t.routes.some(r=>r.id===old.route)?old.route:null;
  s.lessons[t.id]={route,step:route&&['recommend','reading'].includes(old.step)?old.step:'orientation',explained:old.explained===true};}
 s.page=['home','lesson','return'].includes(raw.page)?raw.page:'home';
 if(!s.current||s.page==='return'&&!canReturn(s,model))s.page='home';
 if(s.page==='lesson'&&!s.lessons[s.current])s.lessons[s.current]={route:null,step:'orientation',explained:false};
 s.pending=(Array.isArray(raw.pending)?raw.pending:[]).slice(-100).filter(x=>typeof x?.text==='string').map(x=>({text:text(x.text),topic:ids.has(x.topic)?x.topic:null,route:text(x.route,50),reason:text(x.reason,100),createdAt:date(x.createdAt)}));
 s.events=(Array.isArray(raw.events)?raw.events:[]).slice(-200).filter(x=>typeof x?.action==='string').map(x=>({action:text(x.action,40),topic:ids.has(x.topic)?x.topic:null,value:text(x.value,100),createdAt:date(x.createdAt)}));
 for(const t of model.topics)for(const r of t.routes){const k=`${t.id}:${r.id}`,v=raw.feedback?.[k];if(v&&['util','parcial','no'].includes(v.rating))s.feedback[k]={rating:v.rating,comment:text(v.comment),createdAt:date(v.createdAt)};}
 return s;
}
export function transition(state,action,model){
 const s=cleanState(state,model),t=model.topics.find(t=>t.id===(action.topic||s.current));
 const event=value=>{s.events.push({action:action.type,topic:t?.id||null,value:text(value,100),createdAt:new Date().toISOString()});s.events=s.events.slice(-200);};
 if(action.type==='home'){s.page='home';return s;}
 if(!t)return s;
 if(action.type==='select'){s.current=t.id;s.first ||= t.id;s.page='lesson';s.lessons[t.id] ||= {route:null,step:'orientation',explained:false};event(t.id);}
 else if(action.type==='restart'){s.lessons[t.id]={route:null,step:'orientation',explained:false};s.page='lesson';s.current=t.id;event('reformular');}
 else if(action.type==='choose'&&t.routes.some(r=>r.id===action.route)){s.lessons[t.id]={route:action.route,step:'recommend',explained:false};event(action.route);}
 else if(action.type==='reading'&&s.lessons[t.id]?.route){s.lessons[t.id].step='reading';s.lessons[t.id].explained=action.explain===true;event(action.explain?'explicación':'lectura directa');}
 else if(action.type==='review'&&s.lessons[t.id]?.step==='reading'){if(!s.reviewed.includes(t.id))s.reviewed.push(t.id);s.page='home';event('revisado por el usuario; no evaluación de dominio');}
 else if(action.type==='return'&&canReturn(s,model)){s.current=t.id;s.page='return';event('nuevas conexiones');}
 else if(action.type==='return-review'&&canReturn(s,model)&&s.page==='return'){if(!s.returned.includes(t.id))s.returned.push(t.id);s.page='home';event('vuelta revisada');}
 else if(action.type==='note'&&text(action.text).trim()){s.pending.push({text:text(action.text).trim(),topic:t.id,route:s.lessons[t.id]?.route||'',reason:text(action.reason||'pregunta nueva',100),createdAt:new Date().toISOString()});s.pending=s.pending.slice(-100);event('inquietud guardada; no incorporada al conocimiento');}
 else if(action.type==='feedback'&&s.lessons[t.id]?.route&&['util','parcial','no'].includes(action.rating)){s.feedback[`${t.id}:${s.lessons[t.id].route}`]={rating:action.rating,comment:text(action.comment),createdAt:new Date().toISOString()};event(action.rating);}
 return s;
}
export function suggestRoutes(value,model){
 const q=normalize(value);if(q.length<4)return [];
 const tokens=new Set(q.split(' ').filter(x=>x.length>=4));
 return model.topics.flatMap(t=>t.routes.map(r=>({topic:t.id,route:r.id,label:`${t.title} · ${r.label}`,score:r.aliases.reduce((n,a)=>n+(q.includes(normalize(a))?3:normalize(a).split(' ').some(x=>tokens.has(x))?1:0),0)}))).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.label.localeCompare(b.label,'es')).slice(0,3);
}
export const exportBot=(state,model)=>({format:'eni-labo-bot',version:1,exportedAt:new Date().toISOString(),model:{version:model.version,hash:model.contentHash,corpusHash:model.corpusHash},state:cleanState(state,model)});
export function importBot(payload,model){if(payload?.format!=='eni-labo-bot'||payload.version!==1||!compatibleModelHash(payload.model?.hash,model))throw new Error('No es una exportación compatible de este bot.');return cleanState(payload.state,model);}
