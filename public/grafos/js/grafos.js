'use strict';
// Motor compartido. El servidor aporta NODES, EDGES, FIELDS y COLLAPSED.

	
	// 1. Definir e inyectar la UI flotante
function inyectarUIFlotante() {
  // Leemos el título real de la etiqueta <title> del HTML para que no quede fijo
  const tituloGrafo = document.title || 'Grafo interactivo';

  const uiHTML = `
    <!-- RECUADRO SUPERIOR -->
    <header style="position: absolute; top: 0px; right: 2px; z-index: 1000; display: flex; flex-direction: column; background: var(--bg-elevated, rgba(255, 255, 255, 0.85)); backdrop-filter: blur(4px); border: 1px solid var(--border, #e5e7eb); border-radius: 8px; padding: 2px 2px; gap: 9px; width: max-content;">
      
      <!-- Título dinámico oculto para que lo lea el breadcrumb de la app principal -->
      <h1 style="display: none;">${tituloGrafo}</h1>
      
      <div class="tools" style="padding: 4px 10px; display: flex; gap: 6px; align-items: center; justify-content: center; position: relative;">
        <style>
          .tools ul, .menu-dropdown {
            position: absolute !important;
            top: 100% !important;
            right: 0 !important;
            max-height: 50vh !important; 
            overflow-y: auto !important; 
            z-index: 1001;
          }
          .tools button, .tools a.btn {
            padding: 2px 8px !important;
            min-height: 24px !important;
            height: auto !important;
            font-size: 0.8rem !important;
            line-height: 1.2 !important;
          }
        </style>
        <button id="keys" type="button" class="btn btn--primary" aria-haspopup="dialog">Claves</button>
      </div>
    </header>

    <aside id="info" style="display:none; z-index: 2388;top: 0px;right: 2px;" aria-label="Explicación de la selección"></aside>

    <!-- CONTROLES DE ZOOM INFERIORES -->
    <div class="map-controls" style="position: absolute; bottom: 16px; left: 16px; display: flex; flex-direction: column; background: var(--bg-elevated, #ffffff66); border: 1px solid var(--border, #e5e7eb); border-radius: 8px; z-index: 100; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
      <div style="display: flex; border-bottom: 1px solid var(--border, #e5e7eb);">
        <button id="expand" style="min-height: auto; flex: 1; padding: 6px 10px; border: none; background: transparent; cursor: pointer; font-size: 0.8rem; border-right: 1px solid var(--border, #e5e7eb); color: var(--fg);" title="Expandir todo">Ext</button>
        <button id="collapse" style="min-height: auto; flex: 1; padding: 6px 10px; border: none; background: transparent; cursor: pointer; font-size: 0.8rem; color: var(--fg);" title="Colapsar todo">Col</button>
      </div>  
      <div style="display: flex; border-bottom: 1px solid var(--border, #e5e7eb);">
        <button id="zoomOut" style="min-height: auto; flex: 1; padding: 6px 12px; border: none; background: transparent; cursor: pointer; font-size: 1.1rem; border-right: 1px solid var(--border, #e5e7eb); color: var(--fg); line-height: 1;" title="Alejar">−</button>
        <output id="zoomLevel" style="display: flex; align-items: center; justify-content: center; min-width: 48px; font-size: 0.75rem; font-family: monospace; color: var(--fg-muted, #6b7280); margin: 0;">100%</output>
        <button id="zoomIn" style="min-height: auto; flex: 1; padding: 6px 12px; border: none; background: transparent; cursor: pointer; font-size: 1.1rem; border-left: 1px solid var(--border, #e5e7eb); color: var(--fg); line-height: 1;" title="Acercar">+</button>
      </div>
      <button id="fit" style="min-height: auto; padding: 8px 12px; border: none; background: transparent; cursor: pointer; font-size: 0.8rem; width: 100%; color: var(--fg);">Recentrar</button>
    </div>
  `;

  // Insertamos todo esto en el body de una sola vez
  document.body.insertAdjacentHTML('beforeend', uiHTML);
}

// 2. Ejecutar la inyección inmediatamente al cargar el script
inyectarUIFlotante();

