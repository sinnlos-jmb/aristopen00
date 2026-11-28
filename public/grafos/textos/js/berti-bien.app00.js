/* ==================== PANEL PRINCIPAL ==================== */
function renderConcept(id){
  const c = CONCEPTS[id];
  let h = '<div class="card-main"><div class="eyebrow">Eslabón '+c.n+' de 6</div>'+
    '<h2 class="title"><span class="gr">'+c.g+'</span></h2><p class="subtitle">'+c.es+'</p>'+
    '<p class="lede">'+c.lede+'</p>';
  h += '<h3 class="sec">Sentidos y textos</h3>'+facetsHtml(c.facets);
  if (c.cond) h += '<div class="box own"><div class="t">Condición de la flecha</div><p>'+c.cond+'</p></div>';
  if (c.why) h += '<div class="box note"><div class="t">Por qué está en la cadena</div><p>'+c.why+'</p></div>';
  if (c.warn) h += '<div class="box aporia"><div class="t">Advertencia de traducción</div><p>'+c.warn+'</p></div>';
  if (c.vocab) h += '<div class="box orig"><div class="t">Nota de vocabulario</div><p>'+c.vocab+'</p></div>';
  if (c.pillars) h += '<div class="box orig"><div class="t">Los dos pilares</div><p>'+c.pillars+'</p></div>';
  if (c.own) h += '<div class="box own"><div class="t">Nuestra capa</div><p>'+c.own+'</p></div>';
  h += lociHtml(c.loci);
  if (id==='phusis'){
    h += '<div class="actions"><button class="btn" data-kind="aux" data-id="theion">Ver el segundo pilar: <span class="gr">&nbsp;to theîon</span></button></div>';
  }
  if (id==='eudaimonia'){
    h += '<div class="actions"><button class="btn" data-kind="aux" data-id="bios">Ver la ficha de arista: <span class="gr">&nbsp;bíos téleios</span></button></div>';
  }
  if (id==='ergon' || id==='arete'){
    h += '<div class="actions"><button class="btn" data-kind="hexis" data-id="hexis">Ver la ficha de arista: <span class="gr">&nbsp;héxis</span></button>'+
      '<button class="btn" data-kind="aux" data-id="theion">Ver el segundo pilar: <span class="gr">&nbsp;to theîon</span></button></div>';
  }
  h += '</div>';
  return h;
}

function renderAux(id){
  const x = AUX[id];
  let h = '<div class="card-main aux"><div class="eyebrow">'+x.eyebrow+'</div>'+
    '<h2 class="title"><span class="gr">'+x.g+'</span></h2><p class="subtitle">'+x.es+'</p>'+
    '<p class="lede">'+x.lede+'</p>'+
    '<div class="box aux"><div class="t">'+x.whyT+'</div><p>'+x.why+'</p></div>'+
    '<h3 class="sec">'+x.sec+'</h3>'+facetsHtml(x.facets,'b');
  if (x.own) h += '<div class="box own"><div class="t">'+x.ownT+'</div><p>'+x.own+'</p></div>';
  if (x.risk) h += '<div class="box aporia"><div class="t">'+x.riskT+'</div><p>'+x.risk+'</p></div>';
  if (x.note) h += '<div class="box note"><div class="t">'+x.noteT+'</div><p>'+x.note+'</p></div>';
  h += lociHtml(x.loci)+'<div class="actions">'+x.actions+'</div></div>';
  return h;
}

function renderHexis(){
  const x = HEXIS;
  let h = '<div class="card-main aux"><div class="eyebrow">Ficha de arista · condición de energeia a areté</div>'+
    '<h2 class="title"><span class="gr">'+x.g+'</span></h2><p class="subtitle">'+x.es+'</p>'+
    '<p class="lede">'+x.lede+'</p>'+
    '<div class="box aux"><div class="t">Para qué sirve</div><p>'+x.why+'</p></div>'+
    '<h3 class="sec">Tres precisiones</h3>'+facetsHtml(x.facets,'p')+
    '<div class="box own"><div class="t">La fórmula</div><p>'+x.key+'</p></div>'+lociHtml(x.loci)+
    '<div class="actions">'+
    '<button class="btn" data-kind="concepto" data-id="ergon">Volver a <span class="gr">&nbsp;ergon · energeia</span></button>'+
    '<button class="btn" data-kind="concepto" data-id="arete">Ir a <span class="gr">&nbsp;areté</span></button>'+
    '</div></div>';
  return h;
}

