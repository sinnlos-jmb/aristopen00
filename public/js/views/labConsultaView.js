// Ágora N1-U.16 · Recuperación y Query Builder EN el Lab principal.
// Reutiliza el índice local N1-U.15; sin duplicación, SQL ni consultas remotas arbitrarias.
import { esc } from '../ui.js';
import { controlesTamanoLector, actualizarLectura, cambiarTamanoLector } from '../reader/fontPreferences.js';
import { parseBook } from '../reader/text.js';
import { buildEvidenceDocuments, buildSheetLinks, makeIndex, searchIndex, categoryChoices } from '../../labo/js/vectorial-engine.js';
import { parseQuery, graphMatches, scopeFor, queryWarning } from '../lab/queryMultimodal.js';
import { renderLLMGraph, hydrateLLMGraphs } from '../lab/llmGraphView.js';
import { renderLLMMarkdown } from '../lab/llmMarkdown.js';
import { readAgoraLLMStream } from '../lab/llmStream.js';

const arr = x => Array.isArray(x) ? x : [];
const LIMIT = 12;
// Enlaces temáticos explícitos al catálogo SVG existente, no relaciones inferidas por IA.
const CURATED_MAPS = {
  'proemio':[['intro','Filosofía práctica'],['bien','El bien como fin']],
  'faq.etica.intro':[['intro','Filosofía práctica']],
  'faq.agathon.pros_hen':[['bien','El bien como fin'],['bienes','Tipos de bienes']],
  'faq.lab.felicidad':[['felicidad','Condiciones de la felicidad'],['forma','La forma del fin']],
  'faq.lab.ergon':[['ergon','Argumento del érgon'],['funcion','La función propia']],
  'faq.lab.alma':[['alma','El alma']],
  'faq.lab.virtudes':[['alma','El alma'],['confirmacion','La confirmación']],
};
function curatedLinks(fichas,sheets){
  const known=fichas.filter(f=>sheets.has(f.id));
  const maps=new Map(known.flatMap(f=>CURATED_MAPS[f.id]||[]));
  return `<section class="lq-curated"><strong>Material editorial de Ágora</strong><div class="lq-links">${known.map(f=>`<a href="${esc(sheets.get(f.id).url)}">${esc(f.title)}</a>`).join('')}<a href="#/fichas">Fichas</a><a href="#/chat">FAQ y diálogo</a></div><div class="lq-links">${[...maps].map(([id,title])=>`<a href="#/grafos/${id}">Mapa: ${esc(title)}</a>`).join('')}<a href="#/grafos">Todos los mapas de lectura</a></div></section>`;
}
const DEFAULT_CYPHER = "MATCH (f:Ficha)-[:RELACIONADA_CON]->(g:Ficha)\nWHERE f.id = 'faq.lab.felicidad' RETURN f, g\nSEARCH 'actividad virtud'";
const DEFAULT_HYBRID = "SELECT PASAJES WHERE TEXTO CONTAINS 'felicidad actividad'\nAND TIPO = 'parrafo' AND FICHA = 'faq.lab.felicidad' LIMIT 12";
const modes = [
  ['natural','Lenguaje natural'], ['visual','Constructor visual'],
  ['categorias','Solo categorías'], ['cypher','Grafo · estilo Cypher'],
  ['hibrido','Híbrido · SQL/grafos'], ['llm','Asistente LLM'],
];
const options = (choices, current) => choices.map(([value,label]) => `<option value="${esc(value)}" ${value===current?'selected':''}>${esc(label)}</option>`).join('');