const R=34, radius=n=>n.r||R;
const $=s=>document.querySelector(s), S=t=>document.createElementNS('http://www.w3.org/2000/svg',t);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const byId=id=>NODES.find(n=>n.id===id), edgeById=id=>EDGES.find(e=>e.id===id);
const outOf=id=>EDGES.filter(e=>e.source===id),inTo=id=>EDGES.filter(e=>e.target===id);
const nodeIds=new Set(NODES.map(n=>n.id));
if(nodeIds.size!==NODES.length||new Set(EDGES.map(e=>e.id)).size!==EDGES.length||EDGES.some(e=>!nodeIds.has(e.source)||!nodeIds.has(e.target)))throw Error('Invalid graph references');
const collapsed=new Set(typeof COLLAPSED!=='undefined'?COLLAPSED:[]);
let selected=null,view={x:0,y:0,k:1},nodeEls=new Map(),edgeEls=[];
const svg=$('#svg'),viewport=$('#viewport'),gNodes=$('#gnodes'),gEdges=$('#gedges'),info=$('#info'),modal=$('#modal'),keysBtn=$('#keys');
function visibleSet(forceOpen){const vis=new Set(),targeted=new Set(EDGES.map(e=>e.target)),stack=NODES.filter(n=>!targeted.has(n.id)).map(n=>n.id);while(stack.length){const id=stack.pop();if(vis.has(id))continue;vis.add(id);if(collapsed.has(id)&&id!==forceOpen)continue;outOf(id).forEach(e=>stack.push(e.target))}return vis}
function hiddenCount(id){return visibleSet(id).size-visibleSet().size}

