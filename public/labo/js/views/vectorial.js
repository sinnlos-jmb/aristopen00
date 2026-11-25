import { esc } from '../ui.js';
import { parseBook } from '../../../js/reader/text.js';
import { buildEvidenceDocuments, buildSheetLinks, makeIndex, searchIndex, categoryChoices } from '../vectorial-engine.js';

const array = v=>Array.isArray(v)?v:[];
const initialState = () => ({
  query:'', contrast:'', claim:'', type:'ambos', filterMode:'boost', sheetId:'',
  staticTags:[], functionalTags:[], limit:12, searched:false, expandedTags:false, status:'',
});
const getJSON = async url => {
  const r=await fetch(url,{cache:'no-store'});
  if (!r.ok) throw Error(`${url}: HTTP ${r.status}`);
  return r.json();
};
const label=(id,map)=>map.get(id)||id.replaceAll('_',' ');

async function loadIndex(app) {
  if (app.vectorialIndex) return app.vectorialIndex;
  const [lectura, texto, f5, f6, f7] = await Promise.all([
    getJSON('/api/labo/lectura'),
    fetch('/api/texto/EN_libro1_v8.txt',{cache:'no-store'}).then(async r=>{
      if(!r.ok) throw Error(`No se pudo cargar el texto bilingüe (${r.status}).`);
      return r.text();
    }),
    getJSON('/lab/n1u5-fichas-explicativas.json').catch(()=>null),
    getJSON('/lab/n1u6-puentes-explicativos.json').catch(()=>null),
    getJSON('/lab/n1u7-fichas-red-piloto.json').catch(()=>null),
  ]);
  const book=parseBook(texto);
  const data=buildEvidenceDocuments(lectura,book);
  const index=makeIndex(data.documents);
  const links=buildSheetLinks([f5,f7].filter(Boolean),f6);
  const sheets=new Map();
  for(const [sub,items] of links) for(const f of items) {
    if(!sheets.has(f.id)) sheets.set(f.id,{id:f.id,title:f.title,supports:[]});
    sheets.get(f.id).supports.push(sub);
  }
  const labels=new Map(array(app.corpus?.catalog?.criteria).map(x=>[x.id,x.label||x.id]));
  const staticChoices=categoryChoices(index.documents,'static');
  const functionalChoices=categoryChoices(index.documents,'functional');
  const editorialRevisions=[f5?.fuente?.revision,f6?.fuente?.revision,f7?.fuente?.revision].filter(Boolean);
  const matching=editorialRevisions.every(rev=>rev===lectura.revision);
  const obj={...data,index,links:matching?links:new Map(),sheets:matching?sheets:new Map(),staticChoices,functionalChoices,labels,
    editorialState:matching?'Correspondencia de revisión comprobada':'Revisión de las fichas distinta o no disponible: enlaces desactivados',
    sheetsPresent:Boolean(f5&&f7)};
  app.vectorialIndex=obj;
  return obj;
}

function renderCategoryOptions(choices,selected,map,name,expanded) {
  if(!choices.length) return '<span class="vexp-muted">Sin etiquetas registradas de esta clase.</span>';
  const shown=expanded?choices:choices.slice(0,14);
  const options=shown.map(x=>`<label class="vexp-toggle"><input type="checkbox" data-category="${esc(name)}" value="${esc(x.id)}" ${selected.includes(x.id)?'checked':''}><span>${esc(label(x.id,map))}</span><small>${x.count}</small></label>`).join('');
  return options + (choices.length>14?`<button type="button" data-more-categories="1" class="vexp-small">${expanded?'Mostrar menos':`Ver las ${choices.length} categorías`}</button>`:'');
}
function renderHits(results,data,headline,warning='') {
  if (!results.length) return `<section class="vexp-results"><h3>${esc(headline)}</h3><p class="vexp-muted">No se recuperaron coincidencias con los términos y filtros seleccionados. Esto no demuestra la ausencia del concepto en la obra.</p></section>`;
  return `<section class="vexp-results"><h3>${esc(headline)} <small>(${results.length})</small></h3>
    ${warning?`<p class="vexp-muted">${esc(warning)}</p>`:''}
    ${results.map((r,i)=>{
      const linked=new Map(r.relatedSubunits.flatMap(id=>data.links.get(id)||[]).map(f=>[f.id,f]));
      const tags=[...r.matchedStatic.map(x=>`estática: ${label(x,data.labels)}`),...r.matchedFunctional.map(x=>`funcional: ${label(x,data.labels)}`)];
      const snippet=r.es.trim().replace(/\s+/g,' ').slice(0,310);
      return `<article class="vexp-hit">
        <header><span class="vexp-rank">${i+1}</span><div><strong>${esc(r.title)}</strong><div class="vexp-muted">${r.kind==='parrafo'?'Párrafo bilingüe':'Subunidad'} · ${esc(r.reference)} · ${esc(r.unit)}</div></div><b title="Puntuación relativa, no probabilidad filosófica">${r.score.toFixed(3)}</b></header>
        <p>${esc(snippet)}${r.es.length>310?'…':''}</p>
        <details><summary>Ver cita bilingüe y explicación del puntaje</summary>
          <div class="vexp-bilingual"><div><h4>Castellano</h4><p>${esc(r.es||r.intro||'Pasaje no localizado con las anclas disponibles.')}</p></div><div><h4>Griego</h4><p lang="grc">${esc(r.gr||'Pasaje griego no localizado.')}</p></div></div>
          <p class="vexp-muted">Coseno TF-IDF: ${r.cosine.toFixed(3)} · coincidencia de frase: ${r.exact.toFixed(3)} · etiquetas: ${r.tagBonus.toFixed(3)}</p>
          <p class="vexp-muted">Términos: ${esc(r.matchedTerms.join(', ')||'sin coincidencia léxica')} · Coincidencias de tags: ${esc(tags.join('; ')||'ninguna')}</p>
          <p class="vexp-muted">Procedencia: ${esc(r.tagOrigin)}.</p>
        </details>
        <div class="vexp-actions">
          ${[...linked.values()].map(f=>`<a href="${esc(f.url)}" title="${esc(f.reason)}">Ficha: ${esc(f.title)}</a>`).join('')}
          <a href="/#/reading" title="Abrir la biblioteca bilingüe">Biblioteca</a>
        </div>
      </article>`;
    }).join('')}
  </section>`;
}