async function fetchJSON(url, signal) {
  const response = await fetch(url,{cache:'no-store',signal});
  if(!response.ok) throw Error(`${url}: HTTP ${response.status}`);
  return response.json();
}
async function loadData(signal) {
  const [lectura,raw,f5,f6,f7] = await Promise.all([
    fetchJSON('/api/labo/lectura',signal),
    fetch('/api/texto/EN_libro1_v8.txt',{cache:'no-store',signal}).then(r=>{if(!r.ok)throw Error('Texto bilingüe no disponible.');return r.text();}),
    fetchJSON('/lab/n1u5-fichas-explicativas.json',signal).catch(()=>null),
    fetchJSON('/lab/n1u6-puentes-explicativos.json',signal).catch(()=>null),
    fetchJSON('/lab/n1u7-fichas-red-piloto.json',signal).catch(()=>null),
  ]);
  const corpus=buildEvidenceDocuments(lectura,parseBook(raw));
  const index=makeIndex(corpus.documents);
  const rev=[f5?.fuente?.revision,f6?.fuente?.revision,f7?.fuente?.revision];
  const ready=rev.every(r=>r && r===lectura.revision);
  const bySub=ready?buildSheetLinks([f5,f7],f6):new Map();
  const sheets=new Map();
  for(const [sub,records] of bySub) for(const sheet of records) {
    if(!sheets.has(sheet.id))sheets.set(sheet.id,{...sheet,supports:[]});
    sheets.get(sheet.id).supports.push(sub);
  }
  const previews=new Map(ready?[...arr(f5?.fichas),...arr(f7?.fichas)].map(f=>[f.id,{introduccion:arr(f.introduccion),referencias:arr(f.referencias),estado:f.fuente_editorial?.estado||'borrador_pedagogico_pendiente_curaduria'}]):[]);
  const relations=ready?arr(f7?.red?.relaciones):[];
  return {
    index, docs:corpus.documents,revision:lectura.revision,sheets,relations,bySub,previews,
    staticChoices:categoryChoices(index.documents,'static'),
    functionalChoices:categoryChoices(index.documents,'functional'),
    editorialReady:ready,
  };
}

function resultMarkup(hit,data,i) {
  const linked=[...new Map(hit.relatedSubunits.flatMap(s=>data.bySub.get(s)||[]).map(f=>[f.id,f])).values()];
  return `<article class="lq-hit">
    <header><span class="lq-rank">${i+1}</span><div><strong>${esc(hit.title)}</strong><small>${esc(hit.reference)} · ${esc(hit.kind)} · ${esc(hit.unit)}</small></div><b title="Puntaje relativo, no probabilidad de verdad">${hit.score.toFixed(3)}</b></header>
    <p>${esc(hit.es.slice(0,260))}${hit.es.length>260?'…':''}</p>
    <details><summary>Texto bilingüe y puntuación</summary>
      <div class="lq-bilingual"><div><h4>Castellano</h4><p>${esc(hit.es)}</p></div><div><h4>Griego</h4><p lang="grc">${esc(hit.gr)}</p></div></div>
      <p class="lq-hint">TF-IDF/coseno ${hit.cosine.toFixed(3)} · frase ${hit.exact.toFixed(3)} · etiquetas ${hit.tagBonus.toFixed(3)}</p>
      <p class="lq-hint">Origen de etiquetas: ${esc(hit.tagOrigin)}. Términos coincidentes: ${esc(hit.matchedTerms.join(', ')||'ninguno')}.</p>
    </details>
    <div class="lq-links">${linked.map(f=>`<a href="${esc(f.url)}">Ficha: ${esc(f.title)}</a>`).join('')}
      <a href="#/reading">Abrir biblioteca bilingüe</a></div>
  </article>`;
}