function edgeVisible(e,vis=visibleSet()){if(e.showWith&&!(selected&&(selected.type==='edge'?selected.id===e.id:selected.id===e.showWith)))return false;return vis.has(e.source)&&vis.has(e.target)&&!collapsed.has(e.source)}
function selectionVisible(vis){if(!selected)return false;return selected.type==='node'?vis.has(selected.id):edgeVisible(edgeById(selected.id),vis)}
function isSelected(type,id){return selected?.type===type&&selected.id===id}
function nodeRelated(id){if(!selected)return true;if(selected.type==='node')return selected.id===id||EDGES.some(e=>(e.source===id&&e.target===selected.id)||(e.target===id&&e.source===selected.id));const e=edgeById(selected.id);return e.source===id||e.target===id}
function edgeRelated(e){return !selected||selected.type==='edge'?(!selected||selected.id===e.id):(selected.id===e.source||selected.id===e.target)}
function fieldOf(){if(!selected||selected.type!=='node')return null;const f=FIELDS[selected.id];if(!f)return null;let set;if(f.mode==='set')set=new Set(f.nodes);else{set=new Set();const stack=[selected.id];while(stack.length){const id=stack.pop();if(set.has(id)||(f.skip||[]).includes(id))continue;set.add(id);if(f.stop.includes(id))continue;outOf(id).forEach(e=>stack.push(e.target))}}return{cls:f.cls,nodes:set,note:f.note}}
function render(){const vis=visibleSet();if(selected&&!selectionVisible(vis))selected=null;const field=fieldOf();gEdges.replaceChildren();gNodes.replaceChildren();nodeEls=new Map();edgeEls=[];
for(const e of EDGES){if(!edgeVisible(e,vis))continue;const g=S('g'),hit=S('path'),p=S('path'),t=S('text');const inF=!!(field&&field.nodes.has(e.source)&&field.nodes.has(e.target));g.setAttribute('class','edge'+(e.kind?' '+e.kind:'')+(field?(inF?' field '+field.cls:' dim'):selected?(edgeRelated(e)?' on':' dim'):''));g.dataset.edgeId=e.id;g.setAttribute('role','button');g.setAttribute('tabindex','0');g.setAttribute('aria-pressed',isSelected('edge',e.id));g.setAttribute('aria-label',`${e.label}: ${e.title}. ${byId(e.source).label} hacia ${byId(e.target).label}. Ver explicación`);hit.setAttribute('class','edgeHit');p.setAttribute('class','edgeLine');p.setAttribute('marker-end',inF?'url(#arrow-'+field.cls+')':selected&&edgeRelated(e)?'url(#arrowOn)':'url(#arrow)');t.textContent=e.label;g.append(hit,p,t);gEdges.append(g);edgeEls.push({e,g,p,hit,t})}
for(const n of NODES){if(!vis.has(n.id))continue;const g=S('g'),c=S('circle'),lab=S('text'),gr=S('text');g.setAttribute('class','node'+(n.type?' '+n.type:'')+(field?(field.nodes.has(n.id)?' field '+field.cls+(isSelected('node',n.id)?' selected':''):' dim'):isSelected('node',n.id)?' selected':selected&&!nodeRelated(n.id)?' dim':''));g.dataset.id=n.id;g.setAttribute('tabindex','0');g.setAttribute('role','button');g.setAttribute('aria-pressed',isSelected('node',n.id));g.setAttribute('aria-label',`${n.label}, ${n.gr}. Ver explicación`);c.setAttribute('class','main');c.setAttribute('r',radius(n));lab.setAttribute('class','lab');lab.setAttribute('y','-2');lab.textContent=n.label;
// Keep long titles readable in two lines without changing node coordinates.
if(n.label.length>12&&n.label.split(' ').length===2){lab.textContent='';for(const [i,line] of n.label.split(' ').entries()){const span=S('tspan');span.setAttribute('x','0');span.setAttribute('y',i===0?'-9':'7');span.textContent=line;lab.append(span)}gr.setAttribute('y','23')}else gr.setAttribute('y','14');
gr.setAttribute('class','gr');gr.textContent=n.gr;g.append(c,lab,gr);
if(outOf(n.id).length){const b=S('g'),bc=S('circle'),bt=S('text'),bh=S('circle');b.setAttribute('class','badge'+(collapsed.has(n.id)?' closed':''));b.setAttribute('transform',`translate(${radius(n)*.72},${radius(n)*.72})`);b.dataset.badgeId=n.id;b.setAttribute('role','button');b.setAttribute('tabindex','0');b.setAttribute('aria-label',`${collapsed.has(n.id)?'Expandir':'Contraer'} relaciones de ${n.label}`);b.setAttribute('aria-expanded',!collapsed.has(n.id));bh.setAttribute('class','badgeHit');bh.setAttribute('r','17');bc.setAttribute('r','10');bt.setAttribute('y','4');bt.textContent=collapsed.has(n.id)?(hiddenCount(n.id)>0?'+'+hiddenCount(n.id):'+'):'−';b.append(bh,bc,bt);g.append(b)}
if(n.links&&n.links.length){const b=S('g'),bc=S('circle'),bt=S('text'),bh=S('circle');b.setAttribute('class','linkBadge');b.setAttribute('transform',`translate(${radius(n)*.72},${-radius(n)*.72})`);b.dataset.linkId=n.id;b.setAttribute('role','button');b.setAttribute('tabindex','0');b.setAttribute('aria-label',`Ir a otro grafo desde ${n.label}: ${n.links.map(l=>l.label).join(', ')}`);bh.setAttribute('class','badgeHit');bh.setAttribute('r','17');bc.setAttribute('r','10');bt.setAttribute('y','4');bt.textContent=n.links.length>1?String(n.links.length):'\u2197';b.append(bh,bc,bt);g.append(b)}
if(n.subs&&n.subs.length){const b=S('g'),bc=S('circle'),bt=S('text'),bh=S('circle');b.setAttribute('class','subBadge');b.setAttribute('transform','translate('+(-radius(n)*.72)+','+(-radius(n)*.72)+')');b.dataset.subId=n.id;b.setAttribute('role','button');b.setAttribute('tabindex','0');b.setAttribute('aria-label','Entrar en el subgrafo de '+n.label+': '+n.subs.map(l=>l.label).join(', '));bh.setAttribute('class','badgeHit');bh.setAttribute('r','17');bc.setAttribute('r','10');bt.setAttribute('y','4');bt.textContent=String.fromCharCode(0x2198);b.append(bh,bc,bt);g.append(b)}
gNodes.append(g);nodeEls.set(n.id,g)}layout();renderInfo()}
function layout(){for(const[id,g]of nodeEls){const n=byId(id);g.setAttribute('transform',`translate(${n.x},${n.y})`)}for(const{e,p,hit,t}of edgeEls){const a=byId(e.source),b=byId(e.target),dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy)||1,off=Math.min(30,d*.14),cx=(a.x+b.x)/2-dy/d*off,cy=(a.y+b.y)/2+dx/d*off,sa=Math.hypot(cx-a.x,cy-a.y)||1,sb=Math.hypot(b.x-cx,b.y-cy)||1,ax=a.x+(cx-a.x)/sa*(radius(a)+3),ay=a.y+(cy-a.y)/sa*(radius(a)+3),bx=b.x-(b.x-cx)/sb*(radius(b)+7),by=b.y-(b.y-cy)/sb*(radius(b)+7);const path=`M${ax},${ay} Q${cx},${cy} ${bx},${by}`;p.setAttribute('d',path);hit.setAttribute('d',path);t.setAttribute('x',.25*ax+.5*cx+.25*bx+(e.labelDx||0));t.setAttribute('y',.25*ay+.5*cy+.25*by-6+(e.labelDy||0))}}
function renderInfo(){if(!selected){info.style.display='none';info.replaceChildren();return}let html='<button id="infoClose" type="button" aria-label="Cerrar explicación">×</button>';
if(selected.type==='edge'){const e=edgeById(selected.id);html+=`<div class="kicker">Relación · ${esc(e.rel||'estructura')}</div><h2 lang="el">${esc(e.label)}</h2><div class="subtitle">${esc(e.title)}</div><div class="route">${esc(byId(e.source).label)} → ${esc(byId(e.target).label)}</div><p>${esc(e.desc)}</p><div class="ref">${esc(e.ref)}${e.ref_cf?`<span class="refcf"> · cf. ${esc(e.ref_cf)}</span>`:''}</div>`}else{const n=byId(selected.id);html+=`<div class="kicker">Concepto</div><h2>${esc(n.label)}</h2><div class="grk" lang="el">${esc(n.gr)}</div><p>${esc(n.desc)}</p>${FIELDS[n.id]?`<div class="fieldNote">${esc(FIELDS[n.id].note)}</div>`:''}<div class="ref">${esc(n.ref)}</div>`;for(const [title,list]of [['Sale hacia',outOf(n.id)],['Entra desde',inTo(n.id)]]){if(!list.length)continue;html+=`<div class="muted" style="margin-top:10px">${title}</div>`;for(const e of list){const visible=edgeVisible(e);html+=`<button type="button" class="relationLink${visible?'':' hiddenRel'}" data-relation="${esc(e.id)}">${esc(e.label)} · ${esc(byId(e.source===n.id?e.target:e.source).label)}${visible?'':' · desplegar'}</button>`}}}
info.innerHTML=html;info.style.display='block';$('#infoClose').onclick=clearSelection;info.querySelectorAll('[data-relation]').forEach(button=>button.onclick=()=>{const e=edgeById(button.dataset.relation);collapsed.delete(e.source);select('edge',e.id,false)});info.scrollTop=0}
function selectionElement(){return !selected?null:selected.type==='node'?nodeEls.get(selected.id):edgeEls.find(x=>x.e.id===selected.id)?.g}
function select(type,id,toggle=true){selected=toggle&&isSelected(type,id)?null:{type,id};render()}
// Al abrir una relación enlazada, desplegar su origen y, si es preciso, sus ramas antecesoras.
function selectLinkedEdge(id){const e=edgeById(id);if(!e)throw Error('No se encontró la relación solicitada.');collapsed.delete(e.source);let vis=visibleSet();if(!vis.has(e.source)||!vis.has(e.target)){collapsed.clear();vis=visibleSet()}if(!vis.has(e.source)||!vis.has(e.target))throw Error('La relación solicitada no es visible en este grafo.');select('edge',id,false);if(!selected||selected.type!=='edge'||selected.id!==id)throw Error('No se pudo mostrar la relación solicitada.');}
function clearSelection(){const prior=selected;selected=null;render();const el=prior?.type==='node'?nodeEls.get(prior.id):edgeEls.find(x=>x.e.id===prior?.id)?.g;el?.focus({preventScroll:true})}
function toggle(id){collapsed.has(id)?collapsed.delete(id):collapsed.add(id);render()}
function toSvg(e){return new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse())}
function applyView(){viewport.setAttribute('transform',`translate(${view.x},${view.y}) scale(${view.k})`);$('#zoomLevel').textContent=Math.round(view.k*100)+'%'}
function zoomAt(factor,p={x:svg.clientWidth/2,y:svg.clientHeight/2}){const k=Math.max(.15,Math.min(4,view.k*factor)),ratio=k/view.k;view.x=p.x-(p.x-view.x)*ratio;view.y=p.y-(p.y-view.y)*ratio;view.k=k;applyView()}
function fit(){const visible=[...visibleSet()].map(byId);if(!visible.length)return;const minx=Math.min(...visible.map(n=>n.x-radius(n)-35)),maxx=Math.max(...visible.map(n=>n.x+radius(n)+35)),miny=Math.min(...visible.map(n=>n.y-radius(n)-30)),maxy=Math.max(...visible.map(n=>n.y+radius(n)+30)),w=svg.clientWidth,h=Math.max(80,svg.clientHeight-64),k=Math.max(.15,Math.min(2.5,w/(maxx-minx),h/(maxy-miny)));view={k,x:w/2-k*(minx+maxx)/2,y:h/2-k*(miny+maxy)/2};applyView()}
const pointers=new Map();let drag=null,pinch=null;
function pinchState(){const [a,b]=[...pointers.values()];return{mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},distance:Math.hypot(a.x-b.x,a.y-b.y)}}
svg.addEventListener('pointerdown',e=>{if(e.button!==0)return;const point=toSvg(e);pointers.set(e.pointerId,point);svg.setPointerCapture(e.pointerId);if(pointers.size===2){pinch=pinchState();drag=null;return}if(pointers.size>2)return;const sub=e.target.closest('.subBadge'),link=e.target.closest('.linkBadge'),badge=e.target.closest('.badge'),node=e.target.closest('.node'),edge=e.target.closest('.edge');drag={pointerId:e.pointerId,start:point,last:point,moved:false,type:sub?'sub':link?'link':badge?'badge':node?'node':edge?'edge':'pan',id:sub?.dataset.subId||link?.dataset.linkId||badge?.dataset.badgeId||node?.dataset.id||edge?.dataset.edgeId};if(drag.type==='node'){const n=byId(drag.id);drag.dx=n.x-(point.x-view.x)/view.k;drag.dy=n.y-(point.y-view.y)/view.k}});
svg.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const point=toSvg(e);pointers.set(e.pointerId,point);if(pointers.size>=2&&pinch){const next=pinchState();view.x+=next.mid.x-pinch.mid.x;view.y+=next.mid.y-pinch.mid.y;zoomAt(next.distance/Math.max(1,pinch.distance),next.mid);pinch=next;return}if(!drag||drag.pointerId!==e.pointerId)return;if(Math.hypot(point.x-drag.start.x,point.y-drag.start.y)>5)drag.moved=true;if(drag.moved){if(drag.type==='node'){const n=byId(drag.id);n.x=(point.x-view.x)/view.k+drag.dx;n.y=(point.y-view.y)/view.k+drag.dy;layout()}else{view.x+=point.x-drag.last.x;view.y+=point.y-drag.last.y;applyView();svg.classList.add('panning')}}drag.last=point});
function releasePointer(e,cancel=false){pointers.delete(e.pointerId);if(svg.hasPointerCapture(e.pointerId))svg.releasePointerCapture(e.pointerId);if(pinch){pinch=pointers.size>=2?pinchState():null;drag=null}else if(drag?.pointerId===e.pointerId){if(!cancel&&!drag.moved){if(drag.type==='sub')askSub(drag.id);else if(drag.type==='link')askLink(drag.id);else if(drag.type==='badge')toggle(drag.id);else if(drag.type==='node'||drag.type==='edge')select(drag.type,drag.id);else if(selected){selected=null;render()}}drag=null}svg.classList.remove('panning')}
svg.addEventListener('pointerup',e=>releasePointer(e));svg.addEventListener('pointercancel',e=>releasePointer(e,true));
svg.addEventListener('wheel',e=>{e.preventDefault();zoomAt(Math.exp(-e.deltaY*.0016),toSvg(e))},{passive:false});
$('#zoomIn').onclick=()=>zoomAt(1.25);$('#zoomOut').onclick=()=>zoomAt(.8);$('#fit').onclick=fit;$('#expand').onclick=()=>{collapsed.clear();render()};$('#collapse').onclick=()=>{NODES.forEach(n=>{if(outOf(n.id).length)collapsed.add(n.id)});selected=null;render()};
let modalPrior=null;
function openModal(){
    modalPrior=document.activeElement;
    modal.hidden=false;
    svg.inert=true;
    info.inert=true;
    $('#modalClose').focus()}
