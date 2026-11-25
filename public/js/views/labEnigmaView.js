import { esc } from '../ui.js';
import { controlesTamanoLector, actualizarLectura, cambiarTamanoLector } from '../reader/fontPreferences.js';
import { enigmas,iniciarEnigma,pedirPista,responderEnigma,revelarEnigma } from '../lab/enigma.js';
export function createLabEnigmaView(){
  const el=document.createElement('div');el.className='scrollable has-scroll lq-view esfinge-view enigma-view';
  if(!document.querySelector('link[data-esfinge-styles]')){const css=document.createElement('link');css.rel='stylesheet';css.href='/css/lab-esfinge-n1u191.css';css.dataset.esfingeStyles='1';document.head.appendChild(css);}
  let s=null;
  function render(){
    const d=s&&enigmas.find(x=>x.id===s.id),done=s&&(s.resuelto||s.revelado),last=s&&d.opciones.find(o=>o[0]===s.intentos.at(-1));
    el.innerHTML=`<div class="esfinge-inner"><nav><a href="#/lab">← Laboratorio</a> · N1-U.19.2</nav>${controlesTamanoLector()}<h1>Enigma</h1><p>Descubrí un concepto a partir de un desafío. Podés pedir pistas, reconsiderar tus respuestas y consultar el material filosófico al terminar.</p><p class="esfinge-note">Ejercicios de Ágora pendientes de revisión editorial. No son citas de Aristóteles. No requieren LLM ni créditos.</p>
      ${!s?`<h2>Elegí un enigma</h2><div class="esfinge-choices">${enigmas.map(x=>`<button data-enigma-start="${esc(x.id)}">${esc(x.titulo)}</button>`).join('')}</div>`:`<h2>${esc(d.titulo)}</h2><section class="esfinge-question"><h3 tabindex="-1" data-enigma-focus>${esc(d.enigma)}</h3>${s.pistas?`<ol>${d.pistas.slice(0,s.pistas).map(t=>`<li>${esc(t)}</li>`).join('')}</ol>`:''}
      ${!done?`<div class="esfinge-choices">${d.opciones.map(([id,label])=>`<button data-enigma-answer="${esc(id)}" ${s.intentos.includes(id)?'disabled':''}>${esc(label)}${s.intentos.includes(id)?' — ya examinada':''}</button>`).join('')}</div><div role="status">${last?`<p>${esc(last[2])} Podés intentar otra opción.</p>`:''}</div><div class="esfinge-choices"><button data-enigma-hint ${s.pistas>=d.pistas.length?'disabled':''}>Pedir pista (${s.pistas}/${d.pistas.length})</button><button data-enigma-reveal>Ver resolución</button></div>`:`<section class="esfinge-outcome"><h3>${s.resuelto?'Enigma resuelto':'Resolución revelada'}</h3><p><strong>${esc(d.opciones.find(o=>o[0]===d.solucion)[1])}</strong></p><p>${esc(d.explicacion)}</p><h4>Lectura aristotélica</h4><p>${esc(d.referencias)}</p><div class="esfinge-links">${d.enlaces.map(([url,title])=>`<a href="${esc(url)}">${esc(title)}</a>`).join('')}<a href="#/reading">Biblioteca bilingüe</a><a href="#/chat">FAQ y diálogo</a></div></section>`}</section><div class="esfinge-choices"><button data-enigma-reset>Reiniciar enigma</button><button data-enigma-home>Elegir otro enigma</button></div>`}</div>`;
    actualizarLectura(el);
  }
  function click(e){const b=e.target.closest('button');if(!b||b.disabled||!el.contains(b))return;
    if(b.dataset.readerFontStep!==undefined){cambiarTamanoLector(el,Number(b.dataset.readerFontStep));return;}
    if(b.dataset.enigmaStart)s=iniciarEnigma(b.dataset.enigmaStart);
    else if(s&&b.dataset.enigmaAnswer)s=responderEnigma(s,b.dataset.enigmaAnswer);
    else if(s&&b.hasAttribute('data-enigma-hint'))s=pedirPista(s);
    else if(s&&b.hasAttribute('data-enigma-reveal'))s=revelarEnigma(s);
    else if(s&&b.hasAttribute('data-enigma-reset'))s=iniciarEnigma(s.id);
    else if(b.hasAttribute('data-enigma-home'))s=null;else return;
    render();el.querySelector('[data-enigma-focus]')?.focus();
  }
  el.addEventListener('click',click);render();return {el,destroy(){el.removeEventListener('click',click);}};
}