function renderAuthor(id){
  const a = AUTHORS[id]; const dec = decisiveOf(a);
  const recNodes = a.recover ? a.recover.nodes : [];
  const origNodes = a.origin ? a.origin.nodes : [];
  let h = '<div class="card-main"><div class="eyebrow">Autor · '+(dec ? 'ruptura decisiva en '+CONCEPTS[dec].g : (intactOf(a) ? 'cadena íntegra' : 'sin ruptura decisiva'))+'</div>'+
    '<h2 class="title">'+a.name+'</h2><p class="subtitle">'+a.sub+'</p>';
  h += '<h3 class="sec">Qué hace con cada eslabón</h3><table class="score"><tbody>';
  CHAIN.forEach(c => {
    const cell = a.cells[c.id];
    const st = cell[0];
    const isRec = recNodes.indexOf(c.id) > -1;
    h += '<tr><td class="k"><button class="jump" data-kind="concepto" data-id="'+c.id+'"><span class="gr">'+c.g+'</span></button></td>'+
      '<td class="s"><span class="chip-st '+st+'"><i class="sym '+st+'">'+SYM[st]+'</i>'+LBL[st]+'</span>'+
      (isRec?'<span class="chip-st recover"><i class="sym recover">○</i>recupera sin base</span>':'')+'</td>'+
      '<td>'+(origNodes.indexOf(c.id) > -1?'<span class="tag-only">con fundamento sólo aquí</span> ':'')+cell[1]+(c.id===dec?' <b style="color:var(--red)">← aquí se corta</b>':'')+'</td></tr>';
  });
  h += '</tbody></table>';
  if (a.recover) h += '<div class="box rec"><div class="t">Recuperación sin base · '+a.recover.nodes.map(conceptName).join(' · ')+'</div><p>'+a.recover.text+'</p></div>';
  if (a.origin) h += '<div class="box orig"><div class="t">Origen · el único que puede fundarlo · '+a.origin.nodes.map(conceptName).join(' · ')+'</div><p>'+a.origin.text+'</p></div>';
  h += '<div class="box aporia"><div class="t">Aporía</div><p>'+a.aporia+'</p></div>';
  if (a.note) h += '<div class="box note"><div class="t">Nota</div><p>'+a.note+'</p></div>';
  h += '<div class="actions">'+bertiBtn(a.berti, a.name);
  if (dec) h += '<button class="btn" data-kind="concepto" data-id="'+dec+'">Ir al eslabón roto: <span class="gr">&nbsp;'+CONCEPTS[dec].g+'</span></button>';
  h += '<button class="btn" data-kind="capa" data-id="grilla">Ver en la grilla</button></div></div>';
  return h;
}

