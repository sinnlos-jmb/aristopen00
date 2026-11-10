// Presentación local: no tokens de un modelo, transporte de red ni texto generado.
export const wordChunks=text=>String(text).match(/\S+\s*|\s+/gu)||[];
export function playChunks(chunks,write,done,{schedule=setTimeout,clear=clearTimeout,delay=38}={}){
 let i=0,timer=null,active=true;
 const end=()=>{if(!active)return;active=false;if(timer!==null)clear(timer);done();};
 const tick=()=>{if(!active)return;if(i>=chunks.length){end();return;}const x=chunks[i++];write(x);timer=schedule(tick,delay+(/[.!?;:]\s*$/u.test(x.text??x)?70:0));};
 tick();return {get busy(){return active;},finish(){if(!active)return;if(timer!==null)clear(timer);while(i<chunks.length)write(chunks[i++]);end();},cancel(){active=false;if(timer!==null)clear(timer);}};
}
export function revealTurn(turn,root,{onComplete=()=>{},reduced=matchMedia('(prefers-reduced-motion: reduce)').matches,textOnly=false}={}){
 if(!turn||reduced)return null;
 const paragraphs=[...turn.children].filter(e=>e.tagName==='P');
 const nodes=[];for(const p of paragraphs){const walker=document.createTreeWalker(p,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push({node:walker.currentNode,text:walker.currentNode.textContent});}
 const chunks=nodes.flatMap(item=>wordChunks(item.text).map(text=>({item,text})));if(!chunks.length)return null;
 const attachments=[...turn.children].filter(e=>e.matches('.zero-readings,.zero-debate,.zero-frontier'));
 const blocked=[...root.querySelectorAll('.stream-controls,.zero-actions,.zero-dependencies,.zero-relation-menu,.stream-closure-graph,button[data-zero-relation]')];
 const hidden=[...new Set([...attachments,...blocked])].map(el=>({el,was:el.hidden}));hidden.forEach(({el})=>el.hidden=true);
 const aria=paragraphs.map(p=>({p,old:p.getAttribute('aria-hidden')}));paragraphs.forEach(p=>p.setAttribute('aria-hidden','true'));
 const accessible=document.createElement('p');accessible.className='stream-sr';accessible.textContent=paragraphs.map(p=>p.textContent).join('\n');turn.append(accessible);
 const panel=document.createElement('div');panel.className='stream-writing';panel.innerHTML='<span>Escritura simulada<span class="stream-cursor" aria-hidden="true"> ▌</span></span>'+(textOnly?'':'<button type="button" data-stream-complete>Mostrar completo</button>');
 const first=paragraphs[0];turn.insertBefore(panel,first);turn.setAttribute('aria-busy','true');nodes.forEach(x=>x.node.textContent='');
 const announcer=root.querySelector('#stream-status');if(announcer)announcer.textContent='La guía está mostrando una intervención. Podés mostrarla completa.';
 const media=matchMedia('(prefers-reduced-motion: reduce)');let player;
 const restore=(notify=true)=>{const focused=panel.contains(document.activeElement);nodes.forEach(x=>x.node.textContent=x.text);aria.forEach(({p,old})=>old===null?p.removeAttribute('aria-hidden'):p.setAttribute('aria-hidden',old));hidden.forEach(({el,was})=>el.hidden=was);accessible.remove();panel.remove();turn.removeAttribute('aria-busy');media.removeEventListener('change',reduce);if(notify){if(announcer)announcer.textContent='Intervención completa. Podés continuar cuando quieras.';onComplete();if(focused)root.querySelector('.zero-actions button:not(:disabled),.course-options button,.course-navigation button,.zero-dependencies button,button[data-zero-relation]')?.focus({preventScroll:true});}};
 const reduce=e=>{if(e.matches)player?.finish();};media.addEventListener('change',reduce);
 player=playChunks(chunks,x=>x.item.node.textContent+=x.text,()=>restore(),textOnly?{delay:12}:{});const completeButton=panel.querySelector('button');if(completeButton)completeButton.onclick=()=>player.finish();
 return {get busy(){return player.busy;},finish(){player.finish();},cancel(){if(player.busy){player.cancel();restore(false);}}};
}