function closeModal(){
    modal.hidden=true;
    svg.inert=false;info.inert=false;
    (modalPrior||keysBtn).focus({preventScroll:true})
    }
keysBtn.onclick=openModal;$('#modalClose').onclick=closeModal;modal.addEventListener('pointerdown',e=>{if(e.target===modal)closeModal()});
document.addEventListener('keydown',e=>{if(!linkModal.hidden){if(e.key==='Escape'){e.preventDefault();closeLink()}else if(e.key==='Tab'){e.preventDefault();const bs=[...linkActions.querySelectorAll('button')];bs[(bs.indexOf(document.activeElement)+1)%bs.length]?.focus()}return}if(!modal.hidden){if(e.key==='Escape'){e.preventDefault();closeModal()}else if(e.key==='Tab'){e.preventDefault();$('#modalClose').focus()}return}if(e.key==='Escape'&&selected){e.preventDefault();clearSelection();return}const target=e.target.closest?.('.subBadge,.linkBadge,.badge,.node,.edge');if(target&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(target.classList.contains('subBadge')){askSub(target.dataset.subId)}else if(target.classList.contains('linkBadge')){askLink(target.dataset.linkId)}else if(target.classList.contains('badge')){const id=target.dataset.badgeId;toggle(id);nodeEls.get(id)?.querySelector('.badge')?.focus({preventScroll:true})}else{const type=target.classList.contains('edge')?'edge':'node',id=type==='edge'?target.dataset.edgeId:target.dataset.id;select(type,id);const el=type==='edge'?edgeEls.find(x=>x.e.id===id)?.g:nodeEls.get(id);el?.focus({preventScroll:true})}}});
// v13: remisiones. Cualquier nodo puede llevar links:[{graph,file,concept,label}].
const linkModal=document.createElement('div');linkModal.id='linkModal';linkModal.hidden=true;
linkModal.innerHTML='<div id="linkCard" role="dialog" aria-modal="true" aria-labelledby="linkTitle"><h2 id="linkTitle">Ir a otro grafo</h2><div id="linkBody"></div><div id="linkActions"></div></div>';
document.body.append(linkModal);
const linkBody=linkModal.querySelector('#linkBody'),linkActions=linkModal.querySelector('#linkActions');
let linkPrior=null;
function askLink(id){const n=byId(id);if(!n||!n.links||!n.links.length)return;linkPrior=document.activeElement;linkModal.querySelector('#linkTitle').textContent='Ir a otro grafo';
linkBody.innerHTML=`Est\u00e1s en <b>${esc(n.label)}</b>. Este concepto se despliega en otro grafo; al salir, esta vista vuelve a su posici\u00f3n inicial.`;
linkActions.replaceChildren();
for(const l of n.links){const b=document.createElement('button');b.type='button';b.className='go';b.textContent='Ir a '+l.label;b.onclick=()=>goTo(l.file,l.concept,n.id);linkActions.append(b)}
const c=document.createElement('button');c.type='button';c.textContent='Cancelar';c.onclick=closeLink;linkActions.append(c);
linkModal.hidden=false;
svg.inert=true;
info.inert=true;
linkActions.querySelector('button').focus()}
function closeLink(){
    linkModal.hidden=true;
    svg.inert=false;
    info.inert=false;
    (linkPrior||keysBtn).focus?.({preventScroll:true})
    }
