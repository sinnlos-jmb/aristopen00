/* ==================== CAPAS ==================== */
const LAYERS = {
  grilla: { name:'Grilla de autores', eyebrow:'Vista de entrada', title:'Diecinueve autores × seis conceptos',
    sub:'Cada celda dice qué hace ese autor con ese eslabón. Tocá una celda para abrir la ficha.' },
  presente:{ name:'El presente: la inversión', eyebrow:'Diagnóstico epocal', title:'La inversión',
    sub:'La relación entre condiciones materiales y saber del bien se dio vuelta.' },
  metafisica:{ name:'La nueva metafísica', eyebrow:'Cierre · y bifurcación con Berti', title:'Qué metafísica hace falta',
    sub:'Berti concluye pidiendo una metafísica nueva. Estamos de acuerdo en el pedido y no en la dirección.' },
  deriva: { name:'Deriva semántica', eyebrow:'Aparato', title:'Qué se perdió en la traducción',
    sub:'Siete palabras griegas, su latinización, su forma moderna y lo que quedó afuera en cada paso.' },
  planteo: { name:'El planteo de Berti', eyebrow:'Base doxográfica', title:'El problema y el método',
    sub:'De qué parte Berti y cómo procede. Es el marco que este grafo reorganiza.' }
};

const DRIFT = [
  ['phúsis','natura','naturaleza','De principio interno de movimiento y fin propio, a conjunto de objetos regidos por leyes externas. El fin deja de ser legible.'],
  ['lógos','ratio','razón','De razón-y-discurso que conoce el fin y funda la comunidad, a facultad de calcular medios. Se pierde de golpe la dimensión pública.'],
  ['érgon','opus, officium','obra, función','De obra propia que define lo que algo es, a producto separable o a mero empleo. «Función» pasa a ser un rol social, no una esencia en acto.'],
  ['enérgeia','actus','energía, actividad','De estar-en-obra —el fin cumpliéndose— a magnitud física cuantificable o a simple «estar ocupado». La pérdida decisiva.'],
  ['areté','virtus','virtud','De excelencia que hace buena la obra, a cumplimiento del deber o rasgo amable de carácter. Se pierde el vínculo con el resultado.'],
  ['eudaimonía','beatitudo, felicitas','felicidad','De actividad lograda en una vida completa, a estado subjetivo de bienestar medible por encuesta.'],
  ['koinonía','communitas','sociedad','De comunidad anterior en el orden del fin, a agregado de individuos con intereses que hay que coordinar.']
];

/* ==================== ESTADO ==================== */
let sel = { kind:'capa', id:'grilla' };
let userDriven = false;

function intactOf(a){
  return CHAIN.every(c => a.cells[c.id][0]==='conserva');
}
function decisiveOf(a){
  for (const c of CHAIN){ const st = a.cells[c.id][0]; if (st==='rompe' || st==='suprime') return c.id; }
  return null;
}
function authorOf(id){ return AUTHORS[id]; }
function conceptName(id){ return CONCEPTS[id].g; }

/* ==================== CADENA ==================== */
function renderChain(){
  const a = sel.kind==='autor' ? authorOf(sel.id) : null;
  const dec = a ? decisiveOf(a) : null;
  const recNodes = a && a.recover ? a.recover.nodes : [];
  const origNodes = a && a.origin ? a.origin.nodes : [];
  let h = '';
  CHAIN.forEach((c,i) => {
    const cls = [];
    const badges = [];
    if (a){
      const st = a.cells[c.id][0];
      cls.push('st-'+st);
      /* prioridad explicita: ruptura decisiva > origen > recuperado */
      if (c.id === dec) badges.push('<span class="badge">ruptura decisiva</span>');
      if (origNodes.indexOf(c.id) > -1){ cls.push('origin'); badges.push('<span class="badge orig">origen · con fundamento sólo aquí</span>'); }
      if (recNodes.indexOf(c.id) > -1){ cls.push('recovered'); badges.push('<span class="badge rec">recuperado sin base</span>'); }
    }
    const badge = badges.length ? '<span class="badges">'+badges.join('')+'</span>' : '';
    const pressed = (sel.kind==='concepto' && sel.id===c.id) ? 'true' : 'false';
    h += '<div class="node-wrap">'+badge+
      '<button class="node '+cls.join(' ')+'" data-concept="'+c.id+'" aria-pressed="'+pressed+'">'+
      '<span class="g">'+c.g+'</span><span class="es">'+c.es+'</span></button></div>';
    if (i < CHAIN.length-1){
      const broken = a && dec === c.id;
      const cd = COND[c.id];
      const cond = cd ? '<button class="cond" data-kind="'+cd.kind+'" data-id="'+cd.id+'" title="Abrir la ficha de esta condición">'+cd.label+'</button>' : '';
      h += '<div class="arrow'+(broken?' broken':'')+'">'+
        '<svg width="34" height="12" viewBox="0 0 34 12" aria-hidden="true">'+
        '<line class="shaft" x1="2" y1="6" x2="25" y2="6" /><polygon class="head" points="25,2 33,6 25,10" /></svg>'+cond+'</div>';
    }
  });
  document.getElementById('chain').innerHTML = h;
}

