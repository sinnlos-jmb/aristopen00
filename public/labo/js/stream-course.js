// Interfaz textual local. El motor pedagógico y el guion no se modifican.
import {compatibleModelHash} from './compatibilidad.js';
import {freshZero,cleanZero,transitionZero,missingZero,allZero} from './fase-cero.js';
import {STREAM_FORMAT} from './stream-state.js';
import {KEYWORD_HELP,queryReply,iaReply,mapReply} from './bot-commands.js';
export const PHASES=[{id:'etapa-1',title:'felicidad - naturaleza - filosofía práctica',ready:true},{id:'etapa-2',title:'capacidad (dunamis) - actividad (energeia) - estado ético',ready:false},{id:'etapa-3',title:'alma - hexis - arete',ready:false}];
const TOPICS=['felicidad','naturaleza','filosofia-practica'];
const KINDS=['notice','explanation','example','debate','clarify','choice','relation','final','inquiry','menu','review','card','help','map','query','ia'];
const short=(v,n=16000)=>typeof v==='string'?v.slice(0,n):'';
const title=(m,id)=>m.topics.find(t=>t.id===id)?.title||'';
function add(s,role,text,kind='notice',extra={}){s.ui.events.push({id:s.ui.next++,role,text,kind,createdAt:new Date().toISOString(),...extra});s.ui.events=s.ui.events.slice(-400);}
export function contextLabel(s,m){return s.ui.level==='initial'?'Inicio · etapas':s.ui.level==='stage'?'Etapa 1 · conceptos':`Etapa 1 · ${title(m,s.ui.topic)}`;}
export function menuOptions(s,m){
 const o=[],push=(type,label,extra={})=>o.push({number:o.length+1,type,label,enabled:true,...extra});
 if(s.ui.menu==='reset-confirm'){push('reset','Confirmar: borrar solo este bot y empezar de cero');push('cancel','Cancelar el borrado');return o;}
 if(s.ui.menu==='import-confirm'){push('import-confirm','Confirmar: reemplazar el historial de este bot');push('cancel','Cancelar la importación');return o;}
 if(s.ui.menu==='history'){push('export','Exportar historial');push('import','Importar historial');push('reset-ask','Borrar historial y empezar de cero');push('cancel','Volver al menú del contexto actual');return o;}
 if(s.ui.inputMode!=='command')return o;
 if(s.ui.screen==='closure'){m.relations.forEach(r=>push('relation',r.title,{id:r.id}));push('graph',s.ui.graph?'Ocultar grafo de cierre':'Ver grafo de cierre fuera del panel');}
 else if(s.ui.screen==='relation'){push('final','Retomar la definición de felicidad');push('closure','Elegir otra relación');}
 else if(s.ui.screen==='final'){push('finish','Terminar por ahora');push('closure','Elegir otra relación');}
 else if(s.ui.level==='initial')PHASES.forEach((p,i)=>push('phase',`ver etapa ${i+1} (${p.title})`,{id:p.id,enabled:p.ready}));
 else if(s.ui.level==='stage')TOPICS.forEach((id,i)=>{const t=m.topics.find(t=>t.id===id),missing=missingZero(s.core,t);push('topic',`ver concepto ${i+1} (${t.title.toLowerCase()})`,{id,enabled:!missing.length,note:missing.length?`antes: ${missing.map(x=>title(m,x)).join(' y ')}`:''});});
 else{const p=s.core.topics[s.ui.topic],t=m.topics.find(t=>t.id===s.ui.topic);t.cards.forEach((card,i)=>push('card',`ver ficha ${i+1}`,{id:i,enabled:!missingZero(s.core,t).length&&(p.done||i<=p.index)}));}
 if(s.ui.level!=='initial')push('stages','Volver al menú inicial / de etapas');
 if(s.ui.level==='concept'){
  push('concepts','Volver al menú de conceptos de la etapa activa');
  const p=s.core.topics[s.ui.topic],shown=s.ui.screen==='review'?s.ui.review:p.index;
  if(['lesson','review'].includes(s.ui.screen)&&shown<2)push('next','Pasar a la siguiente ficha');
  if(s.ui.screen==='lesson'&&p.index===2&&!p.done)push('complete','Completar este concepto');
  if(s.ui.screen==='lesson')push('clarify','Pedir una aclaración de esta ficha',{enabled:!p.clarified.includes(`${p.index}:${p.stage}`)});
  push('inquiry','Dejar una inquietud, sin avanzar');
 }
 if(s.ui.level==='stage'&&s.ui.screen==='menu'&&allZero(s.core,m))push('closure','Relacionar los tres conceptos');
 push('history','Historial de este bot');return o;
}
export function menuText(s,m){
 if(s.ui.inputMode==='ia')return 'Modo I.A.: escribí tu pregunta libre. OpenRouter no está conectado. menu vuelve a las opciones; I.A.? explica este modo.';
 if(s.ui.inputMode==='query')return 'Modo query: escribí relación entre A y B; agrupá con paréntesis. query? muestra ejemplos; menu vuelve a las opciones.';
 if(s.ui.inputMode==='inquiry')return 'Escribí tu inquietud. Se guarda localmente, sin respuesta ni avance. menu cancela esta entrada.';
 return menuOptions(s,m).map(o=>`${o.number}. ${o.label}${o.enabled?'':` — no disponible todavía${o.note?' ('+o.note+')':''}`}`).join('\n');
}
const baseUi=()=>({version:2,level:'initial',topic:null,screen:'menu',review:null,menu:'main',inputMode:'command',graph:false,next:1,events:[]});
export function freshCourse(m){const s={core:freshZero(m),ui:baseUi()};add(s,'bot','Un solo panel, solo texto. Escribí menu para ver las opciones numéricas de tu ubicación o ? para conocer las palabras clave. Las opciones grises todavía no están disponibles. No hay IA generativa conectada.');return s;}
function migrate(core,m){const s={core,ui:baseUi()},events=[];let order=0;for(const [topic,entries]of Object.entries(core.logs))for(const e of entries)events.push({...e,topic,order:order++});for(const a of core.attempts)events.push({role:'bot',text:a.text,kind:'notice',topic:a.topic,createdAt:a.createdAt,order:order++});events.sort((a,b)=>(Date.parse(a.createdAt)||0)-(Date.parse(b.createdAt)||0)||a.order-b.order).forEach(({order,...e})=>add(s,e.role,e.text,e.kind,e));if(!events.length)add(s,'bot',KEYWORD_HELP['?'],'help');return s;}
export function cleanCourse(raw,m){
 const core=cleanZero(raw,m);if(!raw.streamUi)return migrate(core,m);const u=raw.streamUi,s={core,ui:{...baseUi(),level:['initial','stage','concept'].includes(u.level)?u.level:'initial',topic:TOPICS.includes(u.topic)?u.topic:null,screen:['menu','lesson','review','closure','relation','final'].includes(u.screen)?u.screen:'menu',review:Number.isInteger(u.review)?u.review:null,menu:['main','history','reset-confirm'].includes(u.menu)?u.menu:'main',inputMode:['command','ia','query','inquiry'].includes(u.inputMode)?u.inputMode:'command',graph:u.graph===true&&allZero(core,m)}};
 if(s.ui.level!=='concept')s.ui.topic=null;
 if(s.ui.level==='concept'&&(!s.ui.topic||missingZero(core,m.topics.find(t=>t.id===s.ui.topic)).length)){s.ui.level='stage';s.ui.topic=null;s.ui.screen='menu';}
 if(s.ui.screen==='lesson'&&(s.ui.level!=='concept'||core.page!=='lesson'||core.current!==s.ui.topic))s.ui.screen='menu';
 if(s.ui.screen==='review'&&(!s.ui.topic||!Number.isInteger(s.ui.review)||s.ui.review<0||s.ui.review>2||(!core.topics[s.ui.topic].done&&s.ui.review>=core.topics[s.ui.topic].index)))s.ui.screen='menu';
 if(['closure','relation','final'].includes(s.ui.screen)&&!allZero(core,m))s.ui.screen='menu';
 if(s.ui.screen==='relation'&&core.closeStage!=='relation'||s.ui.screen==='final'&&core.closeStage!=='final')s.ui.screen='closure';
 if(s.ui.inputMode==='inquiry'&&!s.ui.topic)s.ui.inputMode='command';
 for(const e of (Array.isArray(u.events)?u.events:[]).slice(-400)){if(!e||!['bot','user'].includes(e.role))continue;const topic=TOPICS.includes(e.topic)||e.topic==='closure'?e.topic:null,card=Number.isInteger(e.card)&&e.card>=0&&e.card<=2?e.card:null,kind=KINDS.includes(e.kind)?e.kind:'notice';if(['card','review'].includes(kind)&&(!topic||topic==='closure'||card===null||(!core.topics[topic].done&&card>core.topics[topic].index)||missingZero(core,m.topics.find(t=>t.id===topic)).length))continue;add(s,e.role,short(e.text),kind,{topic,card,relation:m.relations.some(r=>r.id===e.relation)?e.relation:null,createdAt:Number.isFinite(Date.parse(e.createdAt))?new Date(e.createdAt).toISOString():''});}
 if(!s.ui.events.length)add(s,'bot','Escribí menu para ver las opciones o ? para obtener ayuda.');return s;
}
export const savedCourse=s=>({...s.core,streamUi:s.ui});
export const exportCourse=(s,m)=>({format:STREAM_FORMAT,version:3,modelHash:m.contentHash,exportedAt:new Date().toISOString(),state:savedCourse(s)});
export function importCourse(x,m){if(x?.format!==STREAM_FORMAT||![1,2,3].includes(x.version)||!compatibleModelHash(x.modelHash,m))throw Error('No es una exportación compatible de Bot stream. Los registros del recorrido original se conservan separados.');return cleanCourse(x.state,m);}
function invalid(s){add(s,'bot','opción no válida todavía');}
function coreStep(s,a,m){s.core=transitionZero(s.core,a,m);}
function openCard(s,index,m){
 const t=m.topics.find(t=>t.id===s.ui.topic),p=s.core.topics[t.id];if(!t||missingZero(s.core,t).length||index>2||index<0||(!p.done&&index>p.index)){invalid(s);return;}
 if(p.done||index<p.index){s.ui.screen='review';s.ui.review=index;add(s,'bot',`${t.title} · Ficha ${index+1}: ${t.cards[index].title}\nRelectura: no modifica el avance.`,'card',{topic:t.id,card:index});return;}
 coreStep(s,{type:'select',topic:t.id},m);
 for(let i=0;i<2&&s.core.topics[t.id].stage!=='debate';i++)coreStep(s,{type:'advance'},m);
 s.ui.screen='lesson';s.ui.review=null;add(s,'bot',`${t.title} · Ficha ${index+1}: ${t.cards[index].title}`,'card',{topic:t.id,card:index});
}
function completeCard(s,m){
 const id=s.ui.topic;if(!id||s.ui.screen!=='lesson'){invalid(s);return;}
 if(s.core.topics[id].stage!=='debate'){openCard(s,s.core.topics[id].index,m);return;}
 coreStep(s,{type:'advance'},m);
 if(!s.core.topics[id].done){openCard(s,s.core.topics[id].index,m);return;}
 add(s,'bot',`${title(m,id)}: tres fichas recorridas. El avance registra acciones, no certifica comprensión.`);
 s.ui.level='stage';s.ui.topic=null;s.ui.screen=allZero(s.core,m)?'closure':'menu';
 if(allZero(s.core,m)){const rec=m.relations.find(r=>r.id===(m.recommendations[s.core.first]||m.relations[0].id));add(s,'bot',`Los tres conceptos están recorridos. Te propongo comenzar por ${rec.title.toLowerCase()}. Las conexiones son preguntas, no deducciones ni causas.`);}
}
function selectOption(s,o,m){
 if(!o){invalid(s);return;}
 add(s,'user',`${o.number}. ${o.label}`,'choice');
 if(!o.enabled){invalid(s);if(o.type==='topic'){const before=s.core.attempts.length;coreStep(s,{type:'select',topic:o.id},m);if(s.core.attempts.length>before)add(s,'bot',s.core.attempts.at(-1).text);coreStep(s,{type:'home'},m);}return;}
 switch(o.type){
  case 'phase':s.ui.level='stage';s.ui.topic=null;s.ui.screen='menu';add(s,'bot','Etapa 1. Elegí un concepto del menú numérico.');break;
  case 'topic':s.ui.level='concept';s.ui.topic=o.id;s.ui.screen='menu';add(s,'bot',`${title(m,o.id)}. Elegí una ficha del menú numérico.`);break;
  case 'card':openCard(s,o.id,m);break;
  case 'stages':s.ui.level='initial';s.ui.topic=null;s.ui.screen='menu';s.ui.graph=false;add(s,'bot','Menú inicial de etapas. El avance se conserva.');break;
  case 'concepts':s.ui.level='stage';s.ui.topic=null;s.ui.screen='menu';add(s,'bot','Menú de conceptos de la etapa 1. El avance se conserva.');break;
  case 'next':if(s.ui.screen==='review')openCard(s,s.ui.review+1,m);else completeCard(s,m);break;
  case 'complete':completeCard(s,m);break;
  case 'clarify':{coreStep(s,{type:'clarify'},m);const e=s.core.logs[s.ui.topic].at(-1);if(e?.kind==='clarify')add(s,'bot',e.text,'clarify',{topic:s.ui.topic,card:e.card});break;}
  case 'inquiry':s.ui.inputMode='inquiry';add(s,'bot','Escribí tu inquietud. Se guarda solo en este bot, sin avanzar. menu cancela.');break;
  case 'history':s.ui.menu='history';add(s,'bot',`Historial de este bot: ${s.ui.events.length} intervenciones recientes; ${s.core.pending.length} inquietudes guardadas. Exportar, importar o borrar no afecta a búsquedas ni a otros recorridos.`);break;
  case 'reset-ask':s.ui.menu='reset-confirm';add(s,'bot','¿Borrar la conversación, el avance y las inquietudes de este bot? Se conservan el recorrido original, las búsquedas y la configuración. Elegí confirmar o cancelar en el menú numérico.');break;
  case 'reset':s.effect='reset';break;
  case 'export':s.effect='export';add(s,'bot','Se descarga una copia JSON del historial de este bot.');break;
  case 'import':s.effect='import';add(s,'bot','Elegí un archivo JSON. Antes de reemplazar este bot, tendrás que confirmarlo con una opción numérica.');break;
  case 'import-confirm':s.effect='import-confirm';break;
  case 'cancel':s.ui.menu='main';add(s,'bot','Volvemos al menú del contexto actual, sin borrar ni reemplazar nada.');break;
  case 'closure':coreStep(s,{type:'closure'},m);s.ui.level='stage';s.ui.topic=null;s.ui.screen='closure';add(s,'bot','Elegí una relación. Las líneas del grafo no representan causas, deducciones ni antecedentes pedagógicos.');break;
  case 'relation':coreStep(s,{type:'relation',relation:o.id},m);s.ui.screen='relation';add(s,'bot',m.relations.find(r=>r.id===o.id).explanation,'relation',{topic:'closure',relation:o.id});break;
  case 'final':coreStep(s,{type:'final'},m);s.ui.screen='final';add(s,'bot',m.final.text,'final',{topic:'closure'});break;
  case 'finish':coreStep(s,{type:'finish'},m);s.ui.screen='menu';add(s,'bot','Terminamos por ahora. El avance se conserva; las etapas futuras siguen sin contenido preparado.');break;
  case 'graph':s.ui.graph=!s.ui.graph;add(s,'bot',s.ui.graph?'Se muestra el grafo de cierre como referencia visual fuera del panel. Las relaciones se eligen con los números del menú.':'Grafo oculto.');break;
 }
}
export function courseAction(state,action,m,corpus){
 const s=structuredClone(state);delete s.effect;
 if(action.type==='import-ready'){s.ui.menu='import-confirm';s.ui.inputMode='command';add(s,'bot','Archivo validado. ¿Reemplazar solo el historial de este bot? Se conservan el recorrido original, las búsquedas y la configuración.');return s;}
 if(action.type==='notice'){add(s,'bot',short(action.text));return s;}
 if(action.type==='command'){
  const raw=typeof action.text==='string'?action.text:'',text=raw.trim();if(!text)return s;
  if(text.length>2000){add(s,'bot','La entrada admite hasta 2000 caracteres. No se procesó ni guardó la entrada larga.');return s;}
  const help=text.match(/^(I\.\s*A\.|mapa|query)\s*\?$/i),ia=text.match(/^I\.\s*A\.(?:\s+([\s\S]+))?$/i),q=text.match(/^query(?:\s+([\s\S]+))?$/i);
  add(s,'user',text,'choice');
  if(text==='?'||help){add(s,'bot',KEYWORD_HELP[text==='?'?'?':/^i/i.test(help[1])?'ia':help[1].toLowerCase()],'help');return s;}
  if(text.toLowerCase()==='menu'){s.ui.inputMode='command';s.ui.menu='main';add(s,'bot',`Menú de ${contextLabel(s,m)}.`,'menu');return s;}
  if(text.toLowerCase()==='mapa'){add(s,'bot',action.recuperacion?.tipo==='mapa'?action.recuperacion.text:(Array.isArray(corpus?.fragments)?mapReply(s,m,corpus):(()=>{throw Error('Mapa no disponible sin recuperación del servidor.');})()),'map');return s;}
  let mode=s.ui.inputMode,payload=text;
  if(ia){mode='ia';s.ui.inputMode=mode;s.ui.menu='main';payload=ia[1]||'';}
  if(q){mode='query';s.ui.inputMode=mode;s.ui.menu='main';payload=q[1]||'';}
  if(mode==='ia'){add(s,'bot',payload?(action.recuperacion?.tipo==='ia'?action.recuperacion.text:(Array.isArray(corpus?.fragments)?iaReply(payload,corpus):(()=>{throw Error('Recuperación no disponible.');})())):'Modo I.A. abierto. Escribí tu pregunta libre. La consulta se enviará al servidor para recuperar pasajes; no hay IA generativa conectada.','ia');return s;}
  if(mode==='query'){if(!payload){add(s,'bot','Modo query abierto. Escribí relación entre A y B, agrupando con paréntesis. query? explica la sintaxis.','query');return s;}if(action.recuperacion?.tipo==='query'){add(s,'bot',action.recuperacion.text,'query');return s;} if(!Array.isArray(corpus?.fragments))throw Error('Recuperación no disponible.');try{add(s,'bot',queryReply(payload,corpus).text,'query');}catch(e){add(s,'bot',`Query no válida: ${e.message}\nNo se ejecutó la recuperación. query? muestra la sintaxis.`,'query');}return s;}
  if(mode==='inquiry'){if(!s.ui.topic){invalid(s);return s;}s.core={...s.core,current:s.ui.topic};coreStep(s,{type:'inquiry',text},m);s.ui.inputMode='command';add(s,'bot','Inquietud guardada localmente, sin responder ni avanzar.','inquiry');return s;}
  if(/^\d+$/.test(text)){// La selección numérica ya queda registrada con su rótulo, no dos veces.
   const option=menuOptions(s,m).find(o=>o.number===Number(text));if(option)s.ui.events.pop();selectOption(s,option,m);return s;
  }
  add(s,'bot','Entrada no reconocida como comando. Escribí ? para ver las palabras clave, I.A. para escritura libre o query para relaciones.');return s;
 }
 if(action.type==='choose'){selectOption(s,menuOptions(s,m).find(o=>o.number===action.number),m);return s;}
 return s;
}