linkModal.addEventListener('pointerdown',e=>{if(e.target===linkModal)closeLink()});
function hashParts(){const raw=decodeURIComponent((location.hash||'').replace('#',''));if(!raw)return{};const parts=raw.split(','),out={target:parts[0]||''};for(const q of parts.slice(1)){if(q.indexOf('from=')!==0)continue;const v=q.slice(5),i=v.lastIndexOf(':');out.from=i>0?{file:v.slice(0,i),node:v.slice(i+1)}:{file:v,node:''}}return out}
function openHash(){const h=hashParts().target;if(!h)return;const n=NODES.find(x=>x.id===h)||NODES.find(x=>x.conceptId===h);if(!n)return;for(const c of [...collapsed])if(!visibleSet().has(n.id))collapsed.delete(c);select('node',n.id,false);fit()}
// v14: subgrafos (signo con la flecha hacia el centro), menu de grafos y retorno.
const NAV=typeof GRAPH_INDEX!=='undefined'?GRAPH_INDEX:null;
const hereFile=location.pathname.split('/').pop()||'';
function navEntry(file){return NAV?NAV.find(g=>g.file===file):null}
function navLabel(file){const g=navEntry(file);return g?g.label:file}
function goTo(file,concept,fromNode){let h=concept?'#'+concept:'';if(fromNode){h=(h||'#')+',from='+hereFile+':'+fromNode}const q=new URLSearchParams({revision:window.AGORA_GRAPH_REVISION});window.location.href=file+'?'+q+h}