function renderStatus(){
  let h = '';
  if (sel.kind==='concepto'){
    const c = CONCEPTS[sel.id];
    h = '<b>Eslabón '+c.n+' de 6 · <span class="gr">'+c.g+'</span></b> <span>· '+c.es+' · cadena íntegra, sin autor seleccionado</span>';
  } else if (sel.kind==='hexis'){
    h = '<b>Ficha de arista · <span class="gr">héxis</span></b> <span>· condición de la flecha: energeia a areté sólo si la actividad es excelente</span>';
  } else if (sel.kind==='aux'){
    const x = AUX[sel.id];
    h = '<b>'+x.eyebrow+' · <span class="gr">'+x.g+'</span></b> <span>· '+x.es+'</span>';
  } else if (sel.kind==='autor'){
    const a = authorOf(sel.id); const dec = decisiveOf(a);
    const counts = {conserva:0,desplaza:0,rompe:0,suprime:0};
    CHAIN.forEach(c => counts[a.cells[c.id][0]]++);
    const resumen = 'conserva '+counts.conserva+' · desplaza '+counts.desplaza+' · rompe '+counts.rompe+' · suprime '+counts.suprime;
    if (dec) h = '<b>'+a.name+'</b> <span>· ruptura decisiva en <span class="gr">'+conceptName(dec)+'</span> · '+resumen+'</span>';
    else if (intactOf(a)) h = '<b>'+a.name+'</b> <span>· cadena íntegra · seis eslabones conservados, el único caso</span>';
    else h = '<b>'+a.name+'</b> <span>· sin ruptura decisiva, sólo desplazamientos · '+resumen+(a.unbroken ? ' · '+a.unbroken : '')+'</span>';
    if (a.recover) h += ' <span>· recupera sin base: '+a.recover.nodes.map(conceptName).join(', ')+'</span>';
    if (a.origin) h += ' <span>· origen del sentido práctico de '+a.origin.nodes.map(conceptName).join(', ')+' · con fundamento sólo aquí</span>';
  } else {
    h = '<b>'+LAYERS[sel.id].name+'</b> <span>· cadena de referencia · seleccioná un eslabón o un autor</span>';
  }
  document.getElementById('statusline').innerHTML = h;
}

/* ==================== SIDEBAR ==================== */
function dotFor(id){
  const a = AUTHORS[id];
  if (decisiveOf(a)) return 'red';
  return intactOf(a) ? 'green' : 'orange';
}
function renderSidebar(){
  let h = '';
  h += '<details class="grp" open data-g="eslabones"><summary>Los seis eslabones</summary><div class="items">';
  CHAIN.forEach(c => {
    h += '<button class="item" data-kind="concepto" data-id="'+c.id+'"><i class="dot blue"></i><span class="gr">'+c.g+'</span></button>';
  });
  h += '<button class="item aux" data-kind="aux" data-id="theion"><i class="dot purple"></i><span class="gr">to theîon</span>&nbsp;· el segundo pilar</button>';
  h += '<button class="item aux" data-kind="hexis" data-id="hexis"><i class="dot purple"></i><span class="gr">héxis</span>&nbsp;· arista</button>';
  h += '<button class="item aux" data-kind="aux" data-id="bios"><i class="dot purple"></i><span class="gr">bíos téleios</span>&nbsp;· arista</button>';
  h += '</div></details>';
  GROUPS.forEach(g => {
    h += '<details class="grp" open data-g="'+g[0]+'"><summary>'+g[1]+'</summary><div class="items">';
    g[2].forEach(id => {
      h += '<button class="item" data-kind="autor" data-id="'+id+'"><i class="dot '+dotFor(id)+'"></i>'+AUTHORS[id].name+'</button>';
    });
    h += '</div></details>';
  });
  h += '<details class="grp" open data-g="capas"><summary>Capas</summary><div class="items">';
  Object.keys(LAYERS).forEach(k => {
    h += '<button class="item" data-kind="capa" data-id="'+k+'"><i class="dot"></i>'+LAYERS[k].name+'</button>';
  });
  h += '</div></details>';
  document.getElementById('sidebar').innerHTML = h;
}
function syncSidebar(){
  document.querySelectorAll('#sidebar .item').forEach(b => {
    const on = b.dataset.kind===sel.kind && b.dataset.id===sel.id;
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (on){ const d = b.closest('details'); if (d) d.open = true;
      if (userDriven && window.innerWidth > 900) b.scrollIntoView({block:'nearest'}); }
  });
}

/* ==================== HELPERS ==================== */
function lociHtml(arr){ return '<div class="loci">'+arr.map(l => '<span class="locus">'+l+'</span>').join('')+'</div>'; }
function facetsHtml(arr, cls){ return arr.map(f => '<p class="facet '+(f[2]?'b ':'')+(cls||'')+'">'+(f[2]?'<span class="tag-only">'+f[2]+'</span> ':'')+'<b>'+f[0]+'.</b> '+f[1]+'</p>').join(''); }
function bertiBtn(key, label){ return '<button class="btn primary" data-berti="'+key+'">Leer a Berti (IT) — '+label+'</button>'; }
