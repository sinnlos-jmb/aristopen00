const MODOS = {
  definir:    { id:'definir',    label:'pregunta por esencia (ti esti)', patrones:[/\bque es\b/,/\bque son\b/,/\bque significa\b/,/\bque quiere decir\b/,/\bdefinicion de\b/,/\bcomo define\b/,/\bque entiende\b/] },
  justificar: { id:'justificar', label:'por qué / fundamento',           patrones:[/\bpor que\b/,/\ben que se funda\b/,/\bcual es el fundamento\b/,/\bnecesita\b/] },
  relacionar: { id:'relacionar', label:'relación (x, y)',                 patrones:[/\bcomo se relacionan?\b/,/\brelacion entre\b/,/\bque tiene que ver\b/,/\bse relacionan?\b/,/\bque relacion\b/,/\bconcuerda\b/] },
  distinguir: { id:'distinguir', label:'diferencia (x, y)',               patrones:[/\bdiferencia\b/,/\bque distingue\b/,/\ben que se distingue\b/,/\bque diferencia hay\b/,/\by no una?\b/] },
  finalidad:  { id:'finalidad',  label:'para qué / fin',                  patrones:[/\bpara que\b/,/\bcon que fin\b/,/\bfinalidad\b/,/\ba que fin\b/,/\ba que tiende\b/] },
  modo:       { id:'modo',       label:'cómo / de qué modo',              patrones:[/\bcomo\b/,/\bde que modo\b/,/\bde que manera\b/,/\bpor donde empieza\b/] },
  enumerar:   { id:'enumerar',   label:'cuáles / clases',                 patrones:[/\bcuales\b/,/\bque clases\b/,/\bcuantos\b/,/\bcuantas\b/,/\btres clases\b/] },
  localizar:  { id:'localizar',  label:'dónde aparece',                   patrones:[/\bdonde\b/,/\ben que pasaje\b/,/\ben que libro\b/] },
  examinar:   { id:'examinar',   label:'examen / suficiencia / identidad',patrones:[/\bbasta con\b/,/\bes mayor\b/,/\bes placentera\b/,/\bhay un\b/,/\bes una ciencia\b/] },
};

const LEXICO = {
  felicidad:'eudaimonia', eudaimonia:'eudaimonia', feliz:'eudaimonia', bienestar:'eudaimonia',
  virtud:'arete', arete:'arete', virtuoso:'arete', virtudes:'arete',
  bien:'agathon', agathon:'agathon', bueno:'agathon',
  bienes:'bienes',
  alma:'psuche', psuche:'psuche', psuchika:'psuchika',
  placer:'hedone', hedone:'hedone', placentero:'hedu', placentera:'hedu',
  honor:'time', time:'time', honores:'time',
  riqueza:'ploutos', dinero:'ploutos', ploutos:'ploutos',
  funcion:'ergon_funcion', ergon:'ergon_funcion',
  obra:'ergon_obra', obras:'ergon_obra',
  razon:'logon', logos:'logon',
  accion:'praxis', praxis:'praxis', acciones:'praxis', practico:'praxis', practica:'praxis', realizable:'praxis',
  fin:'telos', telos:'telos', fines:'telos',
  infinito:'apeiron', apeiron:'apeiron',
  habito:'hexis', disposicion:'hexis', hexis:'hexis', costumbre:'ethos', habituacion:'ethos',
  actividad:'energeia_actividad', energeia:'energeia_actividad', acto:'energeia_actividad', ejercicio:'energeia_actividad', actividades:'energeia_actividad',
  capacidad:'dunamis_capacidad', capacidades:'dunamis_capacidad', potencia:'dunamis', dunamis:'dunamis',
  deseo:'orexis', orexis:'orexis', tiende:'tendencia', tendencia:'tendencia',
  eleccion:'prohairesis', prohairesis:'prohairesis',
  amistad:'philia', philia:'philia', amigos:'philia',
  justicia:'dikaiosune', dikaiosune:'dikaiosune', justo:'dikaiosune',
  prudencia:'phronesis', phronesis:'phronesis',
  sabiduria:'sophia', sophia:'sophia',
  politica:'politike', politike:'politike',
  ciudad:'polis', polis:'polis', individuo:'anthropos', hombre:'anthropos', humano:'anthropos',
  educacion:'paideia', paideia:'paideia', criado:'paideia',
  joven:'akroates', oyente:'akroates', akroates:'akroates',
  experiencia:'empeiria', empeiria:'empeiria',
  rigor:'akribeia', exacta:'akribeia', exactitud:'akribeia', precision:'akribeia', akribeia:'akribeia', ακριβεια:'akribeia', esbozo:'typos',
  principio:'arche', principios:'arche', arche:'arche',
  opiniones:'endoxa', endoxa:'endoxa', consonancia:'sunodia',
  idea:'idea_agathou', platon:'idea_agathou',
  analogia:'analogia',
  completo:'teleios', completa:'teleios', teleios:'teleios',
  autosuficiente:'autarkes', autarquia:'autarkes', autarkes:'autarkes',
  golondrina:'bios', verano:'bios', vida:'bios',
  exteriores:'ekta', recursos:'ekta', instrumentos:'organa', fortuna:'eutuchia', suerte:'eutuchia',
  noble:'kalon', bello:'kalon', kalon:'kalon',
  mejor:'ariston', supremo:'ariston', ariston:'ariston',
  naturaleza:'phusis', phusis:'phusis',
  dios:'theion', divino:'theion', theion:'theion',
  excelencia:'excelencia',
  etica:'politike',
etico:'politike',
comienzo:'arche',
comenzar:'arche',
empiezo:'arche',
empezar:'arche',
produccion:'poiesis',
poiesis:'poiesis',
contemplacion:'theoria',
teoria:'theoria',
theoria:'theoria',
esferas:'epistemai',
filosofia:'politike',
};

// Unica implementacion string-pura de normalizacion (bot/detect.js la re-exporta).
// NO confundir con normalizeWithOffsets (reader/text.js): contrato distinto (offsets, Bekker, sigma-final).
export function normalize(text) {
  return String(text || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñͰ-Ͽἀ-῿]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function analyze(expr) {
  const norm = normalize(expr);
  const conceptos = [];
  const seen = new Set();
  for (const w of norm.split(/\s+/)) {
    if (LEXICO[w] && !seen.has(LEXICO[w])) {
      seen.add(LEXICO[w]);
      conceptos.push({ id: LEXICO[w], word: w, label: w.charAt(0).toUpperCase() + w.slice(1) });
    }
  }
  const modos = [];
  for (const def of Object.values(MODOS)) {
    if (def.patrones.some(p => p.test(norm))) modos.push({ id: def.id, label: def.label });
  }
  // El modo específico tiene prioridad sobre el marcador genérico «cómo».
  const primaryMode = modos.find(m => m.id !== 'modo') || modos[0] || null;
  return {
    raw: expr, normalized: norm, conceptos, modos, primaryMode,
    json: {
      concepto: conceptos.map(c => c.word),
      modo: modos.map(m => m.label),
    },
  };
}
