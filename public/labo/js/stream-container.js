// Transcripción de texto, sin botones, formularios, tarjetas ni enlaces dentro del panel.
import {esc} from './ui.js';
import {menuOptions,menuText,contextLabel} from './stream-course.js';
const mounted=new WeakMap();
function readings(nums,c){return nums.map(n=>{const es=c.byId.get(`texto:p${n}:es`),gr=c.byId.get(`texto:p${n}:gr`);return `Párrafo ${n} · ${es.ref}\nTraducción del corpus:\n${es.text}\n\nOriginal griego · voz textual:\n${gr.text}`;}).join('\n\n');}
function positions(d,m){return `${d.label} · paráfrasis atribuidas\n${d.positions.map(p=>{const src=m.sources.find(s=>s.id===p.source);return `${src.author}: ${p.text}\nFuente y límites: ${src.title} · ${p.locator}\n${src.note}`;}).join('\n\n')}\nLa comparación es editorial; no se presenta como un debate personal entre los autores.`;}
export function entryText(e,m,c){
 let text=e.text||'';if(e.role!=='bot')return text;
 const node=e.topic==='closure'?m.relations.find(r=>r.id===e.relation):m.topics.find(t=>t.id===e.topic)?.cards[e.card];
 if(['card','review'].includes(e.kind)&&node)return `${text}\n\n${node.explanation}\n\n${node.example}\n\n${readings(node.paragraphs,c)}\n\n${node.debate.question}\n\n${positions(node.debate,m)}`;
 if(e.kind==='example'&&node)text+='\n\n'+readings(node.paragraphs,c);
 if(e.kind==='debate'&&node)text+='\n\n'+positions(node.debate,m);
 if(e.kind==='relation'&&node)text+=`\n\n${node.example}\n\n${readings(node.paragraphs,c)}\n\n${positions(node.debate,m)}`;
 if(e.kind==='final')text+=`\n\n${readings(m.final.paragraphs,c)}\n\nDos preguntas para próximas etapas\n${m.final.frontier.map(f=>`${f.term}\n${f.text}`).join('\n\n')}\n${m.final.caveat}`;
 return text;
}
export function mountCourseChat(root){
 let v=mounted.get(root);if(v?.panel.parentNode===root)return v;
 root.innerHTML=`<header class="course-text-head"><div class="eyebrow">Bot-local · estructura textual</div><h1>Conversación guiada</h1><p>Guion editorial y recuperación desde el servidor. Sin IA generativa conectada.</p></header><p class="stream-context"></p><section id="stream-conversation" class="stream-conversation" aria-label="Conversación guiada, solo texto" tabindex="0"><div class="zero-dialogue" data-stream-dialogue></div><div class="stream-controls"></div></section><p id="stream-status" class="stream-sr" role="status" aria-live="polite"></p><p id="course-status-error" role="alert"></p><form class="course-composer" id="course-command-form"><label for="course-command">Escribí una opción o palabra clave</label><textarea id="course-command" name="command" rows="2" maxlength="2000" autocomplete="off" spellcheck="false" placeholder="menu · I.A. · mapa · query · ?"></textarea><p class="course-input-hint">Enter envía · Shift+Enter cambia de línea · Enter vacío completa la escritura</p></form><input type="file" id="course-import" accept=".json,application/json" hidden><div id="course-visual" hidden></div><p class="bot-footnote">Registro independiente en este navegador. El avance registra acciones, no comprensión. <a href="#/recorrido">Ir al recorrido original</a></p>`;
 v={panel:root.querySelector('#stream-conversation'),dialogue:root.querySelector('[data-stream-dialogue]'),controls:root.querySelector('.stream-controls'),context:root.querySelector('.stream-context'),entries:new Map(),follow:true};
 v.panel.addEventListener('scroll',()=>{v.follow=v.panel.scrollHeight-v.panel.clientHeight-v.panel.scrollTop<90;});
 v.observer=new MutationObserver(()=>{if(v.follow&&v.panel.isConnected)v.panel.scrollTop=v.panel.scrollHeight;});v.observer.observe(v.dialogue,{childList:true,subtree:true,characterData:true});mounted.set(root,v);return v;
}
export function updateCourseChat(root,s,m,c){
 const v=mountCourseChat(root);v.context.textContent=contextLabel(s,m)+(s.ui.inputMode==='command'?'':` · modo ${s.ui.inputMode==='ia'?'I.A.':s.ui.inputMode}`);
 const wanted=new Set();let cursor=v.dialogue.firstElementChild,newBot=null;
 for(const e of s.ui.events){const key=e.id,text=entryText(e,m,c),html=`<article class="zero-turn ${e.role}" tabindex="-1" data-kind="${esc(e.kind)}"><div class="zero-speaker">${e.role==='bot'?'Guía · redacción editorial / recuperación':'Vos · entrada registrada'}</div><p>${esc(text)}</p></article>`;wanted.add(key);let saved=v.entries.get(key);
  if(!saved||saved.html!==html){const t=document.createElement('template');t.innerHTML=html;const node=t.content.firstElementChild;node.dataset.courseEvent=key;if(saved){if(cursor===saved.node)cursor=node;saved.node.replaceWith(node);}saved={node,html};v.entries.set(key,saved);if(e.role==='bot')newBot=node;}
  if(saved.node!==cursor)v.dialogue.insertBefore(saved.node,cursor);cursor=saved.node.nextElementSibling;
 }
 for(const [key,saved] of v.entries)if(!wanted.has(key)){saved.node.remove();v.entries.delete(key);}
 const options=menuOptions(s,m);
 v.controls.innerHTML=`<div class="course-menu-label">${s.ui.menu==='main'?'Opciones del contexto actual':s.ui.menu==='history'?'Historial de este bot':'Confirmación'}</div><p class="course-menu-lines">${options.length?options.map(o=>`<span${o.enabled?'':' class="course-locked"'}>${o.number}. ${esc(o.label)}${o.enabled?'':` — no disponible todavía${o.note?' ('+esc(o.note)+')':''}`}</span>`).join('\n'):esc(menuText(s,m))}</p>`;
 v.follow=true;v.panel.scrollTop=v.panel.scrollHeight;
 return {...v,newBot};
}
