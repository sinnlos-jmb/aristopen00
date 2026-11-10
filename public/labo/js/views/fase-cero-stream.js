import {loadCourseModel,loadReadings,protectRecord,remoteCommand} from '../store.js';
import {downloadJson} from '../ui.js';
import {freshCourse,cleanCourse,savedCourse,exportCourse,importCourse,courseAction} from '../stream-course.js';
import {STREAM_KEY} from '../stream-state.js';
import {revealTurn} from '../stream.js';
import {mountCourseChat,updateCourseChat} from '../stream-container.js';
import {closureGraph} from '../fase-cero-grafo.js';
let active=null,epoch=0;
export function dispose(){epoch++;active?.cancel();active=null;}
export async function render(root,app){
 dispose();
 if(!app.zeroModel)app.zeroModel=await loadCourseModel(app,'fase');
 await loadReadings(app,app.zeroModel);
 const m=app.zeroModel;if(m.corpusHash!==app.corpus.contentHash)throw Error('El guion y el corpus no corresponden.');
 if(!app.courseSession){const raw=localStorage.getItem(STREAM_KEY);try{app.courseSession=raw?cleanCourse(JSON.parse(raw),m):freshCourse(m);}catch{protectRecord(root,raw);return;}}
 root.classList.add('bot-view','zero-view','stream-view','stream-unified','stream-textual');mountCourseChat(root);
 const input=root.querySelector('#course-command');
 function save(){try{localStorage.setItem(STREAM_KEY,JSON.stringify(savedCourse(app.courseSession)));}catch{app.courseSession=courseAction(app.courseSession,{type:'notice',text:'No se pudo guardar en este navegador. Podés exportar el historial desde su menú numérico.'},m);}}
 function draw(animate=false){const v=updateCourseChat(root,app.courseSession,m,app.corpus);const visual=root.querySelector('#course-visual');visual.hidden=!app.courseSession.ui.graph;if(!visual.hidden){visual.innerHTML=closureGraph(m,app.courseSession.core);visual.querySelectorAll('[role="button"]').forEach(n=>{n.removeAttribute('role');n.removeAttribute('tabindex');n.removeAttribute('data-zero-log');n.removeAttribute('data-zero-relation');n.removeAttribute('aria-pressed');n.removeAttribute('aria-label');});visual.querySelector('.stream-closure-graph>p').textContent='Referencia visual de las relaciones. Se eligen por número en el panel de texto.';visual.querySelectorAll('svg').forEach(svg=>{svg.setAttribute('role','img');svg.querySelector('desc').textContent='Felicidad, Naturaleza y Filosofía práctica conectadas por capacidades y ejercicio, bien y fin, capacidad y acción. No hay flechas causales. La selección se realiza con números en el panel de texto.';});visual.setAttribute('aria-label','Grafo de cierre, referencia visual. Las opciones se eligen por número en el panel.');}else visual.replaceChildren();
  if(animate&&v.newBot)active=revealTurn(v.newBot,root,{textOnly:true,onComplete:()=>{active=null;if(v.follow)v.panel.scrollTop=v.panel.scrollHeight;}});
  return v;
 }
 let busy=false;
 function requestFor(text,state){
  text=text.trim();if(!text||text.length>2000||text==='?'||/^(I\.\s*A\.|mapa|query)\s*\?$/i.test(text)||text.toLowerCase()==='menu')return null;
  if(text.toLowerCase()==='mapa')return {tipo:'mapa',payload:{ubicacion:{level:state.ui.level,topic:state.ui.topic,screen:state.ui.screen,review:state.ui.review,topics:Object.fromEntries(Object.entries(state.core.topics).map(([id,t])=>[id,{index:t.index,done:t.done}]))}}};
  const ia=text.match(/^I\.\s*A\.(?:\s+([\s\S]+))?$/i),q=text.match(/^query(?:\s+([\s\S]+))?$/i);
  const mode=ia?'ia':q?'query':state.ui.inputMode,pregunta=ia?(ia[1]||''):q?(q[1]||''):text;
  return ['ia','query'].includes(mode)&&pregunta?{tipo:mode,payload:{pregunta}}:null;
 }
 async function act(a){
  if(busy)return false;
  const request=a.type==='command'?requestFor(a.text,app.courseSession):null;
  if(request){
   busy=true;input.disabled=true;const previousEpoch=epoch;
   try{const result=await remoteCommand(app.revision,request.tipo,request.payload);if(previousEpoch!==epoch)return false;if(result.revision!==app.revision||result.tipo!==request.tipo||typeof result.text!=='string')throw Error('Respuesta de recuperación inválida.');a={...a,recuperacion:result};}
   catch(error){if(previousEpoch===epoch){const status=root.querySelector('#course-status-error');if(status)status.textContent=`No se procesó ni guardó la entrada: ${error.message}`;}return false;}
   finally{busy=false;input.disabled=false;}
  }
  active?.finish();dispose();const next=courseAction(app.courseSession,a,m,app.corpus),effect=next.effect;app.courseSession=next;delete app.courseSession.effect;
  if(effect==='reset'){app.courseSession=freshCourse(m);app.coursePendingImport=null;input.value='';}
  if(effect==='import-confirm'){if(app.coursePendingImport){app.courseSession=app.coursePendingImport;app.coursePendingImport=null;}else app.courseSession=courseAction(app.courseSession,{type:'notice',text:'La importación pendiente ya no está disponible. Volvé a elegir el archivo desde Historial.'},m);}
  if(app.courseSession.ui.menu!=='import-confirm'&&effect!=='import')app.coursePendingImport=null;
  save();draw(a.type!=='import-ready'&&effect!=='reset'&&effect!=='import-confirm');
  if(effect==='export')downloadJson(exportCourse(app.courseSession,m),'eni-bot-stream-historial.json');
  if(effect==='import')root.querySelector('#course-import').click();
  return true;
 }
 root.onsubmit=async e=>{if(e.target.id!=='course-command-form')return;e.preventDefault();const text=input.value;if(!text.trim()){active?.finish();return;}if(await act({type:'command',text})){input.value='';const status=root.querySelector('#course-status-error');if(status)status.textContent='';}input.focus({preventScroll:true});};
 input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();root.querySelector('#course-command-form').requestSubmit();}};
 root.querySelector('#course-import').onchange=async e=>{const el=e.target,file=el.files[0];if(!file)return;try{if(file.size>4000000)throw Error('El historial supera el límite de 4 MB.');const next=importCourse(JSON.parse(await file.text()),m);app.coursePendingImport=next;act({type:'import-ready'});}catch(error){act({type:'notice',text:`No se importó el archivo: ${error.message}`});}finally{el.value='';input.focus({preventScroll:true});}};
 draw();
}