export function createLabConsultaView(_App) {
  const el=document.createElement('div');
  el.className='scrollable has-scroll lq-view';
  // La hoja de estilos se importa solo cuando se abre este experimento.
  if(!document.querySelector('link[data-lq-styles]')){
    const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';
    stylesheet.href='/css/lab-consulta-n1u16.css';stylesheet.dataset.lqStyles='1';
    document.head.appendChild(stylesheet);
  }
  let destroyed=false, disposeGraphs=()=>{};
  const abort=new AbortController();
  const state={
    mode:'natural', natural:'felicidad actividad virtud', visualQuery:'felicidad actividad',
    visualType:'ambos', visualSheet:'',visualFilter:'boost',visualLimit:LIMIT,
    staticTags:[],functionalTags:[],cypher:DEFAULT_CYPHER,hybrid:DEFAULT_HYBRID,
    showAllTags:false, result:null, error:'',
    llm:{question:'',example:'',mode:'lectura',pending:false,error:'',status:null,history:[],selected:[]},
  };
  let data=null;
  el.innerHTML='<div class="lq-loading">Preparando índice bilingüe y relaciones de fichas…</div>';

  function rememberFields(){
    const chat=el.querySelector('#lq-llm-form');
    if(chat){state.llm.question=chat.elements.llmQuestion.value;state.llm.mode=chat.elements.llmMode.value;if(chat.elements.llmExample)state.llm.example=chat.elements.llmExample.value;}
    const f=el.querySelector('#lq-form');if(!f)return;
    if(f.elements.natural)state.natural=f.elements.natural.value;
    if(f.elements.visualQuery)state.visualQuery=f.elements.visualQuery.value;
    if(f.elements.type)state.visualType=f.elements.type.value;
    if(f.elements.sheet)state.visualSheet=f.elements.sheet.value;
    if(f.elements.filter)state.visualFilter=f.elements.filter.value;
    if(f.elements.limit)state.visualLimit=Number(f.elements.limit.value);
    if(f.elements.cypher)state.cypher=f.elements.cypher.value;
    if(f.elements.hybrid)state.hybrid=f.elements.hybrid.value;
  }
  function visualAST(){return {
    query:state.mode==='categorias'?'':state.visualQuery,type:state.visualType,sheetId:state.visualSheet,
    staticTags:state.mode==='natural'?[]:state.staticTags,
    functionalTags:state.mode==='natural'?[]:state.functionalTags,
    filterMode:state.visualFilter,limit:state.visualLimit,
  };}
  function execute(){
    state.result=null;state.error='';
    try{
      const source=state.mode==='natural'?state.natural:state.mode==='cypher'?state.cypher:state.mode==='hibrido'?state.hybrid:'';
      const ast=parseQuery(state.mode==='categorias'?'visual':state.mode,source,visualAST());
      if(state.mode==='categorias' && !ast.staticTags.length && !ast.functionalTags.length)
        throw Error('Elegí al menos una categoría estática o funcional para buscar sin términos textuales.');
      const graph=graphMatches(ast,data.relations,data.sheets);
      const scoped=scopeFor(ast,data.sheets,graph);
      const hits=searchIndex(data.index,{...ast,supportSubIds:scoped});
      state.result={ast,graph,hits,warning:queryWarning(ast.query)};
    }catch(err){state.error=err.message;}
  }
  function facets(name,choices,selected){
    const visible=state.showAllTags?choices:choices.slice(0,12);
    return `<fieldset><legend>${name==='static'?'Categorías estáticas':'Categorías funcionales'}</legend>
      ${visible.map(({id,count})=>`<label class="lq-tag"><input data-tag="${name}" type="checkbox" value="${esc(id)}" ${selected.includes(id)?'checked':''}>${esc(id)} <small>${count}</small></label>`).join('')||'<p>Sin categorías registradas.</p>'}</fieldset>`;
  }
  function renderLocalGraph(graph){
    if(!graph.edges.length)return '';
    const ids=[...new Set(graph.edges.flatMap(e=>[e.desde,e.hacia]))];
    return renderLLMGraph({state:'consulta_local',nodes:ids.map(id=>({...data.sheets.get(id),id,type:'ficha',url:data.sheets.get(id)?.url?.replace(/^#/, '/#')})),edges:graph.edges.map(e=>({id:e.id,from:e.desde,to:e.hacia,label:e.nombre,type:'relacion',estado:'relación editorial'})),steps:[],paths:(graph.paths||[]).map(p=>({ids:p.ids,edgeIds:p.edges.map(e=>e.id)}))},data.editorialReady?{nodes:[...data.sheets].map(([id,n])=>({...n,id,url:n.url?.replace(/^#/, '/#')})),edges:data.relations.filter(e=>data.sheets.has(e.desde)&&data.sheets.has(e.hacia)).map(e=>({id:e.id,from:e.desde,to:e.hacia,label:e.nombre}))}:null,data.previews);
  }
  function renderResults(){
    if(state.error)return `<div class="lq-alert" role="alert">${esc(state.error)}</div>`;
    if(!state.result)return '<section class="lq-intro">Elegí un modo, construí una consulta y presioná «Ejecutar». Los modos de búsqueda comparten un modelo interno auditable.</section>';
    const {ast,graph,hits,warning}=state.result;
    return `<section class="lq-output">
      <div class="lq-summary"><h2>Resultados</h2><span>${hits.length} citas · ${graph.edges.length} relaciones editoriales</span></div>
      ${warning?`<p class="lq-alert">${esc(warning)}</p>`:''}
      ${ast.graph&&graph.sheetIds.length?curatedLinks(graph.sheetIds.map(id=>data.sheets.get(id)).filter(Boolean),data.sheets):''}
      ${renderLocalGraph(graph)}
      <details><summary>Consulta normalizada (AST de solo lectura)</summary><pre>${esc(JSON.stringify(ast,null,2))}</pre></details>
      ${graph.edges.length?`<section class="lq-edges"><h3>Conexiones de fichas</h3>${graph.edges.map(e=>`<article><strong>${esc(e.nombre)}</strong><p>${esc(e.explicacion)}</p><small>${esc(data.sheets.get(e.desde)?.title||e.desde)} → ${esc(data.sheets.get(e.hacia)?.title||e.hacia)}</small><p><a href="${esc(data.sheets.get(e.hacia)?.url||'#/fichas')}">Abrir ficha vinculada</a></p></article>`).join('')}</section>`:''}
      ${ast.graph && !graph.edges.length?'<p class="lq-hint">No existen aristas del tipo indicado para esta ficha en la revisión editorial activa.</p>':''}
      <h3>Citas candidatas</h3>
      ${!ast.query && !ast.staticTags.length&&!ast.functionalTags.length?'<p class="lq-hint">Este patrón de grafo no incluye SEARCH; se muestran conexiones editoriales sin puntuar pasajes. Añadí SEARCH para recuperar citas.</p>':hits.length?hits.map((h,i)=>resultMarkup(h,data,i)).join(''):'<p class="lq-hint">Sin coincidencias con los filtros o el alcance. Esto no demuestra ausencia del concepto.</p>'}
      <div class="lq-actions"><button type="button" class="lq-button" data-export>Exportar consulta y resultados JSON</button>
      ${hits.length?'<button type="button" class="lq-button" data-to-llm>Examinar estas citas con la LLM</button>':''}</div>
      <p class="lq-hint">Las citas se ordenan por similitud léxica TF-IDF y etiquetas, no por verdad filosófica. Las aristas solo proceden del catálogo editorial.</p>
    </section>`;
  }
  async function loadLLMStatus(){
    try {
      const response=await fetch('/api/llm/session',{credentials:'same-origin',signal:abort.signal,cache:'no-store'});
      const payload=await response.json();
      if(!response.ok)throw Error(payload.error||`HTTP ${response.status}`);
      state.llm.status=payload;state.llm.error='';
    }catch(err){if(!destroyed && err.name!=='AbortError')state.llm.error=err.message;}
    if(!destroyed && data && state.mode==='llm')render();
  }
  function renderLLM(){
    const llm=state.llm;
    const status=llm.status;
    return `<section class="lq-chat">
      <h2>Asistente de lectura · OpenRouter</h2>
      ${curatedLinks([],data.sheets)}
      <p class="lq-hint">Las preguntas se muestran en globitos; las respuestas aparecen completas debajo, a medida que se generan. Es un experimento, no una FAQ validada.</p>
      <p class="lq-quota" role="status">${status?`Generaciones disponibles: <strong>${status.remaining} de ${status.limit}</strong> · ${status.pending} en curso · Modelo: ${esc(status.model||'sin configurar')}`:'Consultando el cupo del servidor…'}</p>
      ${status && !status.configured?'<p class="lq-alert">Falta configurar OPENROUTER_API_KEY en el backend. No introduzcas la clave en esta pantalla.</p>':''}
      ${llm.history.length?`<section class="lq-conversation" aria-label="Conversación con el asistente" tabindex="0">${llm.history.map((m,i)=>`<article class="lq-turn" data-turn="${i}">
        <div class="lq-question"><div class="lq-user-bubble"><span class="lq-sr-only">Pregunta ${i+1}: </span>${esc(m.question)}</div></div>
        <div class="lq-assistant"><p class="lq-assistant-head">Respuesta generada · ${esc(m.model||'OpenRouter')}${m.pending?(m.graphTrace?.state==='explorando'?' · Explorando grafos…':' · Escribiendo…'):''}</p>
          ${m.mode!=='cypher'?curatedLinks(m.fichas||[],data.sheets):''}
          <div class="lq-answer" data-llm-answer="${i}" aria-live="${m.pending?'polite':'off'}">${m.pending?esc(m.answer||''):renderLLMMarkdown(m.answer||'')}</div>
          ${m.queries?`<section class="lq-suggestions"><strong>Consultas comprobadas</strong>${m.queries.accepted.map((q,j)=>`<div><pre>${esc(q.query)}</pre><button type="button" data-use-query="${i}:${j}">Probar en el Query Builder</button></div>`).join('')}${m.queries.rejected.length||!m.queries.accepted.length?'<p class="lq-hint">Alguna propuesta no fue admitida o no se recibió código válido. Solo se pueden cargar las consultas comprobadas.</p>':''}</section>`:''}
          <div data-llm-graph="${i}">${renderLLMGraph(m.graphTrace,null,data.previews)}</div>
          ${m.incomplete?'<p class="lq-alert">La generación alcanzó el límite de tokens: esta respuesta puede estar incompleta.</p>':''}
          ${m.error?`<p class="lq-alert">${esc(m.error)}${m.answer?' Se conserva el fragmento recibido.':''}</p>`:''}
          ${m.fichas?.length&&m.mode!=='cypher'?`<details><summary>${m.fichas.length} fichas explicativas relacionadas (interpretación editorial)</summary>${m.fichas.map(f=>`<div class="lq-source"><strong>${data.sheets.has(f.id)?`<a href="${esc(data.sheets.get(f.id).url)}">${esc(f.title)}</a>`:esc(f.title)}</strong> · <small>${esc(f.estado)}</small><p>${esc(f.introduccion)}</p></div>`).join('')}</details>`:''}
          ${m.sources?.length?`<details><summary>${m.sources.length} fuentes verificadas</summary>${m.sources.map((src,k)=>`<div class="lq-source"><b>[${esc(src.label||`E${k+1}`)}] ${esc(src.reference)} · ${esc(src.title)}</b>${src.origin?` <small>${esc(src.origin)}${src.truncated?' · fragmento recortado':''}</small>`:''}<p>${esc(src.es)}</p><p lang="grc">${esc(src.gr)}</p></div>`).join('')}</details>`:''}
          ${m.promptVersion?'<p class="lq-hint">Respuesta generada, no validada editorialmente.</p>':''}
        </div>
      </article>`).join('')}</section>`:'<p class="lq-intro">Formulá una pregunta para comenzar. Las respuestas aparecerán aquí, en orden de conversación.</p>'}
      <form id="lq-llm-form" class="lq-form">
        <label>Tu pregunta de lectura<textarea name="llmQuestion" rows="3" maxlength="1500" required placeholder="¿Cuáles son las condiciones de la felicidad?">${esc(llm.question)}</textarea></label>
        <label>Modo<select name="llmMode">${options([['lectura','Lectura guiada'],['contraste','Contrastar una interpretación'],['grafo','Explorar grafos'],['cypher','Aprender Cypher']],llm.mode)}</select></label>
        ${llm.mode==='cypher'?`<label>Ejemplo de lo que querés encontrar (opcional)<textarea name="llmExample" rows="3" maxlength="500" placeholder="Felicidad → érgon → alma, incluyendo conexiones a distancia de tres aristas">${esc(llm.example)}</textarea></label><p class="lq-hint">El tutor propone consultas que se validan antes de poder cargarlas; no se ejecutan automáticamente.</p>`:''}
        ${llm.mode==='grafo'?'<p class="lq-hint">Hasta dos rondas adicionales de herramientas; un crédito por turno.</p>':''}
        ${llm.mode!=='cypher'?`<p class="lq-hint">${llm.selected.length?`Citas propuestas desde el buscador (${llm.selected.length}): ${llm.selected.map(x=>`<code>${esc(x.reference)}</code>`).join(' · ')}. El servidor verifica los identificadores.`:'Sin citas seleccionadas: hasta cuatro subunidades pertinentes, más citas anteriores y contexto cercano cuando corresponda.'}</p>
        ${llm.selected.length?'<button type="button" class="lq-link" data-llm-sources-clear>Quitar selección de citas</button>':''}`:''}
        <div class="lq-actions"><button type="submit" class="lq-primary" ${llm.pending||!status?.configured||status?.remaining===0?'disabled':''}>${llm.pending?'Generando…':'Enviar pregunta · 1 crédito'}</button>
        <button type="button" data-llm-status ${llm.pending?'disabled':''}>Actualizar cupo</button></div>
      </form>
      ${llm.error?`<p class="lq-alert" role="alert">${esc(llm.error)}</p>`:''}
      <p class="lq-hint">${status?.auditEnabled?'Las preguntas y respuestas se registran en MariaDB para revisión editorial.':'El registro en MariaDB requiere activar AGORA_LLM_AUDIT_ENABLED=1 tras aplicar la migración.'} No envíes datos personales ni claves. OpenRouter y el modelo seleccionado procesan las consultas y las fuentes; verificá cada explicación con el texto.</p>
    </section>`;
  }
  function scrollToLatest(){
    const pane=el.querySelector('.lq-conversation');
    if(pane)pane.scrollTop=pane.scrollHeight;
  }
  async function sendLLM(){
    if(state.llm.pending)return;
    rememberFields();
    const llm=state.llm;
    llm.error='';
    const question=llm.question.trim();
    const mode=llm.mode;
    const fullQuestion=mode==='cypher'&&llm.example.trim()?question+'\nEjemplo de intención: '+llm.example.trim():question;
    if(fullQuestion.length>1500){llm.error='La pregunta y el ejemplo juntos deben tener hasta 1500 caracteres.';render();return;}
    if(!question){llm.error='Escribí una pregunta.';render();return;}
    const requestId=globalThis.crypto?.randomUUID?.().replaceAll('-','') || `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const previous=llm.history.filter(h=>!h.pending&&!h.error&&h.answer&&h.mode!=='cypher').slice(-5).map(h=>h.requestId);
    const item={question:fullQuestion,mode,answer:'',editorialAudit:'',auditMissing:false,pending:true,model:'OpenRouter',sources:[],fichas:[],promptVersion:'',requestId,incomplete:false};
    llm.pending=true;llm.history.push(item);llm.history=llm.history.slice(-6);
    // El usuario ve inmediatamente su pregunta, antes de recibir el primer token.
    llm.question='';render();scrollToLatest();
    try{
      const resp=await fetch('/api/llm/chat/stream',{method:'POST',credentials:'same-origin',signal:abort.signal,
        headers:{'Content-Type':'application/json','Accept':'text/event-stream'},body:JSON.stringify({question:fullQuestion,mode,
          requestId,revision:data.revision,sourceIds:mode==='cypher'?[]:llm.selected.map(x=>x.id),historyIds:mode==='cypher'?[]:previous})});
      let ended=false;
      await readAgoraLLMStream(resp,(kind,payload)=>{
        if(kind==='graph'){
          item.graphTrace=payload;const panel=el.querySelector(`[data-llm-graph="${llm.history.indexOf(item)}"]`);
          if(panel)panel.innerHTML='<p class="lq-hint">Exploración en curso…</p>';scrollToLatest();
        }else if(kind==='meta'){
          item.sources=payload.sources||[];item.fichas=payload.fichas||[];item.promptVersion=payload.promptVersion;
        }else if(kind==='delta'){
          item.answer+=payload.text||'';
          const p=el.querySelector(`[data-llm-answer="${llm.history.indexOf(item)}"]`);
          if(p)p.textContent=item.answer; // texto, nunca innerHTML con contenido del proveedor
          scrollToLatest();
        }else if(kind==='audit_delta'){
          // Auditoría interna: no se inserta en el DOM del lector.
        }else if(kind==='done'){
          ended=true;item.answer=payload.answer||item.answer;
          item.queries=payload.queries||null;

          item.model=payload.model||'OpenRouter';
          item.incomplete=!!payload.incomplete;item.auditStored=payload.auditStored;
          item.sources=payload.sources||item.sources;item.fichas=payload.fichas||item.fichas;item.graphTrace=payload.graphTrace||item.graphTrace;
          item.promptVersion=payload.promptVersion||item.promptVersion;
          llm.status={...llm.status,used:payload.used,pending:payload.pending,remaining:payload.remaining};
          llm.selected=[];
        }else if(kind==='error'){
          ended=true;item.error=payload.error||'La transmisión se interrumpió.';
          llm.error=item.error;
          if(Number.isInteger(payload.remaining))llm.status={...llm.status,...payload};
        }
      });
      if(!ended)throw Error('La conexión terminó sin una respuesta final.');
    }catch(err){
      if(err.name!=='AbortError'){item.error=err.message;llm.error=err.message;}
    }finally{
      item.pending=false;llm.pending=false;
      if(!destroyed){render();scrollToLatest();if(llm.error)loadLLMStatus();}
    }
  }
  function render(){
    if(destroyed || !data)return;
    disposeGraphs();
    el.innerHTML=`<div class="lq-inner">
      <nav class="lq-nav"><a href="#/lab">← Laboratorio</a> <span>Ágora · N1-U.18.4</span></nav>
      <header>${controlesTamanoLector()}<h1>Consultas y recuperación</h1><p>Explorá citas por palabras, categorías y grafos; contrastá tus preguntas con un asistente LLM fundamentado en pasajes del Libro I.</p></header>
      <p class="lq-hint">${data.docs.length} documentos · revisión ${esc(data.revision.slice(0,14))} · ${data.editorialReady?'Fichas compatibles con el corpus':'Las fichas y sus aristas están desactivadas: falta coincidencia de revisión'}.</p>
      <div class="lq-modes" role="group" aria-label="Lenguaje de consulta">${modes.map(([id,name])=>`<button type="button" data-mode="${id}" aria-pressed="${id===state.mode}" class="${id===state.mode?'active':''}">${name}</button>`).join('')}</div>
      ${state.mode==='llm'?renderLLM():`<form id="lq-form" class="lq-form">
      ${state.mode==='natural'?`<label>Pregunta en lenguaje natural<textarea name="natural" rows="3" placeholder="¿Qué relación hay entre felicidad y virtud?">${esc(state.natural)}</textarea></label><p class="lq-hint">Esta pestaña recupera por palabras. Para buscar exclusivamente por etiquetas, abrí «Solo categorías».</p>`:''}
      ${state.mode==='visual'?`<label>Conceptos o texto que querés encontrar<input name="visualQuery" value="${esc(state.visualQuery)}" placeholder="felicidad actividad"></label>`:''}
      ${state.mode==='cypher'?`<label>Patrón de grafo (subconjunto seguro de Cypher)<textarea name="cypher" rows="5" spellcheck="false">${esc(state.cypher)}</textarea></label><p class="lq-hint">Soporta relaciones <code>RELACIONADA_CON</code> entre fichas y <code>SEARCH 'texto'</code> opcional. No ejecuta Cypher ni consulta grafos externos. Admite recorridos simples de 1 a 3 aristas.</p><button type="button" data-cypher-tutor>Aprender Cypher con el asistente</button>`:''}
      ${state.mode==='hibrido'?`<label>Consulta híbrida (sintaxis restringida inspirada en SQL)<textarea name="hybrid" rows="5" spellcheck="false">${esc(state.hybrid)}</textarea></label><p class="lq-hint">Campos permitidos: TIPO, FICHA, ESTATICA, FUNCIONAL, MODO y LIMIT. No acepta sentencias SQL arbitrarias.</p>`:''}
      ${(state.mode==='visual'||state.mode==='natural'||state.mode==='categorias')?`<div class="lq-filters">
        <label>Tipo<select name="type">${options([['ambos','Subunidades y párrafos'],['subunidad','Subunidades'],['parrafo','Párrafos']],state.visualType)}</select></label>
        <label>Ficha / FAQ<select name="sheet"><option value="">Todas las fichas y pasajes</option>${[...data.sheets.values()].map(f=>`<option value="${esc(f.id)}" ${f.id===state.visualSheet?'selected':''}>${esc(f.title)}</option>`).join('')}</select></label>
        <label>Etiquetas<select name="filter">${options([['boost','Priorizar'],['restrict','Restringir']],state.visualFilter)}</select></label>
        <label>Máximo<select name="limit">${options([['6','6'],['12','12'],['20','20'],['30','30']].map(([n,t])=>[n,t]),String(state.visualLimit))}</select></label>
      </div>${state.mode==='natural'?'':`<div class="lq-facets">${facets('static',data.staticChoices,state.staticTags)}${facets('functional',data.functionalChoices,state.functionalTags)}</div><button type="button" class="lq-link" data-more>${state.showAllTags?'Mostrar menos categorías':'Mostrar todas las categorías'}</button>`}`:''}
      <div class="lq-actions"><button class="lq-primary" type="submit">Ejecutar consulta</button> <button type="button" data-clear>Limpiar resultados</button></div>
      </form>
      ${renderResults()}`}
      <footer class="lq-hint">El término <em>lógos</em> puede designar razón, argumento o discurso; el índice todavía no diferencia esos sentidos. Esta observación se conserva para el contrato de tagueo del Libro II.</footer>
    </div>`;
    actualizarLectura(el);
    disposeGraphs=hydrateLLMGraphs(el);
    el.querySelectorAll('[data-reader-font-step]').forEach(b=>b.addEventListener('click',()=>{const size=cambiarTamanoLector(el,Number(b.dataset.readerFontStep));disposeGraphs.fontSize?.(size);}));
    el.querySelector('[data-cypher-tutor]')?.addEventListener('click',()=>{rememberFields();state.mode='llm';state.llm.mode='cypher';render();if(!state.llm.status)loadLLMStatus();});
    el.querySelector('#lq-llm-form select[name=llmMode]')?.addEventListener('change',()=>{rememberFields();render();});
    el.querySelectorAll('[data-use-query]').forEach(b=>b.addEventListener('click',()=>{
      const [i,j]=b.dataset.useQuery.split(':').map(Number);const q=state.llm.history[i]?.queries?.accepted?.[j];if(!q)return;
      rememberFields();state.cypher=q.query;state.mode='cypher';state.result=null;state.error='';render();
    }));
    el.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{
      rememberFields();state.mode=btn.dataset.mode;state.result=null;state.error='';render();
      if(state.mode==='llm'&&!state.llm.status)loadLLMStatus();
    }));
    el.querySelector('#lq-form')?.addEventListener('submit',e=>{e.preventDefault();rememberFields();execute();render();});
    el.querySelector('#lq-llm-form')?.addEventListener('submit',e=>{e.preventDefault();sendLLM();});
    el.querySelector('[data-llm-status]')?.addEventListener('click',()=>{state.llm.error='';loadLLMStatus();});
    el.querySelector('[data-llm-sources-clear]')?.addEventListener('click',()=>{rememberFields();state.llm.selected=[];render();});
    el.querySelectorAll('[data-tag]').forEach(input=>input.addEventListener('change',()=>{
      rememberFields();const key=input.dataset.tag==='static'?'staticTags':'functionalTags';
      state[key]=input.checked?[...new Set([...state[key],input.value])]:state[key].filter(x=>x!==input.value);
    }));
    el.querySelector('[data-more]')?.addEventListener('click',()=>{rememberFields();state.showAllTags=!state.showAllTags;render();});
    el.querySelector('[data-clear]')?.addEventListener('click',()=>{state.result=null;state.error='';render();});
    el.querySelector('[data-to-llm]')?.addEventListener('click',()=>{
      const hits=state.result?.hits||[];
      state.llm.selected=hits.filter(h=>h.es&&h.gr).slice(0,4).map(h=>({id:h.id,reference:h.reference}));
      if(!state.llm.question)state.llm.question=state.result.ast.query;
      state.mode='llm';render();if(!state.llm.status)loadLLMStatus();
    });
    el.querySelector('[data-export]')?.addEventListener('click',()=>{
      const payload={schema:'agora.query-result.v1',revision:data.revision,
        ast:state.result.ast,relations:state.result.graph.edges,paths:state.result.graph.paths||[],
        citations:state.result.hits.map(h=>({id:h.id,reference:h.reference,score:h.score,cosine:h.cosine,tagBonus:h.tagBonus,matchedTerms:h.matchedTerms})),
        note:'Coincidencia léxica y relaciones editoriales; no prueba apoyo ni refutación'};
      const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
      const a=document.createElement('a');a.href=url;a.download='agora-n1u16-consulta.json';a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
  }
  loadData(abort.signal).then(d=>{if(destroyed)return;data=d;render();}).catch(error=>{
    if(destroyed)return;el.innerHTML=`<div class="lq-inner" role="alert"><a href="#/lab">← Laboratorio</a><h2>No se pudo preparar el experimento</h2><p>${esc(error.message)}</p></div>`;
  });
  return {el,destroy(){destroyed=true;disposeGraphs();abort.abort();}};
}