function renderGrid(){
  const L = LAYERS.grilla;
  let h = '<div class="card-main"><div class="eyebrow">'+L.eyebrow+'</div><h2 class="title">'+L.title+'</h2>'+
    '<p class="subtitle">'+L.sub+'</p><div class="gridwrap"><table class="matrix"><thead><tr><th>Autor</th>';
  CHAIN.forEach(c => { h += '<th>'+c.g.replace(' · ','<br>· ')+'</th>'; });
  h += '</tr></thead><tbody>';
  GROUPS.forEach(g => {
    g[2].forEach(id => {
      const a = AUTHORS[id]; const dec = decisiveOf(a);
      const recNodes = a.recover ? a.recover.nodes : [];
      const origNodes = a.origin ? a.origin.nodes : [];
      h += '<tr'+(sel.kind==='autor'&&sel.id===id?' class="sel"':'')+'><th>'+a.name+'</th>';
      CHAIN.forEach(c => {
        const cell = a.cells[c.id]; const st = cell[0];
        const isRec = recNodes.indexOf(c.id) > -1;
        const isOrig = origNodes.indexOf(c.id) > -1;
        const cls = ['cell', st]; if (isRec) cls.push('isrec'); if (isOrig) cls.push('isorig'); if (c.id===dec) cls.push('decisive');
        const tip = a.name+' · '+c.g+' · '+LBL[st]+(isRec?' (recupera sin base)':'')+(isOrig?' (origen: el único autor que puede fundar este sentido)':'')+(c.id===dec?' · ruptura decisiva':'')+'\n'+cell[1];
        h += '<td><button class="'+cls.join(' ')+'" data-kind="autor" data-id="'+id+'" title="'+tip.replace(/"/g,'&quot;')+'">'+
          '<span class="mk">'+SYM[st]+'</span></button></td>';
      });
      h += '</tr>';
    });
  });
  h += '</tbody></table></div>'+
    '<p class="gridnote">El recuadro rojo marca la <b>ruptura decisiva</b>: el primer eslabón en estado <i>rompe</i> o <i>suprime</i>. El borde punteado verde marca una <b>recuperación sin base</b>: el autor vuelve a usar un eslabón que su propia filosofía ya no puede fundar. El borde azul lleno marca un <b>origen</b>: un sentido del eslabón que sólo aquí tiene fundamento —puede reaparecer en otros, pero ya sin suelo, y entonces es una recuperación sin base—. Aristóteles es la única fila enteramente verde: la cadena íntegra. Sócrates, Tomás y Maritain tampoco tienen ruptura decisiva, pero por razones opuestas: en Sócrates la cadena todavía no está armada; Tomás y Maritain la restauran sin recuperar el eslabón del acto.</p></div>';
  return h;
}

function renderPresente(){
  const L = LAYERS.presente;
  return '<div class="card-main"><div class="eyebrow">'+L.eyebrow+'</div><h2 class="title">'+L.title+'</h2>'+
  '<p class="subtitle">'+L.sub+'</p>'+
  '<p class="lede">El mundo antiguo pensó la vida buena en condiciones materiales que la hacían imposible para casi todos. El nuestro tiene por primera vez las condiciones y perdió el saber que diría para qué. Eso es la inversión, y es el argumento epocal de esta propuesta.</p>'+
  '<div class="quad">'+
  '<div class="qbox bad"><div class="t">Mundo antiguo · condiciones materiales</div><p>Escasas y desiguales. Esclavitud, subsistencia, ocio para pocos. La eudaimonía exige bienes exteriores y tiempo, y casi nadie los tenía: la teoría describía una vida que la economía negaba.</p></div>'+
  '<div class="qbox ok"><div class="t">Mundo antiguo · saber del bien</div><p>Completo. La cadena entera disponible: naturaleza con fines, razón que los conoce, obra donde realizarlos, excelencia, vida lograda, comunidad. La cadena entera está disponible en Aristóteles —no en todos: Platón ya rompe el primer eslabón—.</p></div>'+
  '<div class="qbox ok"><div class="t">Presente · condiciones materiales</div><p>Abundantes y en expansión. Excedente, técnica, longevidad, automatización de lo penoso. Por primera vez el ocio en sentido fuerte —scholé— es una posibilidad de masas y no un privilegio.</p></div>'+
  '<div class="qbox bad"><div class="t">Presente · saber del bien</div><p>Vacío. Del bien casi no se habla entre los filósofos. Quedan procedimientos, preferencias y cálculo de consecuencias: técnica para llegar a cualquier parte y ninguna razón para elegir adonde.</p></div>'+
  '</div>'+
  '<div class="box own"><div class="t">La tesis</div><p>La crisis moderna del bien no es un error ético sino la consecuencia de dos pérdidas metafísicas: la phúsis con fines y la energeia como estar-en-obra. Y la ocasión es históricamente nueva: nunca hubo tantas condiciones para el estado ético y tan poco saber sobre qué hacer con ellas. Reponer los dos eslabones perdidos no es nostalgia: es lo que falta para que el excedente sirva de algo.</p></div>'+
  '<div class="box aporia"><div class="t">El riesgo simétrico</div><p>La misma técnica que hace posible el estado ético lo vuelve prescindible: si todo se optimiza, nada se delibera. La abundancia sin fin produce el último hombre, no el hombre excelente. El diagnóstico no es optimista: es que la oportunidad y el peligro son el mismo hecho.</p></div>'+
  '</div>';
}

function renderMetafisica(){
  const L = LAYERS.metafisica;
  return '<div class="card-main"><div class="eyebrow">'+L.eyebrow+'</div><h2 class="title">'+L.title+'</h2>'+
  '<p class="subtitle">'+L.sub+'</p>'+
  '<h3 class="sec">Lo que pide Berti</h3>'+
  '<p class="facet g"><b>Una metafísica nueva, no dogmática.</b> La conclusión del recorrido es que el bien no puede fundarse sin metafísica, y que la metafísica disponible —la de la certeza deductiva— es justamente la que la modernidad tuvo razón en abandonar.</p>'+
  '<p class="facet g"><b>Y señala un hueco.</b> A la rehabilitación alemana de la filosofía práctica —Strauss, Voegelin, Arendt, Gadamer, Ritter, Kuhn, Ilting— le falta exactamente esa fundamentación: recuperó la praxis y no volvió a fundarla. Ese hueco es el punto de partida de esta app.</p>'+
  '<h3 class="sec">Dónde nos bifurcamos</h3>'+
  '<p class="body">Berti tiende a resolver la fundamentación apelando a un Absoluto trascendente. Nosotros no, y conviene decir con precisión por qué —no porque sobre lo divino, sino porque le corresponde otra función—.</p>'+
  '<p class="facet"><b>Lo divino está, y está muy presente.</b> <span class="gr">To theîon</span> recorre la ética entera: el nous es lo más divino en nosotros, la vida teorética es un vivir según lo inmortal, y el mejor criterio práctico es lo que promueve la contemplación de lo divino. Quitarlo sería mutilar a Aristóteles.</p>'+
  '<p class="facet"><b>Pero no es una premisa de la que se derive el saber.</b> A diferencia de la revelación cristiana y de las metafísicas fuertes de la certeza, aquí nada baja del absoluto hacia la conducta. El primer motor mueve <i>como lo amado</i>: atrae, no empuja (Met. XII.7 1072b3). Y no manda: Dios no da órdenes, sino que es aquello en vista de lo cual la prudencia ordena (EE VIII.3 1249b).</p>'+
  '<p class="facet"><b>La precisión honesta.</b> El primer motor es sustancia separada —eso sí es trascendencia—. La fórmula exacta no es «inmanente» sino <b>separado pero no legislador</b>: hay un término divino, y no hay derivación deductiva desde él. La ética sigue teniendo que averiguar sus cosas por sí misma, con la akríbeia que el asunto admite.</p>'+
  '<div class="box own"><div class="t">Nuestra posición · realismo naturalista inspirado en Aristóteles</div><p>Lo divino opera por tres vías y ninguna es la de la premisa: el <b>deseo de excelencia</b> —la areté tiende a un término que la excede—, el <b>amor</b> —se mueve como lo amado, no como lo mandado— y el <b>misterio</b> —lo que resta por saber no bloquea la acción: la orienta—. En combinación con la phúsis, esto alcanza para fundar el bien sin apelar a un Absoluto normativo y sin eliminar el elemento divino-espiritual. Eso es lo que llamamos realismo naturalista: naturalista por el suelo, realista por el fin, y abierto por arriba.</p></div>'+
  '<div class="box orig"><div class="t">Dicho en positivo · los dos pilares</div><p>En lugar de un Absoluto trascendente del que se derive el saber, una relación abierta y siempre rehacible entre <b>la phúsis que impulsa</b> —formal, potencial, la misma para todos los individuos de la especie— y <b>to theîon que atrae</b> —separado, en acto puro, indiferente, y por eso desigual en cada uno según la areté que ya alcanzó—. La primera da la medida; el segundo impide que la medida se declare cumplida. No funda por derivación: funda por tensión.</p></div>'+
  '<div class="box rec"><div class="t">La metafísica nueva que resulta</div><p>No es una metafísica distinta de la de Aristóteles: es la de Aristóteles con los dos eslabones que la tradición desintegró vueltos a integrar —phúsis con fines y energeia como estar-en-obra— más el elemento epocal: por primera vez las condiciones materiales del estado ético están al alcance. No es la metafísica de la certeza que la modernidad destruyó con razón; es una metafísica dialéctica, revisable y discutible, que es lo único que una ética necesita.</p></div>'+
  '<div class="box note"><div class="t">Nota al texto fuente</div><p>El criterio del <i>hóros</i> es eudemio, no nicomáqueo, y Berti lo cita bien: escribe <i>(EE VIII.3)</i>. Su único desliz de referencia en este capítulo es Rep. 509c donde el «más allá de la esencia» va en 509b. No afecta el argumento; se registra para conservar el campo <code>fuente_dice</code> cuando esto se formalice en JSON.</p></div>'+
  '<div class="actions">'+bertiBtn('metafisica','conclusión III')+'<button class="btn" data-kind="aux" data-id="theion">Ver la ficha: <span class="gr">&nbsp;to theîon</span></button><button class="btn" data-kind="concepto" data-id="phusis">Volver a <span class="gr">&nbsp;phúsis</span></button></div>'+
  '</div>';
}

function renderDeriva(){
  const L = LAYERS.deriva;
  let h = '<div class="card-main"><div class="eyebrow">'+L.eyebrow+'</div><h2 class="title">'+L.title+'</h2>'+
    '<p class="subtitle">'+L.sub+'</p><table class="plain"><thead><tr><th>Griego</th><th>Latín</th><th>Moderno</th><th>Qué se pierde</th></tr></thead><tbody>';
  DRIFT.forEach(r => { h += '<tr><td class="term">'+r[0]+'</td><td class="term">'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td></tr>'; });
  h += '</tbody></table><div class="box note"><div class="t">Por qué importa para la app</div><p>La deriva no es un problema de diccionario: es el mecanismo por el cual una tesis se vuelve ininteligible sin que nadie la refute. Cuando «energía» pasó a nombrar una magnitud física, la frase «la eudaimonía es una energeia» dejó de poder pensarse. Etiquetar el corpus por ejes semánticos, y no por palabras, es lo que permite volver a leerla.</p></div></div>';
  return h;
}

function renderPlanteo(){
  const L = LAYERS.planteo;
  return '<div class="card-main"><div class="eyebrow">'+L.eyebrow+'</div><h2 class="title">'+L.title+'</h2>'+
  '<p class="subtitle">'+L.sub+'</p>'+
  '<p class="lede">Berti parte de una constatación: del bien casi no se habla ya entre los filósofos. Y procede históricamente —de Sócrates a Maritain— no por erudición, sino porque la desaparición del tema tiene una historia y esa historia es el argumento.</p>'+
  '<p class="facet"><b>El problema.</b> No es que el bien se discuta mal: es que dejó de discutirse. Kant ya registraba en 1788 que entre los modernos la cuestión del sumo bien «parece haber caído en desuso, o al menos haberse vuelto una cuestión sólo secundaria». La modernidad no la refutó: la sacó del centro.</p>'+
  '<p class="facet"><b>El método.</b> Recorrer las soluciones y sus fracasos, para mostrar que ninguna de las alternativas modernas se sostiene y que la clásica fue abandonada sin ser refutada.</p>'+
  '<div class="box own"><div class="t">Qué hacemos nosotros con esto</div><p>Aceptamos el diagnóstico y cambiamos la forma del argumento. En vez de una secuencia de fracasos, una grilla: qué hace cada autor con cada uno de los seis eslabones. Así se ve lo que la narración esconde —que casi todos conservan algo, que varios recuperan sin base lo que negaron, y que la ruptura nunca es total—.</p></div>'+
  '<div class="actions">'+bertiBtn('problema','el problema')+bertiBtn('metodo','el método')+'</div></div>';
}

function renderMain(){
  const m = document.getElementById('main');
  let h = '';
  if (sel.kind==='concepto') h = renderConcept(sel.id);
  else if (sel.kind==='hexis') h = renderHexis();
  else if (sel.kind==='aux') h = renderAux(sel.id);
  else if (sel.kind==='autor') h = renderAuthor(sel.id);
  else if (sel.id==='grilla') h = renderGrid();
  else if (sel.id==='presente') h = renderPresente();
  else if (sel.id==='metafisica') h = renderMetafisica();
  else if (sel.id==='deriva') h = renderDeriva();
  else if (sel.id==='planteo') h = renderPlanteo();
  m.innerHTML = h;
  if (userDriven) window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==================== DRAWER ==================== */
function openDrawer(key){
  const ch = BERTI[key];
  if (!ch) { BERTI_READY.then(() => { if (BERTI[key]) openDrawer(key); }); return; }
  document.getElementById('dtitle').textContent = ch.title;
  document.getElementById('dsub').textContent = 'Enrico Berti, Il bene · ' + ch.paras.length + ' párrafos · texto original en italiano';
  document.getElementById('dbody').innerHTML =
    ch.paras.map(p => '<div class="bp"><span class="pid">'+p.id+'</span><div class="tx">'+
      p.text.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</div></div>').join('') +
    '<p class="dnote">Fragmento del archivo provisto por el usuario. Los identificadores <code>berti:autor:NN</code> son el mismo mecanismo de anclaje (ancla_en → pasaje_id) que usamos en el resto del proyecto. Uso personal.</p>';
  document.getElementById('drawer').classList.add('on');
  document.getElementById('drawer').setAttribute('aria-hidden','false');
  document.getElementById('scrim').classList.add('on');
  document.getElementById('dbody').scrollTop = 0;
}
function closeDrawer(){
  document.getElementById('drawer').classList.remove('on');
  document.getElementById('drawer').setAttribute('aria-hidden','true');
  document.getElementById('scrim').classList.remove('on');
}

/* ==================== SELECCIÓN ==================== */
function select(next){
  sel = { kind: next.kind, id: next.id };
  renderChain(); renderStatus(); syncSidebar(); renderMain();
}
window.select = select;

document.addEventListener('click', function(e){
  const b = e.target.closest('[data-berti]');
  if (b){ openDrawer(b.dataset.berti); return; }
  const n = e.target.closest('[data-concept]');
  if (n){ userDriven = true; select({kind:'concepto', id:n.dataset.concept}); return; }
  const t = e.target.closest('[data-kind]');
  if (t){ userDriven = true; select({kind:t.dataset.kind, id:t.dataset.id}); return; }
});
document.getElementById('dclose').addEventListener('click', closeDrawer);
document.getElementById('scrim').addEventListener('click', closeDrawer);
document.addEventListener('keydown', function(e){ if (e.key==='Escape' && !document.getElementById('leyenda-modal').classList.contains('on')) closeDrawer(); });
/* ==================== VALIDADOR ==================== */
function validateData(){
  const ids = CHAIN.map(c => c.id);
  const ST = ['conserva','desplaza','rompe','suprime'];
  const problems = [];
  const originSeen = {};
  Object.keys(AUTHORS).forEach(k => {
    const a = AUTHORS[k];
    ids.forEach(id => {
      const cell = a.cells[id];
      if (!cell) { problems.push(k+': falta la celda '+id); return; }
      if (ST.indexOf(cell[0]) < 0) problems.push(k+'.'+id+': estado desconocido '+cell[0]);
      if (!cell[1]) problems.push(k+'.'+id+': celda sin texto');
      if (cell.length > 2) problems.push(k+'.'+id+': flag de celda obsoleto '+cell[2]);
    });
    (a.recover ? a.recover.nodes : []).forEach(id => {
      if (ids.indexOf(id) < 0) problems.push(k+': recover apunta a un eslabon inexistente '+id);
    });
    (a.origin ? a.origin.nodes : []).forEach(id => {
      if (ids.indexOf(id) < 0) problems.push(k+': origin apunta a un eslabon inexistente '+id);
      originSeen[id] = (originSeen[id] || 0) + 1;
      if (originSeen[id] > 1) problems.push(id+': marcado como origen en mas de un autor');
    });
    if (a.unbroken && decisiveOf(a)) problems.push(k+': tiene unbroken pero rompe en '+decisiveOf(a));
    if (intactOf(a) && a.recover) problems.push(k+': cadena integra con recuperacion sin base');
  });
  const intactas = Object.keys(AUTHORS).filter(k => intactOf(AUTHORS[k]));
  if (intactas.length !== 1) problems.push('cadenas integras: '+intactas.length+' ('+intactas.join(', ')+'), se espera 1');
  if (problems.length) console.warn('[grafo-bien] datos inconsistentes:\n- '+problems.join('\n- '));
  return problems;
}
validateData();

/* ==================== INIT ==================== */
renderSidebar();
select({ kind:'capa', id:'grilla' });
userDriven = false;



/* ==================== LEYENDA (modal) ==================== */
(function(){
  var modal = document.getElementById('leyenda-modal');
  var scrim = document.getElementById('leyenda-scrim');
  var trigger = document.getElementById('btn-leyenda');
  var closeBtn = document.getElementById('leyenda-close');
  var lastFocus = null;
  var CLAVE = 'grafo-leyenda-vista';

  function abrir(){
    lastFocus = document.activeElement;
    modal.classList.add('on'); scrim.classList.add('on');
    modal.setAttribute('aria-hidden','false');
    closeBtn.focus();
  }
  function cerrar(){
    modal.classList.remove('on'); scrim.classList.remove('on');
    modal.setAttribute('aria-hidden','true');
    try { localStorage.setItem(CLAVE,'1'); } catch(e){}
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  trigger.addEventListener('click', abrir);
  closeBtn.addEventListener('click', cerrar);
  scrim.addEventListener('click', cerrar);
  document.addEventListener('keydown', function(e){
    if (e.key==='Escape' && modal.classList.contains('on')) cerrar();
  });

})();