function askSub(id){
    const n=byId(id);if(!n||!n.subs||!n.subs.length)return;linkPrior=document.activeElement;
    linkModal.querySelector('#linkTitle').textContent='Entrar en un subgrafo';
    linkBody.innerHTML='<b>'+esc(n.label)+'</b> se despliega en un subgrafo propio. Al entrar, el encabezado ofrece volver a esta vista.';
    linkActions.replaceChildren();
    for(const l of n.subs){const b=document.createElement('button');b.type='button';b.className='go';b.textContent='Entrar en '+l.label;b.onclick=()=>goTo(l.file,l.concept,n.id);linkActions.append(b)}
    const c=document.createElement('button');c.type='button';c.textContent='Cancelar';c.onclick=closeLink;linkActions.append(c);
    linkModal.hidden=false;
    svg.inert=true;
    info.inert=true;
    linkActions.querySelector('button').focus()
    }
function navItem(g,child){const li=document.createElement('li');if(child)li.className='child';const b=document.createElement('button');b.type='button';b.textContent=g.label;if(g.file===hereFile){b.className='current';b.setAttribute('aria-current','page');b.disabled=true}else b.onclick=()=>goTo(g.file,'');li.append(b);return li}
function buildNav(){if(!NAV||!keysBtn)return;const tools=keysBtn.parentNode,wrap=document.createElement('div');wrap.className='group navGroup';
const cur=navEntry(hereFile),back=hashParts().from;
if(cur&&cur.parent){const p=NAV.find(g=>g.id===cur.parent);if(p){const up=document.createElement('button');up.type='button';up.id='navUp';up.innerHTML='&#8593; '+p.label;up.title='Subir al mapa del argumento';up.onclick=()=>goTo(p.file,cur.anchor||'');wrap.append(up)}}
if(back&&back.file!==hereFile){const b=document.createElement('button');b.type='button';b.id='navBack';b.innerHTML='&#8592; Volver a '+navLabel(back.file);b.onclick=()=>goTo(back.file,back.node||'');wrap.append(b)}
const mb=document.createElement('button');mb.type='button';mb.id='graphMenuBtn';mb.setAttribute('aria-haspopup','true');mb.setAttribute('aria-expanded','false');mb.innerHTML='Grafos &#9662;';
const menu=document.createElement('div');menu.id='graphMenu';menu.hidden=true;const ul=document.createElement('ul');
for(const g of NAV.filter(x=>!x.parent)){ul.append(navItem(g,false));for(const c of NAV.filter(x=>x.parent===g.id))ul.append(navItem(c,true))}
menu.append(ul);
function setMenu(open){menu.hidden=!open;mb.setAttribute('aria-expanded',String(open))}
mb.onclick=()=>setMenu(menu.hidden);
document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&!mb.contains(e.target))setMenu(false)});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.stopPropagation();setMenu(false)}},true);
wrap.append(mb,menu);tools.insertBefore(wrap,keysBtn)}
buildNav();
render();fit();openHash();let resizeTimer;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(fit,100)});