function renderContents(root,app,data) {
  const s=app.vectorialUI;
  const params={query:s.query,type:s.type,filterMode:s.filterMode,staticTags:s.staticTags,functionalTags:s.functionalTags,limit:s.limit,
    supportSubIds:s.sheetId && data.sheets.has(s.sheetId)?data.sheets.get(s.sheetId).supports:null};
  const results=s.searched?searchIndex(data.index,params):[];
  const contrasts=s.searched && s.contrast.trim()?searchIndex(data.index,{...params,query:s.contrast}):[];
  root.classList.add('vexp-page');
  root.innerHTML=`<div class="vexp-wrapper">
    <header class="vexp-heading"><div><span class="eyebrow">Ágora · N1-U.15 · Exploración experimental</span><h1>Citas y relaciones documentales</h1>
    <p>Recuperación vectorial TF-IDF sobre el Libro I. Las coincidencias ayudan a localizar pasajes y revisar interpretaciones; <strong>no prueban por sí mismas que un texto apoye o refute una lectura</strong>.</p></div>
    <a href="#/buscar">Buscador y Query Builder anterior</a></header>
    <p class="vexp-muted">${data.index.size} documentos: ${data.documents.filter(x=>x.kind==='subunidad').length} subunidades y ${data.documents.filter(x=>x.kind==='parrafo').length} párrafos · revisión documental: ${esc(data.revision.slice(0,14))}… · ${esc(data.editorialState)}</p>
    <form id="vexp-form" class="vexp-form">
      <div class="vexp-grid2"><label>Buscar una cita, una idea o una pregunta<input name="query" type="search" value="${esc(s.query)}" placeholder="Ej.: la felicidad es actividad" autocomplete="off"></label>
        <label>Consulta alternativa para contrastar (opcional)<input name="contrast" type="search" value="${esc(s.contrast)}" placeholder="Ej.: posesión de la virtud"></label></div>
      <label>Lectura o hipótesis que estamos examinando (anotación, no entra al ranking)<textarea name="claim" rows="2" placeholder="Ej.: un especialista privilegia un pasaje para interpretar la felicidad">${esc(s.claim)}</textarea></label>
      <div class="vexp-options">
        <label>Ficha o FAQ de referencia<select name="sheetId"><option value="">Todo el Libro I</option>${[...data.sheets.values()].map(f=>`<option value="${esc(f.id)}" ${s.sheetId===f.id?'selected':''}>${esc(f.title)}</option>`).join('')}</select></label>
        <label>Unidad de recuperación<select name="type"><option value="ambos" ${s.type==='ambos'?'selected':''}>Subunidades y párrafos</option><option value="subunidad" ${s.type==='subunidad'?'selected':''}>Solo subunidades</option><option value="parrafo" ${s.type==='parrafo'?'selected':''}>Solo párrafos</option></select></label>
        <label>Etiquetas seleccionadas<select name="filterMode"><option value="boost" ${s.filterMode==='boost'?'selected':''}>Aumentan prioridad</option><option value="restrict" ${s.filterMode==='restrict'?'selected':''}>Filtran resultados</option></select></label>
        <label>Máximo de resultados<select name="limit">${[6,12,20,30].map(n=>`<option value="${n}" ${s.limit===n?'selected':''}>${n}</option>`).join('')}</select></label>
      </div>
      <div class="vexp-facets"><fieldset><legend>Categorías estáticas · conceptos</legend>${renderCategoryOptions(data.staticChoices,s.staticTags,data.labels,'static',s.expandedTags)}</fieldset>
        <fieldset><legend>Categorías funcionales · movimientos</legend>${renderCategoryOptions(data.functionalChoices,s.functionalTags,data.labels,'functional',s.expandedTags)}</fieldset></div>
      <div class="vexp-form-actions"><button class="primary" type="submit">Recuperar citas</button><button type="button" data-reset>Limpiar filtros</button>${s.searched?'<button type="button" data-export>Exportar resultados JSON</button>':''}</div>
    </form>
    ${s.searched?`<div class="vexp-comparisons">${renderHits(results,data,'Candidatos para lectura y examen')}${s.contrast.trim()?renderHits(contrasts,data,'Consulta de contraste','Estos resultados no son automáticamente objeciones: hay que leerlos en su contexto.') : ''}</div>`:'<section class="vexp-empty"><h2>¿Qué querés investigar?</h2><p>Ejemplo: buscá «felicidad actividad» y contrastá con «placer honor riqueza». Seleccioná conceptos o movimientos argumentativos para ampliar o restringir el conjunto de pasajes.</p></section>'}
    <footer class="vexp-muted">Las fichas se enlazan solo por apoyos editoriales registrados en los JSON piloto y únicamente cuando coincide su revisión. Los párrafos pueden heredar categorías de subunidades por anclas verificadas; el ranking no establece relaciones argumentativas nuevas ni altera MariaDB.</footer>
  </div>`;
  root.querySelector('#vexp-form').addEventListener('submit',e=>{
    e.preventDefault();
    const form=e.currentTarget;
    s.query=form.elements.query.value.trim();
    s.contrast=form.elements.contrast.value.trim();
    s.claim=form.elements.claim.value.trim();
    s.type=form.elements.type.value;
    s.sheetId=form.elements.sheetId.value;
    s.filterMode=form.elements.filterMode.value;
    s.limit=Number(form.elements.limit.value);
    s.searched=true;
    renderContents(root,app,data);
  });
  root.querySelectorAll('[data-category]').forEach(input=>input.addEventListener('change',()=>{
    const key=input.dataset.category==='static'?'staticTags':'functionalTags';
    s[key]=input.checked?[...new Set([...s[key],input.value])]:s[key].filter(x=>x!==input.value);
    // No perder texto escrito al alternar una categoría.
    const f=root.querySelector('#vexp-form');
    s.query=f.elements.query.value;s.contrast=f.elements.contrast.value;s.claim=f.elements.claim.value;
  }));
  root.querySelector('[data-more-categories]')?.addEventListener('click',()=>{
    const f=root.querySelector('#vexp-form');
    s.query=f.elements.query.value;s.contrast=f.elements.contrast.value;s.claim=f.elements.claim.value;
    s.expandedTags=!s.expandedTags;renderContents(root,app,data);
  });
  root.querySelector('[data-reset]')?.addEventListener('click',()=>{
    Object.assign(s,initialState());renderContents(root,app,data);
  });
  root.querySelector('[data-export]')?.addEventListener('click',()=>{
    const payload={schema:'agora.lab.n1u15.revision.v1',revision:data.revision,claim:s.claim,query:s.query,contrast:s.contrast,
      options:params,warning:'Similitud léxica y filtros no prueban apoyo ni refutación',
      candidates:results.map(({id,kind,reference,score,cosine,exact,tagBonus,relatedSubunits})=>({id,kind,reference,score,cosine,exact,tagBonus,relatedSubunits})),
      comparison:contrasts.map(({id,kind,reference,score,cosine,exact,tagBonus})=>({id,kind,reference,score,cosine,exact,tagBonus}))};
    const href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=href;a.download='agora-n1u15-resultados.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);
  });
}
export async function render(root,app,route) {
  if(!app.vectorialUI) app.vectorialUI=initialState();
  const routeQuery=route.query.get('q');
  if(routeQuery!=null && !app.vectorialUI.searched) app.vectorialUI.query=routeQuery;
  root.innerHTML='<div class="loading">Preparando índice de subunidades y párrafos…</div>';
  try {
    const data=await loadIndex(app);
    renderContents(root,app,data);
  } catch(error) {
    root.innerHTML=`<section class="placeholder"><h2>No se pudo preparar el índice vectorial</h2><p>${esc(error.message)}</p><a href="#/buscar">Volver al buscador editorial</a></section>`;
  }
}
