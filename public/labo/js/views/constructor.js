import { esc, voiceLabel } from '../ui.js';
import { normalize } from '../buscar.js';
import { emptyBuilder, cleanBuilder, validation, questionText, recommendIntents, affinity, equivalent, functionalIds, isEdge, OPERATIONS } from '../constructor.js';
const TYPES={functional_category:'Categoría funcional',functional_node:'Tema / ancla funcional',static_concept:'Concepto estático',static_sense:'Sentido específico',functional_edge:'Arista funcional',graph_edge:'Arista de grafo'};
const TABS=[['temas','Temas'],['conceptos','Conceptos'],['sentidos','Sentidos'],['aristas','Aristas']];
export function panel(app){
 const b=app.search.builder,m=app.queryModel,c=app.corpus,v=validation(b,c,m),intent=v.intent,recommended=recommendIntents(b,c,m);
 const families=[...new Set(m.intents.map(i=>i.family))];
 const count=b.slots.filter(Boolean).length,hasDraft=count||b.intent;
 const hiddenComplements=intent&&intent.maxObjects===1&&!b.slots[1]&&!b.slots[2];
 return `<section class="qb-panel" aria-labelledby="qb-title">
  <div class="qb-heading"><div><span class="eyebrow">Constructor guiado · sin IA generativa</span><h2 id="qb-title">Empezá por un tema</h2><p>O elegí primero qué querés averiguar. Las recomendaciones orientan; no ocultan el resto.</p></div><div class="qb-tools"><button type="button" id="qb-undo"${app.builderUndo.length?'':' disabled'}>Deshacer</button><button type="button" id="qb-new">Nueva consulta</button></div></div>
  <div class="qb-fields">
   <div class="qb-field qb-main"><div class="qb-field-head"><label>Objeto principal <span>Núcleo</span></label></div>${slot(app,0)}</div>
   <div class="qb-field"><label for="qb-intent">¿Qué querés averiguar? <span>Intención</span></label><select id="qb-intent"><option value="">Elegir tipo de pregunta…</option>${families.map(f=>`<optgroup label="${esc(f)}">${m.intents.filter(i=>i.family===f).map(i=>`<option value="${i.id}"${b.intent===i.id?' selected':''}>${recommended.has(i.id)?'★ ':''}${esc(i.label)}</option>`).join('')}</optgroup>`).join('')}</select><small>${esc(intent?.help||'★ señala afinidades editoriales, no las únicas preguntas válidas.')}</small>
    ${b.intent==='examinar'?`<label for="qb-operation" class="qb-operation-label">Qué afirmación revisar</label><select id="qb-operation">${Object.entries(OPERATIONS).map(([id,label])=>`<option value="${id}"${b.operation===id?' selected':''}>${esc(label)}</option>`).join('')}</select>`:''}
   </div>
   ${!hiddenComplements?`<div class="qb-field"><label>Primer complemento <span>${intent?.minObjects>1?'Necesario':'Opcional según la intención'}</span></label>${slot(app,1)}</div>`:''}
   ${b.slots[2]||intent?.maxObjects===3?`<div class="qb-field"><label>Segundo complemento <span>Opcional</span></label>${slot(app,2)}</div>`:''}
   <div class="qb-field qb-depth"><label for="qb-depth">Presentación <span>Extensión de los fragmentos</span></label><select id="qb-depth"><option value="breve"${b.depth==='breve'?' selected':''}>Breve</option><option value="normal"${b.depth==='normal'?' selected':''}>Normal</option><option value="ampliada"${b.depth==='ampliada'?' selected':''}>Ampliada</option></select><small>Las citas y las voces se conservan siempre. Todavía no se redacta una respuesta.</small></div>
  </div>
  ${!intent&&!b.slots[2]?'<button type="button" id="qb-start-third" class="ghost">Empezar por el segundo complemento</button>':''}
  <div class="qb-preview" aria-live="polite"><span>Entiendo que querés</span><strong>${esc(questionText(b,c,m))}</strong>${b.signatureId?'<small>Formulación guiada por una firma editorial de FAQ; pendiente de revisión.</small>':''}<small>${count}/3 objetos. Un sentido sustituye al concepto; una arista ocupa una posición completa.</small></div>
  ${hasDraft&&!v.complete?`<div class="qb-validation"><strong>Falta ajustar la consulta</strong><ul>${v.errors.map(e=>`<li>${esc(e)}</li>`).join('')}</ul></div>`:''}
  <div class="qb-examples"><span>Probá un caso:</span>${m.examples.map((e,i)=>`<button type="button" data-qb-example="${i}">${esc(e.label)}</button>`).join('')}</div>
  <details class="qb-faqs"><summary>Partir de una FAQ · ${m.faqs.length} preguntas</summary><p>Se carga una formulación concreta. No se equiparan todas las variantes ni se la usa como evidencia.</p><label for="qb-faq">Pregunta y operación</label><select id="qb-faq"><option value="">Elegir una formulación…</option>${m.faqs.map(f=>`<optgroup label="${esc(f.question)}">${f.signatures.map(s=>`<option value="${esc(s.id)}">${esc(s.label)} · ${esc(m.intents.find(i=>i.id===s.intent)?.label)}</option>`).join('')}</optgroup>`).join('')}</select></details>
 </section>`;
}
function refinements(x,c){
 if(!x||isEdge(x)||x.type==='static_sense')return [];
 return c.catalog.criteria.filter(y=>y.type==='static_sense'&&(y.conceptId===x.entityId||(x.type.startsWith('functional')&&(y.anchors||[]).some(a=>a.id===x.id))));
}
function slot(app,i){
 const x=app.corpus.criterionById.get(app.search.builder.slots[i]),r=refinements(x,app.corpus);
 return x?`<div class="qb-object"><div class="tags"><span class="tag">${esc(TYPES[x.type])}</span>${isEdge(x)?voiceTags(x):''}</div><strong>${esc(x.label)}</strong>${x.greek?`<span class="greek" lang="gr">${esc(x.greek)}</span>`:''}${isEdge(x)&&x.relation?`<small>Dirección conservada · ${esc(app.queryModel.relations[x.relation]?.label||x.relation)}</small>`:''}<div class="qb-object-actions"><button type="button" data-qb-pick="${i}">Cambiar</button>${r.length?`<button type="button" data-qb-refine="${i}">Precisar sentido (${r.length})</button>`:''}<button type="button" class="ghost" data-qb-remove="${i}" aria-label="Quitar ${esc(x.label)}">Quitar</button></div></div>`:`<button class="qb-empty-object" type="button" data-qb-pick="${i}"><span>＋</span> ${i?'Elegir otro objeto':'Elegir tema, sentido o arista'}<small>${i?'Podés empezar por este campo.':'Árbol funcional, estático o relaciones completas'}</small></button>`;
}
function voiceTags(x){return x.voiceStatus==='estructurada'?(x.voices||[]).map(v=>`<span class="tag ${esc(v)}">${esc(voiceLabel(v))}</span>`).join(''):'<span class="tag unstructured">Voz no revisada · no evidencia</span>';}
export function dialog(app){
 const ui=app.builderUI;if(!ui.open)return '';
 const c=app.corpus,b=app.search.builder,q=normalize(ui.query),refine=c.criterionById.get(ui.refineId),refineIds=new Set(refinements(refine,c).map(x=>x.id));
 let items=c.catalog.criteria.filter(x=>ui.tab==='temas'?['functional_category','functional_node'].includes(x.type):ui.tab==='conceptos'?x.type==='static_concept':ui.tab==='sentidos'?x.type==='static_sense':isEdge(x));
 if(refine)items=items.filter(x=>refineIds.has(x.id));
 if(q)items=items.filter(x=>normalize(`${x.label} ${x.greek||''} ${x.relation||''} ${app.queryModel.relations[x.relation]?.label||''} ${x.ref||''}`).includes(q));
 items=items.map(x=>({...x,affinity:affinity(x,b,c,app.queryModel)})).sort((a,b)=>b.affinity.score-a.affinity.score||a.label.localeCompare(b.label,'es'));
 const displayed=items.slice(0,ui.limit);
 return `<dialog id="qb-dialog" class="criterion-dialog qb-dialog" aria-labelledby="qb-dialog-title"><div class="dialog-head"><div><span class="eyebrow">${ui.slot===0?'Objeto principal':`Complemento ${ui.slot}`}</span><h2 id="qb-dialog-title">${refine?'Precisar el sentido':'Elegir un objeto'}</h2></div><button type="button" id="qb-close">Cerrar</button></div>
  <div class="selector-tabs" role="tablist">${TABS.map(([id,label])=>`<button role="tab" type="button" data-qb-tab="${id}" aria-selected="${ui.tab===id}">${label}</button>`).join('')}</div>
  <form id="qb-filter-form" class="selector-filter"><input id="qb-filter" name="filter" type="search" aria-label="Filtrar objetos" value="${esc(ui.query)}" placeholder="Nombre, griego, relación o referencia…"><button type="submit">Filtrar</button></form>
  <p class="selector-help">${refine?`Sentidos vinculados a ${esc(refine.label)}. Se reemplaza solo esta posición. <button type="button" id="qb-all-senses">Ver todos los sentidos</button>`:'Primero se recomiendan sentidos, anclas y vecinos. La afinidad no es una afirmación del texto; las demás opciones siguen disponibles.'}</p>
  <div class="selector-list">${displayed.length?displayed.map(x=>{
   const selected=b.slots.some((id,i)=>i!==ui.slot&&id&&equivalent(id,x.id,c)),current=b.slots[ui.slot]===x.id;
   return `<article class="selector-row qb-picker-row"><div class="selector-copy"><div class="tags"><span class="tag">${esc(TYPES[x.type])}</span>${isEdge(x)?voiceTags(x):''}</div><strong>${esc(x.label)}</strong>${x.greek?` <span class="greek" lang="gr">${esc(x.greek)}</span>`:''}<small>${esc(x.affinity.reason)}${x.relation?` · ${esc(app.queryModel.relations[x.relation]?.label||x.relation)}`:''}</small>${x.ref?`<small>${esc(x.ref)}</small>`:''}${selected?'<small>Ya ocupa otra posición como el mismo concepto.</small>':''}</div><button class="add-criterion" type="button" data-qb-choose="${esc(x.id)}"${selected||current?' disabled':''}>${current?'Actual':selected?'Ya elegido':'Elegir'}</button></article>`;
  }).join(''):'<div class="empty">No hay coincidencias. Cambiá el filtro o consultá otra pestaña.</div>'}${items.length>displayed.length?`<button type="button" id="qb-more" class="qb-more">Mostrar más · ${displayed.length} de ${items.length}</button>`:`<p class="selector-help">${items.length} opciones en esta vista.</p>`}</div></dialog>`;
}
// D42: mostrar el estado disponible sin atribuir un estado a afirmaciones que no lo tienen. No es respuesta automática.
const ROLE_LABEL={responde:'Responde',matiza:'Matiza',contexto:'Contexto'};
function draftBlock(f){
 if(!f.answerDraft?.length)return '';
 const header=f.answerStatus==='borrador'?'Respuesta en borrador':'Respuesta con estado editorial por revisar';
 return `<details class="qb-draft"><summary>${header} · ${f.answerDraft.length} afirmaciones</summary><ol>${f.answerDraft.map(a=>`<li><span class="tag">${esc(ROLE_LABEL[a.role]||a.role)}</span> ${esc(a.text)}<small>${esc(a.ref||'')}${a.voice?` · ${esc(voiceLabel(a.voice))}`:''} · ${esc(a.status||'sin estado indicado')}</small></li>`).join('')}</ol></details>`;
}
export function plan(app){
 const p=app.search.plan;if(!app.search.hasRun||!p)return '';
 const exact=p.faqs.filter(x=>x.kind==='exacta'),thematic=p.faqs.filter(x=>x.kind!=='exacta');
 return `<section class="qb-plan" aria-labelledby="qb-plan-title"><div class="qb-heading"><div><span class="eyebrow">Plan de recuperación · no es una respuesta</span><h2 id="qb-plan-title">Cómo se orientó la búsqueda</h2></div><span class="tag">Firmas editoriales en revisión</span></div>
  <p>${exact.length?`${exact.length} FAQ con firma coincidente.`:'No hay una firma exacta de FAQ para esta consulta.'} ${thematic.length?`${thematic.length} FAQ comparten tema, pero no se consideran respuestas exactas.`:''} Los resultados se filtran por fuentes y alcance antes de ordenarse. Los puntos no miden verdad ni confianza.</p>
  ${exact.length?`<details><summary>FAQ coincidentes · índice de orientación, no evidencia</summary><ul>${exact.map(x=>`<li><a href="${esc(x.faq.url)}" target="_blank" rel="noopener">${esc(x.faq.question)}</a><small>${x.faq.passages.map(p=>`${esc(p.role)}: ${esc(p.ref)}`).join(' · ')}</small>${x.signatures.map(s=>s.context?`<small>${esc(s.context)}</small>`:'').join('')}${draftBlock(x.faq)}</li>`).join('')}</ul></details>`:''}
  ${p.edges.length?`<details class="qb-plan-edges" open><summary>Aristas candidatas · ${p.edges.length} </summary><div class="qb-edge-list">${p.edges.slice(0,8).map(({edge:e})=>`<article><div class="tags">${voiceTags(e)}</div><strong>${esc(e.label)}</strong><span>${esc(e.relationLabel||e.relation)}${e.greek?` · ${esc(e.greek)}`:''}</span>${e.ref?`<small>${esc(e.ref)}</small>`:''}${e.refCf?`<small class="qb-refcf">cf. ${esc(e.refCf)} · cotejo, no tramo principal</small>`:''}${!e.paragraphs.length?'<small>Referencia bibliográfica: sin pasaje de EN I resuelto en esta capa.</small>':''}</article>`).join('')}</div>${p.edges.length>8?'<p>Se muestran ocho candidatas. Precisá el objeto para acotar la lista.</p>':''}</details>`:''}
  ${p.excludedEdgeSources.length?`<div class="qb-source-warning"><span>Las fichas de estas aristas están excluidas como resultados por el filtro actual. Su índice solo orientó la búsqueda.</span>${p.excludedEdgeSources.map(id=>`<button type="button" data-qb-source="${id}">Incluir ${id==='functional_edges'?'aristas funcionales':'aristas de grafos'} como resultados</button>`).join('')}</div>`:''}
  ${p.referenceOnly.length?`<p class="warning-line">Una cita no equivale a un texto disponible. «Todo el material» permite consultar fichas externas al libro I, pero no incorpora los libros citados.${app.config.scope!=='all'?' <button type="button" id="qb-scope-all">Ampliar a todo el material</button>':''}</p>`:''}
  <p class="qb-plan-foot">Se conservan las voces de cada fragmento. Una ficha puede reunir afirmaciones textuales e interpretativas: hay que revisar su nota. Un camino del grafo no autoriza una conclusión transitiva.</p>
 </section>`;
}
export function bind(root,app,{rerender,perform}){
 const remember=()=>{app.builderUndo.push(JSON.parse(JSON.stringify(app.search.builder)));if(app.builderUndo.length>24)app.builderUndo.shift();};
 const change=async (next,keepSignature=false)=>{
  remember();app.search.builder=cleanBuilder({...next,...(!keepSignature?{signatureId:null}:{})},app.corpus,app.queryModel);
  app.search.criteria=app.search.builder.slots.filter(Boolean);app.search.query='';app.search.results=[];app.search.selected=new Set();app.search.plan=null;app.search.hasRun=false;app.search.interactionId=null;app.search.evaluation=null;app.search.error='';
  await rerender();
 };
 const open=async(slot,refine=false)=>{
  const x=app.corpus.criterionById.get(app.search.builder.slots[slot]);app.builderUI={open:true,slot,tab:refine?'sentidos':x?.type==='static_sense'?'sentidos':isEdge(x)?'aristas':'temas',query:'',refineId:refine?x?.id:null,limit:32};await rerender();
 };
 root.querySelector('#qb-intent')?.addEventListener('change',e=>change({...app.search.builder,intent:e.target.value}));
 root.querySelector('#qb-start-third')?.addEventListener('click',()=>open(2));
 root.querySelector('#qb-operation')?.addEventListener('change',e=>change({...app.search.builder,operation:e.target.value}));
 root.querySelector('#qb-depth')?.addEventListener('change',async e=>{remember();app.search.builder.depth=e.target.value;if(app.search.hasRun)await perform(app,app.search.query,false);await rerender();});
 root.querySelectorAll('[data-qb-pick]').forEach(el=>el.addEventListener('click',()=>open(+el.dataset.qbPick)));
 root.querySelectorAll('[data-qb-refine]').forEach(el=>el.addEventListener('click',()=>open(+el.dataset.qbRefine,true)));
 root.querySelectorAll('[data-qb-remove]').forEach(el=>el.addEventListener('click',()=>{const slots=app.search.builder.slots.slice();slots[+el.dataset.qbRemove]=null;return change({...app.search.builder,slots});}));
 root.querySelectorAll('[data-qb-example]').forEach(el=>el.addEventListener('click',()=>change({...emptyBuilder(),...app.queryModel.examples[+el.dataset.qbExample]})));
 root.querySelector('#qb-faq')?.addEventListener('change',e=>{const s=app.queryModel.faqs.flatMap(f=>f.signatures).find(s=>s.id===e.target.value);if(s)return change({...emptyBuilder(),intent:s.intent,slots:[...s.arguments,...Array(3-s.arguments.length).fill(null)],signatureId:s.id,operation:s.operation||'abierta'},true);});
 root.querySelector('#qb-new')?.addEventListener('click',async()=>{app.search.sources=['paragraphs'];app.sourcesPanelOpen=false;await change(emptyBuilder());history.replaceState(null,'','#/buscar');});
 root.querySelector('#qb-undo')?.addEventListener('click',async()=>{const previous=app.builderUndo.pop();if(!previous)return;app.search.builder=previous;app.search.criteria=previous.slots.filter(Boolean);app.search.query='';app.search.hasRun=false;app.search.results=[];app.search.selected=new Set();app.search.plan=null;app.search.interactionId=null;app.search.evaluation=null;await rerender();});
 const dlg=root.querySelector('#qb-dialog');
 dlg?.addEventListener('cancel',()=>{app.builderUI.open=false;});
 dlg?.addEventListener('close',()=>{app.builderUI.open=false;});
 root.querySelector('#qb-close')?.addEventListener('click',()=>{app.builderUI.open=false;dlg.close();});
 root.querySelectorAll('[data-qb-tab]').forEach(el=>el.addEventListener('click',async()=>{app.builderUI.tab=el.dataset.qbTab;app.builderUI.refineId=null;app.builderUI.query='';app.builderUI.limit=32;await rerender();}));
 root.querySelector('#qb-filter-form')?.addEventListener('submit',async e=>{e.preventDefault();app.builderUI.query=String(new FormData(e.currentTarget).get('filter')||'');app.builderUI.limit=32;await rerender();});
 root.querySelector('#qb-more')?.addEventListener('click',async()=>{app.builderUI.limit+=48;await rerender();});
 root.querySelector('#qb-all-senses')?.addEventListener('click',async()=>{app.builderUI.refineId=null;await rerender();});
 root.querySelectorAll('[data-qb-choose]').forEach(el=>el.addEventListener('click',async()=>{const slots=app.search.builder.slots.slice();slots[app.builderUI.slot]=el.dataset.qbChoose;app.builderUI.open=false;await change({...app.search.builder,slots});}));
 root.querySelectorAll('[data-qb-source]').forEach(el=>el.addEventListener('click',async()=>{app.search.sources=[...new Set([...app.search.sources,el.dataset.qbSource])];app.sourcesPanelOpen=true;await perform(app,app.search.query,false);await rerender();}));
 root.querySelector('#qb-scope-all')?.addEventListener('click',async()=>{app.config.scope='all';app.saveConfig();await perform(app,app.search.query,false);await rerender();});
}
