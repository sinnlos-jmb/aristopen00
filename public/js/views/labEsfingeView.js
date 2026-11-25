import { esc } from '../ui.js';
import { controlesTamanoLector, actualizarLectura, cambiarTamanoLector } from '../reader/fontPreferences.js';
import { desafios, opciones, iniciarEsfinge, preguntasEsfinge, resultadoEsfinge, responderEsfinge, retrocederEsfinge } from '../lab/esfinge.js';
export function createLabEsfingeView(){
  const el=document.createElement('div');el.className='scrollable has-scroll lq-view esfinge-view';
  if(!document.querySelector('link[data-esfinge-styles]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/css/lab-esfinge-n1u191.css';css.dataset.esfingeStyles='1';document.head.appendChild(css);}
  let s=null;
  const label=r=>opciones.find(([id])=>id===r)?.[1]||'';
  function render(){
    const d=s&&desafios.find(x=>x.id===s.id),resultado=s&&resultadoEsfinge(s),preguntas=s?preguntasEsfinge(s):[];
    el.innerHTML=`<div class="esfinge-inner"><nav><a href="#/lab">← Laboratorio</a> · N1-U.19.1</nav>${controlesTamanoLector()}
      <h1>Esfinge</h1><p>Examiná las consecuencias de una tesis mediante tus propias respuestas. El objetivo no es acertar, sino descubrir qué puede sostenerse sin contradicción.</p>
      <p class="esfinge-note">Piloto de diálogo dialéctico inspirado en Giorgio Colli. Ejercicios predefinidos de Ágora, pendientes de revisión editorial; no son citas ni una reproducción literal de su obra. No utiliza la LLM ni consume créditos.</p>
      ${!s?`<h2>Elegí un desafío</h2><div class="esfinge-choices">${desafios.map(x=>`<button type="button" data-esfinge-start="${esc(x.id)}">${esc(x.titulo)}</button>`).join('')}</div>`:`<h2>${esc(d.titulo)}</h2><div class="esfinge-history">${s.respuestas.map((r,i)=>`<article><p>${i===0?'Tesis: ':'Premisa '+i+': '}${esc(preguntas[i])}</p><div class="esfinge-bubble">${esc(label(r))}</div></article>`).join('')}</div>
      ${!resultado?`<section class="esfinge-question" aria-live="polite"><small>${s.respuestas.length?'Premisa '+s.respuestas.length+' de '+d.preguntas.length:'Tesis inicial'}</small><h3 tabindex="-1" data-esfinge-focus>${esc(preguntas[s.respuestas.length])}</h3>${!s.respuestas.length?'<p>¿Aceptás esta tesis como punto de partida?</p>':''}<div class="esfinge-choices">${opciones.map(([id,text])=>`<button type="button" data-esfinge-answer="${esc(id)}">${esc(text)}</button>`).join('')}</div></section>`:`<section class="esfinge-outcome" aria-live="polite"><h3 tabindex="-1" data-esfinge-focus>${resultado.estado==='refutacion'?'Refutación de la tesis':resultado.estado==='tesis_no_asumida'?'Tesis no asumida':'No se obtuvo una refutación'}</h3><p>${esc(resultado.texto)}</p><h4>Distinción para examinar</h4><p>${esc(d.distincion)}</p><h4>Lectura aristotélica</h4><p><strong>${esc(d.referencias)}</strong> ${esc(d.apoyo)}</p><div class="esfinge-links">${d.enlaces.map(([url,title])=>`<a href="${esc(url)}">${esc(title)}</a>`).join('')}<a href="#/reading">Biblioteca bilingüe</a><a href="#/chat">FAQ y diálogo</a></div></section>`}
      <div class="esfinge-choices"><button type="button" data-esfinge-back ${s.respuestas.length?'':'disabled'}>Revisar última respuesta</button><button type="button" data-esfinge-restart>Reiniciar desafío</button><button type="button" data-esfinge-home>Elegir otro desafío</button></div>`}
      </div>`;
    actualizarLectura(el);
  }
  function click(e){const b=e.target.closest('button');if(!b||!el.contains(b)||b.disabled)return;
    if(b.dataset.readerFontStep!==undefined){cambiarTamanoLector(el,Number(b.dataset.readerFontStep));return;}
    if(b.dataset.esfingeStart)s=iniciarEsfinge(b.dataset.esfingeStart);
    else if(b.dataset.esfingeAnswer&&s)s=responderEsfinge(s,b.dataset.esfingeAnswer);
    else if(b.hasAttribute('data-esfinge-back')&&s)s=retrocederEsfinge(s);
    else if(b.hasAttribute('data-esfinge-restart')&&s)s=iniciarEsfinge(s.id);
    else if(b.hasAttribute('data-esfinge-home'))s=null;else return;
    render();el.querySelector('[data-esfinge-focus]')?.focus();
  }
  el.addEventListener('click',click);render();return {el,destroy(){el.removeEventListener('click',click);}};
}
