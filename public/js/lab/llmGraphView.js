import { esc } from '../ui.js';
import { expandGraph, pruneRoots } from './graphExpansion.js';
const arr=x=>Array.isArray(x)?x:[];
const safeURL=u=>typeof u==='string'&&/^\/#\/fichas\/[a-z]+$/.test(u);
const title=n=>n?.title||n?.reference||n?.id||'';
const nodeLink=n=>safeURL(n?.url)?`<a href="${esc(n.url)}">${esc(title(n))}</a>`:esc(title(n));
let seq=0;
// Fallback SVG sin dependencias; el grafo interactivo se monta al desplegarlo.
function svgFallback(fichas,edges){
  const id=`lq-arrow-${++seq}`, w=800,h=500, positions=new Map();
  fichas.forEach((n,i)=>{const a=-Math.PI/2+2*Math.PI*i/Math.max(1,fichas.length);positions.set(n.id,{x:fichas.length===1?w/2:w/2+280*Math.cos(a),y:fichas.length===1?h/2:h/2+180*Math.sin(a)});});
  const lines=edges.map(e=>{const a=positions.get(e.from),b=positions.get(e.to);if(!a||!b)return '';const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1;const x1=a.x+dx/d*65,y1=a.y+dy/d*26,x2=b.x-dx/d*65,y2=b.y-dy/d*26;return `<path d="M${x1} ${y1} Q${(x1+x2)/2-dy*.12} ${(y1+y2)/2+dx*.12} ${x2} ${y2}" class="lq-graph-edge" marker-end="url(#${id})"><title>${esc(e.label)}</title></path>`;}).join('');
  const nodes=fichas.map(n=>{const {x,y}=positions.get(n.id);const words=String(title(n)).split(/\s+/);const rows=[];for(const word of words){if(!rows.length||rows.at(-1).length+word.length+1>24)rows.push(word);else rows[rows.length-1]+=' '+word;}const shape=`<rect x="${x-91}" y="${y-32}" width="182" height="64" rx="7" class="lq-graph-ficha"/><title>${esc(title(n))}</title>${rows.slice(0,3).map((r,i)=>`<text x="${x}" y="${y+(i-1)*15+5}" text-anchor="middle" ${r.length>15?'textLength="166" lengthAdjust="spacingAndGlyphs"':''}>${esc(i===2&&rows.length>3?r+'…':r)}</text>`).join('')}`;return safeURL(n.url)?`<a href="${esc(n.url)}">${shape}</a>`:`<g>${shape}</g>`;}).join('');
  return `<svg viewBox="0 0 ${w} ${h}" role="group" aria-label="Relaciones entre fichas"><defs><marker id="${id}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="currentColor"/></marker></defs>${lines}${nodes}</svg>`;
}
export function graphViews(trace){
  const nodes=arr(trace?.nodes), byId=new Map(nodes.map(n=>[n.id,n]));
  const fichas=nodes.filter(n=>n.type==='ficha');
  const relations=arr(trace?.edges).filter(e=>e.type!=='apoyo'&&byId.get(e.from)?.type==='ficha'&&byId.get(e.to)?.type==='ficha');
  const support=arr(trace?.edges).filter(e=>e.type==='apoyo'&&byId.has(e.from)&&byId.has(e.to));
  const edgeMap=new Map(relations.map(e=>[e.id,e]));
  const paths=arr(trace?.paths).filter(p=>Array.isArray(p.ids)&&p.ids.length>=2&&p.ids.length<=4&&Array.isArray(p.edgeIds)&&p.edgeIds.length===p.ids.length-1&&p.ids.every(id=>byId.get(id)?.type==='ficha')&&p.edgeIds.every((id,i)=>{const e=edgeMap.get(id);return e&&((e.from===p.ids[i]&&e.to===p.ids[i+1])||(e.to===p.ids[i]&&e.from===p.ids[i+1]));}));
  return {fichas,relations,support,paths,byId,passages:nodes.filter(n=>n.type==='pasaje')};
}
export function renderLLMGraph(trace,catalog=null,previews=new Map()){
  if(!trace)return '';
  const {fichas,relations,support,paths,byId,passages}=graphViews(trace);
  const local=trace.state==='consulta_local';
  const status=trace.state==='explorando'?'Consultando el catálogo editorial…':trace.state==='sin_consultas_validas'?'No se recuperaron relaciones válidas.':trace.state==='interrumpido'?'Exploración interrumpida.':trace.state==='parcial'?'Exploración limitada; se conservan los resultados válidos y la respuesta continúa con la evidencia disponible.':'Relaciones editoriales registradas; no equivalen a afirmaciones textuales de Aristóteles.';
  const compact=n=>({id:n.id,title:title(n),url:safeURL(n.url)?n.url:null,preview:previews.get(n.id)||null});
  const graphData={nodes:fichas.map(compact),edges:relations.map(({id,from,to,label})=>({id,from,to,label})),catalog:local&&catalog?{nodes:arr(catalog.nodes).map(compact),edges:arr(catalog.edges).map(({id,from,to,label})=>({id,from,to,label}))}:null};
  const pathMarkup=paths.length?`<details><summary>Caminos ${local?'encontrados':'consultados'} (${paths.length})</summary><p class="lq-hint">Caminos verificados por el intérprete. No equivalen necesariamente al recorrido pedagógico recomendado en la explicación.</p>${paths.slice(0,20).map(p=>`<ol class="lq-path">${p.ids.map((id,i)=>{const e=i?relations.find(x=>x.id===p.edgeIds[i-1]):null;return `<li>${e?`<small>${e.from===p.ids[i-1]?'↓':'↑'} ${esc(e.label)}${e.from!==p.ids[i-1]?' (sentido inverso)':''}</small>`:''}${nodeLink(byId.get(id))}</li>`;}).join('')}</ol>`).join('')}${paths.length>20?'<p>Se muestran los primeros 20 caminos.</p>':''}</details>`:'';
  return `<details class="lq-graph-trace" ${local?'open':''}><summary>${local?'Grafo de la consulta local':'Recorrido del grafo'} · ${fichas.length} ${fichas.length===1?'ficha':'fichas'} · ${relations.length} ${relations.length===1?'relación':'relaciones'}</summary>
    <p class="lq-hint">${status}</p>${pathMarkup}
    ${fichas.length?`<details class="lq-subgraph" open><summary>Subgrafo de fichas</summary><div data-lq-cy="${esc(JSON.stringify(graphData))}"><div class="lq-cy-host" hidden></div><div class="lq-graph-scroll">${svgFallback(fichas,relations)}</div><p class="lq-cy-selection" aria-live="polite"></p><div class="lq-cy-controls" hidden><button type="button" data-lq-expand disabled>Expandir / colapsar selección</button> <button type="button" data-lq-reset>Restaurar consulta</button><p class="lq-hint">Clic en una ficha: ver resumen sin salir de la consulta. Doble clic: expandir o colapsar vecinos hasta dos aristas. Los vecinos agregados tienen bordes discontinuos. Las expansiones son visuales; no cambian la consulta ni las citas.</p><p class="lq-cy-count" aria-live="polite"></p></div></div><ul>${relations.map(e=>`<li>${nodeLink(byId.get(e.from))} → <b>${esc(e.label)}</b> → ${nodeLink(byId.get(e.to))}</li>`).join('')}</ul><p>${fichas.map(nodeLink).join(' · ')}</p></details>`:''}
    ${passages.length?`<details><summary>Apoyos documentales y pasajes encontrados (${passages.length})</summary>${fichas.map(n=>{const es=support.filter(e=>e.from===n.id);return es.length?`<section><strong>${nodeLink(n)}</strong><ul>${es.map(e=>`<li>${esc(byId.get(e.to).reference||e.to)} · ${esc(title(byId.get(e.to)))}${e.rol?` — ${esc(e.rol)}`:''}</li>`).join('')}</ul></section>`:'';}).join('')}${passages.filter(n=>!support.some(e=>e.to===n.id)).map(n=>`<p>${esc(n.reference||n.id)} · ${esc(title(n))} (sin arista de apoyo recuperada)</p>`).join('')}<p class="lq-hint">Los pasajes encontrados no son necesariamente los usados como fuentes de la respuesta. Consultá las fuentes verificadas aparte.</p></details>`:''}
  </details>`;
}
// Carga diferida del mismo motor que usa Arquitectura. Si no está disponible,
// el SVG y los enlaces permanecen utilizables. No se carga una segunda biblioteca.
// Vista previa editorial: dialog nativo, sin alterar URL, historial ni consulta.
export function previewMarkup(n){
  const p=n.preview;
  return `<h3>${esc(n.title)}</h3>${p?`<p class="lq-hint">Material editorial · ${esc(p.estado)}</p>${arr(p.introduccion).map(t=>`<p>${esc(t)}</p>`).join('')}${arr(p.referencias).length?`<h4>Referencias</h4><ul>${p.referencias.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>`:''}`:'<p>No hay un resumen editorial compatible disponible para esta ficha.</p>'}${safeURL(n.url)?`<p><a href="${esc(n.url)}" target="_blank" rel="noopener noreferrer">Abrir ficha completa en otra pestaña</a></p>`:''}<form method="dialog"><button autofocus>Cerrar</button></form>`;
}
export function hydrateLLMGraphs(root,load=async()=>{const {cargarCytoscape}=await import('./cytoscapeLoader.js');return cargarCytoscape();}){
  let disposed=false;const cleanups=[],fontUpdates=[];
  for(const panel of root.querySelectorAll('[data-lq-cy]')){
    const host=panel.querySelector('.lq-cy-host'),fallback=panel.querySelector('.lq-graph-scroll'),selection=panel.querySelector('.lq-cy-selection');
    const details=[];for(let p=panel.parentElement;p&&p!==root;p=p.parentElement)if(p.tagName==='DETAILS')details.push(p);
    let cy=null,loading=false,failed=false,tapTimer=null,dialog=null;
    const parsed=JSON.parse(panel.dataset.lqCy);
    const lookup=new Map([...arr(parsed.catalog?.nodes),...arr(parsed.nodes)].map(n=>[n.id,n]));
    function showPreview(id){const n=lookup.get(id);if(!n)return;
      if(!dialog){dialog=document.createElement('dialog');dialog.className='lq-ficha-dialog';dialog.setAttribute('aria-label','Ficha editorial resumida');panel.appendChild(dialog);}
      dialog.innerHTML=previewMarkup(n);if(!dialog.open)dialog.showModal();
    }
    const fallbackClick=e=>{const a=e.target.closest?.('a');if(!a)return;const n=[...lookup.values()].find(n=>n.url===a.getAttribute('href'));if(n){e.preventDefault();showPreview(n.id);}};
    fallback.addEventListener('click',fallbackClick);
    let cleanupControls=()=>{};
    const visible=()=>!disposed&&panel.isConnected&&details.every(d=>d.open);
    async function mount(){
      if(!visible()||loading||failed)return;
      if(cy){cy.resize();return;}
      loading=true;
      try{
        const cytoscape=await load();
        if(!visible())return;
        const {nodes,edges,catalog}=JSON.parse(panel.dataset.lqCy);const style=getComputedStyle(root);const color=style.color||'#333';const size=Math.max(14,Math.min(30,parseFloat(style.getPropertyValue('--agora-reader-font-size'))||18));
        host.hidden=false;
        cy=cytoscape({container:host,elements:[...nodes.map(n=>({data:{id:n.id,label:n.title,url:n.url}})),...edges.map((e,i)=>({data:{id:`rel:${e.id}`,source:e.from,target:e.to,label:e.label}}))],layout:{name:'circle',padding:55},minZoom:.25,maxZoom:3,wheelSensitivity:.6,boxSelectionEnabled:false,style:[{selector:'node',style:{'label':'data(label)','shape':'round-rectangle','background-color':'#86a5ae','background-opacity':.28,'border-color':color,'border-width':1,'color':color,'font-family':'monospace','font-size':size,'text-wrap':'wrap','text-max-width':Math.max(175,size*11),'text-valign':'center','text-halign':'center','width':Math.max(195,size*12),'height':Math.max(76,size*4.6)}},{selector:'edge',style:{'curve-style':'bezier','line-color':color,'target-arrow-color':color,'target-arrow-shape':'triangle','width':1.5,'opacity':.55}},{selector:'edge:selected',style:{'label':'data(label)','font-size':size*.85,'font-family':'monospace','color':color,'text-wrap':'wrap','text-max-width':180,'opacity':1}},{selector:'node:selected',style:{'border-width':3,'background-opacity':.65}}]});
        const controls=panel.querySelector('.lq-cy-controls'),expandButton=controls?.querySelector('[data-lq-expand]'),resetButton=controls?.querySelector('[data-lq-reset]'),count=controls?.querySelector('.lq-cy-count');
        let roots=new Set(),selected=null,lastTap=null;const positions=new Map();
        const base={nodes,edges}, source=catalog||base;
        const originalNodes=new Set(nodes.map(n=>n.id)),originalEdges=new Set(edges.map(e=>e.id));
        const elements=g=>[...g.nodes.map(n=>({data:{id:n.id,label:n.title,url:n.url},classes:originalNodes.has(n.id)?'':'lq-expanded'})),...g.edges.map(e=>({data:{id:'rel:'+e.id,source:e.from,target:e.to,label:e.label},classes:originalEdges.has(e.id)?'':'lq-expanded'}))];
        cy.style().selector('node.lq-expanded').style({'border-style':'dashed','background-opacity':.12}).selector('edge.lq-expanded').style({'line-style':'dashed','opacity':.5}).update();
        function redraw(){
          roots=pruneRoots(base,source,roots);const g=expandGraph(base,source,roots);
          // No volver a ejecutar un layout: conservar posición, zoom y pan del usuario.
          cy.nodes().forEach(n=>positions.set(n.id(),{...n.position()}));
          const wanted=elements(g),ids=new Set(wanted.map(x=>x.data.id));
          cy.batch(()=>{
            cy.elements().filter(e=>!ids.has(e.id())).remove();
            const occupied=cy.nodes().map(n=>n.position());
            for(const e of wanted.filter(e=>!e.data.source)){
              if(cy.getElementById(e.data.id).length)continue;
              const neighbor=g.edges.find(r=>(r.from===e.data.id&&cy.getElementById(r.to).length)||(r.to===e.data.id&&cy.getElementById(r.from).length));
              const anchor=neighbor?cy.getElementById(neighbor.from===e.data.id?neighbor.to:neighbor.from).position():{x:0,y:0};
              let pos=positions.get(e.data.id);
              if(!pos){for(let k=0;k<100;k++){const angle=k*2.39996323,r=280+Math.floor(k/8)*200;const candidate={x:anchor.x+r*Math.cos(angle),y:anchor.y+r*Math.sin(angle)};if(!occupied.some(p=>Math.abs(p.x-candidate.x)<Math.max(230,size*13)&&Math.abs(p.y-candidate.y)<Math.max(110,size*5))){pos=candidate;break;}}}
              pos=pos||{x:anchor.x+300*(occupied.length+1),y:anchor.y};occupied.push(pos);cy.add({...e,position:pos});
            }
            for(const e of wanted.filter(e=>e.data.source))if(!cy.getElementById(e.data.id).length)cy.add(e);
          });
          if(selected&&!g.nodes.some(n=>n.id===selected))selected=null;
          if(expandButton)expandButton.disabled=!selected;
          if(count)count.textContent=`${g.nodes.length} fichas visibles · ${g.edges.length} relaciones · ${roots.size} expansiones abiertas`;
          if(!selected)selection.textContent='';
        }
        function toggle(id){if(!catalog)return;if(roots.has(id))roots.delete(id);else roots.add(id);redraw();}
        function cancelTap(){if(tapTimer!==null)clearTimeout(tapTimer);tapTimer=null;lastTap=null;}
        function select(data){selected=data.id;selection.replaceChildren();selection.appendChild(document.createTextNode(data.label+' '));if(safeURL(data.url)){const a=document.createElement('a');a.href=data.url;a.textContent='Ver ficha resumida';a.addEventListener('click',e=>{e.preventDefault();showPreview(data.id);});selection.appendChild(a);}if(expandButton)expandButton.disabled=!catalog;}
        cy.on('tap','node',event=>{
          const data=event.target.data();select(data);
          if(catalog&&lastTap===data.id&&tapTimer!==null){cancelTap();toggle(data.id);return;}
          cancelTap();lastTap=data.id;
          tapTimer=setTimeout(()=>{tapTimer=null;lastTap=null;if(!disposed&&panel.isConnected)showPreview(data.id);},350);
        });
        const onExpand=()=>{cancelTap();if(selected)toggle(selected);};
        const onReset=()=>{cancelTap();roots.clear();selected=null;redraw();};
        if(catalog&&controls){controls.hidden=false;expandButton?.addEventListener('click',onExpand);resetButton?.addEventListener('click',onReset);if(count)count.textContent=`${nodes.length} fichas visibles · ${edges.length} relaciones · consulta original`;}
        cleanupControls=()=>{cancelTap();expandButton?.removeEventListener('click',onExpand);resetButton?.removeEventListener('click',onReset);};
        cy.on('tap','edge',event=>{cancelTap();selected=null;if(expandButton)expandButton.disabled=true;selection.textContent=event.target.data('label');});
        fallback.hidden=true;
      }catch{failed=true;cleanupControls();cy?.destroy();cy=null;host.hidden=true;fallback.hidden=false;}
      finally{loading=false;}
    }
    const handler=()=>{if(visible())void mount();};
    details.forEach(d=>d.addEventListener('toggle',handler));
    fontUpdates.push(size=>{if(cy){cy.style().selector('node').style({'font-size':size,'height':Math.max(76,size*4.6),'width':Math.max(195,size*12),'text-max-width':Math.max(175,size*11)}).selector('edge:selected').style('font-size',size*.85).update();}});
    cleanups.push(()=>{details.forEach(d=>d.removeEventListener('toggle',handler));cleanupControls();fallback.removeEventListener('click',fallbackClick);dialog?.remove();cy?.destroy();});
    if(visible())void mount();
  }
  const dispose=()=>{disposed=true;cleanups.forEach(fn=>fn());};
  dispose.fontSize=size=>fontUpdates.forEach(fn=>fn(size));
  return dispose;
}
